import type { Channel } from './store';

export function matchingChannels(channels: Channel[], query: string) {
  const needle = query.trim().toLocaleLowerCase();
  const filtered = needle ? channels.filter(channel => channel.author.toLocaleLowerCase().includes(needle)) : channels;
  return [...filtered].sort((left, right) => left.author.localeCompare(right.author, undefined, { sensitivity: 'base' }));
}

export function channelAvatar(channel: Channel) {
  return { image: channel.authorThumbnails?.at(-1)?.url || channel.authorThumbnails?.[0]?.url || '', initial: channel.author.trim().slice(0, 1).toLocaleUpperCase() || '?' };
}
