/* SeMAKMUR Smart Tugasan Mingguan V3.0 · Fi-Sync integrated frontend.
   Strictly authenticated POST; never write directly to Sheets or Firestore. */
'use strict';
const tm$=id=>document.getElementById(id);
const tmEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tmFmt=d=>{if(!/^\d{4}-\d\d-\d\d$/.test(String(d||'')))return String(d||'—');const [y,m,dd]=d.split('-');return `${dd}/${m}/${y}`;};
const tmToday=()=>{const v=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const parts=Object.fromEntries(v.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${parts.year}-${parts.month}-${parts.day}`;};
const tmState={auth:null,user:null,data:null,detail:null,year:'2026',weekId:'',tab:'overview',busy:false,audit:null};
const tmManager=()=>!!tmState.data?.actor?.manager;
const tmMe=()=>tmState.data?.actor?.id||'';
const tmSelected=()=>tmState.data?.weeks?.find(w=>w.ID_Minggu===tmState.weekId);
const tmNames=()=>Object.fromEntries((tmState.detail?.members||[]).map(x=>[x.id,x.name]));
function tmNotice(text='',bad=false){const el=tm$('tm-notice');el.hidden=!text;el.textContent=String(text);el.classList.toggle('tm-error',!!bad);}
function tmBusy(flag){tmState.busy=!!flag;tm$('tm-loading').hidden=!flag;document.querySelectorAll('button,select,input,textarea').forEach(el=>{if(el.id==='tm-year'||el.id==='tm-refresh')el.disabled=flag;});}
function tmSignal(type){if(new URLSearchParams(location.search).get('embed')==='1'&&window.parent!==window)window.parent.postMessage({type},location.origin);}
function tmTrusted(origin){try{const u=new URL(origin);if(u.protocol!=='https:'||u.port||u.username||u.password)return false;const host=u.hostname.toLowerCase();return host==='script.google.com'||host==='script.googleusercontent.com'||host.endsWith('.script.googleusercontent.com')||host.endsWith('-script.googleusercontent.com');}catch{return false;}}
async function tmAPI(op,extra={}){
  const user=tmState.auth?.currentUser;
  if(!user)throw Error('Sila log masuk melalui Dashboard Guru terlebih dahulu.');
  const url=String(window.SeMAKMURFiAPIConfig?.webAppExecUrl||'').trim();
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url))throw Error('Fi-APIConfig.js tiada URL Web App Fi yang sah.');
  const nonce=(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
  const idToken=await user.getIdToken();
  return new Promise((resolve,reject)=>{
    const iframe=document.createElement('iframe');iframe.hidden=true;iframe.name='tm3-'+nonce;
    iframe.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin');
    const form=document.createElement('form');form.method='POST';form.action=url;form.target=iframe.name;form.hidden=true;
    const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify({action:'fiTM',nonce,idToken,op,...extra});form.appendChild(input);
    let finished=false;
    function cleanup(){clearTimeout(timer);window.removeEventListener('message',onMessage);form.remove();iframe.remove();}
    function onMessage(e){if(e.data?.channel!=='semakmur-fi-doc-v1'||!tmTrusted(e.origin)||e.data?.nonce!==nonce||finished)return;
      finished=true;cleanup();e.data.ok?resolve(e.data):reject(Error(e.data.error||'Backend menolak permintaan.'));
    }
    const timer=setTimeout(()=>{if(!finished){finished=true;cleanup();reject(Error('Tiada respons backend. Simpanan mungkin masih diproses; semak Apps Script → Executions dahulu sebelum tekan Simpan lagi.'));}},90000);
    window.addEventListener('message',onMessage);document.body.append(iframe,form);form.submit();
  });
}
async function tmRun(action,after){if(tmState.busy)return;tmBusy(true);tmNotice('');try{return await action();}catch(e){console.error('[Smart Tugasan Mingguan]',e);tmNotice(e.message||String(e),true);tmSignal('semakmur-tm-error');return null;}finally{tmBusy(false);if(after)after();}}
function tmTab(name){tmState.tab=name;document.querySelectorAll('[data-tm-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tmTab===name));document.querySelectorAll('[data-tm-panel]').forEach(x=>x.hidden=x.dataset.tmPanel!==name);}
async function tmBootstrap(){
  const result=await tmRun(()=>tmAPI('bootstrap',{year:tmState.year}));if(!result)return;
  tmState.data=result;tm$('tm-user').textContent=result.actor?.name||tmState.user?.email||'Guru';tm$('tm-tab-settings').hidden=!result.actor?.manager;tm$('tm-preflight').hidden=!result.actor?.manager;tm$('tm-sim-area').hidden=!result.actor?.manager;tm$('tm4-tab').hidden=!result.actor?.manager;
  const weeks=result.weeks||[];
  if(!weeks.some(x=>x.ID_Minggu===tmState.weekId)){
    const today=tmToday();tmState.weekId=(weeks.find(x=>x.Tempoh_Mula<=today&&today<=x.Tempoh_Tamat)||weeks[0])?.ID_Minggu||'';
  }
  tmRenderOverview();tmRenderSettings();if(result.actor?.manager)await tm4LoadWeeks(false);tmSignal('semakmur-tm-ready');
  if(tmState.weekId)await tmLoadDetail(false);else{tmState.detail=null;tmRenderDetail();}
}
function tmRenderOverview(){
  const a=tmState.data||{},weeks=a.weeks||[],plans=weeks.filter(x=>x.pelan).length;
  const summary=[['Minggu tersedia',weeks.length],['Kumpulan',a.groups?.length||0],['Draf / Pelan',plans],['Keahlian saya',a.membership?.length||0]];
  tm$('tm-summary').innerHTML=summary.map(([lab,num])=>`<div class="tm-metric"><strong>${num}</strong><span>${tmEsc(lab)}</span></div>`).join('');
  tm$('tm-weeks').innerHTML=weeks.length?weeks.map(w=>{
    const name=w.Nama_Ketua_Cadangan||'Belum ada calon',leader=w.pelan?.leader&&w.pelan?.leader!==w.ID_Ketua_Cadangan?`<span class="tm-muted">Ketua draf: ${tmEsc(w.pelan.leader)}</span>`:'';
    return `<article class="tm-week"><div class="tm-week-head"><h3>${tmEsc(w.Minggu||w.ID_Minggu)}</h3><span class="tm-tag ${w.pelan?'':'tm-warning'}">${w.pelan?'Draf':'Cadangan'}</span></div>
      <p>${tmEsc(w.Nama_Kumpulan||'—')} · ${tmFmt(w.Tempoh_Mula)} – ${tmFmt(w.Tempoh_Tamat)}</p>
      <div class="tm-week-leader">Ketua: ${tmEsc(name)}</div>${leader}<p>${w.Bil_Ahli_Layak||0} ahli layak sepanjang minggu</p>
      <div class="tm-buttons"><button type="button" class="tm-btn tm-ghost" data-tm-choose="${tmEsc(w.ID_Minggu)}">Buka Minggu</button>
      ${tmManager()&&!w.pelan&&w.ID_Ketua_Cadangan?`<button type="button" class="tm-btn tm-outline" data-tm-draft="${tmEsc(w.ID_Minggu)}">Sediakan Draf</button>`:''}</div></article>`;
  }).join(''):'<p class="tm-empty">Tiada minggu persekolahan yang mempunyai kumpulan dan pelantikan tersedia. Semak Takwim_Minggu serta Peranan_Staf.</p>';
  tm$('tm-warnings').innerHTML=(a.warnings||[]).length?(a.warnings||[]).map(x=>`<div class="tm-warning-line">${tmEsc(x)}</div>`).join(''):'<p class="tm-muted">Tiada amaran tambahan daripada Data Induk.</p>';
}
async function tmLoadDetail(showMessage=true){
  const id=tmState.weekId;if(!id){tmState.detail=null;tmRenderDetail();return;}
  const r=await tmRun(()=>tmAPI('detail',{year:tmState.year,weekId:id}));if(!r)return;
  tmState.detail=r;tmRenderDetail();if(showMessage)tmNotice('Data minggu bertugas telah dimuatkan.');
}
function tmRenderDetail(){
  const d=tmState.detail,sel=tmSelected();
  const blurb=sel?`<strong>${tmEsc(sel.Minggu||sel.ID_Minggu)} · ${tmEsc(sel.Nama_Kumpulan)}</strong><small>${tmFmt(sel.Tempoh_Mula)} hingga ${tmFmt(sel.Tempoh_Tamat)}</small>`:'<strong>Belum pilih minggu bertugas.</strong>';
  const about=`<div>${blurb}</div><div><strong>Ketua: ${tmEsc((d?.members||[]).find(x=>x.id===d?.plan?.leader)?.name||sel?.Nama_Ketua_Cadangan||'Belum ditetapkan')}</strong><small>Status: ${tmEsc(d?.plan?.status||'Belum ada draf')}</small></div>`;
  ['tm-selection-daily','tm-selection-weekly','tm-selection-tasks'].forEach(id=>tm$(id).innerHTML=about);
  const mine=!!d?.members?.some(x=>x.id===tmMe());
  tm$('tm-daily-form').hidden=!(mine&&d?.plan);tm$('tm-weekly-form').hidden=!(d?.plan&&d.plan.leader===tmMe()&&mine);
  if(d?.week){tm$('tm-day-date').min=d.week.mula;tm$('tm-day-date').max=d.week.tamat;
    const today=tmToday(),date=tm$('tm-day-date').value;
    if(!date||date<d.week.mula||date>d.week.tamat)tm$('tm-day-date').value=(today>=d.week.mula&&today<=d.week.tamat)?today:d.week.mula;
  }
  tmRenderSections();tmRenderDaily();tmRenderWeekly();tmRenderAssignments();
}
function tmDayName(date){if(!date)return '';const d=new Date(date+'T00:00:00Z').getUTCDay();return ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'][d]||'';}
function tmRenderSections(){
  const date=tm$('tm-day-date').value,day=tmDayName(date);
  const sections=(tmState.data?.settings?.sections||[]).filter(x=>!x.day||x.day==='Semua'||x.day===day);
  const sel=tm$('tm-day-section').value;
  tm$('tm-day-section').innerHTML='<option value="">Pilih bahagian…</option>'+sections.map(x=>`<option value="${tmEsc(x.id)}">${tmEsc(x.name)}</option>`).join('');
  if(sections.some(x=>x.id===sel))tm$('tm-day-section').value=sel;
  tmRestoreOwnEntry();
}
function tmRestoreOwnEntry(){
  const d=tmState.detail,date=tm$('tm-day-date').value,sect=tm$('tm-day-section').value;
  const day=d?.days?.find(x=>x.date===date);
  const own=d?.entries?.find(x=>x.daily===day?.id&&x.section===sect&&x.author===tmMe());
  tm$('tm-day-text').value=own?.text||'';
}
function tmRenderDaily(){
  const d=tmState.detail,entries=d?.entries||[],days=d?.days||[],names=tmNames(),sections=tmState.data?.settings?.sections||[];
  const lookup=Object.fromEntries(sections.map(x=>[x.id,x.name]));
  const byDay=days.map(day=>({...day,notes:entries.filter(x=>x.daily===day.id)})).filter(x=>x.notes.length);
  tm$('tm-daily-list').innerHTML=byDay.length?byDay.map(day=>`<div class="tm-record"><strong>${tmEsc(day.day)} · ${tmFmt(day.date)}</strong>${day.notes.map(note=>`<div class="tm-record"><small>${tmEsc(lookup[note.section]||note.section)} · ${tmEsc(names[note.author]||note.author)}</small><p>${tmEsc(note.text)}</p></div>`).join('')}</div>`).join(''):'<p class="tm-empty">Tiada catatan direkod untuk minggu ini.</p>';
}
function tmRenderWeekly(){
  const d=tmState.detail,w=d?.weekly,status=w?.status||'BELUM DIISI',isLeader=!!(d?.plan?.leader===tmMe()&&d?.members?.some(x=>x.id===tmMe()));
  const editable=isLeader&&!['DIHANTAR','DISEMAK'].includes(status);
  tm$('tm-weekly-status').textContent=status;
  tm$('tm-weekly-form').hidden=!editable;
  tm$('tm-weekly-readonly').hidden=!w||editable;
  if(w&&!editable)tm$('tm-weekly-readonly').innerHTML=`<h3>Ulasan keseluruhan</h3><p>${tmEsc(w.summary)}</p><h3>Cadangan penambahbaikan</h3><p>${tmEsc(w.followup||'—')}</p>${w.review?`<p><strong>Ulasan GB:</strong> ${tmEsc(w.review)}</p>`:''}`;
  if(editable){tm$('tm-weekly-summary').value=w?.summary||'';tm$('tm-weekly-followup').value=w?.followup||'';}
  tm$('tm-review').hidden=!(tmState.data?.actor?.isGB&&status==='DIHANTAR');
}
function tmRenderAssignments(){
  const r=tmState.detail?.assignments||[],types=tmState.data?.settings?.types||[];
  const names=Object.fromEntries(types.map(x=>[x.id,x.name]));
  tm$('tm-assignments').innerHTML=r.length?r.map(x=>`<div class="tm-warning-line">${tmFmt(x.date)} · ${tmEsc(names[x.task]||x.task)} · ${tmEsc(x.staff)} (${tmEsc(x.from)}–${tmEsc(x.to)})</div>`).join(''):
    '<p class="tm-empty">Belum ada agihan tugasan yang telah disahkan. Laporan harian masih boleh diuji selepas draf ketua disediakan.</p>';
}
function tm43SelectedType(){return tmState.data?.settings?.types?.find(x=>x.id===tm$('tm-time-task').value)||null;}
function tm43SyncTimeForm(){
  const t=tm43SelectedType(),mode=t?.mode||'TANPA_MASA';
  tm$('tm-time-start-wrap').hidden=mode==='TANPA_MASA';
  tm$('tm-time-end-wrap').hidden=mode!=='JULAT';
  tm$('tm-time-from').required=mode!=='TANPA_MASA';
  tm$('tm-time-to').required=mode==='JULAT';
  if(mode==='TANPA_MASA'){tm$('tm-time-from').value='';tm$('tm-time-to').value='';}
  if(mode==='MULA_SAHAJA')tm$('tm-time-to').value='';
  tm$('tm-time-count').value=t?.min||1;
  tm$('tm-time-mode-note').textContent=mode==='TANPA_MASA'
    ?'Tiada masa diperlukan. Pilih hari dan tahap; tugasan disemak mengikut keberadaan guru, bukan konflik jam PdPc.'
    :mode==='JULAT'?'Rehat: isi masa mula dan masa tamat. Kelayakan guru disemak dengan waktu PdPc sebenar.'
    :'Isi masa mula sahaja. Sistem menggunakan 15 minit selepas masa mula untuk semakan konflik PdPc.';
}
function tm43UpdateTaskMode(){
  const name=tm$('tm-task-name').value.trim();
  if(!name||tm$('tm-task-id').value)return;
  const timed=/REHAT|BALIK|PULANG/i.test(name);
  tm$('tm-task-time-required').value=timed?'YA':'TIDAK';
}
function tmRenderSettings(){
  const types=tmState.data?.settings?.types||[],times=tmState.data?.settings?.times||[];
  const names=Object.fromEntries(types.map(x=>[x.id,x.name]));
  const labels={TANPA_MASA:'Tiada tetapan masa',JULAT:'Masa mula + tamat',MULA_SAHAJA:'Masa mula sahaja'};
  tm$('tm-task-list').innerHTML='<div class="tm-mini-list">'+(types.length?types.map(x=>
    `<div class="tm-mini"><div><strong>${tmEsc(x.name)}</strong><small>${tmEsc(x.category)} · Mata ${Number(x.weight)||0} · ${Number(x.min)||1} guru · ${tmEsc(labels[x.mode]||'Semak tetapan masa')}</small></div><button class="tm-btn tm-ghost" data-edit-task="${tmEsc(x.id)}">Edit</button></div>`).join('')
    :'<p class="tm-empty">Belum ada jenis tugasan.</p>')+'</div>';
  const old=tm$('tm-time-task').value;
  tm$('tm-time-task').innerHTML='<option value="">Pilih tugasan…</option>'+types.filter(x=>x.status.toUpperCase()==='AKTIF').map(x=>`<option value="${tmEsc(x.id)}">${tmEsc(x.name)}</option>`).join('');
  if(types.some(x=>x.id===old))tm$('tm-time-task').value=old;
  tm43SyncTimeForm();
  tm$('tm-time-list').innerHTML='<div class="tm-mini-list">'+(times.length?times.map(x=>{
    const t=types.find(t=>t.id===x.task),mode=t?.mode||'TANPA_MASA';
    const clock=mode==='TANPA_MASA'?'Tiada masa':mode==='MULA_SAHAJA'?(x.start||'Masa mula belum diisi'):(x.start+'–'+x.end);
    return `<div class="tm-mini"><div><strong>${tmEsc(names[x.task]||x.task)}</strong><small>${tmEsc(x.day==='Semua Hari'?'Semua Hari (Isnin–Jumaat)':x.day)} · ${tmEsc(x.level||'Semua')} · ${tmEsc(clock)} · ${t?.min||x.count||1} guru · kuat kuasa ${tmFmt(x.from)}</small></div><button class="tm-btn tm-ghost" data-edit-time="${tmEsc(x.id)}">Edit</button></div>`;
  }).join(''):'<p class="tm-empty">Belum ada tetapan hari untuk tugasan bermasa. Jenis tanpa masa akan disediakan untuk Semua Hari apabila disimpan.</p>')+'</div>';
}
function tmEditTask(id){const x=tmState.data?.settings?.types?.find(x=>x.id===id);if(!x)return;
  tm$('tm-task-id').value=x.id;tm$('tm-task-name').value=x.name;tm$('tm-task-category').value=x.category;
  tm$('tm-task-weight').value=x.weight;tm$('tm-task-min').value=x.min;
  tm$('tm-task-time-required').value=x.mode==='TANPA_MASA'?'TIDAK':'YA';
  tm$('tm-task-name').focus();}
function tmEditTime(id){const x=tmState.data?.settings?.times?.find(x=>x.id===id);if(!x)return;
  for(const [key,val] of [['tm-time-id',x.id],['tm-time-task',x.task],['tm-time-day',x.day],['tm-time-level',x.level||'Semua'],
    ['tm-time-from',x.start],['tm-time-to',x.end],['tm-time-effective',x.from],['tm-time-expiry',x.to]])tm$(key).value=val||'';
  tm43SyncTimeForm();
  const mode=tm43SelectedType()?.mode||'TANPA_MASA';
  if(mode!=='TANPA_MASA')tm$('tm-time-from').value=x.start||'';
  if(mode==='JULAT')tm$('tm-time-to').value=x.end||'';
  tm$('tm-time-task').focus();}
async function tmChoose(id){tmState.weekId=id;await tmLoadDetail(false);tmTab('daily');}
async function tmSaveDaily(e){e.preventDefault();if(!tmState.detail?.plan)return tmNotice('Draf minggu belum disediakan.',true);
  const date=tm$('tm-day-date').value,section=tm$('tm-day-section').value,text=tm$('tm-day-text').value;
  const result=await tmRun(()=>tmAPI('saveDaily',{year:tmState.year,weekId:tmState.weekId,date,section,text}));
  if(result){await tmLoadDetail(false);tmNotice('Catatan anda berjaya disimpan.');}}
async function tmSaveWeekly(submit){
  const summary=tm$('tm-weekly-summary').value,followup=tm$('tm-weekly-followup').value;
  if(submit&&!confirm('Hantar laporan kepada Guru Besar? Laporan akan dikunci sehingga disemak atau dipulangkan.'))return;
  const result=await tmRun(()=>tmAPI('saveWeekly',{year:tmState.year,weekId:tmState.weekId,summary,followup,submit}));
  if(result){await tmLoadDetail(false);tmNotice(submit?'Laporan mingguan telah dihantar kepada Guru Besar.':'Draf ulasan disimpan.');}}
async function tmReview(decision){const note=tm$('tm-review-note').value;
  if(!confirm(decision==='DISEMAK'?'Tandakan laporan ini telah disemak?':'Pulangkan laporan kepada ketua untuk pembetulan?'))return;
  const r=await tmRun(()=>tmAPI('review',{year:tmState.year,weekId:tmState.weekId,decision,note}));
  if(r){await tmLoadDetail(false);tmNotice('Keputusan semakan telah disimpan.');}}
async function tmDraft(id){if(!confirm('Sediakan draf ketua bagi minggu ini? Ini tidak menjana atau menerbitkan tugasan harian.'))return;
  const r=await tmRun(()=>tmAPI('draft',{year:tmState.year,weekId:id}));
  if(r){tmNotice('Draf minggu disediakan. Agihan tugasan masih belum diterbitkan.');await tmBootstrap();}}
async function tmSeed(){if(!confirm('Tambah contoh 9 jenis tugasan dan 9 bahagian laporan? Rekod sedia ada tidak dipadam.'))return;
  const r=await tmRun(()=>tmAPI('seed'));if(r){tmNotice('Tetapan asas berjaya disediakan.');await tmBootstrap();tmTab('settings');}}
async function tmSaveTask(e){e.preventDefault();const payload={id:tm$('tm-task-id').value,name:tm$('tm-task-name').value,
  category:tm$('tm-task-category').value,weight:Number(tm$('tm-task-weight').value),min:Number(tm$('tm-task-min').value),
  hasTime:tm$('tm-task-time-required').value,from:tmState.year+'-01-01'};
  const r=await tmRun(()=>tmAPI('upsertTask',payload));if(r){tm$('tm-task-form').reset();tm$('tm-task-id').value='';tm$('tm-task-time-required').value='YA';tmNotice('Jenis tugasan disimpan.');await tmBootstrap();tmTab('settings');}}
async function tmSaveTime(e){e.preventDefault();const payload={id:tm$('tm-time-id').value,task:tm$('tm-time-task').value,
  day:tm$('tm-time-day').value,level:tm$('tm-time-level').value,start:tm$('tm-time-from').value,end:tm$('tm-time-to').value,
  from:tm$('tm-time-effective').value,to:tm$('tm-time-expiry').value};
  const r=await tmRun(()=>tmAPI('upsertWindow',payload));if(r){tm$('tm-time-form').reset();tm$('tm-time-id').value='';tmNotice('Waktu tugasan disimpan.');await tmBootstrap();tmTab('settings');}}
async function tmPreflight(){const r=await tmRun(()=>tmAPI('preflight',{year:tmState.year}));if(!r)return;
  tm$('tm-preflight-result').innerHTML=`<div class="tm-card"><h3>Semakan Kesediaan — ${tmEsc(r.status)}</h3><p>${r.rekodJadual} rekod jadual, ${r.ahli} pelantikan kumpulan, ${r.waktuTugas} tetapan waktu.</p>${(r.warnings||[]).map(x=>`<p class="tm-warning-line">${tmEsc(x)}</p>`).join('')}<strong>Agihan belum boleh diterbitkan.</strong></div>`;}
async function tmPreviewSimulation(){
  if(!tmManager())return tmNotice('Hanya pentadbir boleh melihat simulasi.',true);
  const r=await tmRun(()=>tmAPI('simPreview'));
  if(!r)return;
  const out=tm$('tm-sim-grid');
  const list=r.jadual||[];
  out.innerHTML=list.length?list.map(w=>`<article class="tm-week">
    <div class="tm-week-head"><h3>${tmEsc(w.Minggu)}</h3><span class="tm-tag">SIMULASI</span></div>
    <p>${tmEsc(w.Nama_Kumpulan)} · ${tmFmt(w.Tempoh_Mula)} – ${tmFmt(w.Tempoh_Tamat)}</p>
    <div class="tm-week-leader">Ketua dicadangkan: ${tmEsc(w.Nama_Ketua_Cadangan||'Belum ada pelantikan ahli')}</div>
    <p>${tmEsc(w.Bil_Ahli_Layak)} ahli · ${tmEsc(w.Nota)}</p>
    </article>`).join(''):'<p class="tm-empty">Tiada minggu simulasi. Jalankan FiTMSimBina8Minggu dalam Apps Script.</p>';
  tm$('tm-sim-warning').innerHTML=(r.amaran||[]).map(x=>`<p class="tm-warning-line">${tmEsc(x)}</p>`).join('');
}
function tmPrint(){
  const d=tmState.detail,w=tmSelected();if(!d?.plan)return tmNotice('Pilih minggu yang telah mempunyai draf dahulu.',true);
  const sections=Object.fromEntries((tmState.data?.settings?.sections||[]).map(x=>[x.id,x.name]));
  const names=tmNames();const days=(d.days||[]).sort((a,b)=>a.date.localeCompare(b.date));
  const notes=days.map(day=>`<section><h3>${tmEsc(day.day)} — ${tmFmt(day.date)}</h3>${(d.entries||[]).filter(x=>x.daily===day.id).map(n=>`<p><b>${tmEsc(sections[n.section]||n.section)}</b> (${tmEsc(names[n.author]||n.author)})</p><p>${tmEsc(n.text).replace(/\n/g,'<br>')}</p>`).join('')||'<p>Tiada catatan.</p>'}</section>`).join('');
  const html=`<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>Laporan Guru Bertugas — ${tmEsc(w?.Minggu)}</title><style>@page{size:A4;margin:16mm}body{font:12px/1.65 Arial,sans-serif;color:#222}h1{font-size:18px;margin-bottom:4px}h2{font-size:15px;border-bottom:2px solid #333;padding-bottom:4px}h3{font-size:13px;background:#f5f5f5;padding:7px;margin-top:22px}section{break-inside:avoid}p{white-space:normal;overflow-wrap:anywhere}.meta{border-bottom:1px solid #aaa;padding:10px 0;margin-bottom:16px}@media print{button{display:none}}</style></head><body>
  <h1>SK SEGAMBUT MAKMUR</h1><h2>LAPORAN GURU BERTUGAS MINGGUAN</h2>
  <div class="meta"><b>Sesi:</b> ${tmEsc(tmState.year)} &nbsp; <b>Minggu:</b> ${tmEsc(w?.Minggu||w?.ID_Minggu)} &nbsp; <b>Kumpulan:</b> ${tmEsc(w?.Nama_Kumpulan)}<br>
  <b>Tarikh:</b> ${tmFmt(w?.Tempoh_Mula)} – ${tmFmt(w?.Tempoh_Tamat)}<br><b>Ketua:</b> ${tmEsc(names[d.plan.leader]||d.plan.leader)} &nbsp; <b>Status:</b> ${tmEsc(d.weekly?.status||'DRAF')}</div>
  <h2>1. Laporan Harian</h2>${notes||'<p>Belum ada laporan harian.</p>'}
  <h2>2. Ulasan Keseluruhan Ketua</h2><p>${tmEsc(d.weekly?.summary||'Belum diisi.').replace(/\n/g,'<br>')}</p>
  <h2>3. Cadangan Penambahbaikan</h2><p>${tmEsc(d.weekly?.followup||'—').replace(/\n/g,'<br>')}</p>
  <h2>4. Semakan Guru Besar</h2><p>${tmEsc(d.weekly?.review||'Belum disemak.').replace(/\n/g,'<br>')}</p>
  <br><br><p>Disediakan oleh (Ketua Guru Bertugas): ______________________________</p><p>Disemak oleh (Guru Besar): ______________________________</p>
  <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350))<\/script></body></html>`;
  const printWindow=window.open('','_blank');
  if(printWindow)printWindow.opener=null;
  if(!printWindow){tmNotice('Tetingkap cetakan disekat. Benarkan pop-up untuk portal.',true);return;}
  printWindow.document.open();printWindow.document.write(html);printWindow.document.close();
}

// V4: simulation & safety-gated duty scheduler. Existing daily/weekly reports unchanged.
const tm4GetMode=()=>tm$('tm4-mode').value;
const tm4Input=()=>({mode:tm4GetMode(),weekId:tm$('tm4-week').value,asOf:tm$('tm4-asof').value,year:tmState.year});
function tm4Message(message,bad=false){
  const box=tm$('tm4-status');box.textContent=message||'';box.classList.toggle('tm4-error',bad);
}
async function tm4LoadWeeks(loadSchedule=true){
  if(!tmManager())return;
  const mode=tm4GetMode(),sel=tm$('tm4-week'),old=sel.value;
  let weeks=[];
  if(mode==='SIMULASI'){
    const data=await tmRun(()=>tmAPI('tm4SimList'));
    if(!data)return;
    weeks=(data.weeks||[]).map(w=>({id:w.id,label:w.label,from:w.from,to:w.to,group:w.group}));
  }else{
    weeks=(tmState.data?.weeks||[]).map(w=>({id:w.ID_Minggu,label:w.Minggu||w.ID_Minggu,from:w.Tempoh_Mula,to:w.Tempoh_Tamat,group:w.ID_Kumpulan}));
  }
  sel.innerHTML='<option value="">Pilih minggu…</option>'+weeks.map(w=>`<option value="${tmEsc(w.id)}">${tmEsc(w.label)} · ${tmFmt(w.from)} · Kumpulan ${tmEsc(w.group)}</option>`).join('');
  if(weeks.some(w=>w.id===old))sel.value=old;
  else if(weeks.length)sel.value=weeks[0].id;
  tm$('tm4-asof').disabled=mode!=='SIMULASI';
  tm$('tm4-absence-form').querySelectorAll('input,select,button').forEach(x=>x.disabled=mode!=='SIMULASI');
  tm$('tm47-sim-section').hidden=mode!=='SIMULASI';
  tm$('tm4-mode-badge').textContent=mode==='SIMULASI'?'UJIAN TERASING':'DATA RASMI';
  tm4Message(mode==='SIMULASI'?'Semua rekod ujian berasingan daripada Takwim_Minggu rasmi.':'Mod rasmi menggunakan masa pelayan semasa. Pastikan takwim, hari sekolah dan penyegerakan keberadaan disahkan.');
  if(loadSchedule&&sel.value)await tm4LoadSchedule();
}
function tm43TimeLabel(x){
  if(x.mode==='TANPA_MASA')return 'Tiada tetapan masa';
  if(x.mode==='MULA_SAHAJA')return x.from||'Masa belum ditetapkan';
  return (x.from||'—')+'–'+(x.to||'—');
}
function tm43DayCards(rows,week){
  if(!rows.length)return '<p class="tm-empty">Belum ada jadual. Isi Jenis Tugasan dan tetapan hari dahulu, kemudian klik Jana Jadual Bertugas.</p>';
  const order=['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
  const closedStatuses=new Set(['DIGANTI','DIBATALKAN_CUTI','DIBATALKAN']);
  const pendingStatus='PERLU_TINDAKAN';
  const grouped=new Map();
  rows.slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||
    (a.mode==='TANPA_MASA'?1:0)-(b.mode==='TANPA_MASA'?1:0)||
    String(a.from||'').localeCompare(String(b.from||''))||
    String(a.taskName||'').localeCompare(String(b.taskName||'')))
    .forEach(x=>{if(!grouped.has(x.date))grouped.set(x.date,[]);grouped.get(x.date).push(x);});
  // Tetap paparkan semua hari persekolahan minggu ini, termasuk hari yang tiada tugas.
  if(week?.from&&week?.to){
    for(let d=new Date(week.from+'T00:00:00Z'),stop=new Date(week.to+'T00:00:00Z');d<=stop;d.setUTCDate(d.getUTCDate()+1)){
      if(d.getUTCDay()===0||d.getUTCDay()===6)continue;
      const iso=d.toISOString().slice(0,10);
      if(!grouped.has(iso))grouped.set(iso,[]);
    }
  }
  return [...grouped].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,list])=>{
    const day=list[0]?.day||order[new Date(date+'T00:00:00Z').getUTCDay()]||'Hari';
    const weekLabel=week?.label||week?.id||'—';
    const active=list.filter(x=>!closedStatuses.has(x.status)&&x.status!==pendingStatus);
    const pending=list.filter(x=>x.status===pendingStatus);
    const history=list.filter(x=>closedStatuses.has(x.status));
    // Gabungkan dua guru Rehat Tahap 1/2 di bawah SATU nama tugasan.
    // Simpan nama penuh: papar tanpa masa, beban dan maklumat teknikal.
    const dutyGroups=new Map();
    for(const x of [...active,...pending]){
      const title=String(x.taskName||'Tugasan belum dinamakan').trim();
      const key=title.toLocaleLowerCase('ms-MY');
      if(!dutyGroups.has(key))dutyGroups.set(key,{title,teachers:[]});
      dutyGroups.get(key).teachers.push({name:x.status===pendingStatus?'Belum ditetapkan — Perlu Tindakan':x.name||'Belum ditetapkan',pending:x.status===pendingStatus});
    }
    const duties=[...dutyGroups.values()].map(g=>`<div class="tm45-duty">
      <div class="tm45-task">${tmEsc(g.title)}</div>
      <div class="tm45-names">${g.teachers.map((t,i)=>`<span class="tm45-teacher${t.pending?' tm45-needs-action':''}">${tmEsc(t.name)}${i<g.teachers.length-1?' ; ':''}</span>`).join('')}</div>
    </div>`).join('')||'<p class="tm43-no-duty">Tiada tugasan dijana pada hari ini. Semak sama ada hari cuti atau tetapan hari.</p>';
    // Sejarah tidak dibuang; disimpan dalam panel yang tertutup secara lalai.
    const oldRecords=history.length?`<details class="tm45-history"><summary>Sejarah perubahan (${history.length})</summary>
      ${history.map(x=>`<div class="tm45-history-row"><span>${tmEsc(x.taskName||'Tugasan')}</span><span>${tmEsc(x.name||'—')} · ${tmEsc(x.status)}</span></div>`).join('')}
    </details>`:'';
    return `<section class="tm43-day tm45-day"><header class="tm43-day-head"><div><h3>${tmEsc(day)} <span>· ${tmFmt(date)}</span></h3><p>${tmEsc(weekLabel)}</p></div><span class="tm-tag">${active.length} tugas aktif</span></header>
      <div class="tm45-duty-head"><span>Tugasan</span><span>Guru Bertugas</span></div>${duties}${oldRecords}</section>`;
  }).join('');
}
function tm4Render(schedule){
  tmState.tm4=schedule;
  const rows=schedule?.assignments||[],members=schedule?.week?.members||[];
  const oldTeacher=tm$('tm4-teacher').value;
  tm$('tm4-teacher').innerHTML='<option value="">Pilih guru bertugas…</option>'+members.map(t=>`<option value="${tmEsc(t.id)}">${tmEsc(t.name)}</option>`).join('');
  if(members.some(m=>m.id===oldTeacher))tm$('tm4-teacher').value=oldTeacher;
  const w=schedule?.week;
  if(w){
    for(const id of ['tm4-absence-from','tm4-absence-to','tm4-cal-date']){
      const el=tm$(id);if(!el.value||el.value<w.from||el.value>w.to)el.value=w.from;
      el.min=w.from;el.max=w.to;
    }
  }
  tm$('tm4-total').textContent=rows.filter(x=>!['DIGANTI','DIBATALKAN_CUTI','DIBATALKAN','PERLU_TINDAKAN'].includes(x.status)).length+' tugasan aktif';
  tm$('tm4-rows').innerHTML=tm43DayCards(rows,w);
  const fair=schedule?.fairness||{},names=Object.fromEntries(members.map(m=>[m.id,m.name]));
  tm$('tm4-fairness').innerHTML=Object.keys(fair).length?Object.entries(fair)
    .sort((a,b)=>Number(a[1].weight)-Number(b[1].weight))
    .map(([id,v])=>`<div class="tm4-fair"><span>${tmEsc(names[id]||id)}</span><strong>${Number(v.weight)||0} mata</strong><small>Rehat: ${v.rest||0} · Tugas Pagi: ${v.morning||0} · Berat: ${v.heavy||0} · Ringan: ${v.light||0} · Jumlah: ${v.all||0}</small></div>`).join(''):
    '<p class="tm-empty">Keadilan boleh dilihat selepas jadual dijana.</p>';
  tm$('tm4-warning').innerHTML=(w?.warnings||[]).map(x=>`<p class="tm-warning-line">${tmEsc(x)}</p>`).join('')+
    (schedule?.alerts||[]).map(x=>`<p class="tm-warning-line"><strong>PERLU TINDAKAN:</strong> ${tmEsc(x.date)} ${tmEsc(x.from)}–${tmEsc(x.to)} ${tmEsc(x.task)} — ${tmEsc(x.reason)}</p>`).join('')+
    (schedule?.doubleConflicts||[]).map(x=>`<p class="tm-warning-line"><strong>TUGAS BERGANDA TIDAK SERASI:</strong> ${tmEsc(x.date)} · ${tmEsc(x.staff)} · ${tmEsc(x.task)} — ${tmEsc(x.reason)}</p>`).join('')+
    (schedule?.frequencyWarnings||[]).map(x=>`<p class="tm-warning-line"><strong>SEMAKAN GILIRAN:</strong> ${tmEsc(x)}</p>`).join('');
  tmState.audit=null;
  tm$('tm47-audit-result').innerHTML='<p class="tm-empty">Klik Semak Statistik & Konflik PdPc untuk mengaudit jadual ini.</p>';
  tm4Message(`Status pelan: ${schedule?.status||'BELUM_JANA'}. Rujukan masa: ${schedule?.asOf||'—'}.`);
  if(tm4GetMode()==='SIMULASI')tm47LoadAbsences();
}
async function tm4LoadSchedule(){
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  const r=await tmRun(()=>tmAPI('tm4Schedule',args));if(r)tm4Render(r);
}
async function tm4Generate(){
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  if(!confirm(args.mode==='SIMULASI'?'Jana jadual ujian untuk minggu ini? Tetapan jenis dan waktu tugasan mesti sudah diisi.':'Jana jadual RASMI? Hanya waktu akan datang disediakan, dan hari sekolah mesti disahkan.'))return;
  const r=await tmRun(()=>tmAPI('tm4Generate',args));if(!r)return;
  tm4Render(r.schedule);
  tm4Message(`Jana: ${r.bilJana||0} tugasan. ${r.bilKosong||0} slot belum dapat diisi.`);
  if(r.unfilled?.length)tm$('tm4-warning').innerHTML=r.unfilled.map(u=>`<p class="tm-warning-line">${tmEsc(u.date)} ${tmEsc(u.from)} ${tmEsc(u.task)}: Tiada calon bebas.</p>`).join('');
}
async function tm4Repair(){
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  const r=await tmRun(()=>tmAPI('tm4Repair',args));if(!r)return;
  tm4Render(r.schedule);
  tm4Message(`${r.bilGanti||0} guru diganti. ${r.bilBelumSelesai||0} slot memerlukan tindakan pentadbir. Tugasan lampau kekal.`);
  if(r.pending?.length)tm$('tm4-warning').innerHTML=r.pending.map(u=>`<p class="tm-warning-line">BELUM DIGANTI: ${tmEsc(u.date)} ${tmEsc(u.from)} ${tmEsc(u.task)}</p>`).join('');
}
/** V4.6: only future dates of an unpublished draft can be reassigned. */
async function tm46Rebalance(){
  const args=tm4Input();
  if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  if(!tmState.tm4?.planId)return tm4Message('Jana jadual dahulu sebelum mengimbangkan draf.',true);
  const note=args.mode==='SIMULASI'
    ?'Imbang semula jadual SIMULASI bagi hari selepas tarikh rujukan? Rekod asal kekal sebagai DIGANTI. Untuk keseluruhan Minggu 2, pilih masa rujukan 22/11/2026 sebelum minggu bermula.'
    :'Imbang semula DRAF RASMI yang belum diterbitkan? Hanya hari selepas hari ini akan diubah; rekod terdahulu kekal.';
  if(!confirm(note))return;
  const r=await tmRun(()=>tmAPI('tm46Rebalance',args));
  if(!r)return;
  if(r.schedule)tm4Render(r.schedule);
  tm4Message((r.status==='TIADA_PERUBAHAN'?'Tiada perubahan diperlukan. ':'Draf telah diimbangkan semula. ')+
    (r.bilBerubah||0)+' tugasan dipinda. Hari semasa dan lampau dikunci.');
}
async function tm4Publish(){
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  if(!confirm(args.mode==='SIMULASI'?'Terbitkan jadual SIMULASI sahaja? Tidak akan dihantar kepada GB.':'Terbitkan jadual RASMI? Pastikan semua tugasan telah disemak.'))return;
  const r=await tmRun(()=>tmAPI('tm4Publish',args));if(r){tm4Render(r.schedule);tm4Message('Jadual berjaya diterbitkan: '+r.status);}
}
async function tm4RecordAbsence(e){
  e.preventDefault();if(tm4GetMode()!=='SIMULASI')return tm4Message('Borang ini untuk simulasi sahaja.',true);
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu terlebih dahulu.',true);
  const more={staff:tm$('tm4-teacher').value,from:tm$('tm4-absence-from').value,to:tm$('tm4-absence-to').value,
    start:tm$('tm4-absence-start').value,end:tm$('tm4-absence-end').value,reason:tm$('tm4-absence-reason').value,
    location:tm$('tm4-absence-location').value,stage:tm$('tm4-absence-stage').value,note:tm$('tm4-absence-note').value};
  if(!more.staff)return tm4Message('Pilih nama guru untuk ujian.',true);
  const r=await tmRun(()=>tmAPI('tm47AbsenceSave',{...args,...more}));if(!r)return;
  await tm47LoadAbsences();
  tm4Message(r.eligible?'Keberadaan di sekolah direkod; guru masih boleh diagihkan.':
    (tmState.tm4?.planId?'Ketiadaan direkod. Klik Semak & Ganti untuk membetulkan tugasan masa hadapan.':
     'Ketiadaan dirancang disimpan. Jana jadual selepas menyemak senarai ini; guru tersebut akan dikecualikan.'));
}
async function tm4Calendar(e){
  e.preventDefault();const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  const more={date:tm$('tm4-cal-date').value,kind:tm$('tm4-cal-kind').value,note:tm$('tm4-cal-note').value};
  if(args.mode==='RASMI'&&!confirm('Sahkan jenis hari RASMI untuk tarikh '+more.date+'?'))return;
  const r=await tmRun(()=>tmAPI('tm4SetCalendar',{...args,...more}));if(r)tm4Message('Tarikh '+tmFmt(more.date)+' ditetapkan '+r.kind+'. Tetapkan sebelum jana jadual; perubahan selepas penjanaan memerlukan semakan manual.');
}

async function tm47LoadAbsences(){
  const root=tm$('tm47-absence-list');if(!root||tm4GetMode()!=='SIMULASI')return;
  const args=tm4Input();if(!args.weekId){root.innerHTML='<p class="tm-muted">Pilih minggu simulasi dahulu.</p>';return;}
  try{
    const result=await tmAPI('tm47AbsenceList',args),people=Object.fromEntries((tmState.tm4?.week?.members||[]).map(x=>[x.id,x.name]));
    const rows=result?.entries||[];
    root.innerHTML='<h3 class="tm47-subhead">Senarai Keberadaan Minggu Ini ('+rows.filter(x=>x.status==='AKTIF').length+' aktif)</h3>'+
      (rows.length?rows.map(x=>`<div class="tm47-absence-item ${x.status!=='AKTIF'?'is-cancelled':''}">
        <div><strong>${tmEsc(people[x.staff]||x.staff)}</strong><small>${tmFmt(x.from)} – ${tmFmt(x.to)} · ${tmEsc(x.category)} · ${x.onCampus?'Di sekolah (LAYAK)':'Luar sekolah (TIDAK LAYAK)'} · ${tmEsc(x.stage)} ${x.status!=='AKTIF'?'· BATAL':''}</small></div>
        ${x.status==='AKTIF'?`<button type="button" class="tm-btn tm-ghost" data-tm47-cancel="${tmEsc(x.id)}">Batalkan</button>`:''}</div>`).join(''):'<p class="tm-muted">Belum ada keberadaan simulasi. Cikgu boleh rekod lebih awal sebelum menjana jadual.</p>');
  }catch(e){root.innerHTML='<p class="tm-warning-line">Senarai keberadaan gagal dibaca: '+tmEsc(e.message||e)+'</p>';}
}
async function tm47CancelAbsence(id){
  if(!id||!confirm('Batalkan rekod keberadaan ujian ini? Rekod sejarah disimpan. Jika jadual sudah dijana, jalankan Semak & Ganti.'))return;
  const args=tm4Input(),r=await tmRun(()=>tmAPI('tm47AbsenceCancel',{...args,id}));
  if(r){tm4Message('Keberadaan dibatalkan. Jika jadual sudah dijana, klik Semak & Ganti untuk menilai semula slot masa hadapan.');await tm47LoadAbsences();}
}
function tm47RenderAudit(a){
  const root=tm$('tm47-audit-result'),s=a.summary||{};
  const fields=[['Tugas Aktif',s.active],['Guru',s.teachers],['Rehat T1 / T2',`${s.rest1} / ${s.rest2}`],
    ['Semakan PdPc',s.checked],['Konflik PdPc',s.pdpcConflicts],['Slot Rehat Kurang Guru',s.restShortages]];
  const summary=`<div class="tm47-metrics">${fields.map(([k,v])=>`<div><span>${tmEsc(k)}</span><strong>${tmEsc(v??0)}</strong></div>`).join('')}</div>`;
  const personRows=(a.people||[]).map(x=>`<tr><td>${tmEsc(x.name)}</td><td>${x.total}</td><td>${x.rest1}</td><td>${x.rest2}</td><td>${x.rest}</td><td>${x.morning}</td><td>${x.heavy}</td><td>${x.light}</td><td>${x.weight}</td><td>${tmEsc(x.repeats||'—')}</td></tr>`).join('');
  const table=`<h3 class="tm47-subhead">Keadilan dan Kekerapan Jenis Tugas</h3><div class="tm-table-scroll"><table class="tm47-table"><thead><tr><th>Guru</th><th>Jumlah</th><th>Rehat T1</th><th>Rehat T2</th><th>Rehat</th><th>Pagi</th><th>Berat</th><th>Ringan</th><th>Mata</th><th>Ulangan Pagi</th></tr></thead><tbody>${personRows}</tbody></table></div>`;
  const rest=(a.restByDay||[]).map(x=>`<tr><td>${tmEsc(x.day)} · ${tmFmt(x.date)}</td><td>${x.t1}/${x.need1}</td><td>${x.t2}/${x.need2}</td><td>${x.ok?'Cukup':'PERLU TINDAKAN'}</td></tr>`).join('');
  const restTable=`<h3 class="tm47-subhead">Bilangan Petugas Waktu Rehat Mengikut Hari</h3><div class="tm-table-scroll"><table class="tm47-table"><thead><tr><th>Hari / Tarikh</th><th>Tahap 1</th><th>Tahap 2</th><th>Status</th></tr></thead><tbody>${rest}</tbody></table></div>`;
  const checks=(a.timedChecks||[]).map(x=>`<tr class="${x.status==='KONFLIK'?'tm47-clash':''}"><td>${tmEsc(x.day)}<small>${tmFmt(x.date)}</small></td><td>${tmEsc(x.task)}</td><td>${tmEsc(x.name)}</td><td>${tmEsc(x.expected)}</td><td><strong>${x.status==='KONFLIK'?'KELAS / KONFLIK':'Tiada Kelas'}</strong>${x.conflicts?.length?'<small>'+x.conflicts.map(v=>tmEsc(`${v.period} ${v.level} · ${v.className} (${v.from}–${v.to})`)).join('; ')+'</small>':''}</td></tr>`).join('');
  const cross=`<h3 class="tm47-subhead">Audit Silang W5 / Rehat / Pulang × Jadual PdPc</h3><div class="tm-table-scroll"><table class="tm47-table"><thead><tr><th>Hari</th><th>Tugasan</th><th>Guru</th><th>Semakan</th><th>Keputusan PdPc</th></tr></thead><tbody>${checks}</tbody></table></div>`;
  const warnings=(a.warnings||[]).map(w=>`<p class="tm-warning-line">${tmEsc(w)}</p>`).join('');
  root.innerHTML=summary+restTable+table+cross+warnings;
}
async function tm47Audit(){
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  const result=await tmRun(()=>tmAPI('tm47Audit',args));if(!result)return;
  tmState.audit=result;tm47RenderAudit(result);
  tm4Message(`Audit siap: ${result.summary.checked} tugasan bermasa disemak · ${result.summary.pdpcConflicts} konflik PdPc · ${result.summary.restShortages} sesi rehat kurang petugas.`);
}

function tmListeners(){
  document.addEventListener('click',async e=>{
    const tab=e.target.closest('[data-tm-tab]');if(tab){tmTab(tab.dataset.tmTab);return;}
    const choose=e.target.closest('[data-tm-choose]');if(choose){await tmChoose(choose.dataset.tmChoose);return;}
    const draft=e.target.closest('[data-tm-draft]');if(draft){await tmDraft(draft.dataset.tmDraft);return;}
    const edTask=e.target.closest('[data-edit-task]');if(edTask){tmEditTask(edTask.dataset.editTask);return;}
    const edTime=e.target.closest('[data-edit-time]');if(edTime){tmEditTime(edTime.dataset.editTime);return;}
    const cancel=e.target.closest('[data-tm47-cancel]');if(cancel){await tm47CancelAbsence(cancel.dataset.tm47Cancel);return;}
  });
  tm$('tm-year').addEventListener('change',async()=>{tmState.year=tm$('tm-year').value;tmState.weekId='';await tmBootstrap();});
  tm$('tm-refresh').addEventListener('click',tmBootstrap);
  tm$('tm-day-date').addEventListener('change',tmRenderSections);
  tm$('tm-day-section').addEventListener('change',tmRestoreOwnEntry);
  tm$('tm-daily-form').addEventListener('submit',tmSaveDaily);
  tm$('tm-weekly-form').addEventListener('submit',e=>{e.preventDefault();tmSaveWeekly(true);});
  tm$('tm-weekly-draft').addEventListener('click',()=>tmSaveWeekly(false));
  tm$('tm-review-accept').addEventListener('click',()=>tmReview('DISEMAK'));
  tm$('tm-review-return').addEventListener('click',()=>tmReview('DIPULANGKAN'));
  tm$('tm-print').addEventListener('click',tmPrint);
  tm$('tm-preflight').addEventListener('click',tmPreflight);
  tm$('tm-sim-preview').addEventListener('click',tmPreviewSimulation);
  tm$('tm-seed').addEventListener('click',tmSeed);
  tm$('tm4-mode').addEventListener('change',()=>tm4LoadWeeks(true));
  tm$('tm4-week').addEventListener('change',()=>{tm4LoadSchedule();});
  tm$('tm4-load').addEventListener('click',tm4LoadSchedule);
  tm$('tm4-generate').addEventListener('click',tm4Generate);
  tm$('tm4-repair').addEventListener('click',tm4Repair);
  tm$('tm4-rebalance').addEventListener('click',tm46Rebalance);
  tm$('tm4-publish').addEventListener('click',tm4Publish);
  tm$('tm4-absence-form').addEventListener('submit',tm4RecordAbsence);
  tm$('tm4-calendar-form').addEventListener('submit',tm4Calendar);
  tm$('tm47-audit').addEventListener('click',tm47Audit);
  tm$('tm4-absence-reason').addEventListener('change',()=>{const v=tm$('tm4-absence-reason').value; if(v==='URUSAN_RASMI_DALAM')tm$('tm4-absence-location').value='DALAM_SEKOLAH';else if(['URUSAN_RASMI_LUAR','CRK','CTR','MC','KECEMASAN'].includes(v))tm$('tm4-absence-location').value='LUAR_SEKOLAH';});
  tm$('tm-task-form').addEventListener('submit',tmSaveTask);
  tm$('tm-task-name').addEventListener('change',tm43UpdateTaskMode);
  tm$('tm-time-task').addEventListener('change',tm43SyncTimeForm);
  tm$('tm-time-form').addEventListener('submit',tmSaveTime);
  tm$('tm-task-cancel').addEventListener('click',()=>{tm$('tm-task-form').reset();tm$('tm-task-id').value='';tm$('tm-task-time-required').value='YA';});
  tm$('tm-time-cancel').addEventListener('click',()=>{tm$('tm-time-form').reset();tm$('tm-time-id').value='';tm43SyncTimeForm();});
  tm$('tm-time-effective').value=tmState.year+'-01-01';tm43SyncTimeForm();
}
async function tmInit(){tmListeners();tmTab('overview');tmNotice('Menyemak akaun Google MOE dan peranan…');
  try{
    const cfg=window.SeMAKMURFirebasePilotConfig;if(!cfg?.projectId)throw Error('Konfigurasi Firebase belum tersedia.');
    const [appMod,authMod]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')]);
    const fb=appMod.getApps().find(x=>x.name==='semakmur-fi-dashboard')||appMod.initializeApp(cfg,'semakmur-fi-dashboard');
    tmState.auth=authMod.getAuth(fb);
    authMod.onAuthStateChanged(tmState.auth,async user=>{
      tmState.user=user;
      if(!user){tmNotice('Akaun belum log masuk. Sila kembali ke Fi-LoginSession melalui Dashboard Guru.',true);tmSignal('semakmur-tm-error');return;}
      await tmBootstrap();
    },err=>{tmNotice('Firebase Authentication gagal: '+(err.message||err),true);tmSignal('semakmur-tm-error');});
  }catch(e){tmNotice('Sambungan modul gagal: '+(e.message||String(e)),true);tmSignal('semakmur-tm-error');}
}
tmInit();
