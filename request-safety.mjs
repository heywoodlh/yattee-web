const mediaHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified'];
const mediaTypes = /^(?:video\/|audio\/|application\/(?:vnd\.apple\.mpegurl|x-mpegurl|dash\+xml|octet-stream)|text\/vtt)/i;

// nginx routes on the normalized path but forwards the raw one, so a raw path
// such as //host/../api must not be allowed to replace the upstream origin.
export function upstreamTarget(requestUrl, base) {
  if (typeof requestUrl !== 'string' || !/^\/(?![/\\])/.test(requestUrl)) throw new Error('Invalid request path');
  const origin = new URL(base).origin;
  const target = new URL(requestUrl, origin);
  if (target.origin !== origin) throw new Error('Invalid request path');
  return target;
}

// Upstream servers route on the decoded path, so check controls against it
// rather than the raw percent-encoded form.
export function routedPath(url) {
  let pathname = url.pathname;
  try { pathname = decodeURIComponent(pathname); } catch {}
  return pathname.replace(/\/{2,}/g, '/');
}

export const isSearchPath = url => routedPath(url).startsWith('/api/v1/search');

export function mediaTarget(source, configuredOrigin) {
  const target = new URL(source);
  if (target.protocol !== 'https:' && target.protocol !== 'http:') throw new Error('Unsupported media host');
  const trustedGoogle = target.protocol === 'https:' && (target.hostname === 'manifest.googlevideo.com' || target.hostname.endsWith('.googlevideo.com'));
  if (!trustedGoogle && target.origin !== configuredOrigin) throw new Error('Unsupported media host');
  if (target.origin === configuredOrigin && isSearchPath(target)) throw new Error('Unsupported media host');
  return target;
}

export function mediaResponseHeaders(headers) {
  const next = { 'x-content-type-options': 'nosniff' };
  for (const name of mediaHeaders) if (headers[name] !== undefined) next[name] = headers[name];
  if (next['content-type'] !== undefined && !mediaTypes.test(String(next['content-type']))) next['content-type'] = 'application/octet-stream';
  return next;
}

export const isProfileKey = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Browsers send Sec-Fetch-Site on every request. Older browsers omit it but
// still send Origin on cross-origin writes, so fall back to comparing that
// with Host. Only hostnames are compared, because nginx forwards Host without
// the port. Native clients send neither header and are allowed.
export function isCrossSiteWrite(method, headers) {
  if (!unsafeMethods.has(String(method).toUpperCase())) return false;
  const site = headers['sec-fetch-site'];
  if (site) return site === 'cross-site' || site === 'same-site';
  const origin = headers.origin;
  if (!origin) return false;
  try { return new URL(origin).hostname !== new URL(`http://${headers.host}`).hostname; } catch { return true; }
}

export const isJsonRequest = headers => /^application\/json(?:\s*;|$)/i.test(String(headers['content-type'] || ''));

export function stripOwnCookies(cookie) {
  return String(cookie || '').split(';').map(part => part.trim()).filter(part => part && !part.startsWith('yattee_web_')).join('; ');
}
