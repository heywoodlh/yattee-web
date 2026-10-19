import { describe, expect, it } from 'vitest';
import { upstreamWatchRoute } from './upstream-link';

describe('upstream link routing', () => {
  it('routes an HTTPS upstream URL to the direct-extraction Watch view', () => {
    expect(upstreamWatchRoute(' https://www.twitch.tv/example ')).toBe(`watch-url/${encodeURIComponent('https://www.twitch.tv/example')}`);
  });

  it('rejects non-web URLs before sending them to the upstream extractor', () => {
    expect(upstreamWatchRoute('file:///etc/passwd')).toBeUndefined();
    expect(upstreamWatchRoute('not a URL')).toBeUndefined();
  });
});
