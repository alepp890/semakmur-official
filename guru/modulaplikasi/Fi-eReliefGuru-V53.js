'use strict';
/* SeMAKMUR Smart e-Relief V5.5 — Makmal Mingguan desktop sahaja.
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
  const buttons=['sim53-generate','sim53-apply-cancel','sim53-apply-emergency','sim53-reload-leaves','sim53-refresh'];
  buttons.forEach(id=>{if(el(id))el(id).disabled=true});
  message(label);const stop=bridge()?.begin(label)||(()=>{});
  try{const ret=await fn();if(!state.week?.warning)message('Selesai. Makmal sedia untuk diteruskan.');return ret;}
  catch(e){message(e?.message||String(e),true);return null;}
  finally{stop();state.busy=false;buttons.forEach(id=>{if(el(id))el(id).disabled=false});}
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
  const valid=Number(a.totalSelepas)<=Number(a.hadHarian)&&(!limit||max<=limit);
  const others=(a.calonAlternatif||[]).map(t=>`${t.nama}: ${t.hakiki}H, ${t.reliefHari}R (minggu ${t.reliefMinggu}R)`).join(' · ');
  return `<details class="fi-v55-audit-row"><summary>Audit Agihan · ${esc(valid?'Lulus had jadual':'Perlu semakan')} · ${esc(a.hakiki)}H + ${esc(a.reliefSelepas)}R = ${esc(a.totalSelepas)} waktu</summary>
   <div class="fi-v55-audit-grid"><span>Hakiki asal<strong>${esc((a.slotsHakiki||[]).join(', ')||'0 waktu')}</strong></span>
   <span>Relief slot<strong>${esc(r.slotId)} (${esc(r.from)}–${esc(r.to)})</strong></span>
   <span>Beban selepas<strong>${esc(a.hakiki)}H + ${esc(a.reliefSelepas)}R = ${esc(a.totalSelepas)} waktu</strong></span>
   <span>Had maksimum<strong>${esc(a.hadHarian)} waktu sehari</strong></span>
   <span>Berturut-turut<strong>${esc(max)} / ${esc(limit||'Belum dinilai')} waktu</strong></span>
   <span>Relief minggu sebelum dipilih<strong>${esc(a.reliefMingguSebelum||0)}</strong></span>
   <span>Pusingan<strong>${esc(a.pusingan||'—')}</strong></span>
   <span>Calon layak dalam pusingan<strong>${esc(a.calonLayakPusingan||0)}</strong></span></div>
   ${others?`<p class="fi-v55-audit-note"><b>Contoh alternatif pusingan sama:</b> ${esc(others)}</p>`:''}
   <p class="fi-v55-audit-note">Audit menunjukkan pematuhan syarat pada masa dipilih, bukan bukti optimum global atau pengesahan telah mengajar.</p></details>`;
 }
 function renderCards(rows,date){if(!rows?.length)return '<p class="empty">Belum ada waktu yang memerlukan relief pada tarikh ini.</p>';
  const map=new Map();rows.forEach(r=>{const names=(r.originalNames||[]);
   const abs=(r.absentTeacherIds||[]).map(id=>names[(r.allTeachers||[]).indexOf(id)]||id);
   const name=r.status==='PAIRING_DITERUSKAN'&&abs.length?abs.join(' / '):(names.join(' / ')||'Guru asal');
   if(!map.has(name))map.set(name,[]);map.get(name).push(r);});
  return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ms')).map(([name,items])=>
   `<section class="relief-group-block"><h3>GURU ASAL · ${esc(name)}</h3>`+
   items.sort((a,b)=>a.from.localeCompare(b.from)).map(r=>{
    const label=r.status==='PAIRING_DITERUSKAN'?'Hakiki kekal · 0 Relief tambahan':r.audit?`${r.audit.hakiki} Hakiki + ${r.audit.reliefSelepas} Relief`:teacherLoadText(r.replacementId,date);
    const status=r.status==='PAIRING_DITERUSKAN'?'PAIRING DITERUSKAN':r.status==='DIBATALKAN_SIM'?'Cuti dibatalkan':r.status==='PERLU_SERAH_TUGAS'?'PERLU SERAH TUGAS':
     r.status==='TIADA_GANTI'?'TIADA GANTI':r.assignmentMode==='PECAH_PAIRING'?'PECAH PAIRING':r.assignmentMode||'—';
    return `<div class="relief-group-line ${r.status==='PAIRING_DITERUSKAN'?'fi-v54-pairing-continued':''} ${r.status==='DIBATALKAN_SIM'?'fi-v53-cancelled':''}">
      <div class="relief-when"><strong>${esc(shortTime(r))}</strong><small>${esc(r.from)}–${esc(r.to)}</small></div>
      <div class="relief-detail"><strong>${esc(r.subject)}</strong><small>${esc(r.classId)}</small></div>
      <div class="relief-replacement"><span>${r.status==='PAIRING_DITERUSKAN'?'Guru meneruskan kelas':'Guru ganti'}</span><strong>${esc(r.status==='PAIRING_DITERUSKAN'?(r.continuingNames||[]).join(' / '):r.replacementName||'Belum diagih')}</strong>
       <small>${esc(label||'—')}</small>${r.status==='PAIRING_DITERUSKAN'?`<small>Cuti: ${esc((r.absentTeacherIds||[]).map(id=>((r.allTeachers||[]).indexOf(id)>=0?(r.originalNames||[])[(r.allTeachers||[]).indexOf(id)]:id)).join(' / '))}</small>`:''}${r.proposedReplacementName?`<small>Cadangan serah tugas: ${esc(r.proposedReplacementName)}</small>`:''}</div>
      <div class="relief-status"><span class="fi-v53-state ${r.status==='PERLU_SERAH_TUGAS'?'is-handover':''}">${esc(status)}</span></div>
      ${auditDetails(r)}
    </div>`;
   }).join('')+'</section>').join('');
 }
 function renderDays(){const week=state.week;if(!week)return;
  el('sim53-week-title').textContent=`Minggu ${week.weekStart} hingga ${week.weekEnd}`;
  el('sim53-totals').textContent=`${week.totals.generatedDays}/5 hari · ${week.totals.assigned} relief · ${week.totals.pairing} pecah pairing · ${week.totals.continued||0} pairing diteruskan`;
  el('sim53-days').innerHTML=week.days.length?week.days.map(d=>`<button type="button" class="fi-v53-day" data-open-day="${esc(d.date)}"
   aria-pressed="${d.date===selectedDate()}">${esc(d.date)} <strong>${Number(d.summary?.diagih||0)} relief</strong>${d.policyVersion!=='V5.5-MAKMAL'?'<small>Versi lama · perlu jana semula</small>':''}</button>`).join(''):
   '<p class="empty">Minggu ini belum mempunyai simulasi. Jana satu hari untuk bermula.</p>';
 }
 function renderWeekly(){const w=state.week;if(!w)return;
  const dates=[0,1,2,3,4].map(i=>{const d=new Date(w.weekStart+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
  const suffix=d=>d?`${d.hakiki}H${d.pairing?` −${d.pairing}P`:''}${d.relief?` +${d.relief}R`:''}`:'—';
  el('sim53-week-stats').innerHTML=`<table class="fi-v53-stat-table"><thead><tr><th>Guru</th><th>Kategori_Staf</th>
   ${dates.map(d=>`<th>${esc(['Isn','Sel','Rab','Kha','Jum'][dates.indexOf(d)])}<small>${esc(d.slice(8))}</small></th>`).join('')}
   <th>Relief minggu</th><th>Pecah pairing</th></tr></thead><tbody>
   ${(w.staff||[]).map(s=>`<tr><td><strong>${esc(s.name)}</strong></td><td>${esc(s.category)}</td>
    ${dates.map(d=>`<td>${esc(suffix(s.daily?.[d]))}</td>`).join('')}
    <td><strong>${s.totalRelief}</strong></td><td>${s.totalPairing}</td></tr>`).join('')}</tbody></table>
   <small class="fi-v53-footnote">H = Hakiki, R = Relief tambahan, P = Pecah Pairing. “—” bermaksud hari belum dijana, bukan guru mempunyai 0 waktu. Jumlah adalah simulasi, bukan rasmi.</small>`;
 }
 function renderEvents(day){const canceled=new Set((day?.events||[]).filter(e=>e.kind==='CANCEL').map(e=>e.targetKey));
  const targets=[...(day?.cases||[]).map(c=>({key:c.key,staffId:c.staffId,name:c.name,type:c.type})),
   ...(day?.events||[]).filter(e=>e.kind==='EMERGENCY').map(e=>({key:e.key,staffId:e.staffId,name:e.name,type:'Kecemasan'}))]
   .filter(c=>!canceled.has(c.key));
  el('sim53-cancel-target').innerHTML=targets.length?targets.map(c=>`<option value="${esc(c.key)}">${esc(c.name)} · ${esc(c.type)}</option>`).join(''):
   '<option value="">Tiada cuti aktif untuk dibatalkan</option>';
  el('sim53-events').innerHTML=(day?.events||[]).map(e=>`<div class="fi-v53-event-record">${esc(e.at)} · ${esc(e.kind==='CANCEL'?'Batal cuti':'Kecemasan')}: ${esc(e.name)}</div>`).join('');
  el('sim53-apply-cancel').disabled=!day||!targets.length;
  el('sim53-apply-emergency').disabled=!day;
 }
 function renderSelected(){const day=currentDay();renderEvents(day);
  if(!day){el('sim53-day-results').innerHTML='<p class="empty">Tarikh ini belum dijana. Pilih rekod cuti dan klik Jana agihan hari terpilih.</p>';
   el('sim53-day-summary').textContent='Tiada keputusan';return;}
  const s=day.summary||{};
  el('sim53-day-summary').textContent=`${s.diagih||0} diagih · ${s.pairingDiteruskan||0} pairing diteruskan · ${s.dipulihkan||0} jadual dipulihkan · ${s.tiada||0} tiada ganti · ${s.handover||0} perlu serah tugas`;
  const grouped=(day.eventTimeline||[]).map(ev=>{
   const c=(day.changes||[]).filter(x=>x.eventKey===ev.eventKey);
   return `<details open class="fi-v53-changes"><summary>${esc(ev.at)} · ${esc(ev.kind==='CANCEL'?'Batal cuti':'Kecemasan')}: ${esc(ev.name)} (${c.length} perubahan)</summary>
    ${c.length?`<div class="fi-v53-table-scroll"><table><thead><tr><th>Slot / Masa</th><th>Kelas</th><th>Jenis perubahan</th><th>Sebelum</th><th>Selepas</th></tr></thead><tbody>
    ${c.map(x=>`<tr><td>${esc(x.slotId)} · ${esc(x.time)}</td><td>${esc(x.classId)}</td><td>${esc(x.type.replace(/_/g,' '))}</td><td>${esc(x.old)}</td><td>${esc(x.new)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted-note">Tiada perubahan pada agihan aktif.</p>'}</details>`;
  }).join('');
  const restored=(day.historyRows||[]).length?`<details open class="fi-v53-changes"><summary>Jadual asal dipulihkan (${day.historyRows.length}) — bukan relief</summary>
   ${renderCards(day.historyRows,day.date)}</details>`:'';
  el('sim53-day-results').innerHTML=`<h3 class="fi-v53-final-title">Jadual aktif selepas perubahan (SIMULASI)</h3>
   ${renderCards(day.rows||[],day.date)}${restored}
   <details class="fi-v53-snapshot"><summary>Agihan asal 7.25 pagi (${day.mainRows?.length||0} rekod) — sejarah asal</summary>
   ${renderCards(day.mainRows||[],day.date)}</details>
   <h3 class="fi-v53-final-title">Kronologi pembatalan cuti / kecemasan</h3>
   ${grouped||'<p class="muted-note">Tiada perubahan selepas agihan utama.</p>'}
   <p class="fi-v55-audit-note">Makmal sahaja: tidak menulis rekod rasmi, tidak menghantar notifikasi dan tidak mengesahkan serah tugas.</p>`;
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
 async function generate(){if(!selectedDate())return message('Pilih tarikh.',true);
  const ids=selectedCaseKeys(),replace=el('sim53-replace-day').checked;
  if(!ids.length&&!state.draft.length)return message('Pilih rekod cuti atau tambah senario cuti.',true);
  if(replace&&!confirm('Ganti snapshot Makmal bagi tarikh ini? Agihan utama dan senario terdahulu bagi hari ini akan diganti.'))return;
  await withBusy('Menjana agihan berdasarkan cuti dan sejarah relief mingguan…',async()=>{
   const data=await call('relief53SaveDay',{date:selectedDate(),leaveIds:ids,
    testCases:state.draft.map(x=>({staffId:x.staffId,type:x.type,from:x.from,to:x.to})),replaceDay:replace});
   renderWeek(data);el('sim53-replace-day').checked=false;
  });
 }
 async function eventCall(payload){const date=selectedDate();if(!currentDay())return message('Jana agihan utama dahulu.',true);
  await withBusy('Menguji kejadian susulan tanpa menukar agihan rasmi…',async()=>{
   const data=await call('relief53Event',{date,...payload});renderWeek(data);
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
