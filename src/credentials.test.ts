// @ts-ignore Node runtime-only test
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
// @ts-ignore Container-side module
import { createAttemptLimiter, hashSecret, isLegacyHash, verifySecret } from '../credentials.mjs';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('secret hashing', () => {
  it('stores salted scrypt hashes that verify only the original secret', () => {
    const first = hashSecret('2468');
    const second = hashSecret('2468');
    expect(first).toMatch(/^scrypt\$/);
    expect(first).not.toBe(second);
    expect(verifySecret('2468', first)).toBe(true);
    expect(verifySecret('0000', first)).toBe(false);
    expect(isLegacyHash(first)).toBe(false);
  });

  it('still verifies legacy unsalted SHA-256 hashes', () => {
    const legacy = sha256('2468');
    expect(isLegacyHash(legacy)).toBe(true);
    expect(verifySecret('2468', legacy)).toBe(true);
    expect(verifySecret('0000', legacy)).toBe(false);
  });

  it('rejects empty secrets and malformed hashes', () => {
    expect(verifySecret('', hashSecret('2468'))).toBe(false);
    expect(verifySecret('2468', 'scrypt$only')).toBe(false);
    expect(verifySecret('2468', undefined)).toBe(false);
  });
});

describe('attempt limiter', () => {
  it('locks a key after repeated failures and unlocks after the lockout', () => {
    const limiter = createAttemptLimiter({ maxFailures: 3, windowMs: 1000, lockoutMs: 5000 });
    limiter.fail('a', 0); limiter.fail('a', 10);
    expect(limiter.locked('a', 20)).toBe(false);
    limiter.fail('a', 20);
    expect(limiter.locked('a', 30)).toBe(true);
    expect(limiter.locked('b', 30)).toBe(false);
    expect(limiter.locked('a', 5021)).toBe(false);
  });

  it('forgets failures outside the window and after a success', () => {
    const limiter = createAttemptLimiter({ maxFailures: 2, windowMs: 1000, lockoutMs: 5000 });
    limiter.fail('a', 0); limiter.fail('a', 2000);
    expect(limiter.locked('a', 2001)).toBe(false);
    limiter.succeed('a'); limiter.fail('a', 2002);
    expect(limiter.locked('a', 2003)).toBe(false);
  });
});
