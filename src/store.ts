import type { FeedCache } from './feed-cache';

export type Video = { type?: string; videoId: string; title: string; author: string; authorId: string; lengthSeconds?: number; liveNow?: boolean; viewCount?: number; publishedText?: string; videoThumbnails?: { url: string }[]; videoUrl?: string; originalUrl?: string; resume?: number; watched?: boolean };
export type Channel = { authorId: string; author: string; description?: string; subCount?: number; authorThumbnails?: { url: string }[]; originalUrl?: string; authorUrl?: string; channelUrl?: string };
export type Playlist = { playlistId: string; title: string; author?: string; videoCount?: number; playlistThumbnail?: string; videos?: Video[] };
export type Theme = 'default' | 'light' | 'nord' | 'catppuccin-mocha' | 'solarized' | 'dracula';
export type Store = {
  history: Video[];
  bookmarks: Video[];
  subscriptions: Channel[];
  playlists: { id: string; name: string; videos: Video[] }[];
  queue: Video[];
  settings: { autoplay: boolean; speed: number; quality: string; instanceUrl: string; theme: Theme };
  searchHistory: string[];
  recentChannels: Channel[];
  recentPlaylists: { playlistId: string; title: string }[];
  instances: { id: string; url: string }[];
  mediaSources: { id: string; name: string }[];
  channelNotificationSettings: { channelId: string; enabled: boolean }[];
  controlsPresets: { id: string; name: string }[];
  feedCache: FeedCache;
};

export const initialStore: Store = {
  history: [], bookmarks: [], subscriptions: [], playlists: [], queue: [],
  settings: { autoplay: true, speed: 1, quality: 'auto', instanceUrl: '', theme: 'default' },
  searchHistory: [], recentChannels: [], recentPlaylists: [], instances: [], mediaSources: [],
  channelNotificationSettings: [], controlsPresets: [], feedCache: { videos: [] },
};

const array = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const localPlaylists = (value: unknown): Store['playlists'] => array<unknown>(value).flatMap(item => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
  const playlist = item as { id?: unknown; name?: unknown; videos?: unknown };
  if (typeof playlist.id !== 'string' || typeof playlist.name !== 'string') return [];
  return [{ id: playlist.id, name: playlist.name, videos: array<Video>(playlist.videos) }];
});

export function loadStore(raw: string | null): Store {
  try {
    const saved = JSON.parse(raw || '{}') as Partial<Store>;
    const settings = saved.settings && typeof saved.settings === 'object' && !Array.isArray(saved.settings) ? saved.settings : {};
    return {
      ...initialStore,
      history: array<Video>(saved.history),
      bookmarks: array<Video>(saved.bookmarks),
      subscriptions: array<Channel>(saved.subscriptions),
      playlists: localPlaylists(saved.playlists),
      queue: array<Video>(saved.queue),
      feedCache: saved.feedCache && typeof saved.feedCache === 'object' && !Array.isArray(saved.feedCache) ? { videos: array<Video>((saved.feedCache as FeedCache).videos), updatedAt: typeof (saved.feedCache as FeedCache).updatedAt === 'string' ? (saved.feedCache as FeedCache).updatedAt : undefined } : initialStore.feedCache,
      settings: { ...initialStore.settings, ...settings },
    };
  } catch {
    return initialStore;
  }
}
