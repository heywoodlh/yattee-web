import { describe, expect, it } from 'vitest';
import { controlsMutationAllowed, visibleManagedUsers } from './access';

describe('remote profile access', () => {
  it('allows an unprivileged user to set their initial PIN but requires it for later changes', () => {
    expect(controlsMutationAllowed({ isAdmin: false, target: 'self', controlsEnabled: false, pinVerified: false })).toBe(true);
    expect(controlsMutationAllowed({ isAdmin: false, target: 'self', controlsEnabled: true, pinVerified: false })).toBe(false);
    expect(controlsMutationAllowed({ isAdmin: false, target: 'self', controlsEnabled: true, pinVerified: true })).toBe(true);
  });

  it('allows an admin to manage only users recorded after successful Yattee Web login', () => {
    const users = [{ id: 'alice', username: 'alice' }, { id: 'bob', username: 'bob' }];
    expect(visibleManagedUsers(false, users)).toEqual([]);
    expect(visibleManagedUsers(true, users)).toEqual(users);
  });
});
