import { describe, expect, it } from 'vitest';
import { canUseCachedRoute, upstreamRequired } from './upstream-status';

describe('upstream outage routing', () => {
  it('keeps local library routes and cached Feed usable while the upstream is offline', () => {
    expect(canUseCachedRoute('subscriptions')).toBe(true);
    expect(canUseCachedRoute('home')).toBe(true);
    expect(canUseCachedRoute('history')).toBe(true);
  });

  it('marks playback and remote-discovery routes unavailable while offline', () => {
    expect(upstreamRequired('watch/video')).toBe(true);
    expect(upstreamRequired('watch-url/https%3A%2F%2Fexample.com')).toBe(true);
    expect(upstreamRequired('search/query')).toBe(true);
    expect(upstreamRequired('channel/channel')).toBe(true);
    expect(upstreamRequired('subscriptions')).toBe(false);
  });
});
