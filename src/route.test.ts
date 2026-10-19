import { describe, expect, it } from 'vitest';
import { initialRoute, routeUsesHistory } from './route';

describe('initialRoute', () => {
  it('opens Home on a fresh visit', () => {
    expect(initialRoute('')).toBe('home');
  });

  it('preserves an explicit route in the URL', () => {
    expect(initialRoute('search/cats')).toBe('search/cats');
  });

  it('only treats Home as history-backed route data', () => {
    expect(routeUsesHistory('home')).toBe(true);
    expect(routeUsesHistory('watch/zlltYKJm9vA')).toBe(false);
  });
});
