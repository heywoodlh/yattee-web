import { describe, expect, it } from 'vitest';
import { channelFeedRequest } from './subscriptions-feed';

describe('channel topic feed request', () => {
  it('uses the aggregate feed endpoint payload for a topic channel rather than its Videos tab', () => {
    expect(channelFeedRequest({ authorId: 'UCzIPHpgGkiW5ilaF2dSluaQ', author: 'Topic' })).toEqual({
      channels: [{ channel_id: 'UCzIPHpgGkiW5ilaF2dSluaQ', site: 'youtube', channel_name: 'Topic' }],
      limit: 1000,
      offset: 0,
    });
  });
});
