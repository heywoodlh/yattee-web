import { describe, expect, it } from 'vitest';
import { channelAvatar, matchingChannels } from './channels';

const channels = [
  { authorId: 'UCbeta', author: 'Ambient Worlds' },
  { authorId: 'UCalpha', author: 'Absolute Terry', authorThumbnails: [{ url: 'https://example.test/avatar.jpg' }] },
];

describe('Channels tab helpers', () => {
  it('filters subscriptions by channel name and returns them alphabetically', () => {
    expect(matchingChannels(channels, 'world')).toEqual([channels[0]]);
    expect(matchingChannels(channels, '')).toEqual([channels[1], channels[0]]);
  });

  it('uses the largest supplied avatar and otherwise an initial fallback', () => {
    expect(channelAvatar(channels[1])).toEqual({ image: 'https://example.test/avatar.jpg', initial: 'A' });
    expect(channelAvatar(channels[0])).toEqual({ image: '', initial: 'A' });
  });
});
