import type { Channel, Video } from './store';

export type SubscriptionFeed = { c: Channel; feed: { videos: Video[] } };

export function feedRequestForSubscriptions(channels: Channel[]) {
  return {
    channels: channels.map(channel => ({ channel_id: channel.authorId, site: 'youtube', channel_name: channel.author })),
    limit: 1000,
    offset: 0,
  };
}

export function channelFeedRequest(channel: Channel) {
  return feedRequestForSubscriptions([channel]);
}

export function usableSubscriptionFeeds(channels: Channel[], results: PromiseSettledResult<{ videos: Video[] }>[]) {
  const feeds: SubscriptionFeed[] = [];
  let unavailable = 0;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') feeds.push({ c: channels[index], feed: result.value });
    else unavailable += 1;
  });
  return { feeds, unavailable };
}
