import { describe, expect, it } from 'vitest';
import { profileKey } from '../profile-key.mjs';

describe('profile identity keys', () => {
  it('keeps different authenticated Yattee users in separate filesystem profiles', () => {
    expect(profileKey('http://yattee.example', 'alice')).not.toBe(profileKey('http://yattee.example', 'bob'));
  });

  it('keeps the same user stable across browser sessions', () => {
    expect(profileKey('http://yattee.example/', 42)).toBe(profileKey('http://yattee.example', 42));
  });
});
