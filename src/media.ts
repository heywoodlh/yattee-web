export type MediaVideo = { videoId: string; originalUrl?: string; videoUrl?: string };

export function upstreamShareUrl(video: MediaVideo): string | undefined {
  return video.originalUrl || video.videoUrl;
}

export function downloadUrl(source: string, filename: string): string {
  return `/download?url=${encodeURIComponent(source)}&filename=${encodeURIComponent(filename)}.mp4`;
}
