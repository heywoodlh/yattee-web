import { describe, expect, it } from 'vitest';
import { channelTitleClass } from './channel-layout';

describe('channel heading layout', () => {
  it('uses the explicit long-word wrapping class for channel titles', () => {
    expect(channelTitleClass).toBe('channel-title-wrap');
  });
});
