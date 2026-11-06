import { createHash } from 'node:crypto';
import { createAttemptLimiter, hashSecret, isLegacyHash, verifySecret } from './credentials.mjs';

export function configuredAdmin(password) {
  if (typeof password !== 'string' || password.length < 8) throw new Error('Yattee Web admin password must be at least 8 characters');
  return { passwordHash: hashSecret(password) };
}

function basicCredentials(authorization) {
  if (typeof authorization !== 'string' || !authorization.startsWith('Basic ')) return { username: '', password: '' };
  try { const [username, ...password] = Buffer.from(authorization.slice(6), 'base64').toString('utf8').split(':'); return { username, password: password.join(':') }; } catch { return { username: '', password: '' }; }
}

// Browsers resend Basic credentials on every request, so successful scrypt
// checks are cached, and repeated failures stop costing a hash computation.
const verifiedAdmins = new Map();
const adminFailures = createAttemptLimiter({ maxFailures: 10, windowMs: 60_000, lockoutMs: 60_000 });

function verifyAdminPassword(password, passwordHash) {
  const cacheKey = `${passwordHash}\0${createHash('sha256').update(password).digest('hex')}`;
  if (verifiedAdmins.has(cacheKey)) return true;
  if (adminFailures.locked('admin')) return false;
  if (!verifySecret(password, passwordHash)) { adminFailures.fail('admin'); return false; }
  adminFailures.succeed('admin');
  if (verifiedAdmins.size >= 32) verifiedAdmins.clear();
  verifiedAdmins.set(cacheKey, true);
  return true;
}

export function adminIdentity(authorization, admin) {
  const { username, password } = basicCredentials(authorization);
  if (username !== 'admin' || !admin?.passwordHash) return { username, isLocalAdmin: false };
  return { username, isLocalAdmin: verifyAdminPassword(password, admin.passwordHash) };
}

// Returns a rehashed admin record when valid credentials match a legacy
// SHA-256 hash, so the stored hash is upgraded on the admin's next request.
export function upgradedAdmin(authorization, admin) {
  if (!isLegacyHash(admin?.passwordHash)) return null;
  const { username, password } = basicCredentials(authorization);
  return username === 'admin' && verifySecret(password, admin.passwordHash) ? configuredAdmin(password) : null;
}

export function shouldForwardUpstreamAuthorization(authorization) {
  return basicCredentials(authorization).username !== 'admin';
}

// Native Yattee supplies HTTP Basic credentials on every API request. Prefer
// those credentials while retaining the browser-only encrypted session fallback.
export function proxyAuthorization(requestAuthorization, sessionAuthorization, admin) {
  if (requestAuthorization && shouldForwardUpstreamAuthorization(requestAuthorization)) return requestAuthorization;
  return sessionAuthorization && shouldForwardUpstreamAuthorization(sessionAuthorization) ? sessionAuthorization : '';
}
