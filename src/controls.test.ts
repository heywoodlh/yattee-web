import { describe, expect, it } from 'vitest';
// @ts-ignore JavaScript-only container controls module
import { configureControls, defaultControls, enforceControls, publicControls, verifyPin } from '../controls.mjs';

describe('parental controls', () => {
  it('requires a numeric PIN when enabling controls and never returns its hash publicly', () => {
    const controls = configureControls(defaultControls, { enabled: true, pin: '2468', disableSearch: true });
    expect(verifyPin(controls, '2468')).toBe(true);
    expect(verifyPin(controls, '0000')).toBe(false);
    expect(publicControls(controls)).toEqual({ enabled: true, disableSearch: true, disableSubscriptions: false, disableSubscriptionImport: false, disablePlaylists: false });
  });
  it('removes the PIN hash when controls are disabled so a new PIN is required later', () => {
    const enabled = configureControls(defaultControls, { enabled: true, pin: '2468' });
    const disabled = configureControls(enabled, { enabled: false });
    expect(verifyPin(disabled, '2468')).toBe(false);
    expect(() => configureControls(disabled, { enabled: true })).toThrow('Set a 4–12 digit PIN');
  });

  it('stores the PIN as a salted hash', () => {
    expect(configureControls(defaultControls, { enabled: true, pin: '2468' }).pinHash).toMatch(/^scrypt\$/);
  });
  it('keeps locked state fields at their saved values', () => {
    const existing = { subscriptions: ['a'], playlists: ['p'], bookmarks: ['b'], queue: ['q'], history: [] };
    const next = { subscriptions: ['a', 'x'], playlists: [], bookmarks: ['b', 'y'], queue: ['q', 'z'], history: ['h'] };
    const controls = { ...defaultControls, enabled: true, disableSubscriptions: true, disablePlaylists: true };
    expect(enforceControls(next, existing, controls)).toEqual({ subscriptions: ['a'], playlists: ['p'], bookmarks: ['b'], queue: ['q', 'z'], history: ['h'] });
    expect(enforceControls(next, existing, { ...controls, enabled: false })).toEqual(next);
    expect(enforceControls(next, existing, { ...controls, disablePlaylists: false }).playlists).toEqual([]);
  });
});
