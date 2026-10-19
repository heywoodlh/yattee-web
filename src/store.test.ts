import { describe, expect, it } from 'vitest';
import { initialStore, loadStore } from './store';

describe('loadStore', () => {
  it('recovers to usable defaults from corrupt browser storage', () => {
    expect(loadStore('{not JSON')).toEqual(initialStore);
  });

  it('does not allow malformed saved collections to crash views', () => {
    const store = loadStore(JSON.stringify({ history: null, bookmarks: {}, subscriptions: 'bad', settings: null }));
    expect(store.history).toEqual([]);
    expect(store.bookmarks).toEqual([]);
    expect(store.subscriptions).toEqual([]);
    expect(store.settings).toEqual({ autoplay: true, speed: 1, quality: 'auto', instanceUrl: '', theme: 'default' });
  });

  it('restores a filesystem-backed feed cache but rejects malformed cache contents', () => {
    const cached = loadStore(JSON.stringify({ feedCache: { videos: [{ videoId: 'video', title: 'Cached', author: 'Creator', authorId: 'channel' }], updatedAt: '2026-10-20T00:00:00.000Z' } }));
    expect(cached.feedCache.videos).toHaveLength(1);
    expect(cached.feedCache.updatedAt).toBe('2026-10-20T00:00:00.000Z');
    expect(loadStore(JSON.stringify({ feedCache: { videos: 'bad' } })).feedCache.videos).toEqual([]);
  });

  it('normalizes legacy playlists before the playlist page renders their video count', () => {
    expect(loadStore(JSON.stringify({ playlists: [{ id: 'legacy', name: 'Old playlist' }] })).playlists).toEqual([{ id: 'legacy', name: 'Old playlist', videos: [] }]);
  });
});
