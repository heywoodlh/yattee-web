import { describe, expect, it } from 'vitest';
// @ts-ignore Container-side module
import { isCrossSiteWrite, isJsonRequest, isProfileKey, mediaResponseHeaders, mediaTarget, stripOwnCookies, upstreamTarget } from '../request-safety.mjs';

describe('upstream request targets', () => {
  const base = 'http://yattee-server:8085';

  it('keeps ordinary API paths on the configured upstream', () => {
    expect(upstreamTarget('/api/v1/search?q=a', base).toString()).toBe('http://yattee-server:8085/api/v1/search?q=a');
    expect(upstreamTarget('/health', 'https://yattee.example/base/').toString()).toBe('https://yattee.example/health');
  });

  it('rejects raw paths that would replace the upstream host', () => {
    for (const path of ['//10.0.0.7:2283/../api/users', '/\\10.0.0.7:2283/../api/users', '//10.0.0.7/%2e%2e/api/users', 'http://10.0.0.7/api', 'api/v1']) {
      expect(() => upstreamTarget(path, base)).toThrow('Invalid request path');
    }
  });
});

describe('media relay targets', () => {
  const origin = 'http://yattee-server:8085';

  it('allows Google video hosts over HTTPS and the configured server', () => {
    expect(mediaTarget('https://rr1.googlevideo.com/videoplayback?id=1', origin).hostname).toBe('rr1.googlevideo.com');
    expect(mediaTarget('http://yattee-server:8085/proxy/video', origin).pathname).toBe('/proxy/video');
  });

  it('rejects other hosts and non-HTTP schemes', () => {
    for (const source of ['http://10.0.0.7/', 'http://rr1.googlevideo.com/videoplayback', 'rtmp://rr1.googlevideo.com/live', 'file:///etc/passwd', 'https://googlevideo.com.example/']) {
      expect(() => mediaTarget(source, origin)).toThrow('Unsupported media host');
    }
  });

  it('forwards only media headers and neutralizes active content types', () => {
    expect(mediaResponseHeaders({ 'content-type': 'video/mp4', 'content-length': '10', 'set-cookie': 'a=b', 'content-security-policy': 'none' })).toEqual({ 'x-content-type-options': 'nosniff', 'content-type': 'video/mp4', 'content-length': '10' });
    expect(mediaResponseHeaders({ 'content-type': 'text/html' })['content-type']).toBe('application/octet-stream');
  });
});

describe('profile keys', () => {
  it('accepts only hashed profile identifiers', () => {
    expect(isProfileKey('a'.repeat(64))).toBe(true);
    expect(isProfileKey('../../server')).toBe(false);
    expect(isProfileKey('A'.repeat(64))).toBe(false);
  });
});

describe('cross-site request protection', () => {
  it('blocks state-changing requests that browsers mark as cross-site or same-site', () => {
    expect(isCrossSiteWrite('POST', { 'sec-fetch-site': 'cross-site' })).toBe(true);
    expect(isCrossSiteWrite('put', { 'sec-fetch-site': 'same-site' })).toBe(true);
  });

  it('allows same-origin requests, reads, and clients that send no fetch metadata', () => {
    expect(isCrossSiteWrite('POST', { 'sec-fetch-site': 'same-origin' })).toBe(false);
    expect(isCrossSiteWrite('POST', { 'sec-fetch-site': 'none' })).toBe(false);
    expect(isCrossSiteWrite('GET', { 'sec-fetch-site': 'cross-site' })).toBe(false);
    expect(isCrossSiteWrite('POST', {})).toBe(false);
  });

  it('accepts only JSON request bodies', () => {
    expect(isJsonRequest({ 'content-type': 'application/json' })).toBe(true);
    expect(isJsonRequest({ 'content-type': 'application/json; charset=utf-8' })).toBe(true);
    expect(isJsonRequest({ 'content-type': 'text/plain' })).toBe(false);
    expect(isJsonRequest({ 'content-type': 'application/jsonp' })).toBe(false);
    expect(isJsonRequest({})).toBe(false);
  });
});

describe('proxied cookies', () => {
  it('drops Yattee Web cookies and keeps the rest', () => {
    expect(stripOwnCookies('yattee_web_local_session=abc; theme=dark; yattee_web_remote_profile=def')).toBe('theme=dark');
    expect(stripOwnCookies('yattee_web_local_session=abc')).toBe('');
    expect(stripOwnCookies(undefined)).toBe('');
  });
});
