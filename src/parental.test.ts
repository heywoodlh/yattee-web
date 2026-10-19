import { describe, expect, it } from 'vitest';
import { blockedRoute, canAddContent } from './parental';

describe('parental controls policy', () => {
  const controls = { enabled: true, disableSearch: true, disableSubscriptions: true, disablePlaylists: true };

  it('blocks search and playlist routes when their restrictions are enabled', () => {
    expect(blockedRoute('search/cats', controls)).toBe(true);
    expect(blockedRoute('playlists', controls)).toBe(true);
    expect(blockedRoute('home', controls)).toBe(false);
  });

  it('blocks subscription and local-content additions when their restrictions are enabled', () => {
    expect(canAddContent('subscription', controls)).toBe(false);
    expect(canAddContent('playlist', controls)).toBe(false);
    expect(canAddContent('bookmark', controls)).toBe(false);
    expect(canAddContent('queue', controls)).toBe(false);
  });

  it('allows normal use while parental controls are disabled', () => {
    const unlocked = { ...controls, enabled: false };
    expect(blockedRoute('search/cats', unlocked)).toBe(false);
    expect(canAddContent('subscription', unlocked)).toBe(true);
  });
});
