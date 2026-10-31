/* SeMAKMUR Digital PWA — only non-sensitive offline shell is cached. */
'use strict';
const SHELL_CACHE = 'semakmur-public-shell-v20261031-1';
const SHELL_RESOURCES = ['./offline.html', './assets/icon-192.png', './assets/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('semakmur-public-shell-') && name !== SHELL_CACHE)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  // API POST, cross-origin requests, user data, and script responses are NEVER cached.
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const offline = await caches.match('./offline.html');
    return offline || Response.error();
  }));
});
