import { describe, expect, it } from 'vitest';
import { downloadUrl, upstreamShareUrl } from './media';

describe('upstreamShareUrl', () => {
  it('uses the upstream provider URL instead of a relay URL', () => {
    expect(upstreamShareUrl({ videoId: 'abc', originalUrl: 'https://www.youtube.com/watch?v=abc' })).toBe('https://www.youtube.com/watch?v=abc');
  });

  it('does not invent a provider URL when the upstream did not supply one', () => {
    expect(upstreamShareUrl({ videoId: 'abc' })).toBeUndefined();
  });
});

describe('downloadUrl', () => {
  it('requests an MP4 download through the same-origin download endpoint', () => {
    expect(downloadUrl('https://manifest.example/video.m3u8', 'A title')).toBe('/download?url=https%3A%2F%2Fmanifest.example%2Fvideo.m3u8&filename=A%20title.mp4');
  });
});
