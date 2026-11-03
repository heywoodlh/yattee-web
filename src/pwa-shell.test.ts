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

  it('serves the cached shell only for the app page, never for server routes', () => {
    const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
    const stub = { addEventListener: () => undefined, registration: { scope: '/' } };
    const { isAppPage, isAppShell } = new Function('self', 'caches', 'location', `${worker}\nreturn { isAppPage, isAppShell };`)(stub, {}, { origin: 'http://localhost' });
    expect(isAppPage('/')).toBe(true);
    expect(isAppPage('/index.html')).toBe(true);
    for (const path of ['/upstream-login', '/download', '/stream', '/admin', '/session', '/api/v1/trending']) expect(isAppPage(path)).toBe(false);
    const response = (status: number, type: string) => ({ ok: status >= 200 && status < 300, headers: { get: () => type } });
    expect(isAppShell(response(200, 'text/html; charset=utf-8'))).toBe(true);
    expect(isAppShell(response(401, 'text/html'))).toBe(false);
    expect(isAppShell(response(200, 'application/json'))).toBe(false);
    expect(isAppShell(response(200, 'video/mp4'))).toBe(false);
  });
});
