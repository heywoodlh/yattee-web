import { describe, expect, it } from 'vitest';
import { hasReachedWatchThreshold, shouldAutoplay, updatePlayback } from './playback';

const video = { videoId: 'abcdefghijk', title: 'Video', author: 'Creator', authorId: 'creator', lengthSeconds: 100 };

describe('playback persistence', () => {
  it('marks a finite video watched in its final five seconds', () => {
    expect(hasReachedWatchThreshold(video, 94)).toBe(false);
    expect(hasReachedWatchThreshold(video, 95)).toBe(true);
  });

  it('persists paused playback without allowing an automatic resume', () => {
    const history = updatePlayback([], video, 37, true);
    expect(history[0]).toMatchObject({ videoId: video.videoId, resume: 37, paused: true });
    expect(shouldAutoplay(history[0], true)).toBe(false);
  });
});
