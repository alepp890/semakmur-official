/* SeMAKMUR Dashboard Guru PWA V6.5 – paparan sahaja.
   Tidak menukar struktur Firestore, URL backend, algorithma relief, atau rules.
   Data ringkasan ketiadaan hanya daripada semakmur_fi_keberadaan_hari_ini.
   Kategori khusus hanya dipaparkan apabila backend menghantar metadata jenis/scope/task.
*/
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=s=>String(s==null?'':s).trim().toUpperCase().replace(/[\s-]+/g,'_');
  const dayLabel=()=>new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kuala_Lumpur'}).format(new Date());
  const GROUPS=[
    {id:'cuti',label:'Cuti (CRK, CTR, MC)',icon:'fa-calendar-xmark'},
    {id:'dalam_tanpa',label:'Rasmi Dalam Sekolah · Tak Perlu Relief',icon:'fa-school'},
    {id:'dalam_sekat',label:'Rasmi Dalam Sekolah · Tak Boleh Direliefkan',icon:'fa-user-shield'},
    {id:'luar',label:'Rasmi Luar Sekolah · Perlu Relief',icon:'fa-briefcase'},
    {id:'lain',label:'Keberadaan Lain / Belum Diperincikan',icon:'fa-circle-info'}
  ];
  function groupFor(x){
    const type=normalize(x.category||x.type||x.jenis);
    const scope=normalize(x.scope||x.lokasi||x.location||x.tempat);
    const task=normalize(x.task||x.effect||x.tujuan||x.assignmentMode);
    if(['CRK','CTR','MC','CUTI_SAKIT','CUTI'].includes(type))return 'cuti';
    // Do NOT guess scope from 'URUSAN_RASMI' alone: that would mislabel teachers.
    const official=type.includes('RASMI')||type.includes('PROGRAM')||type.includes('TUGAS');
    if(official && (scope==='LUAR'||scope==='LUAR_SEKOLAH'||type.includes('RASMI_LUAR')))return 'luar';
    if(official && (scope==='DALAM'||scope==='DALAM_SEKOLAH'||type.includes('RASMI_DALAM'))){
      if(['SEKAT_CALON','TIDAK_LAYAK_RELIEF','TIDAK_BOLEH_DIRELIEF','TIDAK_BOLEH_DIRELIEFKAN'].includes(task))return 'dalam_sekat';
      if(['TIDAK_PERLU_RELIEF','TANPA_RELIEF','TIDAK_PERLU_GANTI','HAKIKI_KEKAL'].includes(task))return 'dalam_tanpa';
      return 'lain'; // Urusan dalam yang PERLU relief tidak boleh dilabel "Tak Perlu Relief".
    }
    return 'lain';
  }
  function categoryText(x){
    const type=normalize(x.category||x.type||x.jenis);
    if(type==='CRK'||type==='CTR')return type;
    if(type==='MC'||type==='CUTI_SAKIT')return 'Cuti'; // Tidak dedah status kesihatan dalam dashboard umum.
    if(type.includes('RASMI')||type.includes('TUGAS')||type.includes('PROGRAM'))return 'Urusan rasmi';
    if(type==='MIA')return 'Tidak hadir tanpa makluman';
    if(type.includes('KECEMASAN'))return 'Kecemasan';
    return 'Keberadaan';
  }
  function renderAbsence(data){
    const host=$('fi-v45-absence-list');if(!host)return;
    if(!data){
      host.innerHTML='<div class="fi-v6-no-data">Maklumat keberadaan belum tersedia.</div>';
      return;
    }
    const items=Array.isArray(data.items)?data.items:[];
    if(!items.length){host.innerHTML='<div class="fi-v6-no-data">Tiada rekod keberadaan untuk dipaparkan pada hari ini.</div>';return;}
    const grouped=Object.fromEntries(GROUPS.map(g=>[g.id,[]]));
    items.forEach(x=>{if(x&&typeof x==='object')grouped[groupFor(x)].push(x);});
    host.innerHTML=GROUPS.filter(g=>grouped[g.id].length).map(g=>{
      const rows=grouped[g.id].slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ms'))
        .map(x=>'<div class="fi-v65-absence-person"><span class="fi-v65-person-mark" aria-hidden="true"><i class="fa-solid fa-user"></i></span><span class="fi-v65-person-meta"><strong>'+esc(x.name||'Guru')+'</strong><small>'+esc(categoryText(x))+(x.period?' · '+esc(x.period):'')+'</small></span></div>').join('');
      return '<section class="fi-v65-absence-group" aria-label="'+esc(g.label)+'"><div class="fi-v65-group-title"><span><i class="fa-solid '+esc(g.icon)+'" aria-hidden="true"></i> '+esc(g.label)+'</span><span class="fi-v65-group-count">'+grouped[g.id].length+'</span></div><div class="fi-v65-person-list">'+rows+'</div></section>';
    }).join('');
  }
  function isHome(){return !document.body.classList.contains('fi-v6-on-schedule') && !document.body.classList.contains('fi-v6-on-attendance') && !document.body.classList.contains('fi-v6-on-relief') && !document.body.classList.contains('fi-v6-on-keberadaan');}
  function syncStatic(){
    const title=$('v4-header-title');if(title&&isHome()&&title.textContent!=='SeMAKMUR I-System')title.textContent='SeMAKMUR I-System';
    const date=$('fi-v6-date-short'),v=dayLabel();if(date&&date.textContent!==v)date.textContent=v;
    const relief=$('fi-v6-relief-value');
    if(relief&&relief.textContent.trim()==='Tiada relief ditugaskan kepada saya.')relief.textContent='Anda tidak mempunyai relief hari ini.';
    if(window.fi51ReliefWidgetHtml&&window.fi51ReliefWidgetHtml==='Tiada relief ditugaskan kepada saya.')window.fi51ReliefWidgetHtml='Anda tidak mempunyai relief hari ini.';
  }
  function init(){
    window.fiApplyKetiadaanHariIni=renderAbsence;
    // UI asal mengemas kini header pada navigasi; perhatikan elemen sahaja, bukan seluruh DOM.
    ['v4-header-title','fi-v6-date-short','fi-v6-relief-value'].forEach(id=>{
      const el=$(id);if(!el)return;
      const obs=new MutationObserver(syncStatic);obs.observe(el,{childList:true,characterData:true,subtree:true});
    });
    syncStatic();
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncStatic();});
    // Firestore sync untuk senarai ketiadaan kekal dilaksanakan oleh dashboard asal.
  }
  window.SeMAKMURPWA65={groupFor,renderAbsence,categoryText}; // untuk ujian frontend sahaja
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
