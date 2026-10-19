import type { Video } from './store';

export function matchingVideos(videos: Video[], query: string) {
  const needle = query.trim().toLocaleLowerCase();
  return needle ? videos.filter(video => `${video.title} ${video.author}`.toLocaleLowerCase().includes(needle)) : videos;
}
