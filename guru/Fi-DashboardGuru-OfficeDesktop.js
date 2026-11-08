/* SeMAKMUR Fi Office Desktop V6.0.0
 * Desktop >=1024px sahaja. Widget asal dipindahkan, bukan diklon.
 * Tema + susunan disimpan dalam Firestore selepas pengesahan ADMIN_SISTEM.
 * Tidak mengubah login, PWA, data modul, atau backend Apps Script.
 */
(()=>{
 'use strict';
 const mq=window.matchMedia('(min-width: 1024px)');
 const WIDGETS=[
  {id:'hero',title:'Banner Selamat Datang',width:12},
  {id:'quicklinks',title:'Pautan Pantas',width:12,element:'home-quicklinks'},
  {id:'summary',title:'Ringkasan Harian',width:12,element:'summary-section'},
  {id:'timetable',title:'Jadual Waktu Hari Ini',width:8,element:'right-timetable'},
  {id:'announcements',title:'Pengumuman Terkini',width:4,element:'right-announcements'},
  {id:'keberadaan',title:'Statistik e-Keberadaan',width:8,element:'right-keberadaan-stats'},
  {id:'calendar',title:'Takwim Terkini',width:4,element:'right-calendar-panel'}
 ];
 const KEYS=WIDGETS.map(w=>w.id);
 const THEME_LIST=[
  ['forest-executive','Forest Executive','#173C34','#7B9278','#B0AB75','#BF7854','#F7F4EC','#252B27'],
  ['burgundy-prestige','Burgundy Prestige','#67283C','#B57985','#D9B88F','#AA978B','#F8F2EC','#2C2428'],
  ['terracotta-studio','Terracotta Studio','#B75F45','#DC9B7F','#E6C9A8','#838568','#FAF5ED','#392F2B'],
  ['olive-champagne','Olive & Champagne','#424C32','#7B8964','#D4BA88','#BFB7A8','#F7F6F0','#282C25'],
  ['plum-pearl','Plum & Pearl','#50304D','#96738F','#D8C6D8','#C6A46C','#F8F5F8','#29242D'],
  ['charcoal-copper','Charcoal & Copper','#282B29','#555A55','#B76D47','#D5AA72','#EBE9E4','#1C1E1B'],
  ['emerald-luxe','Emerald Luxe','#136E52','#4D9A79','#B9DDC9','#D2AC61','#F2F8F3','#25342D'],
  ['mocha-sand','Mocha & Sand','#4B372D','#896B59','#BA9270','#D8C5AC','#F6F1E8','#2D2925'],
  ['rosewood-modern','Rosewood Modern','#834C50','#C08A8E','#E9C7C5','#929B85','#FBF7F4','#302C2D'],
  ['nordic-moss','Nordic Moss','#334D43','#799080','#AAC5B2','#C9A15F','#F7F8F4','#303833']
 ];
 const THEMES=Object.fromEntries(THEME_LIST.map(t=>[t[0],{name:t[1],main:t[2],secondary:t[3],soft:t[4],accent:t[5],page:t[6],ink:t[7]}]));
 const BASE={theme:'plum-pearl',order:[...KEYS],widths:Object.fromEntries(WIDGETS.map(w=>[w.id,w.width])),hidden:[]};
 const $=id=>document.getElementById(id);
 let published=structuredClone(BASE),draft=null, editing=false, admin=false;
 let mounted=false, auth=null, db=null, user=null, firestore=null;
 let unsubAuth=null,unsubConfig=null,unsubRole=null,initAttempt=0;
 const holders=new Map(), tiles=new Map();
 let grid=null, drawer=null, pendingSave=false,dragging=null,categoryObserver=null;
 const clone=x=>JSON.parse(JSON.stringify(x));
 function normalize(data){
  const d=data&&typeof data==='object'?data:{};
  const order=Array.isArray(d.order)?d.order.filter(k=>KEYS.includes(k)):[];
  const full=[...new Set(order),...KEYS.filter(k=>!order.includes(k))];
  const widths={};for(const w of WIDGETS){const v=Number(d.widths?.[w.id]);widths[w.id]=[4,6,8,12].includes(v)?v:w.width;}
  const hidden=[...new Set(Array.isArray(d.hidden)?d.hidden.filter(k=>KEYS.includes(k)):[])];
  return {theme:THEMES[d.theme]?d.theme:BASE.theme,order:full,widths,hidden};
 }
 function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
 function applyTheme(name){
  const t=THEMES[name]||THEMES[BASE.theme],b=document.body;
  const vars={
   '--of-main':t.main,'--of-secondary':t.secondary,'--of-soft':t.soft,
   '--of-accent':t.accent,'--of-page':t.page,'--of-ink':t.ink,
   '--of-border':`color-mix(in srgb, ${t.secondary} 24%, #fff)`,
   '--of-rail':`linear-gradient(169deg,${t.main} 0%,${t.ink} 100%)`,
   '--of-hero':`radial-gradient(ellipse at 95% 12%,${t.soft}70 0%, transparent 39%),linear-gradient(112deg,#ffffff 1%,${t.page} 52%,${t.soft} 100%)`,
   '--of-button':`linear-gradient(125deg,${t.main},${t.secondary})`,
   '--of-feature':`linear-gradient(130deg,${t.main},${t.ink} 72%)`
  };
  Object.entries(vars).forEach(([k,v])=>b.style.setProperty(k,v));
  b.dataset.fiOfficeTheme=name;
 }
 function addHeader(){
  const head=document.querySelector('.dashboard-main-header');if(!head||$('fi-office-brand'))return;
  const brand=el('div','fi-office-header-brand');brand.id='fi-office-brand';
  brand.innerHTML='<span class="fi-office-brand-mark" aria-hidden="true">S</span><span><strong>SeMAKMUR</strong><small>Digital Dashboard</small></span>';
  head.insertBefore(brand,head.firstChild);
  const userbtn=el('button','fi-office-user');userbtn.type='button';userbtn.id='fi-office-user';userbtn.title='Profil akaun guru';
  userbtn.innerHTML='<span class="fi-office-user-initial" id="fi-office-user-initial">G</span><span class="fi-office-user-name"><strong id="fi-office-user-name">Guru SeMAKMUR</strong><small>Portal Sekolah</small></span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
  userbtn.addEventListener('click',()=>window.openProfile?.());
  head.querySelector('.header-tools')?.appendChild(userbtn);
  const source=$('user-display-name');
  if(source){const sync=()=>{let name=(source.textContent||'Guru SeMAKMUR').trim();$('fi-office-user-name').textContent=name;$('fi-office-user-initial').textContent=name[0]?.toUpperCase()||'G';syncHeroName();};new MutationObserver(sync).observe(source,{childList:true,subtree:true,characterData:true});sync();}
  const nav=$('desktop-nav');
  nav?.querySelectorAll('.nav-link').forEach(btn=>{const title=btn.querySelector('span')?.textContent||'';btn.title=title;btn.setAttribute('aria-label',title);});
  if(nav){const settings=el('button','nav-link fi-office-settings-link');settings.type='button';settings.id='fi-office-settings-link';settings.title='Reka Bentuk Desktop (Admin)';settings.setAttribute('aria-label','Reka Bentuk Desktop (Admin)');settings.hidden=true;settings.innerHTML='<svg aria-hidden="true" class="nav-svg" fill="none" stroke="currentColor" stroke-width="1.9" viewBox="0 0 24 24"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="4"/></svg><span>Reka Bentuk</span>';
   settings.addEventListener('click',openEditor);nav.appendChild(settings);}
 }
 function hero(){
  const h=el('section','fi-office-hero');h.id='fi-office-hero';h.setAttribute('aria-label','Selamat Datang ke Dashboard Guru');
  h.innerHTML=`<div class="fi-office-hero-copy"><div class="fi-office-eyebrow">SEMAKMUR DIGITAL <i aria-hidden="true"></i> DASHBOARD GURU</div><h2>Urus hari sekolah, <em>lebih lancar.</em></h2><p>Selamat datang, <strong id="fi-office-hero-name">Guru SeMAKMUR</strong>. Semak jadual, kehadiran dan tindakan harian dalam satu ruang kerja.</p><div class="fi-office-hero-badges"><span><i class="fa-solid fa-circle-check"></i> Portal Guru</span><span><i class="fa-solid fa-calendar-days"></i> <b id="fi-office-hero-day">Hari ini</b></span><span><i class="fa-solid fa-layer-group"></i> Modul Bersepadu</span></div></div><div class="fi-office-hero-art" aria-hidden="true"><div class="fi-office-hero-disc"></div><div class="fi-office-hero-arch"><span class="fi-office-plant-stem s1"></span><span class="fi-office-plant-stem s2"></span><span class="fi-office-plant-stem s3"></span><span class="fi-office-plant-leaf l1"></span><span class="fi-office-plant-leaf l2"></span><span class="fi-office-plant-leaf l3"></span><span class="fi-office-plant-leaf l4"></span></div></div>`;
  return h;
 }
 function syncHeroName(){if($('fi-office-hero-name'))$('fi-office-hero-name').textContent=$('user-display-name')?.textContent?.trim()||'Guru SeMAKMUR';}
 function createTile(w){
  const box=el('div','fi-office-tile');box.dataset.widget=w.id;box.dataset.span=w.width;box.draggable=false;
  const bar=el('div','fi-office-tile-controls');bar.innerHTML='<span class="fi-office-move-handle" title="Seret untuk menyusun"><i class="fa-solid fa-grip-vertical" aria-hidden="true"></i> <span class="fi-office-tile-title"></span></span><span class="fi-office-tile-actions"><button data-move="up" title="Naik satu kedudukan" type="button" aria-label="Alih ke atas"><i class="fa-solid fa-arrow-up"></i></button><button data-move="down" title="Turun satu kedudukan" type="button" aria-label="Alih ke bawah"><i class="fa-solid fa-arrow-down"></i></button></span>';
  bar.querySelector('.fi-office-tile-title').textContent=w.title;
  box.appendChild(bar);
  const content=el('div','fi-office-tile-content');box.appendChild(content);
  if(w.id==='hero')content.appendChild(hero());
  else {
   const node=$(w.element);if(!node)return null;
   const placeholder=document.createComment(`fi-office-origin:${w.id}`);
   node.parentNode.insertBefore(placeholder,node);
   holders.set(w.id,{node,placeholder});content.appendChild(node);
  }
  box.addEventListener('click',e=>{if(!editing)return;const b=e.target.closest('button[data-move]');if(!b)return;e.preventDefault();e.stopPropagation();moveTile(w.id,b.dataset.move);});
  return box;
 }
 function mount(){
  if(mounted||!mq.matches||!$('page-laman_utama'))return;
  mounted=true;document.body.classList.add('fi-office-desktop');addHeader();
  const home=$('page-laman_utama');grid=el('div','fi-office-grid');grid.id='fi-office-grid';
  home.insertBefore(grid,home.firstChild);
  for(const w of WIDGETS){const t=createTile(w);if(t){tiles.set(w.id,t);grid.appendChild(t);}}
  createEditor();bindGrid();applyLayout(published);observeCategory();updateHeroDay();
  window.FiOfficeDesk={isDesktop:true,getCurrent:()=>clone(published)};
  startFirebase();
 }
 function unmount(){
  if(!mounted)return;
  closeEditor(true);
  for(const [,h] of holders){if(h.placeholder?.parentNode)h.placeholder.parentNode.replaceChild(h.node,h.placeholder);}
  holders.clear();tiles.clear();grid?.remove();grid=null;mounted=false;
  drawer?.remove();drawer=null;
  document.body.classList.remove('fi-office-desktop','fi-office-editing');
  document.body.removeAttribute('data-fi-office-theme');
  $('fi-office-settings-link')?.setAttribute('hidden','');
  if(categoryObserver){categoryObserver.disconnect();categoryObserver=null;}
  if(unsubAuth){unsubAuth();unsubAuth=null;}if(unsubConfig){unsubConfig();unsubConfig=null;}if(unsubRole){unsubRole();unsubRole=null;}
  auth=null;db=null;user=null;admin=false;initAttempt++;
  window.FiOfficeDesk={isDesktop:false};
 }
 function getActive(){return editing&&draft?draft:published;}
 function moveQuicklinks(homeVisible){
  const h=holders.get('quicklinks');if(!h)return;
  const target=tiles.get('quicklinks')?.querySelector('.fi-office-tile-content');
  if(homeVisible){if(target&&h.node.parentNode!==target)target.appendChild(h.node);}
  else if(h.placeholder?.parentNode&&h.node.parentNode!==h.placeholder.parentNode){h.placeholder.parentNode.insertBefore(h.node,h.placeholder.nextSibling);}
 }
 function observeCategory(){
  const home=$('page-laman_utama');if(!home)return;
  if(categoryObserver)categoryObserver.disconnect();
  categoryObserver=new MutationObserver(()=>{if(!mounted)return;const onHome=!home.classList.contains('hidden');moveQuicklinks(onHome);if(!onHome&&editing)closeEditor(true);});
  categoryObserver.observe(home,{attributes:true,attributeFilter:['class']});
 }
 function applyLayout(config){
  if(!mounted||!grid)return;
  const c=normalize(config);applyTheme(c.theme);
  for(const key of c.order){const tile=tiles.get(key);if(!tile)continue;grid.appendChild(tile);tile.dataset.span=c.widths[key];tile.dataset.disabled=String(c.hidden.includes(key));tile.draggable=editing&&admin;}
  document.body.classList.toggle('fi-office-editing',editing&&admin);
  moveQuicklinks(!$('page-laman_utama')?.classList.contains('hidden'));
  if(editing)renderEditorOptions();
 }
 function moveTile(id,direction){
  if(!editing||!draft)return;
  const idx=draft.order.indexOf(id),next=direction==='up'?idx-1:idx+1;
  if(next<0||next>=draft.order.length)return;
  [draft.order[idx],draft.order[next]]=[draft.order[next],draft.order[idx]];
  applyLayout(draft);
 }
 function bindGrid(){
  grid.addEventListener('click',e=>{
    if(editing && e.target.closest('.fi-office-tile-content')){e.preventDefault();e.stopPropagation();}
  },true);
  grid.addEventListener('dragstart',e=>{
   if(!editing||!admin)return e.preventDefault();
   const tile=e.target.closest('.fi-office-tile');if(!tile)return e.preventDefault();
   dragging=tile;tile.classList.add('fi-office-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',tile.dataset.widget);
  });
  grid.addEventListener('dragover',e=>{
   if(!dragging||!editing)return;
   const target=e.target.closest('.fi-office-tile');if(!target||target===dragging)return;
   e.preventDefault();e.dataTransfer.dropEffect='move';
   const r=target.getBoundingClientRect(),before=(e.clientY<r.top+r.height/2);
   grid.insertBefore(dragging,before?target:target.nextSibling);
  });
  grid.addEventListener('drop',e=>{if(!dragging)return;e.preventDefault();commitDrag();});
  grid.addEventListener('dragend',commitDrag);
 }
 function commitDrag(){
  if(!dragging)return;dragging.classList.remove('fi-office-dragging');dragging=null;
  if(editing&&draft){draft.order=[...grid.querySelectorAll(':scope > .fi-office-tile')].map(x=>x.dataset.widget);applyLayout(draft);}
 }
 function createEditor(){
  if(drawer)return;
  drawer=el('div','fi-office-editor-mask');drawer.id='fi-office-editor-mask';drawer.hidden=true;
  drawer.innerHTML=`<div class="fi-office-editor" role="dialog" aria-modal="true" aria-labelledby="fi-office-editor-title"><div class="fi-office-editor-top"><span class="fi-office-editor-eyebrow">ADMIN SISTEM · DESKTOP SAHAJA</span><h2 id="fi-office-editor-title">Reka Bentuk Dashboard</h2><p>Pilih tema gradient, seret widget, tetapkan lebar dan sorok panel. Perubahan hanya diterbitkan selepas disimpan.</p></div><div class="fi-office-editor-scroll"><h3>10 Tema Office Management</h3><div class="fi-office-themes" id="fi-office-themes"></div><div class="fi-office-editor-row"><h3>Kedudukan & lebar panel</h3><small>Seret kad pada dashboard atau guna anak panah.</small></div><div id="fi-office-widgets-config"></div><div class="fi-office-editor-note" id="fi-office-editor-status" role="status">Pratonton belum diterbitkan.</div></div><div class="fi-office-editor-footer"><button id="fi-office-reset" type="button" class="fi-office-btn-secondary">Susunan asal</button><button id="fi-office-cancel" type="button" class="fi-office-btn-secondary">Batal</button><button id="fi-office-save" type="button" class="fi-office-btn-primary">Terbitkan</button></div></div>`;
  document.body.appendChild(drawer);
  drawer.addEventListener('click',e=>{if(e.target===drawer)closeEditor(true);});
  $('fi-office-cancel').addEventListener('click',()=>closeEditor(true));
  $('fi-office-reset').addEventListener('click',()=>{if(!editing)return;draft=clone(BASE);applyLayout(draft);editorStatus('Susunan asal dipratonton. Klik Terbitkan untuk menyimpan.');});
  $('fi-office-save').addEventListener('click',saveLayout);
  $('fi-office-themes').addEventListener('click',e=>{
   const btn=e.target.closest('button[data-theme]');if(!btn||!draft)return;
   draft.theme=btn.dataset.theme;applyLayout(draft);editorStatus('Tema dipratonton. Klik Terbitkan untuk menyimpan.');
  });
  $('fi-office-widgets-config').addEventListener('change',e=>{
   if(!draft)return;
   const id=e.target.closest('[data-widget]')?.dataset.widget;if(!KEYS.includes(id))return;
   if(e.target.matches('select[data-width]'))draft.widths[id]=Number(e.target.value);
   if(e.target.matches('input[data-hide]'))draft.hidden=e.target.checked?[...new Set([...draft.hidden,id])]:draft.hidden.filter(x=>x!==id);
   applyLayout(draft);editorStatus('Perubahan dipratonton. Klik Terbitkan untuk menyimpan.');
  });
 }
 function editorStatus(message,isError=false){const node=$('fi-office-editor-status');if(node){node.textContent=message;node.classList.toggle('is-error',isError);}}
 function renderEditorOptions(){
  if(!drawer||!draft)return;
  $('fi-office-themes').innerHTML=THEME_LIST.map(t=>`<button type="button" data-theme="${t[0]}" aria-pressed="${t[0]===draft.theme}" class="fi-office-theme-option ${t[0]===draft.theme?'is-selected':''}"><span class="fi-office-theme-strip" style="background:linear-gradient(110deg,${t[2]},${t[3]} 55%,${t[4]})"></span><span>${t[1]}</span></button>`).join('');
  $('fi-office-widgets-config').innerHTML=draft.order.map(k=>{
   const w=WIDGETS.find(v=>v.id===k),span=draft.widths[k],hide=draft.hidden.includes(k);
   return `<div class="fi-office-config-row" data-widget="${k}"><strong>${w.title}</strong><label>Lebar <select data-width aria-label="Lebar ${w.title}">${[4,6,8,12].map(n=>`<option value="${n}" ${span===n?'selected':''}>${n===12?'Penuh (12)':n===8?'Besar (8)':n===6?'Separuh (6)':'Kecil (4)'}</option>`).join('')}</select></label><label class="fi-office-checkbox"><input data-hide type="checkbox" ${hide?'checked':''}/> Sorok</label></div>`;
  }).join('');
 }
 function openEditor(){
  if(!mounted||!admin||!user)return;
  if(!$('page-laman_utama')||$('page-laman_utama').classList.contains('hidden')){
   window.showInfo?.('Buka Laman Utama untuk mengubah susun atur.');return;
  }
  draft=clone(published);editing=true;drawer.hidden=false;applyLayout(draft);
  editorStatus('Pratonton sahaja. Seret kad di dashboard untuk ubah turutan.');
 }
 function closeEditor(discard){
  if(!editing)return;
  if(discard)draft=null;
  editing=false;dragging=null;
  if(drawer)drawer.hidden=true;
  if(mounted)applyLayout(published);
 }
 async function saveLayout(){
  if(!editing||!draft||!admin||!auth?.currentUser||!db||!firestore||pendingSave)return;
  const data=normalize(draft);pendingSave=true;
  const btn=$('fi-office-save');btn.disabled=true;btn.textContent='Menyimpan…';
  try{
   const uid=auth.currentUser.uid;
   await firestore.setDoc(firestore.doc(db,'semakmur_fi_dashboard_config','desktop'),{
    ...data,updatedAt:firestore.serverTimestamp(),updatedBy:uid
   });
   published=clone(data);closeEditor(true);
   window.showInfo?.('Tema dan susun atur desktop telah diterbitkan kepada semua guru.');
  }catch(err){
   const code=err?.code||'error';
   editorStatus(`Tidak dapat menyimpan (${code}). Semak Firestore Rules dan peranan ADMIN_SISTEM.`,true);
   console.error('Fi Office Desktop save:',err);
  }finally{pendingSave=false;btn.disabled=false;btn.textContent='Terbitkan';}
 }
 function updateHeroDay(){
  const el=$('fi-office-hero-day');if(!el)return;
  el.textContent=new Intl.DateTimeFormat('ms-MY',{weekday:'long',day:'numeric',month:'short',timeZone:'Asia/Kuala_Lumpur'}).format(new Date());
  syncHeroName();
 }
 async function startFirebase(){
  const attempt=++initAttempt;
  try{
   await Promise.race([window.FiBridgeReady,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Firebase Dashboard belum sedia')),18000))]);
   if(!mounted||attempt!==initAttempt)return;
   const {getApps}=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js');
   const {getAuth,onAuthStateChanged}=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js');
   firestore=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js');
   const app=getApps().find(a=>a.name==='semakmur-fi-dashboard');
   if(!app)throw new Error('Aplikasi Firebase Fi tidak ditemui');
   auth=getAuth(app);db=firestore.getFirestore(app);
   unsubAuth=onAuthStateChanged(auth,u=>{
    if(unsubConfig){unsubConfig();unsubConfig=null;}if(unsubRole){unsubRole();unsubRole=null;}
    user=u;admin=false;const settings=$('fi-office-settings-link');if(settings)settings.hidden=true;
    if(!u||!mounted)return;
    unsubConfig=firestore.onSnapshot(firestore.doc(db,'semakmur_fi_dashboard_config','desktop'),snap=>{
     published=snap.exists()?normalize(snap.data()):clone(BASE);
     if(!editing)applyLayout(published);
    },err=>{console.warn('Fi Desktop tema belum boleh dibaca:',err.code||err.message);if(!editing)applyLayout(published);});
    unsubRole=firestore.onSnapshot(firestore.doc(db,'semakmur_fi_keberadaan_roles',u.uid),snap=>{
     const d=snap.exists()?snap.data():null;
     const ok=d?.active===true && String(d.ownerEmail||'').toLowerCase()===String(u.email||'').toLowerCase() && Array.isArray(d.roles) && d.roles.includes('ADMIN_SISTEM');
     admin=Boolean(ok);if(settings)settings.hidden=!admin;
     if(!admin&&editing)closeEditor(true);
    },err=>{console.warn('Fi Desktop semakan ADMIN_SISTEM:',err.code||err.message);admin=false;if(settings)settings.hidden=true;});
   });
  }catch(err){console.warn('Fi Desktop konfigurasi Firestore tidak tersedia; tema lalai digunakan:',err?.message||err);}
 }
 function resize(){if(mq.matches)mount();else unmount();}
 mq.addEventListener?.('change',resize);
 window.addEventListener('resize',()=>{if(!('onchange' in mq))resize();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resize,{once:true});else resize();
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&editing)closeEditor(true);});
})();
