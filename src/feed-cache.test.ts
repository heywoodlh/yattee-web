import { describe, expect, it } from 'vitest';
import { emptyFeedCache, feedPage, mergeFeedCache } from './feed-cache';

const video = (videoId: string, title = videoId) => ({ videoId, title, author: 'Creator', authorId: 'channel' });

describe('feed cache', () => {
  it('keeps cached entries and only replaces changed or newly received videos', () => {
    const current = { ...emptyFeedCache, videos: [video('old', 'Saved title'), video('changed', 'Old title')] };
    const next = mergeFeedCache(current, [video('new'), video('changed', 'New title')], 3);

    expect(next.videos).toEqual([video('new'), video('changed', 'New title'), video('old', 'Saved title')]);
    expect(next.videos[2]).toBe(current.videos[0]);
  });

  it('limits the persistent cache while keeping the newest server ordering', () => {
    const next = mergeFeedCache(emptyFeedCache, [video('one'), video('two'), video('three')], 2);
    expect(next.videos.map(item => item.videoId)).toEqual(['one', 'two']);
  });

  it('does not rewrite an unchanged cache', () => {
    const current = { ...emptyFeedCache, videos: [video('one')] };
    expect(mergeFeedCache(current, [video('one')])).toBe(current);
  });

  it('returns fixed thirty-video pages and exposes page bounds', () => {
    const videos = Array.from({ length: 61 }, (_, index) => video(String(index)));
    expect(feedPage(videos, 0)).toMatchObject({ videos: videos.slice(0, 30), page: 0, pages: 3 });
    expect(feedPage(videos, 2)).toMatchObject({ videos: videos.slice(60), page: 2, pages: 3 });
    expect(feedPage(videos, 99)).toMatchObject({ videos: videos.slice(60), page: 2, pages: 3 });
  });
});
