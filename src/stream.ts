export type StreamFormat = {
  itag: string;
  url: string;
  type?: string;
  container?: string;
  quality?: string;
  qualityLabel?: string;
  resolution?: string;
  fps?: number | string;
};

export type PlayableVideo = {
  hlsUrl?: string;
  formatStreams?: StreamFormat[];
};

export function streamQualityLabel(format: StreamFormat): string {
  const resolution = format.resolution || format.quality || format.qualityLabel || format.itag;
  const fps = typeof format.fps === 'number' || typeof format.fps === 'string' ? String(format.fps) : '';
  return fps ? `${resolution} · ${fps} fps` : resolution;
}

export function requiresHlsJs(
  video: PlayableVideo,
  source: string | undefined,
  supportsNativeHls: boolean,
): boolean {
  if (!source || supportsNativeHls) return false;
  if (video.hlsUrl === source) return true;
  const format = video.formatStreams?.find(candidate => candidate.url === source);
  return format?.container === 'hls' || format?.type?.includes('mpegurl') === true;
}

export function proxyPlaybackUrl(source: string | undefined): string | undefined {
  return source ? `/stream?url=${encodeURIComponent(source)}` : undefined;
}

export function chooseDownloadSource(video: PlayableVideo): string | undefined {
  return video.formatStreams?.find(format => format.type?.startsWith('video/mp4') || format.container === 'mp4')?.url;
}

export function choosePlaybackSource(
  video: PlayableVideo,
  supportsNativeHls: boolean,
  selectedItag: string,
): string | undefined {
  const formats = video.formatStreams || [];
  if (selectedItag !== 'auto') return formats.find(format => format.itag === selectedItag)?.url;
  if (supportsNativeHls && video.hlsUrl) return video.hlsUrl;
  return formats.find(format => format.type?.startsWith('video/mp4') || format.container === 'mp4')?.url
    || formats.find(format => format.type?.startsWith('video/webm') || format.container === 'webm')?.url
    || formats[0]?.url;
}
