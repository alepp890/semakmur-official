/* ===== MERGED: Fi-KeberadaanGuru-V61.js ===== */
/* Integrated lab UI, no direct Firestore writes. Real identity always checked by backend. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),bridge=()=>window.KB61Bridge;
 let state=null,busy=false,serial=0,officialBusy=false;
 const names={TIDAK_HADIR:'MIA — Tidak Hadir Tanpa Makluman',MIA:'MIA — Tidak Hadir Tanpa Makluman',KELUAR:'Kebenaran keluar',RASMI:'Urusan rasmi',KECEMASAN:'Kecemasan / keluar',MC:'MC',CRK:'CRK',CTR:'CTR'};
 function text(id,s,error=false){const n=$(id);n.textContent=s;n.classList.toggle('kb61-error',error);}
 function options(rows){return rows.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.category)}</option>`).join('');}
 function eventAt(){return $('kb61-clock').value==='CUSTOM'?$('kb61-clock-custom').value:$('kb61-clock').value;}
 function fillSelect(id,items,selected){const n=$(id),old=selected||n.value;n.innerHTML=items.map(x=>`<option value="${esc(x.value)}">${esc(x.label)}</option>`).join('');if(items.some(x=>x.value===old))n.value=old;}
 function times(res){const slots=res.slots||[];if(!slots.length)return;
  const unique=new Map(),ending=new Map();for(const s of slots){const no=s.periodNo?`W${s.periodNo}`:'Waktu';if(!unique.has(s.from))unique.set(s.from,{value:s.from,label:`${no} bermula · ${s.from}–${s.to}`});if(!ending.has(s.to))ending.set(s.to,{value:s.to,label:`Selepas ${no} · ${s.to}`});}
  fillSelect('kb61-from',[...unique.values()],$('kb61-from').value||'07:40');fillSelect('kb61-to',[...ending.values()],$('kb61-to').value||slots[slots.length-1].to);
  const events=new Map([['07:25','07:25 · Agihan utama'],['10:25','10:25 · Sebelum sesi selepas rehat']]);for(const s of slots){events.set(s.from,`${s.from} · Mula W${s.periodNo||'—'}`);events.set(s.to,`${s.to} · Tamat W${s.periodNo||'—'}`);}
  for(let i=1;i<slots.length;i++){const prev=slots[i-1],next=slots[i];if(prev.to<next.from){const mins=Number(next.from.slice(0,2))*60+Number(next.from.slice(3))-5;const before=`${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;if(before>prev.to)events.set(before,`${before} · Sebelum W${next.periodNo||''}`);}}
  const old=$('kb61-clock').value,items=[...events.entries()].filter(([value])=>value>='07:25').sort((a,b)=>a[0].localeCompare(b[0])).map(([value,label])=>({value,label}));items.push({value:'CUSTOM',label:'Masa lain (5 minit)…'});fillSelect('kb61-clock',items,old||res.lastAt||'07:25');
  if(res.lastAt&&eventAt()<res.lastAt){if(items.some(x=>x.value===res.lastAt))$('kb61-clock').value=res.lastAt;else{$('kb61-clock').value='CUSTOM';$('kb61-clock-custom').value=res.lastAt;}}
  $('kb61-clock-custom-row').hidden=$('kb61-clock').value!=='CUSTOM';
 }
 function showNotice(message,error=false){const n=$('kb61-notice');n.hidden=!message;n.textContent=message||'';n.classList.toggle('kb61-notice-ok',!error);n.classList.toggle('kb61-notice-error',error);}
 function role(){return $('kb61-role').value;}
 function ready(){return bridge()?.roles().includes('ADMIN_SISTEM');}
 function date(){return $('kb61-date').value;}
 function sync(){const t=$('kb61-type').value,ras=t==='RASMI',inside=ras&&$('kb61-scope').value==='DALAM',half=!['CRK','CTR','MC'].includes(t)&&$('kb61-period').value==='SEPARUH';
  $('kb61-scope-row').hidden=!ras;$('kb61-task-row').hidden=!inside;$('kb61-emergency-row').hidden=t!=='KECEMASAN';$('kb61-period-row').hidden=['CRK','CTR','MC'].includes(t);$('kb61-from-row').hidden=$('kb61-to-row').hidden=!half;
  $('kb61-type').querySelector('[value=MIA]').disabled=role()!=='GPK';for(const option of $('kb61-type').options){if(option.value!=='MIA')option.disabled=role()!=='GURU';}$('kb61-add').querySelector('button[type=submit]').disabled=role()==='GB';if(role()!=='GB'&&$('kb61-type').selectedOptions[0]?.disabled){$('kb61-type').value=role()==='GPK'?'MIA':'CRK';return sync();}actions();}
 function actions(){const records=state?.records||[],r=records.find(x=>x.key===$('kb61-target').value),opts=[];if(r&&r.lifecycle==='AKTIF'){
  if(role()==='GURU'){if(r.registeredByRole==='GURU'){opts.push(['BUKTI','Tandakan bukti dimuat naik (ujian)']);if(!state?.lastAt)opts.push(['BATAL','Batalkan sebelum jadual dijana']);else opts.push(['PULANG_AWAL','Kembali awal / program tamat awal → pulihkan jadual']);}if(['MIA','TIDAK_HADIR'].includes(r.type))opts.push(['PENJELASAN','Beri penjelasan']);}
  else if(role()==='GPK'){if(r.docMock&&!r.docReviewed)opts.push(['SEMAK_BUKTI','Semak bukti']);if(['MC','KECEMASAN','KELUAR','MIA','TIDAK_HADIR'].includes(r.type)||r.type==='RASMI'&&r.scope==='DALAM')opts.push(['SOKONG','Sokong / sahkan'],['TOLAK','Tidak sokong']);if(r.type==='KECEMASAN'&&r.task==='UMUM')opts.push(['KATEGORI','Tentukan kategori akhir']);if(['MIA','TIDAK_HADIR'].includes(r.type))opts.push(['BATAL','Betulkan / Batal MIA']);}else opts.push(['BATAL_GB','GB · Batal keberadaan']);}
  const prev=$('kb61-action').value;$('kb61-action').innerHTML=opts.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('');if(opts.some(x=>x[0]===prev))$('kb61-action').value=prev;$('kb61-final-row').hidden=$('kb61-action').value!=='KATEGORI';$('kb61-act').querySelector('button').disabled=!opts.length||busy;}
 function render(res){state=res;times(res);showNotice(res.notice||'');if(!$('kb61-end-date').value||$('kb61-end-date').value<date())$('kb61-end-date').value=date();const st=$('kb61-staff'),old=st.value;st.innerHTML=options(res.staff||[]);if([...st.options].some(o=>o.value===old))st.value=old;
  const records=res.records||[],active=records.filter(r=>r.lifecycle==='AKTIF');const target=$('kb61-target'),prev=target.value;target.innerHTML=active.map(r=>`<option value="${esc(r.key)}">${esc(r.name)} · ${esc(names[r.type]||r.type)} · ${esc(r.from)}</option>`).join('');if(active.some(r=>r.key===prev))target.value=prev;$('kb61-act').hidden=!active.length;
  $('kb61-records').innerHTML=records.length?`<table class="kb61-table"><thead><tr><th>Guru / Kategori</th><th>Pematuhan</th><th>Kesan</th></tr></thead><tbody>${records.map(r=>`<tr><td><strong>${esc(r.name)}</strong><small>${esc(names[r.finalType||r.type]||r.type)} · ${esc(r.from)}–${esc(r.to)} · ${esc(r.registeredByRole)}${r.seriesDays>1?` · Siri ${esc(r.seriesStart)} → ${esc(r.seriesEnd)}`:''}</small></td><td>${esc(r.compliance.replace(/_/g,' '))}${r.docMock?'<small>Bukti simulasi '+(r.docReviewed?'disemak':'ada')+'</small>':''}</td><td>${r.lifecycle==='TAMAT_AWAL'?(r.type==='RASMI'&&r.scope==='DALAM'&&r.task==='SEKAT_CALON'?`Tugas tamat ${esc(r.returnAt)} · Sekatan calon ditarik balik`:`Kembali awal ${esc(r.returnAt)} · Waktu seterusnya dipulihkan`):r.lifecycle==='DIBATALKAN'?(r.gbKeepRelief?'Tidak sah · Relief diterbitkan kekal':'Dibatalkan · Tidak aktif'):r.effect==='MENUNGGU_GPK'?'Menunggu GPK · Tiada relief':r.effect==='SEKAT_CALON'?'Sekat calon':'Relief diperlukan'}${r.actions?.length?`<details><summary>Log (${r.actions.length})</summary>${r.actions.map(a=>`<small>${esc(a.asRole)} · ${esc(a.kind)} · ${esc(a.note)}</small>`).join('')}</details>`:''}</td></tr>`).join('')}</tbody></table>`:'<p>Tiada rekod ujian. Boleh jana hari tanpa ketidakhadiran.</p>';
  const pending=res.revision!==res.appliedRevision;
  text('kb61-state',res.conflict?'Tarikh ini sudah dijana dalam Makmal e-Relief biasa. Reset minggu/tarikh di modul tersebut dahulu.':`${active.length} rekod aktif · ${active.filter(r=>r.compliance!=='LENGKAP').length} belum lengkap · ${res.lastAt?'Agihan terakhir '+res.lastAt:'Belum jana 7.25 pagi'}${pending?' · Ada perubahan belum diterapkan':''}`);
  if(!res.lastAt&&$('kb61-clock').value!=='CUSTOM')$('kb61-clock').value='07:25';$('kb61-run').disabled=res.conflict||busy;
  const s=res.summary,o=res.optimization;const rs=res.rows||[];
  $('kb61-result').innerHTML=s?`<p><strong>${Number(s.diagih||0)} diagih · ${Number(s.tiada||0)} kosong · ${Number(s.pairingDiteruskan||0)} pairing diteruskan · ${Number(s.handover||0)} serah tugas · ${Number(s.dipulihkan||0)} dipulihkan</strong></p>${o?`<p>${esc(o.solver||'Reshuffle')}: ${esc(o.before)} → ${esc(o.after)} · ${o.provenMaximum?'Optimum model':'Optimum belum dibuktikan'}</p>`:''}<div class="kb61-scroll"><table class="kb61-table"><thead><tr><th>Waktu</th><th>Kelas / subjek</th><th>Guru ganti / penerus</th><th>Status</th></tr></thead><tbody>${rs.map(r=>`<tr><td>W${esc(r.periodNo||'—')}<small>${esc(r.from)}–${esc(r.to)}</small></td><td>${esc(r.classId)} · ${esc(r.subject)}<small>${esc((r.originalNames||[]).join(' / '))}</small></td><td>${esc(r.replacementName||(r.continuingNames||[]).join(' / ')||'—')}</td><td>${esc(r.manualBackup?'MANUAL '+r.manualTier:r.status.replace(/_/g,' '))}</td></tr>`).join('')}</tbody></table></div>${(res.historyRows||[]).length?`<div class="kb61-restored"><h4>Jadual asal dipulihkan · ${res.historyRows.length} slot</h4><div class="kb61-scroll"><table class="kb61-table"><thead><tr><th>Waktu</th><th>Kelas / Subjek</th><th>Guru hakiki kembali</th><th>Status</th></tr></thead><tbody>${res.historyRows.map(r=>`<tr><td>W${esc(r.periodNo)} · ${esc(r.from)}–${esc(r.to)}</td><td>${esc(r.classId)} · ${esc(r.subject)}</td><td>${esc((r.originalNames||[]).join(' / '))}</td><td>JADUAL ASAL DIPULIHKAN</td></tr>`).join('')}</tbody></table></div></div>`:''}`:'<p>Belum ada hasil agihan integrasi.</p>';actions();}
 async function call(action,payload={},label='Menyimpan rekod ujian…'){if(busy||!ready())return;busy=true;const my=++serial,day=date();const panel=$('panel-makmal');const disabled=[...panel.querySelectorAll('button,input,select')].map(n=>[n,n.disabled]);disabled.forEach(([n])=>n.disabled=true);$('kb61-loading').hidden=false;$('kb61-loading').textContent=label;
  try{const result=await bridge().api(action,{date:day,revision:state?.revision??0,...payload});if(my===serial&&ready()&&day===date()){render(result);return result;}return null;}
  catch(e){if(my===serial){text('kb61-state',e.message||String(e),true);showNotice(e.message||String(e),true);}return null;}
  finally{if(my===serial){busy=false;$('kb61-loading').hidden=true;disabled.forEach(([n,v])=>n.disabled=v);sync();$('kb61-run').disabled=!!state?.conflict;}}}
 function open(){if(!ready())return;if(!date()){const d=new Date(bridge().today()+'T12:00:00Z');while([0,6].includes(d.getUTCDay()))d.setUTCDate(d.getUTCDate()+1);$('kb61-date').value=d.toISOString().slice(0,10);}return call('kb61Get',{},'Membaca Makmal…');}
 async function official(){if(officialBusy||!bridge()?.roles().includes('GPK'))return;officialBusy=true;$('kb61-official-form').hidden=true;text('kb61-official-state','Menyemak akses rasmi…');try{const result=await bridge().api('kb61OfficialStaff');if(!bridge()?.roles().includes('GPK'))return;$('kb61-official-staff').innerHTML=options(result.staff||[]);$('kb61-official-date').value=bridge().today();$('kb61-official-from').value=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());$('kb61-official-form').hidden=!result.enabled;text('kb61-official-state',result.enabled?'Pendaftaran MIA diaktifkan untuk GPK sahaja. Nyatakan pemerhatian, bukan keputusan tatatertib.':'Pendaftaran rasmi masih dikunci. Gunakan Makmal Admin dahulu.');}catch(e){text('kb61-official-state',e.message||String(e),true);}finally{officialBusy=false;}}
 function clear(){serial++;busy=false;state=null;for(const n of $('panel-makmal').querySelectorAll('button,input,select'))n.disabled=false;$('kb61-records').textContent='';$('kb61-result').textContent='';$('kb61-staff').innerHTML='';$('kb61-target').innerHTML='';$('kb61-act').hidden=true;$('kb61-loading').hidden=true;$('kb61-official-form').hidden=true;$('panel-makmal').hidden=true;$('panel-daftar').hidden=true;for(const id of ['makmal','daftar'])document.querySelector(`[data-tab=${id}]`).hidden=true;}
 window.KB61={open,official,clear};
 for(const id of ['kb61-role','kb61-type','kb61-scope','kb61-period','kb61-target','kb61-action'])$(id).addEventListener('change',sync);
 $('kb61-next-day').addEventListener('click',()=>{const d=new Date(date()+'T12:00:00Z');do{d.setUTCDate(d.getUTCDate()+1);}while([0,6].includes(d.getUTCDay()));$('kb61-date').value=d.toISOString().slice(0,10);$('kb61-end-date').value=$('kb61-date').value;state=null;showNotice('');open();});
 $('kb61-date').addEventListener('change',()=>{state=null;$('kb61-end-date').value=date();showNotice('');open();});$('kb61-clock').addEventListener('change',()=>{$('kb61-clock-custom-row').hidden=$('kb61-clock').value!=='CUSTOM';});$('kb61-from').addEventListener('change',()=>{if($('kb61-to').value<=$('kb61-from').value){const to=[...$('kb61-to').options].find(o=>o.value>$('kb61-from').value);if(to)$('kb61-to').value=to.value;}});$('kb61-refresh').addEventListener('click',open);
 $('kb61-add').addEventListener('submit',async e=>{e.preventDefault();const r=await call('kb61Add',{asRole:role(),staffId:$('kb61-staff').value,endDate:$('kb61-end-date').value||date(),type:$('kb61-type').value,scope:$('kb61-scope').value,task:$('kb61-type').value==='KECEMASAN'?$('kb61-emergency').value:$('kb61-task').value,period:$('kb61-period').value,from:$('kb61-from').value,to:$('kb61-to').value,note:$('kb61-note').value});if(r)$('kb61-note').value='';});
 $('kb61-act').addEventListener('submit',async e=>{e.preventDefault();if(['BATAL','BATAL_GB','PENJELASAN','PULANG_AWAL'].includes($('kb61-action').value)&&$('kb61-act-note').value.trim().length<6){text('kb61-state','Masukkan catatan sekurang-kurangnya 6 aksara.',true);return;}const r=await call('kb61Act',{key:$('kb61-target').value,asRole:role(),kind:$('kb61-action').value,at:eventAt(),finalType:$('kb61-final').value,note:$('kb61-act-note').value});if(r)$('kb61-act-note').value='';});
 $('kb61-run').addEventListener('click',()=>call('kb61Run',{at:eventAt()},'Menjana relief V6.0 · membaca keberadaan, mengoptimumkan agihan dan menyimpan audit… Jangan tekan berulang kali.'));
 $('kb61-reset').addEventListener('click',()=>{const t=prompt('Padam Makmal keberadaan dan snapshot integrasi bagi tarikh ini sahaja? Tiada data rasmi diubah. Taip KOSONGKAN MAKMAL');if(t==='KOSONGKAN MAKMAL')call('kb61Reset',{confirmToken:t},'Mengosongkan tarikh ujian…');});
 $('kb61-official-refresh').addEventListener('click',official);$('kb61-official-form').addEventListener('submit',async e=>{e.preventDefault();if(officialBusy)return;officialBusy=true;const btn=e.target.querySelector('button');btn.disabled=true;try{const res=await bridge().api('kb61OfficialRegister',{staffId:$('kb61-official-staff').value,date:$('kb61-official-date').value,from:$('kb61-official-from').value,to:$('kb61-official-to').value,note:$('kb61-official-note').value,confirmToken:$('kb61-official-confirm').value});text('kb61-official-state',res.note||'Direkod rasmi.');$('kb61-official-confirm').value='';$('kb61-official-note').value='';}catch(err){text('kb61-official-state',err.message||String(err),true);}finally{officialBusy=false;btn.disabled=false;}});sync();
})();

;

/* ===== MERGED: Fi-KeberadaanGuru.js ===== */
/* SeMAKMUR Fi V5.0 — Keberadaan + Relief Automatik; tanpa Penyelaras wajib. */
/* SeMAKMUR Fi e-Keberadaan V6.7-SPARK: frontend UI refinements and atomic audit. Firebase Storage is DISABLED (Spark plan).
   Real Firebase data and role-based views; no role-switching demo. */
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=x=>String(x??'').trim(), localDay=()=>{const x=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${x.year}-${x.month}-${x.day}`};
const niceDay=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)?x.split('-').reverse().join('/'):str(x);
const TYPE={CRK:'CRK',CTR:'CTR',MC:'Cuti Sakit (MC)',RASMI:'Urusan Rasmi / Bengkel / LDP / PLC',KECEMASAN:'Kecemasan',TIDAK_HADIR:'MIA — Tidak Hadir Tanpa Makluman',MIA:'MIA — Tidak Hadir Tanpa Makluman'};
let statsLoaded=false,user=null,roles=[],realRoles=[],profile=null,records=[],myRecords=[],reliefQueue=[],myRelief=[],reliefStaff=[],todayReliefRows=null,tab='borang',busy=false,db=null,fns=null,unsubs=[];
const has=r=>roles.includes(r);
const isAdmin=()=>roles.some(r=>['ADMIN_SISTEM','GPK','GB'].includes(r));
const isReliefViewer=()=>roles.some(r=>['ADMIN_SISTEM','GPK','GB','RELIEF_PEMANTAU'].includes(r));
const docRequired=r=>['CRK','CTR'].includes(r.finalType||r.type)||(r.type==='RASMI'&&r.scope==='LUAR');
const reliefLabel=r=>(r.type==='RASMI'&&r.scope==='LUAR'&&r.docPath&&r.relief==='belum'?'Menunggu Semakan Surat':r.type==='RASMI'&&r.scope==='DALAM'&&r.task==='SEKAT_CALON'?'Tidak Boleh Diberi Relief':({belum:'Belum Relief',sah:'Relief Dengan Pengesahan',tanpa:'Relief Tanpa Sokongan',sementara:'Relief Direkod (legacy)',tiada:'Tiada Relief',dikecualikan:'Tidak Boleh Diberi Relief'}[r.relief]||'Belum Relief'));
const reliefTone=r=>r.relief==='sah'||r.relief==='dikecualikan'?'success':r.relief==='tanpa'||r.relief==='sementara'?'warning':'neutral';
function status(r){
 if(r.lifecycle==='TAMAT_AWAL')return ['Kembali Awal · Jadual Dikemas Kini','success'];
 if(r.lifecycle==='DIBATALKAN')return [r.gbCancelled?'Dibatalkan GB · Tidak Sah':'Dibatalkan',r.gbCancelled?'danger':'neutral'];
 if(r.gpkStatus==='ditolak')return ['Tidak Disokong','danger'];
 if(r.registeredByAdmin&&!r.finalType)return [r.teacherExplanation?'Menunggu Kategori':'Menunggu Penjelasan','warning'];
 if(docRequired(r)&&!r.docPath)return ['Dokumen Belum Lengkap','warning'];
 if(requireGpk(r)&&r.gpkStatus==='menunggu')return ['Menunggu GPK','warning'];
 if(docRequired(r)&&r.docPath&&!r.docReviewed)return ['Menunggu Semakan Bukti','warning'];
 if(r.gpkStatus==='disahkan')return ['Disokong GPK','success'];
 if(r.docReviewed===true)return ['Bukti Disemak','success'];
 return ['Direkodkan','success'];
}
function completed(r){ if(r.lifecycle==='DIBATALKAN'||r.lifecycle==='TAMAT_AWAL')return true;
 return !(r.registeredByAdmin&&!r.finalType||docRequired(r)&&!r.docPath || requireGpk(r)&&r.gpkStatus==='menunggu' || docRequired(r)&&r.docPath&&!r.docReviewed);
}
function needAttention(r){return r.lifecycle!=='DIBATALKAN'&&(!completed(r)||r.gpkStatus==='ditolak');}
const requireGpk=r=>['TIDAK_HADIR','MIA'].includes(r.type)||r.type==='MC'||r.type==='KECEMASAN'||r.type==='RASMI'&&r.scope==='DALAM';
function needsCompliance(r){return r.lifecycle!=='DIBATALKAN'&&docRequired(r)&&(!r.docPath||!r.docReviewed);}
function needActionForRole(r){
 if(r.testMode===true||r.lifecycle==='DIBATALKAN')return false;
 return (has('GPK')||has('GB')&&r.registeredByAdmin)&&(r.registeredByAdmin&&!r.finalType||requireGpk(r)&&r.gpkStatus==='menunggu'||needsCompliance(r));
}
function needsTeacherAction(r){return r.lifecycle!=='DIBATALKAN'&&r.ownerUid===user?.uid&&(docRequired(r)&&!r.docPath||r.registeredByAdmin&&!r.teacherExplanation);}
function reminderOutstanding(r){return r.lifecycle!=='DIBATALKAN'&&needAttention(r);}
function showMessage(msg='',kind='info'){const a=$('alert');a.hidden=!msg;a.textContent=msg;a.style.background=kind==='error'?'#fff0f1':'#fff5e7';a.style.color=kind==='error'?'#a2454e':'#855815';}
function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;setTimeout(()=>{$('toast').hidden=true},3600)}
function showActionError(error){
 const message=String(error?.message||error||'Tindakan gagal.');
 if(!$('dialog').hidden){
  let node=document.getElementById('fi-action-error');
  if(!node){node=document.createElement('div');node.id='fi-action-error';node.setAttribute('role','alert');
   node.style.cssText='margin:10px 0;padding:12px 14px;border:1px solid #eab3b3;border-radius:10px;background:#fff0f1;color:#9f2935;font-size:13px;line-height:1.6;white-space:pre-wrap;';
   $('dialog-content').prepend(node);}
  node.textContent='Tindakan belum berjaya: '+message;
  node.scrollIntoView({block:'nearest'});
 }else showMessage('Tindakan belum berjaya: '+message,'error');
 console.error('Fi e-Keberadaan:',message);
}
function setRoleUI(){
 const personal=roles.filter(r=>['GB','GPK','ADMIN_SISTEM','RELIEF_PEMANTAU'].includes(r)).map(r=>r==='ADMIN_SISTEM'?'Admin Sistem':r==='RELIEF_PEMANTAU'?'Pemantau Relief':r);
 $('role-label').textContent=personal.join(' / ')||'Guru';
 $('tabs').querySelector('[data-tab=tindakan]').hidden=!isReliefViewer();
 $('tabs').querySelector('[data-tab=peringatan]').hidden=!isAdmin();
 $('relief-box').hidden=!isReliefViewer();
 $('tabs').querySelector('[data-tab=makmal]').hidden=!has('ADMIN_SISTEM');
 $('tabs').querySelector('[data-tab=daftar]').hidden=!has('GPK');
 if(tab==='makmal'&&!has('ADMIN_SISTEM')||tab==='daftar'&&!has('GPK'))tab='borang';
 if(tab==='tindakan'&&!isReliefViewer())tab='borang';if(tab==='peringatan'&&!isAdmin())tab='borang';
}
// Badge merah = tugasan tertunggak, bukan bilangan rekod dan bukan masa terakhir tab dibuka.
function renderUnread(){
 const counts={
   status:myRecords.filter(needsTeacherAction).length,
   tindakan:records.filter(needActionForRole).length,
   peringatan:has('GPK')?records.filter(reminderOutstanding).length:0
 };
 for(const [name,id] of [['status','my-count'],['tindakan','work-count'],['peringatan','remind-count']]){
   const node=$(id),n=counts[name];if(!node)continue;
   node.hidden=n===0;node.textContent=n>99?'99+':String(n);
   node.setAttribute('aria-label',n+' tindakan masih tertunggak');
 }
}
function renderStats(){
  const source=isAdmin()?records:myRecords;
  const value=(id,n)=>{const el=$(id);if(el)el.textContent=statsLoaded?String(n):'—';};
  value('kb-stat-total',source.length);
  value('kb-stat-pending',source.filter(needAttention).length);
  value('kb-stat-docs',source.filter(r=>docRequired(r)&&!r.docPath&&!r.docName).length);
  // V5.1.1: jangan gabungkan relief V5.0 sejarah dengan jadual rasmi V5.1 hari ini.
  // Tidak diterbitkan => '—', bukannya 0 atau nombor dari enjin lama.
  const published=Array.isArray(todayReliefRows);
  const current=published?todayReliefRows.filter(r=>r.status==='DIAGIH'):[];
  value('kb-stat-relief',published?(isAdmin()?current.length:current.filter(r=>r.replacementUid===user?.uid).length):'—');
  const reliefLabel=$('kb-stat-relief')?.previousElementSibling;
  if(reliefLabel)reliefLabel.textContent=isAdmin()?'Relief Aktif Hari Ini':'Relief Saya Hari Ini';
  const desc=$('kb-stat-scope');
  if(desc)desc.textContent=has('ADMIN_SISTEM')?'Semua rekod rasmi':isAdmin()?'Rekod dibenarkan mengikut peranan':'Permohonan saya';
  const note=$('kb-stat-updated');
  if(note)note.textContent=statsLoaded?'Berdasarkan rekod yang berjaya dibaca · maks. 100 rekod':'Menunggu pengesahan data Firestore';
}
const listFilterValue={status:'SEMUA',tindakan:'SEMUA',peringatan:'SEMUA'};
function draw(){
 setRoleUI();
 document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 ['borang','status','tindakan','peringatan','makmal','daftar'].forEach(k=>$('panel-'+k).hidden=k!==tab);
 // Status sentiasa kelihatan di desktop dan PWA; bekukan pada tab Borang.
 $('kb-filter-top').hidden=false;
 $('list-status-filter').disabled=['borang','makmal','daftar'].includes(tab);
 $('list-status-filter').value=tab==='borang'?'SEMUA':(listFilterValue[tab]||'SEMUA');
 // Badge dikira daripada keadaan semasa setiap rekod, bukan masa dibaca.
 renderUnread();
 if(tab==='status'){renderMine();renderMyRelief();}
 if(tab==='tindakan'){renderActions();renderReliefQueue();}
 if(tab==='peringatan')renderReminders();
 renderStats();
}
// Kad ringkas, tidak memaparkan ID teknikal atau status relief.
function cardStatus(r){
 if(r.lifecycle==='DIBATALKAN')return [r.gbCancelled?'Dibatalkan GB · Tidak Sah':'Dibatalkan',r.gbCancelled?'danger':'neutral'];
 if(r.registeredByAdmin&&!r.finalType)return status(r);
 if(requireGpk(r)&&r.gpkStatus==='menunggu')return ['Tindakan GPK','warning'];
 return status(r);
}
function recordDateText(r){
 const dates=niceDay(r.start)+(r.end!==r.start?' – '+niceDay(r.end):'');
 return dates+(r.period==='SEPARUH'&&r.from&&r.to?' · '+r.from+' – '+r.to:'');
}
function compact(r,context){
 const [label,tone]=cardStatus(r);
 const category=TYPE[r.finalType||r.type]||r.type;
 const intent=r.lifecycle==='DIBATALKAN'?(r.gbKeepReliefDate?'Tidak sah · Jadual relief diterbitkan kekal':'Dibatalkan'):r.reliefStopAt?'Relief dihentikan':r.type==='RASMI'&&r.scope==='DALAM'&&r.task==='SEKAT_CALON'?'Sekat calon relief':'Keperluan relief direkod';
 const subtitle=context==='mine'?'':`<div class="item-owner">${esc(r.ownerName||'Guru')}</div>`;
 return `<div class="item"><button class="record-card" data-card-id="${esc(r.id)}" data-context="${esc(context)}" type="button" aria-label="Lihat butiran ${esc(category)}"><span class="item-main"><span class="item-heading"><strong class="item-title">${esc(category)}</strong><span class="pill ${tone}">${esc(label)}</span></span><span class="item-date-new">${esc(recordDateText(r))} · ${esc(intent)}</span>${subtitle}</span><span class="chevron" aria-hidden="true">›</span></button></div>`;
}
function requestExplanation(r){
 const label=cardStatus(r)[0];
 if(r.lifecycle==='DIBATALKAN')return ['Permohonan dibatalkan','Rekod ini telah dibatalkan. Relief bagi waktu yang belum bermula akan dibatalkan secara automatik.'];
 if(r.gpkStatus==='ditolak')return ['Permohonan tidak disokong','Sila rujuk catatan pentadbir. Status pematuhan tidak membatalkan keperluan relief selagi ketidakhadiran masih aktif.'];
 if(r.lifecycle==='TAMAT_AWAL')return ['Kembali awal telah direkod','Slot yang belum bermula akan dipulihkan. Jadual yang sudah berlangsung kekal sebagai sejarah.'];
 if(r.registeredByAdmin&&!r.finalType)return ['Rekod ketidakhadiran oleh pentadbir','Ini rekod pemerhatian, bukan keputusan tatatertib. Guru perlu memberi penjelasan; GPK/GB menentukan kategori. Relief diproses berasingan.'];
 if(docRequired(r)&&!r.docPath&&!r.docName)return ['Dokumen sokongan diperlukan','Permohonan ini belum mempunyai dokumen kelulusan atau surat sokongan yang direkodkan. Sila kemukakan dokumen melalui saluran rasmi sekolah. Gunakan butang Muat Naik Dokumen untuk melengkapkan bukti melalui storan Google Drive sekolah.'];
 if(requireGpk(r)&&r.gpkStatus==='menunggu')return ['Menunggu tindakan GPK','Permohonan ini sedang menunggu semakan atau sokongan Guru Penolong Kanan. Status belum bermaksud kelulusan cuti rasmi.'];
 if(r.relief==='sementara')return ['Relief sementara direkodkan','Perlindungan kelas sementara telah direkodkan untuk operasi sekolah. Ia bukan bukti kelulusan cuti rasmi; dokumen dan keputusan akhir masih perlu disemak.'];
 if(r.relief==='tanpa')return ['Relief tanpa sokongan lengkap','Kelas boleh dilindungi sementara, tetapi dokumen atau pengesahan masih belum lengkap. Permohonan perlu tindakan susulan mengikut prosedur sekolah.'];
 if(r.gpkStatus==='disahkan')return ['Pengesahan direkodkan','Sokongan GPK telah direkodkan. Semak kategori permohonan dan dokumen bagi memastikan semua syarat dipenuhi sebelum rekod dianggap selesai.'];
 if(r.docReviewed===true)return ['Dokumen telah disemak','Dokumen sokongan telah ditandakan sebagai disemak. Semak status tindakan dan rekod rasmi sebelum menganggap urusan selesai.'];
 return ['Status permohonan: '+label,'Permohonan telah direkodkan dan sedang melalui proses semakan. Sila lihat sejarah tindakan serta peringatan yang berkaitan.'];
}
function openRecord(r,context){
 const [label,tone]=cardStatus(r);
 const category=TYPE[r.finalType||r.type]||r.type;
 const [summaryTitle,summaryText]=requestExplanation(r);
 const bits=[
   `<div class="record-summary"><span class="pill ${tone}">${esc(label)}</span></div>`,
   `<section class="kb-popup-status-explanation" role="status"><strong>${esc(summaryTitle)}</strong><p>${esc(summaryText)}</p></section>`,
   `<div class="popup-field"><span>Nama Guru</span><strong>${esc(r.ownerName||user?.name||'Guru')}</strong></div>`,
   `<div class="popup-field"><span>Kategori</span><strong>${esc(category)}</strong></div>`,
   `<div class="popup-field"><span>Tarikh / Masa</span><strong>${esc(recordDateText(r))}</strong></div>`,
   r.scope?`<div class="popup-field"><span>Lokasi</span><strong>${esc(r.scope==='LUAR'?'Luar sekolah':'Dalam sekolah')}</strong></div>`:'',
   r.note?`<div class="popup-field"><span>Tujuan / Catatan</span><strong>${esc(r.note)}</strong></div>`:'',
   r.registeredByAdmin?`<div class="popup-field"><span>Sumber</span><strong>Daftar oleh pentadbir</strong></div>`:'',
   r.teacherExplanation?`<div class="popup-field"><span>Penjelasan guru</span><strong>${esc(r.teacherExplanation)}</strong></div>`:'',
   r.adminNote?`<div class="popup-field"><span>Catatan Pentadbir</span><strong>${esc(r.adminNote)}</strong></div>`:'',
   r.docName?`<div class="popup-field"><span>Dokumen</span><button class="doclink" data-open-doc="${esc(r.id)}" type="button">${esc(r.docName)}</button></div>`:'',
   actionButtons(r,context)
 ];
 openDialog(category,bits.filter(Boolean).join(''));
}
function actionButtons(r,context){
 let buttons=[];const b=(action,label,cls='secondary')=>`<button class="${cls} mini" data-do="${action}" data-id="${esc(r.id)}" type="button">${label}</button>`;
 if(!['DIBATALKAN','TAMAT_AWAL'].includes(r.lifecycle)){
  if(r.ownerUid===user?.uid){
    if(r.registeredByAdmin)buttons.push(b('kb61Explain','Beri Penjelasan'));
    if(docRequired(r)&&!r.docPath)buttons.push(b('upload','Muat Naik Dokumen'));
    if(!r.registeredByAdmin){buttons.push(b('cancelRequest','Batalkan Permohonan','danger'));
    if(!r.reliefStopAt)buttons.push(b('kb64ReturnEarly','Kembali Awal · Pulihkan Jadual','success'));}
  }
  if(context==='action'&&r.registeredByAdmin&&(has('GPK')||has('GB'))){
    if(has('GPK'))buttons.push(b('kb61Cancel','Betulkan MIA','danger'));
    if(has('GPK')&&r.gpkStatus==='menunggu')buttons.push(b('kb61Support','Semak MIA','success'),b('kb61Reject','Tidak Sokong','danger'));
    if(has('GPK')&&docRequired(r)&&r.docPath&&!r.docReviewed)buttons.push(b('reviewProof','Tanda Bukti Disemak','success'));
  }else if(context==='action'&&has('GPK')){
    if(requireGpk(r)&&r.gpkStatus==='menunggu')buttons.push(b('support','Sokong','success'),b('reject','Tidak Sokong','danger'));
    if(r.type==='KECEMASAN'&&r.task==='UMUM'&&r.gpkStatus==='disahkan'&&!r.finalType)buttons.push(b('final','Tentukan Jenis Cuti'));
    if(docRequired(r)&&r.docPath&&!r.docReviewed)buttons.push(b('reviewProof','Tanda Bukti Disemak','success'));
    buttons.push(b('remind','Rekod Peringatan'));
  }
 }
 if(context==='action'&&has('GB')&&r.lifecycle!=='DIBATALKAN')buttons.push(b('kb62GbCancel','GB · Batal Keberadaan','danger'));
 return buttons.length?`<div class="actions">${buttons.join('')}</div>`:'';
}
function showList(id,rows,context){$(id).innerHTML=rows.length?rows.map(r=>compact(r,context)).join(''):'<div class="empty">Tiada rekod.</div>';}
function renderMine(){
 const filter=listFilterValue.status;
 const x=myRecords.filter(r=>filter==='SEMUA'||(filter==='AKTIF'?needAttention(r):completed(r))).sort((a,b)=>b.createdMs-a.createdMs);
 $('status-total').textContent=x.length+' rekod';showList('my-list',x,'mine');
}
function renderActions(){
 const filt=listFilterValue.tindakan;
 let x=[...records];
 if(filt==='AKTIF')x=x.filter(r=>has('GB')?r.lifecycle!=='DIBATALKAN':needActionForRole(r));
 if(filt==='SELESAI')x=x.filter(completed);
 x.sort((a,b)=>b.createdMs-a.createdMs);
 $('action-title').textContent=has('GPK')?'Tindakan GPK':has('GB')?'Pemantauan & Pembatalan GB':has('ADMIN_SISTEM')?'Pemantauan Admin Sistem':'Pemantauan e-Relief';
 $('action-total').textContent=x.length+' rekod';showList('action-list',x,'action');
}
function renderReminders(){
 const filter=listFilterValue.peringatan;
 const x=records.filter(r=>filter==='SEMUA'||(filter==='AKTIF'?needAttention(r):completed(r))).sort((a,b)=>b.createdMs-a.createdMs);
 $('reminders-total').textContent=x.length+' rekod';showList('reminder-list',x,'remind');
}

function reliefTag(r){return ({DIAGIH:'Guru Ganti Ditugaskan',TIADA_GANTI:'Tiada Guru Ganti',DIBATALKAN:'Dibatalkan',DIBATALKAN_GPK:'Dibatalkan GPK',PERLU_SERAH_TUGAS:'Perlu Serah Tugas'})[r.status]||r.status||'Belum Agih';}
function reliefItem(r,admin=false){
 const tone=r.status==='DIAGIH'?'success':r.status==='TIADA_GANTI'||r.status==='PERLU_SERAH_TUGAS'?'warning':'neutral';
 const controls=admin&&has('GPK')&&['DIAGIH','TIADA_GANTI','DIBATALKAN_GPK'].includes(r.status)?`<div class="actions"><button class="secondary mini" type="button" data-relief-action="replaceSlot" data-relief-id="${esc(r.id)}">Tukar / Pilih Guru</button><button class="danger mini" type="button" data-relief-action="cancelSlot" data-relief-id="${esc(r.id)}">Batalkan Relief</button></div>`:'';
 return `<div class="item" style="padding:11px"><div class="detail-line"><strong>${esc(r.teacherName||'Guru asal')}</strong> · ${esc(niceDay(r.date))} · ${esc(r.from||'')}–${esc(r.to||'')}</div><div class="detail-line">${esc(r.classId||'Kelas')} · ${esc(r.subject||'')} <span class="pill ${tone}">${esc(reliefTag(r))}</span></div>${r.replacementName?`<div class="detail-line">Guru ganti: <strong>${esc(r.replacementName)}</strong></div>`:''}${r.notes?`<div class="detail-line">${esc(r.notes)}</div>`:''}${controls}</div>`;
}
function renderReliefQueue(){
 const q=$('relief-queue');if(!q)return;
 const x=reliefQueue.filter(r=>r.engineVersion===3).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.from||'').localeCompare(b.from||''));
 $('relief-total').textContent=String(x.filter(r=>['DIAGIH','TIADA_GANTI','PERLU_SERAH_TUGAS'].includes(r.status)).length);
 q.innerHTML=x.length?x.map(r=>reliefItem(r,true)).join(''):'<div class="empty">Tiada jadual relief automatik lagi.</div>';
 const pending=x.filter(r=>r.status==='TIADA_GANTI'||r.status==='PERLU_SERAH_TUGAS').length;
 const btn=$('relief-alert-count');if(btn){btn.hidden=!pending;btn.textContent=String(pending);}
}
function renderMyRelief(){
 const list=$('my-relief-list');if(!list)return;
 const x=myRelief.filter(r=>r.engineVersion===3&&r.status==='DIAGIH');
 list.innerHTML=x.length?x.map(r=>reliefItem(r,false)).join(''):'<div class="empty">Tiada tugasan relief untuk anda.</div>';
}
function syncForm(){const type=$('type').value,scope=$('scope').value,period=$('period').value;
 const scopeVisible=type==='RASMI',taskVisible=scopeVisible&&scope==='DALAM',emergencyVisible=type==='KECEMASAN',periodVisible=type==='RASMI'||emergencyVisible,timeVisible=periodVisible&&period==='SEPARUH',fileVisible=['CRK','CTR'].includes(type)||(scopeVisible&&scope==='LUAR');
 $('scope-row').hidden=!scopeVisible;$('task-row').hidden=!taskVisible;$('emergency-row').hidden=!emergencyVisible;$('period-row').hidden=!periodVisible;$('time-row').hidden=!timeVisible;$('file-row').hidden=!fileVisible;
 $('scope').required=scopeVisible;$('task').required=taskVisible;$('emergency').required=emergencyVisible;$('period').required=periodVisible;$('from').required=timeVisible;$('to').required=timeVisible;
 $('from').disabled=!timeVisible;$('to').disabled=!timeVisible;
 if(!fileVisible){$('document').value='';$('document-status').textContent='Pilih PDF, JPG atau PNG (maksimum 5 MB). Fail disimpan secara persendirian di Google Drive sekolah.';}
 $('end').min=$('start').value||localDay();if($('end').value<$('start').value)$('end').value=$('start').value;
}
function validateFile(file){if(!file)return;const okay=['application/pdf','image/jpeg','image/png'].includes(file.type)&&/\.(pdf|jpe?g|png)$/i.test(file.name);if(!okay)throw Error('Hanya PDF, JPG atau PNG dibenarkan.');if(file.size>5*1024*1024)throw Error('Fail melebihi 5 MB.');}
function payload(){const type=$('type').value,scope=type==='RASMI'?$('scope').value:'',task=type==='RASMI'&&scope==='DALAM'?$('task').value:type==='KECEMASAN'?$('emergency').value:'',start=$('start').value,end=$('end').value;
 if(!type||!start||!end||start<localDay()||end<start)throw Error('Sila semak kategori dan tarikh (hari ini atau akan datang).');if(type==='RASMI'&&!scope||type==='RASMI'&&scope==='DALAM'&&!task||type==='KECEMASAN'&&!task)throw Error('Pilih lokasi dan tujuan urusan yang berkaitan.');
 const period=['RASMI','KECEMASAN'].includes(type)?$('period').value:'PENUH',from=period==='SEPARUH'?$('from').value:'',to=period==='SEPARUH'?$('to').value:'';
 if(period==='SEPARUH'&&(!from||!to||from>=to||start!==end))throw Error('Separuh hari memerlukan satu tarikh dan masa mula/tamat yang sah.');const note=str($('note').value);if(!note||note.length>240)throw Error('Masukkan tujuan ringkas.');
 const file=$('file-row').hidden?null:($('document').files[0]||null);if(file)validateFile(file);
 return {type,scope,task,start,end,period,from,to,note,file};}
let lastPopupFocus=null;
function closeDialog(){$('dialog').hidden=true;$('dialog-content').innerHTML='';if(lastPopupFocus?.isConnected)lastPopupFocus.focus();lastPopupFocus=null;}
function openDialog(title,html){lastPopupFocus=document.activeElement;$('dialog-title').textContent=title;$('dialog-content').innerHTML=html;$('dialog').hidden=false;$('dialog-close').focus();}
function confirmAction(r,action){
 const titles={kb64ReturnEarly:'Saya Kembali Bertugas · Pulihkan Jadual',cancelRequest:'Batalkan Permohonan Keberadaan',cancelMyRelief:'Saya Boleh Mengajar — Batalkan Relief',reviewProof:'Semak Dokumen',support:'Sokong Keberadaan',reject:'Tidak Sokong',final:'Tentukan Jenis Cuti',upload:'Muat Naik Dokumen',remind:'Rekod Peringatan',kb61Explain:'Penjelasan Guru',kb61Classify:'Tentukan Kategori',kb61Cancel:'Batalkan Rekod Pentadbir',kb61Support:'Sahkan Rekod',kb61Reject:'Tidak Sokong',kb62GbCancel:'Guru Besar · Batalkan Keberadaan'};
 let body=`<p><strong>${esc(r.ownerName||'Guru')}</strong> · ${esc(TYPE[r.type]||r.type)} · ${esc(niceDay(r.start))}</p>`;
 if(action==='upload')body+='<div class="fieldrow"><label for="add-file">Pilih PDF/JPG/PNG</label><input id="add-file" type="file" accept=".pdf,.jpg,.jpeg,.png"></div>';
 if(action==='final'||action==='kb61Classify')body+='<div class="fieldrow"><label for="final-type">Jenis cuti akhir</label><select id="final-type"><option value="CRK">CRK</option><option value="CTR">CTR</option><option value="MC">MC</option><option value="KECEMASAN">Kekal Kecemasan</option></select></div>';
 if(action!=='upload'&&action!=='final')body+='<div class="fieldrow"><label for="admin-note">'+(['cancelRequest','cancelMyRelief','reviewProof'].includes(action)?'Sebab tindakan (wajib)':'Catatan ringkas')+'</label><textarea id="admin-note" rows="2" maxlength="200"></textarea></div>';
 if(action==='cancelRequest')body+='<p>Relief yang belum bermula akan dibatalkan secara automatik. Ini tidak membatalkan cuti dalam HRMIS atau saluran rasmi.</p>';
 if(action==='kb62GbCancel')body+='<p><strong>Pembatalan oleh GB:</strong> jika relief hari ini sudah diterbitkan, jadual sedia ada akan kekal; rekod keberadaan ditandakan tidak sah. Relief hari berikutnya tidak akan dijana daripada rekod ini.</p>';
 if(action==='kb64ReturnEarly')body+='<p>Waktu sudah bermula kekal dalam sejarah. Jadual hakiki bagi kelas yang belum bermula dipulihkan. Kelas sedang berlangsung perlu serah tugas.</p>';
 if(action==='cancelMyRelief')body+='<p>Rekod Keberadaan kekal. Relief yang belum bermula akan dihentikan, manakala waktu berlangsung memerlukan serah tugas.</p>';
 body+=`<div class="actions" style="margin-top:15px;justify-content:flex-end"><button class="secondary mini" id="cancel-action" type="button">Kembali</button><button class="primary mini" id="confirm-action" data-action="${esc(action)}" data-id="${esc(r.id)}" type="button">Sahkan</button></div>`;
 openDialog(titles[action]||'Tindakan',body);
}
async function applyAction(id,act){
 const r=records.find(x=>x.id===id)||myRecords.find(x=>x.id===id);
 if(!r)throw Error('Rekod tidak ditemui.');if(r.testMode===true)throw Error('Rekod ujian lama tidak boleh diubah.');
 if(busy)return;
 const note=str($('admin-note')?.value),fType=$('final-type')?.value;
 if(act.startsWith('kb61')||act==='kb62GbCancel'||act==='kb64ReturnEarly'){const kinds={kb64ReturnEarly:'PULANG_AWAL',kb61Explain:'PENJELASAN',kb61Classify:'KATEGORI',kb61Cancel:'BATAL',kb61Support:'SOKONG',kb61Reject:'TOLAK',kb62GbCancel:'GB_BATAL'};busy=true;try{await transportDoc('kb61OfficialAction',id,null,{kind:kinds[act],note,finalType:fType});closeDialog();toast(act==='kb64ReturnEarly'?'Kembali awal direkod. Semak jadual relief yang dikemas kini.':'Tindakan rasmi direkodkan.');}finally{busy=false;}return;}
 if(['cancelRequest','cancelMyRelief','reviewProof'].includes(act)){
  if(note.length<6)throw Error('Sila masukkan sebab sekurang-kurangnya 6 aksara.');
  busy=true;try{const result=await transportDoc(act,id,null,{reason:note});closeDialog();toast('Tindakan berjaya direkodkan. '+(result.sync||''));}
  finally{busy=false;}return;
 }
 if(act==='upload'){
  if(r.ownerUid!==user?.uid)throw Error('Hanya pemohon boleh muat naik.');
  const file=$('add-file')?.files[0];if(!file)throw Error('Pilih dokumen.');validateFile(file);
  busy=true;try{await uploadProof(id,file);closeDialog();toast('Dokumen telah disimpan di Google Drive.');}finally{busy=false;}return;
 }
 if(!has('GPK'))throw Error('Akses GPK diperlukan.');
 let change={updatedAt:fns.serverTimestamp(),updatedByUid:user.uid};
 if(act==='support'||act==='reject'){
  if(!requireGpk(r)||r.gpkStatus!=='menunggu')throw Error('Tiada sokongan GPK yang tertunggak untuk rekod ini.');
  change.gpkStatus=act==='support'?'disahkan':'ditolak';
 }
 else if(act==='final'){
  if(r.type!=='KECEMASAN'||r.task!=='UMUM'||!fType)throw Error('Jenis akhir hanya untuk kecemasan.');
  change.finalType=fType==='KECEMASAN'?'':fType;change.docReviewed=false;
 }else if(act==='remind')change.reminderAt=fns.serverTimestamp();
 else throw Error('Tindakan tidak disokong.');
 if(note)change.adminNote=note.slice(0,200);
 busy=true;try{await commitChange(id,change,act);closeDialog();toast('Tindakan direkodkan.');}finally{busy=false;}
}
function confirmReliefAction(r,action){
 let body=`<p><strong>${esc(r.classId||'Kelas')}</strong> · ${esc(niceDay(r.date))} · ${esc(r.from)}–${esc(r.to)}</p>`;
 if(action==='replaceSlot'){
  const opts=reliefStaff.map(x=>`<option value="${esc(x.idStaf)}">${esc(x.name||x.idStaf)}</option>`).join('');
  body+=`<div class="fieldrow"><label for="relief-staff">Guru ganti</label><select id="relief-staff"><option value="">Pilih guru</option>${opts}</select></div>`;
 }
 body+='<div class="fieldrow"><label for="relief-reason">Sebab (wajib)</label><textarea id="relief-reason" rows="2" maxlength="200"></textarea></div>';
 body+=`<div class="actions"><button class="secondary mini" id="cancel-action" type="button">Kembali</button><button class="primary mini" id="confirm-relief" data-relief-action="${esc(action)}" data-relief-id="${esc(r.id)}" type="button">Sahkan</button></div>`;
 openDialog(action==='cancelSlot'?'GPK — Batalkan Relief':'GPK — Tukar Guru Relief',body);
}
async function applyReliefAction(id,action){
 const reason=str($('relief-reason')?.value),staffId=str($('relief-staff')?.value);
 if(reason.length<6)throw Error('Isi sebab sekurang-kurangnya 6 aksara.');
 if(action==='replaceSlot'&&!staffId)throw Error('Pilih guru ganti.');
 busy=true;try{await transportDoc(action,'',null,{reliefId:id,reason,staffId});closeDialog();toast('Perubahan jadual relief direkodkan.');}
 finally{busy=false;}
}
// Every update atomically creates an immutable audit row. A transaction prevents lost writes.
async function commitChange(id,change,action){
 const ref=fns.doc(db,'semakmur_fi_keberadaan',id);
 const audit=fns.doc(fns.collection(db,'semakmur_fi_keberadaan_audit'));
 await fns.runTransaction(db,async tr=>{
   const snapshot=await tr.get(ref);if(!snapshot.exists())throw Error('Rekod sudah tiada. Muat semula.');
   const before=snapshot.data();
   if(before.testMode===true)throw Error('Rekod UJIAN lama tidak boleh dipinda.');
   const revision=Number(before.revision||0)+1;
   const update={...change,revision,lastActionId:audit.id,updatedAt:fns.serverTimestamp(),updatedByUid:user.uid,updatedByEmail:user.email};
   // created/owner fields cannot be changed; Firebase Rules enforce the same constraint.
   tr.update(ref,update);
   tr.set(audit,{requestId:id,ownerUid:before.ownerUid,action,byUid:user.uid,byEmail:user.email,revision,
     gpkStatus:update.gpkStatus??before.gpkStatus,relief:update.relief??before.relief,
     finalType:update.finalType??before.finalType,testMode:before.testMode===true,at:fns.serverTimestamp()});
 });
}
// Google Drive via Apps Script Web App. Form POST to isolated iframe avoids Apps Script CORS redirects.
// Never put a service-account key or Drive folder ID in frontend. Endpoint is public, requests require Firebase ID token.
function docEndpoint(){
 const url=String(window.SeMAKMURFiAPIConfig?.webAppExecUrl||'').trim();
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url))
   throw Error('URL Web App Fi-Sync tidak sah. Semak satu fail: Fi-APIConfig.js.');
 return url;
}
function fileBase64(file){return new Promise((resolve,reject)=>{
 const rd=new FileReader();rd.onerror=()=>reject(Error('Fail tidak dapat dibaca.'));
 rd.onload=()=>resolve(String(rd.result).split(',')[1]||'');rd.readAsDataURL(file);
});}
function trustedKbOrigin(origin){try{const u=new URL(origin),h=u.hostname.toLowerCase();return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&(h==='script.google.com'||h==='script.googleusercontent.com'||h.endsWith('.script.googleusercontent.com')||h.endsWith('-script.googleusercontent.com'));}catch{return false;}}
async function transportDoc(action,id,file,extra={}){
 if(!user)throw Error('Sesi MOE tidak tersedia.');
 const url=docEndpoint();
 const app=(await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js')).getApps().find(a=>a.name==='semakmur-fi-dashboard');
 if(!app)throw Error('Firebase belum disambungkan.');
 const auth=(await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')).getAuth(app);
 if(!auth.currentUser)throw Error('Sila log masuk semula.');
 const idToken=await auth.currentUser.getIdToken(true);
 const nonce=(crypto.randomUUID?.()||String(Date.now())+Math.random().toString(36));
 const body={action,requestId:id,idToken,nonce,...extra};
 if(file){body.fileName=file.name;body.mimeType=file.type;body.base64=await fileBase64(file);}
 return new Promise((resolve,reject)=>{
  const iframe=document.createElement('iframe');iframe.name='fi-doc-'+nonce;iframe.hidden=true;
  iframe.setAttribute('aria-hidden','true');iframe.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin');
  const form=document.createElement('form');form.method='POST';form.action=url;form.target=iframe.name;form.hidden=true;
  const f=document.createElement('input');f.name='payload';f.type='hidden';f.value=JSON.stringify(body);form.appendChild(f);
  let ended=false;
  function cleanup(){window.clearTimeout(watchdog);window.removeEventListener('message',onMessage);form.remove();iframe.remove();}
  function onMessage(ev){
   if(!trustedKbOrigin(ev.origin))return;
   const data=ev.data;if(data?.channel!=='semakmur-fi-doc-v1'||data.nonce!==nonce)return;
   if(ended)return;ended=true;cleanup();data.ok?resolve(data):reject(Error(data.error||'Operasi dokumen gagal.'));
  }
  const watchdog=window.setTimeout(()=>{if(ended)return;ended=true;cleanup();reject(Error('Tiada respons Apps Script. Semak deployment dan sambungan internet.'));},90000);
  window.addEventListener('message',onMessage);document.body.append(iframe,form);form.submit();
 });
}
async function uploadProof(id,file){
 validateFile(file);
 const result=await transportDoc('upload',id,file);
 if(!result.fileName)throw Error('Respons backend tidak mengesahkan nama fail.');
 return result;
}
async function showDocument(id){
 const result=await transportDoc('view',id,null);
 if(!result.base64||!result.mimeType)throw Error('Dokumen tidak dapat dibuka.');
 const binary=atob(result.base64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const blob=new Blob([bytes],{type:result.mimeType}),u=URL.createObjectURL(blob);
 // Buka dalam tab baru; fallback muat turun jika popup disekat.
 const a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';
 a.download=String(result.fileName||'dokumen').replace(/[\/\\]/g,'_');document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(u),30000);
}
async function submit(ev){ev.preventDefault();if(busy)return;let d;try{d=payload();}catch(e){$('form-status').textContent=e.message;return;}

 busy=true;$('submit').disabled=true;$('form-status').textContent='Menyimpan…';try{if(d.file)docEndpoint();const id=fns.doc(fns.collection(db,'semakmur_fi_keberadaan')).id;
 const rec={id,testMode:false,ownerUid:user.uid,ownerEmail:user.email,ownerName:user.name,type:d.type,scope:d.scope,task:d.task,start:d.start,end:d.end,period:d.period,from:d.from,to:d.to,note:d.note,docPath:'',docName:'',docReviewed:false,gpkStatus:'menunggu',relief:'belum',finalType:'',adminNote:'',updatedByUid:user.uid,createdAt:fns.serverTimestamp(),updatedAt:fns.serverTimestamp(),createdMs:Date.now()};
 {const audit=fns.doc(fns.collection(db,'semakmur_fi_keberadaan_audit'));rec.revision=1;rec.lastActionId=audit.id;rec.updatedByEmail=user.email;const b=fns.writeBatch(db);b.set(fns.doc(db,'semakmur_fi_keberadaan',id),rec);b.set(audit,{requestId:id,ownerUid:user.uid,action:'CREATE',byUid:user.uid,byEmail:user.email,revision:1,gpkStatus:rec.gpkStatus,relief:rec.relief,finalType:rec.finalType,testMode:rec.testMode,at:fns.serverTimestamp()});await b.commit();}
 if(d.file){$('form-status').textContent='Rekod disimpan. Memuat naik lampiran ke Google Drive…';try{await uploadProof(id,d.file);}catch(uploadError){$('form-status').textContent='Permohonan telah direkodkan tetapi fail belum disimpan: '+(uploadError.message||uploadError);tab='status';draw();return;}}
 $('apply-form').reset();$('start').value=localDay();$('end').value=localDay();syncForm();tab='status';draw();toast('Rekod keberadaan dihantar.');
 }catch(e){$('form-status').textContent='Gagal menyimpan: '+(e.code||e.message||e);}finally{busy=false;$('submit').disabled=false;if($('form-status').textContent==='Menyimpan…')$('form-status').textContent='';}}

const FI_EMBED=new URLSearchParams(location.search).get('embed')==='1';
function tellDashboard(type,message=''){
 if(!FI_EMBED||window.parent===window)return;
 try{window.parent.postMessage({type,message},location.origin);}catch(_){}
}
function handlers(){document.addEventListener('click',ev=>{
 const reliefLink=ev.target.closest('a.fi51-relief-link');
 if(reliefLink&&FI_EMBED&&window.parent!==window){
  ev.preventDefault();
  tellDashboard('semakmur-fi-kb-open-relief');
  return;
 }
 const tabBtn=ev.target.closest('#tabs [data-tab]');if(tabBtn){tab=tabBtn.dataset.tab;draw();if(tab==='makmal')window.KB61?.open();if(tab==='daftar')window.KB61?.official();return;}const card=ev.target.closest('[data-card-id]');if(card){const rec=records.find(r=>r.id===card.dataset.cardId)||myRecords.find(r=>r.id===card.dataset.cardId);if(rec)openRecord(rec,card.dataset.context||'mine');return;}const confirmRel=ev.target.closest('#confirm-relief');if(confirmRel){applyReliefAction(confirmRel.dataset.reliefId,confirmRel.dataset.reliefAction).catch(showActionError);return;}
 const ra=ev.target.closest('[data-relief-action]');if(ra){const r=reliefQueue.find(x=>x.id===ra.dataset.reliefId);if(r)confirmReliefAction(r,ra.dataset.reliefAction);return;}
 const x=ev.target.closest('[data-do]');if(x){const r=records.find(r=>r.id===x.dataset.id)||myRecords.find(r=>r.id===x.dataset.id);if(r)confirmAction(r,x.dataset.do);return;}const o=ev.target.closest('[data-open-doc]');if(o){showDocument(o.dataset.openDoc).catch(e=>toast(e.message||String(e)));return;}if(ev.target.id==='dialog-close'||ev.target.id==='cancel-action'){closeDialog();return;}const c=ev.target.closest('#confirm-action');if(c){applyAction(c.dataset.id,c.dataset.action).catch(showActionError);return;}});
 $('document').addEventListener('change',()=>{const file=$('document').files[0];try{if(file)validateFile(file);$('document-status').textContent=file?('Sedia dimuat naik: '+file.name):'Tiada dokumen dipilih.';}catch(e){$('document').value='';$('document-status').textContent=e.message;}});
 $('apply-form').addEventListener('submit',submit);['type','scope','period','start'].forEach(id=>$(id).addEventListener('change',syncForm));$('list-status-filter').addEventListener('change',e=>{if(tab!=='borang'){listFilterValue[tab]=e.target.value;draw();}});$('dialog').addEventListener('click',e=>{if(e.target===$('dialog'))closeDialog()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('dialog').hidden)closeDialog();});

}
async function init(){handlers();$('start').min=localDay();$('end').min=localDay();$('start').value=localDay();$('end').value=localDay();syncForm();
 try{const cfg=window.SeMAKMURFirebasePilotConfig;if(!cfg?.projectId)throw Error('Konfigurasi Firebase tidak tersedia.');const [app,authlib,dbLib]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')]);
 const fb=app.getApps().find(a=>a.name==='semakmur-fi-dashboard')||app.initializeApp(cfg,'semakmur-fi-dashboard');const auth=authlib.getAuth(fb);db=dbLib.getFirestore(fb);fns={...dbLib};
 authlib.onAuthStateChanged(auth,async u=>{unsubs.forEach(fn=>fn());unsubs=[];user=null;roles=[];realRoles=[];window.KB61?.clear();records=[];myRecords=[];myRelief=[];reliefQueue=[];todayReliefRows=null;statsLoaded=false;renderStats();if(!u){$('user-label').textContent='Belum log masuk';showMessage('Sila log masuk melalui Fi-LoginSession.html.','error');tellDashboard('semakmur-fi-kb-error','Sesi log masuk tidak tersedia.');return;}try{const staff=await dbLib.getDoc(dbLib.doc(db,'semakmur_dashboard_fi',u.uid));const raw=staff.data();if(!staff.exists()||raw?.active!==true||str(raw.ownerEmail).toLowerCase()!==str(u.email).toLowerCase()||raw.profile?.email?.toLowerCase()!==u.email.toLowerCase())throw Error('Akaun guru tidak sah atau belum aktif.');user={uid:u.uid,email:u.email,name:str(raw.profile?.namaPenuh)||u.displayName||'Guru'};profile=raw;$('user-label').textContent=user.name;
 try{const roleSnap=await dbLib.getDoc(dbLib.doc(db,'semakmur_fi_keberadaan_roles',u.uid));const roleData=roleSnap.data();realRoles=roleSnap.exists()&&roleData.active===true&&roleData.ownerEmail===u.email?(roleData.roles||[]):[];}catch{realRoles=[];}
 roles=realRoles.filter(r=>['GB','GPK','ADMIN_SISTEM','RELIEF_PEMANTAU'].includes(r));
 $('mode-label').textContent='RASMI';
 setRoleUI();
 const coll=dbLib.collection(db,'semakmur_fi_keberadaan');
 unsubs.push(dbLib.onSnapshot(dbLib.query(coll,dbLib.where('ownerUid','==',u.uid),dbLib.limit(100)),s=>{
   myRecords=s.docs.map(x=>x.data()).filter(r=>r.testMode===false);statsLoaded=true;
   if(!isAdmin())records=[...myRecords];
   draw();
 },e=>showMessage('Gagal membaca rekod sendiri: '+(e.code||e.message),'error')));
 if(isAdmin()){
   unsubs.push(dbLib.onSnapshot(dbLib.query(coll,dbLib.where('testMode','==',false),dbLib.limit(100)),s=>{
     records=s.docs.map(x=>x.data()).filter(r=>r.testMode===false);statsLoaded=true;draw();
   },e=>showMessage('Bacaan rekod rasmi gagal. Semak Firestore Rules dan peranan rasmi: '+(e.code||e.message),'error')));
   if(isReliefViewer()){
     unsubs.push(dbLib.onSnapshot(dbLib.query(dbLib.collection(db,'semakmur_fi_relief_harian'),dbLib.orderBy('date','desc'),dbLib.limit(100)),s=>{reliefQueue=s.docs.map(x=>({id:x.id,...x.data()})).filter(r=>r.engineVersion===3);renderReliefQueue();renderStats();},e=>console.warn('Senarai relief belum tersedia:',e.code||e.message)));
   }
 }
 // Ringkasan relief untuk hari ini perlu menggunakan jadual rasmi V5.1 yang diterbitkan.
 unsubs.push(dbLib.onSnapshot(dbLib.doc(db,'semakmur_fi_relief_public_harian',localDay()),snap=>{
   const data=snap.exists()?snap.data():null;
   todayReliefRows=data?.published===true&&Array.isArray(data.rows)?data.rows:null;
   renderStats();
 },e=>{todayReliefRows=null;renderStats();console.warn('Jadual Relief V5.1 belum dapat dibaca:',e.code||e.message)}));
 // Tugasan relief yang ditujukan kepada guru ini, dibaca terus daripada Firestore.
 unsubs.push(dbLib.onSnapshot(dbLib.query(dbLib.collection(db,'semakmur_fi_relief_harian'),dbLib.where('replacementUid','==',u.uid),dbLib.limit(100)),snap=>{
   myRelief=snap.docs.map(x=>({id:x.id,...x.data()})).filter(r=>r.engineVersion===3);renderMyRelief();
 },e=>console.warn('Relief guru tidak dapat dibaca:',e.code||e.message)));
 if(has('GPK')){
   dbLib.getDoc(dbLib.doc(db,'semakmur_fi_relief_staf','active')).then(snap=>{
     reliefStaff=(snap.data()?.staff||[]).filter(x=>x.idStaf&&x.name);renderReliefQueue();
   }).catch(e=>console.warn('Senarai guru relief belum diselaraskan:',e.code||e.message));
 }
 showMessage('');draw();tellDashboard('semakmur-fi-kb-ready');}catch(e){$('user-label').textContent='Semakan akaun gagal';tellDashboard('semakmur-fi-kb-error',String(e.code||e.message||e));showMessage('Semakan akaun gagal: '+(e.code||e.message||e),'error');}}
 ,e=>{$('user-label').textContent='Pengesahan gagal';showMessage('Pengesahan Firebase gagal: '+(e.code||e.message||e),'error');tellDashboard('semakmur-fi-kb-error',String(e.code||e.message||e));}
 );
 }catch(e){$('user-label').textContent='Sambungan gagal';showMessage('Modul belum dapat disambungkan: '+(e.code||e.message||e),'error');tellDashboard('semakmur-fi-kb-error',String(e.code||e.message||e));}
}
window.addEventListener('message',e=>{if(!FI_EMBED||e.origin!==location.origin||e.source!==window.parent)return;if(e.data?.type==='semakmur-fi-kb-request-state'&&user)tellDashboard('semakmur-fi-kb-ready');if(e.data?.type==='semakmur-fi-kb-show-relief'&&isReliefViewer()){tab='tindakan';draw();$('relief-box').open=true;}});
init();

window.KB61Bridge={api:(action,body={})=>transportDoc(action,'',null,body),roles:()=>user?roles.slice():[],today:localDay,esc};

;
