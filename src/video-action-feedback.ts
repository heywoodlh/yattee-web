import type { Video } from './store';

export const shareConfirmationMillis = 5000;

export function shareButtonLabel(shared: boolean): string {
  return shared ? '✓ Copied' : 'Share';
}

export function saveButtonLabel(saved: boolean): string {
  return saved ? '✓ Unsave' : 'Save';
}

export function toggleSaved(bookmarks: Video[], video: Video): Video[] {
  return bookmarks.some(item => item.videoId === video.videoId) ? bookmarks.filter(item => item.videoId !== video.videoId) : [video, ...bookmarks];
}
