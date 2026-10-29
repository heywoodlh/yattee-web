import { describe, expect, it } from 'vitest';
import { chooseAudioSource, chooseDownloadSource, choosePlaybackSource, playableVideoFormats, proxyPlaybackUrl, requiresHlsJs, streamQualityLabel } from './stream';

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
