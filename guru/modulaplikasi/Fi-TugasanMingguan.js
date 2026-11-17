/* SeMAKMUR Smart Tugasan Mingguan V3.0 · Fi-Sync integrated frontend.
   Strictly authenticated POST; never write directly to Sheets or Firestore. */
'use strict';
const tm$=id=>document.getElementById(id);
const tmEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tmFmt=d=>{if(!/^\d{4}-\d\d-\d\d$/.test(String(d||'')))return String(d||'—');const [y,m,dd]=d.split('-');return `${dd}/${m}/${y}`;};
const tmToday=()=>{const v=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const parts=Object.fromEntries(v.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${parts.year}-${parts.month}-${parts.day}`;};
const tmState={auth:null,user:null,data:null,detail:null,year:'2026',weekId:'',tab:'overview',busy:false};
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
  tmState.data=result;tm$('tm-user').textContent=result.actor?.name||tmState.user?.email||'Guru';tm$('tm-tab-settings').hidden=!result.actor?.manager;tm$('tm-preflight').hidden=!result.actor?.manager;
  const weeks=result.weeks||[];
  if(!weeks.some(x=>x.ID_Minggu===tmState.weekId)){
    const today=tmToday();tmState.weekId=(weeks.find(x=>x.Tempoh_Mula<=today&&today<=x.Tempoh_Tamat)||weeks[0])?.ID_Minggu||'';
  }
  tmRenderOverview();tmRenderSettings();tmSignal('semakmur-tm-ready');
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
function tmRenderSettings(){
  const types=tmState.data?.settings?.types||[],times=tmState.data?.settings?.times||[];
  const names=Object.fromEntries(types.map(x=>[x.id,x.name]));
  tm$('tm-task-list').innerHTML='<div class="tm-mini-list">'+(types.length?types.map(x=>`<div class="tm-mini"><div><strong>${tmEsc(x.name)}</strong><small>${tmEsc(x.category)} · Mata ${tmEsc(x.weight)}</small></div><button class="tm-btn tm-ghost" data-edit-task="${tmEsc(x.id)}">Edit</button></div>`).join(''):'<p class="tm-empty">Belum ada jenis tugasan.</p>')+'</div>';
  const old=tm$('tm-time-task').value;
  tm$('tm-time-task').innerHTML='<option value="">Pilih tugasan…</option>'+types.filter(x=>x.status.toUpperCase()==='AKTIF').map(x=>`<option value="${tmEsc(x.id)}">${tmEsc(x.name)}</option>`).join('');
  if(types.some(x=>x.id===old))tm$('tm-time-task').value=old;
  tm$('tm-time-list').innerHTML='<div class="tm-mini-list">'+(times.length?times.map(x=>`<div class="tm-mini"><div><strong>${tmEsc(names[x.task]||x.task)}</strong><small>${tmEsc(x.day)} ${tmEsc(x.start)}–${tmEsc(x.end)} · ${tmEsc(x.count)} guru · ${tmFmt(x.from)}</small></div><button class="tm-btn tm-ghost" data-edit-time="${tmEsc(x.id)}">Edit</button></div>`).join(''):'<p class="tm-empty">Tiada waktu tugasan. Sediakan sebelum semak agihan.</p>')+'</div>';
}
function tmEditTask(id){const x=tmState.data?.settings?.types?.find(x=>x.id===id);if(!x)return;
  tm$('tm-task-id').value=x.id;tm$('tm-task-name').value=x.name;tm$('tm-task-category').value=x.category;tm$('tm-task-weight').value=x.weight;tm$('tm-task-min').value=x.min;
  tm$('tm-task-name').focus();}
function tmEditTime(id){const x=tmState.data?.settings?.times?.find(x=>x.id===id);if(!x)return;
  for(const [id,val] of [['tm-time-id',x.id],['tm-time-task',x.task],['tm-time-day',x.day],['tm-time-level',x.level],['tm-time-from',x.start],['tm-time-to',x.end],['tm-time-effective',x.from],['tm-time-expiry',x.to],['tm-time-count',x.count]])tm$(id).value=val||'';
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
  category:tm$('tm-task-category').value,weight:Number(tm$('tm-task-weight').value),min:Number(tm$('tm-task-min').value)};
  const r=await tmRun(()=>tmAPI('upsertTask',payload));if(r){tm$('tm-task-form').reset();tm$('tm-task-id').value='';tmNotice('Jenis tugasan disimpan.');await tmBootstrap();tmTab('settings');}}
async function tmSaveTime(e){e.preventDefault();const payload={id:tm$('tm-time-id').value,task:tm$('tm-time-task').value,
  day:tm$('tm-time-day').value,level:tm$('tm-time-level').value,start:tm$('tm-time-from').value,end:tm$('tm-time-to').value,
  from:tm$('tm-time-effective').value,to:tm$('tm-time-expiry').value,count:Number(tm$('tm-time-count').value)};
  const r=await tmRun(()=>tmAPI('upsertWindow',payload));if(r){tm$('tm-time-form').reset();tm$('tm-time-id').value='';tmNotice('Waktu tugasan disimpan.');await tmBootstrap();tmTab('settings');}}
async function tmPreflight(){const r=await tmRun(()=>tmAPI('preflight',{year:tmState.year}));if(!r)return;
  tm$('tm-preflight-result').innerHTML=`<div class="tm-card"><h3>Semakan Kesediaan — ${tmEsc(r.status)}</h3><p>${r.rekodJadual} rekod jadual, ${r.ahli} pelantikan kumpulan, ${r.waktuTugas} tetapan waktu.</p>${(r.warnings||[]).map(x=>`<p class="tm-warning-line">${tmEsc(x)}</p>`).join('')}<strong>Agihan belum boleh diterbitkan.</strong></div>`;}
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
function tmListeners(){
  document.addEventListener('click',async e=>{
    const tab=e.target.closest('[data-tm-tab]');if(tab){tmTab(tab.dataset.tmTab);return;}
    const choose=e.target.closest('[data-tm-choose]');if(choose){await tmChoose(choose.dataset.tmChoose);return;}
    const draft=e.target.closest('[data-tm-draft]');if(draft){await tmDraft(draft.dataset.tmDraft);return;}
    const edTask=e.target.closest('[data-edit-task]');if(edTask){tmEditTask(edTask.dataset.editTask);return;}
    const edTime=e.target.closest('[data-edit-time]');if(edTime){tmEditTime(edTime.dataset.editTime);return;}
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
  tm$('tm-seed').addEventListener('click',tmSeed);
  tm$('tm-task-form').addEventListener('submit',tmSaveTask);
  tm$('tm-time-form').addEventListener('submit',tmSaveTime);
  tm$('tm-task-cancel').addEventListener('click',()=>{tm$('tm-task-form').reset();tm$('tm-task-id').value='';});
  tm$('tm-time-cancel').addEventListener('click',()=>{tm$('tm-time-form').reset();tm$('tm-time-id').value='';});
  tm$('tm-time-effective').value=tmState.year+'-01-01';
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
