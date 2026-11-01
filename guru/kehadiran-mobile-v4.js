/* Kehadiran PWA Mobile V4.5 – paparan ringkas; desktop kekal asal. */
(function(){'use strict';
  if(!window.matchMedia('(max-width:767px)').matches)return;
  const $=id=>document.getElementById(id);
  const mobile=$('v4-attendance');if(!mobile)return;
  const orig={apply:applyStaticForDate,renderStudents:renderStudents,renderClasses:renderClasses,loadStudents:loadStudents,refreshLive:refreshLive,save:save};
  let open=false,tab='isi';const overrides=new Set();

  function setLoader(show,text){
    const el=$('v4-page-loader'); if(!el) return;
    if(text){ const caption=el.querySelector('span'); if(caption) caption.textContent=text; }
    el.hidden=!show;
  }
  function selectedIso(){ return $('tarikh').value || malaysiaDate(); }
  function updateDateChip(){
    const dt=$('v4-att-date');if(!dt)return;
    const iso=selectedIso();
    dt.textContent=new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kuala_Lumpur'}).format(new Date(iso+'T12:00:00+08:00'));
  }
  function list(){
    const snap=state.staticData;
    const base=Array.isArray(snap?.semuaKelas)&&snap.semuaKelas.length ? snap.semuaKelas : (Array.isArray(state.kelas)?state.kelas:[]);
    const current=new Map((state.kelas||[]).map(x=>[String(x.idKelas||'').toUpperCase(),x]));
    const seen=new Set();
    return base.filter(x=>{
      const id=String(x?.idKelas||'').toUpperCase();
      if(!id||seen.has(id))return false; seen.add(id); return true;
    }).map(x=>{
      const id=String(x.idKelas).toUpperCase();
      const live=current.get(id)||{};
      return {...x,...live,namaKelas:x.namaKelas||live.namaKelas||id,
        statusRekod:live.statusRekod||x.statusRekod||'BELUM_SEMAK',
        jumlahHadir:live.jumlahHadir??x.jumlahHadir??null,
        jumlahMurid:live.jumlahMurid??x.jumlahMurid??null};
    }).sort((a,b)=>{
      const x=String(a.namaKelas||'').toUpperCase(), y=String(b.namaKelas||'').toUpperCase();
      if(x.startsWith('PRA')!==y.startsWith('PRA'))return x.startsWith('PRA')?-1:1;
      return x.localeCompare(y,'ms',{numeric:true});
    });
  }
  let fallbackBusy=false,lastFallbackAttempt=0;
  async function ensureClassList(force){
    if(fallbackBusy||!state.user||!navigator.onLine)return;
    if(!force && list().length)return;
    if(!force && Date.now()-lastFallbackAttempt<5000)return;
    fallbackBusy=true;lastFallbackAttempt=Date.now();
    setLoader(true,'Memuatkan semua kelas…');
    $('v4-status-note').textContent='Memuatkan senarai kelas…';
    try{
      const d=await api(ACTION.kelas,{tarikh:selectedIso()});
      if(!Array.isArray(d?.kelas)||!d.kelas.length)throw new Error('Senarai kelas belum diterima.');
      state.kelas=d.kelas.filter(x=>x?.idKelas);
      redrawClasses();
    }catch(err){
      $('v4-status-note').textContent='Tidak dapat memaparkan kelas. Semak sambungan dan cuba semula.';
      showRetry();
    }finally{
      fallbackBusy=false;
      setLoader(false);
    }
  }
  function showRetry(){
    const host=$('v4-class-list');host.replaceChildren();
    const retry=document.createElement('button');retry.type='button';retry.className='v4-retry';
    retry.textContent='↻ Cuba semula';
    retry.addEventListener('click',()=>{lastFallbackAttempt=0;ensureClassList(true);});
    host.append(retry);
  }
  function isWeekend(){ return ['Sabtu','Ahad'].includes(weekday(selectedIso())); }
  function classStatus(k){
    if(isWeekend())return {text:'Tiada Sesi Persekolahan',cls:'pending'};
    const done=k.statusRekod==='DISAHKAN';
    if(done && Number.isFinite(Number(k.jumlahHadir)) && Number.isFinite(Number(k.jumlahMurid)) && k.jumlahHadir!=null && k.jumlahMurid!=null){
      return {text:Number(k.jumlahHadir)+'/'+Number(k.jumlahMurid),cls:'done'};
    }
    return {text:done?'Disahkan':'Tiada Rekod',cls:done?'done':'pending'};
  }
  function updateTabAccess(){
    const u=state.user;if(!u)return false;
    const job=String([u.Jawatan,u.Kategori_Staf].filter(Boolean).join(' ')).toUpperCase();
    const isHem=/(?:GPK|\bPK\b|PENOLONG KANAN)\s*(?:HEM|HAL EHWAL MURID)/.test(job);
    const isClassTeacher=!!String(u.guru_kelas||'').trim();
    const permitted=u.is_admin===true||isHem||isClassTeacher||state.staticData?.bolehPapar===true;
    $('v4-att-top').dataset.access=permitted?'review':'entry';
    $('v4-tab-papar').hidden=!permitted;
    if(!permitted && tab==='papar')switchTab('isi');
    return permitted;
  }
  function redrawClasses(){
    updateDateChip();
    updateTabAccess();
    const classes=list();
    if(!classes.length){
      $('v4-status-note').textContent='Senarai kelas belum tersedia.';
      showRetry();
      if(state.user && navigator.onLine)void ensureClassList();
      return;
    }
    const note=isWeekend()?classes.length+' kelas' : classes.length+' kelas';
    $('v4-status-note').textContent=note;
    const render=(host)=>{
      host.replaceChildren();
      const homeroom=String(state.user?.guru_kelas||'').trim().toUpperCase();
      const job=String([state.user?.Jawatan,state.user?.Kategori_Staf].filter(Boolean).join(' ')).toUpperCase();
      const isHem=/(?:GPK|\bPK\b|PENOLONG KANAN)\s*(?:HEM|HAL EHWAL MURID)/.test(job);
      const permitted=host.id==='v4-papar-list' && !state.user?.is_admin && !isHem && !state.staticData?.isHem
        ? classes.filter(k=>homeroom && String(k.namaKelas).trim().toUpperCase()===homeroom)
        : classes;
      if(!permitted.length){
        const message=document.createElement('p');message.className='v4-quiet';
        message.textContent='Tiada kelas guru kelas yang dipadankan pada akaun ini.';host.append(message);return;
      }
      for(const k of permitted){
        const b=document.createElement('button');b.type='button';b.className='v4-class-item';
        const left=document.createElement('span');left.className='v4-class-name';left.textContent=k.namaKelas;
        const note=document.createElement('small');
        const count=Array.isArray(state.staticData?.muridByKelas?.[String(k.idKelas).toUpperCase()]) ? state.staticData.muridByKelas[String(k.idKelas).toUpperCase()].length : null;
        note.textContent=(count??'—')+' murid'; left.append(note);
        const s=classStatus(k);
        const right=document.createElement('span');right.className='v4-class-state '+s.cls;right.textContent=s.text;
        const arr=document.createElement('span');arr.className='v4-class-arrow';arr.textContent='›';
        b.append(left,right,arr);
        b.addEventListener('click',()=>selectClass(k));
        host.append(b);
      }
    };
    render($('v4-class-list')); render($('v4-papar-list'));
    setLoader(false);
  }
  function updateDialog(){
    if(!open||!state.selected)return;
    const k=state.selected; const n=state.murid.length;
    $('v4-dialog-title').textContent=k.namaKelas||k.idKelas;
    $('v4-dialog-count').textContent=n+' murid · '+state.absent.size+' ditanda tidak hadir';
    const host=$('v4-student-list');host.replaceChildren();
    const search=$('v4-student-search').value.trim().toLocaleLowerCase('ms');
    for(const s of state.murid){
      if(search && !String(s.namaMurid||'').toLocaleLowerCase('ms').includes(search))continue;
      const row=document.createElement('label');row.className='v4-student-row';
      const cb=document.createElement('input');cb.type='checkbox';cb.checked=state.absent.has(s.idMurid);
      const reported=s.laporanPenjaga?.ada===true;
      cb.disabled=tab==='papar'||state.busy||!state.canDraft||(reported&&!overrides.has(s.idMurid));
      const label=document.createElement('strong');label.textContent=s.namaMurid;
      if(reported){const small=document.createElement('small');small.textContent=tab==='papar'&&s.laporanPenjaga.sebab ? 'Direkod ibu bapa · '+s.laporanPenjaga.sebab : 'Direkod ibu bapa';label.append(small);}
      cb.addEventListener('change',()=>{
        const old=[...$('student-list').querySelectorAll('input[type="checkbox"]')];
        const original=old.find(x=>x.getAttribute('aria-label')==='Tidak hadir: '+s.namaMurid);
        if(original&&!original.disabled){original.checked=cb.checked;original.dispatchEvent(new Event('change',{bubbles:true}));}else{cb.checked=!cb.checked;}
      });
      row.append(cb,label);
      if(reported&&!overrides.has(s.idMurid)){
        const badge=document.createElement('span');badge.className='v4-flag';badge.textContent='Ibu bapa';row.append(badge);
        if(tab==='isi'){const change=document.createElement('button');change.type='button';change.className='v4-override';change.textContent='Semak';change.addEventListener('click',ev=>{ev.preventDefault();overrides.add(s.idMurid);updateDialog();});row.append(change);}
      }
      host.append(row);
    }
    $('v4-confirm').disabled=tab==='papar'||state.readOnly||!state.verified||state.busy;
    $('v4-confirm-save').disabled=tab==='papar'||state.readOnly||!state.verified||state.busy||!$('v4-confirm').checked;
    const info=$('record-message').textContent;
    $('v4-dialog-notice').textContent=tab==='papar' ? 'Mod semakan sahaja.' : (state.verified?(state.readOnly?'Rekod hanya untuk semakan.':'Semak nama murid dan sahkan kehadiran.'):'Menyemak rekod rasmi...');
    if(/Sambungan|Ralat|gagal|belum dapat|belum boleh/i.test(info))$('v4-dialog-notice').textContent=info;
  }
  function selectClass(k){
    if(state.busy)return;
    overrides.clear();open=true;$('v4-student-dialog').hidden=false;$('v4-confirm').checked=false;$('v4-student-search').value='';
    const p=orig.loadStudents(k); updateDialog(); Promise.resolve(p).then(()=>updateDialog()).catch(()=>updateDialog());
  }
  function close(){ open=false; $('v4-student-dialog').hidden=true; $('v4-confirm').checked=false; }
  function switchTab(which){
    tab=which;
    $('v4-tab-isi').classList.toggle('v4-current',which==='isi');
    $('v4-tab-papar').classList.toggle('v4-current',which==='papar');
    $('v4-class-view').hidden=which!=='isi';
    $('v4-papar-view').hidden=which!=='papar';
    close(); redrawClasses();
  }
  window.applyStaticForDate=function(){
    orig.apply();
    if(state.staticData?.semuaKelas?.length){
      state.kelas=state.staticData.semuaKelas.map(c=>({...c,statusRekod:'BELUM_SEMAK'}));
      orig.renderClasses();
    }
    redrawClasses();
  };
  window.renderStudents=function(){ orig.renderStudents(); updateDialog(); };
  window.renderClasses=function(){ orig.renderClasses(); redrawClasses(); };
  window.refreshLive=async function(k,req){ const r=await orig.refreshLive(k,req); updateDialog(); redrawClasses(); return r; };
  window.save=async function(){ const r=await orig.save(); redrawClasses(); updateDialog(); if(state.selected?.statusRekod==='DISAHKAN')close(); return r; };
  $('v4-tab-isi').addEventListener('click',()=>switchTab('isi'));
  $('v4-tab-papar').addEventListener('click',()=>switchTab('papar'));
  $('v4-dialog-close').addEventListener('click',close);
  $('v4-student-dialog').addEventListener('click',e=>{ if(e.target===$('v4-student-dialog')) close(); });
  $('v4-student-search').addEventListener('input',updateDialog);
  $('v4-confirm').addEventListener('change',()=>{ $('ack').checked=$('v4-confirm').checked; toggleControls(); updateDialog(); });
  $('v4-confirm-save').addEventListener('click',()=>{ if(!$('v4-confirm-save').disabled) save(); });
  mobile.hidden=false;
  updateDateChip();
  $('v4-dialog-close').textContent='←';
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&open){ close(); e.stopPropagation(); } });
  window.addEventListener('online',()=>setTimeout(()=>ensureClassList(true),800));
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden && !list().length) ensureClassList(); });

  // Apabila modul dibuka, paparkan loading skrin sehingga kelas tersedia.
  setLoader(true,'Memuatkan kelas dan rekod hari ini…');
  const start=()=>{
    redrawClasses();
    if(!list().length) ensureClassList(true);
    else setTimeout(()=>setLoader(false),250);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
