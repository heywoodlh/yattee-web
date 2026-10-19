import { describe, expect, it } from 'vitest';
import { mobileNavigation } from './mobile-nav';

describe('mobile navigation', () => {
  it('uses an unlabeled more menu in the final mobile slot', () => {
    expect(mobileNavigation.map(item => item.label)).toEqual(['Home', 'Feed', 'Channels', '']);
    expect(mobileNavigation.map(item => item.route)).toEqual(['home', 'subscriptions', 'channels', 'menu']);
  });
});
