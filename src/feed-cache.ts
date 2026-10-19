import type { Video } from './store';

export const feedPageSize = 30;
export const feedCacheLimit = 1000;

export type FeedCache = { videos: Video[]; updatedAt?: string };

export const emptyFeedCache: FeedCache = { videos: [] };

function unchanged(left: Video, right: Video) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Merge a completed background response into the local feed. Existing videos that
 * the server did not return remain cached, and structurally unchanged entries keep
 * their prior objects so rendering and persistence do not rebuild them needlessly.
 */
export function mergeFeedCache(current: FeedCache, incoming: Video[], limit = feedCacheLimit): FeedCache {
  const existing = new Map(current.videos.map(video => [video.videoId, video]));
  const next: Video[] = [];
  const seen = new Set<string>();
  for (const received of incoming) {
    if (!received?.videoId || seen.has(received.videoId)) continue;
    seen.add(received.videoId);
    const cached = existing.get(received.videoId);
    next.push(cached && unchanged(cached, received) ? cached : received);
  }
  for (const cached of current.videos) {
    if (!seen.has(cached.videoId)) next.push(cached);
  }
  const videos = next.slice(0, limit);
  if (videos.length === current.videos.length && videos.every((video, index) => video === current.videos[index])) return current;
  return { videos, updatedAt: new Date().toISOString() };
}

export function feedPage(videos: Video[], requestedPage: number, size = feedPageSize) {
  const pages = Math.max(1, Math.ceil(videos.length / size));
  const page = Math.min(Math.max(0, requestedPage), pages - 1);
  return { videos: videos.slice(page * size, (page + 1) * size), page, pages };
}
