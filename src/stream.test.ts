import { describe, expect, it } from 'vitest';
import { audioLanguages, chooseAudioSource, chooseDownloadSource, choosePlaybackSource, normalizeAudioLanguage, playableVideoFormats, proxyPlaybackUrl, requiresHlsJs, resolveAudioLanguage, streamQualityLabel } from './stream';

describe('choosePlaybackSource', () => {
  const video = {
    hlsUrl: 'https://relay.example/live.m3u8',
    formatStreams: [
      { itag: '18', url: 'https://relay.example/video.mp4', type: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"', container: 'mp4' },
      { itag: '43', url: 'https://relay.example/video.webm', type: 'video/webm; codecs="vp8, vorbis"', container: 'webm' },
    ],
  };

  it('prefers a muxed MP4 stream over HLS when the browser has no native HLS support', () => {
    expect(choosePlaybackSource(video, false, 'auto')).toBe('https://relay.example/video.mp4');
  });

  it('uses HLS for auto quality only when the browser supports HLS natively', () => {
    expect(choosePlaybackSource(video, true, 'auto')).toBe('https://relay.example/live.m3u8');
  });

  it('uses the explicitly selected muxed format on every browser', () => {
    expect(choosePlaybackSource(video, false, '43')).toBe('https://relay.example/video.webm');
  });

  it('marks an HLS-only stream for hls.js in browsers without native HLS', () => {
    const hlsOnly = { formatStreams: [{ itag: '269', url: 'https://relay.example/live', type: 'application/vnd.apple.mpegurl', container: 'hls' }] };
    const source = choosePlaybackSource(hlsOnly, false, 'auto');
    expect(requiresHlsJs(hlsOnly, source, false)).toBe(true);
  });

  it('selects a direct MP4 media URL for downloads rather than an HLS manifest', () => {
    expect(chooseDownloadSource(video)).toBe('https://relay.example/video.mp4');
  });

  it('does not offer a download when no MP4 media stream is available', () => {
    expect(chooseDownloadSource({ formatStreams: [{ itag: '269', url: 'https://relay.example/live', container: 'hls' }] })).toBeUndefined();
  });

  it('routes media through the same-origin stream relay', () => {
    expect(proxyPlaybackUrl('https://manifest.googlevideo.com/live.m3u8?token=one')).toBe('/stream?url=https%3A%2F%2Fmanifest.googlevideo.com%2Flive.m3u8%3Ftoken%3Done');
  });

  it('labels a format with both its resolution and frame rate', () => {
    expect(streamQualityLabel({ itag: '299', url: 'https://relay.example/1080p60.mp4', resolution: '1080p', fps: 60 })).toBe('1080p · 60 fps');
    expect(streamQualityLabel({ itag: '18', url: 'https://relay.example/360.mp4', quality: '360p' })).toBe('360p');
  });

  it('offers video-only adaptive renditions with a separately selected audio source', () => {
    const adaptiveVideo = { itag: '299', url: 'https://relay.example/1080p60-video.mp4', type: 'video/mp4; codecs="avc1.640028"', resolution: '1080p', fps: 60 };
    const adaptiveAudio = { itag: '140', url: 'https://relay.example/audio.m4a', type: 'audio/mp4; codecs="mp4a.40.2"' };
    const source = { formatStreams: [{ itag: '18', url: 'https://relay.example/360.mp4', type: 'video/mp4; codecs="avc1,mp4a"' }], adaptiveFormats: [adaptiveVideo, adaptiveAudio] };
    expect(playableVideoFormats(source)).toEqual([source.formatStreams[0], adaptiveVideo]);
    expect(choosePlaybackSource(source, false, '299')).toBe(adaptiveVideo.url);
    expect(chooseAudioSource(source, '299')).toBe(adaptiveAudio.url);
  });
});

describe('audio language selection', () => {
  const muxed = { itag: '18', url: 'https://relay.example/muxed.mp4', type: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"', container: 'mp4' };
  const v720 = { itag: '136', url: 'https://relay.example/720.mp4', type: 'video/mp4; codecs="avc1.4d401f"', container: 'mp4', resolution: '720p' };
  const v1080 = { itag: '137', url: 'https://relay.example/1080.mp4', type: 'video/mp4; codecs="avc1.640028"', container: 'mp4', resolution: '1080p' };
  const v2160 = { itag: '313', url: 'https://relay.example/2160.webm', type: 'video/webm; codecs="vp9"', container: 'webm', resolution: '2160p' };
  const ja = { itag: '140-ja', url: 'https://relay.example/ja.m4a', type: 'audio/mp4; codecs="mp4a.40.2"', container: 'm4a', audioTrack: { id: 'ja', displayName: 'Japanese', isDefault: false } };
  const enWebm = { itag: '251-en', url: 'https://relay.example/en.webm', type: 'audio/webm; codecs="opus"', container: 'webm', audioTrack: { id: 'en-US', displayName: 'English (United States) original', isDefault: true } };
  const en = { itag: '140-en', url: 'https://relay.example/en.m4a', type: 'audio/mp4; codecs="mp4a.40.2"', container: 'm4a', audioTrack: { id: 'en-US', displayName: 'English (United States) original', isDefault: true } };
  const es = { itag: '140-es', url: 'https://relay.example/es.m4a', type: 'audio/mp4; codecs="mp4a.40.2"', container: 'm4a', audioTrack: { id: 'es', displayName: 'Spanish', isDefault: false } };
  const dubbed = { hlsUrl: 'https://relay.example/live.m3u8', formatStreams: [muxed], adaptiveFormats: [v2160, v720, v1080, ja, enWebm, en, es] };

  it('lists each audio language once with the original first', () => {
    expect(audioLanguages(dubbed)).toEqual([
      { id: 'en-US', label: 'English (United States) original', original: true },
      { id: 'ja', label: 'Japanese', original: false },
      { id: 'es', label: 'Spanish', original: false },
    ]);
    expect(audioLanguages({ adaptiveFormats: [{ itag: '140', url: 'x', type: 'audio/mp4' }] })).toEqual([]);
  });

  it('resolves a preference to an available track, falling back to the original', () => {
    expect(resolveAudioLanguage(dubbed, 'original')).toBe('en-US');
    expect(resolveAudioLanguage(dubbed, 'es')).toBe('es');
    expect(resolveAudioLanguage(dubbed, 'en')).toBe('en-US');
    expect(resolveAudioLanguage(dubbed, 'ES-419')).toBe('es');
    expect(resolveAudioLanguage(dubbed, 'fr')).toBe('en-US');
    expect(resolveAudioLanguage({ adaptiveFormats: [ja] }, 'original')).toBe('ja');
    expect(resolveAudioLanguage({ adaptiveFormats: [en] }, 'original')).toBe('en-US');
    expect(resolveAudioLanguage({}, 'original')).toBeUndefined();
  });

  it('pairs a manually selected video with the original track instead of the first one listed', () => {
    expect(chooseAudioSource(dubbed, '137')).toBe(en.url);
    expect(chooseAudioSource(dubbed, '137', 'ja')).toBe(ja.url);
    expect(chooseAudioSource(dubbed, '137', 'es')).toBe(es.url);
  });

  it('switches auto quality to adaptive video plus the chosen track when a video has several languages', () => {
    expect(choosePlaybackSource(dubbed, false, 'auto')).toBe(v1080.url);
    expect(choosePlaybackSource(dubbed, true, 'auto')).toBe(v1080.url);
    expect(chooseAudioSource(dubbed, 'auto')).toBe(en.url);
    expect(chooseAudioSource(dubbed, 'auto', 'ja')).toBe(ja.url);
  });

  it('keeps auto quality on HLS or muxed streams for single-language videos', () => {
    const single = { hlsUrl: 'https://relay.example/live.m3u8', formatStreams: [muxed], adaptiveFormats: [v1080, en] };
    expect(choosePlaybackSource(single, false, 'auto')).toBe(muxed.url);
    expect(choosePlaybackSource(single, true, 'auto')).toBe(single.hlsUrl);
    expect(chooseAudioSource(single, 'auto')).toBeUndefined();
  });

  it('normalizes the saved preferred language', () => {
    expect(normalizeAudioLanguage(undefined)).toBe('original');
    expect(normalizeAudioLanguage('ja')).toBe('ja');
    expect(normalizeAudioLanguage('es-419')).toBe('es-419');
    expect(normalizeAudioLanguage('<script>')).toBe('original');
    expect(normalizeAudioLanguage(42)).toBe('original');
  });
});
