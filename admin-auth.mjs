import { createHash, timingSafeEqual } from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest('hex');

export function configuredAdmin(password) {
  if (typeof password !== 'string' || password.length < 8) throw new Error('Yattee Web admin password must be at least 8 characters');
  return { passwordHash: digest(password) };
}

export function adminIdentity(authorization, admin) {
  let username = '';
  let password = '';
  if (typeof authorization === 'string' && authorization.startsWith('Basic ')) {
    try { [username, ...password] = Buffer.from(authorization.slice(6), 'base64').toString('utf8').split(':'); password = password.join(':'); } catch { return { username: '', isLocalAdmin: false }; }
  }
  if (username !== 'admin' || !admin?.passwordHash) return { username, isLocalAdmin: false };
  const expected = Buffer.from(admin.passwordHash, 'hex');
  const actual = Buffer.from(digest(password), 'hex');
  return { username, isLocalAdmin: expected.length === actual.length && timingSafeEqual(expected, actual) };
}

export function shouldForwardUpstreamAuthorization(authorization, admin) {
  return adminIdentity(authorization, admin).username !== 'admin';
}

// Native Yattee supplies HTTP Basic credentials on every API request. Prefer
// those credentials while retaining the browser-only encrypted session fallback.
export function proxyAuthorization(requestAuthorization, sessionAuthorization, admin) {
  if (requestAuthorization && shouldForwardUpstreamAuthorization(requestAuthorization, admin)) return requestAuthorization;
  return sessionAuthorization && shouldForwardUpstreamAuthorization(sessionAuthorization, admin) ? sessionAuthorization : '';
}
