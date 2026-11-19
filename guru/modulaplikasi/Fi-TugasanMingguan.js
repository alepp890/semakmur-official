/* SeMAKMUR Smart Tugasan Mingguan V3.0 · Fi-Sync integrated frontend.
   Strictly authenticated POST; never write directly to Sheets or Firestore. */
'use strict';
const tm$=id=>document.getElementById(id);
const tmEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tmFmt=d=>{if(!/^\d{4}-\d\d-\d\d$/.test(String(d||'')))return String(d||'—');const [y,m,dd]=d.split('-');return `${dd}/${m}/${y}`;};
const tmToday=()=>{const v=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const parts=Object.fromEntries(v.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${parts.year}-${parts.month}-${parts.day}`;};
const tmState={overviewMeta:{},auth:null,user:null,data:null,detail:null,calendar:null,year:'2026',weekId:'',tab:'overview',busy:false,audit:null};
const tmManager=()=>!!tmState.data?.actor?.manager;
const tmMe=()=>tmState.data?.actor?.id||'';
const tmSelected=()=>tmState.data?.weeks?.find(w=>w.ID_Minggu===tmState.weekId);
const tmNames=()=>Object.fromEntries((tmState.detail?.members||[]).map(x=>[x.id,x.name]));
function tmNotice(text='',bad=false){const el=tm$('tm-notice');el.hidden=!text;el.textContent=String(text);el.classList.toggle('tm-error',!!bad);}
/* V5.0.2: lapisan loading berkongsi gaya e-Kehadiran/e-Relief.
   Hanya paparan; tidak menukar API, akses, tugasan atau data. */
const tmProcessKeys=new Set(['startup']);
function tmProcess(key,on,title='',message=''){
  if(on)tmProcessKeys.add(key);else tmProcessKeys.delete(key);
  const overlay=tm$('tm-process-overlay');if(!overlay)return;
  if(on){if(title)tm$('tm-process-title').textContent=title;if(message)tm$('tm-process-message').textContent=message;}
  overlay.hidden=tmProcessKeys.size===0;
  overlay.setAttribute('aria-busy',String(tmProcessKeys.size>0));
}
function tmBusy(flag){tmState.busy=!!flag;tm$('tm-loading').hidden=!flag;
  tmProcess('api',!!flag,'Memuatkan Data Tugasan Mingguan','Menyemak rekod rasmi, minggu dan kumpulan bertugas…');
  document.querySelectorAll('button,select,input,textarea').forEach(el=>{if(el.id==='tm-year'||el.id==='tm-refresh')el.disabled=flag;});}
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
  let result=await tmRun(()=>tmAPI('bootstrap',{year:tmState.year}));if(!result)return;
  if(!(result.weeks||[]).length && tmState.year===tmToday().slice(0,4)){
    const next=String(Number(tmState.year)+1);
    const alternate=await tmRun(()=>tmAPI('bootstrap',{year:next}));
    if(alternate?.weeks?.length){result=alternate;tmState.year=next;tm$('tm-year').value=next;}
  }
  tmState.data=result;tm$('tm-user').textContent=result.actor?.name||tmState.user?.email||'Guru';tm$('tm-tab-settings').hidden=!result.actor?.manager;tm$('tm-preflight').hidden=!result.actor?.manager;tm$('tm-sim-area').hidden=!result.actor?.manager;tm$('tm4-tab').hidden=!result.actor?.manager;
  const weeks=result.weeks||[];
  if(!weeks.some(x=>x.ID_Minggu===tmState.weekId)){
    const today=tmToday();tmState.weekId=(weeks.find(x=>x.Tempoh_Mula<=today&&today<=x.Tempoh_Tamat)||weeks[0])?.ID_Minggu||'';
  }
  tmState.overviewMeta={};tmRenderOverview();tmOverviewMeta();tmRenderSettings();if(result.actor?.manager)await tm4LoadWeeks(false);tmSignal('semakmur-tm-ready');
  if(tmState.weekId)await tmLoadDetail(false);else{tmState.detail=null;tmRenderDetail();}
  document.dispatchEvent(new Event('semakmur-tm-auth-ready'));
}
function tmRenderOverview(){
  const a=tmState.data||{},weeks=a.weeks||[],today=tmToday(),meta=tmState.overviewMeta||{};
  const summary=[['Minggu Persekolahan',weeks.length],['Kumpulan',a.groups?.length||0],
    ['Minggu Berlangsung',weeks.filter(w=>w.Tempoh_Mula<=today&&today<=w.Tempoh_Tamat).length],
    ['Laporan Dihantar',weeks.filter(w=>['MENUNGGU_GPK','MENUNGGU_GB','DISAHKAN'].includes(meta[w.ID_Minggu]?.reportStatus)).length]];
  tm$('tm-summary').innerHTML=summary.map(([lab,num])=>`<div class="tm-metric"><strong>${num}</strong><span>${tmEsc(lab)}</span></div>`).join('');
  tm$('tm-weeks').innerHTML=weeks.length?weeks.map(w=>{
    const m=meta[w.ID_Minggu]||{},name=w.Nama_Ketua_Cadangan||'Belum ditetapkan';
    const period=today<w.Tempoh_Mula?'Akan datang':today>w.Tempoh_Tamat?'Lepas':'Semasa';
    const sent=['MENUNGGU_GPK','MENUNGGU_GB','DISAHKAN'].includes(m.reportStatus);
    const group=String(w.Nama_Kumpulan||'Kumpulan '+w.ID_Kumpulan);
    const leader=w.pelan?.leader&&w.pelan?.leader!==w.ID_Ketua_Cadangan?'<span class="tm-week-note">Ketua mengikut jadual rasmi</span>':'';
    return `<article class="tm-week tm-week-v508"><div class="tm-week-head"><h3>Minggu ${tmEsc(w.Minggu||w.ID_Minggu)}</h3><span class="tm-tag tm-time-${period==='Semasa'?'now':period==='Lepas'?'past':'future'}">${period}</span></div>
      <div class="tm-week-group">${tmEsc(group)}</div><div class="tm-week-dates">${tmFmt(w.Tempoh_Mula)} – ${tmFmt(w.Tempoh_Tamat)}</div>
      <div class="tm-week-info"><span>Ketua Kumpulan</span><strong>${tmEsc(name)}</strong>${leader}</div>
      <div class="tm-week-info"><span>Penyelia GPK</span><strong>${tmEsc(m.gpkName||'Belum ditetapkan')}</strong></div>
      <div class="tm-week-info tm-week-theme"><span>Tema Nilai Murni</span><strong>${tmEsc(m.theme||'Belum ditetapkan')}</strong>
        <span>Tajuk</span><strong>${tmEsc(m.nilaiTitle||'Belum ditetapkan')}</strong></div>
      <div class="tm-week-bottom"><span class="tm5-pill ${sent?'submitted':'pending'}">${sent?'Laporan dihantar':'Belum dihantar'}</span>
      <button type="button" class="tm-btn tm-primary" data-tm-choose="${tmEsc(w.ID_Minggu)}">${sent?'Lihat Laporan':'Isi Laporan'}</button></div></article>`;
  }).join(''):'<p class="tm-empty">Tiada minggu persekolahan.</p>';
  const warnings=a.warnings||[];if(tm$('tm-source-card'))tm$('tm-source-card').hidden=!warnings.length;
  tm$('tm-warnings').innerHTML=warnings.map(x=>`<div class="tm-warning-line">${tmEsc(x)}</div>`).join('');
}
async function tmOverviewMeta(){
  const year=tmState.year;try{const r=await tmAPI('tm5OverviewMeta',{year});
    if(tmState.year!==year)return;tmState.overviewMeta=r.weeks||{};tmRenderOverview();
  }catch(e){console.warn('[TM5 metadata]',e?.message||String(e));}
}
async function tmLoadDetail(showMessage=true){
  const id=tmState.weekId;if(!id){tmState.detail=null;tmRenderDetail();return;}
  const r=await tmRun(()=>tmAPI('detail',{year:tmState.year,weekId:id}));if(!r)return;
  tmState.detail=r;tmState.calendar=null;tmRenderDetail();
  if(showMessage)tmNotice('Data minggu bertugas telah dimuatkan.');
  // Baca maklumat CUTI/aktiviti secara berasingan; kegagalan tidak menyekat jadual rasmi.
  const expectedYear=tmState.year,expectedWeek=id;
  tmAPI('calendarView',{year:expectedYear,weekId:expectedWeek}).then(calendar=>{
    if(tmState.year!==expectedYear||tmState.weekId!==expectedWeek)return;
    tmState.calendar=calendar;tmRenderAssignments();
  }).catch(err=>console.warn('[TM calendar]',err.message||String(err)));
}
function tmRenderDetail(){
  const d=tmState.detail,sel=tmSelected();
  const blurb=sel?`<strong>Minggu ${tmEsc(sel.Minggu||sel.ID_Minggu)} · ${tmEsc(sel.Nama_Kumpulan)}</strong><small>${tmFmt(sel.Tempoh_Mula)} hingga ${tmFmt(sel.Tempoh_Tamat)}</small>`:'<strong>Belum pilih minggu bertugas.</strong>';
  const about=`<div>${blurb}</div><div><strong>Ketua: ${tmEsc((d?.members||[]).find(x=>x.id===d?.plan?.leader)?.name||sel?.Nama_Ketua_Cadangan||'Belum ditetapkan')}</strong></div>`;
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
/* V5.0.6 — Paparan jadual RASMI. Format sahaja; tidak mengubah agihan / API / data. */
function tmDutyClock(value){
  if(value===null||value===undefined||value==='')return '';
  if(typeof value==='number'&&Number.isFinite(value)){
    const frac=((value%1)+1)%1,mins=Math.round(frac*1440)%1440;
    return String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
  }
  const text=String(value).trim();
  // Apps Script String(Date) daripada sel masa mengandungi tarikh palsu 1899.
  // Ambil komponen jam secara langsung, tanpa Date.parse yang boleh menukar zon waktu.
  const match=text.match(/(?:^|[ T])(\d{1,2}):(\d{2})(?::\d{2})?(?=$|\s|Z|[+-]|\.)/);
  if(match){
    const hh=Number(match[1]),mm=Number(match[2]);
    if(hh<24&&mm<60)return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
  }
  if(/^\d{1,2}\.\d{2}$/.test(text)){
    const parts=text.split('.'),hh=Number(parts[0]),mm=Number(parts[1]);
    if(hh<24&&mm<60)return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
  }
  return ''; // Jangan papar tarikh 1899 atau nilai masa rosak kepada guru.
}
function tmDutyDateList(week,rows){
  const start=week?.mula||week?.start,stop=week?.tamat||week?.end;
  if(/^20\d{2}-\d\d-\d\d$/.test(String(start||''))&&/^20\d{2}-\d\d-\d\d$/.test(String(stop||''))){
    const dates=[];
    for(let d=new Date(start+'T00:00:00Z'),last=new Date(stop+'T00:00:00Z');d<=last&&dates.length<7;d.setUTCDate(d.getUTCDate()+1)){
      if(d.getUTCDay()>=1&&d.getUTCDay()<=5)dates.push(d.toISOString().slice(0,10));
    }
    if(dates.length)return dates;
  }
  return [...new Set(rows.map(x=>String(x.date||'')).filter(Boolean))].sort();
}
function tmDutySetFilter(date){
  tmState.dutyFilter=date;
  const wrap=tm$('tm-assignments');if(!wrap)return;
  wrap.querySelectorAll('[data-duty-filter]').forEach(btn=>{
    const active=btn.dataset.dutyFilter===date;
    btn.classList.toggle('is-active',active);
    btn.setAttribute('aria-pressed',String(active));
  });
  wrap.querySelectorAll('[data-duty-card]').forEach(el=>{el.hidden=date!=='ALL'&&el.dataset.dutyCard!==date;});
}
function tmRenderAssignments(){
  const detail=tmState.detail||{},raw=detail.assignments||[],types=tmState.data?.settings?.types||[];
  const names=Object.fromEntries((detail.members||[]).map(x=>[String(x.id),x.name]));
  const typeNames=Object.fromEntries(types.map(x=>[String(x.id),x.name]));
  const week=detail.week||{},dates=tmDutyDateList(week,raw);
  const holder=tm$('tm-assignments');if(!holder)return;
  const calDays=Array.isArray(tmState.calendar?.days)?tmState.calendar.days:[];
  const calendar=new Map(calDays.map(d=>[String(d.date),d]));
  if(!raw.length&&!calDays.length){holder.innerHTML='<div class="tm-duty-empty"><strong>Belum ada tugasan untuk minggu ini</strong></div>';return;}
  const valid=raw.filter(x=>x&&x.date),uniqueStaff=new Set(valid.map(x=>String(x.staff||'')).filter(Boolean));
  const byDate=new Map(dates.map(date=>[date,[]]));
  valid.forEach(x=>{if(!byDate.has(x.date))byDate.set(x.date,[]);byDate.get(x.date).push(x);});
  const activeDays=[...byDate].filter(([,entries])=>entries.length>0).length;
  const summary=`<div class="tm-duty-meta">${valid.length} penugasan <span>·</span> ${uniqueStaff.size} guru <span>·</span> ${activeDays} hari bertugas</div>`;
  const tabs=`<div class="tm-duty-filters" role="group" aria-label="Tapis jadual mengikut hari">
    <button type="button" data-duty-filter="ALL">Semua Hari</button>
    ${dates.map(date=>{
      const cal=calendar.get(date),isHoliday=String(cal?.kind||'').toUpperCase()==='CUTI';
      return `<button type="button" data-duty-filter="${tmEsc(date)}">${tmEsc(tmDayName(date))}<span>${isHoliday?'Cuti':byDate.get(date)?.length||0}</span></button>`;
    }).join('')}
  </div>`;
  const dayCards=[...byDate].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,entries])=>{
    const cal=calendar.get(date)||{},events=Array.isArray(cal.events)?cal.events:[];
    const holiday=String(cal.kind||'').toUpperCase()==='CUTI'||events.some(e=>String(e.type||'').toUpperCase()==='CUTI');
    const labels=events.filter(e=>e&&e.title).map(e=>({title:String(e.title),holiday:String(e.type||'').toUpperCase()==='CUTI'}));
    if(holiday&&!labels.some(e=>e.holiday))labels.unshift({title:'Cuti',holiday:true});
    const eventsHtml=labels.length?`<div class="tm-duty-events">${labels.map(e=>`<span class="tm-duty-event ${e.holiday?'is-holiday':''}" title="${tmEsc(e.title)}">${tmEsc(e.title)}</span>`).join('')}</div>`:'';
    // Paparan menyatukan guru mengikut jenis tugasan; masa sebenar kekal dalam data/enjin V4.
    const grouped=new Map();
    entries.forEach(x=>{
      const id=String(x.task||''),title=typeNames[id]||id||'Tugasan';
      if(!grouped.has(id))grouped.set(id,{title,staff:[]});
      grouped.get(id).staff.push({id:String(x.staff||''),name:names[String(x.staff)]||String(x.staff||'Belum ditetapkan')});
    });
    const sorted=[...grouped.values()].sort((a,b)=>a.title.localeCompare(b.title,'ms'));
    const content=sorted.length?sorted.map(item=>{
      const unique=[...new Map(item.staff.map(s=>[s.id,s])).values()];
      return `<div class="tm-duty-taskrow">
        <div class="tm-duty-taskname"><strong>${tmEsc(item.title)}</strong></div>
        <div class="tm-duty-teachers">${unique.map(s=>`<span class="tm-duty-person" title="${tmEsc(s.id)}">${tmEsc(s.name)}</span>`).join('')}</div>
      </div>`;
    }).join(''):`<div class="tm-duty-no-tasks">${holiday?'Tiada tugasan — cuti':'Tiada tugasan pada hari ini.'}</div>`;
    return `<section class="tm-duty-daycard" data-duty-card="${tmEsc(date)}">
      <div class="tm-duty-dayhead"><div class="tm-duty-daytitle"><strong>${tmEsc(tmDayName(date))}</strong><span>${tmFmt(date)}</span>${eventsHtml}</div><span class="tm-duty-count">${holiday?'CUTI':entries.length+' penugasan'}</span></div>
      ${sorted.length?'<div class="tm-duty-columns"><span>Tugasan</span><span>Guru Bertugas</span></div>':''}${content}</section>`;
  }).join('');
  holder.innerHTML=summary+tabs+'<div class="tm-duty-days">'+dayCards+'</div>';
  holder.querySelectorAll('[data-duty-filter]').forEach(btn=>btn.addEventListener('click',()=>tmDutySetFilter(btn.dataset.dutyFilter)));
  const validFilters=['ALL',...byDate.keys()];
  tmDutySetFilter(validFilters.includes(tmState.dutyFilter)?tmState.dutyFilter:'ALL');
}
function tmPrintDocumentHTML(title,inner){
  const old=document.getElementById('tm508-print-host');if(old)old.remove();
  const host=document.createElement('section');host.id='tm508-print-host';
  host.innerHTML=`<h1 class="tm508-print-heading">${tmEsc(title)}</h1>${inner}`;
  document.body.append(host);
  const done=()=>{host.remove();window.removeEventListener('afterprint',done);};
  window.addEventListener('afterprint',done,{once:true});
  try{window.print();}catch(e){done();tmNotice('Cetakan tidak dapat dibuka. Cuba semula.',true);}
}
function tmPrintScheduleOfficial(){
  const w=tmSelected(),d=tmState.detail,table=tm$('tm-assignments');
  if(!w||!d?.assignments?.length||!table)return tmNotice('Jadual rasmi belum tersedia untuk dicetak.',true);
  const clone=table.cloneNode(true);
  clone.querySelector('.tm-duty-filters')?.remove();clone.querySelectorAll('[data-duty-card]').forEach(x=>x.hidden=false);
  tmPrintDocumentHTML('Jadual Guru Bertugas',`<div class="tm508-print-meta">Minggu ${tmEsc(w.Minggu)} · ${tmEsc(w.Nama_Kumpulan)} · ${tmFmt(w.Tempoh_Mula)} – ${tmFmt(w.Tempoh_Tamat)}</div>${clone.outerHTML}`);
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
async function tmChoose(id){tmState.weekId=id;await tmLoadDetail(false);if(window.SeMAKMUR_TM5_UI)await window.SeMAKMUR_TM5_UI.openFromOverview(id);else tmTab('report-studio');}
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
    </article>`).join(''):'<p class="tm-empty">Tiada minggu simulasi.</p>';
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
// V4.8: load group members independently of generated schedules.
function tm48RenderMemberPicker(members,week){
  const picker=tm$('tm4-teacher'),old=picker.value;
  picker.innerHTML='<option value="">'+(members.length?'Pilih guru bertugas…':'Tiada ahli kumpulan untuk minggu ini')+'</option>'+
    members.map(p=>`<option value="${tmEsc(p.id)}">${tmEsc(p.name)}</option>`).join('');
  if(members.some(p=>p.id===old))picker.value=old;
  if(week){
    for(const id of ['tm4-absence-from','tm4-absence-to','tm4-cal-date']){
      const el=tm$(id);if(!el.value||el.value<week.from||el.value>week.to)el.value=week.from;
      el.min=week.from;el.max=week.to;
    }
  }
}
async function tm48LoadMembers(){
  const args=tm4Input(),picker=tm$('tm4-teacher');
  // Do not show members of a previously selected week.
  tmState.tm48Members=null;
  picker.innerHTML='<option value="">'+(args.weekId?'Memuatkan nama guru…':'Pilih minggu dahulu…')+'</option>';
  if(!args.weekId)return;
  const r=await tmRun(()=>tmAPI('tm4Members',args));
  if(!r){picker.innerHTML='<option value="">Gagal muat nama guru — cuba Muat Jadual</option>';return;}
  // Ignore a stale response when the user changed session/mode/week mid-request.
  if(args.mode!==tm4GetMode()||args.weekId!==tm$('tm4-week').value||args.year!==tmState.year)return;
  const members=Array.isArray(r.members)?r.members:[];
  tmState.tm48Members={mode:args.mode,weekId:args.weekId,members};
  tm48RenderMemberPicker(members,r);
  if(!members.length)tm4Message('Tiada ahli kumpulan aktif bagi minggu ini.',true);
}
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
  tm4Message(mode==='SIMULASI'?'Simulasi aktif. Rekod rasmi tidak berubah.':'Mod rasmi menggunakan masa pelayan semasa. Pastikan takwim, hari sekolah dan penyegerakan keberadaan disahkan.');
  // Must run even when loadSchedule=false during the initial bootstrap.
  await tm48LoadMembers();
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
  const w=schedule?.week;
  tm48RenderMemberPicker(members,w);
  tmState.tm48Members={mode:tm4GetMode(),weekId:tm$('tm4-week').value,members};
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
    const visible=(tmState.tm48Members?.weekId===args.weekId&&tmState.tm48Members?.mode===args.mode)
      ?tmState.tm48Members.members:(tmState.tm4?.week?.members||[]);
    const result=await tmAPI('tm47AbsenceList',args),people=Object.fromEntries(visible.map(x=>[x.id,x.name]));
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
    const tab=e.target.closest('[data-tm-tab]');if(tab){tmTab(tab.dataset.tmTab);if(tab.dataset.tmTab==='report-studio'&&window.SeMAKMUR_TM5_UI)await window.SeMAKMUR_TM5_UI.openPrimary?.();return;}
    const choose=e.target.closest('[data-tm-choose]');if(choose){await tmChoose(choose.dataset.tmChoose);return;}
    const draft=e.target.closest('[data-tm-draft]');if(draft){await tmDraft(draft.dataset.tmDraft);return;}
    const edTask=e.target.closest('[data-edit-task]');if(edTask){tmEditTask(edTask.dataset.editTask);return;}
    const edTime=e.target.closest('[data-edit-time]');if(edTime){tmEditTime(edTime.dataset.editTime);return;}
    const cancel=e.target.closest('[data-tm47-cancel]');if(cancel){await tm47CancelAbsence(cancel.dataset.tm47Cancel);return;}
  });
  tm$('tm-year').addEventListener('change',async()=>{tmState.year=tm$('tm-year').value;tmState.weekId='';tm49.ready=false;await tmBootstrap();if(tmState.tab==='report-studio')await window.SeMAKMUR_TM5_UI?.reload?.();});
  tm$('tm-refresh').addEventListener('click',tmBootstrap);
  tm$('tm-day-date').addEventListener('change',tmRenderSections);
  tm$('tm-day-section').addEventListener('change',tmRestoreOwnEntry);
  tm$('tm-daily-form').addEventListener('submit',tmSaveDaily);
  tm$('tm-weekly-form').addEventListener('submit',e=>{e.preventDefault();tmSaveWeekly(true);});
  tm$('tm-weekly-draft').addEventListener('click',()=>tmSaveWeekly(false));
  tm$('tm-review-accept').addEventListener('click',()=>tmReview('DISEMAK'));
  tm$('tm-review-return').addEventListener('click',()=>tmReview('DIPULANGKAN'));
  tm$('tm-print').addEventListener('click',tmPrint);
  tm$('tm-preflight').addEventListener('click',tmPreflight);tm$('tm-print-schedule-live').addEventListener('click',tmPrintScheduleOfficial);
  tm$('tm-sim-preview').addEventListener('click',tmPreviewSimulation);
  tm$('tm-seed').addEventListener('click',tmSeed);
  tm$('tm4-mode').addEventListener('change',()=>tm4LoadWeeks(true));
  tm$('tm4-week').addEventListener('change',async()=>{await tm48LoadMembers();await tm4LoadSchedule();});
  tm$('tm49-open-from-smart').addEventListener('click',async()=>{const x=tm4Input();if(!x.weekId){tm4Message('Pilih minggu dahulu.',true);return;}
    tmTab('report-studio');tm49ModeOptions();tm$('tm49-mode').value=x.mode;await tm49LoadWeeks(x.weekId);});
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
  tm$('tm-time-effective').value=tmState.year+'-01-01';tm43SyncTimeForm();tm49Install();
}
async function tmInit(){tmListeners();tmTab('overview');tmNotice('Menyemak akaun Google MOE dan peranan…');
  try{
    const cfg=window.SeMAKMURFirebasePilotConfig;if(!cfg?.projectId)throw Error('Konfigurasi Firebase belum tersedia.');
    const [appMod,authMod]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')]);
    const fb=appMod.getApps().find(x=>x.name==='semakmur-fi-dashboard')||appMod.initializeApp(cfg,'semakmur-fi-dashboard');
    tmState.auth=authMod.getAuth(fb);
    authMod.onAuthStateChanged(tmState.auth,async user=>{
      tmState.user=user;
      try{
        if(!user){tmNotice('Akaun belum log masuk. Sila kembali ke Fi-LoginSession melalui Dashboard Guru.',true);tmSignal('semakmur-tm-error');return;}
        await tmBootstrap();
      }catch(e){console.error('[TM auth]',e);tmNotice('Gagal memuatkan modul: '+(e.message||String(e)),true);tmSignal('semakmur-tm-error');}
      finally{tmProcess('startup',false);}
    },err=>{tmProcess('startup',false);tmNotice('Firebase Authentication gagal: '+(err.message||err),true);tmSignal('semakmur-tm-error');});
  }catch(e){tmProcess('startup',false);tmNotice('Sambungan modul gagal: '+(e.message||String(e)),true);tmSignal('semakmur-tm-error');}
}
/* V4.9 Laporan & Cetakan: additive, does not modify the V4.8 duty engine. */
const tm49={mode:'',weekId:'',year:'',date:'',weeks:[],data:null,dirty:false,dailyDirty:false,weeklyDirty:false,ready:false};
const tm49Names=()=>Object.fromEntries((tm49.data?.members||[]).map(x=>[x.id,x.name]));
const tm49Status=()=>String(tm49.data?.weekly?.status||'BELUM DIISI');
const tm49Input=()=>({mode:tm49.mode,weekId:tm49.weekId,year:tmState.year});
const tm49SectionForDay=(s,day)=>!s.day||String(s.day).toUpperCase()==='SEMUA'||String(s.day).toUpperCase()===String(day).toUpperCase();
const tm49DayName=d=>tm49.data?.days?.find(x=>x.date===d)?.day||tmDayName(d);
function tm49Message(message,bad=false){
  const e=tm$('tm49-info');if(!e)return;e.textContent=message||'';e.classList.toggle('tm49-error',bad);
}
function tm49ModeOptions(){
  const select=tm$('tm49-mode');if(!select)return;
  const maySim=tmManager(),val=tm49.ready?select.value:((tmState.data?.weeks||[]).length?'RASMI':'SIMULASI');
  select.innerHTML='<option value="RASMI">Rasmi (Takwim Sekolah)</option>'+
    (maySim?'<option value="SIMULASI">SIMULASI — Ujian sahaja</option>':'');
  select.value=maySim?(val==='RASMI'?'RASMI':'SIMULASI'):'RASMI';
  tm49.mode=select.value;
}
async function tm49Ensure(){
  if(!tmState.data)return;
  tm49ModeOptions();
  if(!tm49.ready||tm49.year!==tmState.year||tm49.mode!==tm$('tm49-mode').value){
    tm49.year=tmState.year;tm49.ready=true;await tm49LoadWeeks();
  }
}
async function tm49LoadWeeks(preferred){
  const mode=tm$('tm49-mode').value;
  tm49.mode=mode;tm49.data=null;tm49.dirty=false;tm49.dailyDirty=false;tm49.weeklyDirty=false;
  let weeks=[];
  if(mode==='SIMULASI'){
    const r=await tmRun(()=>tmAPI('tm4SimList'));if(!r)return;
    weeks=(r.weeks||[]).map(w=>({id:w.id,label:w.label,from:w.from,to:w.to,group:w.group}));
  }else{
    weeks=(tmState.data?.weeks||[]).map(w=>({id:w.ID_Minggu,label:w.Minggu||w.ID_Minggu,from:w.Tempoh_Mula,
      to:w.Tempoh_Tamat,group:w.Nama_Kumpulan||w.ID_Kumpulan}));
  }
  tm49.weeks=weeks;
  const sel=tm$('tm49-week'),last=preferred||tm49.weekId;
  sel.innerHTML='<option value="">Pilih minggu bertugas…</option>'+weeks.map(w=>
    `<option value="${tmEsc(w.id)}">${tmEsc(w.label)} · ${tmFmt(w.from)} · ${tmEsc(w.group)}</option>`).join('');
  tm49.weekId=weeks.some(w=>w.id===last)?last:(weeks[0]?.id||'');sel.value=tm49.weekId;
  if(tm49.weekId)await tm49Load();else tm49Message('Tiada minggu untuk mod ini. Jika takwim rasmi kosong, gunakan simulasi pentadbir.',true);
}
async function tm49Load(){
  const weekId=tm$('tm49-week').value;if(!weekId)return;
  if(tm49.dirty&&!confirm('Catatan belum disimpan. Teruskan dan buang perubahan ini?')){
    tm$('tm49-week').value=tm49.weekId;return;
  }
  tm49.weekId=weekId;tm49.dirty=false;tm49.dailyDirty=false;tm49.weeklyDirty=false;
  const result=await tmRun(()=>tmAPI('tm49Load',tm49Input()));
  if(!result){tm49Message('Gagal membaca laporan.',true);return;}
  tm49.data=result;tm49Render();
  tm49Message(result.mode==='SIMULASI'?'Mod simulasi: catatan tidak masuk laporan rasmi dan tidak dihantar kepada Guru Besar.':
    'Mod rasmi: setiap catatan direkod di bawah akaun Google MOE pengguna.');
}
function tm49Render(){
  const d=tm49.data;if(!d)return;
  const demo=d.mode==='SIMULASI',names=tm49Names();
  tm$('tm49-banner').textContent=demo?'SIMULASI — BUKAN LAPORAN RASMI':'LAPORAN RASMI';
  tm$('tm49-banner').classList.toggle('tm49-demo',demo);
  tm$('tm49-title').textContent=`${d.week.label} · Kumpulan ${d.week.group} · ${tmFmt(d.week.from)} – ${tmFmt(d.week.to)}`;
  tm$('tm49-leader').textContent='Ketua: '+(names[d.week.leader]||d.week.leader||'Belum ditetapkan');
  const sections=d.sections||[],entries=d.entries||[],has=d.days||[];
  tm$('tm49-progress').innerHTML=`<div><strong>${has.length}</strong><span>Hari sekolah</span></div>`+
    `<div><strong>${new Set(entries.map(x=>x.date)).size}</strong><span>Hari ada laporan</span></div>`+
    `<div><strong>${entries.length}</strong><span>Catatan</span></div>`+
    `<div><strong>${tmEsc(tm49Status())}</strong><span>Status mingguan</span></div>`;
  const oldDate=tm$('tm49-date').value;
  tm$('tm49-date').innerHTML=has.map(x=>`<option value="${tmEsc(x.date)}">${tmEsc(x.day)} · ${tmFmt(x.date)}</option>`).join('');
  if(has.some(x=>x.date===oldDate))tm$('tm49-date').value=oldDate;
  tm49.date=tm$('tm49-date').value;
  const status=tm49Status();
  const writable=(demo?d.actor.manager:d.members.some(x=>x.id===d.actor.id))&&
    !['DIHANTAR','DISEMAK','SIM_DIHANTAR','SIM_DISEMAK'].includes(status)&&!!d.planId;
  tm$('tm49-save-day').disabled=!writable;
  tm$('tm49-blocked').textContent=!d.planId?'Jadual/pelan belum dijana untuk minggu ini. Sediakan pelan dahulu.':
    !writable?'Laporan terkunci atau akaun ini tidak mempunyai akses menyunting.':'';
  tm49RenderDay();tm49RenderWeek();
}
function tm49RenderDay(){
  const d=tm49.data;if(!d)return;
  const date=tm$('tm49-date').value,day=tm49DayName(date),own=d.actor.id,names=tm49Names();
  const sect=(d.sections||[]).filter(s=>tm49SectionForDay(s,day)),entries=(d.entries||[]).filter(e=>e.date===date);
  const locked=!d.planId||['DIHANTAR','DISEMAK','SIM_DIHANTAR','SIM_DISEMAK'].includes(tm49Status())||
    (d.mode==='SIMULASI'?!d.actor.manager:!d.members.some(x=>x.id===own));
  tm$('tm49-sections').innerHTML=sect.length?sect.map((s,i)=>{
    const ownEntry=entries.find(e=>e.section===s.id&&e.author===own),other=entries.filter(e=>e.section===s.id&&e.author!==own);
    return `<div class="tm49-section"><div class="tm49-section-head"><strong>${i+1}. ${tmEsc(s.name)}</strong>`+
       `${s.day&&String(s.day).toUpperCase()!=='SEMUA'?'<span class="tm49-daybadge">'+tmEsc(s.day)+'</span>':''}</div>`+
       `<textarea class="tm49-textarea" data-tm49-section="${tmEsc(s.id)}" rows="3" maxlength="3000" ${locked?'disabled':''}`+
       ` placeholder="Tulis pemerhatian, isu, tindakan atau aktiviti yang berlaku…">${tmEsc(ownEntry?.text||'')}</textarea>`+
       (other.length?`<div class="tm49-other"><b>Catatan ahli lain</b>${other.map(e=>
         `<p><strong>${tmEsc(names[e.author]||e.author)}:</strong> ${tmEsc(e.text)}</p>`).join('')}</div>`:'')+'</div>';
  }).join(''):'<p class="tm-empty">Tiada bahagian laporan aktif untuk tarikh ini. Semak TM_Tetapan_Laporan.</p>';
  tm$('tm49-save-day').disabled=locked||!sect.length;
  tm$('tm49-day-summary').textContent=`${entries.length} catatan direkod pada ${day} · ${tmFmt(date)}. Bahagian kosong tidak memadam catatan lama.`;
}
function tm49RenderWeek(){
  const d=tm49.data;if(!d)return;
  const w=d.weekly||{},s=tm49Status(),isLeader=!!d.actor.isLeader,locked=['DIHANTAR','DISEMAK','SIM_DIHANTAR','SIM_DISEMAK'].includes(s);
  tm$('tm49-weekly-status').textContent=s;
  tm$('tm49-summary').value=w.summary||'';tm$('tm49-followup').value=w.followup||'';
  tm$('tm49-summary').disabled=!isLeader||locked||!d.planId;tm$('tm49-followup').disabled=!isLeader||locked||!d.planId;
  tm$('tm49-save-week').disabled=!isLeader||locked||!d.planId;
  tm$('tm49-submit-week').disabled=!isLeader||locked||!d.planId;
  tm$('tm49-submit-week').textContent=d.mode==='SIMULASI'?'Hantar (Simulasi sahaja)':'Hantar kepada Guru Besar';
  const reviewReady=s===(d.mode==='SIMULASI'?'SIM_DIHANTAR':'DIHANTAR');
  tm$('tm49-review-box').hidden=!(reviewReady&&(d.mode==='SIMULASI'?d.actor.manager:d.actor.isGB));
  tm$('tm49-gb-comment').textContent=w.review?'Ulasan semakan: '+w.review:'';
}
async function tm49SaveDay(e){
  e.preventDefault();if(!tm49.data?.planId)return tm49Message('Jana pelan minggu terlebih dahulu.',true);
  if(tm49.weeklyDirty)return tm49Message('Simpan Draf Ulasan Mingguan dahulu sebelum menyimpan catatan harian.',true);
  const date=tm$('tm49-date').value,items=[...tm$('tm49-sections').querySelectorAll('[data-tm49-section]')]
    .map(x=>({section:x.dataset.tm49Section,text:x.value})).filter(x=>x.text.trim());
  if(!items.length)return tm49Message('Isi sekurang-kurangnya satu catatan.',true);
  const r=await tmRun(()=>tmAPI('tm49SaveDay',{...tm49Input(),date,items}));if(!r)return;
  tm49.dirty=false;tm49.dailyDirty=false;await tm49Load();tm49Message(`${r.saved} bahagian laporan harian disimpan. Catatan ahli lain tidak berubah.`);
}
async function tm49SaveWeek(submit){
  if(tm49.dailyDirty)return tm49Message('Simpan catatan harian dahulu sebelum menyimpan Ulasan Mingguan.',true);
  if(submit&&!confirm(tm49.mode==='SIMULASI'?'Hantar laporan simulasi untuk ujian? Tiada makluman rasmi dihantar kepada GB.':
    'Hantar laporan mingguan kepada Guru Besar? Selepas dihantar, penyuntingan dikunci.'))return;
  const r=await tmRun(()=>tmAPI('tm49SaveWeek',{...tm49Input(),summary:tm$('tm49-summary').value,
    followup:tm$('tm49-followup').value,submit}));if(!r)return;
  tm49.dirty=false;tm49.dailyDirty=false;tm49.weeklyDirty=false;await tm49Load();tm49Message(submit?(tm49.mode==='SIMULASI'?'Status penghantaran simulasi direkod; tiada tindakan GB sebenar.':
    'Laporan dihantar kepada Guru Besar.'):'Draf ulasan ketua disimpan.');
}
async function tm49Review(decision){
  const txt=tm$('tm49-review-note').value;
  if(!confirm('Simpan keputusan semakan '+decision+'?'))return;
  const r=await tmRun(()=>tmAPI('tm49Review',{...tm49Input(),decision,note:txt}));if(!r)return;
  await tm49Load();tm49Message(tm49.mode==='SIMULASI'?'Keputusan semakan simulasi disimpan.':'Keputusan semakan GB disimpan.');
}
function tm49PrintStyles(kind){return `
  @page{size:${kind==='schedule'?'A4 landscape':'A4 portrait'};margin:14mm 13mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1d2d23;font-size:10pt;margin:0;line-height:1.48}
  .printhead{border-bottom:3px solid #244e39;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;gap:18px}
  .printhead h1{font-size:15pt;margin:0 0 3px}.printhead h2{font-size:11pt;margin:0;font-weight:600;color:#4b6254}
  .small{font-size:8pt;color:#526457}.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;background:#f2f5ef;border:1px solid #dce5d9;padding:9px 10px;margin-bottom:12px}
  h3{font-size:11pt;color:#1d4b35;margin:18px 0 7px;border-bottom:1px solid #c7d4c9;padding-bottom:5px}h4{font-size:9.6pt;margin:8px 0 2px}
  table{border-collapse:collapse;width:100%;font-size:9pt}th,td{border:1px solid #cad6ca;padding:6px 7px;vertical-align:top;text-align:left}th{background:#e9efe8}
  .tm49-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;break-after:page;page-break-after:always}.tm49-pair:last-child{break-after:auto;page-break-after:auto}
  .tm49-pair .daypage{min-width:0}.tm49-pair table{font-size:8pt}.tm49-pair th,.tm49-pair td{padding:5px 6px}
  .daypage{break-inside:avoid;page-break-inside:avoid;margin-bottom:14px}.notebox{margin:7px 0;page-break-inside:avoid;break-inside:avoid;padding:6px 9px;border-left:3px solid #a8bdaa;background:#f9fbf8}
  .notebox p{white-space:pre-wrap;overflow-wrap:anywhere;margin:2px 0}.notebox small{color:#607062}.watermark{color:#a33a2b;font-weight:bold;font-size:10pt;letter-spacing:.05em}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:28px}.sign>div{padding-top:28px;border-top:1px solid #444;font-size:9pt}
  .printbar{padding:10px;background:#fffde7;margin-bottom:15px;border:1px solid #d8c779}
  @media print{.printbar{display:none}}`;
}
function tm49PrintHeader(data,title){
  const w=data.week,names=tm49Names(),sim=data.mode==='SIMULASI',draft=!['DIHANTAR','DISEMAK'].includes(String(data.weekly?.status||'').toUpperCase());
  return `<div class="printhead"><div><h1>SK SEGAMBUT MAKMUR</h1><h2>${tmEsc(title)}</h2></div><div class="small">SeMAKMUR I-System<br>${sim?'<span class="watermark">SIMULASI · BUKAN RASMI</span>':(draft?'<span class="watermark">DRAF · BELUM DISAHKAN</span>':'DOKUMEN SEKOLAH')}</div></div>`+
    `<div class="meta"><div><b>Sesi:</b> ${tmEsc(tmState.year)}</div><div><b>Minggu:</b> ${tmEsc(w.label)}</div>`+
    `<div><b>Kumpulan:</b> ${tmEsc(w.group)}</div><div><b>Tarikh:</b> ${tmFmt(w.from)} – ${tmFmt(w.to)}</div>`+
    `<div><b>Ketua:</b> ${tmEsc(names[w.leader]||w.leader||'Belum ditetapkan')}</div><div><b>Status:</b> ${tmEsc(data.weekly?.status||'DRAF')}</div></div>`;
}
function tm49ScheduleBody(data){
  const valid=data.assignments||[],dates=data.days||[];
  const cards=dates.map(day=>{
    const rows=valid.filter(x=>x.date===day.date),groups=new Map();
    rows.forEach(x=>{const task=x.taskName||x.task||'Tugasan';if(!groups.has(task))groups.set(task,[]);
      groups.get(task).push(x.name||tm49Names()[x.staff]||x.staff||'PERLU TINDAKAN');});
    return `<section class="daypage"><h4>${tmEsc(day.day)} · ${tmFmt(day.date)}</h4><table><thead><tr><th style="width:40%">Tugasan</th><th>Guru Bertugas</th></tr></thead><tbody>`+
      ([...groups].map(([task,names])=>`<tr><td>${tmEsc(task)}</td><td>${names.map(tmEsc).join('<hr style="border:0;border-top:1px dotted #d1ddd1;margin:3px 0">')}</td></tr>`).join('')||
      '<tr><td colspan="2">Tiada agihan / hari cuti / pelan belum dijana</td></tr>')+'</tbody></table></section>';
  });
  const pairs=[];for(let i=0;i<cards.length;i+=2)pairs.push(`<div class="tm49-pair">${cards.slice(i,i+2).join('')}</div>`);
  return `<h3>Jadual Agihan Mengikut Hari</h3>`+pairs.join('');
}

