import { describe, expect, it } from 'vitest';
// @ts-expect-error Node filesystem is used only by Vitest.
import { readFileSync } from 'node:fs';

describe('PWA shell cache', () => {
  it('precaches the hashed app assets referenced by the current HTML shell', () => {
    const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
    expect(worker).toContain("const CACHE = 'yattee-web-shell-v9'");
    expect(worker).toContain('precacheAppShell');
    expect(worker).toContain('matchAll(/<(?:script|link)');
  });

  it('caches only the shell and hashed build assets', () => {
    const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
    const stub = { addEventListener: () => undefined, registration: { scope: '/' } };
    const isStaticAsset = new Function('self', 'caches', 'location', `${worker}\nreturn isStaticAsset;`)(stub, {}, { origin: 'http://localhost' });
    for (const path of ['/', '/manifest.webmanifest', '/icon.svg', '/assets/index-CQu_w4Ie.js', '/assets/index-oa1NGsQ1.css']) expect(isStaticAsset(path)).toBe(true);
    for (const path of ['/session', '/controls', '/web-admin/users', '/local-admin/session', '/proxy/relay', '/download', '/stream', '/state', '/config', '/api/v1/trending']) expect(isStaticAsset(path)).toBe(false);
  });
});
