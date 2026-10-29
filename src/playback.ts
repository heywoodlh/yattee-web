import type { Video } from './store';

export const WATCHED_REMAINING_SECONDS = 5;

export function hasReachedWatchThreshold(video: Pick<Video, 'lengthSeconds'>, currentTime: number): boolean {
  return typeof video.lengthSeconds === 'number'
    && video.lengthSeconds > 0
    && currentTime >= Math.max(0, video.lengthSeconds - WATCHED_REMAINING_SECONDS);
}

export function updatePlayback(history: Video[], video: Video, currentTime: number, paused: boolean): Video[] {
  const existing = history.find(entry => entry.videoId === video.videoId);
  const next = { ...video, ...existing, resume: currentTime, paused };
  return [next, ...history.filter(entry => entry.videoId !== video.videoId)].slice(0, 200);
}

export function shouldAutoplay(video: { paused?: boolean }, autoplay: boolean): boolean {
  return autoplay && video.paused !== true;
}
