import { describe, expect, it } from 'vitest';
// @ts-ignore Container-side module
import { decryptAuthorization, encryptAuthorization, sessionRecord } from '../local-upstream-session.mjs';

describe('persistent local upstream sessions', () => {
  const key = new Uint8Array(32).fill(7);
  const authorization = 'Basic ZGV2aWNlOnBhc3M=';

  it('encrypts the upstream authorization so it is not stored in plaintext', () => {
    const encrypted = encryptAuthorization(authorization, key);
    expect(JSON.stringify(encrypted)).not.toContain(authorization);
    expect(decryptAuthorization(encrypted, key)).toBe(authorization);
  });

  it('creates a revocable record keyed by a token hash rather than the raw cookie token', () => {
    const record = sessionRecord('device-token', authorization, key, 1000);
    expect(record.tokenHash).not.toBe('device-token');
    expect(record.expiresAt).toBeGreaterThan(1000);
  });
});
