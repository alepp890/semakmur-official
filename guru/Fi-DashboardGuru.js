'use strict';
/* SeMAKMUR Fi Bestari V4.4.0 — fail JS tunggal.
 * Script induk asal kekal dalam skop classic untuk onclick HTML.
 * Modul Firebase dan statistik dijalankan sebagai IIFE async tersendiri.
 * Firestore dan logik fungsi asal tidak diubah.
 */
window.FiBridgeReady = new Promise((resolve,reject)=>{window.fiBridgeResolve=resolve;window.fiBridgeReject=reject;});

  'use strict';
  const DAY_NAMES=['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
  const DAYS=['Isnin','Selasa','Rabu','Khamis','Jumaat'];
  const MENUS={
    laman_utama:{title:'Laman Utama'},
    pentadbiran:{title:'Pentadbiran',subtitle:'Urusan pengurusan, surat, laporan dan tugasan rasmi yang melibatkan anda.'},
    kurikulum:{title:'Kurikulum',subtitle:'Pengajaran, jadual, rekod pengajaran dan pentaksiran mengikut kelas serta mata pelajaran.'},
    hem:{title:'Hal Ehwal Murid',subtitle:'Kehadiran, kebajikan, disiplin dan tanggungjawab guru kelas mengikut kebenaran.'},
    kokurikulum:{title:'Kokurikulum',subtitle:'Unit beruniform, kelab, persatuan, sukan dan aktiviti kokurikulum yang anda selia.'},
    lain_lain:{title:'Lain-lain',subtitle:'Kemudahan sekolah, dokumen sokongan dan pautan perkhidmatan tambahan.'}
  };
  const MODULES={
    erph:{title:'e-RPH Digital',icon:'fa-book-open',tone:'green',url:'modulaplikasi/ErphGuru.html'},
    manual:{title:'Manual Pengurusan',icon:'fa-book-bookmark',tone:'blue',url:'modulaplikasi/ManualPengurusan.html'},
    jadual:{title:'Jadual Waktu',icon:'fa-calendar-days',tone:'blue',url:'modulaplikasi/JadualWaktu.html'},
    ssdm:{title:'SSDM Disiplin',icon:'fa-shield-halved',tone:'orange',url:'https://ssdm.moe.gov.my'},
    splkpm:{title:'SPLKPM Latihan',icon:'fa-graduation-cap',tone:'purple',url:'https://splkpm.moe.gov.my'},
    pajsk:{title:'PAJSK Kokurikulum',icon:'fa-trophy',tone:'green',url:null},
    hrmis:{title:'HRMIS / CRK',icon:'fa-id-card',tone:'rose',url:'https://hrmis2.ecomponent.my'},
    eminit:{title:'e-Minit & Tindakan',icon:'fa-envelope-open-text',tone:'blue',url:null},
    eprogram:{title:'e-Program',icon:'fa-calendar-check',tone:'green',url:null},
    eopr:{title:'e-OPR',icon:'fa-file-lines',tone:'purple',url:null},
    bertugas:{title:'Laporan Guru Bertugas',icon:'fa-clipboard-check',tone:'orange',url:null},
    relief:{title:'e-Relief',icon:'fa-person-circle-check',tone:'green',url:'modulaplikasi/Fi-eReliefGuru.html'},
    epbd:{title:'e-PBD',icon:'fa-chart-column',tone:'blue',url:null},
    tmk:{title:'PdPc Modul TMK',icon:'fa-computer',tone:'purple',url:null},
    kehadiran:{title:'Kehadiran Murid',icon:'fa-user-check',tone:'green',url:'modulaplikasi/Fi-KehadiranMurid.html'},
    keberadaan:{title:'e-Keberadaan',icon:'fa-clipboard-user',tone:'blue',url:'modulaplikasi/Fi-KeberadaanGuru.html'},
    apdm:{title:'APDM',icon:'fa-users',tone:'blue',url:'https://apdm.moe.gov.my'},
    spbt:{title:'SPBT',icon:'fa-book',tone:'orange',url:null},
    rmt:{title:'RMT & Kesihatan',icon:'fa-heart-pulse',tone:'rose',url:null},
    beruniform:{title:'Unit Beruniform',icon:'fa-campground',tone:'green',url:null},
    kelab:{title:'Kelab & Persatuan',icon:'fa-icons',tone:'purple',url:null},
    sukan:{title:'Sukan & Permainan',icon:'fa-futbol',tone:'orange',url:null},
    bilik:{title:'Tempahan Bilik Khas',icon:'fa-door-open',tone:'blue',url:null},
    dokumen:{title:'Dokumen & Borang',icon:'fa-folder-open',tone:'blue',url:null}
  };
  const CATEGORY_MODULES={
    pentadbiran:['keberadaan','manual','eminit','eprogram','eopr','bertugas','hrmis'],
    kurikulum:['erph','jadual','epbd','tmk','relief','splkpm'],
    hem:['kehadiran','apdm','ssdm','spbt','rmt'],
    kokurikulum:['beruniform','kelab','sukan','pajsk','eprogram'],
    lain_lain:['bilik','dokumen','manual','splkpm']
  };
  const CATEGORY_BLURB={
    pentadbiran:'Lihat pelantikan, urusan rasmi dan laporan. Rekod tugasan akan muncul apabila modul berkaitan disambungkan.',
    kurikulum:'Semak jadual mingguan dan buka e-RPH untuk urusan pengajaran. Status pentaksiran akan disambungkan kemudian.',
    hem:'Urus tugas guru kelas dan kebajikan murid berdasarkan tanggungjawab yang ditetapkan.',
    kokurikulum:'Semak pelantikan dan akses modul pengurusan aktiviti sukan, kelab, persatuan serta unit beruniform.',
    lain_lain:'Pautan kepada sumber digital dan kemudahan sekolah yang merentas bidang.'
  };
  let currentUser=null, dashboardData=null, activePage='laman_utama', activeDay=null, toastTimer=null;
  let dashboardAuthenticated=false, dashboardRequestPending=false;
  let resumeDone=false;
  const WORKSPACE_RESUME_KEY='SEMAKMUR_LAST_WORKSPACE_V2';
  function rememberWorkspace(kind){
    try{if(!dashboardAuthenticated||!currentUser?.email)return;localStorage.setItem(WORKSPACE_RESUME_KEY,JSON.stringify({email:String(currentUser.email).toLowerCase(),kind,at:Date.now()}));}catch(_e){}
  }
  function resumeLastWorkspace(){resumeDone=true;} // Fi: jangan buka modul sensitif secara automatik.
  // Utiliti asas yang dikongsi oleh semua fungsi Dashboard Fi.
  // Tidak tersedia dalam skop skrip HTML kerana Fi-DashboardGuru.js ialah ES module.
  const $=id=>document.getElementById(id);
  const escapeHtml=v=>String(v===null||v===undefined?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function nowMsia(){return new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Kuala_Lumpur'}));}
  function dateText(d){return new Intl.DateTimeFormat('ms-MY',{weekday:'long',year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Kuala_Lumpur'}).format(d);}
  function todayDay(){return DAY_NAMES[nowMsia().getDay()];}
  function showInfo(text){const el=$('toast');el.textContent=text;el.classList.remove('hidden');if(toastTimer) clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),4800);}
  function setNotice(text){const el=$('service-notice');if(!text){el.classList.add('hidden');return;}el.textContent=text;el.classList.remove('hidden');}
  function fitName(){const el=$('header-user-name');if(!el)return;let size=window.innerWidth<768?21:26;el.style.fontSize=size+'px';while(el.scrollWidth>el.clientWidth+1 && size>13){size--;el.style.fontSize=size+'px';} }
  function initials(name){const parts=String(name||'G').trim().split(/\s+/).filter(Boolean);return (parts[0]?parts[0][0]:'G').toUpperCase();}
  function applyProfile(){
    const p=dashboardData?.profile||{};
    const name=p.namaPenuh||currentUser?.name||'Guru SeMAKMUR';
    const nick=p.namaSamaran||name;
    $('header-user-name').textContent=name;
    $('header-user-name').title=name;
    $('user-display-name').textContent=nick;
    $('user-email-display').textContent=p.email||currentUser?.email||'Akaun MOE';
    $('user-email-display').title=p.email||currentUser?.email||'';
    $('sidebar-avatar-initial').textContent=initials(nick);
    $('mobile-avatar-initial').textContent=initials(nick);
    const photo=String(p.gambarProfil||p.fotoUrl||currentUser?.picture||currentUser?.photoUrl||'').trim();
    // Foto pilihan hanya dimuatkan dari URL HTTPS, tanpa imej rekaan.
    const safePhoto=/^https:\/\/[^\s<>"']+$/i.test(photo)?photo:'';
    [['sidebar-avatar-photo','sidebar-avatar-initial'],['mobile-avatar-photo','mobile-avatar-initial']].forEach(pair=>{
      const img=$(pair[0]),fallback=$(pair[1]);
      img.hidden=true; fallback.hidden=false;
      if(safePhoto){img.onload=()=>{img.hidden=false;fallback.hidden=true;};img.onerror=()=>{img.hidden=true;fallback.hidden=false;};img.src=safePhoto;}
      else img.removeAttribute('src');
    });
    $('profile-fullname').value=name;
    $('profile-nickname').value=p.namaSamaran||'';
    $('profile-phone').value=p.telefon||'';
    $('profile-email').value=p.email||currentUser?.email||'';
    const roles=dashboardData?.peranan||[];
    $('profile-role-summary').textContent=roles.length?roles.length+' pelantikan berkaitan anda.':'Tiada pelantikan aktif yang dipaparkan.';
    requestAnimationFrame(fitName);
  }
  function bolehUrusJadual(){
    // Tiada sesi Apps Script untuk Fi.
    if(currentUser && currentUser.is_admin===true)return true;
    const roles=dashboardData?.peranan||[];
    return roles.some(r=>/penyelaras\s+jadual\s+waktu/i.test([r.peranan,r.jawatankuasa,r.skop].filter(Boolean).join(' ')));
  }
  function moduleCard(id){const m=MODULES[id];if(!m)return '';
    if(id==='jadual'&&!bolehUrusJadual())return '';
    return `<button class="module-card" type="button" data-module="${escapeHtml(id)}" ${m.url?'':'disabled'}>
      <span class="module-icon ${escapeHtml(m.tone)}">${qIcon(({erph:'book',manual:'settings',jadual:'calendar',ssdm:'attendance',splkpm:'graduation',pajsk:'chart',hrmis:'settings',eminit:'mail',eprogram:'calendar',eopr:'report',bertugas:'report',relief:'calendar',epbd:'chart',tmk:'book',kehadiran:'attendance',apdm:'attendance',spbt:'book',rmt:'attendance',beruniform:'attendance',kelab:'attendance',sukan:'chart',bilik:'settings',dokumen:'report'})[id]||'book')}</span>
      <span class="text-slate-700">${escapeHtml(m.title)}</span></button>`;
  }
  function openErphWorkspace(){
    showInfo('e-RPH masih menggunakan platform lama dan belum dimasukkan ke Fi V4.');
  }
  function closeErphWorkspace(keepHash) {
    const pane=$('erph-workspace');
    if (!pane || pane.hidden) return;
    pane.hidden=true;
    pane.classList.remove('is-open');
    skhDesktopHeading(false);
    $('page-scroll').classList.remove('hidden');
    if (!keepHash)rememberWorkspace('laman_utama');
    if (!keepHash && location.hash==='#erph' && history.replaceState) history.replaceState(null,'',location.pathname+location.search);
  }
  // V4.2: hanya header Desktop bertukar apabila modul Kehadiran dibuka.
  let skhDesktopHeadingBefore=null;
  function skhDesktopHeading(active){
    if(window.matchMedia('(max-width:767px)').matches)return;
    const a=$('greeting-text'),b=$('header-user-name');if(!a||!b)return;
    if(active){
      if(!skhDesktopHeadingBefore)skhDesktopHeadingBefore={greeting:a.textContent,name:b.textContent,title:b.title};
      a.textContent='Hal Ehwal Murid';b.textContent=fiV8AttendanceSection==='semakan'?'Semakan Kehadiran':'Smart Kehadiran Murid';b.title=b.textContent;
    } else if(skhDesktopHeadingBefore){
      a.textContent=skhDesktopHeadingBefore.greeting;
      b.textContent=skhDesktopHeadingBefore.name;
      b.title=skhDesktopHeadingBefore.title;
      skhDesktopHeadingBefore=null;
    }
  }
  // Butang breadcrumb dalam iframe: buka halaman utama melalui kawalan dashboard.
  window.addEventListener('message',function(e){
    if(e.origin!==location.origin || e.source!==$('kehadiran-workspace-frame')?.contentWindow)return;
    if(e.data?.type==='SEMAKMUR_ATTENDANCE_BACK'){
      closeKehadiranWorkspace();switchMainMenu('laman_utama');
    }
  });
  // Fi V2.1: pantulkan klik dengan segera, kemudian sahkan sesi rasmi tanpa menyekat UI.
  // iframe hanya dimuatkan selepas pengesahan rasmi berjaya; backend masih menyemak setiap simpanan.
  let fiKehadiranOpenSerial=0;
  let fiOfficialWarmStarted=false;
  function fiKehadiranStatus(title,message,isError=false){
    const overlay=$('fi-kehadiran-loading'); if(!overlay)return;
    overlay.hidden=false;
    overlay.classList.toggle('is-error',Boolean(isError));
    $('fi-kehadiran-loading-title').textContent=title;
    $('fi-kehadiran-loading-message').textContent=message;
    $('fi-kehadiran-retry').hidden=!isError;
  }
  function fiKehadiranFrameReady(){
    const pane=$('kehadiran-workspace'),frame=$('kehadiran-workspace-frame');
    if(!pane||!frame||!frame.getAttribute('src'))return;
    frame.dataset.fiDomLoaded='1';
    frame.contentWindow?.postMessage({type:'semakmur-fi-request-screen'},location.origin);
    // Parent retains the loading overlay until attendance signals it is ready.
  }
  function fiKehadiranMuatkan(serial){
    const pane=$('kehadiran-workspace'),frame=$('kehadiran-workspace-frame');
    if(!pane||!frame||pane.hidden||serial!==fiKehadiranOpenSerial)return;
    if(frame.dataset.fiReady==='1'){
      $('fi-kehadiran-loading').hidden=true;
      return;
    }
    fiKehadiranStatus('Memaparkan Smart Kehadiran…','Senarai kelas akan tersedia sebaik halaman dimulakan.');
    if(!frame.getAttribute('src')){
      frame.setAttribute('src','modulaplikasi/Fi-KehadiranMurid.html?embed=1&v=fi-v8_1');
    }
  }
  function fiKehadiranSesiLatar(){ /* Fi V4: Firebase Auth sudah menyediakan sesi; tiada Apps Script. */ }
  function openKehadiranWorkspace(){
    if(fiV6ScheduleOpen)fiV6CloseSchedule();
    if(!dashboardAuthenticated || !window.FiAuthenticatedUser){
      showInfo('Akses Dashboard sedang disahkan. Sila cuba sebentar lagi.');return;
    }
    closeErphWorkspace(true);
    closeKeberadaanWorkspace(true);closeReliefWorkspace(true);
    closeMobileMenu();
    const pane=$('kehadiran-workspace'),frame=$('kehadiran-workspace-frame');
    if(!pane||!frame)return;
    const serial=++fiKehadiranOpenSerial;
    // Synchronous: tunjuk ruang serta-merta sebelum membuat apa-apa permintaan rangkaian.
    $('page-scroll').classList.add('hidden');
    pane.hidden=false;
    pane.classList.add('is-open');
    skhDesktopHeading(true);
    rememberWorkspace('kehadiran');
    if(history.replaceState)history.replaceState(null,'',location.pathname+location.search+'#kehadiran');
    fiKehadiranStatus('Membuka Smart Kehadiran…','Memaparkan kelas dan murid daripada Firebase.');
    // Fi V4: Firebase-only, mula iframe serta-merta; Firestore Rules melindungi rekod.
    fiKehadiranMuatkan(serial);fiV6AttendanceDetail=false;fiV8AttendanceSection='rekod';fiV6Header();
    if(frame.dataset.fiReady==='1')frame.contentWindow?.postMessage({type:'semakmur-fi-request-screen'},location.origin);
  }
  function closeKehadiranWorkspace(keepHash){
    ++fiKehadiranOpenSerial; // Batalkan sambungan UI jika pengguna sudah menekan Kembali.
    const pane=$('kehadiran-workspace');
    if(!pane||pane.hidden)return;
    pane.hidden=true;
    pane.classList.remove('is-open');
    skhDesktopHeading(false);
    $('page-scroll').classList.remove('hidden');
    if(!keepHash)rememberWorkspace('laman_utama');
    if(!keepHash && location.hash==='#kehadiran' && history.replaceState)history.replaceState(null,'',location.pathname+location.search);
    fiV6AttendanceDetail=false;fiV8AttendanceSection='rekod';fiV6Header();
  }
  // V6.5 e-Keberadaan: dashboard owns navigation, app iframe owns Firestore logic.
  let kbDesktopHeadingBefore=null;
  function kbDesktopHeading(active){
    if(window.matchMedia('(max-width:767px)').matches)return;
    const a=$('greeting-text'),b=$('header-user-name');if(!a||!b)return;
    if(active){
      if(!kbDesktopHeadingBefore)kbDesktopHeadingBefore={greeting:a.textContent,name:b.textContent,title:b.title};
      a.textContent='Pentadbiran';b.textContent='Smart Keberadaan';b.title='Smart Keberadaan';
    }else if(kbDesktopHeadingBefore){
      a.textContent=kbDesktopHeadingBefore.greeting;b.textContent=kbDesktopHeadingBefore.name;
      b.title=kbDesktopHeadingBefore.title;kbDesktopHeadingBefore=null;
    }
  }
  function kbWorkspaceStatus(title,message,isError=false){
    const overlay=$('fi-keberadaan-loading');if(!overlay)return;
    overlay.hidden=false;overlay.classList.toggle('is-error',isError);
    $('fi-keberadaan-loading-title').textContent=title;
    $('fi-keberadaan-loading-message').textContent=message;
    $('fi-keberadaan-retry').hidden=!isError;
  }
  function openCurrentMobileModule(){
    if(!$('keberadaan-workspace').hidden)openKeberadaanWorkspace();
    else openKehadiranWorkspace();
  }
  function openKeberadaanWorkspace(){
    if(!dashboardAuthenticated||!window.FiAuthenticatedUser){
      showInfo('Akses Dashboard sedang disahkan. Sila cuba sebentar lagi.');return;
    }
    if(fiV6ScheduleOpen)fiV6CloseSchedule();
    closeErphWorkspace(true);closeKehadiranWorkspace(true);closeReliefWorkspace(true);closeMobileMenu();
    const pane=$('keberadaan-workspace'),frame=$('keberadaan-workspace-frame');
    if(!pane||!frame)return;
    $('page-scroll').classList.add('hidden');pane.hidden=false;pane.classList.add('is-open');
    kbDesktopHeading(true);rememberWorkspace('keberadaan');
    if(history.replaceState)history.replaceState(null,'',location.pathname+location.search+'#keberadaan');
    if(frame.dataset.fiReady==='1'){
      $('fi-keberadaan-loading').hidden=true;
    }else{
      kbWorkspaceStatus('Membuka e-Keberadaan…','Menyediakan borang dan status akaun MOE.');
      if(!frame.getAttribute('src'))frame.setAttribute('src','modulaplikasi/Fi-KeberadaanGuru.html?embed=1&v=5.0.0');
    }
    fiV6Header();
  }
  function retryKeberadaanWorkspace(){
    const frame=$('keberadaan-workspace-frame');if(!frame)return;
    frame.dataset.fiReady='0';kbWorkspaceStatus('Memuat semula e-Keberadaan…','Menjalankan semula semakan Firebase.');
    frame.setAttribute('src','modulaplikasi/Fi-KeberadaanGuru.html?embed=1&v=5.0.0&retry='+Date.now());
  }
  function closeKeberadaanWorkspace(keepHash){
    const pane=$('keberadaan-workspace');if(!pane||pane.hidden)return;
    pane.hidden=true;pane.classList.remove('is-open');kbDesktopHeading(false);
    $('page-scroll').classList.remove('hidden');
    if(!keepHash){rememberWorkspace('laman_utama');
      if(location.hash==='#keberadaan'&&history.replaceState)history.replaceState(null,'',location.pathname+location.search);}
    fiV6Header();
  }
  function openReliefWorkspace(){
    if(!dashboardAuthenticated||!window.FiAuthenticatedUser){showInfo('Akses Dashboard belum disahkan.');return;}
    if(fiV6ScheduleOpen)fiV6CloseSchedule();
    closeErphWorkspace(true);closeKehadiranWorkspace(true);closeKeberadaanWorkspace(true);closeMobileMenu();
    const pane=$('relief-workspace'),frame=$('relief-workspace-frame');if(!pane||!frame)return;
    $('page-scroll').classList.add('hidden');pane.hidden=false;pane.classList.add('is-open');
    rememberWorkspace('relief');
    if(history.replaceState)history.replaceState(null,'',location.pathname+location.search+'#relief');
    if(!frame.getAttribute('src'))frame.src='modulaplikasi/Fi-eReliefGuru.html?embed=1&v=5.1.0';
    fiV6Header();
  }
  function closeReliefWorkspace(keepHash){
    const pane=$('relief-workspace');if(!pane||pane.hidden)return;
    pane.hidden=true;pane.classList.remove('is-open');$('page-scroll').classList.remove('hidden');
    if(!keepHash&&location.hash==='#relief'&&history.replaceState)history.replaceState(null,'',location.pathname+location.search);
    fiV6Header();
  }
  window.closeReliefWorkspace=closeReliefWorkspace;
  async function openModule(id){const m=MODULES[id];if(!m)return;
    // Kehadiran dibuka serta-merta. Jangan tunggu ensureOfficial() sebelum memaparkan ruang.
    if(id==='kehadiran'){openKehadiranWorkspace();return;}
    if(id==='keberadaan'){openKeberadaanWorkspace();return;}
    if(id==='relief'){openReliefWorkspace();return;}
    if(!await window.FiDashboard?.ensureOfficial()){showInfo('Modul ini masih menggunakan sistem lama dan belum dipindahkan ke Fi.');return;}
    if(!dashboardAuthenticated){showInfo('Akses sedang disahkan. Sila cuba sebentar lagi.');return;}
    if(id==='jadual'&&!bolehUrusJadual()){showInfo('Akses modul ini terhad kepada pentadbir dan penyelaras jadual waktu.');return;}
    if(!m.url)return;
    if(id==='erph'){openErphWorkspace();return;}
    window.open(m.url,'_blank','noopener');
  }
  // SVG Lucide-style inline: crisp and also works when external icon CDN is unavailable.
  const QUICK_ICONS={
    attendance:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M9 7h6M9 11h6"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/>',
    chart:'<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx=".5"/><rect x="12" y="8" width="3" height="10" rx=".5"/><rect x="17" y="5" width="3" height="13" rx=".5"/>',
    report:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/>',
    settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1 1.7 1.3-2 3.5-2-.8a8.7 8.7 0 0 1-2.2 1.2l-.3 2.1h-4l-.3-2.1a8.7 8.7 0 0 1-2.2-1.2l-2 .8-2-3.5 1.7-1.3a8.2 8.2 0 0 1 0-2.6l-1.7-1.3 2-3.5 2 .8a8.7 8.7 0 0 1 2.2-1.2l.3-2.1h4l.3 2.1a8.7 8.7 0 0 1 2.2 1.2l2-.8 2 3.5-1.7 1.3a8.2 8.2 0 0 1 0 2.6Z"/>',
    graduation:'<path d="m2 10 10-5 10 5-10 5-10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6"/>'
  };
  function qIcon(type){return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${QUICK_ICONS[type]||QUICK_ICONS.book}</svg>`;}
  function shortcutCard(id,idx){const m=MODULES[id];if(!m)return '';
    const details={kehadiran:['Kehadiran','Rekod & Analisis','attendance'],erph:['e-RPH','Rancangan Pengajaran','book'],jadual:['Jadual Waktu','Kelas & Tugasan','calendar'],splkpm:['Latihan','Pembangunan Guru','graduation'],epbd:['PBD','Pentaksiran Murid','chart'],eopr:['Laporan','Laporan & Statistik','report'],eminit:['Surat','Surat & Tindakan','mail'],manual:['Pengurusan','Manual Sekolah','settings'],keberadaan:['e-Keberadaan','Permohonan & Rekod','report']};
    const iconMap={hrmis:'settings',ssdm:'attendance',splkpm:'graduation',pajsk:'chart',apdm:'attendance',bilik:'calendar',kehadiran:'attendance',eprogram:'calendar',eopr:'report',bertugas:'report',beruniform:'attendance',kelab:'attendance',sukan:'chart',epbd:'chart',tmk:'book',relief:'calendar'};
    const data=details[id]||[m.title,'Aplikasi SeMAKMUR',iconMap[id]||'book'];
    return `<button class="shortcut-card shortcut-tone-${idx%7} ${m.url?'':'shortcut-inactive'}" type="button" data-module="${escapeHtml(id)}" ${m.url?'':'disabled'} title="${escapeHtml(data[0])}"><span class="shortcut-icon">${qIcon(data[2])}</span><span class="shortcut-title">${escapeHtml(data[0])}</span><span class="shortcut-description">${escapeHtml(data[1])}</span><span class="shortcut-arrow" aria-hidden="true">→</span></button>`;
  }
  function quickShortcutIds(page=activePage){
    if(page==='laman_utama') return ['kehadiran','erph','keberadaan','jadual','epbd','eopr','eminit'];
    return (CATEGORY_MODULES[page]||[]).filter(id=>id!=='jadual'||bolehUrusJadual()).slice(0,7);
  }
  function renderShortcuts(page=activePage){
    const label=page==='laman_utama'?'Pautan Pantas':'Pautan Pantas · '+MENUS[page].title;
    $('home-modules-title').lastChild.textContent=label;
    $('home-modules').innerHTML=quickShortcutIds(page).map((id,i)=>shortcutCard(id,i)).join('');
  }
  const SUBJEK_PENUH={
    BM:'Bahasa Melayu',BI:'Bahasa Inggeris',MT:'Matematik',MAT:'Matematik',
    SN:'Sains',SEJ:'Sejarah',PI:'Pendidikan Islam',PM:'Pendidikan Moral',
    PMZ:'Pendidikan Muzik',MZ:'Pendidikan Muzik',MUS:'Pendidikan Muzik',
    BA:'Bahasa Arab',PJ:'Pendidikan Jasmani',PJK:'Pendidikan Jasmani dan Kesihatan',
    PK:'Pendidikan Kesihatan',PSV:'Pendidikan Seni Visual',RBT:'Reka Bentuk dan Teknologi',
    PI_T:'Pendidikan Islam',PIT:'Pendidikan Islam'
  };
  function namaSubjek(kod){
    const value=String(kod||'').trim();
    const key=value.toUpperCase().replace(/[-\s]/g,'_');
    return SUBJEK_PENUH[key]||SUBJEK_PENUH[key.split('_')[0]]||value||'Mata pelajaran belum dinyatakan';
  }
  function masaKeMinit(time){
    const s=String(time||'').trim();
    const m=s.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if(!m)return null;
    let h=+m[1], minute=+m[2];if(minute>59)return null;
    if(m[3]){if(h<1||h>12)return null;h=h%12+(m[3].toUpperCase()==='PM'?12:0);}else if(h>23)return null;
    return 60*h+minute;
  }
  function masaPaparan(t){const n=masaKeMinit(t);if(n===null)return String(t||'—');return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
  function blokBergabung(hari){
    const raw=(dashboardData?.jadual||[]).filter(s=>String(s.hari||'').toLowerCase()===hari.toLowerCase())
      .map(s=>({...s,subjek:namaSubjek(s.subjek),startMin:masaKeMinit(s.mula),endMin:masaKeMinit(s.tamat)}))
      .filter(s=>s.startMin!==null&&s.endMin!==null&&s.endMin>s.startMin)
      .sort((a,b)=>a.startMin-b.startMin||a.endMin-b.endMin);
    const result=[];
    for(const s of raw){
      const prev=result[result.length-1];
      // Gabung hanya masa yang BENAR-BENAR berturutan dan subjek/kelas yang sama.
      if(prev&&prev.endMin===s.startMin&&prev.subjek===s.subjek&&prev.kelas===s.kelas&&prev.pairing===s.pairing){
        prev.endMin=s.endMin;prev.tamat=s.tamat;prev.bilWaktu+=1;
      } else result.push({...s,bilWaktu:1});
    }
    return result;
  }
  function waktuRingkas(block){
    if(!block)return '<span class="text-slate-500">Tiada waktu dijadualkan</span>';
    return `<div class="font-extrabold text-slate-800">${escapeHtml(block.subjek)}</div>
      <div class="text-slate-600">${escapeHtml(block.kelas||'Kelas tidak dinyatakan')}</div>
      <div class="text-[#1f7a9c] font-extrabold">${escapeHtml(masaPaparan(block.mula))} – ${escapeHtml(masaPaparan(block.tamat))}</div>
`;
  }
  // Ringkasan padat: paparan kod subjek sahaja pada kad ini.
  // Widget jadual harian di sebelah kanan kekal memaparkan nama penuh subjek.
  const KOD_SUBJEK_KAD={
    'Bahasa Melayu':'BM','Bahasa Inggeris':'BI','Matematik':'MT',
    'Sains':'SN','Sejarah':'SEJ','Pendidikan Islam':'PI',
    'Pendidikan Moral':'PM','Pendidikan Muzik':'PMZ',
    'Bahasa Arab':'BA','Pendidikan Jasmani':'PJ',
    'Pendidikan Jasmani dan Kesihatan':'PJK','Pendidikan Kesihatan':'PK',
    'Pendidikan Seni Visual':'PSV','Reka Bentuk dan Teknologi':'RBT'
  };
  function kodSubjekKad(subjek){const full=namaSubjek(subjek);return KOD_SUBJEK_KAD[full]||full;}
  function waktuKiniDanSeterusnya(){
    const day=todayDay(),now=nowMsia(),minute=now.getHours()*60+now.getMinutes();
    const available=Boolean(dashboardData?.jadualTersedia);
    const list=available?blokBergabung(day):[];
    const current=list.find(s=>s.startMin<=minute&&minute<s.endMin);
    const next=list.find(s=>s.startMin>minute);
    function tile(label,s,isCurrent){
      const absent=available?(isCurrent?'Tiada kelas sekarang':'Tiada kelas selepas ini'):'Belum tersedia';
      return `<div class="class-mini ${isCurrent?'class-mini-now':'class-mini-next'}"><div class="class-mini-label"><span class="class-mini-dot"></span>${label}</div>`+
        (s?`<strong class="class-mini-subject" title="${escapeHtml(s.subjek)}">${escapeHtml(kodSubjekKad(s.subjek))}</strong><span class="class-mini-class">${escapeHtml(s.kelas||'Kelas tidak dinyatakan')}</span><span class="class-mini-time">${escapeHtml(masaPaparan(s.mula))} – ${escapeHtml(masaPaparan(s.tamat))}</span>`:
        `<span class="class-mini-absent">${absent}</span>`)+`</div>`;
    }
    return `<div class="class-mini-pair">${tile('Sekarang',current,true)}${tile('Selepas',next,false)}</div>`;
  }
  function tugasHariIni(){const x=dashboardData?.tugasBertugas;
    if(x?.disahkan===true){if(x.bertugas===false)return `<div class="status-copy">Kumpulan anda tidak bertugas minggu ini.</div>`;
    if(x.bertugas===true)return `<div class="highlight-copy">${escapeHtml(x.kumpulan||'Guru Bertugas')}</div><div class="status-copy">${escapeHtml(x.catatan||'Sila semak tugasan anda.')}</div>`;}
    return `<div class="status-copy">Maklumat tugas hari ini belum tersedia.</div>`;}
  // Privasi V5.1: Jangan papar bilangan sekolah daripada dashboardData.reliefHariIni.
  // Sumber tunggal: dokumen awam jadual dan tapis replacementUid === auth.uid.
  function reliefHariIni(){return window.fi51ReliefWidgetHtml||
    '<div class="status-copy">Menyemak tugasan relief saya…</div>';}
  function tindakanSaya(){const t=dashboardData?.tindakanSaya;
    if(t?.disahkan===true&&Number.isFinite(t.jumlah))return `<span class="big-metric">${t.jumlah}</span><span class="status-copy">${t.jumlah?'Tindakan memerlukan perhatian':'Tiada tindakan tertunggak'}</span>`;
    return `<div class="status-copy">Maklumat tindakan hari ini belum tersedia.</div>`;}
  function summaryWidget(kind,title,content,icon){return `<article class="card-coligo summary-widget theme-${kind}"><div class="summary-head"><div class="summary-icon">${qIcon(icon)}</div><h3>${escapeHtml(title)}</h3></div><div class="summary-content">${content}</div></article>`;}
  // Fi V6: susunan mobile milik dashboard sendiri, tanpa skrip mobile V4 yang menulis semula navigasi.
  let fiV6ScheduleOpen=false,fiV6AttendanceDetail=false,fiV6SelectedClassName='',fiV8AttendanceSection='rekod';
  function fiV6Mobile(){return window.matchMedia('(max-width:767px)').matches;}
  function fiV6Header(){
    const attendance=!$('kehadiran-workspace').hidden;
    const keberadaan=!$('keberadaan-workspace').hidden;
    const relief=!$('relief-workspace').hidden;
    const back=$('v4-back');
    if(!fiV6Mobile()){back.hidden=true;return;}
    back.hidden=!(fiV6ScheduleOpen||attendance||keberadaan||relief);
    $('v4-header-title').textContent=fiV6ScheduleOpen?'Jadual Waktu':attendance?(fiV6AttendanceDetail?fiV6SelectedClassName||'Kehadiran Murid':fiV8AttendanceSection==='semakan'?'Semakan Kehadiran':'Kehadiran Kelas'):keberadaan?'e-Keberadaan':relief?'e-Relief':'SeMAKMUR Smart System';
    document.body.classList.toggle('fi-v6-on-schedule',fiV6ScheduleOpen);
    document.body.classList.toggle('fi-v6-on-attendance',attendance);
    document.body.classList.toggle('fi-v6-on-keberadaan',keberadaan);
    document.body.classList.toggle('fi-v6-on-relief',relief);
    document.body.classList.toggle('v4-on-home',!attendance&&!keberadaan&&!relief&&!fiV6ScheduleOpen);
    document.querySelectorAll('#mobile-bottom-nav .bottom-btn').forEach(b=>b.classList.remove('active'));
    const current=$('fi-bottom-current-module');
    if(current){
      current.querySelector('span').textContent=relief?'e-Relief':keberadaan?'Keberadaan':'Kehadiran';
      current.querySelector('i').className=relief?'fa-solid fa-person-chalkboard':keberadaan?'fa-solid fa-clipboard-check':'fa-solid fa-clipboard-user';
      current.setAttribute('aria-label',relief?'Modul e-Relief':keberadaan?'Modul e-Keberadaan':'Modul Kehadiran');
    }
    const active=attendance||keberadaan||relief?'.fi-v5-bottom-attendance':'.fi-v5-bottom-home';
    $("mobile-bottom-nav").querySelector(active)?.classList.add('active');
  }
  function fiV6OpenSchedule(){
    if(!dashboardAuthenticated){showInfo('Dashboard sedang menyediakan data.');return;}
    fiV6ScheduleOpen=true;
    closeKehadiranWorkspace(true);
    closeKeberadaanWorkspace(true);closeReliefWorkspace(true);
    $('page-scroll').classList.remove('hidden');
    $('fi-v6-schedule-screen').hidden=false;
    $('fi-v6-day').value=DAYS.includes(todayDay())?todayDay():'Isnin';
    fiV6RenderSchedule(); fiV6Header();
    $('page-scroll').scrollTo({top:0,behavior:'instant'});
  }
  function fiV6CloseSchedule(){fiV6ScheduleOpen=false;$('fi-v6-schedule-screen').hidden=true;fiV6Header();}
  function fiV6Back(){
    if(fiV6ScheduleOpen){fiV6CloseSchedule();return;}
    if(!$('kehadiran-workspace').hidden){
      if(fiV6AttendanceDetail){
        $('kehadiran-workspace-frame').contentWindow?.postMessage({type:'semakmur-fi-back-to-classes'},location.origin);
      }else if(fiV8AttendanceSection==='semakan') {
        $('kehadiran-workspace-frame').contentWindow?.postMessage({type:'semakmur-fi-back-to-record'},location.origin);
      }else closeKehadiranWorkspace();
      return;
    }
    if(!$('keberadaan-workspace').hidden){closeKeberadaanWorkspace();return;}
    if(!$('relief-workspace').hidden){closeReliefWorkspace();return;}
    switchMainMenu('laman_utama');
  }
  function fiV6RenderSchedule(){
    const day=$('fi-v6-day').value;
    $('fi-v6-schedule-date').textContent=day;
    $('fi-v6-day-schedule-list').innerHTML=scheduleDay(day);
  }
  function fiV6MobileRefresh(){
    if(!fiV6Mobile())return;
    const p=dashboardData?.profile||{};
    const nick=p.namaPenuh||currentUser?.name||'Guru SeMAKMUR';
    $('fi-v6-profile-name').textContent=nick;
    $('fi-v8-profile-email').textContent=p.email||currentUser?.email||'Akaun MOE';
    $('fi-v6-profile-initial').textContent=initials(p.namaSamaran||nick);
    const img=$('fi-v6-profile-photo'),raw=String(p.gambarProfil||p.fotoUrl||'').trim();
    const url=/^https:\/\/[^\s<>"']+$/i.test(raw)?raw:'';
    if(url){if(img.src!==url)img.src=url;img.onload=()=>{img.hidden=false;$('fi-v6-profile-initial').hidden=true;};img.onerror=()=>{img.hidden=true;$('fi-v6-profile-initial').hidden=false;};}
    else {img.hidden=true;$('fi-v6-profile-initial').hidden=false;img.removeAttribute('src');}
    $('fi-v6-date-short').textContent=new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'short',timeZone:'Asia/Kuala_Lumpur'}).format(new Date());
    $('fi-v6-now-pair').innerHTML=waktuKiniDanSeterusnya();
    $('fi-v6-relief-value').innerHTML=reliefHariIni();
    $('fi-v6-duty-value').innerHTML=tugasHariIni();
    $('fi-v6-actions-value').innerHTML=tindakanSaya();
    const root=$('fi-v6-home-schedule-list'),day=todayDay(),slots=dashboardData?.jadualTersedia?blokBergabung(day):[];
    root.innerHTML=slots.length?slots.slice(0,5).map(s=>`<div class="fi-v6-slot"><span class="fi-v6-slot-time">${escapeHtml(masaPaparan(s.mula))} – ${escapeHtml(masaPaparan(s.tamat))}</span><div><strong>${escapeHtml(s.subjek)}</strong><small>${escapeHtml(s.kelas||'')}</small></div><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></div>`).join(''):
      `<div class="fi-v6-no-data">${!DAYS.includes(day)?'Tiada jadual pada hari minggu.':'Tiada jadual waktu tersedia untuk hari ini.'}</div>`;
    if(fiV6ScheduleOpen)fiV6RenderSchedule();
  }
  // Ringkasan ketiadaan disediakan oleh FiKRSyncKetiadaanHariIni, bukan senarai cuti mentah.
  // Rekod mentah MC, alasan kesihatan dan dokumen tidak dihantar ke Dashboard umum.
  window.fiApplyKetiadaanHariIni=function(data){
    const host=$('fi-v45-absence-list'),note=$('fi-v45-absence-note');
    if(!host)return;
    if(!data){host.innerHTML='<div class="fi-v6-no-data">Maklumat keberadaan belum diselaraskan.</div>';return;}
    const names={CRK:'CRK',CTR:'CTR',URUSAN_RASMI:'Urusan Rasmi',CUTI_ATAU_URUSAN:'Cuti / Urusan'};
    const items=Array.isArray(data.items)?data.items:[];
    if(note)note.textContent='Rekod dengan sokongan atau tindakan relief · kemas kini berkala';
    host.innerHTML=items.length?items.map(x=>
      '<div class="fi-v45-absence-row"><span class="fi-v45-absence-icon"><i class="fa-solid fa-user-clock" aria-hidden="true"></i></span>'+
      '<span class="fi-v45-absence-details"><strong>'+escapeHtml(x.name||'Guru')+'</strong><small>'+escapeHtml(names[x.category]||'Keberadaan')+' · '+escapeHtml(x.period||'')+'</small></span></div>'
    ).join(''):'<div class="fi-v6-no-data">Tiada rekod ketiadaan yang telah disahkan untuk hari ini.</div>';
  };
  function applySummary(){
    renderShortcuts();
    $('home-summary').innerHTML=summaryWidget('blue','Kelas Sekarang',waktuKiniDanSeterusnya(),'calendar')+
      summaryWidget('amber','Relief Hari Ini',reliefHariIni(),'calendar')+
      summaryWidget('green','Tugasan',tugasHariIni(),'attendance')+
      summaryWidget('violet','Tindakan Saya',tindakanSaya(),'report');
    renderRightSide();fiV6MobileRefresh();
  }
  function scheduleDay(day){
    if(!dashboardData?.jadualTersedia)return '<div class="empty-info">Jadual peribadi belum tersedia.</div>';
    const blocks=blokBergabung(day);
    if(!blocks.length)return '<div class="empty-info">Tiada waktu mengajar direkodkan.</div>';
    return blocks.map(s=>`<div class="slot-item"><span class="time">${escapeHtml(masaPaparan(s.mula))} – ${escapeHtml(masaPaparan(s.tamat))}</span><div><strong>${escapeHtml(s.subjek)}</strong><div class="text-quiet">${escapeHtml(s.kelas||'Kelas tidak dinyatakan')}</div></div></div>`).join('');
  }
  function rphForSlot(s){
    const records=dashboardData?.rphStatusHariIni||[];
    const match=records.find(r=>String(r.kelas||'').trim().toUpperCase()===String(s.kelas||'').trim().toUpperCase() && namaSubjek(r.subjek).toUpperCase()===namaSubjek(s.subjek).toUpperCase() && (
      (r.mula&&masaKeMinit(r.mula)===s.startMin) ||
      (r.mula&&r.tamat&&masaKeMinit(r.mula)>=s.startMin&&masaKeMinit(r.tamat)<=s.endMin) ||
      (!r.mula&&!r.tamat)
    ));
    return match?.status||'';
  }
  function rphBadge(s){
    const st=rphForSlot(s);
    const key=String(st).toLowerCase().trim();
    const display=key==='hantar'||key==='dihantar'?'Hantar':key==='draf'?'Draf':key.includes('refleksi')?'Menunggu refleksi':'';
    return `<span class="rph-status ${display?'rph-'+(display==='Hantar'?'sent':display==='Draf'?'draft':'reflect'):'rph-unknown'}" title="${display?'Status e-RPH: '+escapeHtml(display):'Status e-RPH belum diselaraskan'}">${display?escapeHtml(display):'RPH —'}</span>`;
  }
  function renderTimetable(){
    const root=$('right-schedule-list'),hint=$('schedule-context'),dayLabel=$('schedule-today-label');
    if(!root)return;
    const day=todayDay(),weekend=!DAYS.includes(day),holiday=dashboardData?.cutiHariIni;
    dayLabel.textContent=day;
    hint.textContent=day+', '+new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'long',timeZone:'Asia/Kuala_Lumpur'}).format(new Date());
    if(weekend){root.innerHTML='<div class="schedule-empty"><strong>Tiada jadual waktu hari ini.</strong><span>Hari minggu — Sabtu dan Ahad.</span></div>';return;}
    if(holiday?.disahkan===true&&holiday?.cuti===true){
      root.innerHTML='<div class="schedule-empty"><strong>Cuti sekolah hari ini.</strong><span>'+escapeHtml(holiday.nama||'Tiada sesi pengajaran dijadualkan.')+'</span></div>';return;
    }
    if(!dashboardData?.jadualTersedia){root.innerHTML='<div class="schedule-empty">Maklumat jadual waktu belum tersedia.</div>';return;}
    const all=blokBergabung(day);
    if(!all.length){root.innerHTML='<div class="schedule-empty">Tiada jadual waktu hari ini.</div>';return;}
    const n=nowMsia(),minute=n.getHours()*60+n.getMinutes();
    root.innerHTML=all.map(s=>{
      const active=s.startMin<=minute&&minute<s.endMin,ended=s.endMin<=minute;
      const state=active?'current':ended?'done':'upcoming';
      const label=active?'Sedang berlangsung':ended?'Selesai':'Akan datang';
      return `<div class="daily-schedule-card ${state}">
        <div class="schedule-time"><span>${escapeHtml(masaPaparan(s.mula))}</span><span class="schedule-range-dash">–</span><span>${escapeHtml(masaPaparan(s.tamat))}</span></div>
        <div class="schedule-subject"><strong>${escapeHtml(s.subjek)}</strong><span>${escapeHtml(s.kelas||'Kelas belum dinyatakan')}</span></div>
        ${rphBadge(s)}<span class="schedule-status-dot ${state}" aria-label="${label}" title="${label}"></span>
      </div>`;
    }).join('');
  }
  function renderRightSide(){if(!$('right-announcement-list'))return;
    const a=dashboardData?.pengumuman;
    if(a?.disahkan===true&&Array.isArray(a.senarai)&&a.senarai.length){$('right-announcement-list').innerHTML=a.senarai.slice(0,5).map(x=>`<div class="notice-item"><span class="notice-symbol">${qIcon('mail')}</span><div><strong>${escapeHtml(x.tajuk||'Makluman')}</strong><span>${escapeHtml(x.ringkasan||'')}</span></div></div>`).join('');}
    else $('right-announcement-list').innerHTML='<div class="info-placeholder">Tiada pengumuman yang telah diselaraskan untuk dipaparkan.</div>';
    const calendar=dashboardData?.takwimTerkini || dashboardData?.takwim;
    const host=$('right-calendar-list');
    if(host){
      if(calendar?.disahkan===true && Array.isArray(calendar.senarai) && calendar.senarai.length){
        host.innerHTML=calendar.senarai.slice(0,5).map(x=>`<div class="notice-item"><span class="notice-symbol">${qIcon('calendar')}</span><div><strong>${escapeHtml(x.tajuk||x.aktiviti||'Aktiviti')}</strong><span>${escapeHtml(x.tarikh||x.tarikhMula||'')}</span></div></div>`).join('');
      }else host.innerHTML='<div class="info-placeholder">Maklumat Takwim Terkini belum diselaraskan.</div>';
    }
    renderTimetable();
  }
  let rightPanelHidden=false;
  function toggleRightPanel(){
    rightPanelHidden=!rightPanelHidden;
    const panel=$('right-panel'),left=$('main-left-column');
    panel.classList.toggle('hidden',rightPanelHidden);
    left.classList.toggle('xl:col-span-8',!rightPanelHidden);
    left.classList.toggle('xl:col-span-12',rightPanelHidden);
    $('toggle-right-text').textContent=rightPanelHidden?'Buka Panel Kanan':'Sorok Panel Kanan';
    $('btn-toggle-right').setAttribute('aria-expanded',String(!rightPanelHidden));
  }
  function renderRoleList(roles,limit=5){
    if(!roles?.length)return '<div class="empty-info">Tiada pelantikan aktif untuk ditunjukkan pada masa ini.</div>';
    return roles.slice(0,limit).map(r=>`<div class="border-b border-slate-100 pb-3 last:border-0 last:pb-0"><div class="font-extrabold text-[13px] text-slate-700">${escapeHtml(r.peranan||'Ahli Jawatankuasa')}</div><div class="text-[13px] text-slate-500 mt-0.5">${escapeHtml(r.jawatankuasa||'Tugasan sekolah')}</div></div>`).join('');
  }
  function categoryRoles(key){
    const roles=dashboardData?.peranan||[];
    const matches={pentadbiran:/pentadbiran|pengurusan|tugas|bertugas/i,kurikulum:/kurikulum|akademik|panitia/i,hem:/hem|hal ehwal murid|kebajikan|disiplin/i,kokurikulum:/kokurikulum|ko kurikulum|sukan|kelab/i,lain_lain:/lain/i}[key];
    return key==='lain_lain'?[]:roles.filter(r=>matches.test(r.kategori||''));
  }
  function fiV8SchoolSummaryHTML(){
    const s=window.FiSchoolSummary, n=v=>Number.isFinite(Number(v))?Number(v):null;
    const value=v=>n(v)===null?'—':`${v}%`;
    if(!s)return `<div class="fi-v8-hem-metrics"><div>Kehadiran Hari Ini<strong>—</strong><small>Ringkasan belum diselaraskan</small></div><div>Kehadiran Bulanan<strong>—</strong><small>Menunggu proses Auto Sync</small></div><div>Kelas Kehadiran Penuh<strong>—</strong><small>Menunggu data rasmi</small></div><div>Kelas Belum Direkod<strong>—</strong><small>Menunggu data rasmi</small></div></div>`;
    const full=Array.isArray(s.fullAttendanceClasses)?s.fullAttendanceClasses:[];
    return `<div class="fi-v8-hem-metrics"><div>Kehadiran Hari Ini<strong>${escapeHtml(value(s.todayRate))}</strong><small>${escapeHtml(s.recordedClasses)} kelas telah merekod</small></div><div>Kehadiran Bulanan<strong>${escapeHtml(value(s.monthlyRate))}</strong><small>Purata rekod tersedia, bukan kelas yang belum direkod</small></div><div>Kelas Kehadiran Penuh<strong>${escapeHtml(s.fullAttendanceCount ?? full.length)}</strong><small>${escapeHtml(full.slice(0,3).join(', ')||'Tiada kelas penuh')}</small></div><div>Kelas Belum Direkod<strong>${escapeHtml(s.unrecordedClasses)}</strong><small>Daripada ${escapeHtml(s.activeClasses)} kelas aktif</small></div></div>`;
  }
  window.fiApplySchoolSummary=function(data){window.FiSchoolSummary=data;if(activePage!=='laman_utama')renderCategories(activePage);};
  function renderCategories(key){
    const menu=MENUS[key];if(!menu)return;
    $('category-title').textContent=menu.title;
    $('category-desc').textContent=menu.subtitle;
    $('category-label').textContent='RUANG KERJA · '+menu.title.toUpperCase();
    const roles=categoryRoles(key);
    $('role-count').textContent=String(roles.length);
    $('category-roles').innerHTML=renderRoleList(roles,15);
    if(key==='kurikulum'){
      const all=dashboardData?.jadual||[];
      const count=all.length;
      $('category-overview').innerHTML=`<p class="text-[13px] text-slate-600">${dashboardData?.jadualTersedia?count+' waktu mingguan direkodkan dalam jadual peribadi anda.':'Jadual peribadi belum tersedia.'}</p><div id="weekly-timetable" class="mt-3 space-y-3">${DAYS.map(day=>`<div><div class="font-extrabold text-[13px] text-[#24789e] py-2">${day}</div><div class="space-y-2">${scheduleDay(day,'category')}</div></div>`).join('')}</div></div>`;
    } else if(key==='hem'){
      const guru=dashboardData?.profile?.guruKelas;
      $('category-overview').innerHTML=`<div class="fi-v8-hem-header">${guru?'Guru Kelas: '+escapeHtml(guru):'Ringkasan Kehadiran Sekolah'}</div>`+fiV8SchoolSummaryHTML();
      // Statistik HEM akan menggunakan dokumen ringkasan Firestore rasmi, bukan angka contoh.
      return;
    } else if(false&&key==='hem'&&dashboardData?.profile?.guruKelas){
      $('category-overview').innerHTML=`<div class="info-pill inline-block">Guru Kelas: ${escapeHtml(dashboardData.profile.guruKelas)}</div><p class="text-[13px] text-slate-500 mt-2">Rekod kehadiran dan tindakan kelas akan dipaparkan selepas modul HEM disambungkan.</p>`;
    } else {
      $('category-overview').innerHTML=`<div class="empty-info">${escapeHtml(CATEGORY_BLURB[key])}</div>`;
    }
    if(key!=='hem')$('category-overview').insertAdjacentHTML('beforeend','<div class="fi-v8-hem-header" style="margin-top:16px">Statistik Kehadiran Sekolah</div>'+fiV8SchoolSummaryHTML());
    // Pautan modul bidang telah dipindahkan ke bahagian atas, tanpa pendua di bawah.
  }
  function switchMainMenu(key){if(!MENUS[key])return;activePage=key;
    $('breadcrumb-text').textContent=MENUS[key].title;
    renderShortcuts(key);
    $('right-my-roles-panel').classList.toggle('hidden',key==='laman_utama');
    $('page-laman_utama').classList.toggle('hidden',key!=='laman_utama');

    $('page-category').classList.toggle('hidden',key==='laman_utama');
    if(key!=='laman_utama')renderCategories(key);
    document.querySelectorAll('[data-page]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.page===key);});
    $('page-scroll').scrollTo({top:0,behavior:'instant'});
    closeMobileMenu();fiV6Header();
  }
  function toggleMobileMenu(){const side=$('sidebar-container');const open=side.classList.contains('-translate-x-full');
    side.classList.toggle('-translate-x-full',!open);$('sidebar-backdrop').classList.toggle('active',open);$('mobile-action-menu').setAttribute('aria-expanded',String(open));}
  function closeMobileMenu(){if(window.innerWidth>=768)return; $('sidebar-container').classList.add('-translate-x-full');$('sidebar-backdrop').classList.remove('active');$('mobile-action-menu').setAttribute('aria-expanded','false');}
  function openProfile(){
    showInfo('Profil Fi diselaraskan daripada Data Induk sekolah. Suntingan profil belum dipindahkan.');
  }
  function closeProfile(){$('profile-modal').classList.add('hidden');$('profile-modal').classList.remove('flex');}
  async function saveProfile(event){
    event.preventDefault();
    showInfo('Suntingan profil belum diaktifkan dalam Fi V4.');
  }
  async function handleLogout(){
    // Fi V4: log keluar hanya daripada Firebase Auth, tiada API Apps Script.
    dashboardAuthenticated=false;
    try{await window.FiDashboard?.signOutOnly?.();}
    catch(e){location.replace('../Fi-LoginSession.html');}
  }
  function updateClock(){
    const d=nowMsia(),hour=d.getHours(),displayHour=hour%12||12;
    $('header-date').textContent=dateText(new Date());
    const period=hour<12?'pagi':hour<14?'tengah hari':hour<19?'petang':'malam';
    $('header-time').textContent=displayHour+':'+String(d.getMinutes()).padStart(2,'0')+' '+period;
    if(dashboardData){
      renderTimetable();fiV6MobileRefresh();
      const content=$('home-summary')?.querySelector('.summary-widget.theme-blue .summary-content');
      if(content)content.innerHTML=waktuKiniDanSeterusnya(); // kalkulasi setempat ikut jam
    }
  }
  // Paparkan kerangka dashboard segera. Tiada data pengguna digunakan sebelum backend mengesahkan sesi.
  function loadingLines(){return '<div class="sema-loading-row" aria-hidden="true"><div class="sema-loading-line long"></div><div class="sema-loading-line medium"></div><div class="sema-loading-line short"></div></div>';}
  function showInstantShell(){
    renderShortcuts();
    const mini='<div class="class-mini-pair">'+
      '<div class="class-mini class-mini-now"><div class="class-mini-label"><span class="class-mini-dot"></span>Sekarang</div>'+loadingLines()+'</div>'+ 
      '<div class="class-mini class-mini-next"><div class="class-mini-label"><span class="class-mini-dot"></span>Selepas</div>'+loadingLines()+'</div></div>';
    $('home-summary').innerHTML=
      summaryWidget('blue','Kelas Sekarang',mini,'calendar')+
      summaryWidget('amber','Relief Hari Ini',loadingLines(),'calendar')+
      summaryWidget('green','Tugasan',loadingLines(),'attendance')+
      summaryWidget('violet','Tindakan Saya',loadingLines(),'report');
    $('schedule-today-label').textContent=todayDay();
    $('schedule-context').textContent='';
    $('right-schedule-list').innerHTML='<div class="sema-loading-block" aria-label="Menyiapkan jadual">'+loadingLines()+'</div><div class="sema-loading-block">'+loadingLines()+'</div>';
    $('right-announcement-list').innerHTML='<div class="sema-loading-block">'+loadingLines()+'</div>';
    $('right-calendar-list').innerHTML='<div class="sema-loading-block">'+loadingLines()+'</div>';
  }
  // Fi V4: Identiti dipaparkan hanya selepas Firebase mengesahkan Firestore.
  function showRememberedGreeting(){return; /* tiada cache identiti sesi lama */

    try {
      const loggedIn=Boolean(localStorage.getItem('SEMAKMUR_PWA_REFRESH_TOKEN') || sessionStorage.getItem('SEMAKMUR_SESSION_TOKEN'));
      if(!loggedIn)return;
      const raw=sessionStorage.getItem('CURRENT_USER')||localStorage.getItem('SAVED_MOE_USER');
      if(!raw)return;
      const saved=JSON.parse(raw);
      if(!saved || !['guru','admin','admin_choice'].includes(String(saved.role||'')) && saved.is_admin!==true)return;
      const name=String(saved.name||saved.nama||saved.Nama_Penuh||'').trim();
      if(name && name.length<=130){$('header-user-name').textContent=name;$('header-user-name').title=name;}
      const nick=String(saved.Nama_Samaran||saved.namaSamaran||'').trim();
      if(nick&&nick.length<=50){$('user-display-name').textContent=nick;$('sidebar-avatar-initial').textContent=initials(nick);$('mobile-avatar-initial').textContent=initials(nick);}
      requestAnimationFrame(fitName);
    }catch(_e){ /* Paparan tetap berfungsi tanpa maklumat sebelumnya. */ }
  }
  function sendToLogin(){
    dashboardAuthenticated=false;
    $('v4-launch-message').textContent='Sila log masuk menggunakan akaun Google anda.';
    window.FiDashboard?.showSignIn?.();
  }
  // Identiti dipadankan dengan respons backend yang telah mengesahkan sesi.
  function identityFromResponse(res){
    const fb=window.FiAuthenticatedUser;
    const email=String(res?.profile?.email||'').trim().toLowerCase();
    if(!fb||!email||String(fb.email||'').toLowerCase()!==email)return null;
    const matched=false, trusted=null; // Fi V4: jangan percayai role client untuk keizinan data.
    currentUser={
      email,name:res.profile.namaPenuh||'',role:'guru',
      // Firestore snapshot is NOT a source of permission or admin status.
      is_admin:matched && trusted.is_admin===true,
      guru_kelas:matched?trusted.guru_kelas||'':''
    };
    return currentUser;
  }
  function finishDashboard(res){
    if(!identityFromResponse(res)){sendToLogin();return false;}
    dashboardAuthenticated=true;
    dashboardData=res;
    applyProfile();applySummary();
    $('right-my-roles').innerHTML=renderRoleList(res.peranan);
    if(activePage!=='laman_utama')renderCategories(activePage);
    $('header-status').textContent='Data terkini';setNotice('');
    if(!resumeDone)requestAnimationFrame(resumeLastWorkspace);
    $('v4-launch').hidden=true;fiV6Header();
    fiKehadiranSesiLatar();
    return true;
  }
  function unavailableDashboard(err){
    console.warn('Penyegerakan dashboard belum selesai:',String(err?.message||err));
    $('header-status').textContent='Sambungan belum tersedia';
    setNotice('Maklumat belum dapat dikemas kini. Sila semak sambungan internet.');
    const btn=document.createElement('button');btn.type='button';btn.textContent='Cuba Lagi';
    btn.className='ml-3 font-extrabold underline underline-offset-2';
    btn.addEventListener('click',()=>{setNotice('');hydrateDashboard(true);});
    $('service-notice').appendChild(btn);
    // UI tidak kosong; tidak memaparkan cache peribadi jika belum disahkan.
    if(!dashboardAuthenticated){
      $('home-summary').innerHTML=
        summaryWidget('blue','Kelas Sekarang','<div class="status-copy">Sambungan diperlukan.</div>','calendar')+
        summaryWidget('green','Tugas Hari Ini','<div class="status-copy">Belum dapat disahkan.</div>','attendance')+
        summaryWidget('amber','Relief Hari Ini','<div class="status-copy">Belum dapat disahkan.</div>','calendar')+
        summaryWidget('violet','Tindakan Saya','<div class="status-copy">Belum dapat disahkan.</div>','report');
    }
  }
  // Fi: sumber bacaan Dashboard ialah Firestore peribadi. API asal hanya untuk import/refresh pilihan guru.
  async function hydrateDashboard(){
    if(dashboardRequestPending)return;
    dashboardRequestPending=true;
    try{
      const bridge=await Promise.race([
        window.FiBridgeReady,
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('Sambungan data Fi belum sedia.')),18000))
      ]);
      await bridge.load();
    }catch(err){unavailableDashboard(err);}finally{dashboardRequestPending=false;}
  }
  window.fiApplyDashboard = function(res){ return finishDashboard(res); };
  function boot(){
    $('copyright-year').textContent=String(new Date().getFullYear());
    document.body.classList.add('v4-on-home');
    updateClock();setInterval(updateClock,30000);
    $('greeting-text').textContent='Selamat Datang';
    document.addEventListener('click',e=>{const module=e.target.closest('[data-module]');if(module){if(module.dataset.module==='jadual'){if(fiV6Mobile())fiV6OpenSchedule();else switchMainMenu('kurikulum');return;}openModule(module.dataset.module);return;}
      const page=e.target.closest('[data-page]');if(page){fiV6CloseSchedule();closeErphWorkspace();closeKehadiranWorkspace();closeKeberadaanWorkspace();closeReliefWorkspace();switchMainMenu(page.dataset.page);rememberWorkspace(page.dataset.page);return;}
      const day=e.target.closest('[data-day]');if(day){activeDay=day.dataset.day;renderTimetable();}
    });
    $('kehadiran-workspace-frame').addEventListener('load',fiKehadiranFrameReady);
    $('keberadaan-workspace-frame').addEventListener('load',()=>{
      // DOM loaded does not equal auth/data ready; child sends verified module state.
      $('keberadaan-workspace-frame').contentWindow?.postMessage({type:'semakmur-fi-kb-request-state'},location.origin);
    });
    window.addEventListener('message',e=>{
      if(e.origin!==location.origin||e.source!==$('keberadaan-workspace-frame')?.contentWindow)return;
      if(e.data?.type==='semakmur-fi-kb-ready'){
        $('keberadaan-workspace-frame').dataset.fiReady='1';
        $('fi-keberadaan-loading').hidden=true;
      }else if(e.data?.type==='semakmur-fi-kb-error'){
        kbWorkspaceStatus('Tidak dapat membuka e-Keberadaan',String(e.data.message||'Sila semak sambungan Firebase.'),true);
      }else if(e.data?.type==='semakmur-fi-kb-back'){
        closeKeberadaanWorkspace();switchMainMenu('laman_utama');
      }
    });
    $('v4-back').addEventListener('click',fiV6Back);
    $('v4-profile').addEventListener('click',openProfile);
    $('v4-bell').addEventListener('click',()=>showInfo('Tiada notifikasi baharu yang disahkan.'));
    $('fi-v6-day').addEventListener('change',fiV6RenderSchedule);
    window.addEventListener('message',e=>{
      if(e.origin!==location.origin||e.source!==$('kehadiran-workspace-frame').contentWindow)return;
      if(e.data?.type==='semakmur-fi-attendance-ready'){
      $('kehadiran-workspace-frame').dataset.fiReady='1';
      $('fi-kehadiran-loading').hidden=true;
    }
    if(e.data?.type==='semakmur-fi-attendance-error'){
      $('fi-kehadiran-loading').hidden=true;
    }
    if(e.data?.type==='semakmur-fi-attendance-section'){
        fiV8AttendanceSection=e.data.section==='semakan'?'semakan':'rekod';
        fiV6AttendanceDetail=false;fiV6Header();
        if(!fiV6Mobile())skhDesktopHeading(true);
      }
      if(e.data?.type==='semakmur-fi-attendance-screen'){
        fiV6AttendanceDetail=e.data.screen==='students';
        fiV6SelectedClassName=String(e.data.className||'Kehadiran Murid').slice(0,80);
        fiV6Header();
      }
    });
    $('profile-form').addEventListener('submit',saveProfile);
    $('profile-modal').addEventListener('click',e=>{if(e.target===$('profile-modal'))closeProfile();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeErphWorkspace();closeKehadiranWorkspace();closeKeberadaanWorkspace();closeReliefWorkspace();closeProfile();closeMobileMenu();}});
    window.addEventListener('resize',()=>{fitName();if(window.innerWidth>=768){$('sidebar-container').classList.remove('-translate-x-full');$('sidebar-backdrop').classList.remove('active');}else{$('sidebar-container').classList.add('-translate-x-full');}});
    showInstantShell();
    fiV6Header();
    showRememberedGreeting();
    // Fi V4: Firebase Authentication digunakan secara terus.
    // Biar browser cat UI dahulu; API dan pembacaan Google Sheets dilakukan secara async.
    requestAnimationFrame(()=>{hydrateDashboard();});
    if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){
      navigator.serviceWorker.register('../service-worker.js',{scope:'../'}).catch(()=>{});
    }
  }
  window.addEventListener('DOMContentLoaded',boot);

  // Bestari V4.1: calendar modal, no new backend reads or writes.
  (function installBestariCalendar(){
    const modal=document.getElementById('bestari-calendar-dialog');
    const trigger=document.getElementById('bestari-calendar-trigger');
    if(!modal||!trigger)return;
    let visibleMonth=new Date();visibleMonth.setDate(1);
    let lastFocus=null;
    const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    function eventDate(value){
      const raw=String(value||'').trim();
      let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
      if(m)return `${m[1]}-${m[2]}-${m[3]}`;
      m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw);
      return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';
    }
    function officialEvents(){
      const raw=dashboardData?.takwimTerkini||dashboardData?.takwim;
      return raw?.disahkan===true&&Array.isArray(raw?.senarai)?raw.senarai:[];
    }
    function renderCalendar(){
      const y=visibleMonth.getFullYear(),mo=visibleMonth.getMonth(), today=iso(new Date());
      document.getElementById('bestari-calendar-month').textContent=visibleMonth.toLocaleDateString('ms-MY',{month:'long',year:'numeric'});
      const grid=document.getElementById('bestari-calendar-days');
      const events=officialEvents(),keys=new Set(events.map(x=>eventDate(x.tarikh||x.tarikhMula)).filter(Boolean));
      const cells=[],pad=(new Date(y,mo,1).getDay()+6)%7,count=new Date(y,mo+1,0).getDate();
      for(let i=0;i<pad;i++)cells.push('<span class="blank" aria-hidden="true"></span>');
      for(let day=1;day<=count;day++){
        const d=iso(new Date(y,mo,day));
        const cls=[d===today?'today':'',keys.has(d)?'has-event':''].filter(Boolean).join(' ');
        cells.push(`<span class="cal-day ${cls}" aria-label="${day} ${visibleMonth.toLocaleDateString('ms-MY',{month:'long'})} ${y}">${day}${keys.has(d)?'<i aria-hidden="true"></i>':''}</span>`);
      }
      grid.innerHTML=cells.join('');
      const monthPrefix=`${y}-${String(mo+1).padStart(2,'0')}-`;
      const monthEvents=events.filter(x=>eventDate(x.tarikh||x.tarikhMula).startsWith(monthPrefix));
      document.getElementById('bestari-calendar-events').innerHTML=monthEvents.length
       ?monthEvents.map(x=>`<div class="cal-event"><strong>${escapeHtml(x.tajuk||x.aktiviti||'Aktiviti sekolah')}</strong><span>${escapeHtml(String(x.tarikh||x.tarikhMula||''))}</span></div>`).join('')
       :'<p class="cal-empty">Tiada aktiviti diselaraskan untuk bulan ini. Semak Takwim Rasmi apabila tersedia.</p>';
    }
    function close(){modal.hidden=true;document.body.classList.remove('bestari-calendar-open');lastFocus?.focus?.();}
    trigger.addEventListener('click',()=>{lastFocus=document.activeElement;renderCalendar();modal.hidden=false;document.body.classList.add('bestari-calendar-open');document.getElementById('bestari-calendar-close').focus();});
    document.getElementById('bestari-calendar-close').addEventListener('click',close);
    document.getElementById('bestari-calendar-prev').addEventListener('click',()=>{visibleMonth.setMonth(visibleMonth.getMonth()-1);renderCalendar();});
    document.getElementById('bestari-calendar-next').addEventListener('click',()=>{visibleMonth.setMonth(visibleMonth.getMonth()+1);renderCalendar();});
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
  })();
  

  /* Tema desktop V4: nama sambutan daripada label pengguna Fi yang telah disahkan.
     Iframe same-origin menerima CSS desktop; iframe Apps Script cross-origin tidak disentuh. */
  (function(){
    const marker = document.getElementById('header-user-name');
    const display = document.getElementById('bestari-hero-name');
    if(marker && display){
      const update = () => {
        const n = (marker.textContent || '').trim();
        if(n && !/^(dashboard guru|menyemak|selamat datang)/i.test(n)) display.textContent = n;
      };
      new MutationObserver(update).observe(marker,{childList:true,characterData:true,subtree:true});
      update();
    }
    /* Carian sebenar, khusus kad pautan yang sedang dipaparkan; tidak menyentuh data Fi. */
    const search = document.getElementById('bestari-search');
    const moduleGrid = document.getElementById('home-modules');
    if(search && moduleGrid){
      const filter = () => {
        const q = search.value.trim().toLocaleLowerCase('ms');
        moduleGrid.querySelectorAll('.shortcut-card').forEach(card => {
          const match = !q || (card.textContent || '').toLocaleLowerCase('ms').includes(q);
          if(match) card.style.removeProperty('display');
          else card.style.setProperty('display','none','important');
        });
      };
      search.addEventListener('input',filter);
      new MutationObserver(filter).observe(moduleGrid,{childList:true});
      document.addEventListener('keydown',e=>{
        if(!window.matchMedia('(min-width:768px)').matches) return;
        if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k'){
          e.preventDefault();search.focus();search.select();
        }
      });
    }
    // V4.4: Fi iframe loads its own desktop CSS; no CSS injection needed.
  })();


/* ====== MODUL TERGABUNG: FiFirebaseDashboard ====== */
(async function FiFirebaseDashboard(){
  const {initializeApp} = await import("https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js");
  const {getAuth,onAuthStateChanged,signOut} = await import("https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js");
  const {getFirestore,doc,onSnapshot} = await import("https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js");
/** SeMAKMUR Fi Dashboard V4 — Firebase sahaja untuk Fi Dashboard/Kehadiran. */



const $=id=>document.getElementById(id),norm=s=>String(s||'').trim().toLowerCase();
let auth=null,db=null,user=null,stop=null,schoolStop=null,absenceStop=null,schoolDate=null,loaded=false,initial=false;
function note(t,m){
 $('fi-panel').hidden=false;$('fi-panel-title').textContent=t;$('fi-panel-message').textContent=m;
 $('fi-login-button').hidden=false;$('fi-refresh-button').hidden=true;$('fi-read-button').hidden=true;
 $('v4-launch-message').textContent=m;
}
function fail(e){const raw=String(e?.message||e||'Sambungan gagal');console.error('Fi Dashboard:',raw);note('Dashboard belum tersedia',raw);}
function dateMY(){
 const p=new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Kuala_Lumpur'}).formatToParts(new Date());
 const d=Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${d.year}-${d.month}-${d.day}`;
}
function apply(raw){
 if(!raw||raw.active!==true||norm(raw.ownerEmail)!==norm(user?.email)||norm(raw.profile?.email)!==norm(user?.email))throw new Error('Profil staf Firebase tidak sepadan atau tidak aktif.');
 const today=raw.dayKey===dateMY();
 const data={success:true,profile:raw.profile||{},jadual:Array.isArray(raw.jadual)?raw.jadual:[],peranan:Array.isArray(raw.peranan)?raw.peranan:[],
 jadualTersedia:raw.jadualTersedia===true,rphStatusHariIni:today?(raw.rphStatusHariIni||[]):[],cutiHariIni:today?raw.cutiHariIni:{disahkan:false,cuti:false},integrasi:raw.integrasi||{}};
 if(!window.fiApplyDashboard?.(data))throw new Error('Paparan Dashboard belum berjaya disahkan.');
 loaded=true;watchSchool();$('fi-panel').hidden=true;
 $('header-status').textContent='Data terselaras';
 $('v4-launch').hidden=true;
}
function watch(){
 if(stop){stop();stop=null;}
 if(!user)return;
 const uid=user.uid;
 stop=onSnapshot(doc(db,'semakmur_dashboard_fi',uid),snap=>{
   if(uid!==user?.uid)return;
   if(!snap.exists()){note('Akses belum diselaraskan','Akaun ini belum tersedia dalam Firestore. Jalankan FiAutoSyncJalankan di penyelaras.');return;}
   try{apply(snap.data());}catch(e){fail(e);}
 },fail);
}
function watchSchool(){
 if(!user||!db)return;
 const date=dateMY();if(schoolStop&&schoolDate===date)return;
 if(schoolStop)schoolStop();schoolDate=date;
 if(absenceStop)absenceStop();
 absenceStop=onSnapshot(doc(db,'semakmur_fi_keberadaan_hari_ini',date),snap=>{
   window.fiApplyKetiadaanHariIni?.(snap.exists()?snap.data():null);
 },error=>{console.warn('Ringkasan keberadaan belum tersedia:',error.code||error.message);window.fiApplyKetiadaanHariIni?.(null);});
 schoolStop=onSnapshot(doc(db,'semakmur_fi_ringkasan_sekolah',date),snap=>{
   window.fiApplySchoolSummary?.(snap.exists()?snap.data():null);
 },error=>{console.warn('Ringkasan Kehadiran belum tersedia:',error.code||error.message);window.fiApplySchoolSummary?.(null);});
}
setInterval(()=>{if(user&&schoolDate!==dateMY())watchSchool();},60000);
async function logout(){if(stop)stop();if(schoolStop)schoolStop();if(absenceStop)absenceStop();stop=schoolStop=absenceStop=null;if(auth)await signOut(auth);user=null;window.FiAuthenticatedUser=null;location.replace('../Fi-LoginSession.html');}
function login(){location.replace('../Fi-LoginSession.html');}
window.FiDashboard={
 load:async()=>{if(!auth)throw new Error('Firebase belum dimulakan.');await auth.authStateReady();if(!auth.currentUser){login();return;}user=auth.currentUser;window.FiAuthenticatedUser={uid:user.uid,email:user.email};if(!stop)watch();},
 read:async()=>{watch();},importData:async()=>{watch();},
 // Modul legacy boleh mengekalkan semakan pelayannya sendiri. Tiada panggilan Apps Script untuk Fi.
 ensureOfficial:async()=>false,signOutOnly:logout,showSignIn:login
};
$('fi-login-button').addEventListener('click',login);
$('fi-refresh-button').addEventListener('click',watch);
$('fi-read-button').addEventListener('click',watch);
try{
 const config=window.SeMAKMURFirebasePilotConfig;
 if(!config?.projectId)throw new Error('Konfigurasi firebase-pilot-config.js tiada.');
 const app=initializeApp(config,'semakmur-fi-dashboard');auth=getAuth(app);db=getFirestore(app);
 window.fiBridgeResolve?.(window.FiDashboard);
 onAuthStateChanged(auth,u=>{
   if(!u){if(stop)stop();if(absenceStop)absenceStop();stop=absenceStop=null;window.FiAuthenticatedUser=null;login();return;}
   if(u.uid!==user?.uid||!stop){user=u;window.FiAuthenticatedUser={uid:u.uid,email:u.email};watch();}
 },fail);
}catch(e){fail(e);window.fiBridgeReject?.(e);}

})().catch(e=>console.error("Fi bootstrap FiFirebaseDashboard:",e));

/* ====== MODUL TERGABUNG: FiWidgetKeberadaan ====== */
(async function FiWidgetKeberadaan(){
  const {getApps} = await import("https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js");
  const {getAuth,onAuthStateChanged} = await import("https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js");
  const {getFirestore,doc,getDoc,collection,query,where,limit,onSnapshot} = await import("https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js");
/** SeMAKMUR Fi V6.4: read-only authenticated Keberadaan widget for desktop dashboard.
 * No writes, no simulated stats, no impact on Kehadiran V8.
 * Counts are limited to 100 most recent self-owned requests, not school totals.
 */



const $=id=>document.getElementById(id);
const set=(id,x)=>{const el=$(id);if(el)el.textContent=String(x)};
const docRequired=r=>['CRK','CTR'].includes(r.finalType||r.type)||(r.type==='RASMI'&&r.scope==='LUAR');
const completed=r=>{
 if(r.gpkStatus==='ditolak')return true;
 if(docRequired(r)&&!r.docPath&&!r.docName)return false;
 if(r.lifecycle==='DIBATALKAN')return true; if(['CRK','CTR'].includes(r.type)||['CRK','CTR'].includes(r.finalType||''))return r.docReviewed===true;
 if(r.type==='RASMI'&&r.scope==='LUAR')return r.relief==='sah';
 if(r.type==='RASMI'&&r.scope==='DALAM'||r.type==='MC')return r.gpkStatus!=='menunggu'&&r.gpkStatus!=='';
 if(r.type==='KECEMASAN')return r.gpkStatus!=='menunggu'&&(r.task==='KELUAR'||Boolean(r.finalType))&&!['tanpa','sementara'].includes(r.relief);
 return false;
};
const pending=r=>r.lifecycle!=='DIBATALKAN'&&!completed(r);
let stop=null,authApp=null;
let initTries=0;
function clear(){['kb-dash-total','kb-dash-pending','kb-dash-docs','kb-dash-relief'].forEach(k=>set(k,'—'));}
async function init(){
 const app=getApps().find(a=>a.name==='semakmur-fi-dashboard');
 if(!app){set('kb-dash-caption','Menunggu sambungan Dashboard Fi.');if(++initTries<25)setTimeout(init,250);return;}
 const db=getFirestore(app),auth=getAuth(app);authApp=auth;
 onAuthStateChanged(auth,async u=>{
  if(stop){stop();stop=null;}clear();
  if(!u){set('kb-dash-caption','Log masuk untuk melihat statistik.');return;}
  try{
   // Require same verified school dashboard profile before displaying private figures.
   const p=await getDoc(doc(db,'semakmur_dashboard_fi',u.uid));
   if(!p.exists()||p.data().active!==true||p.data().ownerEmail!==u.email){set('kb-dash-caption','Akaun guru belum disahkan.');return;}
   const rr=await getDoc(doc(db,'semakmur_fi_keberadaan_roles',u.uid)).catch(()=>null);
   const isTest=!!(rr?.exists()&&rr.data().active===true&&rr.data().ownerEmail===u.email&&(rr.data().roles||[]).includes('ADMIN_UJIAN'));
   stop=onSnapshot(query(collection(db,'semakmur_fi_keberadaan'),where('ownerUid','==',u.uid),limit(100)),snap=>{
    const rows=snap.docs.map(d=>d.data()).filter(d=>d.testMode===isTest);
    set('kb-dash-total',rows.length);set('kb-dash-pending',rows.filter(pending).length);
    set('kb-dash-docs',rows.filter(r=>(['CRK','CTR'].includes(r.finalType||r.type)||r.type==='RASMI'&&r.scope==='LUAR')&&!r.docPath&&!r.docName).length);
    set('kb-dash-relief',rows.filter(r=>r.lifecycle!=='DIBATALKAN'&&r.reliefStatus==='DIAGIH').length);
    set('kb-dash-caption',(isTest?'Mod UJIAN · ':'')+'Rekod saya (maksimum 100) · data Firestore');
   },e=>{clear();set('kb-dash-caption','Statistik belum dapat dibaca ('+(e.code||'sambungan')+').');});
  }catch(e){clear();set('kb-dash-caption','Statistik belum tersedia.');}
 });
}
// Wait for same Firebase app initialization from Fi-DashboardGuru.js (no second Firebase app).
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);

})().catch(e=>console.error("Fi bootstrap FiWidgetKeberadaan:",e));
