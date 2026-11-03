import { describe, expect, it } from 'vitest';
// @ts-ignore Container-side module
import { decryptAuthorization, encryptAuthorization, parseSessionKey, sessionRecord } from '../local-upstream-session.mjs';

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

describe('external session keys', () => {
  it('accepts 32-byte keys as raw bytes, hex, or base64', () => {
    const key = new Uint8Array(Array.from({ length: 32 }, (_, index) => index));
    const hex = Array.from(key, byte => byte.toString(16).padStart(2, '0')).join('');
    const base64 = btoa(String.fromCharCode(...key));
    const encode = (text: string) => new TextEncoder().encode(`${text}\n`);
    for (const raw of [key, encode(hex), encode(base64)]) expect([...parseSessionKey(raw)]).toEqual([...key]);
  });

  it('rejects keys of the wrong length', () => {
    expect(parseSessionKey(new TextEncoder().encode('too-short'))).toBeNull();
    expect(parseSessionKey(new TextEncoder().encode('ab'.repeat(20)))).toBeNull();
  });
});
