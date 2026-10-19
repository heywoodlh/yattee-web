import { describe, expect, it } from 'vitest';
import { shareDialogCopyLabel, shareDialogUrl } from './share-dialog';

const video = { videoId: 'video-1', title: 'Video', author: 'Creator', authorId: 'channel', originalUrl: 'https://www.youtube.com/watch?v=video-1' };

describe('share dialog', () => {
  it('uses the upstream YouTube URL in its selectable field', () => {
    expect(shareDialogUrl(video)).toBe('https://www.youtube.com/watch?v=video-1');
  });

  it('shows copy feedback only after the copy action succeeds', () => {
    expect(shareDialogCopyLabel(false)).toBe('Copy');
    expect(shareDialogCopyLabel(true)).toBe('✓ Copied');
  });
});
