import { describe, expect, it } from 'vitest';
import { feedRequestForSubscriptions, usableSubscriptionFeeds } from './subscriptions-feed';

describe('subscription feeds', () => {
  it('keeps usable feeds when another imported channel has no videos tab', () => {
    const channels = [{ authorId: 'UCgood', author: 'Good' }, { authorId: 'UCempty', author: 'Empty' }];
    expect(usableSubscriptionFeeds(channels, [
      { status: 'fulfilled', value: { videos: [{ videoId: 'v', title: 'Video', author: 'Good', authorId: 'UCgood' }] } },
      { status: 'rejected', reason: new Error('This channel does not have a videos tab') },
    ])).toEqual({ feeds: [{ c: channels[0], feed: { videos: [{ videoId: 'v', title: 'Video', author: 'Good', authorId: 'UCgood' }] } }], unavailable: 1 });
  });

  it('builds one stateless Yattee Server feed request for imported channels', () => {
    expect(feedRequestForSubscriptions([{ authorId: 'UCone', author: 'One' }, { authorId: 'UCtwo', author: 'Two' }])).toEqual({
      channels: [
        { channel_id: 'UCone', site: 'youtube', channel_name: 'One' },
        { channel_id: 'UCtwo', site: 'youtube', channel_name: 'Two' },
      ],
      limit: 1000,
      offset: 0,
    });
  });
});
