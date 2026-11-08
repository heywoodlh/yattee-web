export type StreamFormat = {
  itag: string;
  url: string;
  type?: string;
  container?: string;
  quality?: string;
  qualityLabel?: string;
  resolution?: string;
  fps?: number | string;
  audioQuality?: string;
  // Yattee Server sets this on audio-only formats; isDefault marks the original track.
  audioTrack?: { id?: string | null; displayName?: string; isDefault?: boolean } | null;
};

export type PlayableVideo = {
  hlsUrl?: string;
  formatStreams?: StreamFormat[];
  adaptiveFormats?: StreamFormat[];
};

export function playableVideoFormats(video: PlayableVideo): StreamFormat[] {
  return [...(video.formatStreams || []), ...(video.adaptiveFormats || []).filter(format => format.type?.startsWith('video/') || !!format.resolution)];
}

export type AudioLanguage = { id: string; label: string; original: boolean };

const audioFormats = (video: PlayableVideo) => (video.adaptiveFormats || []).filter(format => format.type?.startsWith('audio/'));
const languageBase = (language: string) => language.toLowerCase().split('-')[0];

export function normalizeAudioLanguage(value: unknown): string {
  return typeof value === 'string' && /^(?:original|[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)$/.test(value) ? value : 'original';
}

export function audioLanguages(video: PlayableVideo): AudioLanguage[] {
  const languages = new Map<string, AudioLanguage>();
  for (const format of audioFormats(video)) {
    const id = format.audioTrack?.id;
    if (!id) continue;
    const existing = languages.get(id);
    const original = existing?.original || format.audioTrack?.isDefault === true;
    languages.set(id, { id, label: existing?.label || format.audioTrack?.displayName || id, original });
  }
  return [...languages.values()].sort((a, b) => Number(b.original) - Number(a.original));
}

// Pick the track to play for a saved preference ('original' or a language
// code): an exact or same-base-language match, else the original track.
export function resolveAudioLanguage(video: PlayableVideo, preference: string): string | undefined {
  const languages = audioLanguages(video);
  if (preference !== 'original') {
    const wanted = preference.toLowerCase();
    const match = languages.find(language => language.id.toLowerCase() === wanted)
      || languages.find(language => languageBase(language.id) === languageBase(wanted));
    if (match) return match.id;
  }
  return (languages.find(language => language.original) || languages[0])?.id;
}

const usesAdaptiveAuto = (video: PlayableVideo) => audioLanguages(video).length > 1 && adaptiveAutoVideo(video) !== undefined;
const height = (format: StreamFormat) => parseInt(format.resolution || format.qualityLabel || format.quality || '', 10) || 0;
function adaptiveAutoVideo(video: PlayableVideo): StreamFormat | undefined {
  const videos = (video.adaptiveFormats || []).filter(format => format.type?.startsWith('video/') && format.url).sort((a, b) => height(b) - height(a));
  const capped = videos.filter(format => height(format) <= 1080);
  return capped.find(format => format.type?.startsWith('video/mp4')) || capped[0] || videos[videos.length - 1];
}

export function chooseAudioSource(video: PlayableVideo, selectedItag: string, language?: string): string | undefined {
  if (selectedItag === 'auto' ? !usesAdaptiveAuto(video) : video.formatStreams?.some(format => format.itag === selectedItag)) return undefined;
  const target = language && audioLanguages(video).some(entry => entry.id === language) ? language : resolveAudioLanguage(video, 'original');
  const candidates = target ? audioFormats(video).filter(format => format.audioTrack?.id === target) : audioFormats(video);
  const pool = candidates.length ? candidates : audioFormats(video);
  return (pool.find(format => format.type?.startsWith('audio/mp4')) || pool[0])?.url;
}

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
  const formats = playableVideoFormats(video);
  if (selectedItag !== 'auto') return formats.find(format => format.itag === selectedItag)?.url;
  // HLS and muxed streams don't say which audio language they carry, so play
  // adaptive video with a separately chosen track when there is a choice.
  if (usesAdaptiveAuto(video)) return adaptiveAutoVideo(video)?.url;
  if (supportsNativeHls && video.hlsUrl) return video.hlsUrl;
  return formats.find(format => format.type?.startsWith('video/mp4') || format.container === 'mp4')?.url
    || formats.find(format => format.type?.startsWith('video/webm') || format.container === 'webm')?.url
    || formats[0]?.url;
}
