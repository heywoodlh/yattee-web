import type { Video } from './store';

export type LocalPlaylist = { id: string; name: string; videos: Video[] };

type UUIDSource = { randomUUID?: () => string } | undefined;

export function localPlaylistId(source: UUIDSource = globalThis.crypto, random: () => number = Math.random, now: () => number = Date.now): string {
  if (typeof source?.randomUUID === 'function') return source.randomUUID();
  return `playlist-${now().toString(36)}-${Math.floor(random() * 0xffffffff).toString(36)}`;
}

export function addVideoToLocalPlaylist(playlists: LocalPlaylist[], playlistId: string, video: Video): LocalPlaylist[] {
  return playlists.map(playlist => {
    if (playlist.id !== playlistId) return playlist;
    const videos = Array.isArray(playlist.videos) ? playlist.videos : [];
    return { ...playlist, videos: videos.some(entry => entry.videoId === video.videoId) ? videos : [...videos, video] };
  });
}

export function createEmptyLocalPlaylist(name: string, createId: () => string = localPlaylistId): Required<LocalPlaylist> {
  return { id: createId(), name, videos: [] };
}

export function createLocalPlaylist(name: string, video: Video, createId: () => string = localPlaylistId): Required<LocalPlaylist> {
  return { id: createId(), name, videos: [video] };
}
