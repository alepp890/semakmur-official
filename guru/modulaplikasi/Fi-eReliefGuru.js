/* ===== MERGED: Fi-eReliefGuru.js ===== */
'use strict';
/* SeMAKMUR Smart e-Relief V5.5 — menggunakan Firebase login Fi; tiada data palsu. */
const $=id=>document.getElementById(id),esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateMY=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let user=null,auth=null,db=null,roles=[],stop=null,rows=[],report=null,staff=[],fns=null,day='',schedulePublished=false,staffLoading=false;

// V5.5.2: Sambungan Makmal Admin kepada sesi Firebase sah modul yang sama.
// Makmal V53.js sebelum ini memanggil SeMAKMURReliefStudioBridge,
// tetapi tiada kod yang mencipta objek tersebut. JANGAN bypass pengesahan server.
let fiStudioMarkAuthReady;
let fiStudioRosterPromise=null;
const fiStudioRosterCopy=()=>staff.map(x=>({id:x.id,name:x.name,category:x.category}));
const fiStudioAuthReady = new Promise(resolve=>{fiStudioMarkAuthReady=resolve;});
function fiStudioSettleAuth(){if(fiStudioMarkAuthReady){fiStudioMarkAuthReady();fiStudioMarkAuthReady=null;}}
function fiStudioIsAdmin(){return !!(user?.uid && auth?.currentUser?.uid===user.uid && Array.isArray(roles) && roles.includes('ADMIN_SISTEM'));}
window.SeMAKMURReliefStudioBridge=Object.freeze({
  ready:()=>fiStudioAuthReady,
  isAdmin:fiStudioIsAdmin,
  status:()=>({signedIn:!!auth?.currentUser,profileReady:!!user?.uid,isAdmin:fiStudioIsAdmin()}),
  api:(action,payload={})=>{
    if(!fiStudioIsAdmin())throw Error('Akses Makmal Admin memerlukan ADMIN_SISTEM yang telah disahkan.');
    return api(action,payload); // Firebase ID token dikirim oleh api(); backend kekal menyemak peranan.
  },
  begin:()=>()=>{},
  staff:()=>fiStudioIsAdmin()?fiStudioRosterCopy():[],
  loadStaff:async()=>{
    if(!fiStudioIsAdmin())throw Error('Sesi ADMIN_SISTEM belum disahkan.');
    const list=await loadStaff();
    if(!list.length)throw Error('Senarai guru Firestore belum berjaya dimuatkan. Semak status senarai guru pada Makmal.');
    return list;
  }
});

