import { describe, expect, it } from 'vitest';
import { initialStore, loadStore } from './store';
import { activeSkipSegment, fetchSponsorSegments, shouldAutoSkip, skipTarget } from './sponsorblock';

describe('SponsorBlock profile settings', () => {
  it('defaults legacy profiles to iOS-compatible categories and rejects malformed saved values', () => {
    expect(loadStore('{}').settings.sponsorBlock).toEqual(initialStore.settings.sponsorBlock);
    expect(initialStore.settings.sponsorBlock).toEqual({ enabled: true, autoSkip: true, categories: ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro'] });
    expect(loadStore(JSON.stringify({ settings: { sponsorBlock: { enabled: 'yes', autoSkip: false, categories: ['sponsor', 'bogus', 'sponsor'] } } })).settings.sponsorBlock)
      .toEqual({ enabled: true, autoSkip: false, categories: ['sponsor'] });
  });
});

describe('SponsorBlock playback', () => {
  const segment = { id: 'a', category: 'sponsor' as const, start: 10, end: 20 };
  it('only considers selected skippable segments at the current time', () => {
    const settings = initialStore.settings.sponsorBlock;
    expect(activeSkipSegment(10, [segment], settings)).toEqual(segment);
    expect(activeSkipSegment(20, [segment], settings)).toBeNull();
    expect(activeSkipSegment(12, [segment], { ...settings, categories: [] })).toBeNull();
    expect(activeSkipSegment(12, [segment], { ...settings, enabled: false })).toBeNull();
  });
  it('only auto-skips once per segment while leaving manual mode available', () => {
    const settings = initialStore.settings.sponsorBlock;
    expect(shouldAutoSkip(segment, settings, null)).toBe(true);
    expect(shouldAutoSkip(segment, settings, segment.id)).toBe(false);
    expect(shouldAutoSkip(segment, { ...settings, autoSkip: false }, null)).toBe(false);
  });
  it('clamps the seek target to video duration and refuses end-of-video loops', () => {
    expect(skipTarget(segment, 100)).toBe(20.1);
    expect(skipTarget(segment, 20)).toBeNull();
  });
  it('distinguishes a missing video from an unavailable segment service', async () => {
    const fetcher = async () => new Response(JSON.stringify({ segments: [segment] }), { status: 200 });
    await expect(fetchSponsorSegments('abc123XYZ_0', undefined, fetcher)).resolves.toEqual([segment]);
    await expect(fetchSponsorSegments('abc123XYZ_0', undefined, async () => new Response('{}', { status: 502 }))).rejects.toThrow('SponsorBlock is unavailable');
  });
});
