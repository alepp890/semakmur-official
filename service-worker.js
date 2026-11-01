/* SeMAKMUR asas: PWA shell, tanpa CacheStorage dan tanpa intersepsi API. */
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('semakmur-public-shell-')).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event => {
  if(event.request.method==='GET' && new URL(event.request.url).origin===self.location.origin)
    event.respondWith(fetch(event.request,{cache:'no-store'}));
});
