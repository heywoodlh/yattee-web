import { describe, expect, it } from 'vitest';
import { videoMenuActions } from './video-actions';

describe('video card menu actions', () => {
  it('offers watched, playlist, then MP4 download in every video menu', () => {
    expect(videoMenuActions()).toEqual(['Mark as watched', 'Add to playlist', 'Download MP4']);
  });

  it('adds context-specific actions after the universal actions', () => {
    expect(videoMenuActions(['Remove'])).toEqual(['Mark as watched', 'Add to playlist', 'Download MP4', 'Remove']);
  });
});
