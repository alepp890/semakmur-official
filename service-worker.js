/* SeMAKMUR Digital — Instant Dashboard V2
 * HANYA aset awam GitHub Pages disimpan. Tiada respons API, data guru, rekod murid atau token.
 */
'use strict';
const SHELL_CACHE='semakmur-public-shell-v20261031-instant-v2';
const SHELL_RESOURCES=[
  './offline.html',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './app.html',
  './guru/DashboardGuru.html',
  './guru/dashboard.css'
];
const CACHED_URLS=new Set(SHELL_RESOURCES.slice(3).map(path=>new URL(path,self.registration.scope).pathname));

self.addEventListener('install', event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(SHELL_CACHE);
    // Ikon, offline dan halaman app mungkin tersedia dalam repo selepas muat naik.
    // Satu sumber gagal tidak boleh menghalang Service Worker daripada dipasang.
    await Promise.all(SHELL_RESOURCES.map(async path=>{
      try{
        const url=new URL(path,self.registration.scope);
        const r=await fetch(url.href,{cache:'no-store',credentials:'same-origin'});
        if(r.ok && r.type!=='opaque')await cache.put(url.href,r.clone());
      }catch(_e){}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('semakmur-public-shell-')&&k!==SHELL_CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const scope=new URL(self.registration.scope);
  // Tidak tangkap POST Apps Script, sumber luar, atau data yang dikembalikan dari API.
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  if(CACHED_URLS.has(url.pathname)){
    event.respondWith((async()=>{
      const cache=await caches.open(SHELL_CACHE);
      const canonical=new URL(url.pathname,scope.origin).href;
      const cached=await cache.match(canonical);
      const update=fetch(req,{cache:'no-store'}).then(async response=>{
        if(response.ok&&response.type!=='opaque')await cache.put(canonical,response.clone());
        return response;
      });
      if(cached){
        // Papar UI awam daripada cache serta-merta; ambil versi baru di belakang tabir.
        event.waitUntil(update.catch(()=>{}));
        return cached;
      }
      try{return await update;}
      catch(_e){
        if(req.mode==='navigate')return await cache.match(new URL('./offline.html',scope).href)||Response.error();
        return Response.error();
      }
    })());
    return;
  }
  // Login dan semua halaman lain kekal network-first. Hanya halaman offline statik sebagai fallback.
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).catch(async()=>{
      return (await caches.match(new URL('./offline.html',scope).href))||Response.error();
    }));
  }
});
