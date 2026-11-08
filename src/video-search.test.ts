import { describe, expect, it } from 'vitest';
import { matchingVideos, parseSearchRoute, searchRequestType, searchQuery, visibleSearchResults, searchRoute } from './video-search';
import type { Channel, Playlist } from './store';

const videos = [
  { videoId: 'one', title: 'Making breakfast', author: 'Chef Mina', authorId: 'UCone' },
  { videoId: 'two', title: 'Mountain walk', author: 'Trail Light', authorId: 'UCtwo' },
];

describe('video search', () => {
  it('matches feed and history videos by title or channel name', () => {
    expect(matchingVideos(videos, 'trail')).toEqual([videos[1]]);
    expect(matchingVideos(videos, 'breakfast')).toEqual([videos[0]]);
  });

  it('keeps all videos for an empty query', () => expect(matchingVideos(videos, '')).toEqual(videos));

  it('asks the upstream for channels when filtering topics, not an unsupported topic type', () => {
    expect(searchRequestType('topics')).toBe('channel');
    expect(searchRequestType('channels')).toBe('channel');
    expect(searchRequestType('all')).toBe('all');
    expect(searchQuery('Taylor Swift', 'topics')).toBe('Taylor Swift Topic');
    expect(searchQuery('Taylor Swift - Topic', 'topics')).toBe('Taylor Swift - Topic');
  });

  it('shows only topic channels when requested without dropping regular channel results', () => {
    const channel: Channel = { authorId: 'UC3', author: 'Aster', authorThumbnails: [] };
    const topic: Channel = { authorId: 'UC4', author: 'Aster - Topic', authorThumbnails: [] };
    const playlist: Playlist & { authorId: string } = { playlistId: 'PL1', title: 'Aster mix', authorId: 'UC3' };
    expect(visibleSearchResults([videos[0], channel, topic, playlist], 'topics')).toEqual([topic]);
    expect(visibleSearchResults([videos[0], channel, topic, playlist], 'channels')).toEqual([channel, topic]);
  });

  it('encodes a channel discovery search as a navigable route', () => {
    expect(searchRoute('Aster & friends', 'channels')).toBe('search/channels/Aster%20%26%20friends');
    expect(parseSearchRoute('search/channels/Aster%20%26%20friends')).toEqual({ filter: 'channels', query: 'Aster & friends' });
    expect(parseSearchRoute('search/Aster%20%26%20friends')).toEqual({ filter: 'all', query: 'Aster & friends' });
    expect(parseSearchRoute('search')).toEqual({ filter: 'all', query: '' });
  });

  it('does not throw on malformed percent-encoding in a search route', () => {
    expect(() => parseSearchRoute('search/videos/%E0%A4%A')).not.toThrow();
    expect(parseSearchRoute('search/videos/%E0%A4%A')).toEqual({ filter: 'videos', query: '%E0%A4%A' });
  });
});
