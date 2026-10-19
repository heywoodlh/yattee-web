import type { Video } from './store';

export function continueWatching(history: Video[]) {
  return history.filter(video => !video.watched && typeof video.resume === 'number' && video.resume > 0 && (!video.lengthSeconds || video.resume < Math.max(0, video.lengthSeconds - 5)));
}

export function markWatched(history: Video[], video: Video) {
  const completed = { ...video, watched: true, resume: video.lengthSeconds || Number.MAX_SAFE_INTEGER };
  return [completed, ...history.filter(entry => entry.videoId !== video.videoId)];
}

export function resumePosition(video: Video): number {
  if (typeof video.resume !== 'number' || video.resume <= 0) return 0;
  return !video.lengthSeconds || video.resume < Math.max(0, video.lengthSeconds - 5) ? video.resume : 0;
}
