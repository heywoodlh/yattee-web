import { describe, expect, it } from 'vitest';
import { playlistVideoPage } from './playlist-video-list';

const videos = Array.from({ length: 31 }, (_, index) => ({ videoId: `video-${index}`, title: index === 30 ? 'Needle video' : `Playlist video ${index}`, author: 'Creator', authorId: 'channel' }));

describe('playlist video list', () => {
  it('uses Feed-equivalent filtering and pagination for playlist videos', () => {
    const first = playlistVideoPage(videos, '', 0);
    expect(first.videos).toHaveLength(30);
    expect(first.page.pages).toBe(2);
    expect(playlistVideoPage(videos, '', 1).videos.map(video => video.videoId)).toEqual(['video-30']);
    expect(playlistVideoPage(videos, 'needle', 0).videos.map(video => video.videoId)).toEqual(['video-30']);
  });
});
