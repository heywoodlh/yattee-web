import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error Node filesystem is used only by Vitest.
import { readFileSync } from 'node:fs';
// @ts-ignore Container-side module
import { getSponsorSegments, sponsorVideoID, normalizeServerSponsorSettings, createSponsorSegmentService } from '../sponsorblock-server.mjs';

describe('SponsorBlock fixed-origin relay', () => {
  it('includes the relay helper in the runtime Docker image', () => {
    const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
    expect(dockerfile).toMatch(/COPY .*sponsorblock-server\.mjs \/app\//);
    const flake = readFileSync(new URL('../flake.nix', import.meta.url), 'utf8');
    expect(flake).toContain('version = "0.2.0";');
    expect(flake).toContain('cp -L ${./sponsorblock-server.mjs} "$out/sponsorblock-server.mjs"');
  });
  it('normalizes profile settings before they are persisted on the server', () => {
    expect(normalizeServerSponsorSettings(null)).toEqual({ enabled: true, autoSkip: true, categories: ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro'] });
    expect(normalizeServerSponsorSettings({ enabled: false, autoSkip: 'bad', categories: ['filler', 'evil', 'filler'] }))
      .toEqual({ enabled: false, autoSkip: true, categories: ['filler'] });
    expect(normalizeServerSponsorSettings({ categories: ['poi_highlight'] }).categories).toEqual([]);
  });
  it('rejects invalid identifiers without a network request', async () => {
    const fetcher = vi.fn();
    expect(sponsorVideoID('abc123XYZ_0')).toBe(true);
    expect(sponsorVideoID('https://evil.test')).toBe(false);
    await expect(getSponsorSegments('https://evil.test', fetcher)).rejects.toThrow('Invalid video ID');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses only official HTTPS endpoint without forwarding credentials and filters unsafe segments', async () => {
    const fetcher = vi.fn(async (_url: URL, _options: RequestInit) => new Response(JSON.stringify([
      { UUID: 'good', category: 'sponsor', actionType: 'skip', segment: [10, 20] },
      { UUID: 'chapter', category: 'sponsor', actionType: 'chapter', segment: [20, 30] },
      { UUID: 'invalid', category: 'sponsor', actionType: 'skip', segment: [-1, 30] },
      { UUID: 'unknown', category: 'nope', actionType: 'skip', segment: [20, 30] },
    ]), { status: 200 }));
    expect(await getSponsorSegments('abc123XYZ_0', fetcher)).toEqual([{ id: 'good', category: 'sponsor', start: 10, end: 20 }]);
    const [url, options] = fetcher.mock.calls[0];
    expect(url.origin).toBe('https://sponsor.ajay.app');
    expect(url.pathname).toBe('/api/skipSegments');
    expect(url.searchParams.get('videoID')).toBe('abc123XYZ_0');
    expect(options).not.toHaveProperty('headers.authorization');
    expect(options.redirect).toBe('error');
  });
  it('treats 404 as no segments but propagates outages', async () => {
    expect(await getSponsorSegments('abc123XYZ_0', async () => new Response('', { status: 404 }))).toEqual([]);
    await expect(getSponsorSegments('abc123XYZ_0', async () => new Response('', { status: 503 }))).rejects.toThrow('SponsorBlock is unavailable');
  });
  it('coalesces requests, caches empty results, and evicts old entries', async () => {
    let now = 1000;
    let release!: (value: unknown[]) => void;
    const lookup = vi.fn(() => new Promise<unknown[]>(resolve => { release = resolve; }));
    const service = createSponsorSegmentService(lookup, () => now, { ttlMs: 5000, capacity: 2, maxMisses: 10 });
    const first = service('abcdefghijk');
    const second = service('abcdefghijk');
    expect(lookup).toHaveBeenCalledTimes(1);
    release([]);
    await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
    await service('abcdefghijk');
    expect(lookup).toHaveBeenCalledTimes(1);
    now += 5001;
    const expired = service('abcdefghijk'); release([]); await expired;
    const next = service('klmnopqrst1'); release([]); await next;
    const third = service('123456789ab'); release([]); await third;
    const evicted = service('abcdefghijk'); release([]); await evicted;
    expect(lookup).toHaveBeenCalledTimes(5);
  });
  it('rejects excessive cache misses before making upstream calls', async () => {
    const lookup = vi.fn(async () => []);
    const service = createSponsorSegmentService(lookup, () => 1000, { maxMisses: 2 });
    await service('abcdefghijk');
    await service('klmnopqrst1');
    await expect(service('123456789ab')).rejects.toThrow('SponsorBlock rate limit exceeded');
    expect(lookup).toHaveBeenCalledTimes(2);
  });
});
