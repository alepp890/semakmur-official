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
    const label=pairing?'Hakiki kekal · 0 Relief tambahan':restored?'Kedua-dua guru kembali mengajar':
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
  const manualWarnings=day.manualWarnings||[];
  const manualWarningNote=manualWarnings.length?`<p class="fi-v56-optimize-note" style="border-color:#e7b98c;background:#fff8ed;color:#875018">Manual Backup perlu disemak semula: ${esc(manualWarnings.join(' · '))}</p>`:'';
  const optimizer=day.events?.length?day.emergencyOptimization:day.optimization;
  const optimizerLabel=(optimizer?.solver==='MILP'?'Global Optimization':'Smart Reshuffle (fallback)')+(day.events?.length?' Susulan':' Agihan Utama');
  const optimizeNote=optimizer?`<p class="fi-v56-optimize-note">${esc(optimizerLabel)}: ${esc(optimizer.before)} → ${esc(optimizer.after)} slot · +${esc(optimizer.added)} diselamatkan · ${esc(optimizer.changes)} pertukaran · ${esc(optimizer.pairingSplit)} pecah pairing · baki ${esc(optimizer.remaining)}${optimizer.provenMaximum?' · optimum model disahkan':optimizer.limitReached?' · had carian / optimum belum dibuktikan':' · optimum belum dibuktikan'}${optimizer.solverFailure?' · '+esc(optimizer.solverFailure):''}</p>`:'';
  const restored=(day.historyRows||[]).length?`<details open class="fi-v53-changes"><summary>Jadual asal dipulihkan (${day.historyRows.length}) — bukan relief</summary>
   ${renderCards(day.historyRows,day.date)}</details>`:'';
  el('sim53-day-results').innerHTML=`${optimizeNote}${manualWarningNote}<h3 class="fi-v53-final-title">Jadual aktif selepas perubahan (SIMULASI)</h3>
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
 async function generate(){if(!selectedDate())return message('Pilih tarikh.',true);
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
 async function eventCall(payload){const date=selectedDate();if(!currentDay())return message('Jana agihan utama dahulu.',true);
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
