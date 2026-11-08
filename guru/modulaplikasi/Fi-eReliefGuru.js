'use strict';
/* SeMAKMUR Smart e-Relief V5.1 — menggunakan Firebase login Fi; tiada data palsu. */
const $=id=>document.getElementById(id),esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateMY=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let user=null,auth=null,db=null,roles=[],stop=null,rows=[],report=null,staff=[],fns=null,day='',schedulePublished=false,staffLoading=false;
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
   <td>${esc(x.assignmentMode)}${x.phase==='BACKUP'?' · Backup':''}</td><td>${badge(x.completed?'DISAH GURU':x.status)}</td>`;
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
function listenDate(date){day=date;$('view-date').value=date;if(stop)stop();rows=[];schedulePublished=false;draw();
 stop=fns.onSnapshot(fns.doc(db,'semakmur_fi_relief_public_harian',date),snap=>{
  schedulePublished=!!(snap.exists()&&snap.data().published===true);
  rows=schedulePublished&&Array.isArray(snap.data().rows)?snap.data().rows:[];
  $('published').textContent=schedulePublished?'Jadual diterbitkan':'Belum diterbitkan';warn('');draw();
 },e=>{schedulePublished=false;warn('Gagal membaca jadual Firestore: '+(e.code||e.message),true);rows=[];draw();});
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
 if(!auth?.currentUser)throw Error('Log masuk diperlukan.');const url=await endpoint(),idToken=await auth.currentUser.getIdToken(true);
 const nonce=globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random().toString(36).slice(2);
 return new Promise((resolve,reject)=>{
  const iframe=document.createElement('iframe');iframe.hidden=true;iframe.name='r51-'+nonce;
  iframe.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin');
  const form=document.createElement('form');form.method='POST';form.action=url;form.target=iframe.name;form.hidden=true;
  const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify({action,nonce,idToken,...rest});form.append(input);
  let done=false;const finish=()=>{clearTimeout(timer);window.removeEventListener('message',received);form.remove();iframe.remove();};
  // Apps Script HtmlService may reply from the sandbox hostname
  // n-<id>-script.googleusercontent.com, not only *.script.googleusercontent.com.
  // Keep an origin allowlist and the per-request nonce; do not accept opaque ('null') origins.
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
    console.warn('[SeMAKMUR FiBridge] Respons pada origin tidak dibenarkan:',e.origin);
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
async function loadStaff(){
 if(staffLoading)return;
 staffLoading=true;staff=[];
 $('generate-simulation').disabled=true;
 $('reload-sim-staff').disabled=true;
 $('absent-staff').innerHTML='';$('emergency-staff').innerHTML='';
 staffStatus('Memuatkan senarai guru daripada Firestore…');
 try{
  if(!user || !roles.includes('ADMIN_SISTEM'))throw Error('Akses Makmal Admin memerlukan peranan ADMIN_SISTEM.');
  if(!fns?.getDocFromServer||!db)throw Error('Sambungan Firestore belum tersedia.');
  const snap=await fns.getDocFromServer(fns.doc(db,'semakmur_fi_relief_staf','active'));
  if(!snap.exists())throw Error('Dokumen semakmur_fi_relief_staf/active belum wujud. Jalankan penyelarasan roster daripada Master_Staf di backend.');
  const source=snap.data()?.staff;
  if(!Array.isArray(source)||!source.length)throw Error('Roster Firestore kosong. Semak penyelarasan semakmur_fi_relief_staf/active.');
  staff=source
   .map(x=>({id:String(x?.idStaf||'').trim(),name:String(x?.name||'').trim(),category:String(x?.category||x?.kategori||'—').trim()}))
   .filter(x=>x.id&&x.name);
  // Gandaan ID boleh berlaku semasa sync roster; paparkan setiap guru sekali sahaja.
  staff=[...new Map(staff.map(x=>[x.id,x])).values()];
  if(!staff.length)throw Error('Roster tidak mempunyai medan idStaf dan name yang sah.');
  staff.sort((a,b)=>a.name.localeCompare(b.name,'ms'));
  $('absent-staff').innerHTML=staffOptions(staff);
  $('emergency-staff').innerHTML=staffOptions(staff);
  $('generate-simulation').disabled=false;
  staffStatus(staff.length+' guru tersedia daripada Firestore untuk simulasi. Sahkan roster sepadan dengan Master_Staf.','success');
 }catch(e){
  console.error('[SeMAKMUR V5.1.4] Makmal Admin: roster Firestore gagal dibaca',e);
  const info=e?.code==='permission-denied'
   ?'Akses Firestore ditolak. Semak profil aktif dan dokumen peranan ADMIN_SISTEM.'
   :(e?.message||String(e));
  staffStatus('Senarai guru GAGAL dibaca daripada Firestore: '+info,'error');
 }finally{staffLoading=false;$('reload-sim-staff').disabled=false;}
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
 authmod.onAuthStateChanged(auth,async u=>{if(stop)stop();if(!u){user=null;roles=[];warn('Sila log masuk semula melalui Dashboard Guru.',true);return;}
  try{const profile=await fire.getDoc(fire.doc(db,'semakmur_dashboard_fi',u.uid));if(!profile.exists()||profile.data().active!==true||profile.data().ownerEmail?.toLowerCase()!==u.email.toLowerCase())throw Error('Profil guru tidak aktif.');
   user=u;const rt=await fire.getDoc(fire.doc(db,'semakmur_fi_keberadaan_roles',u.uid));roles=rt.exists()&&rt.data().active===true?rt.data().roles||[]:[];
   $('account').textContent=profile.data().profile?.namaSamaran||u.email;
   $('tab-statistik').hidden=!roles.some(r=>['GPK','GB','ADMIN_SISTEM'].includes(r));
   $('tab-makmal').hidden=!roles.includes('ADMIN_SISTEM');
   if(roles.includes('ADMIN_SISTEM')){loadStaff();}else{staffStatus('Makmal Admin memerlukan peranan ADMIN_SISTEM.');}listenDate($('view-date').value);
  }catch(e){warn('Akses ditolak: '+e.message,true);}
 });
}
function init(){if(new URLSearchParams(location.search).get('embed')==='1')document.body.classList.add('is-embed');const today=dateMY();$('view-date').value=today;$('sim-date').value=today;$('stat-month').value=today.slice(0,7);
 document.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>currentTab(el.dataset.tab)));
 $('view-date').addEventListener('change',()=>{if(user)listenDate($('view-date').value)});
 $('refresh').addEventListener('click',()=>{if(user)listenDate($('view-date').value)});
 $('generate-simulation').addEventListener('click',simulate);$('reload-sim-staff').addEventListener('click',loadStaff);$('test-fi-connection').addEventListener('click',testFiConnection);
 $('clear-simulation').addEventListener('click',()=>{$('absent-staff').selectedIndex=-1;$('emergency-staff').selectedIndex=-1;$('sim-results').innerHTML='<p class="empty">Pilihan dikosongkan.</p>'});
 $('load-stats').addEventListener('click',stats);$('csv-stats').addEventListener('click',csv);$('print-stats').addEventListener('click',()=>window.print());
 $('daily-list').addEventListener('click',e=>{const b=e.target.closest('button.cancel-slot');if(b)cancelSlot(b.dataset.id)});
 $('my-list').addEventListener('click',e=>{const b=e.target.closest('button.confirm');if(b)confirmRelief(b.dataset.id)});
 start().catch(e=>warn(e.message,true));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
