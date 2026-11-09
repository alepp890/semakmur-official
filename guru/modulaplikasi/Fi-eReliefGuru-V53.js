'use strict';
/* SeMAKMUR Smart e-Relief V5.3 — Makmal Mingguan desktop sahaja.
 * Modul relief rasmi & PWA sedia ada kekal. Semua mutasi di backend ADMIN_SISTEM.
 */
(()=>{
 const el=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bridge=()=>window.SeMAKMURReliefStudioBridge;
 const state={week:null,leaves:[],staff:[],draft:[],busy:false,initialized:false};
 const shortTime=x=>x?.periodNo?`Waktu ${x.periodNo}`:String(x?.slotId||'').replace(/^.*SLOT-0*/,'Slot ');
 const message=(text,error=false)=>{const v=el('sim53-week-status');if(!v)return;
  v.textContent=text;v.classList.toggle('fi-v53-error',error);};
 const selectedDate=()=>el('sim53-date')?.value||'';
 const staffOpt=(list)=>list.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} (${esc(s.category||'—')})</option>`).join('');
 function isDesktop(){return document.body.classList.contains('fi-host-desktop');}
 function ensure(){if(!bridge()?.isAdmin())throw Error('Sila log masuk sebagai ADMIN_SISTEM terlebih dahulu.');}
 async function call(action,payload={}){ensure();return bridge().api(action,payload);}
 async function withBusy(label,fn){if(state.busy)return;state.busy=true;
  const buttons=['sim53-generate','sim53-apply-cancel','sim53-apply-emergency','sim53-reload-leaves','sim53-refresh'];
  buttons.forEach(id=>{if(el(id))el(id).disabled=true});
  message(label);const stop=bridge()?.begin(label)||(()=>{});
  try{const ret=await fn();if(!state.week?.warning)message('Selesai. Rekod ujian disimpan dan statistik minggu telah dikemas kini.');return ret;}
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
  const options=staffOpt(state.staff);
  el('sim53-staff').innerHTML=options;el('sim53-emergency-staff').innerHTML=options;
 }
 async function loadLeaves(){const date=selectedDate();if(!date)return;
  const res=await call('relief53LeaveList',{date});
  state.leaves=Array.isArray(res.leaveRecords)?res.leaveRecords:[];
  state.staff=Array.isArray(res.staff)?res.staff:[];
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
 function renderCards(rows,date){if(!rows?.length)return '<p class="empty">Belum ada waktu yang memerlukan relief pada tarikh ini.</p>';
  const map=new Map();rows.forEach(r=>{const name=(r.originalNames||[]).join(' / ')||'Guru asal';
   if(!map.has(name))map.set(name,[]);map.get(name).push(r);});
  return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ms')).map(([name,items])=>
   `<section class="relief-group-block"><h3>GURU ASAL · ${esc(name)}</h3>`+
   items.sort((a,b)=>a.from.localeCompare(b.from)).map(r=>{
    const label=teacherLoadText(r.replacementId,date);
    const status=r.status==='DIBATALKAN_SIM'?'Cuti dibatalkan':r.status==='PERLU_SERAH_TUGAS'?'PERLU SERAH TUGAS':
     r.status==='TIADA_GANTI'?'TIADA GANTI':r.assignmentMode==='PECAH_PAIRING'?'PECAH PAIRING':r.assignmentMode||'—';
    return `<div class="relief-group-line ${r.status==='DIBATALKAN_SIM'?'fi-v53-cancelled':''}">
      <div class="relief-when"><strong>${esc(shortTime(r))}</strong><small>${esc(r.from)}–${esc(r.to)}</small></div>
      <div class="relief-detail"><strong>${esc(r.subject)}</strong><small>${esc(r.classId)}</small></div>
      <div class="relief-replacement"><span>Guru ganti</span><strong>${esc(r.replacementName||'Belum diagih')}</strong>
       <small>${esc(label||'—')}</small>${r.proposedReplacementName?`<small>Cadangan serah tugas: ${esc(r.proposedReplacementName)}</small>`:''}</div>
      <div class="relief-status"><span class="fi-v53-state ${r.status==='PERLU_SERAH_TUGAS'?'is-handover':''}">${esc(status)}</span></div>
    </div>`;
   }).join('')+'</section>').join('');
 }
 function renderDays(){const week=state.week;if(!week)return;
  el('sim53-week-title').textContent=`Minggu ${week.weekStart} hingga ${week.weekEnd}`;
  el('sim53-totals').textContent=`${week.totals.generatedDays}/5 hari · ${week.totals.assigned} relief · ${week.totals.pairing} pecah pairing`;
  el('sim53-days').innerHTML=week.days.length?week.days.map(d=>`<button type="button" class="fi-v53-day" data-open-day="${esc(d.date)}"
   aria-pressed="${d.date===selectedDate()}">${esc(d.date)} <strong>${Number(d.summary?.diagih||0)} relief</strong></button>`).join(''):
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
  const summary=day.summary||{};
  el('sim53-day-summary').textContent=`${summary.diagih||0} diagih · ${summary.tiada||0} tiada ganti · ${summary.handover||0} perlu serah tugas`;
  const changes=(day.changes||[]).length?`<details open class="fi-v53-changes"><summary>Perubahan selepas agihan utama (${day.changes.length})</summary>
   <div class="fi-v53-table-scroll"><table><thead><tr><th>Masa / Slot</th><th>Kelas</th><th>Perubahan</th><th>Guru asal agihan</th><th>Selepas perubahan</th></tr></thead><tbody>
   ${day.changes.map(x=>`<tr><td>${esc(x.time)} · ${esc(x.slotId)}</td><td>${esc(x.classId)}</td><td>${esc(x.type)}</td><td>${esc(x.old)}</td><td>${esc(x.new)}</td></tr>`).join('')}
   </tbody></table></div></details>`:'';
  el('sim53-day-results').innerHTML=`<details class="fi-v53-snapshot"><summary>Agihan asal 7.25 pagi (${day.mainRows?.length||0} slot) — lihat sejarah</summary>
  ${renderCards(day.mainRows,day.date)}</details>${changes}
  <h3 class="fi-v53-final-title">Keputusan akhir selepas perubahan (simulasi)</h3>${renderCards(day.rows,day.date)}`;
 }
 function renderWeek(data){state.week=data;renderDays();renderWeekly();renderSelected();
  if(data.warning)message('PERHATIAN: '+data.warning,true);}
 async function refreshWeek(){const date=selectedDate();if(!date)return;
  const data=await call('relief53WeekGet',{date});renderWeek(data);
 }
 async function loadDate(){state.draft=[];displayDraft();await withBusy('Membaca cuti dan simulasi mingguan…',async()=>{
  await loadLeaves();await refreshWeek();
 });}
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
  el('sim53-date').value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  el('sim53-date').addEventListener('change',loadDate);
  el('sim53-refresh').addEventListener('click',()=>withBusy('Memuatkan statistik minggu…',refreshWeek));
  el('sim53-reload-leaves').addEventListener('click',()=>withBusy('Memuatkan rekod cuti…',loadLeaves));
  el('sim53-generate').addEventListener('click',generate);
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
   if(isDesktop()){loadDate();}
  });
  displayDraft();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
