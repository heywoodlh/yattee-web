import { describe, expect, it } from 'vitest';
import { channelFromSubscriptions } from './channel-details';

describe('channelFromSubscriptions', () => {
  it('uses the saved subscription metadata for a YouTube Topic channel', () => {
    const topic = { authorId: 'UCzIPHpgGkiW5ilaF2dSluaQ', author: 'Topic', authorThumbnails: [] };
    expect(channelFromSubscriptions([topic], 'UCzIPHpgGkiW5ilaF2dSluaQ')).toBe(topic);
  });

  it('leaves unsubscribed channels for the upstream metadata lookup', () => {
    expect(channelFromSubscriptions([], 'UCzIPHpgGkiW5ilaF2dSluaQ')).toBeUndefined();
  });
});
