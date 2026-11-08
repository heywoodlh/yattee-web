import type { SponsorCategory, SponsorSettings } from './store';

export type SponsorSegment = { id: string; category: SponsorCategory; start: number; end: number };
export function activeSkipSegment(time: number, segments: SponsorSegment[], settings: SponsorSettings): SponsorSegment | null {
  if (!settings.enabled || !Number.isFinite(time)) return null;
  return segments.find(segment => settings.categories.includes(segment.category) && time >= segment.start && time < segment.end) || null;
}
export function shouldAutoSkip(segment: SponsorSegment, settings: SponsorSettings, lastSkippedID: string | null): boolean {
  return settings.enabled && settings.autoSkip && settings.categories.includes(segment.category) && segment.id !== lastSkippedID;
}
// A segment that runs to the end of the video (typically an outro) skips to the end.
export function skipTarget(segment: SponsorSegment, duration: number): number {
  const target = segment.end + 0.1;
  return Number.isFinite(duration) && duration > 0 && target >= duration ? duration : target;
}
export async function fetchSponsorSegments(videoID: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<SponsorSegment[]> {
  const response = await fetcher(`/api/sponsorblock?videoID=${encodeURIComponent(videoID)}`, { signal });
  if (!response.ok) throw new Error('SponsorBlock is unavailable');
  const data = await response.json();
  if (!Array.isArray(data.segments)) throw new Error('Invalid SponsorBlock response');
  return data.segments;
}
