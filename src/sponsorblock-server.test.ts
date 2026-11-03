import { describe, expect, it, vi } from 'vitest';
// @ts-ignore Container-side module
import { getSponsorSegments, sponsorVideoID, normalizeServerSponsorSettings } from '../sponsorblock-server.mjs';

describe('SponsorBlock fixed-origin relay', () => {
  it('normalizes profile settings before they are persisted on the server', () => {
    expect(normalizeServerSponsorSettings(null)).toEqual({ enabled: true, autoSkip: true, categories: ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro'] });
    expect(normalizeServerSponsorSettings({ enabled: false, autoSkip: 'bad', categories: ['filler', 'evil', 'filler'] }))
      .toEqual({ enabled: false, autoSkip: true, categories: ['filler'] });
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
});
