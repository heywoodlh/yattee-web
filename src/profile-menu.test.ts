import { describe, expect, it } from 'vitest';
import { profileMenuLabel } from './profile-menu';

describe('profile menu label', () => {
  it('shows the authenticated username in the navigation menu', () => {
    expect(profileMenuLabel('spencer')).toBe('Signed in as spencer');
  });

  it('hides the label when no user is authenticated', () => {
    expect(profileMenuLabel('')).toBeNull();
  });
});
