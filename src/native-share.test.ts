import { describe, expect, it } from 'vitest';
import { nativeShareAvailability } from './native-share';

describe('native share availability', () => {
  it('identifies an insecure HTTP context as the reason system sharing is unavailable', () => {
    expect(nativeShareAvailability(false, true)).toBe('insecure');
  });

  it('allows the Web Share API only when the browser exposes it in a secure context', () => {
    expect(nativeShareAvailability(true, true)).toBe('available');
    expect(nativeShareAvailability(true, false)).toBe('unsupported');
  });
});