// PWA shell sahaja: notifikasi keadaan sedia/ralat kepada Dashboard; tidak mengubah agihan.
function fiReliefShellSignal(type,message=''){
 if(new URLSearchParams(location.search).get('embed')!=='1'||window.parent===window)return;
 window.parent.postMessage({type:'semakmur-fi-relief-'+type,message},location.origin);
}
function warn(text,error=false){const el=$('message');el.hidden=!text;el.textContent=text||'';el.classList.toggle('error',error);}
function metrics(data){return data.map(x=>`<div class="metric"><strong>${esc(x[0])}</strong><span>${esc(x[1])}</span></div>`).join('');}
function badge(status){const s=String(status||''),warning=/TIADA|PERLU/.test(s),critical=/BATAL/.test(s);return `<span class="pill ${critical?'critical':warning?'warn':''}">${esc(s)}</span>`;}
function shortSlot(x){const m=String(x||'').match(/SLOT[-_]0*(\d+)$/i);return m?'W'+Number(m[1]):String(x||'');}
function listTable(r,own=false){if(!r.length)return '<p class="empty">Tiada tugasan relief untuk tarikh ini.</p>';
 const group={};r.forEach(x=>{const key=(x.originalNames||[]).join(' / ')||'Guru tidak hadir';(group[key]||(group[key]=[])).push(x);});
 let html='<table><thead><tr><th>Waktu</th><th>Subjek</th><th>Kelas</th><th>Guru Ganti</th><th>Kaedah</th><th>Status</th>'+((own||roles.includes('GPK'))?'<th>Tindakan</th>':'')+'</tr></thead><tbody>';
 Object.entries(group).forEach(([name,records])=>{
  html+=`<tr class="group"><td colspan="${(own||roles.includes('GPK'))?7:6}">Guru tidak hadir: ${esc(name)}</td></tr>`;
  records.forEach(x=>{html+=`<tr><td><strong>${esc(shortSlot(x.slotId))}</strong><br><small>${esc(x.from)}–${esc(x.to)}</small></td>
   <td>${esc(x.subject)}</td><td>${esc(x.classId)}</td><td><strong>${esc(x.replacementName||'Belum diagih')}</strong></td>
   <td>${esc(x.assignmentMode)}${x.phase==='BACKUP'?' · Backup':''}
    ${x.auditSummary?`<details class="fi-v55-official-audit"><summary>Audit agihan</summary><small>
    Hakiki: ${esc((x.auditSummary.slotsHakiki||[]).join(', '))||'—'};
    ${esc(x.auditSummary.hakiki)}H + ${esc(x.auditSummary.reliefSelepas)}R = ${esc(x.auditSummary.totalSelepas)} waktu;
    Berturut: ${esc(x.auditSummary.berturutSelepas)} / ${esc(x.auditSummary.hadBerturut||'—')};
    Relief minggu sebelum dipilih: ${esc(x.auditSummary.reliefMingguSebelum)};
    Keputusan: ${esc(x.auditSummary.keputusan)}.
    Ini audit kelayakan, bukan bukti optimum global.</small></details>`:''}</td>
    <td>${badge(x.completed?'DISAH GURU':x.status)}</td>`;
   if(own)html+=`<td>${x.status==='DIAGIH'&&!x.completed?`<button class="btn muted confirm" data-id="${esc(x.id)}" type="button">Sahkan selepas PdPc</button>`:'—'}</td>`;
   else if(roles.includes('GPK'))html+=`<td>${x.status==='DIAGIH'?`<button class="btn muted cancel-slot" data-id="${esc(x.id)}" type="button">Batal (jika tidak perlu)</button>`:'—'}</td>`;
   html+='</tr>';});
 });return html+'</tbody></table>';
}
function draw(){const current=rows.filter(x=>x.status!=='DIBATALKAN'&&x.status!=='DIBATALKAN_GPK');
 $('daily-summary').innerHTML=metrics([[current.length,'Kelas perlukan relief'],[current.filter(x=>x.status==='DIAGIH').length,'Berjaya diagih'],[current.filter(x=>x.status==='TIADA_GANTI').length,'Belum terisi'],[current.filter(x=>x.phase==='BACKUP').length,'Relief Backup']]);
 $('daily-list').innerHTML=schedulePublished?listTable(current):'<p class="empty">Jadual bagi tarikh ini belum diterbitkan. Agihan rasmi hari persekolahan dibuat selepas 7.25 pagi.</p>';
 const mine=current.filter(x=>x.replacementUid===user?.uid);
 $('my-count').textContent=mine.length+' tugasan';$('my-list').innerHTML=schedulePublished?`<div class="table-holder">${listTable(mine,true)}</div>`:'<p class="empty">Jadual hari ini belum diterbitkan.</p>';
}
let fi55HasSnapshot=false;
function fi55Notify(oldRows,newRows){
 if(!fi55HasSnapshot||!user?.uid)return;
 const mine=x=>(x||[]).filter(r=>r.replacementUid===user.uid&&
  !['DIBATALKAN','DIBATALKAN_GPK'].includes(r.status));
 const a=new Map(mine(oldRows).map(x=>[x.id,x])),b=new Map(mine(newRows).map(x=>[x.id,x]));
 const added=[...b.values()].filter(x=>!a.has(x.id)||a.get(x.id).status!==x.status||a.get(x.id).replacementId!==x.replacementId);
 const removed=[...a.values()].filter(x=>!b.has(x.id));
 const div=$('fi55-inapp-alert');if(!div)return;
 if(added.length){div.hidden=false;div.textContent='Jadual e-Relief dikemas kini: '+added.length+' tugasan baharu/berubah untuk anda. Buka tab Relief Saya.';}
 else if(removed.length){div.hidden=false;div.textContent='Perubahan e-Relief: '+removed.length+' tugasan anda telah ditukar atau dibatalkan. Semak Relief Saya.';}
}
// DEMO SEMENTARA: Admin sahaja; backend melakukan pengesahan semula, bukan akses berdasarkan UI.
async function fiAdminDemoGenerate(){
 const btn=$('fi-admin-demo-run');
 if(!fiStudioIsAdmin())return warn('Akses ADMIN_SISTEM diperlukan.',true);
 const selected=window.matchMedia('(max-width:767px)').matches?($('fi-v66-date')?.value||$('view-date')?.value):($('view-date')?.value||$('fi-v66-date')?.value);
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(selected))return warn('Pilih tarikh yang sah dahulu.',true);
 const message='TERBITKAN RELIEF RASMI bagi '+selected+' sekarang?\n\nIni benar-benar menulis tugasan ke Firestore, bukan simulasi. Trigger 07:25 kekal. Jadual yang sudah diterbitkan tidak akan dijana dua kali.\n\nTeruskan?';
 if(!confirm(message))return;
 btn.disabled=true;const old=btn.textContent;btn.textContent='Menjana relief…';
 try{
  const result=await api('relief51AdminDemoPublish',{date:selected,confirmText:'TERBITKAN'});
  if(result.status==='TELAH_DIJANA')warn('Tarikh '+selected+' telah dijana sebelum ini. Jadual tidak digandakan.');
  else if(result.status==='OK')warn('Berjaya! Relief rasmi '+selected+' diterbitkan: '+(result.publishedRows??0)+' tugasan. Semak senarai di bawah.');
  else warn('Hasil penjanaan: '+(result.status||'Tiada status')+' untuk '+selected+'.');
  if($('view-date').value!==selected)listenDate(selected);else listenDate(selected);
 }catch(e){warn('Generate segera gagal: '+e.message,true);}
 finally{btn.disabled=false;btn.textContent=old;}
}
async function fi55BackupNow(){
 if(!roles.includes('ADMIN_SISTEM'))return warn('Admin Sistem sahaja.',true);
 if(!confirm('Kira semula agihan rasmi untuk hari ini sekarang? Ini boleh mengubah jadual guru bagi waktu yang belum bermula.'))return;
 const btn=$('relief55-backup-now');btn.disabled=true;
 try{const r=await api('relief51BackupNow');warn('Proses rasmi: '+(r.status||'OK')+'. Semak jadual terkini dan guru terlibat.');}
 catch(e){warn('Kiraan susulan gagal: '+e.message,true)}finally{btn.disabled=false}
}
async function fi55Health(){if(!roles.includes('ADMIN_SISTEM'))return;
 try{const r=await api('relief55Health');$('relief55-ops-health').textContent=
  'Auto '+(r.autoReliefEnabled?'AKTIF':'OFF')+' · Dasar V5.5 '+(r.dasarV55Rasmi?'AKTIF':'MAKMAL')+
  ' · Trigger '+r.triggerCount+' · Sheets '+(r.lastExport?.syncedAt||'belum dilaporkan');}
 catch(e){$('relief55-ops-health').textContent='Semakan operasi gagal: '+e.message;}
}
function listenDate(date){day=date;$('view-date').value=date;if(stop)stop();rows=[];schedulePublished=false;fi55HasSnapshot=false;draw();
 stop=fns.onSnapshot(fns.doc(db,'semakmur_fi_relief_public_harian',date),snap=>{
  schedulePublished=!!(snap.exists()&&snap.data().published===true);
  const old=rows;rows=schedulePublished&&Array.isArray(snap.data().rows)?snap.data().rows:[];
  fi55Notify(old,rows);fi55HasSnapshot=true;
  $('published').textContent=schedulePublished?'Jadual diterbitkan':'Belum diterbitkan';draw();fiReliefShellSignal('ready');
 },e=>{schedulePublished=false;warn('Gagal membaca jadual Firestore: '+(e.code||e.message),true);rows=[];draw();fiReliefShellSignal('error',e.code||e.message);});
}
function currentTab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
 document.querySelectorAll('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==name);}
// V5.1.3: URL tunggal, dikongsi bersama e-Keberadaan.
// Jangan lagi memuat turun HTML modul lain untuk mencari endpoint.
async function endpoint(){
 const url=String(window.SeMAKMURFiAPIConfig?.webAppExecUrl||'').trim();
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url))
   throw Error('URL Web App Fi-Sync tiada/tidak sah. Semak Fi-APIConfig.js.');
 return url;
}
async function api(action,rest={}){
 if(!auth?.currentUser)throw Error('Log masuk diperlukan.');const url=await endpoint(),idToken=await auth.currentUser.getIdToken();
 const nonce=globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random().toString(36).slice(2);
 return new Promise((resolve,reject)=>{
  const iframe=document.createElement('iframe');iframe.hidden=true;iframe.name='r51-'+nonce;
  iframe.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin');
  const form=document.createElement('form');form.method='POST';form.action=url;form.target=iframe.name;form.hidden=true;
  const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify({action,nonce,idToken,...rest});form.append(input);
  let done=false;const finish=()=>{clearTimeout(timer);window.removeEventListener('message',received);form.remove();iframe.remove();};
  // V5.5.4: Kekalkan pembetulan V5.1.4. Apps Script HtmlService boleh membalas
  // daripada hostname n-<id>-script.googleusercontent.com (bukan hanya subdomain bertitik).
  // Semak HTTPS + hostname rasmi Google dan nonce; tidak terima origin "null"/wildcard.
  function trustedFiOrigin(origin){
   try{
    const u=new URL(origin);
    if(u.protocol!=='https:'||u.port||u.username||u.password)return false;
    const host=u.hostname.toLowerCase();
    return host==='script.google.com'||host==='script.googleusercontent.com'||
      host.endsWith('.script.googleusercontent.com')||host.endsWith('-script.googleusercontent.com');
   }catch(_e){return false;}
  }
  function received(e){
   if(e.data?.channel!=='semakmur-fi-doc-v1')return;
   if(!trustedFiOrigin(e.origin)){
    console.warn('[SeMAKMUR FiBridge] Origin respons tidak dibenarkan:',e.origin);
    return;
   }
   if(e.data.nonce!==nonce||done)return;
   done=true;finish();e.data.ok?resolve(e.data):reject(Error(e.data.error||'Permintaan gagal'));
  }
  const timer=setTimeout(()=>{if(!done){done=true;finish();reject(Error('Tiada respons backend untuk '+action+'. Permintaan mungkin masih diproses; semak Apps Script > Executions, deployment /exec dan Console sebelum mengulang.'))}},90000);
  window.addEventListener('message',received);document.body.append(iframe,form);form.submit();
 });
}
async function testFiConnection(){
 const btn=$('test-fi-connection');if(btn)btn.disabled=true;
 warn('Menguji laluan POST Fi-Sync dan pengesahan Firebase…');
 try{
  const result=await api('fiBackendHealth');
  warn('Sambungan backend berjaya. Versi: '+String(result.version||'tidak dinyatakan')+
    '. Pengesahan pengguna dan laluan POST berfungsi.');
 }catch(e){warn('Ujian backend gagal: '+e.message,true);}
 finally{if(btn)btn.disabled=false;}
}
function selectedIds(id){return [...$(id).selectedOptions].map(o=>o.value);}
function staffOptions(list){return list.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} — ${esc(s.category)}</option>`).join('');}
function staffStatus(message,kind=''){
 const box=document.querySelector('.staff-state'),node=$('sim-staff-status');
 if(node)node.textContent=message;
 if(box){box.classList.remove('is-error','is-success');if(kind)box.classList.add('is-'+kind);}
}
// V5.1.2: Makmal Admin membaca cache roster Firestore secara terus.
// Ini tidak memintas Firestore Security Rules. Hanya peranan istimewa
// dibenarkan membaca semakmur_fi_relief_staf/active.
function loadStaff(force=false){
 if(staffLoading)return fiStudioRosterPromise||Promise.resolve(fiStudioRosterCopy());
 if(!force&&staff.length)return Promise.resolve(fiStudioRosterCopy());
 staffLoading=true;
 fiStudioRosterPromise=(async()=>{
  staff=[];
  $('generate-simulation').disabled=true;
  $('reload-sim-staff').disabled=true;
  $('absent-staff').innerHTML='';$('emergency-staff').innerHTML='';
  staffStatus('Memuatkan senarai guru daripada Firestore…');
  try{
   if(!user||!roles.includes('ADMIN_SISTEM'))throw Error('Akses Makmal Admin memerlukan peranan ADMIN_SISTEM.');
   if(!fns?.getDocFromServer||!db)throw Error('Sambungan Firestore belum tersedia.');
   const snap=await fns.getDocFromServer(fns.doc(db,'semakmur_fi_relief_staf','active'));
   if(!snap.exists())throw Error('Dokumen semakmur_fi_relief_staf/active tidak wujud. Jalankan sync roster dahulu.');
   const source=snap.data()?.staff;
   if(!Array.isArray(source)||!source.length)throw Error('Roster Firestore kosong.');
   staff=source.map(x=>({id:String(x?.idStaf||'').trim(),name:String(x?.name||'').trim(),category:String(x?.category||x?.kategori||'—').trim()}))
    .filter(x=>x.id&&x.name);
   staff=[...new Map(staff.map(x=>[x.id,x])).values()].sort((a,b)=>a.name.localeCompare(b.name,'ms'));
   if(!staff.length)throw Error('Roster tiada medan idStaf/name yang sah.');
   $('absent-staff').innerHTML=staffOptions(staff);
   $('emergency-staff').innerHTML=staffOptions(staff);
   $('generate-simulation').disabled=false;
   staffStatus(staff.length+' guru tersedia daripada Firestore.','success');
   window.dispatchEvent(new CustomEvent('semakmur-relief-staff-loaded',{detail:{staff:fiStudioRosterCopy()}}));
   return fiStudioRosterCopy();
  }catch(e){
   console.error('[SeMAKMUR V5.5.3] Roster Firestore gagal',e);
   const info=e?.code==='permission-denied'?'Firestore menolak bacaan roster (permission-denied).':(e?.message||String(e));
   staffStatus('Senarai guru gagal dibaca: '+info,'error');
   return [];
  }finally{staffLoading=false;$('reload-sim-staff').disabled=false;}
 })();
 return fiStudioRosterPromise;
}

function simTable(d){const r=d.rows||[],initial=new Map((d.mainRows||[]).map(x=>[x.slotId+'|'+x.classId,x]));
 const changed=r.filter(x=>{const p=initial.get(x.slotId+'|'+x.classId);return !p||p.replacementId!==x.replacementId;}).length;
 return `<p class="muted-note">Jadual utama: ${esc((d.mainRows||[]).length)} tugasan. ${d.backup?'Relief Backup: '+changed+' tugasan baharu/berubah; yang lain dikekalkan.':''}</p>`;
}
function simDayTable(d){const r=d.rows||[];return `<div class="section-head"><h3>${esc(d.date)}</h3><span class="sub">${r.length} waktu | ${r.filter(x=>x.status==='DIAGIH').length} diagih</span></div>
 <div class="table-holder"><table><thead><tr><th>Waktu</th><th>Kelas</th><th>Subjek</th><th>Guru ganti</th><th>Kaedah</th><th>Catatan pemilihan</th></tr></thead><tbody>${r.map(x=>`<tr>
 <td>${esc(shortSlot(x.slotId))}</td><td>${esc(x.classId)}</td><td>${esc(x.subject)}</td><td>${esc(x.replacementName||'Tiada')}</td><td>${badge(x.assignmentMode)}</td><td>${esc(x.policyNote)}</td></tr>`).join('')}</tbody></table></div>`;}
async function simulate(){const absentIds=selectedIds('absent-staff'),emergencyIds=selectedIds('emergency-staff');if(!absentIds.length){warn('Pilih sekurang-kurangnya seorang guru tidak hadir.',true);return;}
 $('generate-simulation').disabled=true;warn('Menjana simulasi dengan enjin V5.1…');
 try{const data=await api('relief51Simulate',{date:$('sim-date').value,absentIds,emergencyIds,
  emergencyFrom:$('emergency-from').value,twoDays:$('sim-two').checked});
 $('sim-results').innerHTML=`<div class="notice">Simulasi berjaya disimpan (ID ${esc(data.sessionId)}). Data rasmi tidak diubah.</div>`+(data.days||[]).map(d=>simTable(d)+simDayTable(d)).join('');warn('');}
 catch(e){warn('Simulasi gagal: '+e.message,true);}finally{$('generate-simulation').disabled=false;}}
function tabulate(header,items){if(!items.length)return '<p class="empty">Tiada data untuk tempoh dipilih.</p>';
 return `<table><thead><tr>${header.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${items.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function drawStats(s){$('stat-metrics').innerHTML=metrics([[s.totalNeeded,'Slot perlu pengganti'],[s.assigned,'Slot diagih'],[s.unfilled,'Slot tidak terisi'],[s.coverage+'%','Kadar liputan'],[s.avgPerEligible,'Purata waktu / guru layak'],[s.breakPairing,'Pecah pairing'],[s.backup,'Relief Backup'],[s.confirmed,'Pengakuan terlaksana']]);
 const top=(s.staff||[]).slice(0,15),max=Math.max(1,...top.map(t=>t.tambahan));
 $('stat-bars').innerHTML=top.map(t=>`<div class="stat-bar-row"><span title="${esc(t.name)}">${esc(t.name)}</span><div class="stat-bar-track"><div class="stat-bar-fill" style="width:${Math.max(0,Math.min(100,100*t.tambahan/max))}%"></div></div><strong>${t.tambahan}</strong></div>`).join('');
 $('stat-staff').innerHTML=tabulate(['Nama samaran','Kategori','Relief tambahan','Pecah pairing','Hari terima relief','Utama','Backup','Disah guru'],
  (s.staff||[]).map(t=>[t.name,t.category||'—',t.tambahan,t.pecahPairing,t.hari,t.utama,t.backup,t.terbuktiSelesai]));
 $('stat-classes').innerHTML=tabulate(['Kelas','Slot perlu','Diagih','Tidak terisi'],(s.classes||[]).map(c=>[c.kelas,c.perlu,c.diagih,c.tidakTerisi]));
 $('stat-days').innerHTML=tabulate(['Tarikh','Perlu','Diagih','Tidak terisi'],(s.days||[]).map(d=>[d.date,d.perlu,d.diagih,d.tidakTerisi]));
 $('csv-stats').disabled=false;}
async function stats(){warn('Menyediakan statistik sebenar…');$('load-stats').disabled=true;
 try{const result=await api('relief51Stats',{month:$('stat-month').value});report=result.stats;drawStats(report);warn('');}
 catch(e){warn('Statistik gagal: '+e.message,true);}finally{$('load-stats').disabled=false;}}
function csv(){if(!report)return;
 const lines=[['SEMAKMUR - LAPORAN SMART E-RELIEF'],['Bulan',report.month],
 ['Slot perlu',report.totalNeeded],['Slot diagih',report.assigned],['Slot tidak terisi',report.unfilled],
 ['Liputan (%)',report.coverage],['Waktu relief tambahan',report.extraRelief],
 ['Pecah pairing',report.breakPairing],['Relief Backup',report.backup],
 ['Pengakuan terlaksana',report.confirmed],['Purata / guru layak',report.avgPerEligible],[],
 ['GURU'],['Nama_Samaran','Kategori','Relief_Tambahan','Pecah_Pairing','Hari_Relief','Utama','Backup','Disahkan_Guru'],
 ...(report.staff||[]).map(x=>[x.name,x.category,x.tambahan,x.pecahPairing,x.hari,x.utama,x.backup,x.terbuktiSelesai]),
 [],['KELAS'],['Kelas','Slot_Perlu','Diagih','Tidak_Terisi'],
 ...(report.classes||[]).map(x=>[x.kelas,x.perlu,x.diagih,x.tidakTerisi]),
 [],['HARIAN'],['Tarikh','Slot_Perlu','Diagih','Tidak_Terisi'],
 ...(report.days||[]).map(x=>[x.date,x.perlu,x.diagih,x.tidakTerisi])];
 const content='\uFEFF'+lines.map(a=>a.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;
 a.download=`SeMAKMUR_Relief_Lengkap_${report.month}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
async function cancelSlot(id){const reason=prompt('Nyatakan sebab pembatalan relief (hanya jika kelas sudah ada guru asal):');
 if(!reason)return;
 try{await api('relief51GpkCancel',{reliefId:id,reason});warn('Tindakan GPK berjaya direkodkan.');}
 catch(e){warn('Pembatalan GPK gagal: '+e.message,true);}}
async function confirmRelief(id){if(!confirm('Sahkan bahawa anda sudah melaksanakan tugasan relief ini?'))return;
 try{await api('relief51ConfirmCompleted',{reliefId:id});warn('Pengakuan berjaya direkodkan.');}
 catch(e){warn('Gagal mengesahkan: '+e.message,true);}}
async function start(){const conf=window.SeMAKMURFirebasePilotConfig;if(!conf?.projectId)throw Error('Konfigurasi Firebase tidak ditemui.');
 const [app,authmod,fire]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')]);
 const fb=app.getApps().find(a=>a.name==='semakmur-fi-dashboard')||app.initializeApp(conf,'semakmur-fi-dashboard');auth=authmod.getAuth(fb);db=fire.getFirestore(fb);fns=fire;
 authmod.onAuthStateChanged(auth,async u=>{if(stop)stop();user=null;roles=[];if(!u){warn('Sila log masuk semula melalui Dashboard Guru.',true);fiReliefShellSignal('error','Sila log masuk semula melalui Dashboard Guru.');fiStudioSettleAuth();return;}
  try{const profile=await fire.getDoc(fire.doc(db,'semakmur_dashboard_fi',u.uid));if(!profile.exists()||profile.data().active!==true||profile.data().ownerEmail?.toLowerCase()!==u.email.toLowerCase())throw Error('Profil guru tidak aktif.');
   user=u;const rt=await fire.getDoc(fire.doc(db,'semakmur_fi_keberadaan_roles',u.uid));roles=rt.exists()&&rt.data().active===true?rt.data().roles||[]:[];
   $('account').textContent=profile.data().profile?.namaSamaran||u.email;
   $('tab-statistik').hidden=!roles.some(r=>['GPK','GB','ADMIN_SISTEM'].includes(r));
   $('tab-makmal').hidden=!roles.includes('ADMIN_SISTEM');
   $('fi-admin-demo-bar').hidden=!fiStudioIsAdmin();
   $('relief55-backup-now').hidden=!roles.includes('ADMIN_SISTEM');
   $('relief55-check-ops').hidden=!roles.includes('ADMIN_SISTEM');
   // V5.5.3: Jangan lancar panggilan Apps Script tambahan ketika Makmal membaca data.
   if(roles.includes('ADMIN_SISTEM'))$('relief55-ops-health').textContent='Klik “Semak operasi” untuk status automatik dan Sheets.';
   if(roles.includes('ADMIN_SISTEM')){loadStaff();}else{staffStatus('Makmal Admin memerlukan peranan ADMIN_SISTEM.');}listenDate($('view-date').value);
  }catch(e){user=null;roles=[];warn('Akses ditolak: '+e.message,true);fiReliefShellSignal('error',e.message);}
  finally{fiStudioSettleAuth();}
 });
}
function init(){if(new URLSearchParams(location.search).get('embed')==='1')document.body.classList.add('is-embed');const today=dateMY();$('view-date').value=today;$('sim-date').value=today;$('stat-month').value=today.slice(0,7);
 document.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>currentTab(el.dataset.tab)));
 $('view-date').addEventListener('change',()=>{if(user)listenDate($('view-date').value)});
 $('refresh').addEventListener('click',()=>{if(user)listenDate($('view-date').value)});
 $('relief55-backup-now').addEventListener('click',fi55BackupNow);
 $('fi-admin-demo-run').addEventListener('click',fiAdminDemoGenerate);
 $('relief55-check-ops').addEventListener('click',fi55Health);
 $('generate-simulation').addEventListener('click',simulate);$('reload-sim-staff').addEventListener('click',()=>loadStaff(true));$('test-fi-connection').addEventListener('click',testFiConnection);
 $('clear-simulation').addEventListener('click',()=>{$('absent-staff').selectedIndex=-1;$('emergency-staff').selectedIndex=-1;$('sim-results').innerHTML='<p class="empty">Pilihan dikosongkan.</p>'});
 $('load-stats').addEventListener('click',stats);$('csv-stats').addEventListener('click',csv);$('print-stats').addEventListener('click',()=>window.print());
 $('daily-list').addEventListener('click',e=>{const b=e.target.closest('button.cancel-slot');if(b)cancelSlot(b.dataset.id)});
 $('my-list').addEventListener('click',e=>{const b=e.target.closest('button.confirm');if(b)confirmRelief(b.dataset.id)});
 start().catch(e=>{warn(e.message,true);fiReliefShellSignal('error',e.message);fiStudioSettleAuth();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

;

/* ===== MERGED: Fi-eReliefGuru-V53.js ===== */
'use strict';
/* SeMAKMUR Smart e-Relief V5.6 — Makmal Mingguan desktop sahaja.
 * Modul relief rasmi & PWA sedia ada kekal. Semua mutasi di backend ADMIN_SISTEM.
 */
(()=>{
 const el=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bridge=()=>window.SeMAKMURReliefStudioBridge;
 const state={week:null,leaves:[],staff:[],draft:[],busy:false,initialized:false,requestSerial:0,loadDatePromise:null,loadDateKey:'',apiStates:{},apiSeq:0};
 const shortTime=x=>x?.periodNo?`Waktu ${x.periodNo}`:String(x?.slotId||'').replace(/^.*SLOT-0*/,'Slot ');
 const message=(text,error=false)=>{const v=el('sim53-week-status');if(!v)return;
  v.textContent=text;v.classList.toggle('fi-v53-error',error);};
 const selectedDate=()=>el('sim53-date')?.value||'';
 const staffOpt=(list)=>list.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} (${esc(s.category||'—')})</option>`).join('');
 function rosterStatus(msg,error=false){const node=el('sim53-staff-status');if(!node)return;
  node.textContent=msg;node.classList.toggle('fi-v53-error',error);}
 function populateStaff(staff){if(!Array.isArray(staff)||!staff.length)return false;
  state.staff=[...new Map(staff.filter(x=>x?.id&&x?.name).map(x=>[x.id,x])).values()]
    .sort((a,b)=>a.name.localeCompare(b.name,'ms'));
  const keepA=el('sim53-staff')?.value,keepE=el('sim53-emergency-staff')?.value;
  const options=staffOpt(state.staff);
  el('sim53-staff').innerHTML=options;
  el('sim53-emergency-staff').innerHTML=options;
  if(state.staff.some(x=>x.id===keepA))el('sim53-staff').value=keepA;
  if(state.staff.some(x=>x.id===keepE))el('sim53-emergency-staff').value=keepE;
  rosterStatus(state.staff.length+' guru dimuatkan daripada Firestore, tanpa menunggu statistik mingguan.');
  return true;
 }
 async function loadRosterQuick(){
  try{await ensure();const b=bridge();
   if(populateStaff(b.staff?.()||[]))return;
   if(typeof b.loadStaff!=='function')throw Error('Bridge roster belum tersedia. Pastikan Fi-eReliefGuru.js V5.5.3 dimuatkan.');
   const list=await b.loadStaff();
   if(!populateStaff(list))throw Error('Senarai guru Firestore kosong atau gagal dibaca.');
  }catch(e){rosterStatus('Senarai guru: '+(e?.message||String(e)),true);}
 }
 function renderApiStatus(){const node=el('sim53-api-status');if(!node)return;
  node.textContent=Object.entries(state.apiStates).map(([act,v])=>`${act}: ${v}`).join(' · ')||'Tiada permintaan aktif.';
 }
 function isDesktop(){return document.body.classList.contains('fi-host-desktop') || (typeof window.matchMedia==='function' && window.matchMedia('(min-width:600px)').matches);}
 async function ensure(){
  const b=bridge();
  if(!b||typeof b.isAdmin!=='function'||typeof b.api!=='function')
   throw Error('Sambungan Makmal ke e-Relief tidak tersedia. Pastikan Fi-eReliefGuru.js V5.5.3 dimuatkan.');
  if(typeof b.ready==='function'){
   let timeoutId;
   try{await Promise.race([b.ready(),new Promise((_,reject)=>{
    timeoutId=setTimeout(()=>reject(Error('Pengesahan sesi Firebase mengambil lebih 20 saat. Semak Console dan sambungan Dashboard Guru.')),20000);
   })]);}finally{clearTimeout(timeoutId);}
  }
  const s=typeof b.status==='function'?b.status():{};
  if(s.signedIn===false)throw Error('Sesi Firebase tidak aktif. Log masuk melalui Dashboard Guru.');
  if(s.profileReady===false)throw Error('Profil guru belum disahkan. Semak akaun dan sambungan Firebase.');
  if(!b.isAdmin())throw Error('Peranan ADMIN_SISTEM tidak ditemui dalam sesi e-Relief. Semak semakmur_fi_keberadaan_roles bagi UID anda.');
 }
 const inFlightReads=new Map();
 async function call(action,payload={}){
  const key=['relief53WeekGet','relief53LeaveList'].includes(action)?action+'|'+(payload.date||''):'';
  if(key&&inFlightReads.has(key))return inFlightReads.get(key);
  const request=(async()=>{
   const began=performance.now();state.apiStates[action]='Menyemak sesi';renderApiStatus();
   await ensure();
   state.apiStates[action]='Menghubungi Apps Script';renderApiStatus();
   const tick=setTimeout(()=>{state.apiStates[action]='Masih menunggu Apps Script (15s+). Semak Executions jika berterusan.';renderApiStatus();},15000);
   try{const data=await bridge().api(action,payload);
    state.apiStates[action]='Selesai '+Math.round(performance.now()-began)+' ms';renderApiStatus();return data;
   }catch(e){state.apiStates[action]='GAGAL '+Math.round(performance.now()-began)+' ms: '+(e?.message||e);renderApiStatus();throw e;}
   finally{clearTimeout(tick);}
  })();
  if(key)inFlightReads.set(key,request);
  try{return await request;}
  finally{if(key&&inFlightReads.get(key)===request)inFlightReads.delete(key);}
 }
 async function withBusy(label,fn){if(state.busy)return;state.busy=true;
  const buttons=['sim53-generate','sim53-apply-cancel','sim53-apply-emergency','sim53-reload-leaves','sim53-refresh','sim56-reset-week','sim56-reset-all','sim53-date'];
  buttons.forEach(id=>{if(el(id))el(id).disabled=true});
  message(label);const stop=bridge()?.begin(label)||(()=>{});
  try{const ret=await fn();if(!state.week?.warning&&!String(label).includes('Memadam'))message('Selesai. Makmal sedia untuk diteruskan.');return ret;}
  catch(e){message(e?.message||String(e),true);return null;}
  finally{stop();state.busy=false;buttons.forEach(id=>{if(el(id))el(id).disabled=false});if(currentDay())renderEvents(currentDay());}
 }
 function displayDraft(){el('sim53-draft-cases').innerHTML=state.draft.length?
  state.draft.map((c,i)=>`<span class="fi-v53-draft">${esc(c.name)} · ${esc(c.type)} · ${esc(c.from)}–${esc(c.to)}
  <button type="button" data-del-case="${i}" aria-label="Buang senario">×</button></span>`).join(''):
  '<small>Tiada senario cuti tambahan.</small>';
 }
 function renderLeaveOptions(){
  const root=el('sim53-leave-list');if(!root)return;
  root.innerHTML=state.leaves.length?state.leaves.map(l=>`<label class="fi-v53-leave-item">
    <input type="checkbox" name="sim53-leave" value="${esc(l.requestId)}">
    <span><strong>${esc(l.name)}</strong><small>${esc(l.type)}${l.scope?' · '+esc(l.scope):''} · ${esc(l.from)}–${esc(l.to)} · ${esc(l.status||'belum disahkan')}</small></span>
  </label>`).join(''):'<p class="empty">Tiada rekod Keberadaan aktif untuk tarikh ini. Gunakan “Tambah senario cuti ujian”.</p>';
  populateStaff(state.staff);
 }
 async function loadLeaves(){const date=selectedDate();if(!date)return;
  const res=await call('relief53LeaveList',{date});if(date!==selectedDate())return;
  state.leaves=Array.isArray(res.leaveRecords)?res.leaveRecords:[];
  if(Array.isArray(res.staff)&&res.staff.length)populateStaff(res.staff);
  renderLeaveOptions();
 }
 function selectedCaseKeys(){return [...document.querySelectorAll('input[name="sim53-leave"]:checked')].map(x=>x.value);}
 function currentDay(){return state.week?.selected||null;}
 function teacherLoadText(staffId,date){const staff=state.week?.staff?.find(s=>s.id===staffId);
  const d=staff?.daily?.[date];if(!d)return '';
  const text=[`${d.hakiki} Hakiki`];
  if(d.pairing)text.push(`- ${d.pairing} Pecah Pairing`);
  if(d.relief)text.push(`+ ${d.relief} Relief`);
  if(d.pending)text.push(`· ${d.pending} Perlu Serah Tugas`);
  return text.join(' ');
 }
 function auditDetails(r){const a=r.audit;if(!a||!r.replacementId)return '';
  const max=Number(a.berturutSelepas)||0,limit=Number(a.hadBerturut)||0;
  const valid=a.keputusan==='LULUS_SYARAT_JADUAL'&&Number(a.totalSelepas)<=Number(a.hadHarian)&&(!limit||max<=limit);
  const wlist=(list)=>Array.isArray(list)&&list.length?list.join(', '):'—';
  const others=(a.calonAlternatif||[]).map(t=>`${t.nama}: ${t.hakiki}H, ${t.reliefHari}R (minggu ${t.reliefMinggu}R)`).join(' · ');
  return `<details class="fi-v55-audit-row"><summary>Audit Agihan · ${esc(valid?'Lulus had jadual':'Perlu semakan')} · ${esc(a.hakiki)}H${a.pairingPecah?' − '+esc(a.pairingPecah)+'P':''} + ${esc(a.reliefSelepas)}R = ${esc(a.totalSelepas)} waktu</summary>
   <div class="fi-v55-audit-grid"><span>Hakiki asal<strong>${esc(wlist(a.slotsHakikiW))}</strong></span>
   <span>Relief diberikan<strong>${esc(wlist(a.slotsReliefW))}</strong></span>
   ${a.pairingPecah?`<span>Pecah pairing<strong>${esc(wlist(a.slotsPecahW))}</strong></span>`:''}
   <span>Beban selepas<strong>${esc(a.hakiki)}H${a.pairingPecah?' − '+esc(a.pairingPecah)+'P':''} + ${esc(a.reliefSelepas)}R = ${esc(a.totalSelepas)} waktu</strong></span>
   <span>Had maksimum<strong>${esc(a.hadHarian)} waktu · ${esc(a.hadRelief??'—')} relief${a.manualTier?' · Manual Tahap '+esc(a.manualTier):''}</strong></span>
   <span>Berturut-turut<strong>${esc(max)} / ${esc(limit||'Belum dinilai')} waktu</strong></span>
   <span>Relief minggu sebelum dipilih<strong>${esc(a.reliefMingguSebelum||0)}</strong></span>
   <span>Pusingan<strong>${esc(a.pusingan||'—')}</strong></span>
   <span>Calon layak dalam pusingan<strong>${esc(a.calonLayakPusingan||0)}</strong></span></div>
   ${others?`<p class="fi-v55-audit-note"><b>Contoh alternatif pusingan sama:</b> ${esc(others)}</p>`:''}
   <p class="fi-v55-audit-note">Audit menunjukkan beban akhir berdasarkan rekod agihan, bukan pengesahan telah mengajar.</p></details>`;
 }
 function renderCards(rows,date,allowManual=false){
  if(!rows?.length)return '<p class="fi-v56-empty">Tiada rekod bagi bahagian ini.</p>';
  const groups=new Map();
  rows.forEach(r=>{
   const names=r.originalNames||[];
   const absent=(r.absentTeacherIds||[]).map(id=>names[(r.allTeachers||[]).indexOf(id)]||id);
   const name=r.status==='PAIRING_DITERUSKAN'&&absent.length?absent.join(' / '):(names.join(' / ')||'Guru asal');
   if(!groups.has(name))groups.set(name,[]);groups.get(name).push(r);
  });
  return [...groups.entries()].sort((x,y)=>x[0].localeCompare(y[0],'ms')).map(([name,items])=>{
   const cards=items.slice().sort((x,y)=>x.from.localeCompare(y.from)).map(r=>{
    const pairing=r.status==='PAIRING_DITERUSKAN';
    const restored=r.status==='JADUAL_ASAL_DIPULIHKAN';
    const handover=r.status==='PERLU_SERAH_TUGAS';
    const empty=r.status==='TIADA_GANTI';
    const label=pairing?'Hakiki kekal · 0 Relief tambahan':restored?'Jadual hakiki dipulihkan':
     r.audit?`${r.audit.hakiki} Hakiki${r.audit.pairingPecah?' − '+r.audit.pairingPecah+' Pecah Pairing':''} + ${r.audit.reliefSelepas} Relief`:teacherLoadText(r.replacementId,date);
    const status=r.manualBackup&&r.status==='DIAGIH'?`MANUAL ${r.manualTier||1}`:pairing?'PAIRING DITERUSKAN':restored?'JADUAL DIPULIHKAN':handover?'PERLU SERAH TUGAS':
     empty?'BELUM DIAGIH':r.assignmentMode==='PECAH_PAIRING'?'PECAH PAIRING':r.assignmentMode==='BNK'?'BNK':
     r.assignmentMode==='PRAKTIKAL'?'PRAKTIKAL':r.assignmentMode||'BIASA';
    const teacher=pairing?(r.continuingNames||[]).join(' / '):restored?(r.originalNames||[]).join(' / '):
     (r.replacementName||r.proposedReplacementName||'Belum diagih');
    const teacherTitle=pairing?'Guru meneruskan kelas':restored?'Guru jadual asal':'Guru ganti';
    const absent=pairing?`<span class="fi-v56-support">Cuti: ${esc((r.absentTeacherIds||[]).map(id=>
     ((r.allTeachers||[]).indexOf(id)>=0?(r.originalNames||[])[(r.allTeachers||[]).indexOf(id)]:id)).join(' / '))}</span>`:'';
    const proposed=handover&&r.proposedReplacementName?`<span class="fi-v56-support">Cadangan: ${esc(r.proposedReplacementName)}</span>`:'';
    const mode=pairing?'is-pairing':restored?'is-restored':handover?'is-handover':empty?'is-unfilled':'is-relief';
    return `<article class="fi-v56-row ${mode}">
      <div class="fi-v56-col fi-v56-time"><span class="fi-v56-key">WAKTU</span><strong>${esc(shortTime(r))}</strong><small>${esc(r.from)}–${esc(r.to)}</small></div>
      <div class="fi-v56-col fi-v56-subject"><span class="fi-v56-key">SUBJEK / KELAS</span><strong>${esc(r.subject||'—')}</strong><small>${esc(r.classId||'—')}</small></div>
      <div class="fi-v56-col fi-v56-teacher"><span class="fi-v56-key">${esc(teacherTitle.toUpperCase())}</span><strong>${esc(teacher)}</strong><small>${esc(label||'—')}</small>${absent}${proposed}</div>
      <div class="fi-v56-col fi-v56-status"><span class="fi-v56-key">STATUS</span><span class="fi-v56-pill">${esc(status)}</span></div>
      ${!pairing&&!restored?auditDetails(r):''}
      ${allowManual&&empty?`<div class="fi-v56-manual-action"><button class="btn muted" type="button" data-sim56-manual="${esc(r.id)}">Agih Manual — slot kosong sahaja</button></div>`:''}
     </article>`;
   }).join('');
   return `<section class="fi-v56-group"><div class="fi-v56-group-head"><strong>GURU ASAL · ${esc(name)}</strong><span>${items.length} waktu</span></div><div class="fi-v60-colhead" aria-hidden="true"><span>Waktu</span><span>Subjek / Kelas</span><span>Guru ganti / Penerus</span><span>Status</span></div><div class="fi-v56-group-body">${cards}</div></section>`;
  }).join('');
 }
 function renderDays(){const week=state.week;if(!week)return;
  el('sim53-week-title').textContent=`Minggu ${week.weekStart} hingga ${week.weekEnd}`;
  el('sim53-totals').textContent=`${week.totals.generatedDays}/5 hari · ${week.totals.assigned} relief · ${week.totals.pairing} pecah pairing · ${week.totals.continued||0} pairing diteruskan`;
  el('sim53-days').innerHTML=week.days.length?week.days.map(d=>`<button type="button" class="fi-v53-day" data-open-day="${esc(d.date)}"
   aria-pressed="${d.date===selectedDate()}">${esc(d.date)} <strong>${Number(d.summary?.diagih||0)} relief</strong>${d.policyVersion!=='V6.0-MAKMAL'?'<small>Versi lama · perlu jana semula</small>':''}</button>`).join(''):
   '<p class="empty">Minggu ini belum mempunyai simulasi. Jana satu hari untuk bermula.</p>';
 }
 function renderWeekly(){const w=state.week;if(!w)return;
  const dates=[0,1,2,3,4].map(i=>{const d=new Date(w.weekStart+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
  const suffix=d=>d?`${d.hakiki}H${d.pairing?` −${d.pairing}P`:''}${d.relief?` +${d.relief}R`:''}`:'—';
  el('sim53-week-stats').innerHTML=`<table class="fi-v53-stat-table"><thead><tr><th>Guru</th><th>Kategori_Staf</th>
   ${dates.map(d=>`<th>${esc(['Isn','Sel','Rab','Kha','Jum'][dates.indexOf(d)])}<small>${esc(d.slice(8))}</small></th>`).join('')}
   <th>Relief minggu</th><th>Pecah pairing</th></tr></thead><tbody>
   ${(w.staff||[]).map(s=>`<tr><td><strong>${esc(s.name)}</strong></td><td>${esc(s.category)}</td>
    ${dates.map(d=>`<td>${esc(suffix(s.daily?.[d]))}${s.daily?.[d]?`<small class="fi-v56-stats-w">H: ${esc((s.daily[d].hakikiW||[]).join(', ')||'—')} · R: ${esc((s.daily[d].reliefW||[]).join(', ')||'—')}</small>`:''}</td>`).join('')}
    <td><strong>${s.totalRelief}</strong></td><td>${s.totalPairing}</td></tr>`).join('')}</tbody></table>
   <small class="fi-v53-footnote">H = Hakiki, R = Relief tambahan, P = Pecah Pairing. “—” bermaksud hari belum dijana, bukan guru mempunyai 0 waktu. Jumlah adalah simulasi, bukan rasmi.</small>`;
 }
 function renderEvents(day){const canceled=new Set((day?.events||[]).filter(e=>e.kind==='CANCEL').map(e=>e.targetKey));
  const targets=[...(day?.cases||[]).map(c=>({key:c.key,staffId:c.staffId,name:c.name,type:c.type})),
   ...(day?.events||[]).filter(e=>e.kind==='EMERGENCY').map(e=>({key:e.key,staffId:e.staffId,name:e.name,type:'Kecemasan'}))]
   .filter(c=>!canceled.has(c.key));
  el('sim53-cancel-target').innerHTML=targets.length?targets.map(c=>`<option value="${esc(c.key)}">${esc(c.name)} · ${esc(c.type)}</option>`).join(''):
   '<option value="">Tiada cuti aktif untuk dibatalkan</option>';
  el('sim53-events').innerHTML=(day?.events||[]).map(e=>`<div class="fi-v53-event-record">${esc(e.at)} · ${esc(e.kind==='KB_UPDATE'?'Kemas kini Keberadaan':e.kind==='CANCEL'?'Batal cuti':'Kecemasan')}: ${esc(e.name)}</div>`).join('');
  el('sim53-apply-cancel').disabled=!day||!targets.length||!!day.integrationId;
  el('sim53-apply-emergency').disabled=!day||!!day.integrationId;
  el('sim53-generate').disabled=!!day?.integrationId;
 }
 function renderSelected(){const day=currentDay();renderEvents(day);
  if(!day){el('sim53-day-results').innerHTML='<p class="empty">Tarikh ini belum dijana. Pilih rekod cuti dan klik Jana agihan hari terpilih.</p>';
   el('sim53-day-summary').textContent='Tiada keputusan';return;}
  const s=day.summary||{};
  el('sim53-day-summary').textContent=`${s.diagih||0} diagih · ${s.pairingDiteruskan||0} pairing diteruskan · ${s.dipulihkan||0} jadual dipulihkan · ${s.tiada||0} tiada ganti · ${s.handover||0} perlu serah tugas`;
  const grouped=(day.eventTimeline||[]).map(ev=>{
   const c=(day.changes||[]).filter(x=>x.eventKey===ev.eventKey);
   return `<details open class="fi-v53-changes"><summary>${esc(ev.at)} · ${esc(ev.kind==='KB_UPDATE'?'Kemas kini Keberadaan':ev.kind==='CANCEL'?'Batal cuti':'Kecemasan')}: ${esc(ev.name)} (${c.length} perubahan)</summary>
    ${c.length?`<div class="fi-v53-table-scroll"><table><thead><tr><th>Slot / Masa</th><th>Kelas</th><th>Jenis perubahan</th><th>Sebelum</th><th>Selepas</th></tr></thead><tbody>
    ${c.map(x=>`<tr><td>${esc(x.slotId)} · ${esc(x.time)}</td><td>${esc(x.classId)}</td><td>${esc(x.type.replace(/_/g,' '))}</td><td>${esc(x.old)}</td><td>${esc(x.new)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted-note">Tiada perubahan pada agihan aktif.</p>'}</details>`;
  }).join('');
  const manualWarnings=day.manualWarnings||[];
  const manualWarningNote=manualWarnings.length?`<p class="fi-v56-optimize-note" style="border-color:#e7b98c;background:#fff8ed;color:#875018">Manual Backup perlu disemak semula: ${esc(manualWarnings.join(' · '))}</p>`:'';
  const optimizer=day.events?.length?day.emergencyOptimization:day.optimization;
  const optimizerLabel=(optimizer?.solver==='MILP'?'Global Optimization':'Smart Reshuffle (fallback)')+(day.events?.length?' Susulan':' Agihan Utama');
  const optimizeNote=optimizer?`<p class="fi-v56-optimize-note">${esc(optimizerLabel)}: ${esc(optimizer.before)} → ${esc(optimizer.after)} slot · +${esc(optimizer.added)} diselamatkan · ${esc(optimizer.changes)} pertukaran · ${esc(optimizer.pairingSplit)} pecah pairing · baki ${esc(optimizer.remaining)}${optimizer.provenMaximum?' · optimum model disahkan':optimizer.limitReached?' · had carian / optimum belum dibuktikan':' · optimum belum dibuktikan'}${optimizer.solverFailure?' · '+esc(optimizer.solverFailure):''}</p>`:'';
  const restored=(day.historyRows||[]).length?`<details open class="fi-v53-changes"><summary>Jadual asal dipulihkan (${day.historyRows.length}) — bukan relief</summary>
   ${renderCards(day.historyRows,day.date)}</details>`:'';
  el('sim53-day-results').innerHTML=`${day.integrationId?'<p class="fi-v56-optimize-note">Sumber: Makmal e-Keberadaan V6.1. Daftar, batal dan kejadian susulan melalui e-Keberadaan; Manual Backup kekal di sini.</p>':''}${optimizeNote}${manualWarningNote}<h3 class="fi-v53-final-title">Jadual aktif selepas perubahan (SIMULASI)</h3>
   ${renderCards((day.rows||[]).filter(r=>r.status!=='DIBATALKAN_SIM'&&r.status!=='JADUAL_ASAL_DIPULIHKAN'),day.date,true)}${restored}
   <details class="fi-v53-snapshot"><summary>Agihan asal 7.25 pagi (${day.mainRows?.length||0} rekod) — sejarah asal</summary>
   ${renderCards(day.mainRows||[],day.date)}</details>
   <h3 class="fi-v53-final-title">Kronologi pembatalan cuti / kecemasan</h3>
   ${grouped||'<p class="muted-note">Tiada perubahan selepas agihan utama.</p>'}
   <p class="fi-v55-audit-note">Makmal sahaja: tidak menulis rekod rasmi, tidak menghantar notifikasi dan tidak mengesahkan serah tugas.</p>`;
 }
 function downloadCSV(filename,headers,rows){
  const cell=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;
   return '"'+s.replace(/"/g,'""')+'"';};
  const csv='\ufeff'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3500);
 }
 function exportWeeklyCSV(){
  const week=state.week;
  if(!week?.days?.length)return message('Belum ada hari simulasi untuk dieksport.',true);
  const generated=week.days.map(d=>d.date);
  const hari=['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
  const headers=['ID_Staf','Nama_Samaran','Kategori_Staf','Tarikh','Hari','Hakiki_W','Relief_W',
   'Pecah_Pairing_W','Hakiki','Relief','Pecah_Pairing','Beban_Akhir','Berturut_Maks','Had_Berturut',
   'Relief_Mingguan','Had_Harian','Had_Relief','Pengecualian_Manual','Tahap_Manual','Audit_Jadual'];
  const data=[];
  for(const staff of week.staff||[]){for(const date of generated){const d=staff.daily?.[date];if(!d)continue;
   data.push([staff.id,staff.name,staff.category,date,hari[new Date(date+'T12:00:00Z').getUTCDay()],
    (d.hakikiW||[]).join(' '),(d.reliefW||[]).join(' '),(d.pairingW||[]).join(' '),
    d.hakiki,d.relief,d.pairing,d.bebanAkhir??'',d.berturutMax??'',d.berturutHad??'',
    staff.totalRelief,d.hadHarian??6,d.hadRelief??(staff.kind==='BNK'?3:2),d.pengecualianManual?'YA':'TIDAK',d.manualTier||0,d.audit||'BELUM_DIAUDIT']);
  }}
  downloadCSV('SeMAKMUR_Statistik_Mingguan_SIMULASI_'+week.weekStart+'.csv',headers,data);
 }
 function exportAuditCSV(){const day=currentDay();if(!day)return message('Jana simulasi sebelum eksport audit.',true);
  const headers=['Tarikh','Slot_ID','Kelas','Subjek','Masa_Mula','Masa_Tamat','Guru_Ganti','ID_Staf','Status','Hakiki','Relief_Selepas','Jumlah','Had_Harian','Berturut','Had_Berturut','Relief_Minggu_Sebelum','Pusingan','Keputusan'];
  const data=(day.rows||[]).filter(x=>x.replacementId).map(r=>{const a=r.audit||{};
   return [day.date,r.slotId,r.classId,r.subject,r.from,r.to,r.replacementName,r.replacementId,r.status,
    a.hakiki??'',a.reliefSelepas??'',a.totalSelepas??'',a.hadHarian??'',a.berturutSelepas??'',a.hadBerturut??'',a.reliefMingguSebelum??'',a.pusingan??'',a.keputusan||'BELUM_DIAUDIT'];});
  const csv='\ufeff'+[headers,...data].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const obj=new Blob([csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(obj),link=document.createElement('a');
  link.href=u;link.download='SeMAKMUR_Audit_Relief_SIMULASI_'+day.date+'.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(u),2500);
 }
 function renderWeek(data){state.week=data;renderDays();renderWeekly();renderSelected();
  if(data.warning)message('PERHATIAN: '+data.warning,true);}
 async function refreshWeek(){const date=selectedDate();if(!date)return;
  const data=await call('relief53WeekGet',{date});renderWeek(data);
 }
 async function loadDate(force=false){
  const date=selectedDate();if(!date)return;
  // Jangan lancarkan panggilan berganda apabila tab Makmal diklik berulang kali.
  if(state.loadDatePromise&&state.loadDateKey===date)return state.loadDatePromise;
  state.draft=[];displayDraft();const request=++state.requestSerial;
  state.loadDateKey=date;
  message('Memuatkan statistik mingguan dan cuti secara berasingan…');
  const started=performance.now();
  const task=(async()=>{
   const jobs=[
    refreshWeek().then(()=>{if(request===state.requestSerial){
      el('sim53-week-read-status').textContent='Statistik berjaya dibaca ('+Math.round(performance.now()-started)+' ms).';
    }}).catch(e=>{if(request===state.requestSerial)el('sim53-week-read-status').textContent='Statistik GAGAL: '+(e.message||e);throw e;}),
    loadLeaves().then(()=>{if(request===state.requestSerial)el('sim53-leave-read-status').textContent='Rekod cuti berjaya dibaca.';})
     .catch(e=>{if(request===state.requestSerial)el('sim53-leave-read-status').textContent='Rekod cuti GAGAL: '+(e.message||e);throw e;})
   ];
   const results=await Promise.allSettled(jobs);
   if(request!==state.requestSerial)return;
   const fail=results.filter(x=>x.status==='rejected');
   if(fail.length)message('Ada bacaan gagal: '+fail.map(x=>x.reason?.message||String(x.reason)).join('; '),true);
   else message('Selesai. Makmal sedia untuk ujian.');
  })();
  state.loadDatePromise=task;
  try{await task;}finally{if(state.loadDatePromise===task)state.loadDatePromise=null;}
 }
 async function generate(){if(currentDay()?.integrationId)return message('Tarikh ini diurus Makmal e-Keberadaan.',true);if(!selectedDate())return message('Pilih tarikh.',true);
  const ids=selectedCaseKeys(),replace=el('sim53-replace-day').checked;
  if(!ids.length&&!state.draft.length)return message('Pilih rekod cuti atau tambah senario cuti.',true);
  if(replace&&!confirm('Ganti snapshot Makmal bagi tarikh ini? Agihan utama dan senario terdahulu bagi hari ini akan diganti.'))return;
  const overlay=el('sim56-generate-loading');if(overlay){overlay.hidden=false;overlay.setAttribute('aria-busy','true');}
  try{await withBusy('Menjana agihan dan mengoptimumkan slot kosong…',async()=>{
   const data=await call('relief53SaveDay',{date:selectedDate(),leaveIds:ids,
    testCases:state.draft.map(x=>({staffId:x.staffId,type:x.type,from:x.from,to:x.to})),replaceDay:replace});
   renderWeek(data);el('sim53-replace-day').checked=false;
  });}
  finally{if(overlay){overlay.hidden=true;overlay.removeAttribute('aria-busy');}}
 }
 async function eventCall(payload){const date=selectedDate();if(!currentDay())return message('Jana agihan utama dahulu.',true);if(currentDay().integrationId)return message('Kemas kini melalui Makmal e-Keberadaan.',true);
  await withBusy('Menguji kejadian susulan tanpa menukar agihan rasmi…',async()=>{
   const data=await call('relief53Event',{date,...payload});renderWeek(data);
  });
 }
 async function resetSimulation(scope){
  if(state.busy)return;
  const all=scope==='ALL';
  const token=all?'PADAM SEMUA UJIAN':'KOSONGKAN MINGGU';
  const msg=all?'Ini akan memadam SEMUA rekod simulasi milik akaun Admin ini bagi semua minggu.':'Ini akan memadam rekod simulasi bagi Isnin–Jumaat minggu tarikh dipilih.';
  const typed=window.prompt(msg+'\n\nTidak menjejaskan cuti sebenar atau relief rasmi.\nTaip tepat: '+token);
  if(typed===null)return;
  if(typed.trim()!==token)return message('Pengesahan tidak sepadan. Tiada data dipadam.',true);
  await withBusy('Memadam hanya rekod Makmal ujian…',async()=>{
   const result=await call('relief53Reset',{date:selectedDate(),scope,confirmToken:token});
   if(!result||result.status!=='OK'||!result.week)throw Error('Backend tidak memulangkan pengesahan reset yang lengkap.');
   state.draft=[];displayDraft();
   [...document.querySelectorAll('input[name="sim53-leave"]')].forEach(box=>{box.checked=false;});
   if(el('sim53-replace-day'))el('sim53-replace-day').checked=false;
   renderWeek(result.week);
   message(`${result.deletedCount} rekod simulasi dipadam. ${all?'Semua minggu milik Admin ini':'Minggu terpilih'} kini boleh dijana semula. Cuti sebenar tidak diubah.`);
  });
 }
 function manualFormula(c,after){const p=after?c.pecahSelepas:c.pecahPairing,r=after?c.reliefSelepas:c.reliefHari,b=after?c.bebanSelepas:c.bebanSekarang;return `${c.hakiki}H${p?' − '+p+'P':''} + ${r}R = ${b} waktu`;}
 function updateManualInfo(){const c=(state.manualCandidates||[]).find(x=>x.staffId===el('sim56-manual-list').value);const panel=el('sim60-manual-info');
  panel.innerHTML=c?`<strong>${esc(c.name)} · ${esc(c.category)}</strong><span>Sekarang: ${esc(manualFormula(c,false))}</span><span>Selepas dipilih: <b>${esc(manualFormula(c,true))}</b> / ${esc(c.maksimumHarian)} waktu</span><span>Relief minggu: ${esc(c.reliefMinggu)} → ${esc(c.reliefMingguSelepas)} · Berturut: ${esc(c.berturutSelepas)}/${esc(c.hadBerturut)}${c.mode==='PECAH_PAIRING'?' · Pecah pairing baharu':''}</span>`:'';}
 async function openManualSlot(reliefId){
  if(state.busy)return;
  try{
   message('Menyemak calon untuk slot kosong…');
   const date=selectedDate(),res=await call('relief53ManualCandidates',{date,reliefId});
   if(date!==selectedDate())return;
   state.manualReliefId=reliefId;state.manualDate=date;
   const list=Array.isArray(res.candidates)?res.candidates:[],tier=list[0]?.manualTier||0;state.manualCandidates=list;
   const dialog=el('sim56-manual-dialog');
   el('sim60-manual-tier').textContent=tier===2?'TAHAP 2 · Tiada calon Tahap 1. Maksimum 8 waktu; maksimum 3 berturut-turut.':tier===1?'TAHAP 1 · Maksimum 7 waktu / 3 relief.':'Tiada calon selamat di kedua-dua tahap.';
   el('sim56-manual-list').innerHTML=list.length?list.map(c=>`<option value="${esc(c.staffId)}">${esc(c.name)} · ${esc(c.category)} · ${esc(manualFormula(c,false))} → ${esc(c.bebanSelepas)} waktu${c.mode==='PECAH_PAIRING'?' · Pecah pairing':''}</option>`).join(''):'<option value="">Tiada calon memenuhi syarat keselamatan</option>';
   el('sim56-manual-save').disabled=!list.length;
   el('sim56-manual-reason').value='';dialog.hidden=false;updateManualInfo();
   el('sim56-manual-reason').focus();
   message(list.length?list.length+' calon Manual Backup Tahap '+tier+'.':'Tiada calon yang memenuhi syarat keselamatan jadual manual.',!list.length);
  }catch(e){message('Senarai calon manual gagal: '+(e?.message||e),true);}
 }
 async function saveManualSlot(){
  const reason=el('sim56-manual-reason').value.trim(),staffId=el('sim56-manual-list').value;
  if(reason.length<8)return message('Sebab pemilihan manual perlu sekurang-kurangnya 8 aksara.',true);
  if(!staffId||!state.manualReliefId||state.manualDate!==selectedDate())return message('Pilih guru dan slot yang masih sah.',true);
  if(state.manualCandidates?.[0]?.manualTier===2&&!confirm('Sahkan pengecualian Manual Backup Tahap 2 (maksimum 8 waktu)?'))return;
  await withBusy('Menyemak semula kelayakan dan menyimpan agihan manual Makmal…',async()=>{
   const data=await call('relief53ManualAssign',{date:selectedDate(),reliefId:state.manualReliefId,staffId,reason});
   el('sim56-manual-dialog').hidden=true;state.manualReliefId='';renderWeek(data);
   message('Slot berjaya diagih secara manual (simulasi sahaja). Sejarah asal dikekalkan.');
  });
 }
 function setup(){if(state.initialized||!el('fi-v53-studio'))return;state.initialized=true;
  window.addEventListener('semakmur-relief-staff-loaded',e=>populateStaff(e.detail?.staff||[]));
  rosterStatus('Memuatkan guru daripada Firestore secara berasingan…');
  el('sim53-week-read-status').textContent='Statistik belum dimuatkan.';
  el('sim53-leave-read-status').textContent='Rekod cuti belum dimuatkan.';
  loadRosterQuick();
  el('sim53-date').value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  el('sim53-date').addEventListener('change',loadDate);
  el('sim53-refresh').addEventListener('click',()=>withBusy('Memuatkan statistik minggu…',async()=>{await refreshWeek();el('sim53-week-read-status').textContent='Statistik berjaya dikemas kini.';}));
  el('sim53-test-backend').addEventListener('click',async()=>{
   const btn=el('sim53-test-backend');btn.disabled=true;message('Menguji laluan iframe POST ke Apps Script…');
   try{const x=await call('fiBackendHealth');message('Ujian iframe POST berjaya. Backend '+(x.version||'versi tidak dinyatakan')+'.');}
   catch(e){message('Ujian iframe POST GAGAL: '+(e.message||e),true);}
   finally{btn.disabled=false;}
  });
  el('sim53-reload-leaves').addEventListener('click',()=>withBusy('Memuatkan rekod cuti…',loadLeaves));
  el('sim53-generate').addEventListener('click',generate);
  el('sim55-export-audit')?.addEventListener('click',exportAuditCSV);
  el('sim56-export-week')?.addEventListener('click',exportWeeklyCSV);
  el('sim53-day-results').addEventListener('click',e=>{const b=e.target.closest('[data-sim56-manual]');if(b)openManualSlot(b.dataset.sim56Manual);});
  el('sim56-manual-cancel')?.addEventListener('click',()=>{el('sim56-manual-dialog').hidden=true;});
  el('sim56-manual-save')?.addEventListener('click',saveManualSlot);
  el('sim56-manual-list')?.addEventListener('change',updateManualInfo);
  el('sim56-reset-week')?.addEventListener('click',()=>resetSimulation('WEEK'));
  el('sim56-reset-all')?.addEventListener('click',()=>resetSimulation('ALL'));
  el('sim53-add-case').addEventListener('click',()=>{
   const staffId=el('sim53-staff').value,s=state.staff.find(x=>x.id===staffId);
   if(!s)return message('Senarai guru belum dimuatkan.',true);
   const type=el('sim53-type').value,from=el('sim53-leave-from').value,to=el('sim53-leave-to').value;
   if(!from||!to||from>=to)return message('Masa cuti ujian tidak sah.',true);
   state.draft.push({staffId,name:s.name,type,from,to});displayDraft();message('Senario cuti ditambah. Klik Jana untuk menyimpan.');
  });
  el('sim53-draft-cases').addEventListener('click',ev=>{const b=ev.target.closest('[data-del-case]');if(!b)return;
   state.draft.splice(Number(b.dataset.delCase),1);displayDraft();});
  el('sim53-apply-cancel').addEventListener('click',()=>eventCall({kind:'CANCEL',targetKey:el('sim53-cancel-target').value,at:el('sim53-cancel-at').value}));
  el('sim53-apply-emergency').addEventListener('click',()=>eventCall({kind:'EMERGENCY',staffId:el('sim53-emergency-staff').value,at:el('sim53-emergency-at').value}));
  el('sim53-days').addEventListener('click',e=>{const b=e.target.closest('[data-open-day]');if(!b)return;el('sim53-date').value=b.dataset.openDay;loadDate();});
  const tab=document.querySelector('[data-tab="makmal"]');if(tab)tab.addEventListener('click',()=>{
   if(isDesktop()){loadDate();loadRosterQuick();}
  });
  displayDraft();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();

;

/* ===== MERGED: Fi-eReliefGuru-Manual56.js ===== */
'use strict';
/** V5.7 additive official Manual Backup UI. No edits to Fi-eReliefGuru.js iframe bridge.
 * Server remains authority: if a slot is not TIADA_GANTI, save is rejected.
 * Requires explicit role in dashboard profile for UI visibility.
 */
(()=>{
 const authorized=()=>typeof roles!=='undefined'&&Array.isArray(roles)&&
  roles.some(x=>['ADMIN_SISTEM','SU_KURIKULUM','SETIAUSAHA_KURIKULUM','GPK_PENTADBIRAN'].includes(x));
 const esc56=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const qs=id=>document.getElementById(id);
 let chosen='',chosenDate='',candidates=[];
 function formula(c,after){const p=after?c.pecahSelepas:c.pecahPairing,r=after?c.reliefSelepas:c.reliefHari;return `${c.hakiki}H${p?' − '+p+'P':''} + ${r}R = ${after?c.bebanSelepas:c.bebanSekarang} waktu`;}
 function updateInfo(){const c=candidates.find(x=>x.staffId===qs('fi56-official-staff').value);qs('fi60-official-info').textContent=c?'Sekarang: '+formula(c,false)+' · Selepas: '+formula(c,true)+' · Relief minggu: '+c.reliefMinggu+' → '+c.reliefMingguSelepas+' · Berturut: '+c.berturutSelepas+'/'+c.hadBerturut:'';}
 function display(){
  const host=qs('daily-list');if(!host||!authorized()||typeof rows==='undefined')return;
  const group=new Map();
  rows.filter(x=>x.status!=='DIBATALKAN'&&x.status!=='DIBATALKAN_GPK').forEach(x=>{
   const key=(x.originalNames||[]).join(' / ')||'Guru tidak hadir';
   if(!group.has(key))group.set(key,[]);group.get(key).push(x);
  });
  const flat=[...group.values()].flat(),trs=[...host.querySelectorAll('tbody tr:not(.group)')];
  if(flat.length!==trs.length)return;
  flat.forEach((r,i)=>{if(r.status!=='TIADA_GANTI'||!r.id)return;
   const cell=trs[i].children[3];if(!cell||cell.querySelector('[data-fi56-manual]'))return;
   const button=document.createElement('button');button.type='button';button.className='fi-v56-official-manual';
   button.dataset.fi56Manual=r.id;button.textContent='Agih Manual (slot kosong)';
   cell.append(document.createElement('br'),button);
  });
 }
 function dialog(){let node=qs('fi56-official-modal');if(node)return node;
  node=document.createElement('div');node.id='fi56-official-modal';node.hidden=true;node.className='fi-v56-dialog';
  node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');
  node.innerHTML=`<div class="fi-v56-dialog-inner"><h3>Manual Backup — relief rasmi</h3>
   <p class="muted-note">Hanya slot TIADA_GANTI sebelum kelas bermula. Sistem menyemak kelayakan, beban dan pertindihan jadual sebelum menyimpan.</p>
   <p id="fi56-official-state" role="status"></p>
   <label>Guru pengganti<select id="fi56-official-staff"></select></label><div id="fi60-official-info" class="fi-v60-manual-info"></div>
   <label>Catatan sebab<textarea id="fi56-official-reason" rows="3" maxlength="300" placeholder="Sebab perlu agihan manual..."></textarea></label>
   <div class="fi-v56-dialog-actions"><button id="fi56-official-cancel" type="button" class="btn muted">Batal</button>
   <button id="fi56-official-save" type="button" class="btn">Sahkan Agihan</button></div></div>`;
  document.body.append(node);
  qs('fi56-official-cancel').addEventListener('click',()=>{node.hidden=true;});
  qs('fi56-official-save').addEventListener('click',save);qs('fi56-official-staff').addEventListener('change',updateInfo);
  return node;
 }
 async function open(id){if(!authorized())return;
  chosen=id;chosenDate=qs('view-date').value;const dlg=dialog();dlg.hidden=false;qs('fi56-official-state').textContent='Menyemak senarai guru layak…';
  qs('fi56-official-save').disabled=true;
  try{const res=await api('relief56ManualCandidates',{date:chosenDate,reliefId:id});
   const options=Array.isArray(res.candidates)?res.candidates:[];candidates=options;
   qs('fi56-official-staff').innerHTML=options.length?options.map(x=>
    `<option value="${esc56(x.staffId)}">${esc56(x.name)} · ${esc56(formula(x,false))} → ${esc56(x.bebanSelepas)} waktu · ${esc56(x.mode)}</option>`).join(''):'<option value="">Tiada guru layak</option>';
   qs('fi56-official-state').textContent=options.length?options.length+' calon · Manual Tahap '+options[0].manualTier+(options[0].manualTier===2?' · Tiada calon Tahap 1; maksimum 8 waktu, 3 berturut-turut.':' · Maksimum 7 waktu / 3 relief.'):'Tiada calon di kedua-dua tahap';updateInfo();
   qs('fi56-official-save').disabled=!options.length;
  }catch(e){qs('fi56-official-state').textContent='Gagal: '+(e?.message||String(e));}
 }
 async function save(){const id=chosen,reason=qs('fi56-official-reason').value.trim(),staffId=qs('fi56-official-staff').value;
  if(reason.length<8){qs('fi56-official-state').textContent='Sebab sekurang-kurangnya 8 aksara.';return;}
  if(!staffId||!id||chosenDate!==qs('view-date').value)return;
  if(!confirm('Sahkan agihan manual Tahap '+(candidates[0]?.manualTier||1)+' bagi slot yang belum terisi ini?'))return;
  const b=qs('fi56-official-save');b.disabled=true;
  try{const result=await api('relief56ManualAssign',{date:chosenDate,reliefId:id,staffId,reason});
   qs('fi56-official-modal').hidden=true;
   if(typeof warn==='function')warn('Manual Backup berjaya: '+(result.replacementName||staffId)+'. Jadual PWA akan dikemas kini.');
  }catch(e){qs('fi56-official-state').textContent='Gagal: '+(e?.message||String(e));}
  finally{b.disabled=false;}
 }
 function setup(){const host=qs('daily-list');if(!host)return;
  host.addEventListener('click',e=>{const b=e.target.closest('[data-fi56-manual]');if(b)open(b.dataset.fi56Manual);});
  const obs=new MutationObserver(display);obs.observe(host,{childList:true});display();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();

;

/* ===== MERGED: Fi-eReliefGuru-PWA-V66.js ===== */
'use strict';
/* SeMAKMUR Smart e-Relief V6.6 — lapisan paparan responsif sahaja.
 * Firestore, API, e-Relief V6.0, bridge V5.5.4 dan hak pengguna kekal.
 */
(function(){
  const ID='fi-v66-date';
  const byId=id=>document.getElementById(id);
  const html=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mobile=()=>window.matchMedia('(max-width:767px)').matches && document.body.classList.contains('is-embed');
  const slot=x=>{
    const period=Number(x.periodNo);
    if(Number.isFinite(period)&&period>0)return String(period);
    const m=String(x.slotId||'').match(/SLOT[-_]0*(\d+)$/i);
    return m?String(Number(m[1])):'—';
  };
  const time=x=>String(x||'').replace(':','.');
  const names=x=>Array.isArray(x.originalNames)&&x.originalNames.length?x.originalNames.filter(Boolean).join(' / '):'Guru tidak hadir';
  const valid=x=>!['DIBATALKAN','DIBATALKAN_GPK'].includes(String(x.status||''));
  const sortRows=(a,b)=>String(a.from||'').localeCompare(String(b.from||''),'ms')||Number(slot(a))-Number(slot(b))||String(a.classId||'').localeCompare(String(b.classId||''),'ms');
  const fmtDate=val=>{
    const m=String(val||'').match(/^(\d{4})-(\d\d)-(\d\d)$/);
    if(!m)return val||'';
    return new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(+m[1],+m[2]-1,+m[3])));
  };

  let openId='';
  let returnTab='jadual';
  let lastListScroll=0;
  function allRows(){try{return typeof rows!=='undefined'&&Array.isArray(rows)?rows:[];}catch(_){return [];}}
  function isPublished(){try{return schedulePublished===true;}catch(_){return false;}}
  function dateValue(){return byId('view-date')?.value||'';}
  function today(){try{return dateMY();}catch(_){return ''}}
  function renderList(){
    if(!mobile())return;
    const box=byId('fi-v66-mobile-list'),title=byId('fi-v66-day-title'),date=byId(ID);
    if(!box)return;
    const selected=dateValue();
    if(date&&selected&&date.value!==selected)date.value=selected;
    if(title)title.textContent=selected===today()?'Jadual Relief Hari Ini':'Jadual Relief · '+fmtDate(selected);
    if(!isPublished()){
      box.innerHTML='<p class="empty">Jadual relief belum diterbitkan untuk tarikh ini.</p>';
      return;
    }
    const active=allRows().filter(valid);
    if(!active.length){box.innerHTML='<p class="empty">Tiada tugasan relief untuk tarikh ini.</p>';return;}
    const groups=new Map();
    for(const item of active){
      const key=names(item);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(item);
    }
    const ordered=[...groups].sort((a,b)=>a[0].localeCompare(b[0],'ms',{sensitivity:'base'}));
    box.innerHTML=ordered.map(([name,items])=>`<section class="fi-v66-group" aria-label="Guru asal ${html(name)}">
      <div class="fi-v66-group-title">${html(name)}</div>
      ${items.sort(sortRows).map(item=>{
        const replacement=item.replacementName||(['PERLU_SERAH_TUGAS'].includes(item.status)?'Perlu serah tugas':'Belum diagih');
        const unfilled=!item.replacementName;
        return `<button type="button" class="fi-v66-row" data-fi66-id="${html(item.id)}" aria-label="Audit agihan ${html(item.subject||'')} ${html(item.classId||'')} waktu ${html(slot(item))}, guru ganti ${html(replacement)}">
          <span class="fi-v66-cell"><strong>${html(item.subject||'—')}</strong><small>${html(item.classId||'')}</small></span>
          <span class="fi-v66-cell"><strong>Waktu ${html(slot(item))}</strong><small>${html(time(item.from))}–${html(time(item.to))}</small></span>
          <span class="fi-v66-cell fi-v66-replacement${unfilled?' fi-v66-unfilled':''}"><strong>${html(replacement)}</strong></span>
          <span class="fi-v66-chevron" aria-hidden="true">›</span>
        </button>`;
      }).join('')}
    </section>`).join('');
  }
  function tag(value){return `<span class="fi-v66-audit-tag">${html(value)}</span>`;}
  function metric(label,value){return `<div class="fi-v66-audit-item"><small>${html(label)}</small><strong>${html(value??'—')}</strong></div>`;}
  function listSlots(a){return Array.isArray(a)&&a.length?a.map(String).map(tag).join(''):'—';}
  function auditHtml(record){
    if(!record)return '<div class="fi-v66-detail-empty">Rekod agihan tidak lagi tersedia untuk tarikh ini.</div>';
    const a=record.auditSummary||null;
    const teacher=names(record),replace=record.replacementName||'Belum diagih';
    const status=String(record.status||'—');
    const warning=/TIADA|PERLU/.test(status);
    const fields=`<div class="fi-v66-audit-card"><h3>Maklumat Tugasan</h3><div class="fi-v66-audit-grid">
       ${metric('Guru asal',teacher)}${metric('Guru ganti / penerus',replace)}
       ${metric('Subjek',record.subject)}${metric('Kelas',record.classId)}
       ${metric('Waktu','Waktu '+slot(record))}${metric('Masa',time(record.from)+'–'+time(record.to))}
       ${metric('Kaedah',record.assignmentMode||'—')}${metric('Status',status)}
       ${metric('Fasa',record.phase||'UTAMA')}${metric('Pelaksanaan',record.completed?'Disahkan guru':'Belum disahkan')}
       ${record.manualTier?metric('Manual Backup','Tahap '+record.manualTier):''}
      </div></div>`;
    let extra='';
    if(a){
      const pairing=Number(a.pairingPecah||0);
      const total=(a.totalSelepas??'—');
      extra=`<div class="fi-v66-audit-card"><h3>Audit Beban Guru</h3><div class="fi-v66-audit-grid">
         ${metric('Waktu hakiki',a.hakiki??'—')}${metric('Pecah pairing',pairing)}
         ${metric('Relief selepas agihan',a.reliefSelepas??'—')}${metric('Beban selepas',total+' waktu')}
         ${metric('Had harian',a.hadHarian!=null?a.hadHarian+' waktu':'—')}
         ${metric('Berturut-turut',(a.berturutSelepas??'—')+' / '+(a.hadBerturut??'—'))}
         ${metric('Relief minggu sebelum dipilih',a.reliefMingguSebelum??'—')}${metric('Pusingan',a.pusingan||'—')}
       </div></div>
       <div class="fi-v66-audit-card"><h3>Butiran Jadual</h3>
         <div class="fi-v66-audit-full"><strong>Hakiki asal</strong><div class="fi-v66-audit-list">${listSlots(a.slotsHakikiW?.length?a.slotsHakikiW:a.slotsHakiki)}</div></div>
         <div class="fi-v66-audit-full"><strong>Relief diberikan</strong><div class="fi-v66-audit-list">${listSlots(a.slotsReliefW)}</div></div>
         ${pairing?`<div class="fi-v66-audit-full"><strong>Pairing dipecahkan</strong><div class="fi-v66-audit-list">${listSlots(a.slotsPecahW)}</div></div>`:''}
       </div>
       <div class="fi-v66-audit-card"><h3>Keputusan Audit</h3><div class="fi-v66-audit-full">${html(a.keputusan||'—')}</div></div>`;
    }else{
      extra='<div class="fi-v66-detail-empty">Audit beban belum tersedia bagi slot yang belum diagihkan.</div>';
    }
    let actions='';
    try{
      if(record.status==='DIAGIH'&&!record.completed&&record.replacementUid===user?.uid)
        actions+=`<button type="button" data-fi66-confirm="${html(record.id)}">Sahkan selepas PdPc</button>`;
      if(record.status==='DIAGIH'&&Array.isArray(roles)&&roles.includes('GPK'))
        actions+=`<button type="button" data-fi66-cancel="${html(record.id)}">Batal relief (jika tidak perlu)</button>`;
    }catch(_){}
    return `<button type="button" class="fi-v66-back" id="fi-v66-back" aria-label="Kembali ke jadual relief">← Kembali</button>
      <h2 class="fi-v66-audit-title">Audit Agihan</h2>
      <p class="fi-v66-audit-sub">${html(teacher)} · ${html(fmtDate(dateValue()))}</p>
      ${fields}${extra}${actions?`<div class="fi-v66-audit-actions">${actions}</div>`:''}`;
  }
  function renderAudit(){
    if(!openId||!mobile())return;
    const root=byId('fi-v66-detail');if(!root)return;
    root.innerHTML=auditHtml(allRows().find(x=>String(x.id)===openId&&valid(x)));
  }
  function enterAudit(id,withHistory){
    if(!mobile())return;
    const record=allRows().find(x=>String(x.id)===String(id)&&valid(x));
    if(!record)return;
    if(!openId){lastListScroll=window.scrollY||0;returnTab=document.querySelector('.tabs button.active')?.dataset.tab||'jadual';}
    openId=String(record.id);
    if(withHistory){
      const url=new URL(window.location.href);url.searchParams.set('fiAudit',openId);
      window.history.pushState({fi66ReliefAudit:openId,fi66FromTab:returnTab},'',url.pathname+url.search+url.hash);
    }
    const bar=byId('fi-v66-datebar'),tabs=document.querySelector('.tabs');
    if(bar)bar.hidden=true;if(tabs)tabs.hidden=true;
    document.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!=='audit');
    document.body.classList.add('fi-v66-audit-open');renderAudit();window.scrollTo(0,0);
  }
  function exitAudit(){
    if(!openId)return;
    openId='';document.body.classList.remove('fi-v66-audit-open');
    const bar=byId('fi-v66-datebar'),tabs=document.querySelector('.tabs');
    if(bar)bar.hidden=false;if(tabs)tabs.hidden=false;
    if(typeof currentTab==='function')currentTab(returnTab);
    else document.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!==returnTab);
    window.scrollTo(0,lastListScroll);
  }
  function back(){
    if(!openId)return;
    if(window.history.state?.fi66ReliefAudit)window.history.back();
    else exitAudit();
  }
  function install(){
    const date=byId(ID),originalDate=byId('view-date'),list=byId('fi-v66-mobile-list'),detail=byId('fi-v66-detail');
    if(!date||!originalDate||!list||!detail)return;
    date.value=originalDate.value;
    date.addEventListener('change',()=>{
      if(date.value&&date.value!==originalDate.value){originalDate.value=date.value;originalDate.dispatchEvent(new Event('change',{bubbles:true}));}
    });
    list.addEventListener('click',event=>{
      const button=event.target.closest('button[data-fi66-id]');
      if(button)enterAudit(button.dataset.fi66Id,true);
    });
    detail.addEventListener('click',event=>{
      if(event.target.closest('#fi-v66-back')){back();return;}
      const yes=event.target.closest('[data-fi66-confirm]');
      if(yes&&typeof confirmRelief==='function'){confirmRelief(yes.dataset.fi66Confirm);return;}
      const no=event.target.closest('[data-fi66-cancel]');
      if(no&&typeof cancelSlot==='function')cancelSlot(no.dataset.fi66Cancel);
    });
    window.addEventListener('popstate',event=>{
      const id=event.state?.fi66ReliefAudit||'';
      if(id){enterAudit(id,false)}else exitAudit();
    });
    window.addEventListener('message',event=>{
      if(event.origin!==window.location.origin||event.source!==window.parent)return;
      if(event.data?.type==='semakmur-relief-audit-back')back();
    });
    /* Patch hanya fungsi paparan. Pendengar onSnapshot dan kawalan backend asal tidak ditukar. */
    if(typeof draw==='function'){
      const stableDraw=draw;
      draw=function(...args){
        const result=stableDraw.apply(this,args);
        renderList();renderAudit();
        return result;
      };
    }
    renderList();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

;
