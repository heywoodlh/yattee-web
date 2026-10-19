import { describe, expect, it, vi } from 'vitest';
import { initialSyncedState, loadSyncedState, normalizeSyncedState } from './sync';

describe('normalizeSyncedState', () => {
  it('retries a temporarily unavailable profile before failing startup', async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValue(new Response(JSON.stringify({ history: [] }), { status: 200 }));
    await expect(loadSyncedState(request as typeof fetch, 3, 0)).resolves.toMatchObject({ history: [] });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('preserves every iOS-equivalent collection when loaded from the filesystem API', () => {
    const state = normalizeSyncedState({
      subscriptions: [{ authorId: 'channel', author: 'Creator' }],
      history: [{ videoId: 'video', title: 'Video', author: 'Creator', authorId: 'channel' }],
      bookmarks: [{ videoId: 'bookmark', title: 'Saved', author: 'Creator', authorId: 'channel' }],
      playlists: [{ id: 'playlist', name: 'Offline', videos: [] }],
      queue: [{ videoId: 'queued', title: 'Queued', author: 'Creator', authorId: 'channel' }],
      searchHistory: ['test query'],
      recentChannels: [{ authorId: 'channel', author: 'Creator' }],
      recentPlaylists: [{ playlistId: 'remote', title: 'Remote' }],
      instances: [{ id: 'default', url: 'https://example.test' }],
      mediaSources: [{ id: 'youtube', name: 'YouTube' }],
      channelNotificationSettings: [{ channelId: 'channel', enabled: true }],
      controlsPresets: [{ id: 'bedtime', name: 'Bedtime' }],
      feedCache: { videos: [{ videoId: 'video', title: 'Cached', author: 'Creator', authorId: 'channel' }] },
      settings: { theme: 'dracula' },
    });

    expect(state.searchHistory).toEqual(['test query']);
    expect(state.recentChannels).toHaveLength(1);
    expect(state.recentPlaylists).toHaveLength(1);
    expect(state.instances).toHaveLength(1);
    expect(state.mediaSources).toHaveLength(1);
    expect(state.channelNotificationSettings).toHaveLength(1);
    expect(state.controlsPresets).toHaveLength(1);
    expect(state.feedCache.videos).toHaveLength(1);
    expect(state.settings.theme).toBe('dracula');
  });

  it('recovers malformed filesystem state without rendering unsafe values', () => {
    expect(normalizeSyncedState({ history: 'bad', settings: [] })).toEqual(initialSyncedState);
  });
});
