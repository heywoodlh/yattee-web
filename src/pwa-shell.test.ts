import { describe, expect, it } from 'vitest';
// @ts-expect-error Node filesystem is used only by Vitest.
import { readFileSync } from 'node:fs';

describe('PWA shell cache', () => {
  it('precaches the hashed app assets referenced by the current HTML shell', () => {
    const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
    expect(worker).toContain("const CACHE = 'yattee-web-shell-v8'");
    expect(worker).toContain('precacheAppShell');
    expect(worker).toContain('matchAll(/<(?:script|link)');
  });
});
