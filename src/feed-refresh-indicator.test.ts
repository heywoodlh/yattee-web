import { describe, expect, it } from 'vitest';
import { feedRefreshIndicator } from './feed-refresh-indicator';

describe('feed refresh indicator', () => {
  it('only exposes an accessible spinner while a background feed request is active', () => {
    expect(feedRefreshIndicator(false)).toBeNull();
    expect(feedRefreshIndicator(true)).toEqual({ label: 'Updating Feed' });
  });
});
