import { describe, expect, it } from 'vitest';
import { saveButtonLabel, shareButtonLabel, shareConfirmationMillis, toggleSaved } from './video-action-feedback';

const video = { videoId: 'video-1', title: 'Video', author: 'Creator', authorId: 'channel' };

describe('video action feedback', () => {
  it('turns Save into a checked Unsave action for an already saved video', () => {
    expect(saveButtonLabel(true)).toBe('✓ Unsave');
  });

  it('adds an unsaved video and removes it on a subsequent save action', () => {
    expect(toggleSaved([], video)).toEqual([video]);
    expect(toggleSaved([video], video)).toEqual([]);
  });
});

describe('share button feedback', () => {
  it('uses a checked Copied label only while confirmation is active', () => {
    expect(shareButtonLabel(false)).toBe('Share');
    expect(shareButtonLabel(true)).toBe('✓ Copied');
  });

  it('clears confirmation after five seconds', () => {
    expect(shareConfirmationMillis).toBe(5000);
  });
});
