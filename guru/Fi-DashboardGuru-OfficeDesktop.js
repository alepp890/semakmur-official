/* SeMAKMUR Fi Office Desktop V6.2.0
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
  ['forest-executive','Forest Executive',['Forest','Sage','Olive','Copper','Ivory','White','Charcoal'],['#173C34','#7B9278','#B0AB75','#BF7854','#F7F4EC','#FFFFFF','#252B27']],
  ['burgundy-prestige','Burgundy Prestige',['Burgundy','Dusty Rose','Champagne','Taupe','Cream','White','Ink'],['#67283C','#B57985','#D9B88F','#AA978B','#F8F2EC','#FFFFFF','#2C2428']],
  ['terracotta-studio','Terracotta Studio',['Terracotta','Clay','Sand','Olive','Linen','White','Espresso'],['#B75F45','#DC9B7F','#E6C9A8','#838568','#FAF5ED','#FFFFFF','#392F2B']],
  ['olive-champagne','Olive & Champagne',['Deep Olive','Moss','Champagne','Stone','Porcelain','White','Graphite'],['#424C32','#7B8964','#D4BA88','#BFB7A8','#F7F6F0','#FFFFFF','#282C25']],
  ['plum-pearl','Plum & Pearl',['Deep Plum','Mauve','Lavender','Antique Gold','Pearl','White','Midnight Ink'],['#50304D','#96738F','#D8C6D8','#C6A46C','#F8F5F8','#FFFFFF','#29242D']],
  ['charcoal-copper','Charcoal & Copper',['Charcoal','Graphite','Copper','Warm Gold','Warm Gray','White','Black'],['#282B29','#555A55','#B76D47','#D5AA72','#EBE9E4','#FFFFFF','#1C1E1B']],
  ['emerald-luxe','Emerald Luxe',['Emerald','Jade','Mint','Gold','Mist','White','Deep Ink'],['#136E52','#4D9A79','#B9DDC9','#D2AC61','#F2F8F3','#FFFFFF','#25342D']],
  ['mocha-sand','Mocha & Sand',['Espresso','Mocha','Caramel','Sand','Oat','White','Dark Cocoa'],['#4B372D','#896B59','#BA9270','#D8C5AC','#F6F1E8','#FFFFFF','#2D2925']],
  ['rosewood-modern','Rosewood Modern',['Rosewood','Rose','Blush','Sage','Ivory','White','Dark Slate'],['#834C50','#C08A8E','#E9C7C5','#929B85','#FBF7F4','#FFFFFF','#302C2D']],
  ['nordic-moss','Nordic Moss',['Pine','Moss','Eucalyptus','Mustard','Snow','White','Graphite'],['#334D43','#799080','#AAC5B2','#C9A15F','#F7F8F4','#FFFFFF','#303833']],
  ['midnight-gold','Midnight Gold',['Midnight Navy','Ocean Blue','Solar Yellow','Coral','Frost','White','Dark Ink'],['#102A43','#1F5F8B','#FFD34D','#F77759','#F5F8FC','#FFFFFF','#17212D']],
  ['cobalt-tangerine','Cobalt Tangerine',['Royal Cobalt','Deep Royal','Tangerine','Aqua','Cloud','White','Graphite'],['#2454D3','#173DA5','#FF8B38','#4ED6C3','#F1F5FF','#FFFFFF','#202638']],
  ['electric-plum','Electric Plum',['Deep Plum','Orchid','Electric Lime','Hot Rose','Soft Ice','White','Plum Ink'],['#44205E','#8A3DAD','#D4F04F','#FF6C91','#FAF6FC','#FFFFFF','#241C2B']],
  ['teal-flame','Teal Flame',['Deep Teal','Bright Teal','Vivid Coral','Mango','Mint Mist','White','Deep Ink'],['#074B4C','#0C978B','#FF725E','#FFC45B','#F1FAF8','#FFFFFF','#173232']],
  ['crimson-citrus','Crimson Citrus',['Crimson','Raspberry','Citrus Yellow','Peach','Soft Blush','White','Berry Ink'],['#7D1D35','#CC3D5D','#F6D34B','#FF9B73','#FFF5F5','#FFFFFF','#2C2028']],
  ['emerald-spark','Emerald Spark',['Deep Emerald','Emerald','Lemon','Magenta','Dew','White','Charcoal'],['#075E41','#0AA678','#FDE047','#E75BA1','#F1FCF7','#FFFFFF','#1D2C27']],
  ['graphite-neon','Graphite Neon',['Graphite','Steel Slate','Electric Cyan','Neon Lime','Fog','White','Deep Black'],['#252A35','#485465','#30D9E8','#D5F65C','#F3F6F8','#FFFFFF','#161B23']],
  ['indigo-sunset','Indigo Sunset',['Midnight Indigo','Royal Indigo','Sunset Amber','Pink','Snow','White','Ink'],['#26265C','#5955C8','#FFB02E','#FC789D','#F5F4FE','#FFFFFF','#26243C']],
  ['chocolate-pop','Chocolate Pop',['Dark Cocoa','Mocha','Turquoise','Mango','Oat','White','Black'],['#382920','#80604C','#30CFBA','#FFA63D','#FBF6EF','#FFFFFF','#241F1D']],
  ['fuchsia-turquoise','Fuchsia Turquoise',['Deep Wine','Fuchsia','Aqua','Sunshine','Pearl','White','Ink'],['#64234C','#E6448B','#32CDBB','#FFD166','#FFF5FA','#FFFFFF','#2D2631']]
 ];
 const THEMES=Object.fromEntries(THEME_LIST.map(t=>[t[0],{name:t[1],labels:t[2],values:t[3],main:t[3][0],secondary:t[3][1],soft:t[3][2],accent:t[3][3],page:t[3][4],ink:t[3][6]}]));
 const ROLE_ITEMS=[
  ['sidebar','Sidebar'],['text','Tulisan isi'],['heading','Tajuk / tulisan utama'],
  ['onDark','Tulisan atas warna gelap'],['border','Border'],['button','Butang'],
  ['accent','Aksen / ikon'],['surface','Latar kad'],['page','Latar halaman'],['hero','Latar banner']
 ];
 const EFFECT_ITEMS=[['sidebar','Sidebar'],['buttons','Butang'],['quicklinks','Pautan Pantas'],
  ['hero','Banner'],['statistics','Kad statistik'],['panels','Panel / kad']];
 const FONT_ITEMS=[['body','Teks biasa',12,19],['heading','Tajuk seksyen',14,26],
  ['metric','Nombor / statistik',20,38],['button','Tulisan butang',11,18]];
 const BASE={theme:'plum-pearl',style:'gradient',order:[...KEYS],
  widths:Object.fromEntries(WIDGETS.map(w=>[w.id,w.width])),hidden:[],
  effects:Object.fromEntries(EFFECT_ITEMS.map(v=>[v[0],'gradient'])),
  fontSizes:{body:13,heading:16,metric:26,button:12}};
 const $=id=>document.getElementById(id);
 let published=null,draft=null,editing=false,admin=false;
 let mounted=false,auth=null,db=null,user=null,firestore=null;
 let unsubAuth=null,unsubConfig=null,unsubRole=null,initAttempt=0;
 const holders=new Map(),tiles=new Map(),sectionActionRefs=[];
 let grid=null,drawer=null,pendingSave=false,dragging=null,categoryObserver=null;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const HEX=/^#[0-9a-fA-F]{6}$/;
 const colorOK=x=>typeof x==='string'&&HEX.test(x);
 function defaultColors(name){
  const t=THEMES[name]||THEMES[BASE.theme];const v=t.values;
  return {sidebar:v[0],text:v[6],heading:v[0],onDark:'#FFFFFF',border:v[2],
   button:v[0],accent:v[3],surface:v[5],page:v[4],hero:v[4]};
 }
 function normalize(data){
  const d=data&&typeof data==='object'?data:{};
  const theme=THEMES[d.theme]?d.theme:BASE.theme;
  const order=Array.isArray(d.order)?d.order.filter(k=>KEYS.includes(k)):[];
  const full=[...new Set(order),...KEYS.filter(k=>!order.includes(k))];
  const widths={};for(const w of WIDGETS){const v=Number(d.widths?.[w.id]);widths[w.id]=[4,6,8,12].includes(v)?v:w.width;}
  const hidden=[...new Set(Array.isArray(d.hidden)?d.hidden.filter(k=>KEYS.includes(k)):[])];
  const defaults=defaultColors(theme),colors={};
  for(const [k] of ROLE_ITEMS){colors[k]=colorOK(d.colors?.[k])?d.colors[k].toUpperCase():defaults[k];}
  const style=['solid','gradient','mixed'].includes(d.style)?d.style:'gradient';
  const effects={};for(const [k] of EFFECT_ITEMS){effects[k]=['solid','gradient'].includes(d.effects?.[k])?d.effects[k]:'gradient';}
  const fontSizes={};for(const [k,_,min,max] of FONT_ITEMS){const v=Number(d.fontSizes?.[k]);fontSizes[k]=Number.isInteger(v)&&v>=min&&v<=max?v:BASE.fontSizes[k];}
  return {theme,style,order:full,widths,hidden,colors,effects,fontSizes};
 }
 published=normalize(BASE);
 function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
 function luminance(hex){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;}
 function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
 function legible(bg,preferred){return contrast(bg,preferred)>=4.5?preferred:(contrast(bg,'#FFFFFF')>=contrast(bg,'#17212D')?'#FFFFFF':'#17212D');}
 function applyTheme(config){
  if(!mounted)return;
  const c=normalize(config),t=THEMES[c.theme],r=c.colors,b=document.body;
  const mode=part=>c.style==='mixed'?c.effects[part]:c.style;
  const bg=(part,a,z)=>mode(part)==='solid'?a:`linear-gradient(127deg,${a} 0%,${z} 100%)`;
  const vars={
   '--of-main':t.main,'--of-secondary':t.secondary,'--of-soft':t.soft,
   '--of-accent':r.accent,'--of-page':r.page,'--of-ink':r.text,
   '--of-heading':r.heading,'--of-on-dark':r.onDark,'--of-surface':r.surface,'--of-border':r.border,
   '--of-rail':bg('sidebar',r.sidebar,t.ink),
   '--of-hero':mode('hero')==='solid'?r.hero:`linear-gradient(112deg,${r.surface},${r.hero} 67%,${t.soft})`,
   '--of-button':bg('buttons',r.button,t.secondary),
   '--of-feature':bg('panels',r.sidebar,t.ink),
   '--of-quick-1':bg('quicklinks',r.button,t.secondary),
   '--of-quick-2':bg('quicklinks',t.secondary,r.button),
   '--of-quick-3':bg('quicklinks',r.sidebar,t.ink),
   '--of-quick-4':bg('quicklinks',r.button,r.sidebar),
   '--of-stat-bg':bg('statistics',r.surface,r.hero),
   '--of-stat-bg-2':bg('statistics',r.surface,t.page),
   '--of-panel-bg':bg('panels',r.surface,r.hero),
   '--of-stat-icon-1':bg('statistics',r.button,t.secondary),
   '--of-stat-icon-2':bg('statistics',r.accent,r.button),
   '--of-stat-icon-3':bg('statistics',t.secondary,r.sidebar),
   '--of-stat-icon-4':bg('statistics',r.sidebar,t.ink),
   '--of-button-text':legible(r.button,r.onDark),
   '--of-shortcut-text':legible(r.button,r.onDark),
   '--of-sidebar-text':legible(r.sidebar,r.onDark),
   '--of-size-body':`${c.fontSizes.body}px`,
   '--of-size-heading':`${c.fontSizes.heading}px`,
   '--of-size-metric':`${c.fontSizes.metric}px`,
   '--of-size-button':`${c.fontSizes.button}px`
  };
  Object.entries(vars).forEach(([k,v])=>b.style.setProperty(k,v));
  b.dataset.fiOfficeTheme=c.theme;b.dataset.fiOfficeStyle=c.style;
  b.dataset.fiOfficeHeroDark=String(luminance(r.hero)<0.22);
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
  installSectionActions();createEditor();bindGrid();applyLayout(published);observeCategory();updateHeroDay();
  window.FiOfficeDesk={isDesktop:true,getCurrent:()=>clone(published)};
  startFirebase();
 }
 function unmount(){
  if(!mounted)return;
  closeEditor(true);
  // Restore original action buttons before their desktop-only wrappers are removed.
  for(const item of sectionActionRefs){
   if(item.original && item.marker?.parentNode){
    item.marker.parentNode.replaceChild(item.button,item.marker);
    item.button.classList.remove('fi-office-section-action');
   }
   item.slot?.remove();
  }
  sectionActionRefs.length=0;
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
  const c=normalize(config);applyTheme(c);
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
 function installSectionActions(){
  // Only working actions: original Keberadaan button, Firestore-backed modules,
  // and existing school calendar. Buttons do not create/fabricate data.
  const configs=[
   ['summary','e-Relief','relief'],
   ['timetable','Buka Takwim','calendar'],
   ['announcements','Besarkan','expand'],
   ['calendar','Buka Takwim','calendar'],
   ['quicklinks','Menu Modul','menu'],
   ['keberadaan','Buka e-Keberadaan','keberadaan']
  ];
  for(const [id,label,action] of configs){
   const tile=tiles.get(id);if(!tile)continue;
   const section=tile.querySelector('.fi-office-tile-content > :first-child');
   const head=section?.querySelector('.right-card-head,.quicklinks-topline,.home-summary-title');
   if(!head)continue;
   // Existing e-Keberadaan action keeps its data-module handler.
   let button=id==='keberadaan'?section.querySelector('.kb-dash-open'):null;
   let marker=null;
   if(button){marker=document.createComment('fi-office-original-section-action');button.parentNode.insertBefore(marker,button);}
   if(!button){button=el('button','fi-office-section-action');button.type='button';button.textContent=label;
     if(action==='relief')button.dataset.module='relief';
     else if(action==='keberadaan')button.dataset.module='keberadaan';
     else button.addEventListener('click',()=>{
      if(action==='calendar')$('bestari-calendar-trigger')?.click();
      if(action==='menu')document.querySelector('#desktop-nav .nav-link[data-page="lain_lain"]')?.click();
      if(action==='expand'){
        const active=tile.classList.toggle('fi-office-expanded');
        button.textContent=active?'Kecilkan':'Besarkan';button.setAttribute('aria-pressed',String(active));
      }
     });
   }
   button.classList.add('fi-office-section-action');
   const target=el('div','fi-office-action-slot');target.appendChild(button);head.appendChild(target);
   sectionActionRefs.push({button,slot:target,marker,original:!!marker});
  }
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
  drawer.innerHTML=`<div class="fi-office-editor" role="dialog" aria-modal="true" aria-labelledby="fi-office-editor-title">
   <div class="fi-office-editor-top"><span class="fi-office-editor-eyebrow">ADMIN SISTEM · DESKTOP SAHAJA</span>
    <h2 id="fi-office-editor-title">Theme & Layout Studio</h2>
    <p>Pilih 20 palet, gaya warna, warna komponen dan saiz tulisan. Ubah panel kemudian Terbitkan kepada semua guru desktop.</p></div>
   <div class="fi-office-editor-scroll" id="fi-office-editor-scroll">
    <h3>1. Palet Warna (20 pilihan)</h3><div class="fi-office-themes" id="fi-office-themes"></div>
    <h3>2. Gaya Paparan</h3><div id="fi-office-style-settings"></div>
    <h3>3. Tetapan Warna Setiap Elemen</h3><p class="fi-office-hint">Pilih nama warna dalam palet, atau gunakan kotak warna untuk warna tersuai.</p>
    <div id="fi-office-colors"></div><p id="fi-office-contrast-notice" class="fi-office-contrast-notice" role="status"></p>
    <h3>4. Saiz Tulisan Desktop (px)</h3><div id="fi-office-fonts"></div>
    <div class="fi-office-editor-row"><h3>5. Susunan & Lebar Panel</h3><small>Seret panel atau tetapkan di bawah.</small></div>
    <div id="fi-office-widgets-config"></div>
    <div class="fi-office-editor-note" id="fi-office-editor-status" role="status">Pratonton belum diterbitkan.</div>
   </div><div class="fi-office-editor-footer"><button id="fi-office-reset" type="button" class="fi-office-btn-secondary">Asal</button>
   <button id="fi-office-cancel" type="button" class="fi-office-btn-secondary">Batal</button>
   <button id="fi-office-save" type="button" class="fi-office-btn-primary">Terbitkan</button></div></div>`;
  document.body.appendChild(drawer);
  drawer.addEventListener('click',e=>{if(e.target===drawer)closeEditor(true);});
  $('fi-office-cancel').addEventListener('click',()=>closeEditor(true));
  $('fi-office-reset').addEventListener('click',()=>{if(!editing)return;draft=normalize(BASE);applyLayout(draft);editorStatus('Konfigurasi asal dipratonton. Klik Terbitkan untuk menyimpan.');});
  $('fi-office-save').addEventListener('click',saveLayout);
  $('fi-office-themes').addEventListener('click',e=>{
   const btn=e.target.closest('button[data-theme]');if(!btn||!draft)return;
   draft.theme=btn.dataset.theme;draft.colors=defaultColors(draft.theme);
   applyLayout(draft);editorStatus('Palet dipratonton. Warna peranan diset semula mengikut palet baharu.');
  });
  $('fi-office-style-settings').addEventListener('change',e=>{
   if(!draft)return;
   if(e.target.matches('[data-style]'))draft.style=e.target.value;
   else if(e.target.matches('[data-effect]'))draft.effects[e.target.dataset.effect]=e.target.value;
   else return;
   applyLayout(draft);editorStatus('Gaya paparan dipratonton. Klik Terbitkan untuk menyimpan.');
  });
  const changeColor=e=>{
   const k=e.target?.dataset?.color;if(!draft||!ROLE_ITEMS.some(r=>r[0]===k)||!colorOK(e.target.value))return;
   draft.colors[k]=e.target.value.toUpperCase();applyLayout(draft);
   editorStatus('Warna tersuai sedang dipratonton.');
  };
  $('fi-office-colors').addEventListener('change',changeColor);
  $('fi-office-fonts').addEventListener('input',e=>{
   const k=e.target?.dataset?.font;if(!draft||!FONT_ITEMS.some(f=>f[0]===k))return;
   draft.fontSizes[k]=Number(e.target.value);
   const label=$(`fi-office-font-value-${k}`);if(label)label.textContent=e.target.value+'px';
   applyTheme(draft);editorStatus('Saiz tulisan dipratonton.');
  });
  $('fi-office-widgets-config').addEventListener('change',e=>{
   if(!draft)return;
   const id=e.target.closest('[data-widget]')?.dataset.widget;if(!KEYS.includes(id))return;
   if(e.target.matches('select[data-width]'))draft.widths[id]=Number(e.target.value);
   if(e.target.matches('input[data-hide]'))draft.hidden=e.target.checked?[...new Set([...draft.hidden,id])]:draft.hidden.filter(x=>x!==id);
   applyLayout(draft);editorStatus('Susunan dipratonton. Klik Terbitkan untuk menyimpan.');
  });
 }
 function editorStatus(message,isError=false){const node=$('fi-office-editor-status');if(node){node.textContent=message;node.classList.toggle('is-error',isError);}}
 function renderEditorOptions(){
  if(!drawer||!draft)return;
  const scroller=$('fi-office-editor-scroll'),pos=scroller?.scrollTop||0;
  const t=THEMES[draft.theme];
  $('fi-office-themes').innerHTML=THEME_LIST.map((p,i)=>`<button type="button" data-theme="${p[0]}" aria-pressed="${p[0]===draft.theme}" class="fi-office-theme-option ${p[0]===draft.theme?'is-selected':''}"><span class="fi-office-theme-strip" style="background:linear-gradient(110deg,${p[3][0]},${p[3][1]} 55%,${p[3][2]})"></span><span>${String(i+1).padStart(2,'0')} · ${p[1]}</span></button>`).join('');
  $('fi-office-style-settings').innerHTML=`<label class="fi-office-editor-field"><span>Gaya keseluruhan</span><select data-style>${[['solid','Solid'],['gradient','Gradient'],['mixed','Campuran (pilih setiap elemen)']].map(v=>`<option value="${v[0]}" ${draft.style===v[0]?'selected':''}>${v[1]}</option>`).join('')}</select></label><div class="fi-office-effect-grid">${EFFECT_ITEMS.map(([k,label])=>`<label><span>${label}</span><select data-effect="${k}" ${draft.style==='mixed'?'':'disabled'}><option value="solid" ${draft.effects[k]==='solid'?'selected':''}>Solid</option><option value="gradient" ${draft.effects[k]==='gradient'?'selected':''}>Gradient</option></select></label>`).join('')}</div>`;
  $('fi-office-colors').innerHTML=ROLE_ITEMS.map(([k,label])=>{
   const value=draft.colors[k];
   return `<div class="fi-office-color-row"><label for="fi-office-palette-${k}">${label}</label><select id="fi-office-palette-${k}" data-color="${k}" aria-label="Palet warna ${label}"><option value="${value}">Semasa: ${value}</option>${t.values.map((color,i)=>`<option value="${color}" ${value===color?'selected':''}>${t.labels[i]} · ${color}</option>`).join('')}</select><input type="color" data-color="${k}" value="${value}" aria-label="Pilih warna tersuai untuk ${label}" title="Warna tersuai" /></div>`;
  }).join('');
  const textContrast=contrast(draft.colors.text,draft.colors.surface);
  const headContrast=contrast(draft.colors.heading,draft.colors.surface);
  $('fi-office-contrast-notice').textContent=(textContrast<4.5||headContrast<3)?`⚠ Kontras tulisan/kad rendah (${Math.min(textContrast,headContrast).toFixed(1)}:1). Untuk keterbacaan, pilih tulisan yang lebih gelap bagi latar kad cerah.`:'✓ Kontras tulisan pada latar kad memadai.';
  $('fi-office-contrast-notice').classList.toggle('is-warning',textContrast<4.5||headContrast<3);
  $('fi-office-fonts').innerHTML=FONT_ITEMS.map(([k,label,min,max])=>`<label class="fi-office-font-row"><span>${label}</span><input type="range" data-font="${k}" min="${min}" max="${max}" step="1" value="${draft.fontSizes[k]}"/><strong id="fi-office-font-value-${k}">${draft.fontSizes[k]}px</strong></label>`).join('');
  $('fi-office-widgets-config').innerHTML=draft.order.map(k=>{
   const w=WIDGETS.find(v=>v.id===k),span=draft.widths[k],hide=draft.hidden.includes(k);
   return `<div class="fi-office-config-row" data-widget="${k}"><strong>${w.title}</strong><label>Lebar <select data-width aria-label="Lebar ${w.title}">${[4,6,8,12].map(n=>`<option value="${n}" ${span===n?'selected':''}>${n===12?'Penuh (12)':n===8?'Besar (8)':n===6?'Separuh (6)':'Kecil (4)'}</option>`).join('')}</select></label><label class="fi-office-checkbox"><input data-hide type="checkbox" ${hide?'checked':''}/> Sorok</label></div>`;
  }).join('');
  if(scroller)scroller.scrollTop=pos;
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
