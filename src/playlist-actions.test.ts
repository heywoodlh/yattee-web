import { describe, expect, it } from 'vitest';
import { addVideoToLocalPlaylist, createEmptyLocalPlaylist, createLocalPlaylist, localPlaylistId } from './playlist-actions';

const video = { videoId: 'video-1', title: 'Video', author: 'Creator', authorId: 'channel' };

describe('local playlist actions', () => {
  it('adds a video to the selected existing playlist without duplicating it', () => {
    const playlists = [{ id: 'favorites', name: 'Favorites', videos: [] }];
    expect(addVideoToLocalPlaylist(playlists, 'favorites', video)).toEqual([{ id: 'favorites', name: 'Favorites', videos: [video] }]);
    expect(addVideoToLocalPlaylist([{ id: 'favorites', name: 'Favorites', videos: [video] }], 'favorites', video)).toEqual([{ id: 'favorites', name: 'Favorites', videos: [video] }]);
  });

  it('repairs an older playlist with no videos array rather than throwing', () => {
    const legacy = [{ id: 'legacy', name: 'Legacy playlist' }] as unknown as { id: string; name: string; videos: typeof video[] }[];
    expect(addVideoToLocalPlaylist(legacy, 'legacy', video)).toEqual([{ id: 'legacy', name: 'Legacy playlist', videos: [video] }]);
  });

  it('creates a new playlist containing the selected video', () => {
    const playlist = createLocalPlaylist('Watch later', video, () => 'new-playlist');
    expect(playlist).toEqual({ id: 'new-playlist', name: 'Watch later', videos: [video] });
  });

  it('creates an empty playlist when Web Crypto UUIDs are unavailable on an insecure origin', () => {
    expect(localPlaylistId({}, () => 0.125, () => 0)).toBe('playlist-0-8vn08v');
    expect(createEmptyLocalPlaylist('Offline list', () => 'fallback-id')).toEqual({ id: 'fallback-id', name: 'Offline list', videos: [] });
  });
});
