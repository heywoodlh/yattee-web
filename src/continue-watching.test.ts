import { describe, expect, it } from 'vitest';
import { continueWatching, markWatched, resumePosition } from './continue-watching';

describe('continue watching', () => {
  it('keeps resumable history and excludes completed videos', () => {
    const videos = [
      { videoId: 'resume', title: 'Resume', author: 'A', authorId: 'UCa', lengthSeconds: 100, resume: 20 },
      { videoId: 'done', title: 'Done', author: 'A', authorId: 'UCa', lengthSeconds: 100, resume: 96 },
      { videoId: 'new', title: 'New', author: 'A', authorId: 'UCa' },
    ];
    expect(continueWatching(videos).map(video => video.videoId)).toEqual(['resume']);
  });

  it('moves a selected video into history as completed', () => {
    const videos = [
      { videoId: 'done', title: 'Done', author: 'A', authorId: 'UCa', lengthSeconds: 100, resume: 20 },
      { videoId: 'keep', title: 'Keep', author: 'A', authorId: 'UCa', lengthSeconds: 100, resume: 20 },
    ];
    expect(markWatched(videos, videos[0])).toEqual([{ ...videos[0], watched: true, resume: 100 }, videos[1]]);
    expect(continueWatching(markWatched(videos, videos[0]))).toEqual([videos[1]]);
  });

  it('uses only an incomplete saved progress position to resume a video', () => {
    expect(resumePosition({ videoId: 'resume', title: 'Resume', author: 'A', authorId: 'UCa', lengthSeconds: 100, resume: 27 })).toBe(27);
    expect(resumePosition({ videoId: 'done', title: 'Done', author: 'A', authorId: 'UCa', lengthSeconds: 100, resume: 96 })).toBe(0);
  });
});
