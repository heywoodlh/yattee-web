import { feedPage } from './feed-cache';
import type { Video } from './store';
import { matchingVideos } from './video-search';

export function playlistVideoPage(videos: Video[] | undefined, query: string, requestedPage: number) {
  const matching = matchingVideos(Array.isArray(videos) ? videos : [], query);
  const page = feedPage(matching, requestedPage);
  return { videos: page.videos, page, matching };
}
