import { describe, expect, it } from 'vitest';
// @ts-ignore Container-side module
import { isProfileKey, mediaResponseHeaders, mediaTarget, upstreamTarget } from '../request-safety.mjs';

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