function tm49DailyBody(data,onlyDate){
  const members=tm49Names(),sec=Object.fromEntries((data.sections||[]).map(x=>[x.id,x.name]));
  const days=(data.days||[]).filter(x=>!onlyDate||x.date===onlyDate);
  return days.map(day=>{
    const entries=(data.entries||[]).filter(x=>x.date===day.date);
    const grouped=new Map();entries.forEach(x=>{if(!grouped.has(x.section))grouped.set(x.section,[]);grouped.get(x.section).push(x);});
    const bodies=[...grouped].map(([section,group])=>`<div class="notebox"><h4>${tmEsc(sec[section]||section)}</h4>`+
      group.map(x=>`<p>${tmEsc(x.text)}</p><small>Dicatat oleh: ${tmEsc(members[x.author]||x.author)}</small>`).join('')+'</div>').join('');
    return `<section class="daypage"><h3>${tmEsc(day.day)} · ${tmFmt(day.date)}</h3>${bodies||'<p>Belum ada catatan pada hari ini.</p>'}</section>`;
  }).join('');
}
function tm49WeeklyBody(data){const w=data.weekly||{};
  return `<h3>Ulasan Keseluruhan Ketua</h3><p>${tmEsc(w.summary||'Belum diisi.').replace(/\n/g,'<br>')}</p>`+
    `<h3>Cadangan & Tindakan Susulan</h3><p>${tmEsc(w.followup||'—').replace(/\n/g,'<br>')}</p>`+
    `<h3>Semakan Guru Besar</h3><p>${tmEsc(w.review||'Belum disemak.').replace(/\n/g,'<br>')}</p>`+
    `<div class="sign"><div>Disediakan oleh<br>Ketua Guru Bertugas</div><div>Disemak oleh<br>Guru Besar</div></div>`;
}
function tm49Print(kind){
  const d=tm49.data;if(!d)return tm49Message('Muatkan laporan minggu dahulu.',true);
  const date=tm$('tm49-date').value;
  const titles={schedule:'JADUAL GURU BERTUGAS MINGGUAN',day:'LAPORAN HARIAN GURU BERTUGAS',week:'LAPORAN GURU BERTUGAS MINGGUAN'};
  let body='';if(kind==='schedule')body=tm49ScheduleBody(d);
  else if(kind==='day')body=tm49DailyBody(d,date);
  else if(kind==='week')body=tm49DailyBody(d)+tm49WeeklyBody(d);
  else return;
  const html=`<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>${titles[kind]} — ${tmEsc(d.week.label)}</title>`+
    `<style>${tm49PrintStyles(kind)}</style></head><body><div class="printbar">Pratonton A4 · Tekan <b>Ctrl+P</b> atau klik Cetak. `+
    `<button onclick="window.print()">Cetak / Simpan PDF</button></div>${tm49PrintHeader(d,titles[kind])}${body}</body></html>`;
  const win=window.open('','_blank');
  if(!win)return tm49Message('Pop-up cetakan disekat. Benarkan tetingkap baharu untuk laman ini.',true);
  win.opener=null;win.document.open();win.document.write(html);win.document.close();win.focus();
}
function tm49Install(){
  tm$('tm49-mode').addEventListener('change',async()=>{
    if(tm49.dirty&&!confirm('Ada perubahan laporan yang belum disimpan. Tukar mod?')){tm$('tm49-mode').value=tm49.mode;return;}
    tm49.dirty=false;await tm49LoadWeeks();
  });
  tm$('tm49-week').addEventListener('change',tm49Load);
  tm$('tm49-date').addEventListener('change',()=>{
    if(tm49.dirty&&!confirm('Perubahan belum disimpan. Tukar tarikh?')){tm$('tm49-date').value=tm49.date;return;}
    tm49.date=tm$('tm49-date').value;tm49.dirty=false;tm49RenderDay();
  });
  tm$('tm49-sections').addEventListener('input',()=>{tm49.dirty=true;tm49.dailyDirty=true;});
  tm$('tm49-summary').addEventListener('input',()=>{tm49.dirty=true;tm49.weeklyDirty=true;});
  tm$('tm49-followup').addEventListener('input',()=>{tm49.dirty=true;tm49.weeklyDirty=true;});
  tm$('tm49-save-day').addEventListener('click',tm49SaveDay);
  tm$('tm49-save-week').addEventListener('click',()=>tm49SaveWeek(false));
  tm$('tm49-submit-week').addEventListener('click',()=>tm49SaveWeek(true));
  tm$('tm49-review-accept').addEventListener('click',()=>tm49Review('DISEMAK'));
  tm$('tm49-review-return').addEventListener('click',()=>tm49Review('DIPULANGKAN'));
  tm$('tm49-print-day').addEventListener('click',()=>tm49Print('day'));
  tm$('tm49-print-week').addEventListener('click',()=>tm49Print('week'));
  tm$('tm49-print-schedule').addEventListener('click',()=>tm49Print('schedule'));
  tm$('tm49-refresh').addEventListener('click',tm49Load);
}

