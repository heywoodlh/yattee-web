// Keeps a separate <audio> element (adaptive audio track) in step with a
// video-only <video> element. The video is the clock and owns the controls.

export type SyncedMedia = EventTarget & {
  currentTime: number;
  paused: boolean;
  seeking: boolean;
  playbackRate: number;
  volume: number;
  muted: boolean;
  play(): Promise<void> | void;
  pause(): void;
};

const tolerance = 0.05;
const maxNudge = 0.5;
const nudge = 0.05;
const resyncThreshold = 0.3;

// Within maxNudge seconds, close the gap by briefly speeding up or slowing
// down the audio (pitch is preserved); beyond it, jump.
export function audioCorrection(videoTime: number, audioTime: number, rate: number): { rate: number; seek?: number } {
  const drift = audioTime - videoTime;
  if (Math.abs(drift) > maxNudge) return { rate, seek: videoTime };
  if (Math.abs(drift) <= tolerance) return { rate };
  return { rate: Math.round(rate * (drift > 0 ? 1 - nudge : 1 + nudge) * 1000) / 1000 };
}

export function attachAudioSync(video: SyncedMedia, audio: SyncedMedia): () => void {
  // True while the video is paused by us because the audio is buffering.
  let holding = false;
  // Set when holding gave up (the user pressed play mid-hold, or the audio
  // failed): don't hold again until the audio is actually playing.
  let holdSuppressed = false;
  const play = (media: SyncedMedia) => { try { void Promise.resolve(media.play()).catch(() => undefined); } catch { /* autoplay refusal */ } };
  // Only move the audio when it's audibly off: seeking a playing element drops
  // its buffer and fires 'waiting', which would hold the video, whose resume
  // fires 'playing' and aligns again, looping into an immediate pause.
  const align = () => {
    if (Math.abs(audio.currentTime - video.currentTime) > resyncThreshold) audio.currentTime = video.currentTime;
    audio.playbackRate = video.playbackRate;
  };
  const mirrorVolume = () => { audio.volume = video.volume; audio.muted = video.muted; };

  const videoHandlers: Record<string, () => void> = {
    play: () => { if (holding) holdSuppressed = true; holding = false; play(audio); },
    playing: () => { holding = false; align(); play(audio); },
    pause: () => { if (!holding) audio.pause(); },
    waiting: () => { if (!holding) audio.pause(); },
    seeking: () => { audio.pause(); audio.currentTime = video.currentTime; },
    seeked: () => { align(); if (!video.paused) play(audio); },
    ended: () => { holding = false; audio.pause(); },
    emptied: () => { holding = false; audio.pause(); },
    ratechange: () => { audio.playbackRate = video.playbackRate; },
    volumechange: mirrorVolume,
    timeupdate: () => {
      if (holding || video.paused || video.seeking || audio.paused || audio.seeking) return;
      const correction = audioCorrection(video.currentTime, audio.currentTime, video.playbackRate);
      if (correction.seek !== undefined) audio.currentTime = correction.seek;
      if (audio.playbackRate !== correction.rate) audio.playbackRate = correction.rate;
    },
  };
  const resumeAfterAudio = () => { if (!holding) return; holding = false; align(); play(video); };
  const audioHandlers: Record<string, () => void> = {
    waiting: () => { if (holdSuppressed || video.paused || video.seeking) return; holding = true; video.pause(); },
    canplay: resumeAfterAudio,
    playing: () => { holdSuppressed = false; resumeAfterAudio(); },
    error: () => { holdSuppressed = true; if (!holding) return; holding = false; play(video); },
  };

  for (const [type, handler] of Object.entries(videoHandlers)) video.addEventListener(type, handler);
  for (const [type, handler] of Object.entries(audioHandlers)) audio.addEventListener(type, handler);
  mirrorVolume();
  align();
  if (!video.paused) play(audio);
  return () => {
    for (const [type, handler] of Object.entries(videoHandlers)) video.removeEventListener(type, handler);
    for (const [type, handler] of Object.entries(audioHandlers)) audio.removeEventListener(type, handler);
  };
}
