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

export function mediaTarget(source, configuredOrigin) {
  const target = new URL(source);
  if (target.protocol !== 'https:' && target.protocol !== 'http:') throw new Error('Unsupported media host');
  const trustedGoogle = target.protocol === 'https:' && (target.hostname === 'manifest.googlevideo.com' || target.hostname.endsWith('.googlevideo.com'));
  if (!trustedGoogle && target.origin !== configuredOrigin) throw new Error('Unsupported media host');
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

// Browsers send Sec-Fetch-Site on every request; native clients and older
// browsers omit it, so only an explicit cross-origin value is rejected.
export function isCrossSiteWrite(method, headers) {
  const site = headers['sec-fetch-site'];
  return unsafeMethods.has(String(method).toUpperCase()) && (site === 'cross-site' || site === 'same-site');
}

export const isJsonRequest = headers => /^application\/json(?:\s*;|$)/i.test(String(headers['content-type'] || ''));

export function stripOwnCookies(cookie) {
  return String(cookie || '').split(';').map(part => part.trim()).filter(part => part && !part.startsWith('yattee_web_')).join('; ');
}
