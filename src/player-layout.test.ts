import { describe, expect, it } from 'vitest';
import { playerLayoutClass } from './player-layout';

describe('mobile player layout', () => {
  it('marks the player layout for a mobile stacked recommendation order', () => {
    expect(playerLayoutClass).toBe('player-layout player-layout--mobile-stack');
  });
});
