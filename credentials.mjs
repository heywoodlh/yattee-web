import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const scryptOptions = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const keyLength = 32;
const legacyDigest = value => createHash('sha256').update(value).digest('hex');

export function hashSecret(secret) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64url')}$${scryptSync(secret, salt, keyLength, scryptOptions).toString('base64url')}`;
}

export const isLegacyHash = stored => typeof stored === 'string' && /^[a-f0-9]{64}$/.test(stored);

// Hashes written before scrypt was introduced are unsalted SHA-256 hex; they
// still verify so existing PINs and admin passwords keep working.
export function verifySecret(secret, stored) {
  if (typeof secret !== 'string' || !secret || typeof stored !== 'string') return false;
  if (isLegacyHash(stored)) {
    const expected = Buffer.from(stored, 'hex');
    const actual = Buffer.from(legacyDigest(secret), 'hex');
    return timingSafeEqual(expected, actual);
  }
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = scryptSync(secret, Buffer.from(salt, 'base64url'), expected.length, scryptOptions);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createAttemptLimiter({ maxFailures = 5, windowMs = 60_000, lockoutMs = 5 * 60_000 } = {}) {
  const entries = new Map();
  const current = (key, now) => {
    const entry = entries.get(key);
    if (entry && entry.lockedUntil <= now && entry.windowStart + windowMs <= now) { entries.delete(key); return undefined; }
    return entry;
  };
  return {
    locked: (key, now = Date.now()) => (current(key, now)?.lockedUntil ?? 0) > now,
    fail(key, now = Date.now()) {
      const entry = current(key, now) ?? { failures: 0, windowStart: now, lockedUntil: 0 };
      if (entry.windowStart + windowMs <= now) Object.assign(entry, { failures: 0, windowStart: now });
      entry.failures += 1;
      if (entry.failures >= maxFailures) entry.lockedUntil = now + lockoutMs;
      entries.set(key, entry);
    },
    succeed: key => { entries.delete(key); },
  };
}
