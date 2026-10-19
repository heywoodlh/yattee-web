import { describe, expect, it } from 'vitest';
import { matchingVideos } from './video-search';

const videos = [
  { videoId: 'one', title: 'Making breakfast', author: 'Chef Mina', authorId: 'UCone' },
  { videoId: 'two', title: 'Mountain walk', author: 'Trail Light', authorId: 'UCtwo' },
];

describe('video search', () => {
  it('matches feed and history videos by title or channel name', () => {
    expect(matchingVideos(videos, 'trail')).toEqual([videos[1]]);
    expect(matchingVideos(videos, 'breakfast')).toEqual([videos[0]]);
  });

  it('keeps all videos for an empty query', () => expect(matchingVideos(videos, '')).toEqual(videos));
});
