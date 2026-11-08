import { describe, expect, it } from 'vitest';
import { attachAudioSync, audioCorrection } from './audio-sync';

class FakeMedia extends EventTarget {
  currentTime = 0;
  paused = true;
  seeking = false;
  playbackRate = 1;
  volume = 1;
  muted = false;
  plays = 0;
  play() { this.plays += 1; this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  emit(type: string) { this.dispatchEvent(new Event(type)); }
}

function setup() {
  const video = new FakeMedia();
  const audio = new FakeMedia();
  const detach = attachAudioSync(video, audio);
  return { video, audio, detach };
}

describe('audioCorrection', () => {
  it('leaves tight sync alone, nudges small drift and jumps large drift', () => {
    expect(audioCorrection(10, 10.02, 1)).toEqual({ rate: 1 });
    expect(audioCorrection(10, 10.2, 1)).toEqual({ rate: 0.95 });
    expect(audioCorrection(10, 9.8, 1.5)).toEqual({ rate: 1.575 });
    expect(audioCorrection(10, 11, 1)).toEqual({ rate: 1, seek: 10 });
    expect(audioCorrection(10, 9, 2)).toEqual({ rate: 2, seek: 10 });
  });
});

describe('attachAudioSync', () => {
  it('starts and stops the audio with the video at the video position', () => {
    const { video, audio } = setup();
    video.currentTime = 42; video.paused = false; video.emit('play'); video.emit('playing');
    expect(audio.currentTime).toBe(42);
    expect(audio.paused).toBe(false);
    video.paused = true; video.emit('pause');
    expect(audio.paused).toBe(true);
  });

  it('pauses the audio while the video buffers or seeks and resyncs afterwards', () => {
    const { video, audio } = setup();
    video.paused = false; video.emit('playing');
    video.emit('waiting');
    expect(audio.paused).toBe(true);
    video.currentTime = 5; video.emit('playing');
    expect(audio.currentTime).toBe(5);
    expect(audio.paused).toBe(false);
    video.seeking = true; video.currentTime = 90; video.emit('seeking');
    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBe(90);
    video.seeking = false; video.currentTime = 90.1; video.emit('seeked');
    expect(audio.currentTime).toBe(90); // within tolerance: no second seek
    video.currentTime = 91; video.emit('seeked');
    expect(audio.currentTime).toBe(91);
    expect(audio.paused).toBe(false);
  });

  it('holds the video while the audio buffers, then resumes it', () => {
    const { video, audio } = setup();
    video.paused = false; video.emit('playing');
    audio.emit('waiting');
    expect(video.paused).toBe(true);
    audio.emit('playing');
    expect(video.paused).toBe(false);
  });

  it('does not resume a video the user paused while the audio was buffering', () => {
    const { video, audio } = setup();
    video.paused = false; video.emit('playing');
    audio.emit('waiting');
    expect(video.paused).toBe(true);
    video.emit('pause');
    video.emit('play'); video.paused = true; video.emit('pause'); // user toggles play/pause
    audio.emit('canplay');
    expect(video.paused).toBe(true);
  });

  it('corrects drift during playback and mirrors speed and volume', () => {
    const { video, audio } = setup();
    video.paused = false; video.emit('playing');
    video.currentTime = 30; audio.currentTime = 31.5; video.emit('timeupdate');
    expect(audio.currentTime).toBe(30);
    audio.currentTime = 30.2; video.emit('timeupdate');
    expect(audio.playbackRate).toBe(0.95);
    audio.currentTime = 30; video.emit('timeupdate');
    expect(audio.playbackRate).toBe(1);
    video.playbackRate = 2; video.emit('ratechange');
    expect(audio.playbackRate).toBe(2);
    video.volume = 0.3; video.muted = true; video.emit('volumechange');
    expect(audio.volume).toBe(0.3);
    expect(audio.muted).toBe(true);
  });

  it('pauses the audio when the video ends and stops listening when detached', () => {
    const { video, audio, detach } = setup();
    video.paused = false; video.emit('playing');
    video.emit('ended');
    expect(audio.paused).toBe(true);
    detach();
    video.paused = false; video.emit('playing');
    expect(audio.paused).toBe(true);
  });
});

// Closer to real elements: play()/pause() fire their events asynchronously, and
// seeking the audio while it plays drops its buffer (waiting, then playing).
class BrowserLikeMedia extends EventTarget {
  #time = 0;
  seeks = 0;
  paused = true;
  seeking = false;
  playbackRate = 1;
  volume = 1;
  muted = false;
  constructor(private readonly dropsBufferOnSeek = false) { super(); }
  get currentTime() { return this.#time; }
  set currentTime(value: number) {
    this.#time = value; this.seeks += 1;
    if (this.dropsBufferOnSeek && !this.paused) { this.later('waiting'); this.later('playing'); }
  }
  play() { const wasPaused = this.paused; this.paused = false; if (wasPaused) { this.later('play'); this.later('playing'); } return Promise.resolve(); }
  pause() { if (!this.paused) { this.paused = true; this.later('pause'); } }
  events = 0;
  later(type: string) { if (++this.events > 200) return; queueMicrotask(() => this.dispatchEvent(new Event(type))); }
}

describe('attachAudioSync with browser-like elements', () => {
  it('keeps playing after the user presses play instead of pausing itself', async () => {
    const video = new BrowserLikeMedia();
    const audio = new BrowserLikeMedia(true);
    attachAudioSync(video, audio);
    video.currentTime = 12.3; // resume position, before playback starts
    audio.seeks = 0;
    video.play();
    for (let i = 0; i < 50; i++) await Promise.resolve();
    expect(video.paused).toBe(false);
    expect(audio.paused).toBe(false);
    expect(audio.seeks).toBeLessThanOrEqual(1);
    expect(video.events + audio.events).toBeLessThan(20);
  });
});

describe('attachAudioSync never traps the video paused', () => {
  it('stops holding once the user presses play during an audio stall', () => {
    const { video, audio } = setup();
    video.paused = false; video.emit('playing');
    audio.emit('waiting');
    expect(video.paused).toBe(true);
    video.paused = false; video.emit('play'); // user insists
    audio.emit('waiting');
    expect(video.paused).toBe(false);
    audio.emit('playing'); // audio recovers: holding works again later
    audio.emit('waiting');
    expect(video.paused).toBe(true);
  });

  it('resumes the video if the audio track fails to load', () => {
    const { video, audio } = setup();
    video.paused = false; video.emit('playing');
    audio.emit('waiting');
    expect(video.paused).toBe(true);
    audio.emit('error');
    expect(video.paused).toBe(false);
    audio.emit('waiting');
    expect(video.paused).toBe(false);
  });
});
