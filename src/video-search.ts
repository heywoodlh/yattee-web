import type { Channel, Playlist, Video } from './store';

export type SearchFilter = 'all' | 'videos' | 'channels' | 'topics' | 'playlists';
export const searchFilters: { value: SearchFilter; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'videos', label: 'Videos' },
  { value: 'channels', label: 'Channels' }, { value: 'topics', label: 'Topics' },
  { value: 'playlists', label: 'Playlists' },
];
export function searchRequestType(filter: SearchFilter): 'all' | 'video' | 'channel' | 'playlist' {
  return filter === 'topics' || filter === 'channels' ? 'channel' : filter === 'videos' ? 'video' : filter === 'playlists' ? 'playlist' : 'all';
}
export function searchQuery(query: string, filter: SearchFilter): string {
  return filter === 'topics' && !/\s[-–]?\sTopic$/i.test(query) ? `${query} Topic` : query;
}
export function searchRoute(query: string, filter: SearchFilter): string {
  return `search/${filter}${query.trim() ? `/${encodeURIComponent(query.trim())}` : ''}`;
}
export function parseSearchRoute(route: string): { filter: SearchFilter; query: string } {
  const [, segment, ...rest] = route.split('/');
  const filter = searchFilters.find(option => option.value === segment)?.value;
  return { filter: filter || 'all', query: decodeURIComponent((filter ? rest : [segment, ...rest]).filter(Boolean).join('/')) };
}
export function visibleSearchResults(results: (Video | Channel | Playlist)[], filter: SearchFilter) {
  if (filter === 'all') return results;
  if (filter === 'videos') return results.filter(item => 'videoId' in item);
  if (filter === 'playlists') return results.filter(item => 'playlistId' in item);
  const channels = results.filter((item): item is Channel => 'authorId' in item && !('videoId' in item) && !('playlistId' in item));
  return filter === 'topics' ? channels.filter(item => /\s[-–]\sTopic$/i.test(item.author)) : channels;
}

export function matchingVideos(videos: Video[], query: string) {
  const needle = query.trim().toLocaleLowerCase();
  return needle ? videos.filter(video => `${video.title} ${video.author}`.toLocaleLowerCase().includes(needle)) : videos;
}
