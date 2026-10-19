const CACHE = 'yattee-web-shell-v8';
const shell = ['/', '/manifest.webmanifest', '/icon.svg'];

async function precacheAppShell(cache) {
  const response = await fetch('/index.html', { cache: 'reload' });
  if (!response.ok) throw new Error(`Unable to cache app shell (${response.status})`);
  const html = await response.clone().text();
  const assets = [...html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["']/g)]
    .map(([, asset]) => new URL(asset, self.registration.scope).pathname)
    .filter(asset => asset.startsWith('/'));
  await cache.put('/index.html', response);
  await cache.addAll([...shell, ...assets]);
}

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(precacheAppShell).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/state') || url.pathname.startsWith('/config')) return;
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(caches.match('/index.html').then(cached => {
      const network = fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put('/index.html', copy)); return response; });
      return cached || network;
    }));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response; })));
});
