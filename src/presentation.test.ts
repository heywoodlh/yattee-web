import { describe, expect, it } from 'vitest';
import { channelShareUrl, thumbnailImageSource, thumbnailLoading, thumbnailPresentation, videoThumbnailUrl } from './presentation';

describe('media presentation', () => {
  it('uses an upstream YouTube channel URL when the channel has no explicit source URL', () => {
    expect(channelShareUrl({ authorId: 'UCabc123', author: 'Creator' })).toBe('https://www.youtube.com/channel/UCabc123');
  });

  it('preserves an upstream channel URL when provided', () => {
    expect(channelShareUrl({ authorId: 'channel', author: 'Creator', originalUrl: 'https://video.example/channel/creator' })).toBe('https://video.example/channel/creator');
  });

  it('derives a stable YouTube thumbnail for saved videos without an upstream thumbnail', () => {
    expect(videoThumbnailUrl({ videoId: 'dQw4w9WgXcQ' })).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('loads Home thumbnails eagerly while keeping long lists lazy', () => {
    expect(thumbnailLoading(true)).toBeUndefined();
    expect(thumbnailLoading(false)).toBe('lazy');
  });

  it('replaces a failed upstream thumbnail with the saved video fallback', () => {
    expect(thumbnailImageSource('https://unavailable.example/thumb.jpg', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', 1)).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(thumbnailImageSource('https://unavailable.example/thumb.jpg', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', 2)).toBe('');
  });

  it('shows a clear placeholder when a thumbnail URL is missing', () => {
    expect(thumbnailPresentation('')).toEqual({ image: '', label: 'No thumbnail available' });
  });
});
