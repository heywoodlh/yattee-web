export type MediaVideo = { videoId: string; originalUrl?: string; videoUrl?: string };

export function upstreamShareUrl(video: MediaVideo): string | undefined {
  if (video.originalUrl || video.videoUrl) return video.originalUrl || video.videoUrl;
  return /^[A-Za-z0-9_-]{11}$/.test(video.videoId) ? `https://www.youtube.com/watch?v=${video.videoId}` : undefined;
}

export function downloadUrl(source: string, filename: string): string {
  return `/download?url=${encodeURIComponent(source)}&filename=${encodeURIComponent(filename)}.mp4`;
}
