import type { Channel } from './store';

export function channelFromSubscriptions(subscriptions: Channel[], channelId: string): Channel | undefined {
  return subscriptions.find(channel => channel.authorId === channelId);
}
