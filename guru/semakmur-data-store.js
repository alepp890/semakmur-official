/** SeMAKMUR Smart Data Store V3 — static data only + locally unsent drafts.
 * IndexedDB same-origin; NO tokens, attendance decisions officially submitted,
 * parent reports, student identity numbers, or admin data are stored.
 * All reads of personal class names REQUIRE a successful server session check first.
 * Best-effort cache: browser may evict any local data.
 */
(function(global){
  'use strict';
  const DB='SEMAKMUR_SMART_STATIC_V2', STORE='items';
  const TTL_BY_KIND={dashboard:24*60*60*1000,draft:14*86400000,prefs:30*86400000}; // 'attendance' kekal hingga revisi berubah / logout / eviction
  const userKey=email=>String(email||'').trim().toLowerCase();
  let conn=null;
  function db(){
    if(!('indexedDB' in global))return Promise.resolve(null);
    if(conn)return conn;
    conn=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB,1);
      req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'key'});};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('Storan tidak tersedia'));
    }).catch(()=>null);
    return conn;
  }
  function handle(op,key,value){
    return db().then(database=>{
      if(!database)return null;
      return new Promise(resolve=>{
        try{
          const tx=database.transaction(STORE,op==='get'?'readonly':'readwrite');
          const s=tx.objectStore(STORE);
          let request;
          if(op==='get')request=s.get(key);
          if(op==='put')request=s.put(value);
          if(op==='delete')request=s.delete(key);
          if(op==='clear')request=s.clear();
          let result=null, done=false;
          request.onsuccess=()=>{result=request.result??true;};
          request.onerror=()=>{result=null;};
          tx.oncomplete=()=>{if(!done){done=true;resolve(result);}};
          tx.onerror=()=>{if(!done){done=true;resolve(null);}};
          tx.onabort=()=>{if(!done){done=true;resolve(null);}};
        }catch(_){resolve(null);}
      });
    });
  }
  function cacheKey(kind,email,extra=''){
    const e=userKey(email);
    if(!e)return '';
    return kind+'|'+e+'|'+String(extra);
  }
  async function get(kind,email,extra=''){
    const key=cacheKey(kind,email,extra);if(!key)return null;
    const item=await handle('get',key);
    if(!item||!item.savedAt||item.savedAt>Date.now()+60000||(TTL_BY_KIND[kind]&&Date.now()-item.savedAt>TTL_BY_KIND[kind])){
      if(item)handle('delete',key);return null;
    }
    return item;
  }
  async function put(kind,email,extra,value,meta={}){
    const key=cacheKey(kind,email,extra);if(!key)return false;
    const item={key,savedAt:Date.now(),checkedAt:Date.now(),value,meta};
    return !!(await handle('put',key,item));
  }
  async function markChecked(kind,email,extra){
    const item=await get(kind,email,extra);
    if(!item)return;
    item.checkedAt=Date.now();
    await handle('put',item.key,item);
  }
  async function remove(kind,email,extra=''){
    const key=cacheKey(kind,email,extra);if(key)await handle('delete',key);
  }
  async function clearAll(){await handle('clear');}
  global.SeMAKMURDataStore=Object.freeze({get,put,markChecked,remove,clearAll});
})(window);