// Existing authentication and page boot remain unchanged.
tmInit();

/* V5 auth bridge: uses the existing Fi token, nonce and validated Web App response. */
window.SeMAKMUR_TM5_API = function(payload){return tmAPI(payload.op,payload);};


/* SeMAKMUR TM V5.0.8: laporan live, direktori, pratonton dokumen dan cetak manual. */
(()=>{'use strict';
  const panel=document.getElementById('tm-panel-report-studio');if(!panel)return;
  [...panel.children].forEach(el=>el.hidden=true);
  const root=document.createElement('div');root.id='tm5-root';panel.append(root);
  const S={weeks:[],week:null,days:[],actor:null,teachers:[],corrections:[],current:null,
    chosen:'',screen:'fill',loaded:false,request:0,previewOrigin:'directory'};
  const esc=v=>tmEsc(v);
  const showDate=v=>tmFmt(String(v||''));
  const names=()=>Object.fromEntries(S.teachers.map(t=>[String(t.id),String(t.name)]));
  const teacherName=id=>names()[String(id)]||String(id||'—');
  const statusName=s=>({DISAHKAN:'Disahkan',MENUNGGU_GPK:'Semakan GPK',MENUNGGU_GB:'Menunggu Pengesahan GB',LENGKAP:'Laporan Lengkap',DIPULANGKAN:'Pembetulan',BELUM_DIHANTAR:'Tiada Laporan'}[String(s)]||'Tiada Laporan');
  const dayStatus=s=>({LENGKAP:'Lengkap',DRAF:'Draf',PEMBETULAN:'Perlu pembetulan',BELUM_DIISI:'Belum diisi'}[String(s)]||'Belum diisi');
  const api=async p=>{if(typeof window.SeMAKMUR_TM5_API!=='function')throw Error('Sambungan laporan tidak tersedia.');return window.SeMAKMUR_TM5_API(p);};
  const msg=(s='',bad=false)=>{const el=root.querySelector('#tm5-message');if(el){el.textContent=s;el.dataset.error=bad?'1':'0';}};
  async function call(p){tmProcess('laporan',true,'Memuatkan Laporan Mingguan','Menyemak rekod rasmi…');try{
    const raw=await api(p);if(raw?.ok===false||raw?.status==='RALAT')throw Error(raw?.message||raw?.error||'Tindakan tidak berjaya');
    return raw?.data&&typeof raw.data==='object'&&raw.weeks===undefined&&raw.days===undefined?raw.data:raw;
  }catch(e){msg(e?.message||String(e),true);throw e;}finally{tmProcess('laporan',false);}}
  const guard=fn=>async(...args)=>{try{return await fn(...args);}catch(e){console.error('[TM5 V508]',e);}};
  const common=()=>({weekId:S.week?.id,year:S.week?.year||String(S.week?.from||'').slice(0,4)});
  const isApproved=()=>S.week?.status==='DISAHKAN';
  const weekId=w=>String(w?.weekId||w?.id||'');
  const daysAllComplete=()=>S.days.length>0&&S.days.every(d=>d.status==='LENGKAP');
  const dayWritable=d=>!!d?.canWrite;
  const today=()=>tmToday();
  function chrome(){root.innerHTML=`<div class="tm5-toolbar-card"><div class="tm5-report-actions">
    <button type="button" id="tm5-fill-tab" class="tm5-action current">Isi Laporan</button>
    <button type="button" id="tm5-directory-tab" class="tm5-action">Direktori Laporan Mingguan</button>
    <button type="button" id="tm5-reload" class="tm5-action tm5-refresh">Muat Semula</button>
  </div><div id="tm5-message" role="status" aria-live="polite"></div></div><div id="tm5-content"></div>`;
    root.querySelector('#tm5-fill-tab').onclick=guard(openPrimary);
    root.querySelector('#tm5-directory-tab').onclick=guard(directory);
    root.querySelector('#tm5-reload').onclick=guard(async()=>{
      const selection=S.week?.id,old=S.screen;await fetchWeeks();
      if(old==='directory')await directory(false);
      else if(selection)await loadWeek(S.weeks.find(w=>weekId(w)===selection)||{weekId:selection,year:tmState.year,from:S.week?.from},old==='preview');
      else await openPrimary();
    });
  }
  const slot=()=>root.querySelector('#tm5-content');
  const setTab=name=>{S.screen=name;root.querySelector('#tm5-fill-tab')?.classList.toggle('current',name==='fill');root.querySelector('#tm5-directory-tab')?.classList.toggle('current',name==='directory'||name==='preview');};
  async function fetchWeeks(){const res=await call({op:'tm5Directory',years:[tmState.year]});S.weeks=res.weeks||[];S.loaded=true;}
  const planned=w=>!!w?.ready;
  const containsNow=w=>String(w.from||'')<=today()&&today()<=String(w.to||'');
  async function openPrimary(){setTab('fill');if(!S.loaded)await fetchWeeks();
    let w=S.weeks.find(w=>weekId(w)===S.chosen&&planned(w));
    if(!w)w=S.weeks.find(w=>containsNow(w)&&planned(w))||S.weeks.find(planned);
    if(!w){slot().innerHTML='<div class="tm5-card tm5-empty">Belum ada jadual rasmi untuk diisi.</div>';return;}
    await loadWeek(w,false);
  }
  async function openFromOverview(id){S.chosen=String(id||'');tmTab('report-studio');if(!S.loaded)await fetchWeeks();
    const w=S.weeks.find(x=>weekId(x)===S.chosen);
    if(!w||!planned(w)){setTab('fill');slot().innerHTML='<div class="tm5-card tm5-empty">Jadual rasmi bagi minggu ini belum tersedia.</div>';return;}
    await loadWeek(w,false);
  }
  async function directory(reload=true){setTab('directory');if(reload||!S.loaded)await fetchWeeks();
    const rows=S.weeks.map((w,i)=>{const allowed=w.status==='DISAHKAN'&&planned(w);
      return `<div class="tm5-dirrow ${allowed?'tm5-dir-open':'tm5-dir-disabled'}" ${allowed?`role="button" tabindex="0" data-preview-week="${i}"`:'aria-disabled="true"'}>
        <div class="tm5-dir-title"><strong>Minggu ${esc(w.label)} · Kumpulan ${esc(w.group)}</strong><span>${showDate(w.from)} – ${showDate(w.to)}</span></div>
        <span class="tm5-pill ${allowed?'approved':'pending'}">${esc(statusName(w.status))}</span>
        <span class="tm5-dir-arrow" aria-hidden="true">${allowed?'›':'🔒'}</span>
      </div>`;}).join('');
    slot().innerHTML=`<section class="tm5-card tm5-dir-card"><h2>Direktori Laporan Mingguan</h2><div class="tm5-directory">${rows||'<p class="tm5-muted">Tiada laporan tersedia.</p>'}</div></section>`;
    slot().querySelectorAll('[data-preview-week]').forEach(el=>{const open=guard(()=>loadWeek(S.weeks[Number(el.dataset.previewWeek)],true));
      el.addEventListener('click',open);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});});
  }
  async function loadWeek(w,preview=false,selectedDate=''){
    const seq=++S.request;const year=String(w.year||tmState.year);const data=await call({op:'tm5Load',year,weekId:weekId(w),mode:'RASMI'});if(seq!==S.request)return;
    S.week={...data.week,year};S.actor=data.actor||{};S.days=data.days||[];S.teachers=data.teachers||[];
    S.corrections=data.corrections||[];S.chosen=S.week.id;
    if(preview){S.previewOrigin='directory';setTab('preview');renderDocument();return;}
    setTab('fill');S.current=S.days.find(d=>d.date===selectedDate)||S.days.find(d=>d.date===today())||
      S.days.filter(d=>d.available).at(-1)||S.days[0]||null;
    renderEditor();
  }
  function titleStatus(s){return `<span class="tm5-pill ${s==='DISAHKAN'?'approved':'pending'}">${esc(statusName(s))}</span>`;}
  function renderEditor(){const w=S.week;if(!w)return;
    const all=daysAllComplete(),canSend=all&&S.actor?.isLeader&&!['MENUNGGU_GPK','MENUNGGU_GB','DISAHKAN'].includes(w.status);
    const right=all?`<section class="tm5-card tm5-leader-panel"><h3>Ulasan Ketua Kumpulan</h3>
      ${S.actor?.isLeader?`<label>Ulasan keseluruhan<textarea id="tm5-summary" ${canSend?'':'disabled'}>${esc(w.summary||'')}</textarea></label>
        <label>Cadangan / Tindakan Susulan<textarea id="tm5-followup" ${canSend?'':'disabled'}>${esc(w.followup||'')}</textarea></label>
        ${canSend?'<div class="tm5-row"><button id="tm5-draft">Simpan Ulasan</button><button id="tm5-submit" class="primary">Hantar kepada GPK</button></div>':''}`
       :`<p class="tm5-readonly">${esc(w.summary||'Tiada ulasan.')}</p><p class="tm5-readonly">${esc(w.followup||'')}</p>`}</section>`:'';
    slot().innerHTML=`<section class="tm5-card tm5-report-banner"><div><h2>Minggu ${esc(w.label)} · Kumpulan ${esc(w.group)}</h2>
        <span class="tm5-period">${showDate(w.from)} – ${showDate(w.to)}</span><span class="tm5-people">Ketua: ${esc(teacherName(w.leader))} · GPK: ${esc(teacherName(w.gpk))}</span></div>
        <div class="tm5-banner-right">${titleStatus(w.status)}${isApproved()?'<button id="tm5-print-now" class="primary">Cetak Laporan Ini</button>':''}</div></section>
      <div class="tm5-editor-layout"><aside class="tm5-card tm5-daylist"><h3>Laporan Harian</h3>
      ${S.days.map((d,i)=>`<button type="button" class="tm5-daybutton ${S.current?.date===d.date?'chosen':''}"
        data-day-index="${i}" ${d.available?'':'disabled'}><span><strong>${esc(d.day)}</strong><small>${showDate(d.date)}</small></span>
        <span class="tm5-daybadge ${d.status==='LENGKAP'?'ok':d.status==='PEMBETULAN'?'fix':''}">${d.available?esc(dayStatus(d.status)):'Belum tiba 🔒'}</span></button>`).join('')}
      </aside><div class="tm5-report-right"><div id="tm5-detail"></div>${right}
      ${S.actor?.isGPK&&w.status==='MENUNGGU_GPK'?reviewCard('GPK'):''}
      ${S.actor?.isGB&&w.status==='MENUNGGU_GB'?reviewCard('GB'):''}</div></div>`;
    slot().querySelectorAll('[data-day-index]').forEach(el=>el.onclick=()=>{S.current=S.days[Number(el.dataset.dayIndex)];renderEditor();});
    if(S.current&&S.current.available)renderDay();else slot().querySelector('#tm5-detail').innerHTML='<section class="tm5-card tm5-empty">Pilih hari laporan.</section>';
    if(canSend){slot().querySelector('#tm5-draft').onclick=guard(()=>saveWeek(false));slot().querySelector('#tm5-submit').onclick=guard(()=>saveWeek(true));}
    const r=slot().querySelector('#tm5-review-submit');if(r)r.onclick=guard(review);
    const print=slot().querySelector('#tm5-print-now');if(print)print.onclick=printDocument;
  }
  function reviewCard(role){return `<section class="tm5-card tm5-review"><h3>Semakan ${role}</h3><label>Catatan ${role}<textarea id="tm5-review-note"></textarea></label>
    <label>Keputusan<select id="tm5-review-decision"><option value="APPROVE">${role==='GPK'?'Sokong kepada GB':'Sahkan Laporan'}</option><option value="RETURN">Pulangkan untuk Pembetulan</option></select></label>
    <div class="tm5-return-days"><strong>Hari yang perlu dibetulkan</strong>${S.days.map(d=>`<div class="tm5-return-day"><label><input type="checkbox" data-return-date="${esc(d.date)}"> ${esc(d.day)} · ${showDate(d.date)}</label><textarea data-note-date="${esc(d.date)}" placeholder="Arahan pembetulan"></textarea></div>`).join('')}</div>
    <button class="primary" id="tm5-review-submit">Hantar Keputusan</button></section>`;}
  async function review(){const decision=slot().querySelector('#tm5-review-decision').value;
    const corrections=[];if(decision==='RETURN')slot().querySelectorAll('[data-return-date]:checked').forEach(x=>corrections.push({date:x.dataset.returnDate,note:slot().querySelector(`[data-note-date="${x.dataset.returnDate}"]`).value}));
    if(decision==='RETURN'&&(!corrections.length||corrections.some(x=>!x.note.trim())))throw Error('Pilih hari dan isi arahan pembetulan.');
    if(!confirm('Sahkan keputusan semakan?'))return;
    await call({op:S.actor.isGPK?'tm5GpkReview':'tm5GBReview',...common(),decision,note:slot().querySelector('#tm5-review-note').value,corrections});
    await loadWeek({weekId:S.week.id,year:S.week.year,from:S.week.from},false,S.current?.date);
  }
  async function saveWeek(submit){if(submit&&!confirm('Hantar laporan kepada GPK?'))return;
    await call({op:'tm5SaveWeek',...common(),summary:slot().querySelector('#tm5-summary').value,
      followup:slot().querySelector('#tm5-followup').value,submit});await loadWeek({weekId:S.week.id,year:S.week.year,from:S.week.from},false,S.current?.date);}
  function field(key,title,options,value){const o=value||{},v=String(o.status||'');return `<div class="tm5-field" data-pair="${key}">
    <label>${esc(title)}<select data-status="${key}"><option value="">Pilih...</option>${options.map(x=>`<option value="${x}" ${v===x?'selected':''}>${x.replaceAll('_',' ')}</option>`).join('')}</select></label>
    <div data-extra="${key}"><label>Catatan / Penerangan<textarea data-text="${key}">${esc(o.text||'')}</textarea></label></div></div>`;}
  function items(list,type){return (list||[]).map((a,i)=>`<div class="tm5-field" data-${type}-item><label>${type==='activity'?'Aktiviti':'Pelawat'} ${i+1}</label>
    <input data-item-title value="${esc(type==='activity'?a.title:a)}" placeholder="${type==='activity'?'Tajuk aktiviti':'Nama / maklumat pelawat'}">
    ${type==='activity'?`<textarea data-item-desc placeholder="Penerangan aktiviti">${esc(a.desc||'')}</textarea>`:''}<button type="button" data-remove>Buang</button></div>`).join('');}
  function renderDay(){const d=S.current;if(!d||!d.available)return;const edit=dayWritable(d),x=d.data||{},el=slot().querySelector('#tm5-detail');if(!el)return;
    if(!edit){
      const hasData=!!d.data&&Object.keys(d.data).length>0;
      const reopenAllowed=S.actor?.isLeader&&d.status==='LENGKAP'&&['BELUM_DIHANTAR','LENGKAP','DIPULANGKAN'].includes(S.week.status);
      el.innerHTML=`<section class="tm5-card tm5-day-view"><div class="tm5-formhead"><h3>${esc(d.day)} · ${showDate(d.date)}</h3>
        <span class="tm5-pill">${esc(dayStatus(d.status))}</span></div>
        ${hasData?docDay(d):'<div class="tm5-empty">Laporan belum diisi.</div>'}
        ${reopenAllowed?'<div class="tm5-field"><label>Alasan Buka Semula<textarea id="tm5-reopen-reason"></textarea></label><button id="tm5-reopen">Buka Semula Laporan</button></div>':''}
        </section>`;
      const reopen=el.querySelector('#tm5-reopen');if(reopen)reopen.onclick=guard(async()=>{
        await call({op:'tm5Reopen',...common(),date:d.date,reason:el.querySelector('#tm5-reopen-reason').value});
        await loadWeek({weekId:S.week.id,year:S.week.year,from:S.week.from},false,d.date);
      });return;
    }
    el.innerHTML=`<section class="tm5-card tm5-daily-form"><div class="tm5-formhead"><h3>${esc(d.day)} · ${showDate(d.date)}</h3><span class="tm5-pill">${esc(dayStatus(d.status))}</span></div>
      ${S.corrections.filter(c=>String(c.Tarikh)===d.date&&String(c.Status)==='TERBUKA').map(c=>`<div class="tm5-fix-note"><strong>Arahan pembetulan</strong><p>${esc(c.Catatan)}</p></div>`).join('')}
      <h4>Ucapan</h4>${field('speech_gb','Ucapan Guru Besar / Pentadbir',['ADA','TIADA'],x.speech_gb)}
        ${field('speech_duty','Ucapan Guru Bertugas',['ADA','TIADA'],x.speech_duty)}${field('speech_discipline','Ucapan Guru Disiplin',['ADA','TIADA'],x.speech_discipline)}
      <h4>Laporan Kebersihan</h4>${[['clean_student','Tandas Murid'],['clean_teacher','Tandas Guru'],['clean_hall','Dewan Sri Makmur'],['clean_ground','Persekitaran Sekolah']].map(([k,v])=>field(k,v,['BERSIH','MEMUASKAN','PERLU_PERHATIAN'],x[k])).join('')}
      <h4>Laporan Disiplin</h4>${[['discipline_break','Waktu Rehat'],['discipline_exit','Waktu Pulang']].map(([k,v])=>field(k,v,['TERKAWAL','MEMUASKAN','PERLU_PERHATIAN'],x[k])).join('')}
      <h4>Program Makmur</h4><div class="tm5-program">${esc(['Perhimpunan Pagi','Penerapan Nilai','Senamrobik','Bacaan Hadis 40','Bacaan Yaasin'][d.dayIndex]||'Program Makmur')}</div>
      <label>Pelaksanaan<select id="tm5-program"><option value="ADA">Berlangsung</option><option value="BATAL">Dibatalkan</option></select></label>
      ${d.dayIndex===0?`<p class="tm5-readonly">Guru Bertugas: Kumpulan ${esc(S.week.group)}</p>`:`<label>Guru Pengendali<select id="tm5-program-teacher"><option value="">Pilih guru</option>${S.teachers.map(t=>`<option value="${esc(t.id)}" ${String(x.makmur_teacher)===String(t.id)?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label>`}
      <label data-cancel-wrap>Sebab Pembatalan<textarea id="tm5-cancel">${esc(x.makmur_cancel_reason||'')}</textarea></label>
      <h4>Laporan Aktiviti / Program</h4><div id="tm5-activities">${items(x.activities,'activity')}</div><button type="button" id="tm5-add-activity">+ Tambah Aktiviti</button>
      <h4>Senarai Pelawat</h4><label>Pelawat<select id="tm5-visitors-status"><option value="TIADA">Tiada</option><option value="ADA">Ada</option></select></label>
      <div id="tm5-visitors">${items(x.visitors,'visitor')}</div><button type="button" id="tm5-add-visitor">+ Tambah Pelawat</button>
      ${edit?'<div class="tm5-row tm5-save-actions"><button id="tm5-save-draft">Simpan Draf</button><button class="primary" id="tm5-finish">Tandakan Lengkap & Kunci</button></div>':''}
      ${S.actor?.isLeader&&d.status==='LENGKAP'&&['BELUM_DIHANTAR','LENGKAP','DIPULANGKAN'].includes(S.week.status)?'<div class="tm5-field"><label>Alasan Buka Semula<textarea id="tm5-reopen-reason"></textarea></label><button id="tm5-reopen">Buka Semula Laporan</button></div>':''}
    </section>`;
    el.querySelector('#tm5-program').value=x.makmur_status||'ADA';el.querySelector('#tm5-visitors-status').value=x.visitors_status||'TIADA';
    const toggle=()=>{el.querySelectorAll('[data-pair]').forEach(p=>{const k=p.dataset.pair,v=p.querySelector('select').value;
      p.querySelector('[data-extra]').hidden= v==='TIADA'||(k.startsWith('clean_')||k.startsWith('discipline_'))&&v!=='PERLU_PERHATIAN';});
      el.querySelector('[data-cancel-wrap]').hidden=el.querySelector('#tm5-program').value!=='BATAL';
      const has=el.querySelector('#tm5-visitors-status').value==='ADA';el.querySelector('#tm5-visitors').hidden=!has;el.querySelector('#tm5-add-visitor').hidden=!has;};
    el.querySelectorAll('select').forEach(s=>s.onchange=toggle);toggle();
    if(!edit){el.querySelectorAll('input,select,textarea,button:not(#tm5-reopen)').forEach(x=>x.disabled=true);}
    else{el.querySelector('#tm5-save-draft').onclick=guard(()=>saveDay(false));el.querySelector('#tm5-finish').onclick=guard(()=>saveDay(true));
      el.querySelector('#tm5-add-activity').onclick=()=>el.querySelector('#tm5-activities').insertAdjacentHTML('beforeend',items([{title:'',desc:''}],'activity'));
      el.querySelector('#tm5-add-visitor').onclick=()=>el.querySelector('#tm5-visitors').insertAdjacentHTML('beforeend',items([''],'visitor'));
      el.addEventListener('click',ev=>{if(ev.target.closest('[data-remove]'))ev.target.closest('.tm5-field').remove();});}
    const reopen=el.querySelector('#tm5-reopen');if(reopen)reopen.onclick=guard(async()=>{const reason=el.querySelector('#tm5-reopen-reason').value;
      await call({op:'tm5Reopen',...common(),date:d.date,reason});await loadWeek({weekId:S.week.id,year:S.week.year,from:S.week.from},false,d.date);});
  }
  function collect(){const area=slot().querySelector('#tm5-detail'),out={};area.querySelectorAll('[data-pair]').forEach(el=>{
    out[el.dataset.pair]={status:el.querySelector('select').value,text:el.querySelector('textarea').value};});
    out.makmur_status=area.querySelector('#tm5-program').value;out.makmur_teacher=area.querySelector('#tm5-program-teacher')?.value||'';
    out.makmur_cancel_reason=area.querySelector('#tm5-cancel').value;
    out.activities=[...area.querySelectorAll('[data-activity-item]')].map(x=>({title:x.querySelector('[data-item-title]').value,desc:x.querySelector('[data-item-desc]').value}));
    out.visitors_status=area.querySelector('#tm5-visitors-status').value;
    out.visitors=[...area.querySelectorAll('[data-visitor-item]')].map(x=>x.querySelector('[data-item-title]').value);return out;
  }
  async function saveDay(complete){const date=S.current.date;if(complete&&!confirm('Laporan akan dikunci selepas dimuktamadkan. Teruskan?'))return;
    await call({op:'tm5SaveDay',...common(),date,data:collect(),complete});
    await loadWeek({weekId:S.week.id,year:S.week.year,from:S.week.from},false,date);
  }
  const cell=(name,value)=>`<div class="tm5-doc-cell"><b>${esc(name)}</b><p>${esc(value||'—')}</p></div>`;
  const itemVal=(d,k)=>{const x=d?.data?.[k]||{};if(!x.status)return '—';
    if(x.status==='TIADA')return 'Tiada ucapan';if(x.status==='PERLU_PERHATIAN')return 'Perlu perhatian: '+(x.text||'');
    if(x.status==='ADA')return x.text||'—';return x.status==='BERSIH'?'Bersih':x.status==='TERKAWAL'?'Terkawal':x.status==='MEMUASKAN'?'Memuaskan':x.status;};
  function docDay(d){const v=d.data||{},program=['Perhimpunan Pagi','Penerapan Nilai','Senamrobik','Bacaan Hadis 40','Bacaan Yaasin'][d.dayIndex]||'Program Makmur';
    return `<section class="tm5-doc-day"><h3>${esc(d.day)} · ${showDate(d.date)}</h3><div class="tm5-doc-grid">
      ${cell('Ucapan Guru Besar / Pentadbir',itemVal(d,'speech_gb'))}${cell('Ucapan Guru Bertugas',itemVal(d,'speech_duty'))}${cell('Ucapan Guru Disiplin',itemVal(d,'speech_discipline'))}
      ${[['clean_student','Tandas Murid'],['clean_teacher','Tandas Guru'],['clean_hall','Dewan Sri Makmur'],['clean_ground','Persekitaran Sekolah'],['discipline_break','Disiplin Waktu Rehat'],['discipline_exit','Disiplin Waktu Pulang']].map(([k,label])=>cell(label,itemVal(d,k))).join('')}
      ${cell(program,v.makmur_status==='BATAL'?'Dibatalkan. '+(v.makmur_cancel_reason||''):'Berlangsung seperti biasa. Guru bertugas: '+(d.dayIndex===0?'Kumpulan '+S.week.group:teacherName(v.makmur_teacher)))}
      ${cell('Laporan Aktiviti',(v.activities||[]).length?(v.activities||[]).map((a,i)=>`${i+1}. ${a.title}: ${a.desc}`).join('\n'):'Tiada laporan aktiviti yang berjalan pada hari ini.')}
      ${cell('Senarai Pelawat',v.visitors_status==='ADA'?(v.visitors||[]).join('; '):'Tiada pelawat dilaporkan.')}
      </div></section>`;
  }
  function documentHTML(){const w=S.week;return `<article class="tm5-document" id="tm5-document"><div class="tm5-doc-title"><div class="tm5-doc-school">SK SEGAMBUT MAKMUR</div>
    <h2>LAPORAN GURU BERTUGAS MINGGUAN</h2><p>Minggu ${esc(w.label)} · Kumpulan ${esc(w.group)} · ${showDate(w.from)} – ${showDate(w.to)}</p></div>
    <div class="tm5-doc-signatures"><div><b>Ketua Kumpulan</b><span>${esc(teacherName(w.leader))}</span></div><div><b>GPK Penyelia</b><span>${esc(teacherName(w.gpk))}</span></div></div>
    ${S.days.map(docDay).join('')}
    <section class="tm5-doc-day"><h3>Ulasan Ketua Kumpulan</h3>${cell('Ulasan Keseluruhan',w.summary)}${cell('Cadangan / Tindakan Susulan',w.followup)}</section>
    <section class="tm5-doc-day"><h3>Semakan dan Pengesahan</h3>${cell('Ulasan GPK',w.gpkNote)}${cell('Ulasan Guru Besar',w.gbNote)}
      ${cell('Disahkan Oleh',w.verifiedName||teacherName(w.verifiedBy))}${cell('Tarikh Pengesahan',String(w.verifiedAt||''))}</section>
    </article>`;}
  function renderDocument(){if(!isApproved()){msg('Pratonton rasmi hanya selepas disahkan Guru Besar.',true);return;}
    setTab('preview');slot().innerHTML=`<section class="tm5-card tm5-preview-banner"><div><h2>Minggu ${esc(S.week.label)} · Kumpulan ${esc(S.week.group)}</h2>
       <span>${showDate(S.week.from)} – ${showDate(S.week.to)}</span></div><div class="tm5-banner-right">
       <button id="tm5-preview-back">← Direktori</button><button id="tm5-print-preview" class="primary">Cetak Laporan Ini</button></div></section>
       ${documentHTML()}`;
    slot().querySelector('#tm5-preview-back').onclick=guard(directory);
    slot().querySelector('#tm5-print-preview').onclick=printDocument;
  }
  function printDocument(){if(!isApproved())return msg('Laporan belum disahkan oleh Guru Besar.',true);
    tmPrintDocumentHTML('Laporan Guru Bertugas Mingguan',documentHTML());
  }
  function init(){chrome();if(tmState.data)guard(async()=>{await fetchWeeks();await openPrimary();})();
    else document.addEventListener('semakmur-tm-auth-ready',()=>guard(async()=>{await fetchWeeks();await openPrimary();})(),{once:true});
  }
  window.SeMAKMUR_TM5_UI={openFromOverview:guard(openFromOverview),openPrimary:guard(openPrimary),reload:guard(async()=>{await fetchWeeks();await openPrimary();})};
  init();
})();
