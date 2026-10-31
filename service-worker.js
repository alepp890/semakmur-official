// SeMAKMUR Digital PWA - offline shell sahaja. Tiada rekod pengguna disimpan cache.
const CACHE='semakmur-offline-shell-v1';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./offline.html','./assets/icon-192.png'])).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('semakmur-offline-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  // APIs (Apps Script dan Google) sentiasa melalui rangkaian; jangan cache data individu.
  if(event.request.mode==='navigate'&&new URL(event.request.url).origin===self.location.origin){
    event.respondWith(fetch(event.request).catch(()=>caches.match('./offline.html')));
  }
});
