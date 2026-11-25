/* Fi-JadualWaktu — fungsi asal JadualWaktu.html; perubahan hanya pada pengesahan & pengangkutan Fi-Sync. */
let fiJWAuthContext = null;
const FI_JW_LOGIN_PAGE = '../../Fi-LoginSession.html';
function fiJWTrustedOrigin(origin) {
  try { const u=new URL(origin),h=u.hostname.toLowerCase();
    return u.protocol==='https:'&&!u.port&&
      (h==='script.google.com'||h==='script.googleusercontent.com'||h.endsWith('.script.googleusercontent.com')||h.endsWith('-script.googleusercontent.com'));
  } catch(_) {return false;}
}
function fiJWApiUrl(){
  const value=String(window.SeMAKMURFiAPIConfig?.webAppExecUrl||'').trim();
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(value))
    throw Error('URL Fi-Sync belum ditetapkan dalam Fi-APIConfig.js.');
  return value;
}
async function fiJWEnsureAccess(){
  const cfg=window.SeMAKMURFirebasePilotConfig;
  if(!cfg || !cfg.projectId)throw Error('Konfigurasi Firebase Fi tidak ditemui.');
  const [{getApps,initializeApp},{getAuth}] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')
  ]);
  const app=getApps().find(a=>a.name==='semakmur-fi-dashboard')||initializeApp(cfg,'semakmur-fi-dashboard');
  const auth=getAuth(app);await auth.authStateReady();
  const user=auth.currentUser;
  if(!user||!user.email){
    if(window.top===window)location.replace(FI_JW_LOGIN_PAGE);
    throw Error('Sila log masuk menggunakan akaun Google MOE dalam Dashboard Guru.');
  }
  fiJWAuthContext={auth,uid:user.uid,email:String(user.email).toLowerCase()};
  // Pemeriksaan PERTAMA menggunakan tindakan fiBackendHealth yang disokong
  // oleh Fi-Sync lama dan baharu. Ini mengesahkan versi backend yang benar-benar
  // menjawab permintaan pada URL Fi-APIConfig.js sebelum mencuba tindakan fiJW.
  const health=await fiJWRequest({action:'fiBackendHealth'},'fiBackendHealth');
  const activeVersion=String(health.version||'TIDAK_DINYATAKAN');
  if(health.fiJWRoute!==true){
    throw Error('Router Fi-JadualWaktu TIADA pada deployment yang sedang digunakan. '
      +'Backend sebenar: '+activeVersion+'. URL aktif di frontend: '+fiJWApiUrl()+'. '
      +'Semak URL /exec dalam Fi-APIConfig.js berbanding URL dari Manage deployments bagi PROJEK Fi-Sync yang memasang Code.gs dan FiJadualWaktu.gs. '
      +'Jangan deploy berulang kali sebelum kedua-dua URL itu sepadan.');
  }
  // Hanya selepas versi deployment disahkan, periksa keizinan modul dan sumber.
  const status=await fiJWRequest({action:'fiJWStatus'});
  if(!status.success)throw Error(status.error||'Akses Modul Jadual Waktu tidak dibenarkan.');
  fiJWServerStatus=status;
  return user;
}
let fiJWServerStatus=null;
async function fiJWRequest(request,routeAction='fiJW'){
  if(!fiJWAuthContext)throw Error('Sesi Fi belum disahkan.');
  const user=fiJWAuthContext.auth.currentUser;
  if(!user||user.uid!==fiJWAuthContext.uid)throw Error('Sesi Fi berubah. Buka semula modul.');
  const idToken=await user.getIdToken();
  const nonce='fijw-'+(window.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2));
  const data={action:routeAction,jwAction:String(request.action||''),request,idToken,nonce};
  return new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe');frame.name='fi-jw-'+nonce;frame.hidden=true;
    frame.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin');
    const form=document.createElement('form');form.method='POST';form.action=fiJWApiUrl();form.target=frame.name;form.hidden=true;
    const field=document.createElement('input');field.type='hidden';field.name='payload';field.value=JSON.stringify(data);form.appendChild(field);
    // Status/permulaan mesti gagal dengan mesej jelas; Jana/Shuffle boleh mengambil masa lebih lama.
    const timeoutMs = ['fiJWStatus','fiBackendHealth','getManualV2Data','getJWConstraints','getJadualWaktuHasil'].includes(String(request.action||'')) ? 60000 : 360000;
    let done=false;const timeout=setTimeout(()=>settle(Error('Tiada respons Fi-Sync bagi tindakan '+String(request.action||'')+'. Semak URL deployment dan Apps Script Executions.')),timeoutMs);
    function cleanup(){clearTimeout(timeout);window.removeEventListener('message',onMessage);frame.remove();form.remove();}
    function settle(err,result){if(done)return;done=true;cleanup();err?reject(err):resolve(result);}
    function onMessage(event){
      if(!fiJWTrustedOrigin(event.origin))return;
      const msg=event.data;
      if(msg?.channel!=='semakmur-fi-doc-v1'||msg.nonce!==nonce)return;
      if(msg.ok!==true){
        const raw=String(msg.error||'Permintaan Fi ditolak.');
        // Kod ralat ini datang daripada router Fi-Sync sebelum fiJWHandle_ dipanggil.
        const message=/^Tindakan tidak disokong\.?$/i.test(raw.trim())
          ? 'Deployment Fi-Sync ini tidak mengenali tindakan '+routeAction+'. URL yang digunakan: '+fiJWApiUrl()+'. Semak terlebih dahulu versi /exec pada URL tersebut.'
          : raw;
        return settle(Error(message));
      }
      settle(null,msg);
    }
    window.addEventListener('message',onMessage);
    document.body.append(frame,form);form.submit();
  });
}

function fiJWMessageParent(type,message){
  if(window.parent===window)return;
  try{window.parent.postMessage({type,message:String(message||'')},location.origin);}catch(_e){}
}


    let STATE_GRID_MASA = [];
    let STATE_SUBJEK = [];
    let JW_AGIHAN_SUBJEK = []; // Kekalkan paparan Agihan Lama sehingga migrasi Agihan V3.
    let STATE_AGIHAN = [];
    let STATE_AGIHAN_GURU = [];
    let STATE_GURU_CONSTRAINT = [];
    let STATE_HASIL_JADUAL = [];

    // Prestasi frontend agihan: kemas kini lokal pantas; simpan Sheet hanya melalui butang Simpan.
    let JW_AGIHAN_REVISION = 0;
    let JW_AGIHAN_SAVING = false;
    let JW_COVERAGE_TIMER = null;

    let LAST_GRID_HARI = 'Isnin';

    let ALL_STAF = [];
    let ALL_LOKASI = [];
    let ALL_MASTER_SUBJEK_LIST = [];

    window.currentOpenDropdownIdx = null;

    const SCRIPT_TARGET_URL = (typeof WEB_APP_URL !== 'undefined' && WEB_APP_URL) 
      ? WEB_APP_URL 
      : 'https://script.google.com/macros/s/AKfycbzjOd3r_56-OkWFiYEyTWhyYdoEbA6MXi5fgfIMDIRHRDVe3hzNHxjYUuitWSX_04hL/exec';

    // Paparan sambutan sudah kelihatan sebelum JavaScript ini berjalan.
    // Kedua-dua bacaan awal dilakukan serentak supaya portal boleh dibuka lebih cepat.
    let JW_HASIL_VIEW_RENDERED = false;
    let JW_HASIL_FETCH_COUNTER = 0;
    let JW_BUSY_TIMETABLE = false;
    let JW_LOADER_HIDE_TIMER = null;
    let JW_LOADER_TIP_TIMER = null;
    let JW_LOADER_ACTIVE_MODE = 'startup';
    let JW_LOADER_SESSION = 0;

    window.addEventListener('DOMContentLoaded', async () => {
      // Sambungan Fi-Sync sahaja — kod fungsi jadual asal tidak diubah.
      try {
        await fiJWEnsureAccess();
        await initialiseJWPortal();
      } catch (error) {
        console.error('Sambungan Fi-JadualWaktu:', error);
        hideLoader();
        fiJWMessageParent('semakmur-fi-jw-error', error && error.message || error);
        Swal.fire({icon:'error',title:'Jadual Waktu tidak dapat dibuka',
          text:String(error && error.message || error),confirmButtonText:'Faham'});
      }

      document.addEventListener('click', function(e) {
        if (!e.target.closest('.class-dropdown-container')) {
          document.querySelectorAll('[id^="ddClassList_"]').forEach(el => {
            if (!el.classList.contains('hidden')) {
              const idx = parseInt(el.id.replace('ddClassList_', ''), 10);
              saveAndCloseMultiSelectDropdown(idx);
            }
          });
        }
      });
    });

    function showLoader(txt = 'Menyediakan paparan…', mode = 'general') {
      const loader = document.getElementById('global-loader');
      if (!loader) return;
      JW_LOADER_SESSION++;
      JW_LOADER_ACTIVE_MODE = mode;
      if (JW_LOADER_HIDE_TIMER) { clearTimeout(JW_LOADER_HIDE_TIMER); JW_LOADER_HIDE_TIMER = null; }
      if (JW_LOADER_TIP_TIMER) { clearInterval(JW_LOADER_TIP_TIMER); JW_LOADER_TIP_TIMER = null; }
      const title = document.getElementById('loader-title');
      const textEl = document.getElementById('loader-text');
      const eyebrow = document.getElementById('loader-eyebrow');
      const footnote = document.getElementById('loader-footnote');
      const config = {
        startup: {title:'Selamat datang', eyebrow:'Membuka ruang kerja',
          text:'Menyediakan maklumat jadual waktu untuk paparan anda.', foot:'Pengurusan jadual waktu sekolah',
          tips:['Memastikan maklumat terkini tersedia untuk anda.','Paparan akan dibuka secara automatik apabila sedia.']},
        refresh: {title:'Menyegarkan paparan', eyebrow:'Mengemas kini paparan',
          text:'Sedang mendapatkan maklumat terkini.', foot:'Perubahan terkini akan dipaparkan',
          tips:['Ruang kerja sedang dikemas kini.','Paparan akan kembali sebaik sahaja sedia.']},
        generate: {title:'Menyusun jadual waktu', eyebrow:'Penjanaan sedang berjalan',
          text:'Sedang membina susunan jadual waktu untuk sekolah anda.', foot:'Jadual akan dipaparkan apabila siap',
          tips:['Penyusunan jadual mengambil kira keperluan guru dan kelas.','Jadual akan dibuka secara automatik selepas penjanaan.']},
        shuffle: {title:'Mencari susunan baharu', eyebrow:'Variasi jadual waktu',
          text:'Sedang menyediakan pilihan jadual alternatif.', foot:'Jadual semasa dikekalkan sehingga susunan baharu siap',
          tips:['Memastikan susunan baharu sesuai dengan keperluan sekolah.','Jadual asal kekal selamat jika tiada alternatif yang sesuai.']},
        save: {title:'Menyimpan perubahan', eyebrow:'Mengemas kini maklumat',
          text:'Perubahan anda sedang disimpan.', foot:'Ruang kerja anda akan kembali sebentar lagi',
          tips:['Pastikan tetingkap ini kekal terbuka sehingga selesai.']},
        general: {title:'Sedang menyediakan paparan', eyebrow:'Sila sebentar',
          text:txt, foot:'Ruang kerja sekolah',tips:['Paparan akan dibuka secara automatik apabila sedia.']}
      }[mode] || null;
      const info = config || {title:'Sedang menyediakan paparan',eyebrow:'Sila sebentar',text:txt,foot:'Ruang kerja sekolah',tips:[]};
      if (title) title.textContent = info.title;
      if (textEl) textEl.textContent = info.text;
      if (eyebrow) eyebrow.textContent = info.eyebrow;
      if (footnote) footnote.textContent = info.foot;
      loader.classList.remove('hidden', 'jw-loader-leaving');
      loader.setAttribute('aria-busy','true');
      const currentSession = JW_LOADER_SESSION;
      let tipIndex = 0;
      if (info.tips && info.tips.length) {
        JW_LOADER_TIP_TIMER = setInterval(() => {
          if (currentSession !== JW_LOADER_SESSION) return;
          if (textEl) textEl.textContent = info.tips[tipIndex++ % info.tips.length];
        }, 5200);
      }
    }

    function hideLoader() {
      const loader = document.getElementById('global-loader');
      if (!loader) return;
      JW_LOADER_SESSION++;
      if (JW_LOADER_TIP_TIMER) { clearInterval(JW_LOADER_TIP_TIMER); JW_LOADER_TIP_TIMER = null; }
      loader.classList.add('jw-loader-leaving');
      loader.setAttribute('aria-busy','false');
      if (JW_LOADER_HIDE_TIMER) clearTimeout(JW_LOADER_HIDE_TIMER);
      JW_LOADER_HIDE_TIMER = setTimeout(() => {
        loader.classList.add('hidden');
        JW_LOADER_HIDE_TIMER = null;
      }, 460);
    }

    // Mengelakkan paparan kosong ketika pertama kali dibuka. Maklumat
    // staf dan tetapan jadual diperoleh secara selari, tetapi digabung
    // hanya setelah kedua-duanya selesai.
    // V3.1B: initial read uses only active CORE and official LIVE endpoints.
    let JW_BOOT_BUSY=false, JW_BOOT_READY=false, JW_SUBJECT_READY=false;
    let JW_LIVE_ACTIVE=null, JW_LIVE_ACTIVE_ID='', JW_LIVE_TODAY='';
    function jwBootInert(on){const main=document.querySelector('.jw-module-main');if(main)main.inert=on;document.querySelectorAll('.jw-module-tab').forEach(b=>b.disabled=on);}
    async function jwLiveReadActive(){
      const status=await jwAgihanRequest('fiJWLiveStatus',{},false);
      if(!Array.isArray(status.versions)||!Object.prototype.hasOwnProperty.call(status,'active'))throw Error('Respons status LIVE tidak sah.');
      if(!status.active)return {status,out:null};
      const out=await jwAgihanRequest('fiJWLiveGet',{id:status.active},false);
      if(out.version?.Jadual_ID!==status.active||out.version.Status!=='DITERBITKAN'||!out.result?.printGrid?.length)throw Error('Versi LIVE aktif tidak sepadan.');
      jw3SlotRows(out.result);
      return {status,out};
    }
    function jwLiveSetActive(info){
      JW_LIVE_ACTIVE_ID=info.status.active||'';JW_LIVE_TODAY=info.status.today||'';
      JW_LIVE_ACTIVE=info.out?{...info.out.result,liveVersion:info.out.version}:null;
      JW_LIVE_VIEW=JW_LIVE_ACTIVE;
      if(JW_LIVE_VIEW)jw3RenderResult();else document.getElementById('jw3Output')?.replaceChildren();
      jwLiveUpdateStatus();renderJadualHasilView();jw3RunButton();
    }
    async function initialiseJWPortal(mode='startup') {
      if(JW_BOOT_BUSY||JW3_BUSY||JW_LIVE_BUSY)return;
      JW_BOOT_BUSY=true;JW_BOOT_READY=false;jwBootInert(true);showLoader('',mode);
      try {
        const staff=await postToBackend({action:'getManualV2Data'});
        if(!staff?.success||!Array.isArray(staff.staf))throw Error('Direktori staf tidak dapat dibaca.');
        ALL_STAF=staff.staf;ALL_LOKASI=staff.lokasi||[];ALL_MASTER_SUBJEK_LIST=staff.subjek||[];
        const progress=document.getElementById('loader-footnote');
        if(progress)progress.textContent='Memuatkan Grid, Subjek, Agihan, Kekangan dan jadual rasmi…';
        JW_GRID_LOADED=false;JW_SUBJECT_READY=false;JW_AGIHAN_CORE.loaded=false;JW_CON_F1.loaded=false;
        // No nested loader; wait for all requests (even failures) before releasing the overlay.
        const tasks=[['Grid Masa',()=>jwGridStudioLoad(true)],['Tetapan Subjek',()=>jwSubjectStudioLoad(true)],['Agihan Guru',()=>jwAgihanReload(true,true)],['Had & Pelepasan',()=>jwConLoad(true,true)],['Jadual LIVE',()=>jwLiveReadActive()]];
        const results=await Promise.allSettled(tasks.map(([,run])=>Promise.resolve().then(run)));
        const failed=results.map((r,i)=>r.status==='rejected'?tasks[i][0]+': '+String(r.reason?.message||r.reason):'').filter(Boolean);
        if(failed.length)throw Error(failed.join(' | '));
        if(!JW_GRID_LOADED||!JW_SUBJECT_READY||!JW_AGIHAN_CORE.loaded||!JW_CON_F1.loaded)throw Error('Sebahagian CORE belum sedia.');
        const info=results[4].value;
        JW3_RESULT=null;JW3_IMPORTED_PRINT=null;
        JW_BOOT_READY=true;jwLiveSetActive(info);JW_HASIL_VIEW_RENDERED=true;const note=document.getElementById('jwCoreRefreshNote');if(note)note.hidden=true;const refresh=document.querySelector('.jw-header-refresh');if(refresh){refresh.style.outline='';refresh.title='';}
        jwBootInert(false);fiJWMessageParent('semakmur-fi-jw-ready');
      }catch(error){
        console.error('V3.1B pembukaan CORE/LIVE:',error);
        JW_BOOT_READY=false;JW_LIVE_VIEW=null;JW_LIVE_ACTIVE=null;JW3_RESULT=null;
        document.getElementById('jw3Output')?.replaceChildren();document.getElementById('containerHasilJadualView')?.replaceChildren();
        setJwHasilStatus('error');jwLiveUpdateStatus();
        fiJWMessageParent('semakmur-fi-jw-error',String(error.message||error));
        hideLoader();await Swal.fire({icon:'error',title:'Maklumat rasmi belum tersedia',text:String(error.message||error)+' · Klik Muat Semula untuk cuba lagi. Jadual rujukan lama tidak digunakan.',confirmButtonText:'Faham'});
      }finally{JW_BOOT_BUSY=false;hideLoader();}
    }

    async function postToBackend(payload) {
      // Format request asal dikekalkan; cuma laluan HTTP kini melalui Fi-Sync.
      const result=await fiJWRequest(payload);
      if(result?.success&&['fiJWGridActiveApply','fiJWSubjectCoreSave','fiJWSubjectActiveSelect','fiJWAgihanCoreActivate'].includes(payload.action))await jwCoreRefreshDependents(payload.action);
      return result;
    }
    async function jwCoreRefreshDependents(action){
      if(!JW_BOOT_READY)return;
      const jobs=[],refreshAgihan=['fiJWSubjectCoreSave','fiJWSubjectActiveSelect'].includes(action);let skipped=false;
      if(refreshAgihan){if(JW_AGIHAN_CORE.dirty||JW_AGIHAN_CORE.loading)skipped=true;else jobs.push(jwAgihanReload(true,true));}
      if(JW_CON_F1.dirty||JW_CON_F1.loading)skipped=true;else jobs.push(jwConLoad(true,true));
      const result=await Promise.allSettled(jobs);if(skipped||result.some(x=>x.status==='rejected'))jwCoreNeedsRefresh();
    }
    function jwCoreNeedsRefresh(){const el=document.querySelector('.jw-header-refresh');if(el){el.title='CORE aktif berubah. Muat Semula untuk menyelaraskan semua panel.';el.style.outline='2px solid #d97706';}const note=document.getElementById('jwCoreRefreshNote');if(note){note.hidden=false;note.textContent='CORE aktif berubah. Klik Muat Semula sebelum menyunting panel yang bergantung pada perubahan ini.';}}

    // Pengekalan nama fungsi untuk keserasian kod asal; navigasi kini menggunakan tab.
    function toggleSidebar() {
      const tabs = document.getElementById('jw-main-tablist');
      if (tabs) tabs.scrollIntoView({block:'nearest',behavior:'smooth'});
    }

    function switchView(viewId, btnEl) {
      const views = ['viewGridMasa', 'viewMasterSubjek', 'viewAgihanTugas', 'viewGuruConstraints', 'viewGeneratorConsole'];
      // Abaikan ID yang tidak wujud: tiada perubahan pada panel lain.
      if (!views.includes(viewId) || !JW_BOOT_READY || JW_BOOT_BUSY) return;
      views.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.toggle('hidden',id !== viewId); el.setAttribute('aria-hidden', id === viewId ? 'false' : 'true'); }
      });

      const currentTab = btnEl?.matches?.('[data-jw-view="'+viewId+'"]') ? btnEl
        : document.querySelector('.jw-module-tab[data-jw-view="'+viewId+'"]');
      document.querySelectorAll('.jw-module-tab').forEach(b => {
        const isActive = b === currentTab;
        b.classList.toggle('active',isActive);
        b.classList.remove('bg-brand-600','text-white');
        b.setAttribute('aria-selected',isActive ? 'true' : 'false');
        b.tabIndex = isActive ? 0 : -1;
      });
      const labels = {viewGridMasa:'Grid Masa',viewMasterSubjek:'Tetapan Subjek',
        viewAgihanTugas:'Agihan Guru',viewGuruConstraints:'Had & Pelepasan',
        viewGeneratorConsole:'Jana & Jadual Penuh'};
      const bread = document.getElementById('txtBreadcrumb');
      if (bread) bread.textContent = labels[viewId];
      // All five panels are prepared during startup. Switching is a local DOM operation only.
    }

    // Navigasi papan kekunci sama seperti komponen tab: anak panah kiri/kanan, Home, End.
    document.addEventListener('keydown', function(event) {
      const tab = event.target.closest?.('.jw-module-tab');
      if (!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      const items = [...document.querySelectorAll('.jw-module-tab')];
      const at = items.indexOf(tab);
      if (at < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (at + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
      items[next].focus();
      switchView(items[next].dataset.jwView,items[next]);
    });

    async function loadMasterPangkalanData() {
      try {
        const res = await postToBackend({ action: 'getManualV2Data' });
        if (res && res.success) {
          ALL_STAF = res.staf || [];
          ALL_LOKASI = res.lokasi || [];
          ALL_MASTER_SUBJEK_LIST = res.subjek || [];
        }
      } catch (err) {
        console.warn('Gagal memuatkan Master Data:', err);
      }
    }

    function getSortedStafList() {
      const guruAktif = ALL_STAF.filter(s => 
        String(s.Kategori_Staf || '').toLowerCase() !== 'akp' && 
        String(s.Status || 'Aktif').toLowerCase() === 'aktif'
      );

      function getRank(staf) {
        const text = (String(staf.Jawatan || '') + ' ' + String(staf.Nama_Penuh || '') + ' ' + String(staf.Peranan || '')).toLowerCase();
        if (text.includes('guru besar') || text.includes(' gb ') || text === 'gb') return 1;
        if (text.includes('gpk pentadbiran') || text.includes('gpk 1') || text.includes('gpk1') || text.includes('penolong kanan pentadbiran')) return 2;
        if (text.includes('gpk hem') || text.includes('hal ehwal murid') || text.includes('penolong kanan hem')) return 3;
        if (text.includes('gpk koku') || text.includes('kokurikulam') || text.includes('penolong kanan koku')) return 4;
        if (text.includes('praktikal') || text.includes('praktik') || text.includes('pelatih')) return 6;
        return 5;
      }

      return guruAktif.sort((a, b) => {
        const rankA = getRank(a);
        const rankB = getRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return String(a.Nama_Penuh || '').localeCompare(String(b.Nama_Penuh || ''), 'ms');
      });
    }

    function getSamaran(namaFull) {
      if (!namaFull) return '';
      const found = ALL_STAF.find(s => (s.Nama_Penuh || s.Nama_Guru || s.Nama) === namaFull);
      if (found && (found.Nama_Samaran || found.Samaran)) {
        return found.Nama_Samaran || found.Samaran;
      }
      return namaFull.split(' ')[0];
    }

    function getPrefixHari(hari) {
      switch (String(hari).toLowerCase()) {
        case 'isnin': return 'ISN';
        case 'selasa': return 'SEL';
        case 'rabu': return 'RAB';
        case 'khamis': return 'KHM';
        case 'jumaat': return 'JUM';
        default: return 'SLT';
      }
    }

    function formatTimeString(val) {
      if (!val) return '';
      let str = String(val).trim();
      if (str.includes('T')) {
        let timePart = str.split('T')[1];
        if (timePart) {
          let parts = timePart.split(':');
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
      }
      let match = str.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
      }
      return str;
    }

    function calculateJamTamat(jamMula, jenisSlot) {
      jamMula = formatTimeString(jamMula);
      if (!jamMula) return '';
      let parts = jamMula.split(':');
      let h = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);

      if (isNaN(h) || isNaN(m)) return '';

      let duration = 30;
      const slotStr = String(jenisSlot || '');

      if (slotStr.includes('Rehat') || slotStr.includes('20')) {
        duration = 20;
      } else if (slotStr.includes('PEMK') || slotStr.includes('15') || slotStr.includes('Karakter')) {
        duration = 15;
      } else if (slotStr.includes('Double') || slotStr.includes('60')) {
        duration = 60;
      } else {
        duration = 30;
      }

      m += duration;

      if (m >= 60) {
        h += Math.floor(m / 60);
        m = m % 60;
      }

      let hh = String(h).padStart(2, '0');
      let mm = String(m).padStart(2, '0');
      return `${hh}:${mm}`;
    }

    async function jalankanInitDatabase() {
      showLoader('', 'save');
      try {
        const res = await postToBackend({ action: 'initJadualDatabase' });
        hideLoader();
        if (res && res.success) {
          Swal.fire('Berjaya', 'Persediaan sistem telah selesai.', 'success');
          loadAllJWData();
        } else {
          console.warn('Persediaan sistem tidak berjaya:',res?.error);
          Swal.fire('Tidak berjaya', 'Persediaan sistem belum selesai. Sila cuba lagi.', 'error');
        }
      } catch (err) {
        hideLoader();
        console.error(err);
        Swal.fire('Sambungan terganggu', 'Sila cuba semula selepas beberapa ketika.', 'error');
      }
    }

    function applyJWConstraintsData(res) {
      STATE_GRID_MASA = res.timeGrid || [];
      if(JW_GRID_MODE==='legacy')JW_GRID_DIRTY=false;
      JW_AGIHAN_SUBJEK = res.tetapanSubjek || [];
      STATE_SUBJEK = JSON.parse(JSON.stringify(JW_AGIHAN_SUBJEK));
      STATE_AGIHAN = res.agihanTugas || [];
      STATE_GURU_CONSTRAINT = res.guruConstraints || [];
      parseFlatAgihanToGuruView();
      JW_AGIHAN_REVISION = 0;
      setAgihanSaveStatus('saved');
      renderGridMasaTable();
      renderSubjekTable();
      void jwSubjectStudioLoad();
      renderAgihanGuruMatrix();
      renderGuruConstraintTable();
    }

    async function loadAllJWData() {
      if(JW_BOOT_BUSY||JW3_BUSY||JW_LIVE_BUSY||JW_AGIHAN_CORE.loading||JW_CON_F1.loading||JW_SUBJECT_LOADING)return;
      if(JW_BOOT_READY && !await jwAgihanConfirm('Muat semula semua data aktif?', 'Perubahan editor atau calon jadual yang belum disimpan akan dilepaskan. Jadual rasmi dan semua versi tersimpan kekal.', 'Muat Semula'))return;
      // Confirmed refresh must not prompt inside the individual loaders.
      JW_AGIHAN_CORE.dirty=false;JW_CON_F1.dirty=false;
      await initialiseJWPortal('refresh');
    }


    // =================== GRID MASA PINTAR V2 — HANYA TETAPAN GRID ===================
    // Modul lain, solver Jana/Shuffle dan sumber jadual asal tidak diubah.
    let JW_GRID_CTRL = {start:'07:40',startByDay:{},gapMinutes:30,types:[
      {id:'PDP',name:'PdPc',duration:30,counts:true,active:true,locked:true,legacy:'PdP (30 Minit)'},
      {id:'REHAT',name:'Rehat',duration:20,counts:false,active:true,locked:true,legacy:'Rehat (20 Minit)'},
      {id:'PERHIMPUNAN',name:'Perhimpunan',duration:30,counts:true,active:true,locked:true,legacy:'Perhimpunan (30 Minit)'},
      {id:'KARAKTER',name:'Pembentukan Karakter',duration:15,counts:true,active:true,locked:true,legacy:'PEMK (15 Minit)'}
    ]};
    let JW_GRID_WORK_CTRL = jwGridClone(JW_GRID_CTRL); // snapshot milik grid sedang dilihat/diedit
    let JW_GRID_CTRL_VERSION = 0;
    let JW_GRID_CTRL_SAVED = jwGridClone(JW_GRID_CTRL); // Controller CORE terakhir yang sudah disimpan
    let JW_GRID_PRESETS = [];
    let JW_GRID_SELECTED = null; // Pilihan persediaan (bukan jadual hasil)
    let JW_GRID_VIEW_ID = ''; // ID snapshot yang sedang dipaparkan
    let JW_GRID_MODE = 'legacy';  // grid aktif asal: lihat sahaja sehingga buat draf baharu
    let JW_GRID_SOURCE = 'ASAL_BACA_SAHAJA';
    let JW_GRID_DIRTY = false;
    let JW_GRID_LOADED = false;
    const JW_GRID_SYSTEM_TYPES = ['PDP','REHAT','PERHIMPUNAN','KARAKTER'];
    const JW_GRID_DAYS = ['Isnin','Selasa','Rabu','Khamis','Jumaat'];
    const JW_GRID_COHORTS = [
      {value:'PRA',label:'Prasekolah',years:[0]},
      {value:'ALL',label:'Semua Tahun 1–6',years:[1,2,3,4,5,6]},
      {value:'Y1',label:'Tahun 1 sahaja',years:[1]},
      {value:'Y23',label:'Tahun 2–3',years:[2,3]},
      {value:'Y2',label:'Tahun 2 sahaja',years:[2]},
      {value:'Y3',label:'Tahun 3 sahaja',years:[3]},
      {value:'Y4',label:'Tahun 4 sahaja',years:[4]},
      {value:'Y5',label:'Tahun 5 sahaja',years:[5]},
      {value:'Y6',label:'Tahun 6 sahaja',years:[6]},
      {value:'T1',label:'Tahap 1 (Tahun 1–3)',years:[1,2,3]},
      {value:'T2',label:'Tahap 2 (Tahun 4–6)',years:[4,5,6]},
      {value:'Y26',label:'Tahun 2–6',years:[2,3,4,5,6]}
    ];
    const JW_GRID_LEGACY_SCOPES = {
      'Prasekolah':'PRA','Pra Sekolah':'PRA',
      'Semua (KSSR)':'ALL','Tahap 1 & 2':'ALL','Tahap 1 (KSSR)':'T1',
      'Tahap 2 (KSSR)':'T2','Tahun 1 (KP27)':'Y1','Tahap 1 (KP27)':'T1'
    };
    function jwGridEsc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
    function jwGridClone(v){return JSON.parse(JSON.stringify(v));}
    function jwGridType(row){
      const s=String(row.Jenis_Slot||'').toLowerCase();
      return JW_GRID_WORK_CTRL.types.find(t=>t.id===row.Jenis_ID)||
        JW_GRID_WORK_CTRL.types.find(t=>String(t.legacy||'').toLowerCase()===s||t.name.toLowerCase()===s)||
        JW_GRID_WORK_CTRL.types.find(t=>{
          if(t.id==='REHAT')return /rehat/.test(s);
          if(t.id==='KARAKTER')return /karakter|pemk/.test(s);
          if(t.id==='PERHIMPUNAN')return /perhimpunan/.test(s);
          if(t.id==='PDP')return /pdp|pdpc/.test(s);
          return false;
        })||JW_GRID_WORK_CTRL.types[0];
    }
    function jwGridYears(scope){return (JW_GRID_COHORTS.find(c=>c.value===(JW_GRID_LEGACY_SCOPES[scope]||scope))||JW_GRID_COHORTS.find(c=>c.value==='ALL')).years;}
    function jwGridClock(time){const [h,m]=String(time||'').split(':').map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:NaN;}
    function jwGridTime(n){return Number.isFinite(n)&&n>=0&&n<1440?`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`:'—';}
    function jwGridStart(day){return JW_GRID_WORK_CTRL.startByDay?.[day]||JW_GRID_WORK_CTRL.start||'07:40';}
    function jwGridColorMessage(message,isError){
      const el=document.getElementById('jwGridStateMessage');if(!el)return;
      el.textContent=message;el.className='jw-grid-message '+(isError?'jw-grid-message--error':'jw-grid-message--quiet');
    }
    function jwGridReadController(){
      const start=document.getElementById('jwCtrlStart');if(start?.value)JW_GRID_CTRL.start=start.value;
      const gap=document.getElementById('jwCtrlGap');if(gap?.value)JW_GRID_CTRL.gapMinutes=Number(gap.value);
      JW_GRID_DAYS.forEach(day=>{
        const v=document.getElementById('jwCtrlStart_'+day)?.value||'';
        if(v)JW_GRID_CTRL.startByDay[day]=v;
        else delete JW_GRID_CTRL.startByDay[day];
      });
      JW_GRID_CTRL.types.forEach((t,i)=>{
        const row=document.querySelector(`#jwCtrlTypeRows [data-idx="${i}"]`);if(!row)return;
        t.name=row.querySelector('[data-ctrl="name"]').value.trim();
        t.duration=Number(row.querySelector('[data-ctrl="duration"]').value);
        t.counts=row.querySelector('[data-ctrl="counts"]').checked;
        t.active=row.querySelector('[data-ctrl="active"]').checked;
        t.locked=true; // tempoh terkunci dalam grid, controller sahaja boleh ubah
        // Nama/kategori asal dipertahankan untuk pembaca generator lama.
        const baseLabel=t.id==='PDP'?'PdPc':t.id==='REHAT'?'Rehat':t.id==='PERHIMPUNAN'?'Perhimpunan':t.id==='KARAKTER'?'PEMK — Pembentukan Karakter':t.name;
        t.legacy=`${baseLabel} (${t.duration} Minit)`;
      });
    }
    function jwGridRenderController(){
      const c=JW_GRID_CTRL;
      document.getElementById('jwCtrlStart').value=c.start||'07:40';
      document.getElementById('jwCtrlGap').value=c.gapMinutes||30;
      JW_GRID_DAYS.forEach(day=>{const el=document.getElementById('jwCtrlStart_'+day);if(el)el.value=c.startByDay?.[day]||'';});
      const body=document.getElementById('jwCtrlTypeRows');if(!body)return;
      body.innerHTML=c.types.map((t,i)=>`<tr data-idx="${i}">
        <td class="jw-grid-td"><span class="jw-grid-code">${jwGridEsc(t.id)}</span></td>
        <td class="jw-grid-td"><input data-ctrl="name" type="text" maxlength="80" value="${jwGridEsc(t.name)}" aria-label="Nama jenis slot ${jwGridEsc(t.id)}" class="jw-grid-input" /></td>
        <td class="jw-grid-td"><input data-ctrl="duration" type="number" min="5" max="240" step="1" value="${t.duration}" class="jw-grid-input jw-grid-input--short" aria-label="Tempoh ${jwGridEsc(t.name)} dalam minit" /></td>
        <td class="jw-grid-td jw-grid-center"><input data-ctrl="counts" type="checkbox" ${t.counts?'checked':''} aria-label="Kira nombor waktu ${jwGridEsc(t.name)}" /></td>
        <td class="jw-grid-td jw-grid-center"><input data-ctrl="active" type="checkbox" ${t.active?'checked':''} aria-label="Jenis ${jwGridEsc(t.name)} aktif" /></td>
        <td class="jw-grid-td jw-grid-center">${JW_GRID_SYSTEM_TYPES.includes(t.id)?'<i class="fa-solid fa-lock text-slate-400" title="Kategori sistem tidak boleh dipadam"></i>':`<button type="button" class="jw-grid-icon jw-grid-icon--delete" onclick="jwGridDeleteType(${i})" title="Padam jenis slot" aria-label="Padam jenis slot ${jwGridEsc(t.name)}"><i class="fa-solid fa-trash"></i></button>`}</td>
      </tr>`).join('');
      jwGridRenderPresets();
    }
    function jwGridNewType(){
      try{jwGridReadController();}catch(e){return Swal.fire('Controller',e.message,'error');}
      const id='KATEGORI_'+String(Date.now()).slice(-9);
      JW_GRID_CTRL.types.push({id,name:'Aktiviti Baharu',duration:30,counts:false,active:true,locked:true,legacy:'Aktiviti Baharu'});
      jwGridRenderController();
      jwGridColorMessage('Jenis slot baharu ditambah pada draf Controller. Klik Simpan Controller untuk merekodkannya.');
    }
    async function jwGridDeleteType(index){
      try{jwGridReadController();}catch(e){return Swal.fire('Controller',e.message,'error');}
      const item=JW_GRID_CTRL.types[index];if(!item)return;
      if(JW_GRID_SYSTEM_TYPES.includes(item.id))return Swal.fire('Kategori asas','Jenis slot sistem tidak boleh dipadam. Nyahaktifkan jika perlu.','info');
      if(STATE_GRID_MASA.some(r=>r.Jenis_ID===item.id))return Swal.fire('Jenis sedang digunakan','Kategori ini digunakan oleh grid yang sedang dipaparkan. Tukar jenis slot itu dahulu.','warning');
      const q=await Swal.fire({title:'Padam jenis slot?',html:'<b>'+jwGridEsc(item.name)+'</b><p class="mt-2 text-sm">Jika kategori pernah digunakan dalam Grid tersimpan, backend tidak membenarkan pemadaman. Nyahaktifkan untuk menyimpan sejarah.</p>',icon:'warning',showCancelButton:true,confirmButtonText:'Padam daripada Controller',cancelButtonText:'Batal'});
      if(!q.isConfirmed)return;
      JW_GRID_CTRL.types.splice(index,1);jwGridRenderController();
      jwGridColorMessage('Jenis slot dibuang daripada borang Controller. Tekan Simpan Controller untuk mengesahkannya.');
    }
    function jwGridSetTab(tab){
      if(tab!=='controller')try{jwGridReadController();}catch(e){jwGridColorMessage(e.message,true);}
      document.querySelectorAll('.jw-grid-tab').forEach(el=>el.classList.toggle('jw-grid-tab--active',el.dataset.tab===tab));
      ['controller','grid','history'].forEach(id=>document.getElementById('jwGridPanel_'+id)?.classList.toggle('hidden',tab!==id));
    }
    async function jwGridStudioLoad(preload=false){
      try{
        const res=await postToBackend({action:'fiJWGridStudioGet'});
        if(!res?.success)throw Error(res?.error||'Studio Grid tidak tersedia');
        JW_GRID_CTRL=res.controller;JW_GRID_CTRL_SAVED=jwGridClone(res.controller);JW_GRID_WORK_CTRL=jwGridClone(res.controller);JW_GRID_CTRL_VERSION=res.controllerVersion||0;
        JW_GRID_PRESETS=res.presets||[];JW_GRID_SOURCE=res.source;
        JW_GRID_SELECTED=res.selected||null;
        if(res.selected&&(!Array.isArray(res.selectedGrid)||!res.selectedController))throw Error('Snapshot Grid aktif tidak lengkap.');
        JW_GRID_LOADED=true;
        const src=document.getElementById('jwGridSourceBadge');if(src)src.textContent=res.source==='GOOGLE_SHEETS_TERAS'?'Sumber: Sheets CORE':res.source==='SALINAN_UAT'?'Sumber: UAT':'Sumber lama · jalankan Setup CORE';
        if(res.selected && Array.isArray(res.selectedGrid) && res.selectedController){
          STATE_GRID_MASA=res.selectedGrid.map(r=>({...r,__legacy:true}));
          JW_GRID_WORK_CTRL=jwGridClone(res.selectedController);
          JW_GRID_VIEW_ID=res.selected.id;
          JW_GRID_MODE='selected';JW_GRID_DIRTY=false;
        }else if(preload||JW_GRID_MODE!=='draft'&&JW_GRID_MODE!=='recall'){
          STATE_GRID_MASA=[];JW_GRID_VIEW_ID='';JW_GRID_MODE='legacy';JW_GRID_DIRTY=false;
        }
        jwGridRenderController();jwGridRenderMode();renderGridMasaTable();
        if(res.selectionWarning)jwGridColorMessage(res.selectionWarning,true);
      }catch(e){JW_GRID_LOADED=false;console.warn('Studio Grid:',e);jwGridColorMessage('Studio Grid tidak dapat dibaca: '+e.message,true);if(preload)throw e;}
    }
    function jwGridRenderMode(){
      const el=document.getElementById('jwGridWorkingLabel');
      if(el)el.textContent=JW_GRID_MODE==='selected'?'Grid persediaan aktif: '+(JW_GRID_SELECTED?.name||'Versi tersimpan')+' · klik Edit Grid untuk ubah':
        JW_GRID_MODE==='legacy'?'Belum ada Grid persediaan aktif':JW_GRID_MODE==='draft'?'Grid baharu · belum disimpan':'Grid dipanggil · boleh edit dan simpan sebagai versi baharu';
      const hint=document.getElementById('jwGridModeHint');
      if(hint)hint.textContent=JW_GRID_MODE==='selected'?'Klik Edit Grid untuk menghasilkan salinan baharu; perubahan hanya aktif apabila disimpan lalu diaktifkan.':
        JW_GRID_MODE==='legacy'?'Pilih Grid dalam sejarah atau klik Tambah Grid Masa. Jadual rasmi tidak berubah.':'ID slot dijana semasa simpan. Hanya kumpulan dan jenis slot perlu dipilih.';
      const active=document.getElementById('jwGridActiveChoice');
      if(active)active.textContent=JW_GRID_SELECTED?'Grid persediaan dipilih: '+JW_GRID_SELECTED.name:'Belum memilih Grid Persediaan Aktif';
      jwGridRenderPresets();
    }
    function jwGridRenderPresets(){
      const select=document.getElementById('jwGridPresetSelect');if(!select)return;
      const old=select.value;
      select.innerHTML='<option value="">— Pilih sejarah grid —</option>'+JW_GRID_PRESETS.map(p=>`<option value="${jwGridEsc(p.id)}">${p.id===JW_GRID_SELECTED?.id?'✓ AKTIF · ':''}${jwGridEsc(p.name)} · ${jwGridEsc(String(p.createdAt).slice(0,16))}</option>`).join('');
      if(JW_GRID_PRESETS.some(p=>p.id===old))select.value=old;
      const checked=document.getElementById('jwGridHistoryActiveCheck');
      if(checked)checked.textContent=JW_GRID_SELECTED?'✓ GRID AKTIF: '+JW_GRID_SELECTED.name:'Belum ada Grid Aktif';
      const qty=document.getElementById('jwGridPresetCount');if(qty)qty.textContent=String(JW_GRID_PRESETS.length);
    }
    function jwGridEnsureDraft(){if(JW_GRID_MODE==='legacy'||JW_GRID_MODE==='selected')throw Error('Grid yang dipilih tidak boleh diedit terus. Panggil semula sebagai draf daripada Sejarah dahulu.');}
    function jwGridNextCohort(day){
      const d=STATE_GRID_MASA.filter(r=>r.Hari===day);
      const cursor=[1,2,3,4,5,6].map(year=>({year,time:jwGridClock(jwGridStart(day))}));
      for(const r of d){for(const year of jwGridYears(r.Tahap).filter(y=>y>0))cursor[year-1].time=Math.max(cursor[year-1].time,jwGridClock(r.Jam_Tamat));}
      const first=Math.min(...cursor.map(x=>x.time));const available=cursor.filter(x=>x.time===first).map(x=>x.year);
      const found=JW_GRID_COHORTS.filter(c=>c.value!=='PRA'&&c.years.every(y=>available.includes(y)))
        .sort((a,b)=>b.years.length-a.years.length)[0];
      if(!found)throw Error('Tiada kohort tersedia untuk slot baharu.');
      return found.value;
    }
    function jwGridRecalculateDay(day){
      const start=jwGridClock(jwGridStart(day));
      if(!Number.isFinite(start))throw Error('Jam mula Controller tidak sah.');
      const cursors=Object.fromEntries([1,2,3,4,5,6].map(y=>[y,{minute:start,period:0}]));
      const rows=STATE_GRID_MASA.filter(r=>r.Hari===day);
      rows.forEach((r,i)=>{
        const type=jwGridType(r),years=jwGridYears(r.Tahap);
        if(years.includes(0)){
          const begin=jwGridClock(r.Jam_Mula||jwGridStart(day)),finish=begin+Number(type.duration);
          if(!Number.isInteger(begin)||begin<0||!Number.isInteger(finish)||finish>1439)throw Error('Jam mula/tamat Prasekolah tidak sah.');
          r.Jam_Mula=jwGridTime(begin);r.Jam_Tamat=jwGridTime(finish);r.Jenis_ID=type.id;r.Jenis_Slot=type.legacy||type.name;return;
        }
        const times=years.map(y=>cursors[y].minute);
        if(new Set(times).size!==1)throw Error('Baris '+(i+1)+' menggabungkan kohort yang sudah mempunyai masa berlainan. Asingkan kohort sebelum menyimpan.');
        const counts=years.map(y=>cursors[y].period);
        if(type.counts && new Set(counts).size!==1)throw Error('Nombor waktu kohort tidak selaras pada baris '+(i+1)+'. Asingkan kumpulan.');
        const begin=times[0],finish=begin+Number(type.duration);
        if(!Number.isInteger(finish)||finish>1439)throw Error('Masa melangkaui hari bagi '+day+'.');
        r.Jam_Mula=jwGridTime(begin);r.Jam_Tamat=jwGridTime(finish);
        r.No_Waktu=type.counts?String(counts[0]+1):'';
        r.Jenis_ID=type.id;r.Jenis_Slot=type.legacy||type.name;
        for(const y of years){cursors[y].minute=finish;if(type.counts)cursors[y].period++;}
      });
      let n=0,end=-1;rows.filter(r=>jwGridYears(r.Tahap).includes(0)).sort((a,b)=>jwGridClock(a.Jam_Mula)-jwGridClock(b.Jam_Mula)).forEach(r=>{
        if(jwGridClock(r.Jam_Mula)<end)throw Error('Slot Prasekolah bertindih pada '+day+'.');
        end=jwGridClock(r.Jam_Tamat);r.No_Waktu=jwGridType(r).counts?String(++n):'';
      });
    }
    function jwGridRecalculateAll(){for(const day of JW_GRID_DAYS)jwGridRecalculateDay(day);}
    function jwGridTypeOptions(row){
      const current=jwGridType(row).id;
      return JW_GRID_WORK_CTRL.types.filter(t=>t.active||t.id===current).map(t=>`<option value="${jwGridEsc(t.id)}" ${current===t.id?'selected':''}>${jwGridEsc(t.name)} (${t.duration} min)</option>`).join('');
    }
    function jwGridScopeOptions(scope){
      const v=JW_GRID_LEGACY_SCOPES[scope]||scope;
      return JW_GRID_COHORTS.map(c=>`<option value="${c.value}" ${v===c.value?'selected':''}>${jwGridEsc(c.label)}</option>`).join('');
    }
    function onHariGridMasaChange(){
      const el=document.getElementById('selHariGridMasa');if(!el)return;
      LAST_GRID_HARI=el.value;renderGridMasaTable();
    }
    function renderGridMasaTable(){
      const tbody=document.getElementById('tbodyGridMasa');if(!tbody)return;
      const day=document.getElementById('selHariGridMasa')?.value||LAST_GRID_HARI||'Isnin';
      const rows=STATE_GRID_MASA.filter(r=>r.Hari===day),edit=JW_GRID_MODE==='draft'||JW_GRID_MODE==='recall';
      const disabled=edit?'':'disabled';
      tbody.innerHTML=rows.map((r,i)=>`<tr class="jw-grid-row">
        <td class="jw-grid-td jw-grid-center jw-grid-muted">${i+1}</td>
        <td class="jw-grid-td"><select class="jw-grid-input" aria-label="Kumpulan murid baris ${i+1}" ${disabled} onchange="jwGridEditRow(${i},'Tahap',this.value)">${jwGridScopeOptions(r.Tahap)}</select></td>
        <td class="jw-grid-td jw-grid-center jw-grid-day">${jwGridEsc(day)}</td>
        <td class="jw-grid-td jw-grid-center">${r.No_Waktu===''||r.No_Waktu===0||String(r.No_Waktu)==='0'?'—':jwGridEsc(r.No_Waktu)}</td>
        <td class="jw-grid-td jw-grid-center jw-grid-time">${edit&&jwGridYears(r.Tahap).includes(0)?`<input type="time" class="jw-grid-input" aria-label="Jam mula Prasekolah" value="${jwGridEsc(r.Jam_Mula)}" onchange="jwGridEditRow(${i},'Jam_Mula',this.value)">`:jwGridEsc(formatTimeString(r.Jam_Mula)||'—')}</td>
        <td class="jw-grid-td jw-grid-center jw-grid-time">${jwGridEsc(formatTimeString(r.Jam_Tamat)||'—')} <i class="fa-solid fa-lock jw-grid-lock" aria-hidden="true"></i></td>
        <td class="jw-grid-td"><select class="jw-grid-input" aria-label="Jenis slot baris ${i+1}" ${disabled} onchange="jwGridEditRow(${i},'Jenis_ID',this.value)">${jwGridTypeOptions(r)}</select></td>
        <td class="jw-grid-td jw-grid-center"><div class="jw-grid-actions"><button title="Padam slot" aria-label="Padam baris ${i+1}" ${disabled} onclick="padamBarisGridMasa(${i})" class="jw-grid-icon jw-grid-icon--delete"><i class="fa-solid fa-trash"></i></button>${edit&&i===rows.length-1?'<button title="Tambah slot" aria-label="Tambah slot seterusnya" onclick="tambahBarisGridMasa()" class="jw-grid-icon jw-grid-icon--add"><i class="fa-solid fa-plus"></i></button>':''}</div></td>
      </tr>`).join('');
      if(!rows.length)tbody.innerHTML=`<tr><td colspan="8" class="jw-grid-empty"><span>Belum ada slot ${jwGridEsc(day)}.</span> ${edit?'<button onclick="tambahBarisGridMasa()" class="jw-grid-icon jw-grid-icon--add" aria-label="Tambah slot pertama"><i class="fa-solid fa-plus"></i></button>':'<span>Klik “Tambah Grid Masa” untuk memulakan draf.</span>'}</td></tr>`;
      const count=document.getElementById('jwGridDayCount');if(count)count.textContent=rows.length+' slot';
      const praButton=document.getElementById('jwGridAddPra');if(praButton)praButton.disabled=!edit;const refButton=document.getElementById('jwGridRefPra');if(refButton)refButton.disabled=!edit;
    }
    function jwGridEditRow(index,field,value){
      if(JW_GRID_MODE==='legacy'||JW_GRID_MODE==='selected')return;
      const day=document.getElementById('selHariGridMasa')?.value||LAST_GRID_HARI;
      const arr=STATE_GRID_MASA.filter(r=>r.Hari===day),row=arr[index];if(!row)return;
      const backup=jwGridClone(STATE_GRID_MASA);
      if(row[field]!==value && (field==='Tahap'||field==='Jenis_ID'))row.Slot_ID=''; // identiti baharu jika skop/fungsi berubah
      row[field]=value;
      try{jwGridRecalculateDay(day);JW_GRID_DIRTY=true;jwGridColorMessage('Perubahan draf belum disimpan.');}
      catch(e){STATE_GRID_MASA=backup;jwGridColorMessage(e.message,true);Swal.fire('Kohort perlu diasingkan',e.message,'warning');}
      renderGridMasaTable();
    }
    function onGridMasaTimeChange(){ /* Jam Tamat dikawal sepenuhnya oleh Controller. */ }
    function syncCurrentDayGridMasaDOM(){ /* Semua perubahan Grid V2 terus di STATE_GRID_MASA, tidak perlu baca DOM. */ }
    function tambahBarisGridMasa(pra=false){
      try{jwGridEnsureDraft();}catch(e){Swal.fire('Grid Masa',e.message,'warning');return;}
      const day=document.getElementById('selHariGridMasa')?.value||LAST_GRID_HARI||'Isnin';
      let scope;try{scope=pra?'PRA':jwGridNextCohort(day);}catch(e){return Swal.fire('Kohort',e.message,'warning');}
      const type=JW_GRID_WORK_CTRL.types.find(t=>t.id==='PDP'&&t.active)||JW_GRID_WORK_CTRL.types.find(t=>t.active);
      if(!type)return Swal.fire('Controller','Tiada jenis slot yang Aktif.','warning');
      const old=jwGridClone(STATE_GRID_MASA);
      const praRows=STATE_GRID_MASA.filter(r=>r.Hari===day&&jwGridYears(r.Tahap).includes(0));
      const praStart=praRows.length?jwGridTime(Math.max(...praRows.map(r=>jwGridClock(r.Jam_Tamat)))):jwGridStart(day);
      STATE_GRID_MASA.push({Slot_ID:'',Tahap:scope,Hari:day,No_Waktu:'',Jam_Mula:pra?praStart:'',Jam_Tamat:'',Jenis_ID:type.id,Jenis_Slot:type.legacy});
      try{jwGridRecalculateDay(day);JW_GRID_DIRTY=true;jwGridColorMessage('Baris ditambah. Pilih kumpulan murid dan jenis slot jika perlu.');}
      catch(e){STATE_GRID_MASA=old;Swal.fire('Tidak dapat tambah slot',e.message,'warning');}
      renderGridMasaTable();
    }
    function padamBarisGridMasa(index){
      if(JW_GRID_MODE==='legacy'||JW_GRID_MODE==='selected')return;
      const day=document.getElementById('selHariGridMasa')?.value||LAST_GRID_HARI;
      const rows=STATE_GRID_MASA.filter(r=>r.Hari===day),target=rows[index];if(!target)return;
      const old=jwGridClone(STATE_GRID_MASA);
      STATE_GRID_MASA.splice(STATE_GRID_MASA.indexOf(target),1);
      try{jwGridRecalculateDay(day);JW_GRID_DIRTY=true;jwGridColorMessage('Slot dibuang daripada draf sahaja.');}
      catch(e){STATE_GRID_MASA=old;Swal.fire('Tidak boleh padam slot',e.message,'warning');}
      renderGridMasaTable();
    }
    async function jwGridSavePreset(name){
      if(JW_GRID_MODE==='draft' || (JW_GRID_MODE==='recall'&&JW_GRID_DIRTY))jwGridRecalculateAll();
      const prepared=STATE_GRID_MASA.map(r=>({...r,__legacy:JW_GRID_MODE==='legacy'||(JW_GRID_MODE==='recall'&&!JW_GRID_DIRTY)}));
      const res=await postToBackend({action:'fiJWGridArchiveSave',data:{name,controller:JW_GRID_WORK_CTRL,grid:prepared}});
      if(!res?.success)throw Error(res?.error||'Gagal menyimpan versi.');
      STATE_GRID_MASA=res.grid;JW_GRID_PRESETS=res.presets||[];JW_GRID_VIEW_ID=res.id;JW_GRID_MODE='recall';JW_GRID_DIRTY=false;
      jwGridRenderPresets();return res;
    }
    async function simpanGridMasa(){
      if(!JW_GRID_LOADED)return Swal.fire('Sumber belum sedia','Muat semula halaman dan pastikan Studio Grid berjaya dibaca.','warning');
      // Simpan sebagai sejarah — tidak menimpa Master_Grid_Masa secara senyap.
      if(!STATE_GRID_MASA.length)return Swal.fire('Grid kosong','Tambah sekurang-kurangnya satu slot sebelum menyimpan.','warning');
      const q=await Swal.fire({title:'Simpan sejarah Grid Masa',input:'text',inputLabel:'Nama versi grid',
        inputValue:'Grid '+new Date().toLocaleDateString('ms-MY')+' — '+(JW_GRID_MODE==='legacy'?'Sandaran Asal':'Versi Baharu'),
        inputPlaceholder:'Contoh: Grid 2027 — Tahun 1 Karakter',showCancelButton:true,confirmButtonText:'Simpan versi',cancelButtonText:'Batal',
        inputValidator:value=>!String(value||'').trim()?'Masukkan nama versi grid.':undefined});
      if(!q.isConfirmed)return false;
      showLoader('','save');try{
        const res=await jwGridSavePreset(q.value);hideLoader();
        jwGridColorMessage('Versi '+res.id+' telah disimpan bersama tetapan Controller.');
        await Swal.fire('Versi disimpan','Semua slot dan snapshot Controller disimpan dalam Google Sheets CORE. Grid Aktif tidak berubah.','success');
        return true;
      }catch(e){hideLoader();await Swal.fire('Belum disimpan',e.message,'error');return false;}
    }
    async function jwGridCreateNew(){
      if(!JW_GRID_LOADED)return Swal.fire('Sumber belum sedia','Studio Grid belum selesai dimuatkan.','warning');
      const editing=JW_GRID_MODE==='draft'||JW_GRID_MODE==='recall';
      const needsSave=editing&&JW_GRID_DIRTY&&STATE_GRID_MASA.length;
      const q=await Swal.fire({title:'Tambah Grid Masa Baharu?',
        text:needsSave?'Grid yang sedang diedit mempunyai perubahan belum disimpan. Simpan dahulu sebelum membuka grid kosong.':'Grid kosong akan dibuka. Grid Aktif dan semua versi Sejarah kekal.',
        icon:'question',showCancelButton:true,confirmButtonText:needsSave?'Simpan & Tambah Baharu':'Tambah Grid Baharu',cancelButtonText:'Batal'});
      if(!q.isConfirmed)return; // BATAL sentiasa tersedia
      if(needsSave){const ok=await simpanGridMasa();if(!ok)return;}
      try{jwGridReadController();}catch(e){return Swal.fire('Controller',e.message,'error');}
      if(JSON.stringify(JW_GRID_CTRL)!==JSON.stringify(JW_GRID_CTRL_SAVED)){
        const c=await Swal.fire({title:'Controller belum disimpan',text:'Grid baharu menggunakan Controller CORE terakhir yang disimpan. Simpan Controller dahulu jika mahu menggunakan perubahan baharu.',icon:'info',showCancelButton:true,confirmButtonText:'Guna Controller tersimpan',cancelButtonText:'Batal'});
        if(!c.isConfirmed)return;
      }
      JW_GRID_WORK_CTRL=jwGridClone(JW_GRID_CTRL_SAVED);
      STATE_GRID_MASA=[];JW_GRID_VIEW_ID='';JW_GRID_MODE='draft';JW_GRID_DIRTY=true;LAST_GRID_HARI='Isnin';
      document.getElementById('selHariGridMasa').value='Isnin';jwGridRenderMode();renderGridMasaTable();jwGridSetTab('grid');
      jwGridColorMessage('Grid baharu kosong. Tekan + untuk slot pertama. Gunakan Batal untuk kembali tanpa menyimpan.');
    }
    /** Batal suntingan: tidak mengubah data dalam Sheets, pulang ke grid aktif. */
    async function jwGridCancelEdit(){
      if(JW_GRID_MODE!=='draft'&&JW_GRID_MODE!=='recall')return Swal.fire('Grid tidak diedit','Tiada perubahan untuk dibatalkan.','info');
      const q=await Swal.fire({title:'Batal suntingan Grid?',text:'Perubahan yang belum disimpan akan dibuang. Grid dalam Sejarah dan Grid Aktif kekal.',icon:'warning',showCancelButton:true,confirmButtonText:'Ya, batal suntingan',cancelButtonText:'Teruskan edit'});
      if(!q.isConfirmed)return;
      JW_GRID_MODE='legacy';JW_GRID_DIRTY=false;JW_GRID_VIEW_ID='';
      showLoader('','refresh');await jwGridStudioLoad();hideLoader();jwGridSetTab('grid');
    }
    /** Mengaktifkan mod suntingan tanpa mengubah rekod grid yang tersimpan. */
    function jwGridEditAsCopy(){
      if(!JW_GRID_LOADED)return Swal.fire('Sumber belum sedia','Muatkan Grid dahulu.','warning');
      if(JW_GRID_MODE==='draft'||JW_GRID_MODE==='recall')return jwGridColorMessage('Grid ini sudah boleh diedit. Simpan Versi Grid apabila selesai.');
      if(!STATE_GRID_MASA.length)return Swal.fire('Grid kosong','Panggil Grid daripada Sejarah atau tambah grid baharu.','info');
      if(JW_GRID_MODE==='legacy')return Swal.fire('Grid operasi asal','Panggil versi Grid daripada Sejarah dahulu untuk menyunting.','info');
      JW_GRID_MODE='recall';JW_GRID_DIRTY=false;jwGridRenderMode();renderGridMasaTable();
      jwGridColorMessage('Salinan Grid Aktif boleh diedit. Simpan sebagai versi baharu sebelum mengaktifkannya.');
    }
    async function jwGridRecall(){
      const id=document.getElementById('jwGridPresetSelect')?.value;
      if(!id)return Swal.fire('Pilih versi','Sila pilih sejarah grid terlebih dahulu.','info');
      const q=await Swal.fire({title:'Panggil semula versi grid?',text:'Versi akan dibuka sebagai DRAF salinan. Grid aktif tidak ditimpa.',showCancelButton:true,confirmButtonText:'Panggil semula',cancelButtonText:'Batal'});
      if(!q.isConfirmed)return;
      showLoader('','refresh');try{
        const res=await postToBackend({action:'fiJWGridArchiveRecall',data:{id}});
        if(!res?.success)throw Error(res?.error||'Versi tidak ditemui');
        JW_GRID_WORK_CTRL=jwGridClone(res.controller);STATE_GRID_MASA=res.grid.map(r=>({...r,__legacy:true}));
        JW_GRID_VIEW_ID=res.id;JW_GRID_MODE='recall';JW_GRID_DIRTY=false;jwGridRenderMode();
        jwGridSetTab('grid');renderGridMasaTable();
        jwGridColorMessage('Versi '+res.name+' telah dipanggil sebagai draf dengan Controller asal. Tiada perubahan pada grid aktif.');
        hideLoader();
      }catch(e){hideLoader();Swal.fire('Gagal panggil semula',e.message,'error');}
    }
    async function jwGridDeleteHistory(){
      if(!JW_GRID_LOADED)return Swal.fire('Sumber belum sedia','Muatkan Sejarah Grid dahulu.','warning');
      const id=document.getElementById('jwGridPresetSelect')?.value||'';
      if(!id)return Swal.fire('Pilih Grid','Pilih versi yang hendak dipadam.','info');
      if(id===JW_GRID_SELECTED?.id)return Swal.fire('Grid sedang aktif','Aktifkan Grid lain melalui Penetapan Grid dahulu sebelum memadam versi ini.','warning');
      const preset=JW_GRID_PRESETS.find(p=>p.id===id);
      if(!preset)return Swal.fire('Grid tidak ditemui','Muat semula Sejarah Grid.','warning');
      const q=await Swal.fire({title:'Padam Grid daripada Sejarah?',html:'<b>'+jwGridEsc(preset.name)+'</b><p class="mt-2 text-sm">Grid akan dikeluarkan daripada senarai. Rekod asal dikekalkan untuk audit, bukan dipadam fizikal daripada Sheets.</p>',icon:'warning',showCancelButton:true,confirmButtonText:'Padam Grid',cancelButtonText:'Batal'});
      if(!q.isConfirmed)return;
      showLoader('','save');
      try{
        const res=await postToBackend({action:'fiJWGridArchiveDelete',data:{id}});
        if(!res?.success)throw Error(res?.error||'Grid tidak dapat dipadam.');
        JW_GRID_PRESETS=res.presets||JW_GRID_PRESETS.filter(p=>p.id!==id);
        if(JW_GRID_VIEW_ID===id){JW_GRID_VIEW_ID='';JW_GRID_MODE='legacy';JW_GRID_DIRTY=false;}
        const sel=document.getElementById('jwGridPresetSelect');if(sel)sel.value='';
        jwGridRenderPresets();jwGridRenderMode();hideLoader();
        if(JW_GRID_VIEW_ID==='')await jwGridStudioLoad();
        await Swal.fire('Grid dikeluarkan',res.message||'Grid telah dikeluarkan daripada Sejarah.','success');
      }catch(e){hideLoader();Swal.fire('Tidak dapat padam',e.message,'error');}
    }
    async function jwGridUseLatestController(){
      if(JW_GRID_MODE==='legacy'||JW_GRID_MODE==='selected')return Swal.fire('Grid baca sahaja','Klik Edit Grid atau panggil versi dari Sejarah sebelum menerapkan Controller.','info');
      try{jwGridReadController();}catch(e){return Swal.fire('Controller tidak sah',e.message,'error');}
      const q=await Swal.fire({title:'Terapkan Controller ke draf?',text:'Tempoh dan jam mula akan dikira semula. Grid versi lama yang telah disimpan tidak berubah.',icon:'warning',showCancelButton:true,confirmButtonText:'Pratonton & Terap',cancelButtonText:'Batal'});
      if(!q.isConfirmed)return;
      const oldCtrl=jwGridClone(JW_GRID_WORK_CTRL),oldGrid=jwGridClone(STATE_GRID_MASA);
      JW_GRID_WORK_CTRL=jwGridClone(JW_GRID_CTRL_SAVED);
      try{jwGridRecalculateAll();JW_GRID_DIRTY=true;renderGridMasaTable();jwGridColorMessage('Controller terkini diterapkan pada draf ini. Simpan versi baharu jika berpuas hati.');}
      catch(e){JW_GRID_WORK_CTRL=oldCtrl;STATE_GRID_MASA=oldGrid;Swal.fire('Tidak boleh terap',e.message,'warning');}
    }
    async function jwGridSaveController(){
      if(!JW_GRID_LOADED)return Swal.fire('Sumber belum sedia','Studio Grid belum berjaya dimuatkan.','warning');
      try{jwGridReadController();}catch(e){return Swal.fire('Controller',e.message,'error');}
      const q=await Swal.fire({title:'Simpan Controller?',text:'Controller disimpan sebagai baris berstruktur dalam Google Sheets CORE. Grid aktif dan sejarah lama tidak berubah.',showCancelButton:true,confirmButtonText:'Simpan Controller',cancelButtonText:'Batal'});
      if(!q.isConfirmed)return;
      showLoader('','save');try{
        const res=await postToBackend({action:'fiJWGridControllerSave',data:{controller:JW_GRID_CTRL,expectedVersion:JW_GRID_CTRL_VERSION}});
        if(!res?.success)throw Error(res?.error||'Gagal simpan Controller');
        JW_GRID_CTRL_VERSION=res.controllerVersion;JW_GRID_CTRL=res.controller;JW_GRID_CTRL_SAVED=jwGridClone(res.controller);
        jwGridRenderController();hideLoader();
        Swal.fire('Controller disimpan','Tetapan digunakan untuk pengisian baharu; grid lama tidak diubah.','success');
      }catch(e){hideLoader();Swal.fire('Controller tidak disimpan',e.message,'error');}
    }
    async function jwGridSelectArchive_(id){
      if(!JW_GRID_LOADED)return Swal.fire('Sumber belum sedia','Studio Grid belum berjaya dimuatkan.','warning');
      if(!id)return Swal.fire('Pilih versi dahulu','Simpan grid ke Sejarah atau pilih salah satu versi tersimpan.','info');
      const preset=JW_GRID_PRESETS.find(p=>p.id===id);
      if(!preset)return Swal.fire('Versi tidak ditemui','Muat semula Sejarah Grid Masa dan cuba lagi.','warning');
      const q=await Swal.fire({title:'Aktifkan Grid untuk Persediaan?',
        html:'<b>'+jwGridEsc(preset.name)+'</b><p class="mt-2 text-sm">Pilihan ini hanya menukar grid kerja untuk persediaan. <b>Jadual_Waktu_Hasil dan Master_Grid_Masa tidak akan diubah.</b> Jana Jadual dibuat kemudian selepas semua tetapan lengkap.</p>',
        icon:'question',showCancelButton:true,confirmButtonText:'Aktifkan Grid Pilihan',cancelButtonText:'Batal'});
      if(!q.isConfirmed)return;
      showLoader('','save');
      try{
        const res=await postToBackend({action:'fiJWGridActiveApply',data:{id}});
        if(!res?.success)throw Error(res?.error||'Pilihan grid tidak dapat disimpan.');
        JW_GRID_SELECTED=res.selected;
        const snap=await postToBackend({action:'fiJWGridArchiveRecall',data:{id}});
        if(!snap?.success)throw Error('Grid sudah dipilih, tetapi paparan tidak dapat dimuatkan. Muat semula halaman.');
        STATE_GRID_MASA=snap.grid.map(r=>({...r,__legacy:true}));
        JW_GRID_WORK_CTRL=jwGridClone(snap.controller);
        JW_GRID_VIEW_ID=id;JW_GRID_MODE='selected';JW_GRID_DIRTY=false;
        jwGridRenderMode();renderGridMasaTable();hideLoader();
        jwGridSetTab('grid');
        Swal.fire('Grid Persediaan Aktif',res.status==='SUDAH_DIPILIH'?'Grid ini sudah dipilih. Tiada jadual diubah.':'Grid dipilih untuk penyediaan seterusnya. Jadual hasil dan grid operasi lama kekal.','success');
      }catch(e){hideLoader();Swal.fire('Belum berjaya',e.message,'error');}
    }
    async function jwGridApplyActive(){
      if(JW_GRID_DIRTY)return Swal.fire('Simpan perubahan dahulu','Grid yang diubah mesti disimpan sebagai versi Sejarah dahulu sebelum diaktifkan.','info');
      return jwGridSelectArchive_(JW_GRID_VIEW_ID);
    }


    // ===== TETAPAN SUBJEK V2.5: SUMBER TERAS GOOGLE SHEETS BERSTRUKTUR =====
    let JW_SUBJECT_PRESETS = [];
    let JW_SUBJECT_SELECTED = null;
    let JW_SUBJECT_SOURCE = '';
    let JW_SUBJECT_LOADING = false;
    let JW_SUBJECT_TARGETS = []; // Sasaran berstruktur untuk versi Tetapan Subjek
    let JW_SUBJECT_ERRORS = [];
    function jwSubjectDialog(...args){
      const raw=typeof args[0]==='string' ? {title:args[0],text:String(args[1]||''),icon:args[2]||'info'} : (args[0]||{});
      return Swal.fire({confirmButtonText:'Faham',...raw,buttonsStyling:false,
        customClass:{popup:'jw-subject-swal',confirmButton:'jw-subject-confirm',cancelButton:'jw-subject-cancel',
          title:'jw-subject-dialog-title',htmlContainer:'jw-subject-dialog-body',...raw.customClass}});
    }
    let JW_SUBJECT_YEAR = new Date().getFullYear();
    function jwSubjectEsc(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
    function jwSubjectNotice(text,error=false){
      const el=document.getElementById('jwSubjectStatus');if(!el)return;
      el.textContent=String(text||'');el.classList.toggle('is-error',!!error);
    }
    function jwSubjectYearList(scope){
      const v=(JW_GRID_LEGACY_SCOPES[scope]||scope);
      const match=JW_GRID_COHORTS.find(x=>x.value===v);
      return match?match.years:[];
    }
    function jwSubjectModeSize(mode){return {'B1':1,'B2':2,'B2+1':3,'B2+1-2H':3}[jwSubjectModeKeyForUI(mode)]||2;}
    function jwSubjectDayCount(mode,n){
      const key=jwSubjectModeKeyForUI(mode);
      return (n/jwSubjectModeSize(key))*(key==='B2+1-2H'?2:1);
    }
    function jwSubjectScopeOptions(value){
      const v=JW_GRID_LEGACY_SCOPES[value]||value;
      return JW_GRID_COHORTS.map(x=>`<option value="${x.value}" ${x.value===v?'selected':''}>${jwSubjectEsc(x.label)}</option>`).join('');
    }
    function jwSubjectSyncTargets(){
      const tbody=document.getElementById('jwSubjectTargetsBody');if(!tbody)return;
      JW_SUBJECT_TARGETS=[...tbody.querySelectorAll('tr[data-target-index]')].map((r,i)=>({
        ID_Subjek_Master:String(r.querySelector('[data-target-field="ID_Subjek_Master"]')?.value||''),
        Kod_Subjek:String(r.querySelector('[data-target-field="Kod_Subjek"]')?.value||''),
        Kategori_Tahap:String(r.querySelector('[data-target-field="Kategori_Tahap"]')?.value||'Y26'),
        Jumlah_Waktu_Sasaran:Number(r.querySelector('[data-target-field="Jumlah_Waktu_Sasaran"]')?.value||0)
      }));
    }
    function jwSubjectRenderTargets(){
      const tbody=document.getElementById('jwSubjectTargetsBody');if(!tbody)return;
      const opts='<option value="">— Pilih subjek —</option>'+ALL_MASTER_SUBJEK_LIST.map(m=>{
        const code=String(m.Kod_Subjek||m.ID_Subjek||'').trim();
        if(!code)return '';
        const label=String(m['Nama_Subjek / Komponen']||m.Nama_Subjek||code);
        return `<option value="${jwSubjectEsc(code)}">${jwSubjectEsc(code)} · ${jwSubjectEsc(label)}</option>`;
      }).join('');
      tbody.innerHTML=JW_SUBJECT_TARGETS.map((r,i)=>{
        const list=opts.replace(`value="${jwSubjectEsc(r.Kod_Subjek)}"`,`value="${jwSubjectEsc(r.Kod_Subjek)}" selected`);
        return `<tr data-target-index="${i}" class="jw-subject-target-row">
          <td class="table-cell-std text-center">${i+1}</td>
          <td class="p-1.5"><select class="jw-grid-input" data-target-field="Kod_Subjek">${list}</select>
            <input type="hidden" data-target-field="ID_Subjek_Master" value="${jwSubjectEsc(r.ID_Subjek_Master||'')}"></td>
          <td class="p-1.5"><select class="jw-grid-input" data-target-field="Kategori_Tahap">${jwSubjectScopeOptions(r.Kategori_Tahap||'Y26')}</select></td>
          <td class="p-1.5"><input type="number" min="0" max="80" step="1" class="jw-grid-input jw-subject-target-number" data-target-field="Jumlah_Waktu_Sasaran" value="${Number(r.Jumlah_Waktu_Sasaran)||0}"></td>
          <td class="table-cell-std text-center"><button type="button" class="jw-subject-delete" aria-label="Padam sasaran" onclick="jwSubjectRemoveTarget(${i})"><i class="fa-solid fa-trash"></i></button></td>
          </tr>`;
      }).join('') || '<tr><td colspan="5" class="jw-subject-empty-target">Belum ada sasaran. Tambah jika mahu menetapkan jumlah wajib bagi sesuatu subjek.</td></tr>';
      jwSubjectValidateAndRender(false);
    }
    function jwSubjectAddTarget(){
      jwSubjectSyncTargets();JW_SUBJECT_TARGETS.push({Kod_Subjek:'',ID_Subjek_Master:'',Kategori_Tahap:'Y26',Jumlah_Waktu_Sasaran:0});
      jwSubjectRenderTargets();
    }
    function jwSubjectRemoveTarget(idx){
      jwSubjectSyncTargets();JW_SUBJECT_TARGETS.splice(idx,1);jwSubjectRenderTargets();
    }
    function jwSubjectGetRowsFromDOM(){
      return [...document.querySelectorAll('#tbodyMasterSubjek tr[data-subject-index]')].map(r=>({
        Kod_Subjek:r.querySelector('[data-field="Kod_Subjek"]')?.value||'',
        ID_Subjek_Master:r.querySelector('[data-field="ID_Subjek_Master"]')?.value||'',
        Kategori_Tahap:r.querySelector('[data-field="Kategori_Tahap"]')?.value||'Y26',
        Bil_Waktu_Seminggu:Number(r.querySelector('[data-field="Bil_Waktu_Seminggu"]')?.value||0),
        Mode_Block:r.querySelector('[data-field="Mode_Block"]')?.value||'B2',
        Flag_CoTeaching:r.querySelector('[data-field="Flag_CoTeaching"]')?.value||'FALSE'
      }));
    }
    function jwSubjectEvaluate(){
      const data=jwSubjectGetRowsFromDOM();
      const targets=[...document.querySelectorAll('#jwSubjectTargetsBody tr[data-target-index]')].map(r=>({
        Kod_Subjek:r.querySelector('[data-target-field="Kod_Subjek"]')?.value||'',
        Kategori_Tahap:r.querySelector('[data-target-field="Kategori_Tahap"]')?.value||'Y26',
        Jumlah_Waktu_Sasaran:Number(r.querySelector('[data-target-field="Jumlah_Waktu_Sasaran"]')?.value||0)
      }));
      const errors=[],aggregate=new Map(),duplicates=new Map(),totals=new Map(),coverage=new Map(),targetSeen=new Map();
      const flag=(rows,targetIndices,msg)=>{
        errors.push({rows:[...new Set(rows)],targets:[...new Set(targetIndices)],msg});
      };
      data.forEach((r,i)=>{
        const code=String(r.Kod_Subjek||'').trim().toUpperCase(), years=jwSubjectYearList(r.Kategori_Tahap);
        const master=ALL_MASTER_SUBJEK_LIST.find(x=>String(x.Kod_Subjek||'').trim().toUpperCase()===code);
        if(!code||!master){flag([i],[],`Baris ${i+1}: pilih mata pelajaran yang sah.`);return;}
        if(!years.length){flag([i],[],`Baris ${i+1}: kohort tidak sah.`);return;}
        const n=r.Bil_Waktu_Seminggu,unit=jwSubjectModeSize(r.Mode_Block);
        if(!Number.isInteger(n)||n<1||n>40||n%unit!==0){
          flag([i],[],`Baris ${i+1} (${code}): waktu mesti gandaan ${unit} untuk mod ${jwSubjectModeKeyForUI(r.Mode_Block)}.`);return;
        }
        const masterId=String(master.ID_Subjek||code);
        years.forEach(y=>{
          const dupKey=`${masterId}|${y}|${jwSubjectModeKeyForUI(r.Mode_Block)}|${r.Flag_CoTeaching}`;
          if(duplicates.has(dupKey))flag([duplicates.get(dupKey),i],[],
            `${code} ${jwYearLabel(y)}: konfigurasi ${jwSubjectModeKeyForUI(r.Mode_Block)} / Co-Teaching ${r.Flag_CoTeaching} bertindih.`);
          else duplicates.set(dupKey,i);
          const gKey=`${masterId}|${y}`,old=aggregate.get(gKey)||{code,year:y,days:0,periods:0,rows:[]};
          old.days+=jwSubjectDayCount(r.Mode_Block,n);old.periods+=n;old.rows.push(i);aggregate.set(gKey,old);
          totals.set(y,(totals.get(y)||0)+n);
          // Struktur ringkasan ikut kohort sebenar baris ini, bukan 3 kumpulan tetap.
          // Setiap tahun menyimpan identiti baris yang terpakai kepadanya.
          const applicable=coverage.get(y)||[];
          applicable.push(i);coverage.set(y,applicable);
        });
      });
      aggregate.forEach(g=>{
        if(g.days>5)flag(g.rows,[],`${g.code} ${jwYearLabel(g.year)}: ${g.days} sesi memerlukan lebih 5 hari sekolah.`);
      });
      targets.forEach((r,i)=>{
        const code=String(r.Kod_Subjek||'').trim().toUpperCase(),master=ALL_MASTER_SUBJEK_LIST.find(x=>String(x.Kod_Subjek||'').trim().toUpperCase()===code);
        const years=jwSubjectYearList(r.Kategori_Tahap),want=r.Jumlah_Waktu_Sasaran;
        if(!master||!years.length||!Number.isInteger(want)||want<0||want>80){
          flag([],[i],`Sasaran ${i+1}: pilih subjek, kohort dan jumlah yang sah.`);return;
        }
        years.forEach(y=>{
          const k=`${master.ID_Subjek||code}|${y}`;
          if(targetSeen.has(k))flag([],[targetSeen.get(k),i],`${code} ${jwYearLabel(y)}: sasaran bertindih.`);
          else targetSeen.set(k,i);
          const g=aggregate.get(k),got=g?.periods||0;
          if(want!==got)flag(g?.rows||[],[i],`${code} ${jwYearLabel(y)}: sasaran ${want} waktu, tetapan sebenar ${got} waktu.`);
        });
      });
      return {errors,totals,aggregate,coverage};
    }
    // V2.6.5: Nama mengikut tahun yang BETUL-BETUL mempunyai tetapan.
    // Jangan anggap Tahun 1 ialah KP2027, atau Tahun 2-6 sentiasa KSSR.
    function jwSubjectCohortLabel(years){
      const a=years.join(',');
      if(a==='0')return 'Prasekolah';
      if(a==='1,2,3')return 'Tahap 1 · Tahun 1–3';
      if(a==='2,3')return 'Tahap 1 · Tahun 2–3';
      if(a==='4,5,6')return 'Tahap 2 · Tahun 4–6';
      if(a==='1,2,3,4,5,6')return 'Semua Tahun 1–6';
      if(a==='2,3,4,5,6')return 'Tahun 2–6';
      if(years.length===1)return `Tahun ${years[0]}`;
      const consecutive=years.every((y,i)=>i===0||y===years[i-1]+1);
      return consecutive?`Tahun ${years[0]}–${years[years.length-1]}`:
        'Tahun '+years.join(', ');
    }
    function jwSubjectRenderTotals(totals,coverage){
      const el=document.getElementById('jwSubjectCohortTotals');if(!el)return;
      // Sumber ialah borang Tetapan Subjek semasa; tiada angka contoh/preset.
      // Dua tahun digabung hanya jika baris subjek yang terpakai sama,
      // jumlah waktunya sama, dan tahun itu berjiran.
      const present=[...totals.keys()].map(Number)
        .filter(y=>Number.isInteger(y)&&y>=0&&y<=6)
        .sort((a,b)=>a-b);
      const groups=[];
      for(const year of present){
        const n=Number(totals.get(year))||0;
        const signature=(coverage?.get(year)||[]).slice().sort((a,b)=>a-b).join(',');
        const last=groups[groups.length-1];
        if(last && year>1 && last.years[last.years.length-1]===year-1 &&
            last.signature===signature && last.n===n){
          last.years.push(year);
        }else{
          groups.push({years:[year],n,signature});
        }
      }
      el.innerHTML=groups.length?groups.map(g=>
        `<div class="jw-subject-cohort-card"><strong>${jwSubjectEsc(jwSubjectCohortLabel(g.years))}</strong>`+
        `<span>${g.n} waktu/minggu</span></div>`
      ).join(''):'<div class="jw-subject-cohort-empty">Belum ada bilangan waktu yang boleh dikira daripada Tetapan Subjek.</div>';
    }
    function jwSubjectValidateAndRender(showAlert){
      const evaluated=jwSubjectEvaluate();JW_SUBJECT_ERRORS=evaluated.errors;
      document.querySelectorAll('#tbodyMasterSubjek tr[data-subject-index]').forEach((tr,i)=>{
        const msgs=evaluated.errors.filter(e=>e.rows.includes(i)).map(e=>e.msg);
        tr.classList.toggle('jw-subject-error-row',msgs.length>0);
        if(msgs.length){tr.setAttribute('title',msgs.join(' | '));}else tr.removeAttribute('title');
      });
      document.querySelectorAll('#jwSubjectTargetsBody tr[data-target-index]').forEach((tr,i)=>{
        const msgs=evaluated.errors.filter(e=>e.targets.includes(i)).map(e=>e.msg);
        tr.classList.toggle('jw-subject-error-row',msgs.length>0);
        if(msgs.length)tr.title=msgs.join(' | ');else tr.removeAttribute('title');
      });
      const note=document.getElementById('jwSubjectErrors');
      if(note){note.hidden=!evaluated.errors.length;note.innerHTML=evaluated.errors.length?
        `<strong><i class="fa-solid fa-circle-exclamation"></i> ${evaluated.errors.length} isu perlu dibetulkan</strong>`+
        '<div>'+evaluated.errors.map(e=>`<p>${jwSubjectEsc(e.msg)}</p>`).join('')+'</div>':'';}
      jwSubjectRenderTotals(evaluated.totals,evaluated.coverage);
      if(showAlert && evaluated.errors.length){
        const first=evaluated.errors[0],index=first.rows.length?first.rows[0]:null;
        const row=index!=null?document.querySelectorAll('#tbodyMasterSubjek tr[data-subject-index]')[index]:
          document.querySelectorAll('#jwSubjectTargetsBody tr[data-target-index]')[first.targets[0]];
        try{row?.scrollIntoView({behavior:'smooth',block:'center'});}catch(_){ }
        jwSubjectDialog({icon:'warning',title:'Semak baris yang ditandakan',
          html:'<div class="jw-subject-popup-errors">'+evaluated.errors.map(x=>`<p>${jwSubjectEsc(x.msg)}</p>`).join('')+'</div>'});
      }
      return evaluated.errors.length===0;
    }
    function jwSubjectHighlightBackend(message){
      const text=String(message||''),rowMatch=text.match(/BARIS\[([\d,]+)\]/i),targetMatch=text.match(/SASARAN\[([\d,]+)\]/i);
      const rowIds=rowMatch?rowMatch[1].split(',').map(x=>Number(x)-1):[];
      const targetIds=targetMatch?targetMatch[1].split(',').map(x=>Number(x)-1):[];
      document.querySelectorAll('#tbodyMasterSubjek tr[data-subject-index]').forEach((tr,i)=>tr.classList.toggle('jw-subject-error-row',rowIds.includes(i)));
      document.querySelectorAll('#jwSubjectTargetsBody tr[data-target-index]').forEach((tr,i)=>tr.classList.toggle('jw-subject-error-row',targetIds.includes(i)));
      const first=document.querySelectorAll('#tbodyMasterSubjek tr[data-subject-index]')[rowIds[0]]||
        document.querySelectorAll('#jwSubjectTargetsBody tr[data-target-index]')[targetIds[0]];
      try{first?.scrollIntoView({behavior:'smooth',block:'center'});}catch(_){ }
      const note=document.getElementById('jwSubjectErrors');if(note){note.hidden=false;note.textContent=text.replace(/(?:BARIS|SASARAN)\[[\d,]+\]\s*/g,'');}
      return text.replace(/(?:BARIS|SASARAN)\[[\d,]+\]\s*/g,'');
    }
    document.addEventListener('change',e=>{
      if(e.target?.closest?.('#tbodyMasterSubjek')||e.target?.closest?.('#jwSubjectTargetsBody')){
        if(e.target?.matches?.('[data-target-field="Kod_Subjek"]')){
          const tr=e.target.closest('tr'),code=e.target.value,
          m=ALL_MASTER_SUBJEK_LIST.find(x=>String(x.Kod_Subjek||'')===code);
          const hidden=tr?.querySelector('[data-target-field="ID_Subjek_Master"]');if(hidden)hidden.value=String(m?.ID_Subjek||'');
        }
        jwSubjectValidateAndRender(false);
      }
    });
    document.addEventListener('input',e=>{
      if(e.target?.closest?.('#tbodyMasterSubjek')||e.target?.closest?.('#jwSubjectTargetsBody'))jwSubjectValidateAndRender(false);
    });
    function jwSubjectSetTab(tab){
      const history=tab==='history';
      document.getElementById('jwSubjectPanel_history')?.classList.toggle('hidden',!history);
      document.getElementById('jwSubjectPanel_editor')?.classList.toggle('hidden',history);
      document.querySelectorAll('[data-subject-tab]').forEach(b=>{
        b.classList.toggle('jw-grid-tab--active',b.dataset.subjectTab===tab);
        b.setAttribute('aria-selected',b.dataset.subjectTab===tab?'true':'false');
      });
    }
    function jwSubjectRefreshOptions(){
      const select=document.getElementById('jwSubjectPresetSelect');if(!select)return;
      const was=select.value;
      select.innerHTML='<option value="">— Pilih sejarah Tetapan Subjek —</option>'+JW_SUBJECT_PRESETS.map(p=>
        `<option value="${jwSubjectEsc(p.id)}">${jwSubjectEsc(p.name)} · ${jwSubjectEsc(p.year)} · ${p.count} rekod</option>`).join('');
      select.value=JW_SUBJECT_PRESETS.some(p=>p.id===was)?was:(JW_SUBJECT_SELECTED?.id||'');
      const active=document.getElementById('jwSubjectSelectedLabel');
      if(active)active.textContent=JW_SUBJECT_SELECTED?
        `AKTIF: ${JW_SUBJECT_SELECTED.name} · ${JW_SUBJECT_SELECTED.year}`:'Belum ada Tetapan Subjek Aktif';
      jwSubjectPresetInfo();
    }
    function jwSubjectPresetInfo(){
      const id=document.getElementById('jwSubjectPresetSelect')?.value;
      const preset=JW_SUBJECT_PRESETS.find(p=>p.id===id);
      const target=document.getElementById('jwSubjectPresetDetails');if(!target)return;
      target.textContent=preset?`${preset.count} rekod · Disimpan ${preset.createdAt} · Sesi ${preset.year}`:'';
    }
    async function jwSubjectStudioLoad(preload=false){
      if(JW_SUBJECT_LOADING)return;
      JW_SUBJECT_LOADING=true;if(!preload)showLoader('','refresh');
      try{
        const res=await postToBackend({action:'fiJWSubjectStudioGet'});
        if(!res?.success)throw Error(res?.error||'Tetapan sejarah subjek tidak dapat dibaca.');
        if(res.selected&&(!Array.isArray(res.activeData)||!res.activeData.length))throw Error('Snapshot Tetapan Subjek aktif tidak lengkap.');
        JW_SUBJECT_PRESETS=res.presets||[];JW_SUBJECT_SELECTED=res.selected||null;
        JW_SUBJECT_SOURCE=String(res.source||'');jwSubjectRefreshOptions();
        JW_SUBJECT_TARGETS=Array.isArray(res.activeTargets)?JSON.parse(JSON.stringify(res.activeTargets)):[];jwSubjectRenderTargets();
        if(res.selected && Array.isArray(res.activeData) && res.activeData.length){
          STATE_SUBJEK=JSON.parse(JSON.stringify(res.activeData));
          JW_SUBJECT_YEAR=Number(res.selected.year)||JW_SUBJECT_YEAR;
          renderSubjekTable();
        }else{STATE_SUBJEK=[];renderSubjekTable();}
        if(res.selectionWarning)jwSubjectNotice(res.selectionWarning,true);JW_SUBJECT_READY=true;
      }catch(err){JW_SUBJECT_READY=false;jwSubjectNotice('Sejarah Tetapan Subjek belum tersedia: '+String(err.message||err),true);if(preload)throw err;}
      finally{JW_SUBJECT_LOADING=false;if(!preload)hideLoader();}
    }
    async function jwSubjectNew(){
      syncSubjekDOM();
      if(STATE_SUBJEK.length){
        const answer=await jwSubjectDialog({icon:'warning',title:'Mulakan Set Tetapan Baharu?',
          text:'Editor akan dikosongkan. Semua set yang sudah disimpan dalam Google Sheets kekal. Perubahan belum disimpan akan hilang.',
          showCancelButton:true,confirmButtonText:'Ya, Set Baharu',cancelButtonText:'Batal'});
        if(!answer.isConfirmed)return;
      }
      STATE_SUBJEK=[];JW_SUBJECT_TARGETS=[];renderSubjekTable();jwSubjectRenderTargets();jwSubjectSetTab('editor');
      jwSubjectNotice('Editor kosong. Isi tetapan kemudian tekan Simpan & Aktifkan untuk menyimpan ke JW_Subjek_Baris.');
    }
    async function jwSubjectSavePreset(){
      if(!jwSubjectValidateAndRender(true))return false;
      const incomplete=[...document.querySelectorAll('#tbodyMasterSubjek select[data-field="Kod_Subjek"]')]
        .filter(el=>!el.value.trim());
      if(incomplete.length){await jwSubjectDialog('Baris belum lengkap',
        'Terdapat '+incomplete.length+' baris yang belum dipilih mata pelajarannya. Lengkapkan atau padam dahulu.','warning');return false;}
      syncSubjekDOM();jwSubjectSyncTargets();
      if(!STATE_SUBJEK.length){await jwSubjectDialog('Tiada subjek','Tambah sekurang-kurangnya satu subjek dahulu.','warning');return false;}
      const modal=await jwSubjectDialog({title:'Simpan & Aktifkan Tetapan Subjek',html:
        `<div style="text-align:left"><label style="font-size:12px;font-weight:700">Nama set</label><input id="jw-subject-name" class="swal2-input" style="width:100%;margin:7px 0" placeholder="Contoh: Tetapan Kurikulum 2027"><label style="font-size:12px;font-weight:700">Sesi tahun</label><input id="jw-subject-year" class="swal2-input" style="width:100%;margin:7px 0" type="number" min="2020" max="2100" value="${JW_SUBJECT_YEAR}"><p style="font-size:12px;margin:8px 0">Semua baris akan disimpan terus ke JW_Subjek_Baris dan set ini dijadikan aktif. Set terdahulu kekal dalam sejarah. Tidak menjana jadual.</p></div>`,
        showCancelButton:true,confirmButtonText:'Simpan & Aktifkan',cancelButtonText:'Batal',
        preConfirm:()=>{const name=document.getElementById('jw-subject-name').value.trim();
          const year=Number(document.getElementById('jw-subject-year').value);
          if(name.length<2||name.length>90||!Number.isInteger(year)||year<2020||year>2100){Swal.showValidationMessage('Isi nama 2–90 aksara dan sesi tahun yang sah.');return false;}
          return {name,year};}});
      if(!modal.isConfirmed)return false;
      showLoader('','save');
      try{
        const res=await postToBackend({action:'fiJWSubjectCoreSave',data:{...modal.value,data:STATE_SUBJEK,targets:JW_SUBJECT_TARGETS}});
        if(!res?.success)throw Error(res?.error||'Tetapan tidak berjaya disimpan.');
        JW_SUBJECT_YEAR=Number(res.year);JW_SUBJECT_PRESETS=res.presets||[];
        JW_SUBJECT_SELECTED=res.selected||null;
        STATE_SUBJEK=JSON.parse(JSON.stringify(res.data||STATE_SUBJEK));
        JW_SUBJECT_TARGETS=JSON.parse(JSON.stringify(res.targets||JW_SUBJECT_TARGETS));
        renderSubjekTable();jwSubjectRenderTargets();jwSubjectRefreshOptions();
        const sel=document.getElementById('jwSubjectPresetSelect');if(sel){sel.value=res.id;jwSubjectPresetInfo();}
        jwSubjectNotice('Set '+res.name+' AKTIF — '+res.count+' baris disimpan sebagai rekod teras Google Sheets.');
        const warnings=res.warnings||[];
        hideLoader();
        await jwSubjectDialog({icon:warnings.length?'warning':'success',title:'Disimpan & Diaktifkan',
          html:warnings.length?'<div style="text-align:left;font-size:12px">'+warnings.map(x=>'<p>• '+jwSubjectEsc(x)+'</p>').join('')+'</div>':'Tetapan Subjek telah disimpan dalam JW_Subjek_Set, JW_Subjek_Baris dan JW_Subjek_Aktif. Jadual hasil tidak berubah.',confirmButtonText:'OK'});
        return true;
      }catch(e){const msg=jwSubjectHighlightBackend(e.message||e);jwSubjectNotice(msg,true);
        hideLoader();await jwSubjectDialog('Gagal simpan',msg,'error');return false;}
      finally{hideLoader();}
    }
    async function jwSubjectRecall(){
      const id=document.getElementById('jwSubjectPresetSelect')?.value;
      if(!id){await jwSubjectDialog('Pilih sejarah','Pilih satu set sebelum Panggil Semula.','info');return;}
      const confirm=await jwSubjectDialog({icon:'question',title:'Panggil Semula Tetapan Subjek?',
        text:'Set sejarah dibuka dalam editor. Set aktif di Google Sheets tidak berubah sehingga kamu klik Simpan & Aktifkan atau Aktifkan Pilihan.',
        showCancelButton:true,confirmButtonText:'Panggil Semula',cancelButtonText:'Batal'});
      if(!confirm.isConfirmed)return;
      showLoader('','refresh');
      try{
        const res=await postToBackend({action:'fiJWSubjectArchiveRecall',data:{id}});
        if(!res?.success)throw Error(res?.error||'Set tidak dapat dibaca.');
        STATE_SUBJEK=JSON.parse(JSON.stringify(res.data));JW_SUBJECT_YEAR=Number(res.year)||JW_SUBJECT_YEAR;
        JW_SUBJECT_TARGETS=JSON.parse(JSON.stringify(res.targets||[]));
        renderSubjekTable();jwSubjectRenderTargets();jwSubjectSetTab('editor');
        jwSubjectNotice('Set '+res.name+' dipanggil semula. Untuk ubah versi ini, tekan Simpan & Aktifkan (versi baharu).');
      }catch(e){jwSubjectNotice(String(e.message||e),true);hideLoader();await jwSubjectDialog('Gagal memanggil',String(e.message||e),'error');}
      finally{hideLoader();}
    }
    async function jwSubjectActivate(){
      const id=document.getElementById('jwSubjectPresetSelect')?.value;
      if(!id){await jwSubjectDialog('Pilih sejarah','Pilih satu set Tetapan Subjek.','info');return;}
      const confirm=await jwSubjectDialog({icon:'question',title:'Aktifkan Set Tetapan Subjek?',
        text:'Set ini akan menjadi data teras aktif dalam Google Sheets. Agihan Guru dan Jadual_Waktu_Hasil sedia ada tidak diubah.',
        showCancelButton:true,confirmButtonText:'Aktifkan Set',cancelButtonText:'Batal'});
      if(!confirm.isConfirmed)return;
      showLoader('','save');
      try{
        const res=await postToBackend({action:'fiJWSubjectActiveSelect',data:{id}});
        if(!res?.success)throw Error(res?.error||'Aktivasi gagal.');
        const active=await postToBackend({action:'fiJWSubjectStudioGet'});
        if(!active?.success)throw Error('Set telah diaktifkan tetapi bacaan semula gagal. Muat semula modul.');
        JW_SUBJECT_SELECTED=active.selected||null;JW_SUBJECT_PRESETS=active.presets||[];
        if(Array.isArray(active.activeData)&&active.activeData.length){
          STATE_SUBJEK=JSON.parse(JSON.stringify(active.activeData));renderSubjekTable();
          JW_SUBJECT_TARGETS=JSON.parse(JSON.stringify(active.activeTargets||[]));jwSubjectRenderTargets();
          JW_SUBJECT_YEAR=Number(active.selected?.year)||JW_SUBJECT_YEAR;
        }
        jwSubjectRefreshOptions();
        jwSubjectNotice('Tetapan AKTIF: '+JW_SUBJECT_SELECTED?.name+'. Semua data tersimpan dalam Google Sheets CORE.');
        hideLoader();
        await jwSubjectDialog('Set telah diaktifkan','Agihan Guru dan Jadual_Waktu_Hasil tidak diubah.','success');
      }catch(e){jwSubjectNotice(String(e.message||e),true);hideLoader();await jwSubjectDialog('Tidak berjaya',String(e.message||e),'error');}
      finally{hideLoader();}
    }
    document.addEventListener('change',e=>{if(e.target?.id==='jwSubjectPresetSelect')jwSubjectPresetInfo();});

    // ================= 2. SUBJEK =================
    function generateUniqueSubjekID(kodSubjek, kategoriTahap, idx) {
      if (!kodSubjek) return `SUBJ-${idx + 1}`;
      let tag = 'ALL';
      const k = String(kategoriTahap || '').toLowerCase();
      
      if (['y1','y23','t2','all','t1','y2','y3','y4','y5','y6','y26'].includes(k)) {
        tag = k.toUpperCase();
      } else if (k.includes('tahap 1') || k.includes('thp 1') || k.includes('tahun 1')) {
        tag = 'T1';
      } else if (k.includes('tahap 2') || k.includes('thp 2')) {
        tag = 'T2';
      } else if (k.includes('semua')) {
        tag = 'ALL';
      }
      return `${kodSubjek}-${tag}`;
    }

    // Corak kanonik berasingan untuk 2+1 hari sama dan 2+1 dua hari.
    function jwSubjectModeKeyForUI(value) {
      const s=String(value||'').trim().toUpperCase();
      if(s==='B2+1-2H'||s==='B2+1-HB'||s==='B2+1-DIFF'||
          s.includes('HARI BERASINGAN')||s.includes('HARI BERBEZA')||s.includes('HARI LAIN'))return 'B2+1-2H';
      if(s==='B1'||s.includes('SINGLE')||s.includes('TUNGGAL'))return 'B1';
      if(s==='B2+1'||s.includes('HYBRID')||s.includes('CAMPURAN')||s.includes('2+1'))return 'B2+1';
      return 'B2';
    }
    function renderSubjekTable() {
      const tbody = document.getElementById('tbodyMasterSubjek');
      if (!tbody) return;

      tbody.innerHTML = '';

      let optMasterSubjek = '<option value="">-- Pilih Kod Subjek --</option>';
      const seenCodes = new Set();
      ALL_MASTER_SUBJEK_LIST.forEach(m => {
        const kod = (m.Kod_Subjek || m.ID_Subjek || '').trim();
        const nama = m['Nama_Subjek / Komponen'] || m.Nama_Subjek || kod;
        if (kod && !seenCodes.has(kod)) {
          seenCodes.add(kod);
          optMasterSubjek += `<option value="${kod}" data-nama="${nama}">${kod}</option>`;
        }
      });

      if (STATE_SUBJEK.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-cell-std text-center text-slate-400 italic">Tiada subjek. Klik "+ Subjek Baharu" atau "Tarik Semua Dari Master".</td></tr>`;
        jwSubjectRenderTotals(new Map());return;
      }

      STATE_SUBJEK.forEach((row, idx) => {
        const selectedKod = row.Kod_Subjek || row.ID_Subjek || '';
        const aliases={'Tahap 1 & 2':'ALL','Tahap 2':'T2','Tahap 1':'T1',
          'Tahun 1':'Y1','Tahun 2':'Y2','Tahun 3':'Y3','Tahun 4':'Y4','Tahun 5':'Y5','Tahun 6':'Y6'};
        row.Kategori_Tahap=aliases[String(row.Kategori_Tahap||'').trim()]||row.Kategori_Tahap||'ALL';
        let optS = optMasterSubjek.replace(`value="${selectedKod}"`, `value="${selectedKod}" selected`);
        const modeBlokKey=jwSubjectModeKeyForUI(row.Corak_Blok || row.Mode_Block || 'B2');

        if (!row.ID_Subjek) {
          row.ID_Subjek = generateUniqueSubjekID(selectedKod, row.Kategori_Tahap, idx);
        }

        tbody.innerHTML += `
          <tr data-subject-index="${idx}" class="jw-subject-data-row hover:bg-slate-50 transition">
            <td class="table-cell-std text-center font-bold text-slate-400">${idx + 1}</td>
            <td class="p-1.5">
              <select data-field="Kod_Subjek" onchange="onSelectMasterSubjekCode(this, ${idx})" class="w-full p-1.5 border rounded-lg text-xs font-extrabold text-emerald-800 bg-white">
                ${optS}
              </select>
              <input type="hidden" data-field="ID_Subjek" value="${jwEscapeHtml(row.ID_Subjek)}">
              <input type="hidden" data-field="ID_Tetapan_Subjek" value="${jwEscapeHtml(row.ID_Tetapan_Subjek || '')}">
              <input type="hidden" data-field="ID_Subjek_Master" value="${jwEscapeHtml(row.ID_Subjek_Master || (ALL_MASTER_SUBJEK_LIST.find(m=>String(m.Kod_Subjek||'').trim()===String(selectedKod).trim())?.ID_Subjek||''))}">
            </td>
            <td class="p-1.5">
              <input type="text" data-field="Nama_Subjek" value="${row.Nama_Subjek || ''}" readonly class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 cursor-not-allowed">
            </td>
            <td class="p-1.5">
              <select data-field="Kategori_Tahap" onchange="onChangeKategoriTahap(this, ${idx})" class="jw-grid-input jw-subject-scope-select">${jwSubjectScopeOptions(row.Kategori_Tahap)}</select>
            </td>
            <td class="p-1.5"><input type="number" data-field="Bil_Waktu_Seminggu" value="${row.Bil_Waktu_Seminggu ?? 0}" min="1" max="40" step="1" class="w-full p-1.5 border rounded-lg text-xs font-extrabold text-center bg-white text-emerald-700"></td>
            <td class="p-1.5">
              <select data-field="Mode_Block" class="w-full p-1.5 border rounded-lg text-xs font-bold bg-white">
                <option value="B2" ${modeBlokKey==='B2' ? 'selected' : ''}>Berganda (B2) — 2 waktu berturutan</option>
                <option value="B1" ${modeBlokKey==='B1' ? 'selected' : ''}>Tunggal (B1) — 1 waktu sehari</option>
                <option value="B2+1" ${modeBlokKey==='B2+1' ? 'selected' : ''}>Campuran (B2+1) — 2 berturut + 1 terpisah, hari sama</option>
                <option value="B2+1-2H" ${modeBlokKey==='B2+1-2H' ? 'selected' : ''}>2+1 Hari Berasingan — B2 satu hari, B1 hari lain</option>
              </select>
            </td>
            <td class="p-1.5 text-center">
              <select data-field="Flag_CoTeaching" class="w-full p-1.5 border rounded-lg text-xs font-bold bg-white text-center">
                <option value="FALSE" ${String(row.Flag_CoTeaching).toUpperCase() === 'FALSE' ? 'selected' : ''}>FALSE</option>
                <option value="TRUE" ${String(row.Flag_CoTeaching).toUpperCase() === 'TRUE' ? 'selected' : ''}>TRUE</option>
              </select>
            </td>
            <td class="table-cell-std text-center">
              <button onclick="padamBarisSubjek(${idx})" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg transition"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>
        `;
      });
      jwSubjectValidateAndRender(false);
    }

    function onSelectMasterSubjekCode(el, idx) {
      const selectedKod = el.value;
      const masterItem = ALL_MASTER_SUBJEK_LIST.find(m => (m.Kod_Subjek || m.ID_Subjek) === selectedKod);
      const nama = masterItem ? (masterItem['Nama_Subjek / Komponen'] || masterItem.Nama_Subjek || selectedKod) : '';

      STATE_SUBJEK[idx].Kod_Subjek = selectedKod;
      STATE_SUBJEK[idx].Nama_Subjek = nama;
      STATE_SUBJEK[idx].ID_Subjek_Master = String(masterItem?.ID_Subjek||'');
      STATE_SUBJEK[idx].ID_Subjek = generateUniqueSubjekID(selectedKod, STATE_SUBJEK[idx].Kategori_Tahap, idx);

      const tr = el.closest('tr');
      if (tr) {
        const namaInput = tr.querySelector('[data-field="Nama_Subjek"]');
        if (namaInput) namaInput.value = nama;
        const idInput = tr.querySelector('[data-field="ID_Subjek"]');
        if (idInput) idInput.value = STATE_SUBJEK[idx].ID_Subjek;
        const masterInput = tr.querySelector('[data-field="ID_Subjek_Master"]');
        if (masterInput) masterInput.value = STATE_SUBJEK[idx].ID_Subjek_Master;
      }
    }

    function onChangeKategoriTahap(el, idx) {
      STATE_SUBJEK[idx].Kategori_Tahap = el.value;
      STATE_SUBJEK[idx].ID_Subjek = generateUniqueSubjekID(STATE_SUBJEK[idx].Kod_Subjek, el.value, idx);
      const tr = el.closest('tr');
      if (tr) {
        const idInput = tr.querySelector('[data-field="ID_Subjek"]');
        if (idInput) idInput.value = STATE_SUBJEK[idx].ID_Subjek;
      }
    }

    async function tarikSemuaMasterSubjek() {
      if (!ALL_MASTER_SUBJEK_LIST || ALL_MASTER_SUBJEK_LIST.length === 0) {
        jwSubjectDialog('Tiada data', 'Senarai Master Subjek belum tersedia.', 'info');
        return;
      }
      if (STATE_SUBJEK.length) {
        const confirm = await jwSubjectDialog({
          icon: 'warning', title: 'Ganti semua tetapan subjek?',
          text: 'Tindakan ini menggantikan senarai subjek yang sedang diedit. Jika ada perubahan belum disimpan, perubahan itu akan hilang.',
          showCancelButton: true, confirmButtonText: 'Ya, tarik dari Master', cancelButtonText: 'Batal'
        });
        if (!confirm.isConfirmed) return;
      }

      STATE_SUBJEK = ALL_MASTER_SUBJEK_LIST.map((s, idx) => {
        const kod = s.Kod_Subjek || s.ID_Subjek || '';
        const rawKategori=String(s.Kategori_Tahap||'').trim();
        const kategoriMap={'Tahap 1 & 2':'ALL','Tahap 2':'T2','Tahap 1':'T1',
          'Tahun 1':'Y1','Tahun 2':'Y2','Tahun 3':'Y3','Tahun 4':'Y4','Tahun 5':'Y5','Tahun 6':'Y6'};
        const kateg=kategoriMap[rawKategori]||rawKategori||'ALL';
        return {
          ID_Subjek: generateUniqueSubjekID(kod, kateg, idx),
          ID_Subjek_Master: String(s.ID_Subjek||''),
          Kod_Subjek: kod,
          Nama_Subjek: s['Nama_Subjek / Komponen'] || s.Nama_Subjek || s.Nama || '',
          Kategori_Tahap: kateg,
          Bil_Waktu_Seminggu: s.Bil_Waktu_Seminggu ? parseInt(s.Bil_Waktu_Seminggu, 10) : 0,
          Mode_Block: s.Mode_Block || 'Double Slot (60 Minit)',
          Flag_CoTeaching: s.Flag_CoTeaching || 'FALSE'
        };
      });

      renderSubjekTable();
      jwSubjectDialog('Senarai subjek dimuatkan', `Sebanyak ${STATE_SUBJEK.length} subjek tersedia untuk ditetapkan.`, 'success');
    }

    function syncSubjekDOM() {
      const rows = document.querySelectorAll('#tbodyMasterSubjek tr[data-subject-index]');
      if (rows.length === 0) return;
      const updated = [];
      rows.forEach((r, idx) => {
        const kodSubjek = r.querySelector('[data-field="Kod_Subjek"]')?.value || '';
        const namaSubjek = r.querySelector('[data-field="Nama_Subjek"]')?.value || '';
        const kategoriTahap = r.querySelector('[data-field="Kategori_Tahap"]')?.value || 'Y26';
        const bilWaktu = r.querySelector('[data-field="Bil_Waktu_Seminggu"]')?.value ?? '0';
        const modeBlock = r.querySelector('[data-field="Mode_Block"]')?.value || 'Double Slot (60 Minit)';
        const flagCoTeaching = r.querySelector('[data-field="Flag_CoTeaching"]')?.value || 'FALSE';
        const idTetapan = r.querySelector('[data-field="ID_Tetapan_Subjek"]')?.value || '';
        const masterId = r.querySelector('[data-field="ID_Subjek_Master"]')?.value || '';

        let idSubjek = r.querySelector('[data-field="ID_Subjek"]')?.value || '';
        if (!idSubjek || idSubjek.trim() === '') {
          idSubjek = generateUniqueSubjekID(kodSubjek, kategoriTahap, idx);
        }

        {
          updated.push({
            ID_Subjek: idSubjek,
            ID_Tetapan_Subjek: idTetapan,
            ID_Subjek_Master: masterId,
            Kod_Subjek: kodSubjek,
            Nama_Subjek: namaSubjek,
            Kategori_Tahap: kategoriTahap,
            Bil_Waktu_Seminggu: parseInt(bilWaktu, 10),
            Mode_Block: modeBlock,
            Flag_CoTeaching: flagCoTeaching
          });
        }
      });
      STATE_SUBJEK = updated;
    }

    function tambahBarisSubjek() {
      syncSubjekDOM();
      STATE_SUBJEK.push({
        ID_Subjek: '',
        Kod_Subjek: '',
        Nama_Subjek: '',
        Kategori_Tahap: 'Y26',
        Bil_Waktu_Seminggu: 0,
        Mode_Block: 'Double Slot (60 Minit)',
        Flag_CoTeaching: 'FALSE'
      });
      renderSubjekTable();
    }

    function padamBarisSubjek(idx) {
      syncSubjekDOM();
      STATE_SUBJEK.splice(idx, 1);
      renderSubjekTable();
    }

    async function simpanTetapanSubjek() {
      // Semua tindakan simpan Tetapan Subjek menggunakan sumber CORE berstruktur.
      return jwSubjectSavePreset();
    }

    // ================= 3. AGIHAN TUGAS =================
    function parseFlatAgihanToGuruView() {
      STATE_AGIHAN_GURU = [];
      const sortedStaf = getSortedStafList();

      const grouped = {};
      if (STATE_AGIHAN && STATE_AGIHAN.length > 0) {
        STATE_AGIHAN.forEach(item => {
          if (!item.ID_Guru_Utama) return;
          const key = `${item.ID_Guru_Utama}_${item.ID_Subjek}_${item.ID_Guru_Pair || ''}`;
          if (!grouped[key]) {
            grouped[key] = {
              idGuruUtama: item.ID_Guru_Utama,
              idSubjek: item.ID_Subjek,
              kodSubjek: item.Kod_Subjek || item.ID_Subjek,
              idGuruPair: item.ID_Guru_Pair || '',
              senaraiKelas: []
            };
          }
          if (item.ID_Kelas && !grouped[key].senaraiKelas.includes(item.ID_Kelas)) {
            grouped[key].senaraiKelas.push(item.ID_Kelas);
          }
        });
      }

      const groupedRows = Object.values(grouped);
      const activeNames = new Set(sortedStaf.map(g => g.Nama_Penuh));
      sortedStaf.forEach(g => {
        const teacherRows = groupedRows.filter(a => a.idGuruUtama === g.Nama_Penuh);
        if (teacherRows.length > 0) {
          teacherRows.forEach(r => STATE_AGIHAN_GURU.push(r));
        } else {
          STATE_AGIHAN_GURU.push({
            idGuruUtama: g.Nama_Penuh,
            idSubjek: '',
            kodSubjek: '',
            idGuruPair: '',
            senaraiKelas: []
          });
        }
      });
      // Rekod guru tidak aktif/tidak ditemui tetap dipapar supaya tidak terpadam senyap.
      groupedRows.filter(r => !activeNames.has(r.idGuruUtama))
        .forEach(r => STATE_AGIHAN_GURU.push(r));
    }

    function calculateTotalWaktuGuru(namaGuru) {
      if (!namaGuru) return 0;
      let total = 0;
      STATE_AGIHAN_GURU.forEach(row => {
        const selectedCount = (row.senaraiKelas || []).length;
        let sub = {};
        if (row.subjekIndex !== undefined && row.subjekIndex !== null && JW_AGIHAN_SUBJEK[row.subjekIndex]) {
          sub = JW_AGIHAN_SUBJEK[row.subjekIndex];
        } else {
          sub = JW_AGIHAN_SUBJEK.find(s => s.ID_Subjek === row.idSubjek || s.Kod_Subjek === row.idSubjek) || {};
        }
        const bilWaktu = parseInt(sub.Bil_Waktu_Seminggu || 0, 10);

        if (row.idGuruUtama === namaGuru) {
          total += (selectedCount * bilWaktu);
        } else if (row.idGuruPair === namaGuru) {
          total += (selectedCount * bilWaktu);
        }
      });
      return total;
    }

    function onSelectGuruPair(idx, selectedPairGuru) {
      if (!STATE_AGIHAN_GURU[idx]) return;
      STATE_AGIHAN_GURU[idx].idGuruPair = selectedPairGuru;
      markAgihanChanged();
      renderAgihanGuruMatrix();
    }

    function prepareFlatAgihanForBackend() {
      const flatList = [];

      STATE_AGIHAN_GURU.forEach(row => {
        if (row.idGuruUtama && row.idSubjek && row.senaraiKelas && row.senaraiKelas.length > 0) {
          let sub = {};
          if (row.subjekIndex !== undefined && row.subjekIndex !== null && JW_AGIHAN_SUBJEK[row.subjekIndex]) {
            sub = JW_AGIHAN_SUBJEK[row.subjekIndex];
          } else {
            sub = JW_AGIHAN_SUBJEK.find(s => s.ID_Subjek === row.idSubjek || s.Kod_Subjek === row.idSubjek) || {};
          }

          const idSubjek = sub.ID_Subjek || row.idSubjek;
          const kodSubjek = sub.Kod_Subjek || idSubjek;
          const bilWaktu = sub.Bil_Waktu_Seminggu || 6;

          row.senaraiKelas.forEach(kelas => {
            flatList.push({
              ID_Kelas: kelas,
              ID_Subjek: idSubjek,
              Kod_Subjek: kodSubjek,
              Nama_Subjek: sub.Nama_Subjek || kodSubjek,
              ID_Guru_Utama: row.idGuruUtama,
              ID_Guru_Pair: row.idGuruPair || '',
              Bil_Waktu: parseInt(bilWaktu, 10)
            });
          });
        }
      });
      return flatList;
    }

    function formatSubjectDropdownLabel(subRow) {
      const idSub = subRow.ID_Subjek || '';
      const kod = subRow.Kod_Subjek || idSub;
      const nama = subRow.Nama_Subjek || subRow['Nama_Subjek / Komponen'] || '';
      const kateg = subRow.Kategori_Tahap || '';
      const isPair = String(subRow.Flag_CoTeaching || '').toUpperCase() === 'TRUE';

      let tagParts = [];
      if (kateg.includes('Tahap 1') || kateg.includes('Tahun 1')) tagParts.push('Thp 1');
      else if (kateg.includes('Tahap 2')) tagParts.push('Thp 2');
      else if (kateg.includes('Semua')) tagParts.push('Semua');
      else {
        if (idSub.includes('-T1')) tagParts.push('Thp 1');
        else if (idSub.includes('-T2')) tagParts.push('Thp 2');
        else tagParts.push('Semua');
      }

      if (isPair || idSub.toUpperCase().includes('PAIR')) tagParts.push('Pairing');

      const suffix = tagParts.length > 0 ? tagParts.join(' - ') : `${subRow.Bil_Waktu_Seminggu || 6}W`;
      return `${kod} - ${suffix} | ${nama}`;
    }

    // ================= PRESTASI & STATUS AGIHAN (FRONTEND SAHAJA) =================
    function jwEscapeHtml(val) {
      return String(val == null ? '' : val).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }

    function getSenaraiKelasAgihan() {
      const kelas = ALL_LOKASI
        .filter(l => String(l.Kategori || '').toLowerCase() === 'kelas')
        .map(l => String(l.Nama_Lokasi || '').trim())
        .filter(Boolean);
      // Fallback asal dikekalkan untuk keserasian; bukan rujukan rasmi jika Master_Lokasi tiada.
      if (!kelas.length) {
        for (let year = 1; year <= 6; year++) {
          ['Iris', 'Lavender', 'Violet'].forEach(name => kelas.push(`${year} ${name}`));
        }
      }
      return [...new Set(kelas)];
    }

    function getSubjekForAgihanRow(row) {
      if (!row) return {};
      if (Number.isInteger(row.subjekIndex) && JW_AGIHAN_SUBJEK[row.subjekIndex]) {
        return JW_AGIHAN_SUBJEK[row.subjekIndex];
      }
      return JW_AGIHAN_SUBJEK.find(s => s.ID_Subjek === row.idSubjek) ||
          JW_AGIHAN_SUBJEK.find(s => s.Kod_Subjek === row.idSubjek || s.Kod_Subjek === row.kodSubjek) || {};
    }

    function setAgihanSaveStatus(status) {
      const el = document.getElementById('jwAgihanSaveStatus');
      if (!el) return;
      const info = {
        saved: ['✓ Maklumat terkini', 'text-emerald-700'],
        dirty: ['● Ada perubahan belum disimpan', 'text-amber-800'],
        saving: ['⟳ Sedang menyimpan… anda boleh terus mengisi', 'text-brand-700'],
        pending: ['● Ada perubahan baharu semasa simpan; simpan sekali lagi', 'text-amber-800'],
        error: ['✕ Simpan gagal — perubahan masih di paparan', 'text-rose-700']
      }[status] || ['Data agihan', 'text-slate-600'];
      el.className = `text-[11px] font-bold ${info[1]}`;
      el.textContent = info[0];
    }

    function markAgihanChanged() {
      JW_AGIHAN_REVISION++;
      setAgihanSaveStatus(JW_AGIHAN_SAVING ? 'saving' : 'dirty');
      scheduleClassCoverageRefresh();
    }

    function scheduleClassCoverageRefresh() {
      if (JW_COVERAGE_TIMER !== null) clearTimeout(JW_COVERAGE_TIMER);
      // Kiraan berat dibuat selepas rentetan klik reda; checkbox masih boleh terus digunakan.
      JW_COVERAGE_TIMER = setTimeout(() => {
        JW_COVERAGE_TIMER = null;
        renderClassCoverageSummary();
        refreshAgihanTotalHours();
      }, 160);
    }

    function refreshAgihanTotalHours() {
      const totalMap = new Map();
      STATE_AGIHAN_GURU.forEach(row => {
        const sub = getSubjekForAgihanRow(row);
        const hours = (row.senaraiKelas || []).length * (parseInt(sub.Bil_Waktu_Seminggu, 10) || 0);
        if (row.idGuruUtama) totalMap.set(row.idGuruUtama, (totalMap.get(row.idGuruUtama) || 0) + hours);
        if (row.idGuruPair) totalMap.set(row.idGuruPair, (totalMap.get(row.idGuruPair) || 0) + hours);
      });
      document.querySelectorAll('[data-jw-total-teacher]').forEach(el => {
        const key = el.getAttribute('data-jw-total-teacher');
        el.textContent = `(${totalMap.get(key) || 0} w)`;
      });
    }

    function filterAgihanGuru() {
      const input = document.getElementById('inputCariGuruAgihan');
      const q = (input?.value || '').trim().toLocaleLowerCase('ms');
      const groups = new Set();
      document.querySelectorAll('#tbodyAgihanGuruMatrix tr[data-jw-guru]').forEach(tr => {
        const name = tr.getAttribute('data-jw-guru') || '';
        const visible = !q || name.toLocaleLowerCase('ms').includes(q);
        tr.classList.toggle('hidden', !visible);
        if (visible) groups.add(name);
      });
      const count = document.getElementById('jwAgihanFilterCount');
      if (count) count.textContent = q ? `${groups.size} guru ditemui` : '';
      if (window.currentOpenDropdownIdx !== null) {
        const open = document.getElementById(`jwAgihanRow_${window.currentOpenDropdownIdx}`);
        if (open?.classList.contains('hidden')) saveAndCloseMultiSelectDropdown(window.currentOpenDropdownIdx);
      }
    }

    function renderAgihanGuruMatrix() {
      const tbody = document.getElementById('tbodyAgihanGuruMatrix');
      if (!tbody) return;
      window.currentOpenDropdownIdx = null;
      const sortedStaf = getSortedStafList();
      const existingNames = STATE_AGIHAN_GURU.flatMap(r => [r.idGuruUtama, r.idGuruPair]).filter(Boolean);
      const masterNames = sortedStaf.map(g => g.Nama_Penuh);
      const semuaGuru = [...new Set([...masterNames, ...existingNames])];
      const optGuru = '<option value="">-- Pilih Guru --</option>' +
        semuaGuru.map(g => `<option value="${jwEscapeHtml(g)}">${jwEscapeHtml(g)}${masterNames.includes(g) ? '' : ' (semak status staf)'}</option>`).join('');

      const sourceSubjek = (JW_AGIHAN_SUBJEK && JW_AGIHAN_SUBJEK.length > 0) ? JW_AGIHAN_SUBJEK : ALL_MASTER_SUBJEK_LIST;
      const optSubjek = '<option value="">-- Pilih Subjek --</option>' +
        sourceSubjek.map((s, i) => `<option value="${jwEscapeHtml(`${s.ID_Subjek || s.Kod_Subjek}__${i}`)}">${jwEscapeHtml(formatSubjectDropdownLabel(s))}</option>`).join('');

      if (!STATE_AGIHAN_GURU.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="table-cell-std text-center text-slate-400 italic">Tiada agihan guru.</td></tr>';
        renderClassCoverageSummary();
        return;
      }

      const teacherGroups = [];
      let currentTeacher = null, currentGroup = null;
      STATE_AGIHAN_GURU.forEach((row, idx) => {
        const name = row.idGuruUtama || '';
        if (!currentGroup || currentTeacher !== name || !name) {
          currentTeacher = name;
          currentGroup = { guruName: name, rows: [] };
          teacherGroups.push(currentGroup);
        }
        currentGroup.rows.push({ data: row, originalIndex: idx });
      });

      const htmlRows = [];
      let bilCounter = 1;
      teacherGroups.forEach(group => {
        const rowspanCount = group.rows.length;
        const totalTeacherHours = calculateTotalWaktuGuru(group.guruName);
        group.rows.forEach((rowObj, subIdx) => {
          const idx = rowObj.originalIndex;
          const row = rowObj.data;
          const isFirst = subIdx === 0;
          const isLast = subIdx === rowspanCount - 1;
          const sub = getSubjekForAgihanRow(row);
          const isCoTeaching = String(sub.Flag_CoTeaching || '').toUpperCase() === 'TRUE';
          const rowHours = (row.senaraiKelas || []).length * (parseInt(sub.Bil_Waktu_Seminggu, 10) || 0);
          const optG1 = optGuru.replace(`value="${jwEscapeHtml(row.idGuruUtama)}"`, `value="${jwEscapeHtml(row.idGuruUtama)}" selected`);
          const optG2 = optGuru.replace(`value="${jwEscapeHtml(row.idGuruPair)}"`, `value="${jwEscapeHtml(row.idGuruPair)}" selected`);
          const matchIndex = JW_AGIHAN_SUBJEK.findIndex(s => s.ID_Subjek === row.idSubjek || s.Kod_Subjek === row.idSubjek);
          const currentSelectedVal = row.idSubjekUnique || (row.idSubjek && matchIndex >= 0 ? `${row.idSubjek}__${matchIndex}` : '');
          const optSub = optSubjek.replace(`value="${jwEscapeHtml(currentSelectedVal)}"`, `value="${jwEscapeHtml(currentSelectedVal)}" selected`);
          const classesDisplayHtml = (row.senaraiKelas || []).length
            ? row.senaraiKelas.map(c => `<div class="font-extrabold text-slate-800 text-[11px] leading-tight py-0.5"><i class="fa-solid fa-chalkboard-user text-amber-500 mr-1 text-[10px]"></i>${jwEscapeHtml(c)}</div>`).join('')
            : '<span class="text-slate-400 italic text-[11px]">-- Pilih Checkbox Kelas --</span>';
          const cellCoTeachingHtml = isCoTeaching
            ? `<select onchange="onSelectGuruPair(${idx}, this.value)" class="w-full p-1.5 border border-amber-300 rounded-lg text-xs font-semibold bg-white text-amber-900">${optG2}</select>`
            : '<span class="text-slate-400 font-extrabold text-center block pt-2">-</span>';
          let trHtml = `<tr id="jwAgihanRow_${idx}" data-jw-guru="${jwEscapeHtml(group.guruName)}" class="hover:bg-slate-50 transition border-b border-slate-200">`;
          if (isFirst) {
            trHtml += `
              <td rowspan="${rowspanCount}" class="table-cell-std text-center font-bold text-slate-400 align-top pt-3 bg-slate-50/50">${bilCounter++}</td>
              <td rowspan="${rowspanCount}" class="p-2 sticky-col-guru align-top min-w-[220px] w-64 bg-white border-r border-slate-200">
                <select onchange="onChangeAgihanGuruUtama(${idx}, this.value)" class="w-full p-2 border border-amber-300 rounded-xl text-xs font-extrabold text-amber-900 bg-amber-50/30 focus:outline-none shadow-2xs">${optG1}</select>
              </td>`;
          }
          trHtml += `
            <td class="p-2 align-top min-w-[240px]">
              <select onchange="onSelectAgihanSubjekUnique(this.value, ${idx})" class="w-full p-1.5 border border-amber-200 rounded-lg text-xs font-bold bg-white focus:outline-none text-slate-800">${optSub}</select>
            </td>
            <td class="p-2 align-top relative class-dropdown-container min-w-[180px]">
              <button type="button" onclick="toggleMultiSelectDropdown(${idx}, event)" aria-label="Pilih kelas bagi subjek ini" class="w-full p-2 border border-slate-300 rounded-xl bg-white text-left flex items-start justify-between shadow-2xs hover:bg-slate-50 transition">
                <div data-jw-class-display class="space-y-0.5 flex-1">${classesDisplayHtml}</div>
                <span data-jw-class-count class="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full shrink-0 font-extrabold ml-2 mt-0.5">${(row.senaraiKelas || []).length} Kelas</span>
              </button>
              <div id="ddClassList_${idx}" class="hidden absolute top-full left-0 mt-1 w-72 bg-white border border-slate-300 rounded-2xl shadow-2xl z-50 p-2.5 max-h-72 overflow-y-auto space-y-1">
                <div class="flex items-center justify-between px-1 pb-1.5 border-b border-slate-100">
                  <span class="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Pilih beberapa kelas</span>
                  <button type="button" onclick="saveAndCloseMultiSelectDropdown(${idx}, event)" class="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-2.5 py-1 rounded-md">Selesai</button>
                </div>
                <div data-jw-class-options></div>
              </div>
            </td>
            <td class="p-2 align-top w-48">${cellCoTeachingHtml}</td>
            <td class="p-2 align-top text-center w-28">
              <div data-jw-row-hours class="font-extrabold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-xs inline-block min-w-[45px]">${rowHours} w</div>
              ${isLast ? `<div data-jw-total-teacher="${jwEscapeHtml(group.guruName)}" class="mt-2 pt-1 border-t border-amber-200 font-black text-xs text-amber-900 bg-amber-100/90 py-1 px-1.5 rounded-lg border border-amber-300 shadow-2xs">(${totalTeacherHours} w)</div>` : ''}
            </td>
            <td class="p-2 align-top text-center w-32 space-x-1">
              <button onclick="tambahSubjekUntukGuru(STATE_AGIHAN_GURU[${idx}].idGuruUtama, ${idx})" title="Tambah Subjek" class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[11px] rounded-lg border border-amber-300"><i class="fa-solid fa-plus text-[10px]"></i> Subjek</button>
              <button onclick="padamBarisAgihanGuru(${idx})" title="Padam Baris" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] rounded-lg border border-rose-200"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`;
          htmlRows.push(trHtml);
        });
      });
      // Sekali sahaja innerHTML — elak pembinaan semula keseluruhan jadual bagi setiap baris.
      tbody.innerHTML = htmlRows.join('');
      filterAgihanGuru();
      renderClassCoverageSummary();
    }

    function onChangeAgihanGuruUtama(idx, value) {
      const row = STATE_AGIHAN_GURU[idx];
      if (!row) return;
      row.idGuruUtama = value;
      markAgihanChanged();
      renderAgihanGuruMatrix();
    }

    function onSelectAgihanSubjekUnique(val, idx) {
      const row = STATE_AGIHAN_GURU[idx];
      if (!row) return;
      if (!val) {
        row.idSubjek = '';
        row.kodSubjek = '';
        row.idSubjekUnique = '';
        row.subjekIndex = null;
      } else {
        const subIndex = parseInt(val.split('__').pop(), 10);
        const subObj = JW_AGIHAN_SUBJEK[subIndex] || {};
        row.idSubjek = subObj.ID_Subjek || val.split('__')[0];
        row.kodSubjek = subObj.Kod_Subjek || row.idSubjek;
        row.subjekIndex = subIndex;
        row.idSubjekUnique = val;
      }
      markAgihanChanged();
      renderAgihanGuruMatrix();
    }

    function tambahSubjekUntukGuru(guruName, idx) {
      STATE_AGIHAN_GURU.splice(idx + 1, 0, {
        idGuruUtama: guruName, idSubjek: '', kodSubjek: '', idGuruPair: '', senaraiKelas: []
      });
      markAgihanChanged();
      renderAgihanGuruMatrix();
    }

    function tambahBarisGuruTambahanManual() {
      STATE_AGIHAN_GURU.push({
        idGuruUtama: '', idSubjek: '', kodSubjek: '', idGuruPair: '', senaraiKelas: []
      });
      markAgihanChanged();
      renderAgihanGuruMatrix();
    }

    function buildAgihanClassOptions(idx) {
      const row = STATE_AGIHAN_GURU[idx];
      if (!row) return '';
      const selected = new Set(row.senaraiKelas || []);
      const allClasses = [...new Set([...getSenaraiKelasAgihan(), ...selected])];
      const taken = new Map();
      const subjectId = row.idSubjek || row.kodSubjek;
      if (subjectId) STATE_AGIHAN_GURU.forEach((r, n) => {
        if (n === idx) return;
        if (r.idSubjek === subjectId || r.kodSubjek === subjectId) {
          (r.senaraiKelas || []).forEach(k => taken.set(k, r.idGuruUtama || 'guru lain'));
        }
      });
      return allClasses.map(kelas => {
        const checked = selected.has(kelas);
        const locked = taken.has(kelas) && !checked;
        const hint = locked ? `<span class="block text-[10px] text-amber-700">Sudah diagih: ${jwEscapeHtml(taken.get(kelas))}</span>` : '';
        return `<label class="flex items-start gap-2 p-2 hover:bg-slate-100 rounded-lg cursor-pointer text-xs font-semibold ${locked ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700'}">
          <input type="checkbox" value="${jwEscapeHtml(kelas)}" ${checked ? 'checked' : ''} ${locked ? 'disabled' : ''}
            onchange="onAgihanClassCheckboxChange(this, ${idx})" class="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 shrink-0 mt-0.5">
          <span>${jwEscapeHtml(kelas)}${hint}</span>
        </label>`;
      }).join('');
    }

    function toggleMultiSelectDropdown(idx, event) {
      if (event) event.stopPropagation();
      const target = document.getElementById(`ddClassList_${idx}`);
      if (!target) return;
      if (!target.classList.contains('hidden')) {
        saveAndCloseMultiSelectDropdown(idx);
        return;
      }
      if (window.currentOpenDropdownIdx !== null && window.currentOpenDropdownIdx !== idx) {
        saveAndCloseMultiSelectDropdown(window.currentOpenDropdownIdx);
      }
      const options = target.querySelector('[data-jw-class-options]');
      if (options) options.innerHTML = buildAgihanClassOptions(idx); // Dibina hanya apabila perlu.
      target.classList.remove('hidden');
      window.currentOpenDropdownIdx = idx;
    }

    function onAgihanClassCheckboxChange(chk, idx) {
      const row = STATE_AGIHAN_GURU[idx];
      if (!row) return;
      const selected = new Set(row.senaraiKelas || []);
      if (chk.checked) selected.add(chk.value);
      else selected.delete(chk.value);
      row.senaraiKelas = Array.from(selected);
      // Tiada renderAgihanGuruMatrix() di sini: checkbox kekal responsif.
      updateAgihanRowClassDisplay(idx);
      markAgihanChanged();
    }

    function updateAgihanRowClassDisplay(idx) {
      const row = STATE_AGIHAN_GURU[idx];
      const tr = document.getElementById(`jwAgihanRow_${idx}`);
      if (!row || !tr) return;
      const display = tr.querySelector('[data-jw-class-display]');
      const count = tr.querySelector('[data-jw-class-count]');
      const hours = tr.querySelector('[data-jw-row-hours]');
      if (display) display.innerHTML = (row.senaraiKelas || []).length
        ? row.senaraiKelas.map(c => `<div class="font-extrabold text-slate-800 text-[11px] leading-tight py-0.5"><i class="fa-solid fa-chalkboard-user text-amber-500 mr-1 text-[10px]"></i>${jwEscapeHtml(c)}</div>`).join('')
        : '<span class="text-slate-400 italic text-[11px]">-- Pilih Checkbox Kelas --</span>';
      if (count) count.textContent = `${(row.senaraiKelas || []).length} Kelas`;
      const sub = getSubjekForAgihanRow(row);
      if (hours) hours.textContent = `${(row.senaraiKelas || []).length * (parseInt(sub.Bil_Waktu_Seminggu, 10) || 0)} w`;
    }

    function saveAndCloseMultiSelectDropdown(idx, event) {
      if (event) event.stopPropagation();
      const target = document.getElementById(`ddClassList_${idx}`);
      if (target) {
        target.classList.add('hidden');
        const options = target.querySelector('[data-jw-class-options]');
        if (options) options.innerHTML = ''; // Bebaskan checkbox sementara.
      }
      if (window.currentOpenDropdownIdx === idx) window.currentOpenDropdownIdx = null;
      // Semua checkbox sudah disimpan dalam STATE_AGIHAN_GURU ketika diklik.
      // Tiada rendering semula — mengelakkan lag ketika memilih kelas seterusnya.
    }

    async function padamBarisAgihanGuru(idx) {
      const row = STATE_AGIHAN_GURU[idx];
      if (!row) return;
      if (row.idSubjek || (row.senaraiKelas || []).length) {
        const confirm = await Swal.fire({
          icon: 'warning', title: 'Padam tugasan guru?',
          text: `${row.idGuruUtama || 'Guru'} — ${(row.senaraiKelas || []).length} kelas. Perubahan belum disimpan.`,
          showCancelButton: true, confirmButtonText: 'Ya, padam baris', cancelButtonText: 'Batal',
          confirmButtonColor: '#dc2626'
        });
        if (!confirm.isConfirmed) return;
      }
      // Cari objek asal jika indeks berubah akibat tindakan pengguna semasa dialog dibuka.
      const currentIdx = STATE_AGIHAN_GURU.indexOf(row);
      if (currentIdx === -1) return;
      STATE_AGIHAN_GURU.splice(currentIdx, 1);
      markAgihanChanged();
      renderAgihanGuruMatrix();
    }

    function getRequiredSubjectsForClass(className) {
      if (!className) return [];
      const match = className.match(/\d+/);
      const year = match ? parseInt(match[0], 10) : 0;
      // Logik kategori asal dikekalkan supaya status konsisten dengan tetapan sedia ada.
      return (JW_AGIHAN_SUBJEK || []).filter(s => {
        const kateg = String(s.Kategori_Tahap || '').toLowerCase();
        if (kateg.includes('semua')) return true;
        if ((kateg.includes('tahap 1') || kateg.includes('thp 1')) && year >= 1 && year <= 3) return true;
        if ((kateg.includes('tahap 2') || kateg.includes('thp 2')) && year >= 4) return true;
        if (kateg.includes('tahun 1') && year === 1) return true;
        if (kateg.includes('tahun 2') && (year === 2 || year === 3)) return true;
        return false;
      });
    }

    function getClassCoverageDetails(kelas, allFlat) {
      const flat = allFlat || prepareFlatAgihanForBackend();
      const required = getRequiredSubjectsForClass(kelas);
      const assigned = flat.filter(f => f.ID_Kelas === kelas);
      const keyOf = obj => String(obj.ID_Subjek || obj.Kod_Subjek || '').trim();
      const requiredIds = new Set(required.map(keyOf));
      const grouped = new Map();
      assigned.forEach(f => {
        const key = keyOf(f);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(f);
      });
      const missing = required.filter(s => !grouped.has(keyOf(s)));
      const completeCount = required.length - missing.length;
      const duplicate = [...grouped].filter(([key, rows]) => rows.length > 1);
      const extra = assigned.filter(f => !requiredIds.has(keyOf(f)));
      const pairMissing = required.filter(s => String(s.Flag_CoTeaching || '').toUpperCase() === 'TRUE')
        .flatMap(s => (grouped.get(keyOf(s)) || []).filter(a => !a.ID_Guru_Pair).map(a => s));
      const hoursExpected = required.reduce((n,s) => n + (parseInt(s.Bil_Waktu_Seminggu, 10) || 0),0);
      const hoursAssigned = assigned.reduce((n,a) => n + (parseInt(a.Bil_Waktu, 10) || 0),0);
      return {kelas, required, assigned, grouped, missing, completeCount, duplicate, extra, pairMissing, hoursExpected, hoursAssigned, valid: required.length > 0 && !missing.length && !duplicate.length && !extra.length && !pairMissing.length};
    }

    function renderClassCoverageSummary() {
      const container = document.getElementById('boxClassCoverageSummary');
      if (!container) return;
      const flat = prepareFlatAgihanForBackend();
      const classes = getSenaraiKelasAgihan();
      container.innerHTML = classes.map(kelas => {
        const d = getClassCoverageDetails(kelas, flat);
        let badgeClass = 'bg-slate-100 text-slate-500 border-slate-300';
        let statusText = 'Tiada Tetapan';
        if (d.required.length > 0) {
          statusText = `${d.completeCount} / ${d.required.length} Subjek`;
          if (d.valid) badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
          else if (!d.completeCount) badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
          else badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
        }
        const extraIssue = d.duplicate.length || d.extra.length || d.pairMissing.length;
        return `<button type="button" onclick="showClassCoverageDetails('${encodeURIComponent(kelas)}')"
          title="Klik untuk lihat subjek lengkap, belum diisi dan guru"
          class="w-full p-2 border rounded-xl flex items-center justify-between gap-1 ${badgeClass} shadow-2xs hover:shadow-md hover:ring-2 hover:ring-amber-300 transition text-left focus:outline-none focus:ring-2 focus:ring-amber-400">
          <span class="font-extrabold text-xs">${jwEscapeHtml(kelas)}</span>
          <span class="flex items-center gap-1">
            ${extraIssue ? '<i class="fa-solid fa-triangle-exclamation text-amber-700 text-[10px]"></i>' : ''}
            <span class="text-[10px] px-1.5 py-0.5 rounded-md font-black bg-white/80 border border-black/5 whitespace-nowrap">${statusText}</span>
          </span>
        </button>`;
      }).join('');
    }

    function showClassCoverageDetails(encodedClass) {
      const kelas = decodeURIComponent(encodedClass);
      const d = getClassCoverageDetails(kelas);
      const subjectLabel = s => `${s.Kod_Subjek || s.ID_Subjek || 'SUBJEK'} — ${s.Nama_Subjek || s.Kod_Subjek || ''}`;
      const keyOf = s => String(s.ID_Subjek || s.Kod_Subjek || '').trim();
      const missingHtml = d.missing.length
        ? `<div class="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3 text-left">
             <div class="font-extrabold text-rose-800 mb-2"><i class="fa-solid fa-circle-exclamation mr-1"></i> Belum diagihkan (${d.missing.length})</div>
             ${d.missing.map(s => `<div class="py-1 border-b border-rose-100 last:border-0 text-xs">${jwEscapeHtml(subjectLabel(s))} <strong>(${parseInt(s.Bil_Waktu_Seminggu,10)||0} waktu)</strong></div>`).join('')}
           </div>`
        : '<div class="bg-emerald-50 border border-emerald-200 text-emerald-800 text-left text-xs font-bold p-3 rounded-xl mb-3">✓ Semua subjek yang diwajibkan oleh tetapan telah mempunyai agihan.</div>';
      const subjectRows = d.required.map(s => {
        const rows = d.grouped.get(keyOf(s)) || [];
        const ok = rows.length === 1 && (String(s.Flag_CoTeaching || '').toUpperCase() !== 'TRUE' || Boolean(rows[0].ID_Guru_Pair));
        const guru = rows.map(a => `${a.ID_Guru_Utama}${a.ID_Guru_Pair ? ' / '+a.ID_Guru_Pair : ''}`).join(' ; ') || 'Belum diagihkan';
        return `<tr class="border-b border-slate-100">
          <td class="p-2 text-xs text-left"><div class="font-bold">${jwEscapeHtml(s.Kod_Subjek || s.ID_Subjek)}</div><div class="text-slate-500">${jwEscapeHtml(s.Nama_Subjek || '')}</div></td>
          <td class="p-2 text-xs text-center">${parseInt(s.Bil_Waktu_Seminggu,10)||0}</td>
          <td class="p-2 text-xs text-left break-words">${jwEscapeHtml(guru)}</td>
          <td class="p-2 text-xs text-center font-bold ${ok ? 'text-emerald-700' : 'text-rose-700'}">${ok ? '✓' : rows.length > 1 ? 'Duplikasi' : rows.length ? 'Semak pasangan' : 'Belum'}</td>
        </tr>`;
      }).join('');
      const warnings = [];
      if (d.duplicate.length) warnings.push(`${d.duplicate.length} subjek mempunyai lebih daripada satu agihan untuk kelas ini.`);
      if (d.pairMissing.length) warnings.push(`${d.pairMissing.length} agihan Co-Teaching belum mempunyai guru pasangan.`);
      if (d.extra.length) warnings.push(`${d.extra.length} agihan tiada dalam senarai subjek wajib kategori kelas ini (semak tetapan/kategori).`);
      const warningsHtml = warnings.length ? `<div class="rounded-xl bg-amber-50 text-amber-900 border border-amber-200 p-3 mb-3 text-xs text-left">${warnings.map(x => `<div class="mb-1">⚠ ${jwEscapeHtml(x)}</div>`).join('')}</div>` : '';
      const content = `<div class="text-left text-xs text-slate-600 mb-3">Status berdasarkan <strong>Tetapan Subjek</strong> dan <strong>Agihan Guru</strong> semasa pada paparan (termasuk perubahan yang belum disimpan).</div>
        <div class="grid grid-cols-3 gap-2 mb-3 text-center">
          <div class="bg-slate-100 p-2 rounded-lg"><div class="font-black text-lg text-slate-800">${d.completeCount}/${d.required.length}</div><div class="text-[10px]">Subjek diagih</div></div>
          <div class="bg-slate-100 p-2 rounded-lg"><div class="font-black text-lg text-slate-800">${d.hoursExpected}</div><div class="text-[10px]">Waktu diperlukan</div></div>
          <div class="bg-slate-100 p-2 rounded-lg"><div class="font-black text-lg text-slate-800">${d.hoursAssigned}</div><div class="text-[10px]">Waktu diagih</div></div>
        </div>
        ${missingHtml}${warningsHtml}
        <div class="max-h-[46vh] overflow-y-auto border border-slate-200 rounded-xl">
          <table class="w-full text-xs border-collapse"><thead class="bg-slate-100 sticky top-0"><tr>
            <th class="p-2 text-left">Subjek</th><th class="p-2">Waktu</th><th class="p-2 text-left">Guru Utama / Pasangan</th><th class="p-2">Status</th>
          </tr></thead><tbody>${subjectRows || '<tr><td colspan="4" class="p-4 text-center">Tiada subjek yang ditetapkan untuk kategori kelas ini.</td></tr>'}</tbody></table>
        </div>`;
      Swal.fire({title: `Semakan Kelas: ${kelas}`, html: content, width: 800,
        confirmButtonText: 'Tutup', confirmButtonColor: '#d97706',
        customClass: {htmlContainer: 'text-left'} });
    }

    function toggleClassCoverageSummary() {
      document.getElementById('boxClassCoverageSummary').classList.toggle('hidden');
    }

    async function simpanAgihanTugas() {
      if (JW_AGIHAN_SAVING) return;
      const flatList = prepareFlatAgihanForBackend();
      const snapshotRevision = JW_AGIHAN_REVISION;
      JW_AGIHAN_SAVING = true;
      const button = document.getElementById('btnSimpanAgihan');
      if (button) button.disabled = true;
      setAgihanSaveStatus('saving');
      try {
        // Simpan secara async tanpa mengunci UI; pengguna boleh terus mengisi agihan.
        const res = await postToBackend({ action: 'saveJWConstraints', data: { type: 'agihan', data: flatList } });
        if (!res || !res.success) throw new Error(res?.error || 'Backend tidak mengesahkan simpanan.');
        const hasNewChanges = JW_AGIHAN_REVISION !== snapshotRevision;
        setAgihanSaveStatus(hasNewChanges ? 'pending' : 'saved');
        Swal.fire({toast:true,position:'top-end',icon:'success',
          title:hasNewChanges ? 'Perubahan terdahulu disimpan. Masih ada perubahan baharu.' : 'Agihan berjaya disimpan.',
          showConfirmButton:false,timer:2500,timerProgressBar:true});
      } catch (err) {
        setAgihanSaveStatus('error');
        console.error('Simpan agihan belum berjaya:',err);
        Swal.fire('Agihan belum disimpan', 'Sila cuba lagi. Perubahan pada paparan masih tersedia.', 'error');
      } finally {
        JW_AGIHAN_SAVING = false;
        if (button) button.disabled = false;
      }
    }

    // ================= 4. HAD GURU =================
    function renderGuruConstraintTable() {
      const tbody = document.getElementById('tbodyGuruConstraint');
      if (!tbody) return;

      tbody.innerHTML = '';

      const sortedStaf = getSortedStafList();
      let optGuru = '<option value="">-- Pilih Guru --</option>';
      sortedStaf.forEach(g => {
        optGuru += `<option value="${g.Nama_Penuh}">${g.Nama_Penuh}</option>`;
      });

      if (STATE_GURU_CONSTRAINT.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-cell-std text-center text-slate-400 italic">Tiada had guru. Klik "+ Had Guru".</td></tr>`;
        return;
      }

      STATE_GURU_CONSTRAINT.forEach((row, idx) => {
        let optG = optGuru.replace(`value="${row.Nama_Guru}"`, `value="${row.Nama_Guru}" selected`);

        tbody.innerHTML += `
          <tr data-subject-index="${idx}" class="jw-subject-data-row hover:bg-slate-50 transition">
            <td class="table-cell-std text-center font-bold text-slate-400">${idx + 1}</td>
            <td class="p-1.5"><select data-field="Nama_Guru" class="w-full p-1.5 border rounded-lg text-xs font-extrabold text-purple-800 bg-white">${optG}</select></td>
            <td class="p-1.5"><input type="number" data-field="Max_Waktu_Sehari" value="${row.Max_Waktu_Sehari || 6}" class="w-full p-1.5 border rounded-lg text-xs font-bold text-center bg-white"></td>
            <td class="p-1.5"><input type="number" data-field="Max_Waktu_Berturut" value="${row.Max_Waktu_Berturut || 3}" class="w-full p-1.5 border rounded-lg text-xs font-bold text-center bg-white"></td>
            <td class="p-1.5"><input type="text" data-field="Slot_Dikunci_Off" value="${row.Slot_Dikunci_Off || ''}" placeholder="e.g. Isnin-W1, Isnin-W2" class="w-full p-1.5 border rounded-lg text-xs font-semibold bg-white"></td>
            <td class="table-cell-std text-center">
              <button onclick="padamBarisGuruConstraint(${idx})" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg transition"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>
        `;
      });
    }

    function tambahBarisGuruConstraint() {
      STATE_GURU_CONSTRAINT.push({
        Nama_Guru: '',
        Max_Waktu_Sehari: 6,
        Max_Waktu_Berturut: 3,
        Slot_Dikunci_Off: ''
      });
      renderGuruConstraintTable();
    }

    function padamBarisGuruConstraint(idx) {
      STATE_GURU_CONSTRAINT.splice(idx, 1);
      renderGuruConstraintTable();
    }

    async function simpanGuruConstraints() {
      showLoader('', 'save');
      try {
        const res = await postToBackend({ action: 'saveJWConstraints', data: { type: 'guru', data: STATE_GURU_CONSTRAINT } });
        hideLoader();
        if (res && res.success) Swal.fire('Berjaya', 'Tetapan guru telah disimpan.', 'success');
        else { console.warn('Simpan had guru gagal:',res?.error); Swal.fire('Belum disimpan','Sila cuba lagi.','error'); }
      } catch (err) {
        hideLoader();
        console.error(err);
        Swal.fire('Sambungan terganggu','Sila cuba lagi.','error');
      }
    }

    // ================= 5. ENJIN GENERATOR & GRID JADUAL =================
    // Hasil yang disimpan hanya mempunyai Slot_ID; hari ditentukan daripada prefix slot.
    // Ini memastikan refresh memaparkan jadual sebenar, bukan grid kosong.
    function normalizeJwHasilRows(rows) {
      const dayPrefix = {ISN:'Isnin', SEL:'Selasa', RAB:'Rabu', KHM:'Khamis', JUM:'Jumaat'};
      return (Array.isArray(rows) ? rows : []).map(r => {
        const slot = String(r.Slot_ID || r.slotId || '').trim().toUpperCase();
        const prefix = slot.split('-')[0];
        const day = r.Hari || r.hari || dayPrefix[prefix] || '';
        return {...r, Hari:day, hari:day};
      });
    }

    function setJwHasilStatus(mode) {
      const box = document.getElementById('jwHasilStatus');
      const text = document.getElementById('jwHasilStatusText');
      if (!box || !text) return;
      const variants = {
        loading:['Sedang memuatkan jadual waktu semasa…','fa-circle-notch fa-spin','border-sky-100 bg-sky-50 text-sky-800'],
        ready:['Jadual waktu semasa telah tersedia.','fa-circle-check','border-emerald-100 bg-emerald-50 text-emerald-800'],
        empty:['Belum ada jadual waktu untuk dipaparkan.','fa-calendar-plus','border-amber-100 bg-amber-50 text-amber-800'],
        error:['Jadual belum dapat dipaparkan. Cuba Segarkan Data.','fa-triangle-exclamation','border-rose-100 bg-rose-50 text-rose-800']
      };
      const [label,iconName,colors] = variants[mode] || variants.loading;
      box.className = 'rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 toolbar-no-print ' + colors;
      box.querySelector('i').className = 'fa-solid ' + iconName;
      text.textContent = label;
    }

    function syncJwActionButtons() {
      const shuffle = document.getElementById('btnShuffleJW');
      const generate = document.getElementById('btnGenerateJW');
      if (shuffle) shuffle.disabled = JW_BUSY_TIMETABLE || STATE_HASIL_JADUAL.length === 0;
      if (generate) generate.disabled = JW_BUSY_TIMETABLE;
    }

    async function shuffleJadualWaktuFrontend() {
      if (JW_BUSY_TIMETABLE || !STATE_HASIL_JADUAL.length) return;
      const confirm = await Swal.fire({
        icon:'question', title:'Cuba susunan jadual lain?',
        text:'Tetapan guru dan subjek tidak berubah. Susunan semasa disimpan sebagai salinan jika jadual baharu berjaya.',
        showCancelButton:true, confirmButtonText:'Shuffle Jadual', cancelButtonText:'Batal',
        confirmButtonColor:'#0891b2'
      });
      if (!confirm.isConfirmed) return;
      JW_BUSY_TIMETABLE = true;
      syncJwActionButtons();
      showLoader('', 'shuffle');
      try {
        const result = await postToBackend({action:'shuffleJadualWaktu',data:{tahun:'2026'}});
        if (result && result.success && result.saved) {
          const refreshed = await loadJadualHasil();
          await Swal.fire({icon:refreshed?'success':'info',
            title:refreshed?'Susunan baharu tersedia':'Jadual baharu telah disimpan',
            text:refreshed
              ? 'Jadual semasa berjaya digantikan. Salinan jadual terdahulu turut disimpan.'
              : 'Jadual baharu sudah disimpan tetapi paparan belum berjaya dikemas kini. Klik Segarkan Data.',
            confirmButtonText:refreshed?'Lihat Jadual':'Faham'});
          const btn = document.querySelector('.nav-tab[onclick*="viewGeneratorConsole"]');
          switchView('viewGeneratorConsole',btn);
        } else if (result && result.unchanged) {
          Swal.fire({icon:'info',title:'Susunan masih sama',
            text:'Tiada perubahan dibuat. Anda boleh cuba Shuffle sekali lagi.'});
        } else {
          console.warn('Shuffle belum berjaya:',result);
          Swal.fire({icon:'info',title:'Belum menemui susunan lain',
            text:'Jadual semasa kekal dan tidak berubah. Anda boleh cuba lagi.'});
        }
      } catch(err) {
        console.error('Shuffle terganggu:',err);
        Swal.fire({icon:'error',title:'Sambungan terganggu',
          text:'Semak jadual semasa sebelum mencuba lagi.'});
      } finally {
        JW_BUSY_TIMETABLE = false;
        hideLoader();
        syncJwActionButtons();
      }
    }

    async function janaJadualWaktuAuto() {
      if (JW_BUSY_TIMETABLE) return;
      JW_BUSY_TIMETABLE = true;
      syncJwActionButtons();
      showLoader('', 'generate');
      try {
        const res = await postToBackend({ action: 'generateJadualWaktu', data: { tahun: '2026' } });
        hideLoader();

        if (res && res.success) {
          STATE_HASIL_JADUAL = normalizeJwHasilRows(res.timetable);
          setJwHasilStatus(STATE_HASIL_JADUAL.length ? 'ready' : 'empty');
          
          const boxReport = document.getElementById('boxClashReport');
          const clashContainer = document.getElementById('clashLogContainer');
          const badgeCount = document.getElementById('badgeClashCount');

          if (res.clashCount > 0) {
            boxReport.classList.remove('hidden');
            badgeCount.innerText = `${res.clashCount} Ralat`;
            clashContainer.innerHTML = res.clashLogs.map(l => `<div class="p-2 bg-rose-50 border border-rose-200 rounded-lg font-bold text-rose-700">${l}</div>`).join('');
          } else {
            boxReport.classList.remove('hidden');
            badgeCount.className = "text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700";
            badgeCount.innerText = "Semakan selesai";
            clashContainer.innerHTML = `<div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-semibold text-emerald-700"><i class="fa-solid fa-circle-check mr-2"></i> Jadual waktu berjaya disusun dan tersedia untuk semakan.</div>`;
          }

          Swal.fire('Jadual berjaya disediakan', 'Anda boleh menyemak atau mencetak jadual waktu sekarang.', 'success');
          renderJadualHasilView();
          JW_HASIL_VIEW_RENDERED = true;
        } else {
          console.warn('Penjanaan belum berjaya:',res?.error);
          Swal.fire('Jadual belum dapat disediakan', 'Sila semak tetapan dan cuba lagi.', 'error');
        }
      } catch (err) {
        hideLoader();
        console.error('Sambungan penjanaan terganggu:',err);
        Swal.fire('Sambungan terganggu', 'Sila semak sambungan internet dan cuba lagi.', 'error');
      } finally {
        JW_BUSY_TIMETABLE = false;
        syncJwActionButtons();
      }
    }

    async function loadJadualHasil() {
      const currentRequest = ++JW_HASIL_FETCH_COUNTER;
      try {
        const res = await postToBackend({ action: 'getJadualWaktuHasil' });
        if (currentRequest !== JW_HASIL_FETCH_COUNTER) return false;
        if (!res || !res.success) throw new Error('Jadual belum tersedia');
        STATE_HASIL_JADUAL = normalizeJwHasilRows(res.data);
        JW_HASIL_VIEW_RENDERED = false;
        setJwHasilStatus(STATE_HASIL_JADUAL.length ? 'ready' : 'empty');
        const view = document.getElementById('viewGeneratorConsole');
        if (view && !view.classList.contains('hidden')) {
          renderJadualHasilView();
          JW_HASIL_VIEW_RENDERED = true;
        }
        syncJwActionButtons();
        return true;
      } catch (err) {
        console.warn('Jadual sedia ada belum dapat dimuatkan:',err);
        setJwHasilStatus('error');
        return false;
      }
    }

    // FUNGSI RENDER MATRIKS aSc STYLE (GURU: TIANG REHAT 1 & 2 SERENTAK + SEMUA GURU; KELAS: REHAT TAHAP)
    function renderJadualHasilReferenceView() {
      const container = document.getElementById('containerHasilJadualView');
      if (!container) return;
      if (!STATE_HASIL_JADUAL || STATE_HASIL_JADUAL.length === 0) {
        container.innerHTML = '<div class="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">Jadual waktu belum tersedia. Anda boleh menjana jadual baharu apabila bersedia.</div>';
        return;
      }

      const mode = document.getElementById('selFilterViewJadual').value;
      const days = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];

      let html = '';

      if (mode === 'guru') {
        const allTeachers = getSortedStafList();

        allTeachers.forEach(staf => {
          const entityName = staf.Nama_Penuh;
          const items = STATE_HASIL_JADUAL.filter(j => {
            return (j.ID_Guru_Utama || j.idGuruUtama) === entityName || (j.ID_Guru_Pair || j.idGuruPair) === entityName;
          });

          // GRID KELAS GURU MEMPUNYAI DUA-DUA REHAT (REHAT 1 & REHAT 2) + WAKTU 9 DIPERTANDAKAN
          const teacherGridCols = [
            { id: '01', noW: '1', label: '1<br>7:40-8:10' },
            { id: '02', noW: '2', label: '2<br>8:10-8:40' },
            { id: '03', noW: '3', label: '3<br>8:40-9:10' },
            { id: '04', noW: '4', label: '4<br>9:10-9:40' },
            { id: '05', noW: 'R1', label: 'REHAT1<br>9:40-10:00', isRehat: true, rehatType: 'R1' },
            { id: '06', noW: '5T2', label: '5 (T2)<br>9:40-10:10' },
            { id: '07', noW: '5T1', label: '5 (T1)<br>10:00-10:30' },
            { id: '08', noW: 'R2', label: 'REHAT2<br>10:10-10:30', isRehat: true, rehatType: 'R2' },
            { id: '09', noW: '6', label: '6<br>10:30-11:00' },
            { id: '10', noW: '7', label: '7<br>11:00-11:30' },
            { id: '11', noW: '8', label: '8<br>11:30-12:00' },
            { id: '12', noW: '9', label: '9<br>12:00-12:30' }, // DIPERBETULKAN DI SINI
            { id: '13', noW: '10', label: '10<br>12:30-13:00' },
            { id: '14', noW: '11', label: '11<br>13:00-13:30' }
          ];

          const statMap = {};
          let totalWaktuCount = 0;

          items.forEach(it => {
            if (it.ID_Kelas === 'ALL' || it.idSubjek === 'PER' || it.idSubjek === 'RHT' || it.kodSubjek === 'REHAT') return;
            const subKey = it.Kod_Subjek || it.kodSubjek || it.ID_Subjek || it.idSubjek;
            if (subKey) {
              statMap[subKey] = (statMap[subKey] || 0) + 1;
              totalWaktuCount++;
            }
          });

          html += `
            <div class="bg-white border-2 border-slate-900 rounded-none p-4 mb-8 asc-card-print shadow-xs">
              <div class="text-center pb-2 mb-2 border-b border-slate-300">
                <h2 class="font-display font-extrabold text-lg text-slate-900 uppercase tracking-tight">JADUAL WAKTU GURU: ${entityName}</h2>
                <p class="text-xs font-semibold text-slate-600">SEKOLAH KEBANGSAAN SEGAMBUT MAKMUR | JUMLAH WAKTU: ${totalWaktuCount} WAKTU</p>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-black text-center text-xs">
                  <thead>
                    <tr>
                      <th class="asc-grid-th w-14">HARI</th>
                      ${teacherGridCols.map(c => `<th class="asc-grid-th ${c.isRehat ? 'bg-amber-100 text-amber-900 font-black' : ''}">${c.label}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
          `;

          days.forEach((day, dIdx) => {
            html += `<tr><td class="asc-grid-td font-extrabold bg-slate-100 text-slate-900 border-black">${day}</td>`;

            for (let cIdx = 0; cIdx < teacherGridCols.length; cIdx++) {
              const col = teacherGridCols[cIdx];

              if (col.isRehat) {
                if (dIdx === 0) {
                  html += `<td rowspan="5" class="asc-rehat-cell">${col.rehatType === 'R1' ? 'REHAT 1' : 'REHAT 2'}</td>`;
                }
                continue;
              }

              // SEMAKAN PERHIMPUNAN ISNIN W1
              if (day === 'Isnin' && col.id === '01') {
                html += `<td class="asc-grid-td font-black bg-slate-200 text-slate-900 border-black">PER</td>`;
                continue;
              }

              const matched = items.find(it => {
                const itemDay = String(it.Hari || it.hari || '').trim();
                const itemSlot = String(it.Slot_ID || it.slotId || '').trim();
                return (itemDay.toLowerCase() === day.toLowerCase() && itemSlot.includes(`SLOT-${col.id}`));
              });

              if (matched) {
                const subKey = matched.Kod_Subjek || matched.kodSubjek || matched.ID_Subjek || matched.idSubjek;
                const clsKey = matched.ID_Kelas || matched.idKelas;

                let colspanVal = 1;
                // SEMAK SAMA ADA SLOT BERSEBELAHAN MEMPUNYAI SUBJEK & KELAS YANG SAMA (COLSPAN)
                if (cIdx + 1 < teacherGridCols.length && !teacherGridCols[cIdx + 1].isRehat) {
                  const nextCol = teacherGridCols[cIdx + 1];
                  const nextMatched = items.find(it => {
                    const itemDay = String(it.Hari || it.hari || '').trim();
                    const itemSlot = String(it.Slot_ID || it.slotId || '').trim();
                    return (itemDay.toLowerCase() === day.toLowerCase() && itemSlot.includes(`SLOT-${nextCol.id}`));
                  });

                  if (nextMatched && (nextMatched.Kod_Subjek || nextMatched.kodSubjek) === subKey && (nextMatched.ID_Kelas || nextMatched.idKelas) === clsKey) {
                    colspanVal = 2;
                    cIdx++; // LOMPAT SLOT NEXT
                  }
                }

                const printContent = `<div class="font-extrabold text-xs text-slate-900">${subKey}</div><div class="text-[10px] text-slate-700">${clsKey}</div>`;
                html += `<td colspan="${colspanVal}" class="asc-grid-td font-extrabold bg-white text-slate-900 border-black">${printContent}</td>`;
              } else {
                html += `<td class="asc-grid-td text-slate-300 border-black">-</td>`;
              }
            }

            html += `</tr>`;
          });

          html += `
                  </tbody>
                </table>
              </div>

              <div class="mt-3 flex justify-between items-start text-[10px]">
                <div class="text-slate-500 italic">
                  Jadual waktu dijana: ${new Date().toLocaleDateString('ms-MY')} | aSc Jadual Waktu
                </div>
                <table class="border-collapse border border-black text-left text-[10px] w-64">
                  <thead>
                    <tr class="bg-slate-100"><th class="border border-black p-1">Subjek</th><th class="border border-black p-1 text-center w-16">Jumlah</th></tr>
                  </thead>
                  <tbody>
                    ${Object.keys(statMap).length > 0 ? Object.keys(statMap).map(k => `<tr><td class="border border-black p-1 font-bold">${k}</td><td class="border border-black p-1 text-center font-extrabold">${statMap[k]}</td></tr>`).join('') : '<tr><td colspan="2" class="border border-black p-1 text-center text-slate-400 italic">Tiada waktu subjek.</td></tr>'}
                    <tr class="bg-slate-200 font-extrabold"><td class="border border-black p-1">Bil. Pelajaran/Minggu</td><td class="border border-black p-1 text-center">${totalWaktuCount}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          `;
        });

      } else if (mode === 'kelas') {
        const entitySet = new Set();
        STATE_HASIL_JADUAL.forEach(j => {
          const k = j.ID_Kelas || j.idKelas;
          if (k && k !== 'ALL') entitySet.add(k);
        });

        const entityList = Array.from(entitySet).sort((a, b) => a.localeCompare(b, 'ms', { numeric: true }));

        entityList.forEach(entityName => {
          const items = STATE_HASIL_JADUAL.filter(j => (j.ID_Kelas || j.idKelas) === entityName || j.ID_Kelas === 'ALL');

          let isTahap1 = true;
          const match = entityName.match(/\d+/);
          const yr = match ? parseInt(match[0], 10) : 1;
          if (yr >= 4) isTahap1 = false;

          const gridCols = isTahap1 ? [
            { id: '01', noW: '1', label: '1<br>7:40-8:10' },
            { id: '02', noW: '2', label: '2<br>8:10-8:40' },
            { id: '03', noW: '3', label: '3<br>8:40-9:10' },
            { id: '04', noW: '4', label: '4<br>9:10-9:40' },
            { id: '05', noW: 'R1', label: 'REHAT1<br>9:40-10:00', isRehat: true },
            { id: '07', noW: '5', label: '5<br>10:00-10:30' },
            { id: '09', noW: '6', label: '6<br>10:30-11:00' },
            { id: '10', noW: '7', label: '7<br>11:00-11:30' },
            { id: '11', noW: '8', label: '8<br>11:30-12:00' },
            { id: '12', noW: '9', label: '12:00-12:30' },
            { id: '13', noW: '10', label: '12:30-13:00' },
            { id: '14', noW: '11', label: '13:00-13:30' }
          ] : [
            { id: '01', noW: '1', label: '1<br>7:40-8:10' },
            { id: '02', noW: '2', label: '2<br>8:10-8:40' },
            { id: '03', noW: '3', label: '3<br>8:40-9:10' },
            { id: '04', noW: '4', label: '4<br>9:10-9:40' },
            { id: '06', noW: '5', label: '5<br>09:40-10:10' },
            { id: '08', noW: 'R2', label: 'REHAT2<br>10:10-10:30', isRehat: true },
            { id: '09', noW: '6', label: '6<br>10:30-11:00' },
            { id: '10', noW: '7', label: '7<br>11:00-11:30' },
            { id: '11', noW: '8', label: '8<br>11:30-12:00' },
            { id: '12', noW: '9', label: '12:00-12:30' },
            { id: '13', noW: '10', label: '12:30-13:00' },
            { id: '14', noW: '11', label: '13:00-13:30' }
          ];

          const statMap = {};
          let totalWaktuCount = 0;

          items.forEach(it => {
            if (it.ID_Kelas === 'ALL' || it.idSubjek === 'PER' || it.idSubjek === 'RHT' || it.kodSubjek === 'REHAT') return;
            const subKey = it.Kod_Subjek || it.kodSubjek || it.ID_Subjek || it.idSubjek;
            if (subKey) {
              statMap[subKey] = (statMap[subKey] || 0) + 1;
              totalWaktuCount++;
            }
          });

          html += `
            <div class="bg-white border-2 border-slate-900 rounded-none p-4 mb-8 asc-card-print shadow-xs">
              <div class="text-center pb-2 mb-2 border-b border-slate-300">
                <h2 class="font-display font-extrabold text-lg text-slate-900 uppercase tracking-tight">JADUAL WAKTU: ${entityName}</h2>
                <p class="text-xs font-semibold text-slate-600">SEKOLAH KEBANGSAAN SEGAMBUT MAKMUR</p>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-black text-center text-xs">
                  <thead>
                    <tr>
                      <th class="asc-grid-th w-14">HARI</th>
                      ${gridCols.map(c => `<th class="asc-grid-th ${c.isRehat ? 'bg-amber-100 text-amber-900 font-black' : ''}">${c.label}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
          `;

          days.forEach((day, dIdx) => {
            html += `<tr><td class="asc-grid-td font-extrabold bg-slate-100 text-slate-900 border-black">${day}</td>`;

            for (let cIdx = 0; cIdx < gridCols.length; cIdx++) {
              const col = gridCols[cIdx];

              if (col.isRehat) {
                if (dIdx === 0) {
                  html += `<td rowspan="5" class="asc-rehat-cell">${isTahap1 ? 'REHAT 1' : 'REHAT 2'}</td>`;
                }
                continue;
              }

              // SEMAKAN PERHIMPUNAN
              if (day === 'Isnin' && col.id === '01') {
                html += `<td class="asc-grid-td font-black bg-slate-200 text-slate-900 border-black">PER</td>`;
                continue;
              }

              const matched = items.find(it => {
                const itemDay = String(it.Hari || it.hari || '').trim();
                const itemSlot = String(it.Slot_ID || it.slotId || '').trim();
                return (itemDay.toLowerCase() === day.toLowerCase() && itemSlot.includes(`SLOT-${col.id}`));
              });

              if (matched) {
                const subKey = matched.Kod_Subjek || matched.kodSubjek || matched.ID_Subjek || matched.idSubjek;

                let colspanVal = 1;
                if (cIdx + 1 < gridCols.length && !gridCols[cIdx + 1].isRehat) {
                  const nextCol = gridCols[cIdx + 1];
                  const nextMatched = items.find(it => {
                    const itemDay = String(it.Hari || it.hari || '').trim();
                    const itemSlot = String(it.Slot_ID || it.slotId || '').trim();
                    return (itemDay.toLowerCase() === day.toLowerCase() && itemSlot.includes(`SLOT-${nextCol.id}`));
                  });

                  if (nextMatched && (nextMatched.Kod_Subjek || nextMatched.kodSubjek) === subKey) {
                    colspanVal = 2;
                    cIdx++;
                  }
                }

                const gUtamaName = getSamaran(matched.ID_Guru_Utama || matched.idGuruUtama);
                const gPairName = getSamaran(matched.ID_Guru_Pair || matched.idGuruPair);
                
                let displayGuruStr = gUtamaName;
                if (gPairName) {
                  displayGuruStr = `${gUtamaName} /<br>${gPairName}`;
                }

                const printContent = `<div class="font-extrabold text-xs text-slate-900">${subKey}</div><div class="text-[9px] text-slate-800 leading-tight">${displayGuruStr}</div>`;

                html += `<td colspan="${colspanVal}" class="asc-grid-td font-extrabold bg-white text-slate-900 border-black">${printContent}</td>`;
              } else {
                html += `<td class="asc-grid-td text-slate-300 border-black">-</td>`;
              }
            }

            html += `</tr>`;
          });

          html += `
                  </tbody>
                </table>
              </div>

              <div class="mt-3 flex justify-between items-start text-[10px]">
                <div class="text-slate-500 italic">
                  Jadual waktu dijana: ${new Date().toLocaleDateString('ms-MY')} | aSc Jadual Waktu
                </div>
                <table class="border-collapse border border-black text-left text-[10px] w-64">
                  <thead>
                    <tr class="bg-slate-100"><th class="border border-black p-1">Subjek</th><th class="border border-black p-1 text-center w-16">Jumlah</th></tr>
                  </thead>
                  <tbody>
                    ${Object.keys(statMap).map(k => `<tr><td class="border border-black p-1 font-bold">${k}</td><td class="border border-black p-1 text-center font-extrabold">${statMap[k]}</td></tr>`).join('')}
                    <tr class="bg-slate-200 font-extrabold"><td class="border border-black p-1">Bil. Pelajaran/Minggu</td><td class="border border-black p-1 text-center">${totalWaktuCount}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          `;
        });

      } else if (mode === 'master') {
        html = `<div class="p-4 bg-white border-2 border-black font-bold text-sm">Paparan Master Grid Keseluruhan (Gunakan dropdown untuk beralih antara Jadual Guru dan Jadual Kelas).</div>`;
      }

      container.innerHTML = html;
    }
  
// ================== AGIHAN GURU CORE V2.7.1 ==================
// UI persediaan — tidak memanggil enjin Jana lama dan tidak menyentuh jadual rasmi.
function jwYearLabel(y){return Number(y)===0?'Prasekolah':'Tahun '+y;}
const JW_AGIHAN_SCOPES=[
  ['PRA','Prasekolah'],
  ['Y1','Tahun 1'],['Y2','Tahun 2'],['Y3','Tahun 3'],['Y4','Tahun 4'],['Y5','Tahun 5'],['Y6','Tahun 6'],
  ['Y23','Tahun 2–3'],['Y56','Tahun 5–6'],['T1','Tahap 1 (Tahun 1–3)'],
  ['T2','Tahap 2 (Tahun 4–6)'],['Y26','Tahun 2–6'],['ALL','Semua Tahun 1–6']
];
const JW_AGIHAN_YEARS={PRA:[0],Y1:[1],Y2:[2],Y3:[3],Y4:[4],Y5:[5],Y6:[6],Y23:[2,3],Y56:[5,6],T1:[1,2,3],T2:[4,5,6],Y26:[2,3,4,5,6],ALL:[1,2,3,4,5,6]};
let JW_AGIHAN_CORE={loaded:false,loading:false,staff:[],historyStaff:[],classes:[],subjects:[],subjectSet:null,roleData:{ok:false,roles:[]},
  selected:null,presets:[],rows:[],takeovers:[],plans:[],currentId:'',dirty:false,
  openTeachers:new Set(),lastError:'',needsResave:false};
function jwAgihanEscape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function jwAgihanYears(scope){const key=String(scope||'').toUpperCase();
  if(JW_AGIHAN_YEARS[key])return JW_AGIHAN_YEARS[key];
  if(/^YS[1-6](?:_[1-6]){0,5}$/.test(key)){const ys=key.slice(2).split('_').map(Number);if(ys.every((y,i)=>i===0||y>ys[i-1]))return ys;}return [];}
function jwAgihanScopeKey(years){const ys=[...years].sort((a,b)=>a-b);return Object.keys(JW_AGIHAN_YEARS).find(k=>JW_AGIHAN_YEARS[k].join(',')===ys.join(','))||'YS'+ys.join('_');}
function jwAgihanScopesFor(choice){if(!choice)return JW_AGIHAN_SCOPES;
  const full=jwAgihanScopeKey(choice.years),existing=JW_AGIHAN_SCOPES.filter(([id])=>jwAgihanYears(id).every(y=>choice.years.includes(y)));
  if(!existing.some(([id])=>id===full))existing.push([full,'Semua tahun terpakai ('+choice.years.join(', ')+')']);
  return [existing.find(([id])=>id===full),...existing.filter(([id])=>id!==full)].filter(Boolean);
}
function jwAgihanYearClasses(year){return JW_AGIHAN_CORE.classes.filter(c=>c.year===year);}
function jwAgihanScopeLabel(scope){return (JW_AGIHAN_SCOPES.find(x=>x[0]===scope)||['',scope])[1];}
function jwAgihanSubjectIndex(){
  const out=new Map();JW_AGIHAN_CORE.subjects.forEach(s=>{if(!out.has(s.id))out.set(s.id,s);});
  return [...out.values()].sort((a,b)=>a.code.localeCompare(b.code,'ms')||a.years[0]-b.years[0]||Number(b.coTeaching)-Number(a.coTeaching)||a.label.localeCompare(b.label,'ms'));
}
function jwAgihanPeriods(id,year){return JW_AGIHAN_CORE.subjects.find(s=>s.id===id&&s.year===year)?.periods||0;}
function jwAgihanCheckVersion(res){if(res.version!=='V2.8.0-F2')throw Error('Backend Agihan belum V2.8.0-F2. Deploy FiJadualWaktu.gs versi baharu dahulu.');}
function jwAgihanReviewNotice(){
  const ambiguous=JW_AGIHAN_CORE.rows.filter(r=>r.needsReview||!r.choiceId).length;
  if(ambiguous)jwAgihanNotice(`${ambiguous} baris lama perlu pilih konfigurasi Tetapan Subjek yang tepat. Kuota asal dikekalkan; sejarah tidak diubah.`,true);
  else if(JW_AGIHAN_CORE.needsResave)jwAgihanNotice('Set lama / versi Subjek berbeza. Semak pilihan dan beban waktu, kemudian Simpan Versi baharu sebelum Aktifkan Set.',true);
  else jwAgihanNotice('');
}

function jwAgihanSetDirty(dirty=true){
  JW_AGIHAN_CORE.dirty=dirty;
  const btn=document.getElementById('jwAgihanBtnActivate');
  if(btn)btn.disabled=dirty||JW_AGIHAN_CORE.needsResave||!JW_AGIHAN_CORE.currentId;
  const el=document.getElementById('jwAgihanActiveLabel');
  if(el){const active=JW_AGIHAN_CORE.selected;
    el.textContent=dirty?'Perubahan belum disimpan':JW_AGIHAN_CORE.needsResave?'Set kerja perlu disemak & disimpan':active?'✓ Aktif: '+active.name:'Belum ada set aktif';
    el.classList.toggle('is-dirty',dirty);
  }
}
function jwAgihanMarkDirty(){jwAgihanSetDirty(true);}
function jwAgihanSessionChanged(){jwAgihanMarkDirty();jwAgihanRenderTeachers();}
function jwAgihanNotice(text,alert=false){
  const el=document.getElementById('jwAgihanNotice');if(!el)return;
  el.textContent=String(text||'');el.classList.toggle('hidden',!text);el.classList.toggle('is-error',alert);
}
function jwAgihanDialog(config){return jwSubjectDialog({...config,confirmButtonText:config.confirmButtonText||'Faham'});}
function jwAgihanConfirm(title,text,yes='Teruskan'){
  return jwAgihanDialog({title,text,icon:'question',showCancelButton:true,
    confirmButtonText:yes,cancelButtonText:'Batal',reverseButtons:true}).then(r=>!!r.isConfirmed);
}
async function jwAgihanRequest(action,data={},withLoader=true){
  if(withLoader)showLoader('',action==='fiJWAgihanStudioGet'?'refresh':'save');
  try{const res=await postToBackend({action,data});
    if(!res||res.success!==true)throw Error(res?.error||'Backend tidak dapat memproses tindakan Agihan CORE.');
    return res;
  }finally{if(withLoader){hideLoader();await new Promise(r=>setTimeout(r,500));}}
}
function jwAgihanTab(which){
  for(const id of ['quota','history','takeover','plan']){
    document.getElementById('jwAgihanPane_'+id)?.classList.toggle('hidden',id!==which);
    document.querySelector(`.jw-agihan-tab[data-a-tab="${id}"]`)?.classList.toggle('is-active',id===which);
  }
  if(which==='history')jwAgihanRenderHistory();
  if(which==='takeover')jwAgihanRenderTakeover();
  if(which==='plan')jwAgihanRenderPlan();
}
async function jwAgihanOpen(){
  if(JW_AGIHAN_CORE.loaded||JW_AGIHAN_CORE.loading)return;
  await jwAgihanReload(true);
}
async function jwAgihanReload(quiet=false,preload=false){
  if(JW_AGIHAN_CORE.loading)return;
  if(!quiet&&JW_AGIHAN_CORE.dirty&&!(await jwAgihanConfirm('Perubahan belum disimpan',
    'Muat semula akan membuang perubahan Agihan yang belum disimpan.','Muat semula')))return;
  JW_AGIHAN_CORE.loading=true;
  const activeLabel=document.getElementById('jwAgihanActiveLabel');
  if(activeLabel)activeLabel.textContent='Menyemak set aktif…';
  try{
    const res=await jwAgihanRequest('fiJWAgihanStudioGet',{},!preload);jwAgihanCheckVersion(res);
    Object.assign(JW_AGIHAN_CORE,{loaded:true,staff:res.staff||[],historyStaff:res.historyStaff||[],classes:res.classes||[],
      subjects:res.subjects||[],subjectSet:res.subjectSet||null,constraints:res.constraints||null,roleData:res.roleData||{ok:false,roles:[]},selected:res.selected||null,
      presets:res.presets||[],rows:JSON.parse(JSON.stringify(res.activeRows||[])),
      takeovers:res.takeovers||[],plans:res.plans||[],currentId:res.selected?.id||'',dirty:false,needsResave:!!res.needsResave});
    for(const id of ['jwAlihOriginal','jwAlihNew']){const el=document.getElementById(id);if(el)delete el.dataset.ready;}
    JW_AGIHAN_CORE.openTeachers.clear();
    JW_AGIHAN_CORE.rows.filter(r=>r.needsReview).forEach(r=>JW_AGIHAN_CORE.openTeachers.add(r.teacherId));
    const year=document.getElementById('jwAgihanYear');if(year)year.value=res.selected?.year||res.subjectSet?.year||new Date().getFullYear();
    const name=document.getElementById('jwAgihanSetName');if(name)name.value=res.selected?.name||'';
    document.getElementById('jwPlanYear').value=year.value;
    jwAgihanSetDirty(false);jwAgihanReviewNotice();jwAgihanRenderAll();
  }catch(err){
    if(activeLabel)activeLabel.textContent='Set aktif belum dapat disahkan';
    jwAgihanNotice(err.message+' Data tidak dipadam oleh proses muat semula ini.',true);
    JW_AGIHAN_CORE.loaded=false;if(preload)throw err;
    await jwAgihanDialog({title:'Agihan Guru belum dapat dibuka',text:err.message,icon:'error'});
  }
  finally{JW_AGIHAN_CORE.loading=false;}
}
function jwAgihanRenderAll(){jwAgihanRenderTeachers();jwAgihanRenderStats();jwAgihanRenderCoverage();jwAgihanRenderHistory();jwAgihanRenderTakeover();jwAgihanRenderPlan();}
function jwAgihanRowsFor(teacherId){return JW_AGIHAN_CORE.rows.map((r,i)=>({...r,index:i})).filter(r=>r.teacherId===teacherId);}
function jwAgihanEstimate(row){
  const years=jwAgihanYears(row.scope);
  if(!row.choiceId||!years.length||years.some(y=>!jwAgihanPeriods(row.choiceId,y)))return null;
  if(row.strategy==='TETAP'&&(row.fixedClassIds||[]).length===Number(row.count)){
    const classes=row.fixedClassIds.map(id=>JW_AGIHAN_CORE.classes.find(c=>c.id===id));
    if(classes.every(c=>c&&years.includes(c.year)))return classes.reduce((n,c)=>n+jwAgihanPeriods(row.choiceId,c.year),0);
  }
  const quotas=row.yearQuota||{};
  if(years.length===1)return Number(row.count)*jwAgihanPeriods(row.choiceId,years[0]);
  if(Object.values(quotas).reduce((s,n)=>s+Number(n),0)===Number(row.count))
    return Object.entries(quotas).reduce((sum,[y,n])=>sum+Number(n)*jwAgihanPeriods(row.choiceId,Number(y)),0);
  const periods=years.map(y=>jwAgihanPeriods(row.choiceId,y));
  return periods.every(n=>n===periods[0])?Number(row.count)*periods[0]:null;
}
function jwAgihanTeacherOrder(a,b){
  const rank=x=>{const t=(x.role||'').toLowerCase();if(/guru besar|^gb$/.test(t))return 0;if(/gpk|penolong kanan/.test(t))return 1;return 2;};
  return rank(a)-rank(b)||a.name.localeCompare(b.name,'ms');
}
function jwAgihanSessionYear(){return Number(document.getElementById('jwAgihanYear')?.value);}
function jwAgihanHomerooms(id){
  const d=JW_AGIHAN_CORE.roleData;
  if(!d?.ok)return [];
  return (d.roles||[]).filter(r=>r.teacherId===id&&r.year===jwAgihanSessionYear());
}
function jwAgihanEligibleHomerooms(r){
  const years=jwAgihanYears(r.scope),hasQuota=Object.keys(r.yearQuota||{}).length>0;
  if(!r.choiceId||!years.length||!years.every(y=>jwAgihanPeriods(r.choiceId,y)>0))return [];
  return jwAgihanHomerooms(r.teacherId).filter(c=>years.includes(c.classYear)&&
    (!hasQuota||Number(r.yearQuota[String(c.classYear)]||0)>0)&&(r.strategy!=='TETAP'||(r.fixedClassIds||[]).includes(c.classId)));
}
function jwAgihanRenderTeachers(){
  const wrap=document.getElementById('jwAgihanTeachers');if(!wrap)return;
  const query=String(document.getElementById('jwAgihanFind')?.value||'').toLowerCase().trim();
  const filter=document.getElementById('jwAgihanFilter')?.value||'all';
  const activeIds=new Set(JW_AGIHAN_CORE.staff.map(t=>t.id));
  const inactive=JW_AGIHAN_CORE.historyStaff.filter(t=>!activeIds.has(t.id)&&JW_AGIHAN_CORE.rows.some(r=>r.teacherId===t.id))
    .map(t=>({...t,role:'Tidak aktif — semak penugasan',inactive:true}));
  const known=new Set([...activeIds,...inactive.map(t=>t.id)]);
  const missing=[...new Set(JW_AGIHAN_CORE.rows.map(r=>r.teacherId))].filter(id=>!known.has(id)).map(id=>({id,name:id,role:'Tiada dalam Master_Staf — semak',inactive:true}));
  const teachers=[...JW_AGIHAN_CORE.staff,...inactive,...missing].sort(jwAgihanTeacherOrder).filter(t=>{
    const rows=jwAgihanRowsFor(t.id);
    const rooms=jwAgihanHomerooms(t.id);
    return (!query||(t.name+' '+t.id+' '+rooms.map(c=>c.className).join(' ')).toLowerCase().includes(query))&&
      (filter==='all'||(filter==='assigned'&&rows.length)||(filter==='empty'&&!rows.length)||(filter==='homeroom'&&rooms.length));
  });
  document.getElementById('jwAgihanTeacherCount').textContent=`${teachers.length} dipaparkan · ${JW_AGIHAN_CORE.staff.length} guru aktif${!JW_AGIHAN_CORE.roleData?.ok?" · Ralat peranan":JW_AGIHAN_CORE.roleData.issues?.length?" · Semak peranan":""}`;
  if(!JW_AGIHAN_CORE.subjectSet){wrap.innerHTML='<div class="jw-agihan-empty">Tetapan Subjek CORE belum aktif. Aktifkan Tetapan Subjek dahulu sebelum mengisi kuota guru.</div>';return;}
  if(!JW_AGIHAN_CORE.staff.length){wrap.innerHTML='<div class="jw-agihan-empty">Tiada guru aktif berjaya dibaca daripada Master_Staf. Semak sumber data.</div>';return;}
  wrap.innerHTML=teachers.map(t=>{
    const rows=jwAgihanRowsFor(t.id),open=JW_AGIHAN_CORE.openTeachers.has(t.id);
    const roomNames=jwAgihanHomerooms(t.id).map(c=>c.className).join(', ');
    const roleBadge=roomNames?` <span class="jw-agihan-tag" style="padding:1px 5px" title="${jwAgihanEscape('Guru Kelas · '+roomNames)}">Guru Kelas · ${jwAgihanEscape(roomNames)}</span>`:'';
    const periods=rows.map(jwAgihanEstimate),unknown=periods.some(v=>v===null),total=periods.reduce((s,v)=>s+(v||0),0);
    return `<article class="jw-agihan-teacher ${open?'is-open':''} ${t.inactive?'is-inactive':''}" data-teacher-id="${jwAgihanEscape(t.id)}">
      <div class="jw-agihan-teacher-head">
        <button type="button" class="jw-agihan-expand" onclick="jwAgihanToggleTeacher('${jwAgihanEscape(t.id)}')" aria-expanded="${open}">
          <i class="fa-solid fa-chevron-${open?'down':'right'}" aria-hidden="true"></i>
          <span class="jw-agihan-teacher-name">${jwAgihanEscape(t.name)}<small>${roleBadge}${roleBadge?' · ':''}${jwAgihanEscape(t.id)} · ${jwAgihanEscape(t.role)}</small></span>
        </button>
        <div class="jw-agihan-teacher-metrics"><span>${rows.length} subjek/agihan</span><strong>${rows.length?(unknown?`${total}+`:total)+' waktu anggaran':'Belum ditetapkan'}</strong></div>
        ${t.inactive?'<span class="jw-agihan-tag jw-agihan-tag-muted">Tidak Aktif</span>':`<button type="button" class="jw-agihan-btn jw-agihan-btn-light" onclick="jwAgihanAddRow('${jwAgihanEscape(t.id)}')"><i class="fa-solid fa-plus"></i> Subjek</button>`}
      </div>
      ${open?`<div class="jw-agihan-row-list">${rows.length?rows.map(r=>jwAgihanRowHTML(r)).join(''):'<p class="jw-agihan-muted jw-agihan-no-row">Belum ada kuota mengajar.</p>'}</div>`:''}
    </article>`;
  }).join('')||'<div class="jw-agihan-empty">Tiada guru sepadan dengan carian.</div>';
}
function jwAgihanRowHTML(r){
  if(r.relation?.role==='SECOND')return jwF2SecondaryHTML(r);
  const years=jwAgihanYears(r.scope),available=JW_AGIHAN_CORE.classes.filter(c=>years.includes(c.year));
  const subjects=jwAgihanSubjectIndex();
  const choice=subjects.find(s=>s.id===r.choiceId&&s.subjectId===r.subjectId);
  const options=subjects.map(s=>`<option value="${jwAgihanEscape(s.id)}" ${s.id===r.choiceId?'selected':''}>${jwAgihanEscape(s.label)}</option>`).join('');
  const scopeOptions=jwAgihanScopesFor(choice);
  const scopes=(scopeOptions.some(([id])=>id===r.scope)?'':`<option value="${jwAgihanEscape(r.scope)}" selected disabled>Skop lama: ${jwAgihanEscape(jwAgihanScopeLabel(r.scope))} — semak</option>`)+scopeOptions.map(([id,label])=>`<option value="${id}" ${r.scope===id?'selected':''}>${jwAgihanEscape(label)}</option>`).join('');
  const hasQuota=Object.keys(r.yearQuota||{}).length>0;
  const yearControls=years.length>1?`<label class="jw-agihan-check jw-agihan-linecheck"><input type="checkbox" ${hasQuota?'checked':''} onchange="jwAgihanToggleQuota(${r.index},this.checked)"> Tetapkan bil. kelas mengikut tahun</label>`:'';
  const quotas=years.length>1&&hasQuota?`<div class="jw-agihan-quotas">${years.map(y=>`<label>Tahun ${y}<input type="number" min="0" max="20" value="${Number(r.yearQuota?.[y]||0)}" onchange="jwAgihanSetQuota(${r.index},${y},this.value)"></label>`).join('')}</div>`:'';
  const fixed=r.strategy==='TETAP'?`<div class="jw-agihan-fixed"><div class="jw-agihan-muted">Pilih ${r.count} kelas tetap (pilihan, bukan syarat untuk mod Auto/Kekal)</div>
      <div class="jw-agihan-checkgroup">${available.map(c=>`<label class="jw-agihan-check"><input type="checkbox" ${r.fixedClassIds?.includes(c.id)?'checked':''} onchange="jwAgihanFixedClass(${r.index},'${jwAgihanEscape(c.id)}',this.checked)"> ${jwAgihanEscape(c.name)}</label>`).join('')}</div></div>`:'';
  const own=jwAgihanEligibleHomerooms(r),ownNames=own.map(c=>c.className).join(', ');
  const estimate=jwAgihanEstimate(r),subjectValid=!!choice&&years.length>0&&years.every(y=>jwAgihanPeriods(r.choiceId,y)>0);
  return `<div class="jw-agihan-quota-row" data-quota-row="${r.index}">
    <div class="jw-agihan-quota-main">
      <div class="jw-agihan-field"><label>Tetapan Subjek</label><select onchange="jwAgihanChangeRow(${r.index},'choiceId',this.value)"><option value="">— Pilih tetapan subjek —</option>${options}</select></div>
      <div class="jw-agihan-field"><label>Tahun / Tahap</label><select onchange="jwAgihanChangeRow(${r.index},'scope',this.value)">${scopes}</select></div>
      <div class="jw-agihan-field jw-agihan-small"><label>Bil. Kelas</label><input type="number" min="1" max="20" value="${Number(r.count)||1}" onchange="jwAgihanChangeRow(${r.index},'count',this.value)"></div>
      <div class="jw-agihan-field"><label>Kaedah Agihan</label><select onchange="jwAgihanChangeRow(${r.index},'strategy',this.value)">
        <option value="AUTO" ${r.strategy==='AUTO'?'selected':''}>Auto — Generator pilih</option>
        <option value="KEKAL" ${r.strategy==='KEKAL'?'selected':''}>Utamakan kelas asal</option>
        <option value="TETAP" ${r.strategy==='TETAP'?'selected':''}>Kelas tetap (pilihan)</option></select></div>
      <button type="button" class="jw-agihan-delete" title="Padam baris" aria-label="Padam baris" onclick="jwAgihanDeleteRow(${r.index})"><i class="fa-solid fa-trash"></i></button>
    </div>
    ${!subjectValid&&r.subjectId?`<div class="jw-agihan-inline-error">${!choice?'Agihan lama '+jwAgihanEscape(r.code||r.subjectId)+' — pilih konfigurasi subjek yang tepat. Bilangan kelas asal dikekalkan.':'Skop tahun tidak sepadan dengan konfigurasi ini. Pilih skop yang sah.'}</div>`:''}
    ${choice?`<div class="jw-agihan-muted">${choice.coTeaching?'Co-Teaching · 2 guru pada kelas dan waktu sama':'Single · 1 guru setiap sesi'} · ${choice.years.includes(0)?'Prasekolah':'Tahun '+choice.years.join(', ')}</div>`:''}
    <div class="jw-agihan-quota-details">
      ${jwF2RelationHTML(r,choice)}${yearControls}${quotas}${fixed}
      ${own.length||r.homeroom?`<label class="jw-agihan-check jw-agihan-linecheck"><input type="checkbox" ${r.homeroom?'checked':''} onchange="jwAgihanChangeRow(${r.index},'homeroom',this.checked)"> ${own.length?'Utamakan kelas sendiri ('+jwAgihanEscape(ownNames)+')':'Keutamaan lama tidak sepadan — nyahpilih atau semak sesi/skop'}</label>`:''}
      <span class="jw-agihan-hrs">${estimate===null?(!subjectValid?'Pilih konfigurasi dahulu':'Beban berubah ikut tahun'):estimate+' waktu/minggu (anggaran)'}</span>
    </div>
  </div>`;
}
function jwAgihanToggleTeacher(id){
  if(JW_AGIHAN_CORE.openTeachers.has(id))JW_AGIHAN_CORE.openTeachers.delete(id);else JW_AGIHAN_CORE.openTeachers.add(id);
  jwAgihanRenderTeachers();
}
function jwAgihanAddRow(id){
  JW_AGIHAN_CORE.rows.push({teacherId:id,subjectId:'',choiceId:'',scope:'T1',count:1,yearQuota:{},strategy:'AUTO',fixedClassIds:[],homeroom:false,note:''});
  JW_AGIHAN_CORE.openTeachers.add(id);jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderStats();jwAgihanRenderCoverage();
}
function jwAgihanChangeRow(idx,field,value){
  const r=JW_AGIHAN_CORE.rows[idx];if(!r||r.relation?.role==='SECOND')return;
  if(field==='choiceId'&&r.relation){jwAgihanNotice('Leraikan hubungan dahulu sebelum menukar subjek.',true);jwAgihanRenderTeachers();return;}
  const before=JSON.parse(JSON.stringify(r));
  if(field==='choiceId'){
    const choice=jwAgihanSubjectIndex().find(s=>s.id===value),previousYears=jwAgihanYears(r.scope),wasLegacy=!!r.subjectId&&!r.choiceId||!!r.needsReview;
    r.choiceId=choice?.id||'';r.subjectId=choice?.subjectId||'';r.code=choice?.code||'';r.needsReview=false;
    r.settingIds=choice?.settingIds||[];r.configurationYears=choice?.years||[];r.coTeaching=!!choice?.coTeaching;
    if(choice){
      // Pilihan baru menggunakan keseluruhan skop konfigurasi. Agihan lama yang sah mengekalkan skop/pecahan.
      const scopeValid=previousYears.length&&previousYears.every(y=>choice.years.includes(y));
      if((choice.years.includes(0)&&!scopeValid)||!wasLegacy&&!(scopeValid&&(r.id||Object.keys(r.yearQuota||{}).length||(r.fixedClassIds||[]).length))){
        r.scope=jwAgihanScopeKey(choice.years);r.yearQuota={};r.fixedClassIds=[];
      }
    }
  }else r[field]=field==='count'?Number(value):value;
  if(field==='scope'){r.yearQuota={};r.fixedClassIds=[];}
  if(field==='strategy'&&value!=='TETAP')r.fixedClassIds=[];
  if(field==='count'&&Object.keys(r.yearQuota||{}).length){/* Kekal pecahan; diperingatkan jika jumlah tidak sama. */}
  if(!jwF2Sync(r)){Object.assign(r,before);jwAgihanNotice('Skop tidak sepadan dengan subjek pautan.',true);jwAgihanRenderTeachers();return;}
  if(field==='choiceId'&&r.code==='PJ'&&!r.id&&!r.relation&&JW_AGIHAN_CORE.constraints?.rules?.linkPJPK&&!JW_AGIHAN_CORE.rows.some(x=>x!==r&&x.teacherId===r.teacherId&&x.code==='PK'&&jwAgihanYears(x.scope).some(y=>jwAgihanYears(r.scope).includes(y)))){jwF2Refresh();if(jwF2PK(r))jwF2CreateRelation(idx,'LINK','newPK',true);return;}
  jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderStats();jwAgihanRenderCoverage();
}
function jwAgihanToggleQuota(idx,checked){
  const r=JW_AGIHAN_CORE.rows[idx];if(!r)return;
  r.yearQuota=checked?Object.fromEntries(jwAgihanYears(r.scope).map(y=>[y,0])):{};jwF2Sync(r);
  jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderStats();jwAgihanRenderCoverage();
}
function jwAgihanSetQuota(idx,year,value){
  const r=JW_AGIHAN_CORE.rows[idx];if(!r)return;r.yearQuota[String(year)]=Math.max(0,Number(value)||0);jwF2Sync(r);
  jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderStats();jwAgihanRenderCoverage();
}
function jwAgihanFixedClass(idx,id,checked){
  const r=JW_AGIHAN_CORE.rows[idx];if(!r)return;
  const set=new Set(r.fixedClassIds||[]);checked?set.add(id):set.delete(id);r.fixedClassIds=[...set];jwF2Sync(r);
  jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderCoverage();
}
async function jwAgihanDeleteRow(idx){
  const r=JW_AGIHAN_CORE.rows[idx];if(!r||r.relation?.role==='SECOND')return;
  if(!(await jwAgihanConfirm('Padam tugasan guru?',r.relation?'Kedua-dua baris hubungan akan dibuang daripada set kerja. Sejarah kekal.':'Baris ini akan dibuang daripada set kerja. Set sejarah tidak akan terpadam.','Padam Baris')))return;
  if(r.relation)JW_AGIHAN_CORE.rows=JW_AGIHAN_CORE.rows.filter(x=>x.relation?.id!==r.relation.id);else JW_AGIHAN_CORE.rows.splice(idx,1);jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderStats();jwAgihanRenderCoverage();
}
function jwAgihanRenderStats(){
  const el=document.getElementById('jwAgihanStats');if(!el)return;
  const teachers=new Set(JW_AGIHAN_CORE.rows.map(r=>r.teacherId));
  const count=JW_AGIHAN_CORE.rows.reduce((n,r)=>n+Number(r.count||0),0);
  const unknown=JW_AGIHAN_CORE.rows.some(r=>jwAgihanEstimate(r)===null);
  const periods=JW_AGIHAN_CORE.rows.reduce((n,r)=>n+(jwAgihanEstimate(r)||0),0);
  const cards=[['Guru dengan agihan',`${teachers.size} / ${JW_AGIHAN_CORE.staff.length}`],
    ['Tugasan subjek',JW_AGIHAN_CORE.rows.length],['Kuota kelas',count],
    ['Beban mengajar anggaran',`${periods}${unknown?'+':''} waktu`]];
  el.innerHTML=cards.map(([title,value])=>`<div class="jw-agihan-stat"><span>${jwAgihanEscape(title)}</span><strong>${jwAgihanEscape(value)}</strong></div>`).join('');
}
// V2.8.0-F1B: read-only feasibility of teacher-class quotas, not timetable generation.
// Each subject configuration is independent. Reserve fixed classes, then use integral
// max flow for exact-year and flexible quotas. A teacher can occupy a class only once
// per configuration; a class has one or two teacher positions as specified by CORE.
function jwAgihanCoverageFlow(tasks,classes,capacity,occupied){
  const graph=[];const node=()=>{graph.push([]);return graph.length-1;};
  const edge=(a,b,c)=>{const e={to:b,rev:graph[b].length,cap:c,initial:c};graph[a].push(e);graph[b].push({to:a,rev:graph[a].length-1,cap:0,initial:0});return e;};
  const source=node(),sink=node(),classNodes=new Map(),teacherClass=new Map(),links=[];
  classes.forEach(c=>{const n=node();classNodes.set(c.id,n);edge(n,sink,Math.max(0,capacity.get(c.id)||0));});
  tasks.forEach(t=>{const n=node();edge(source,n,t.count);
    classes.filter(c=>t.years.includes(c.year)&&!occupied.get(c.id)?.has(t.teacherId)&&capacity.get(c.id)>0).forEach(c=>{
      const key=JSON.stringify([t.teacherId,c.id]);let tc=teacherClass.get(key);
      if(tc===undefined){tc=node();teacherClass.set(key,tc);edge(tc,classNodes.get(c.id),1);}
      links.push({task:t,cls:c,edge:edge(n,tc,1)});
    });
  });
  let flow=0;
  for(;;){const prev=Array(graph.length).fill(null),queue=[source];prev[source]=[-1,-1];
    for(let i=0;i<queue.length&&prev[sink]===null;i++){const u=queue[i];graph[u].forEach((e,j)=>{if(e.cap>0&&prev[e.to]===null){prev[e.to]=[u,j];queue.push(e.to);}});}
    if(prev[sink]===null)break;
    let inc=Infinity;for(let v=sink;v!==source;){const [u,j]=prev[v];inc=Math.min(inc,graph[u][j].cap);v=u;}
    for(let v=sink;v!==source;){const [u,j]=prev[v],e=graph[u][j];e.cap-=inc;graph[v][e.rev].cap+=inc;v=u;}flow+=inc;
  }
  return {flow,matches:links.filter(x=>x.edge.initial-x.edge.cap>0).map(x=>({task:x.task,cls:x.cls}))};
}
function jwAgihanCoverageAudit(core){
  const classMap=new Map(core.classes.map(c=>[c.id,c])),staff=new Set(core.staff.map(t=>t.id));
  const groups=new Map(),invalid=[];
  core.subjects.forEach(s=>{
    if(!groups.has(s.id))groups.set(s.id,{id:s.id,label:s.label,subjectId:s.subjectId,years:new Map(),rows:[],issues:[]});
    const g=groups.get(s.id),classes=core.classes.filter(c=>c.year===s.year);
    g.years.set(s.year,{year:s.year,required:classes.length*Number(s.requiredTeachers),teachers:Number(s.requiredTeachers),classes,exact:0,matched:0,flex:0});
  });
  const seen=new Map();
  core.rows.forEach((r,i)=>{
    const g=groups.get(r.choiceId),years=jwAgihanYears(r.scope),count=Number(r.count),q=r.yearQuota||{},fixed=r.fixedClassIds||[],strategy=r.strategy||'AUTO';
    const problem=[];
    if(!g||g.subjectId!==r.subjectId||r.needsReview||!years.length||years.some(y=>!g?.years.has(y)))problem.push('konfigurasi/skop tidak sah');
    if(!staff.has(r.teacherId))problem.push('guru tidak aktif');
    if(!Number.isInteger(count)||count<1||count>20||count>core.classes.filter(c=>years.includes(c.year)).length)problem.push('bilangan kelas tidak sah');
    if(!['AUTO','KEKAL','TETAP'].includes(strategy))problem.push('kaedah tidak sah');
    if(Object.keys(q).length&&(Object.entries(q).some(([y,n])=>!years.includes(Number(y))||!Number.isInteger(Number(n))||Number(n)<0||Number(n)>core.classes.filter(c=>c.year===Number(y)).length)||Object.values(q).reduce((a,b)=>a+Number(b),0)!==count))problem.push('pecahan tahun tidak sah');
    if(strategy==='TETAP'){
      if(fixed.length!==count||new Set(fixed).size!==fixed.length||fixed.some(id=>!classMap.has(id)||!years.includes(classMap.get(id).year)))problem.push('kelas tetap tidak sah');
      if(Object.keys(q).length&&years.some(y=>fixed.filter(id=>classMap.get(id)?.year===y).length!==Number(q[y]||0)))problem.push('kelas tetap tidak sepadan pecahan tahun');
    }else if(fixed.length)problem.push('kelas tetap tidak dibenarkan dalam mod Auto/Kekal');
    if(g)years.forEach(y=>{const key=JSON.stringify([r.teacherId,r.choiceId,y]);if(seen.has(key)&&!(r.relation?.type==='PAIR'&&core.rows[seen.get(key)].relation?.type==='PAIR')){problem.push('guru/subjek/tahun bertindih dengan baris '+(seen.get(key)+1));}else seen.set(key,i);});
    if(problem.length){const msg='Baris '+(i+1)+': '+[...new Set(problem)].join(', ');invalid.push(msg);if(g)g.issues.push(msg);return;}
    g.rows.push({teacherId:r.teacherId,years,count,q,fixed,strategy,index:i});
  });
  const result=[];
  groups.forEach(g=>{
    const years=[...g.years.values()].sort((a,b)=>a.year-b.year),classes=years.flatMap(y=>y.classes),capacity=new Map(),occupied=new Map(),tasks=[];
    years.forEach(y=>y.classes.forEach(c=>{capacity.set(c.id,y.teachers);occupied.set(c.id,new Set());}));
    const supplied=g.rows.reduce((n,r)=>n+r.count,0),required=years.reduce((n,y)=>n+y.required,0);
    let fixedMatched=0;
    g.rows.filter(r=>r.strategy==='TETAP').forEach(r=>r.fixed.forEach(id=>{
      const c=classMap.get(id),y=g.years.get(c.year);y.exact++;
      if(capacity.get(id)<=0||occupied.get(id).has(r.teacherId)){g.issues.push('Baris '+(r.index+1)+': konflik kelas tetap '+c.name);return;}
      occupied.get(id).add(r.teacherId);capacity.set(id,capacity.get(id)-1);y.matched++;fixedMatched++;
    }));
    g.rows.filter(r=>r.strategy!=='TETAP').forEach(r=>{
      if(Object.keys(r.q).length){r.years.forEach(y=>{const n=Number(r.q[y]||0);g.years.get(y).exact+=n;if(n)tasks.push({teacherId:r.teacherId,years:[y],count:n,flex:false});});}
      else if(r.years.length===1){g.years.get(r.years[0]).exact+=r.count;tasks.push({teacherId:r.teacherId,years:r.years,count:r.count,flex:false});}
      else tasks.push({teacherId:r.teacherId,years:r.years,count:r.count,flex:true});
    });
    // Insert exact quotas first, but allow residual paths to rearrange allocations.
    tasks.sort((a,b)=>Number(a.flex)-Number(b.flex));
    const flow=jwAgihanCoverageFlow(tasks,classes,capacity,occupied);
    flow.matches.forEach(m=>{const y=g.years.get(m.cls.year);y.matched++;if(m.task.flex)y.flex++;});
    const matched=fixedMatched+flow.flow,shortage=Math.max(0,required-supplied),excess=Math.max(0,supplied-required),unmatched=supplied-matched;
    const feasible=!g.issues.length&&matched===required&&matched===supplied;
    const status=feasible?'lengkap':g.issues.length?'konflik':excess?'lebih':shortage?'kurang':'konflik';
    result.push({id:g.id,label:g.label,years,required,supplied,matched,shortage,excess,unmatched,feasible,status,issues:g.issues,hasFlexible:tasks.some(t=>t.flex)});
  });
  return {groups:result.sort((a,b)=>a.label.localeCompare(b.label,'ms')),invalid};
}
function jwAgihanRenderCoverage(){
  const el=document.getElementById('jwAgihanCoverage');if(!el)return;
  if(!JW_AGIHAN_CORE.subjects.length){el.innerHTML='<div class="jw-agihan-empty">Aktifkan Tetapan Subjek CORE untuk menyemak kuota kelas.</div>';return;}
  const audit=jwAgihanCoverageAudit(JW_AGIHAN_CORE),groups=audit.groups.filter(g=>g.required>0||g.supplied>0||g.issues.length);
  const total=groups.reduce((n,g)=>n+g.required,0),supplied=groups.reduce((n,g)=>n+g.supplied,0),matched=groups.reduce((n,g)=>n+g.matched,0),complete=groups.filter(g=>g.feasible).length;
  const missingPra=JW_AGIHAN_CORE.subjects.some(s=>s.year===0)&&!jwAgihanYearClasses(0).length;
  const ok=groups.length>0&&complete===groups.length&&!audit.invalid.length&&!missingPra;
  const label={lengkap:'Mencukupi',kurang:'Kurang',lebih:'Lebihan',konflik:'Konflik skop / rekod'};
  const css={lengkap:'lengkap',kurang:'kurang',lebih:'lebih',konflik:'kurang'};
  let html=`<details class="jw-agihan-coverage-year" style="grid-column:1/-1" open><summary><strong>1. Kecukupan Kuota Mengikut Konfigurasi Subjek</strong><span>${complete}/${groups.length} konfigurasi mencukupi · ${supplied}/${total} kuota sah diisi · ${matched}/${total} boleh dipadankan${audit.invalid.length?' · '+audit.invalid.length+' baris perlu semakan':''}</span></summary><div class="jw-agihan-coverage-list"><div class="jw-agihan-muted">${ok?'Kuota mencukupi dan padanan kelas secara teori boleh dibuat.':'Semak kekurangan, lebihan atau konflik skop di bawah.'} Semakan ini tidak menetapkan kelas sebenar atau menjamin jadual bebas konflik masa / pairing tetap / pautan subjek.</div>`;
  html+=groups.map(g=>`<div class="jw-agihan-coverage-item"><strong>${jwAgihanEscape(g.label)}</strong><span>${g.supplied}/${g.required} kuota · ${g.matched} boleh dipadankan${g.shortage?' · kurang '+g.shortage:''}${g.excess?' · lebih '+g.excess:''}${g.unmatched?' · '+g.unmatched+' tidak boleh dipadankan':''}${g.issues.length?' · '+jwAgihanEscape(g.issues[0]):''}</span><em class="jw-agihan-status is-${css[g.status]}">${label[g.status]}</em></div>`).join('');
  if(audit.invalid.length)html+=`<div class="jw-agihan-muted">Baris tidak sah dikecualikan: ${audit.invalid.slice(0,8).map(jwAgihanEscape).join(' · ')}${audit.invalid.length>8?' · dan '+(audit.invalid.length-8)+' lagi':''}</div>`;
  html+='</div></details>';
  for(let year=0;year<=6;year++){
    const rows=groups.flatMap(g=>g.years.filter(y=>y.year===year&&y.required>0).map(y=>({...y,g})));
    if(!rows.length)continue;
    const exact=rows.filter(r=>r.g.feasible&&r.flex===0).length,auto=rows.filter(r=>r.g.feasible&&r.flex>0).length,review=rows.length-exact-auto;
    html+=`<details class="jw-agihan-coverage-year" ${year===1?'open':''}><summary><strong>${jwYearLabel(year)}</strong><span>${exact+auto}/${rows.length} kuota mencukupi · ${auto} Auto · ${review} perlu semakan</span></summary><div class="jw-agihan-coverage-list">`;
    html+=rows.map(r=>{const ready=r.g.feasible,auto=r.flex>0;return `<div class="jw-agihan-coverage-item"><strong>${jwAgihanEscape(r.g.label)}</strong><span>${r.exact} kuota ditetapkan${auto?' · '+r.flex+' kuota Auto (contoh padanan)':''} · ${r.matched}/${r.required} boleh dipadankan${!ready?' · semak keseluruhan skop':''}</span><em class="jw-agihan-status is-${ready?'lengkap':'kurang'}">${ready?(auto?'Cukup · Auto':'Cukup'):'Semak'}</em></div>`;}).join('');
    html+='</div></details>';
  }
  html+=jwF2AuditHTML(JW_AGIHAN_CORE);
  html+=jw3LinkedQuotaHTML(JW_AGIHAN_CORE);
  el.innerHTML=(missingPra?'<div class="jw-agihan-empty">Kelas Prasekolah aktif tidak dikesan. Semak Master_Kelas_Bilik.</div>':'')+html;
}
function jwAgihanErrors(){
  const errors=[],bySub=new Map(JW_AGIHAN_CORE.subjects.map(s=>[s.id+'|'+s.year,s]));
  const seen=new Map();
  JW_AGIHAN_CORE.rows.forEach((r,i)=>{
    const issue=t=>errors.push({index:i,text:`Baris ${i+1}: ${t}`});
    const years=jwAgihanYears(r.scope),count=Number(r.count);
    if(!JW_AGIHAN_CORE.staff.some(t=>t.id===r.teacherId))issue('Guru tidak lagi aktif. Padam tugasan ini dan agihkan kepada guru aktif.');
    if(!r.subjectId||!r.choiceId||!years.length)issue('Pilih konfigurasi Tetapan Subjek dan skop tahun.');
    if(!Number.isInteger(count)||count<1)issue('Bilangan kelas tidak sah.');
    if(years.some(y=>bySub.get(r.choiceId+'|'+y)?.subjectId!==r.subjectId))issue('Konfigurasi subjek tidak tersedia bagi semua tahun yang dipilih.');
    const available=JW_AGIHAN_CORE.classes.filter(c=>years.includes(c.year));
    if(count>available.length)issue(`Kuota melebihi ${available.length} kelas yang tersedia.`);
    if(Object.keys(r.yearQuota||{}).length){const sum=Object.values(r.yearQuota).reduce((n,x)=>n+Number(x),0);
      if(sum!==count)issue(`Jumlah pecahan tahun (${sum}) mesti sama dengan ${count} kelas.`);}
    if(r.strategy==='TETAP'&&(r.fixedClassIds||[]).length!==count)issue(`Pilih ${count} kelas tetap.`);
    if(r.homeroom&&!jwAgihanEligibleHomerooms(r).length)issue('Keutamaan Guru Kelas tidak sepadan dengan sesi/skop/kuota/kelas tetap. Nyahpilih atau semak pelantikan.');
    years.forEach(y=>{const key=r.teacherId+'|'+r.choiceId+'|'+y;
      if(seen.has(key)&&!(r.relation?.type==='PAIR'&&seen.get(key)))issue('Subjek dan tahun bertindih dengan baris guru ini yang lain.');seen.set(key,r.relation?.type==='PAIR');});
  });return errors;
}
function jwAgihanErrorPopup(errors){
  document.querySelectorAll('[data-quota-row]').forEach(el=>el.classList.remove('is-error'));
  errors.forEach(x=>document.querySelector(`[data-quota-row="${x.index}"]`)?.classList.add('is-error'));
  jwAgihanNotice(errors.map(x=>x.text).slice(0,5).join(' • '),true);
  const id=JW_AGIHAN_CORE.rows[errors[0]?.index]?.teacherId;
  if(id){JW_AGIHAN_CORE.openTeachers.add(id);document.getElementById('jwAgihanFind').value='';
    document.getElementById('jwAgihanFilter').value='all';jwAgihanRenderTeachers();
    errors.forEach(x=>document.querySelector(`[data-quota-row="${x.index}"]`)?.classList.add('is-error'));
    document.querySelector(`[data-quota-row="${errors[0].index}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  return jwAgihanDialog({title:'Semak kuota guru',html:`<div class="jw-agihan-dialog-errors">${errors.slice(0,8).map(x=>`<p>${jwAgihanEscape(x.text)}</p>`).join('')}</div>`,icon:'warning'});
}
async function jwAgihanNew(){
  if(JW_AGIHAN_CORE.dirty&&!(await jwAgihanConfirm('Buka set baharu?','Perubahan yang belum disimpan akan hilang.','Set Baharu')))return;
  JW_AGIHAN_CORE.rows=[];JW_AGIHAN_CORE.currentId='';JW_AGIHAN_CORE.openTeachers.clear();
  document.getElementById('jwAgihanSetName').value='';JW_AGIHAN_CORE.needsResave=false;jwAgihanNotice('');jwAgihanSetDirty(false);jwAgihanRenderAll();jwAgihanTab('quota');
}
async function jwAgihanSave(){
  if(!JW_AGIHAN_CORE.subjectSet)return jwAgihanDialog({title:'Tetapan Subjek belum aktif',text:'Pilih Tetapan Subjek CORE terlebih dahulu.',icon:'warning'});
  const errors=jwAgihanErrors();if(errors.length)return jwAgihanErrorPopup(errors);
  const name=document.getElementById('jwAgihanSetName').value.trim(),year=Number(document.getElementById('jwAgihanYear').value);
  if(name.length<2||!JW_AGIHAN_CORE.rows.length)return jwAgihanDialog({title:'Agihan belum lengkap',text:'Isi nama set dan sekurang-kurangnya satu tugasan.',icon:'warning'});
  if(!(await jwAgihanConfirm('Simpan sebagai versi baharu?',`${JW_AGIHAN_CORE.rows.length} baris kuota akan disimpan di JW_Agihan_Baris. Jadual rasmi tidak berubah.`, 'Simpan Versi')))return;
  try{
    const res=await jwAgihanRequest('fiJWAgihanCoreSave',{name,year,clientVersion:'V2.8.0-F2',subjectSetId:JW_AGIHAN_CORE.subjectSet.id,rows:JW_AGIHAN_CORE.rows});
    JW_AGIHAN_CORE.currentId=res.id;JW_AGIHAN_CORE.dirty=false;JW_AGIHAN_CORE.needsResave=false;jwAgihanSetDirty(false);jwAgihanNotice('');
    await jwAgihanRefreshMetadata();
    await jwAgihanDialog({title:'Versi Agihan disimpan',text:'Set ini belum aktif. Klik Aktifkan Set untuk menjadikannya pilihan persediaan.',icon:'success'});
  }catch(e){jwAgihanNotice(e.message,true);jwAgihanOpenError(e);}
}
async function jwAgihanRefreshMetadata(){
  const res=await jwAgihanRequest('fiJWAgihanStudioGet');jwAgihanCheckVersion(res);
  JW_AGIHAN_CORE.presets=res.presets||[];JW_AGIHAN_CORE.selected=res.selected||null;JW_AGIHAN_CORE.constraints=res.constraints||null;JW_AGIHAN_CORE.roleData=res.roleData||{ok:false,roles:[]};
  JW_AGIHAN_CORE.takeovers=res.takeovers||[];JW_AGIHAN_CORE.plans=res.plans||[];
  jwAgihanSetDirty(JW_AGIHAN_CORE.dirty);jwAgihanRenderTeachers();jwAgihanRenderHistory();jwAgihanRenderTakeover();jwAgihanRenderPlan();
}
function jwAgihanOpenError(e){
  const text=String(e.message||e);const m=text.match(/BARIS\[(\d+)(?:,\d+)?\]/);
  if(m){const idx=Number(m[1])-1,r=JW_AGIHAN_CORE.rows[idx];if(r){JW_AGIHAN_CORE.openTeachers.add(r.teacherId);jwAgihanRenderTeachers();
    document.querySelector(`[data-quota-row="${idx}"]`)?.classList.add('is-error');}}
  return jwAgihanDialog({title:'Tindakan belum berjaya',text,icon:'error'});
}
async function jwAgihanActivate(){
  const id=JW_AGIHAN_CORE.currentId;
  if(!id||JW_AGIHAN_CORE.dirty||JW_AGIHAN_CORE.needsResave)return jwAgihanDialog({title:'Simpan Versi dahulu',text:'Aktifkan hanya versi yang sudah disimpan tanpa perubahan tertangguh.',icon:'warning'});
  if(!(await jwAgihanConfirm('Aktifkan Agihan ini?', 'Hanya menukar set Agihan CORE bagi persediaan. Jadual_Waktu_Hasil kekal.', 'Aktifkan Set')))return;
  try{await jwAgihanRequest('fiJWAgihanCoreActivate',{id});await jwAgihanRefreshMetadata();
    jwAgihanNotice('Set Agihan aktif berjaya ditetapkan. Tiada jadual baharu dijana.');
    await jwAgihanDialog({title:'Set Agihan diaktifkan',text:'Pilihan Agihan telah disimpan dalam JW_Agihan_Aktif.',icon:'success'});
  }catch(e){jwAgihanOpenError(e);}
}
function jwAgihanRenderHistory(){
  const select=document.getElementById('jwAgihanHistorySelect'),list=document.getElementById('jwAgihanHistoryList');
  if(!select||!list)return;
  const old=select.value;select.innerHTML='<option value="">— Pilih Set Agihan —</option>'+JW_AGIHAN_CORE.presets.map(p=>
    `<option value="${jwAgihanEscape(p.id)}" ${old===p.id?'selected':''}>${p.active?'✓ ':''}${jwAgihanEscape(p.name)} (${p.year})</option>`).join('');
  list.innerHTML=JW_AGIHAN_CORE.presets.map(p=>`<div class="jw-agihan-history-item"><div><strong>${p.active?'✓ ':''}${jwAgihanEscape(p.name)}</strong>
    <small>${p.year} · ${p.count} tugasan · ${jwAgihanEscape(p.createdAt)}</small></div>
    <span class="jw-agihan-tag ${p.active?'is-active':'jw-agihan-tag-muted'}">${p.active?'Aktif':'Tersimpan'}</span></div>`).join('')||'<div class="jw-agihan-empty">Belum ada sejarah Agihan.</div>';
}
async function jwAgihanRecall(){
  const id=document.getElementById('jwAgihanHistorySelect').value;
  if(!id)return jwAgihanDialog({title:'Pilih set dahulu',text:'Pilih versi Agihan yang hendak dipanggil semula.',icon:'info'});
  if(JW_AGIHAN_CORE.dirty&&!(await jwAgihanConfirm('Panggil semula versi?', 'Perubahan set kerja yang belum disimpan akan hilang.','Panggil Semula')))return;
  try{
    const r=await jwAgihanRequest('fiJWAgihanCoreRecall',{id});
    JW_AGIHAN_CORE.subjects=r.subjects||[];JW_AGIHAN_CORE.subjectSet=r.subjectSet||null;JW_AGIHAN_CORE.constraints=r.constraints||null;JW_AGIHAN_CORE.roleData=r.roleData||{ok:false,roles:[]};JW_AGIHAN_CORE.needsResave=!!r.needsResave;
    JW_AGIHAN_CORE.rows=r.rows||[];JW_AGIHAN_CORE.currentId=id;JW_AGIHAN_CORE.openTeachers.clear();
    JW_AGIHAN_CORE.rows.filter(r=>r.needsReview).forEach(r=>JW_AGIHAN_CORE.openTeachers.add(r.teacherId));
    document.getElementById('jwAgihanSetName').value=r.name;
    document.getElementById('jwAgihanYear').value=r.year;
    jwAgihanSetDirty(false);jwAgihanRenderAll();jwAgihanTab('quota');
    if(JW_AGIHAN_CORE.needsResave||JW_AGIHAN_CORE.rows.some(r=>r.needsReview))jwAgihanReviewNotice();else jwAgihanNotice('Versi sejarah dibuka. Kamu boleh edit dan Simpan Versi untuk menghasilkan versi baharu.');
  }catch(e){jwAgihanOpenError(e);}
}
function jwAgihanRenderTakeover(){
  const first=document.getElementById('jwAlihOriginal'),second=document.getElementById('jwAlihNew');
  if(!first||!second)return;
  if(!first.dataset.ready){
    first.innerHTML='<option value="">— Pilih guru asal —</option>'+JW_AGIHAN_CORE.historyStaff.map(t=>`<option value="${jwAgihanEscape(t.id)}">${jwAgihanEscape(t.name)}</option>`).join('');
    first.dataset.ready='true';
  }
  if(!second.dataset.ready){
    second.innerHTML='<option value="">— Pilih guru ganti —</option>'+JW_AGIHAN_CORE.staff.map(t=>`<option value="${jwAgihanEscape(t.id)}">${jwAgihanEscape(t.name)}</option>`).join('');
    second.dataset.ready='true';
  }
  const el=document.getElementById('jwAlihHistory');if(!el)return;
  el.innerHTML=jwAgihanRecords(JW_AGIHAN_CORE.takeovers,r=>`${r.ID_Guru_Asal} → ${r.ID_Guru_Ganti} · ${r.Tarikh_Mula}${r.Tarikh_Tamat?' – '+r.Tarikh_Tamat:''}`);
}
function jwAgihanTakeoverType(){document.getElementById('jwAlihEndBox').classList.toggle('hidden',document.getElementById('jwAlihType').value!=='TEMP');}
async function jwAgihanSaveTakeover(){
  const payload={originalId:document.getElementById('jwAlihOriginal').value,replacementId:document.getElementById('jwAlihNew').value,
    type:document.getElementById('jwAlihType').value,start:document.getElementById('jwAlihStart').value,
    end:document.getElementById('jwAlihType').value==='TEMP'?document.getElementById('jwAlihEnd').value:'',
    homeroom:document.getElementById('jwAlihHomeroom').checked,note:document.getElementById('jwAlihNote').value};
  if(!(await jwAgihanConfirm('Simpan rancangan pengambilalihan?',
    'Ini rekod perancangan sahaja. Guru rasmi dalam e-Relief dan jadual belum digantikan.','Simpan Rancangan')))return;
  try{await jwAgihanRequest('fiJWAgihanTakeoverPlan',payload);await jwAgihanRefreshMetadata();
    await jwAgihanDialog({title:'Rancangan disimpan',text:'Rekod belum dikuatkuasakan kepada jadual rasmi atau modul lain.',icon:'success'});
  }catch(e){jwAgihanOpenError(e);}
}
function jwAgihanRenderPlan(){
  const el=document.getElementById('jwPlanHistory');if(!el)return;
  el.innerHTML=jwAgihanRecords(JW_AGIHAN_CORE.plans,r=>`${r.Mod_Jana} · ${r.Sesi_Tahun} · mula ${r.Tarikh_Kuat_Kuasa}`);
}
function jwAgihanRecords(items,labeler){
  if(!items.length)return '<div class="jw-agihan-empty">Belum ada rekod perancangan.</div>';
  return '<div class="jw-agihan-records">'+items.map(r=>`<div class="jw-agihan-history-item"><div><strong>${jwAgihanEscape(labeler(r))}</strong>
    <small>${jwAgihanEscape(r.Tarikh_Rekod||'')}</small></div><span class="jw-agihan-tag jw-agihan-tag-muted">Rancangan</span></div>`).join('')+'</div>';
}
async function jwAgihanSavePlan(){
  const data={mode:document.getElementById('jwPlanMode').value,year:Number(document.getElementById('jwPlanYear').value),
    effectiveDate:document.getElementById('jwPlanStart').value,reference:document.getElementById('jwPlanReference').value,
    note:document.getElementById('jwPlanNote').value};
  if(!(await jwAgihanConfirm('Simpan rancangan Jana?',
    'Ini bukan butang Jana. Jadual yang digunakan pada tarikh semasa tidak berubah.','Simpan Rancangan')))return;
  try{await jwAgihanRequest('fiJWAgihanGenerationPlan',data);await jwAgihanRefreshMetadata();
    await jwAgihanDialog({title:'Rancangan berjaya disimpan',text:'Jana/Shuffle belum dijalankan. Tarikh kuat kuasa ini masih cadangan.',icon:'success'});
  }catch(e){jwAgihanOpenError(e);}
}


// V2.8.0 Fasa 1 — Constraints CORE (versioned Controller, existing style)
const JW_CON_F1={loaded:false,loading:false,dirty:false,id:'',data:null};
const jwConEl=id=>document.getElementById(id);
function jwConNotice(message,error=false){const el=jwConEl('jwConNotice');el.textContent=message;el.classList.toggle('hidden',!message);el.classList.toggle('is-error',error);}
function jwConDirty(){JW_CON_F1.dirty=true;jwConEl('jwConActivate').disabled=true;}
function jwConTab(tab){const edit=tab==='edit';jwConEl('jwConEdit').classList.toggle('hidden',!edit);jwConEl('jwConHistory').classList.toggle('hidden',edit);[['jwConTabEdit',edit],['jwConTabHistory',!edit]].forEach(([id,active])=>{const el=jwConEl(id);el.classList.toggle('is-active',active);el.setAttribute('aria-selected',String(active));});}
function jwConRules(){return {maxConsecutive:Number(jwConEl('jwConRun').value),minGapPeriods:Number(jwConEl('jwConGap').value),maxDaily:Number(jwConEl('jwConDaily').value),balanceDaily:jwConEl('jwConBalance').checked,coverEveryDay:jwConEl('jwConCover').checked,linkPJPK:jwConEl('jwConLink').checked,specific:JSON.parse(JSON.stringify(JW_CON_F1.specific||[]))};}
function jwConApply(set){const d=JW_CON_F1.data,r=set?.rules||d.defaults;JW_CON_F1.id=set?.id||'';JW_CON_F1.dirty=false;
  jwConEl('jwConName').value=set?.name||('Kekangan Sesi '+d.year);jwConEl('jwConYear').value=d.year;
  jwConEl('jwConRun').value=r.maxConsecutive;jwConEl('jwConGap').value=r.minGapPeriods;jwConEl('jwConDaily').value=r.maxDaily;
  jwConEl('jwConBalance').checked=r.balanceDaily;jwConEl('jwConCover').checked=r.coverEveryDay;jwConEl('jwConLink').checked=r.linkPJPK;
  JW_CON_F1.specific=JSON.parse(JSON.stringify(r.specific||[])).map(v=>v.type==='LOCK_SESSION'?{type:'ALLOC_TIME',target:v.target,targets:[v.target],choiceIds:[v.choiceId],classIds:[v.classId],days:[Number(v.day)],mode:'LOCK',strength:'HARD',start:v.start,end:v.end,blockPeriods:0,beforeOwnRecess:false,note:v.note||''}:v);jwF2ConRender();
  jwConEl('jwConActivate').disabled=!set?.id||set.id===d.active?.id;
}
function jwConMeta(d){JW_CON_F1.data=d;jwConEl('jwConActive').textContent=d.active?'Aktif: '+d.active.name:'Belum ada set aktif';jwConEl('jwConActive').classList.toggle('jw-con-inactive',!d.active);
  const select=jwConEl('jwConHistorySelect');select.replaceChildren(new Option('— Pilih Set —',''));const list=jwConEl('jwConHistoryList');list.replaceChildren();
  d.sets.forEach(s=>{const active=s.id===d.active?.id;select.add(new Option(s.name+' · '+s.year+(active?' · ✓ Aktif':''),s.id));const e=document.createElement('div');e.className='jw-agihan-history-item';const info=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small'),tag=document.createElement('span');title.textContent=s.name;meta.textContent=s.year+' · '+(s.savedAt||'');info.append(title,meta);tag.className='jw-agihan-tag'+(active?'':' jw-agihan-tag-muted');tag.textContent=active?'✓ Aktif':'Tersimpan';e.append(info,tag);list.appendChild(e);});if(!d.sets.length){const empty=document.createElement('div');empty.className='jw-agihan-empty';empty.textContent='Belum ada set kekangan disimpan.';list.appendChild(empty);}
  const ctl=d.choices?.controller,gridInfo=jwConEl('jw3GridInfo');if(gridInfo)gridInfo.textContent=ctl?'Grid aktif: mula '+ctl.start+' · PdPc '+(ctl.types.find(t=>t.id==='PDP')?.duration||'—')+' minit · Rehat '+(ctl.types.find(t=>t.id==='REHAT')?.duration||'—')+' minit · Senggang '+ctl.gapMinutes+' minit. Julat sebenar ikut hari dan kohort.':'Grid Masa belum aktif.';
  const locked=jwConEl('jwConLocked');locked.replaceChildren();const labels={TIADA_PERTINDIHAN_GURU:'Tiada pertindihan guru',TIADA_PERTINDIHAN_KELAS:'Tiada pertindihan kelas',TIADA_PERTINDIHAN_BILIK_MELEBIHI_KAPASITI:'Tiada pertindihan bilik melebihi kapasiti',CUKUP_WAKTU_SUBJEK:'Cukup waktu subjek',PATUH_CORAK_BLOK:'Patuh corak blok',BLOK_TIDAK_RENTAS_REHAT_ATAU_SLOT_BUKAN_PDPC:'Blok tidak merentasi rehat atau slot bukan PdPc',CO_TEACHING_SERENTAK:'Co-Teaching serentak',DALAM_GRID_MASA:'Dalam Grid Masa',PRA_SUBJEK_DITETAPKAN_SAHAJA:'Prasekolah: subjek yang ditetapkan sahaja'};
  d.locked.forEach(k=>{const e=document.createElement('div');e.className='jw-con-locked-item';const icon=document.createElement('i');icon.className='fa-solid fa-lock';icon.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=labels[k]||k;e.append(icon,label);locked.appendChild(e);});
}
async function jwConLoad(force=false,preload=false){if(JW_CON_F1.loading||JW_CON_F1.loaded&&!force)return;if(!preload&&JW_CON_F1.dirty&&!await jwAgihanConfirm('Muat semula?','Perubahan belum disimpan akan hilang.','Muat Semula'))return;JW_CON_F1.loading=true;
  try{const d=await jwAgihanRequest('fiJWConstraintF1Get',{},!preload);if(d.version!=='V2.8.0-F2'||d.simulationVersion!=='V3.0-UAT3B')throw Error('Backend Constraints belum versi V3.0-UAT3B. Deploy kod baharu.');jwConMeta(d);jwConApply(d.active);JW_CON_F1.loaded=true;jwConNotice('');}catch(e){JW_CON_F1.loaded=false;jwConNotice(e.message,true);if(preload)throw e;}finally{JW_CON_F1.loading=false;}}
async function jwConNew(){if(!JW_CON_F1.data)return;if(JW_CON_F1.dirty&&!await jwAgihanConfirm('Set baharu?','Perubahan belum disimpan akan hilang.','Set Baharu'))return;jwConApply(null);jwConTab('edit');jwConDirty();}
async function jwConRecall(){const d=JW_CON_F1.data,set=d?.sets.find(x=>x.id===jwConEl('jwConHistorySelect').value);if(!set)return jwConNotice('Pilih set dahulu.',true);if(JW_CON_F1.dirty&&!await jwAgihanConfirm('Panggil semula?','Perubahan belum disimpan akan hilang.','Panggil Semula'))return;jwConApply(set);jwConTab('edit');jwConNotice('Versi sejarah dibuka; belum diaktifkan.');}
async function jwConSave(){if(!JW_CON_F1.data)return;try{const r=await jwAgihanRequest('fiJWConstraintF1Save',{year:JW_CON_F1.data.year,clientVersion:'V2.8.0-F2',name:jwConEl('jwConName').value,rules:jwConRules()});const d=await jwAgihanRequest('fiJWConstraintF1Get');jwConMeta(d);jwConApply(d.sets.find(x=>x.id===r.id));jwConNotice('Versi disimpan. Klik Aktifkan Set jika mahu digunakan.');}catch(e){jwConNotice(e.message,true);}}
async function jwConActivate(){if(JW_CON_F1.dirty||!JW_CON_F1.id)return;if(!await jwAgihanConfirm('Aktifkan Constraints?','Set ini digunakan untuk perancangan sahaja; jadual rasmi tidak disentuh.','Aktifkan'))return;try{await jwAgihanRequest('fiJWConstraintF1Activate',{id:JW_CON_F1.id});const d=await jwAgihanRequest('fiJWConstraintF1Get');jwConMeta(d);jwConApply(d.active);if(typeof JW_AGIHAN_CORE!=='undefined'){JW_AGIHAN_CORE.constraints=d.active;if(JW_AGIHAN_CORE.subjects?.length)jwAgihanRenderCoverage();}
    jwConNotice('Constraints aktif. Set agihan lama tidak diubah.');}catch(e){jwConNotice(e.message,true);}}

// F2 relationship editor. Existing independent rows never auto-merged by guessing.
function jwF2Sig(r){return JSON.stringify([r.scope,Number(r.count),r.strategy,Object.entries(r.yearQuota||{}).map(([y,n])=>[y,Number(n)]).sort(),[...(r.fixedClassIds||[])].sort()]);}
function jwF2Other(r,core=JW_AGIHAN_CORE){return r.relation?core.rows.find(x=>x!==r&&x.relation?.id===r.relation.id&&x.relation?.role!==r.relation.role):null;}
function jwF2Name(id){return JW_AGIHAN_CORE.staff.find(t=>t.id===id)?.name||id;}
function jwF2PK(r){const years=jwAgihanYears(r.scope);const a=jwAgihanSubjectIndex().filter(x=>x.code==='PK'&&!x.coTeaching&&years.every(y=>x.years.includes(y)));return a.length===1?a[0]:null;}
function jwF2Sync(r){if(!r.relation)return true;const other=jwF2Other(r);if(!other||r.relation.role!=='MAIN')return false;
  if(r.relation.type==='LINK'){const pk=jwF2PK(r);if(!pk)return false;Object.assign(other,{choiceId:pk.id,subjectId:pk.subjectId,code:pk.code,settingIds:pk.settingIds,configurationYears:pk.years,coTeaching:false});}
  ['scope','count','strategy','yearQuota','fixedClassIds'].forEach(k=>other[k]=JSON.parse(JSON.stringify(r[k])));
  // A priority may become invalid after changing the shared class scope. Do not silently erase it; existing validation will ask for review.
  return true;
}
function jwF2RelationHTML(r,choice){
  if(r.relation){const b=jwF2Other(JW_AGIHAN_CORE.rows[r.index]);return `<div class="jw-agihan-field"><label>${r.relation.type==='PAIR'?'Guru Pairing':'Subjek terikat'}</label><span class="jw-agihan-tag">${jwAgihanEscape(b?(r.relation.type==='PAIR'?jwF2Name(b.teacherId):b.code):'Hubungan tidak lengkap')}</span> <button type="button" class="jw-agihan-btn jw-agihan-btn-light" onclick="jwF2Unlink(${r.index})">Leraikan</button><span class="jw-agihan-muted">Edit kuota di baris induk sahaja.</span></div>`;}
  if(!choice)return '';
  const rows=JW_AGIHAN_CORE.rows,main=rows[r.index],type=choice.coTeaching?'PAIR':choice.code==='PJ'&&JW_AGIHAN_CORE.constraints?.rules?.linkPJPK?'LINK':'';if(!type)return '';
  const pk=type==='LINK'?jwF2PK(r):null;
  if(type==='LINK'&&!pk)return '<p class="jw-agihan-muted">Tiada konfigurasi PK tunggal sepadan dengan skop PJ.</p>';
  const eligible=rows.map((x,i)=>({x,i})).filter(({x})=>x!==main&&!x.relation&&jwF2Sig(x)===jwF2Sig(main)&&(type==='PAIR'?x.choiceId===main.choiceId&&x.teacherId!==main.teacherId:x.choiceId===pk.id&&x.teacherId===main.teacherId));
  const existing=eligible.map(({x,i})=>`<option value="row:${i}">Paut agihan sedia ada — ${jwAgihanEscape(type==='PAIR'?jwF2Name(x.teacherId):'PK')} (${x.count} kelas)</option>`).join('');
  const fresh=type==='PAIR'?JW_AGIHAN_CORE.staff.filter(t=>t.id!==r.teacherId).map(t=>`<option value="new:${jwAgihanEscape(t.id)}">Tambah agihan — ${jwAgihanEscape(t.name)}</option>`).join(''):'<option value="newPK">Tambah PK automatik</option>';
  return `<div class="jw-agihan-field"><label>${type==='PAIR'?'Guru Pairing — pilih atau paut agihan sedia ada':'Pautan PJ → PK'}</label><select id="jwF2Rel${r.index}"><option value="">— Pilih —</option>${existing?'<optgroup label="Agihan sepadan">'+existing+'</optgroup>':''}<optgroup label="Agihan baharu">${fresh}</optgroup></select><button type="button" class="jw-agihan-btn jw-agihan-btn-light" onclick="jwF2CreateRelation(${r.index},'${type}',document.getElementById('jwF2Rel${r.index}').value)">Pautkan</button><span class="jw-agihan-muted">${type==='PAIR'?'Pecahan pasangan: tambah baris bagi pasangan lain dengan kuota masing-masing.':'Pilih agihan sedia ada jika sudah diisi; elak kuota berganda.'}</span></div>`;
}
function jwF2SecondaryHTML(r){const main=jwF2Other(JW_AGIHAN_CORE.rows[r.index]),est=jwAgihanEstimate(r);return `<div class="jw-agihan-quota-row" data-quota-row="${r.index}"><strong>${jwAgihanEscape(jwAgihanSubjectIndex().find(s=>s.id===r.choiceId)?.label||r.code)} — ${r.relation.type==='PAIR'?'Guru Pairing':'Agihan berpaut'}</strong><div class="jw-agihan-muted">${jwAgihanEscape(jwAgihanScopeLabel(r.scope))} · ${r.count} kelas · ${est===null?'Beban ikut tahun':est+' waktu'} · Induk: ${jwAgihanEscape(main?jwF2Name(main.teacherId)+' / '+main.code:'Tidak ditemui')}</div>${jwAgihanEligibleHomerooms(r).length||r.homeroom?`<label class="jw-agihan-check jw-agihan-linecheck"><input type="checkbox" ${r.homeroom?'checked':''} onchange="jwF2SecondaryPriority(${r.index},this.checked)"> Utamakan kelas sendiri (${jwAgihanEscape(jwAgihanEligibleHomerooms(r).map(c=>c.className).join(', ')||'semak pelantikan')})</label>`:''}<button type="button" class="jw-agihan-btn jw-agihan-btn-light" onclick="jwF2Unlink(${r.index})">Leraikan hubungan (kekalkan kedua-dua agihan)</button></div>`;}
function jwF2Refresh(){jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderStats();jwAgihanRenderCoverage();}
async function jwF2CreateRelation(idx,type,value,auto=false){const rows=JW_AGIHAN_CORE.rows,a=rows[idx];if(!a||a.relation||!value)return;
  let b,add=false;
  if(type==='PAIR'&&!jwAgihanSubjectIndex().find(s=>s.id===a.choiceId)?.coTeaching)return;
  if(type==='LINK'&&(a.code!=='PJ'||!JW_AGIHAN_CORE.constraints?.rules?.linkPJPK||!jwF2PK(a)))return;
  if(value.startsWith('row:')){b=rows[Number(value.slice(4))];if(!b||b===a||b.relation||jwF2Sig(a)!==jwF2Sig(b)||!(type==='PAIR'?b.choiceId===a.choiceId&&b.teacherId!==a.teacherId:b.choiceId===jwF2PK(a).id&&b.teacherId===a.teacherId))return jwAgihanNotice('Agihan pasangan tidak sepadan.',true);}
  else {add=true;b=JSON.parse(JSON.stringify(a));delete b.id;b.note='';b.homeroom=false;b.needsReview=false;
    if(type==='PAIR'){b.teacherId=value.slice(4);if(b.teacherId===a.teacherId||!JW_AGIHAN_CORE.staff.some(t=>t.id===b.teacherId))return;}
    else {const pk=jwF2PK(a);Object.assign(b,{choiceId:pk.id,subjectId:pk.subjectId,code:pk.code,settingIds:pk.settingIds,configurationYears:pk.years,coTeaching:false});}
    if(rows.some(x=>x.teacherId===b.teacherId&&x.choiceId===b.choiceId&&!x.relation&&jwAgihanYears(x.scope).some(y=>jwAgihanYears(b.scope).includes(y))))return jwAgihanNotice('Guru/subjek ini sudah ada agihan bebas bertindih. Paut baris sedia ada yang sepadan atau pecahkan kuota dahulu.',true);
  }
  if(!auto&&!await jwAgihanConfirm('Paut agihan?',add?'Agihan pasangan baharu akan dikira dalam beban mengajar. Pastikan kuota tidak berganda.':'Kedua-dua baris sedia ada akan dipaut tanpa menambah kuota.','Pautkan'))return;
  if(a.relation||b.relation||!rows.includes(a)||(!add&&!rows.includes(b)))return;
  const id='REL-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));a.relation={id,type,role:'MAIN'};b.relation={id,type,role:'SECOND'};if(add)rows.push(b);jwF2Refresh();
}
async function jwF2Unlink(idx){const r=JW_AGIHAN_CORE.rows[idx];if(!r?.relation)return;if(!await jwAgihanConfirm('Leraikan hubungan?','Kedua-dua agihan kekal sebagai baris bebas. Semak kuota dan pairing semula.','Leraikan'))return;const b=jwF2Other(r);if(b)b.relation=null;r.relation=null;jwF2Refresh();}
function jwF2AuditHTML(core){const mains=core.rows.filter(r=>r.relation?.role==='MAIN'),unpaired=core.rows.filter(r=>core.subjects.some(s=>s.id===r.choiceId&&s.coTeaching)&&!r.relation),linkedRule=core.constraints?.rules?.linkPJPK,unlinked=linkedRule?core.rows.filter(r=>['PJ','PK'].includes(r.code)&&!r.relation):[];
  const bad=mains.filter(r=>{const b=jwF2Other(r,core);return !b||jwF2Sig(r)!==jwF2Sig(b);});
  // Fully paired groups require one pair task per class; existing independent quota audit is insufficient for shared-class matching.
  const issues=[];const groups=[...new Set(mains.filter(r=>r.relation.type==='PAIR').map(r=>r.choiceId))];
  for(const id of groups){const all=core.rows.filter(r=>r.choiceId===id);if(all.some(r=>!r.relation))continue;
    const classes=core.classes.filter(c=>core.subjects.some(s=>s.id===id&&s.year===c.year));const cap=new Map(classes.map(c=>[c.id,1])),occupied=new Map(classes.map(c=>[c.id,new Set()])),tasks=[];
    let ok=true;for(const r of all.filter(x=>x.relation.role==='MAIN')){if(r.strategy==='TETAP'){for(const cid of r.fixedClassIds||[]){if(cap.get(cid)!==1){ok=false;continue;}cap.set(cid,0);}}else if(Object.keys(r.yearQuota||{}).length){Object.entries(r.yearQuota).forEach(([y,n])=>{if(Number(n)>0)tasks.push({teacherId:r.relation.id,years:[Number(y)],count:Number(n)});});}else tasks.push({teacherId:r.relation.id,years:jwAgihanYears(r.scope),count:Number(r.count)});}
    const need=tasks.reduce((n,t)=>n+t.count,0);if(!ok||jwAgihanCoverageFlow(tasks,classes,cap,occupied).flow!==need||need+[...cap.values()].filter(n=>n===0).length!==classes.length)issues.push(core.subjects.find(s=>s.id===id)?.label||id);
  }
  return `<div class="jw-agihan-muted"><strong>Semakan hubungan (berasingan daripada kuota)</strong><br>${mains.length} hubungan berpaut · ${unpaired.length} baris Co-Teaching belum ditetapkan pasangan · ${unlinked.length} baris PJ/PK belum dipaut${bad.length?' · '+bad.length+' hubungan tidak sepadan':''}${issues.length?' · Konflik pasangan: '+jwAgihanEscape(issues.join(', ')):''}. ${linkedRule?'Pautan PJ–PK aktif.':'Pautan PJ–PK belum aktif.'} Padanan masa belum diuji.</div>`;
}
// Constraints specific form, data is kept within the existing version JSON.
const JW_F2_TYPES=[['LINKED_CO','Pautan Guru Utama (Single → Co-Teaching)'],['ALLOC_TIME','Kekangan masa daripada Agihan Guru'],['REFERENCE_RECESS','Subjek / kohort — rujukan rehat'],['PJ_BEFORE_T2_RECESS','PJ sebelum rehat Tahap 2 (legacy)'],['TEACHER_LIMIT','Had guru / kategori'],['TEACHER_BLOCK','Pelepasan guru'],['SUBJECT_BLOCK','Larangan waktu subjek'],['SUBJECT_PREFER','Keutamaan waktu subjek'],['ROOM_BLOCK','Bilik tidak tersedia'],['ROOM_USE','Penggunaan bilik & kapasiti'],['LOCK_SESSION','Kunci sesi PdPc (legacy)']];
function jwF2ConOptions(arr,val){return '<option value="">— Pilih —</option>'+arr.map(x=>`<option value="${jwAgihanEscape(x.id)}" ${String(x.id)===String(val)?'selected':''}>${jwAgihanEscape(x.label||x.name||x.id)}</option>`).join('');}
function jwF2ConRender(){const wrap=jwConEl('jwF2Specific');if(!wrap)return;const c=JW_CON_F1.data?.choices;if(!c)return;
 const field=(label,html)=>`<div class="jw-agihan-field"><label>${label}</label>${html}</div>`;
 wrap.innerHTML=(JW_CON_F1.specific||[]).map((r,i)=>{if(['ALLOC_TIME','PJ_BEFORE_T2_RECESS','REFERENCE_RECESS','LINKED_CO'].includes(r.type))return jw3SpecificHTML(r,i,c);const input=(key,type='text',min='',max='')=>type==='time'?jw3TimeSelect(i,key,(c.grid||[]).filter(s=>s.day===Number(r.day)).map(s=>key==='start'?s.start:s.end),r[key]):`<input type="${type}" ${min!==''?'min="'+min+'"':''} ${max!==''?'max="'+max+'"':''} value="${jwAgihanEscape(r[key]??'')}" onchange="jwF2ConChange(${i},'${key}',this.value)">`;
 const sel=(key,options)=>`<select onchange="jwF2ConChange(${i},'${key}',this.value)">${jwF2ConOptions(options,r[key])}</select>`;
 const t=r.type,targets=t==='TEACHER_LIMIT'&&r.targetType==='ROLE'?c.roles.map(x=>({id:x,name:x})):['TEACHER_LIMIT','TEACHER_BLOCK','LOCK_SESSION'].includes(t)?c.staff:t==='ROOM_BLOCK'?c.locations:c.subjects;
 return `<div class="jw-agihan-quota-row jw-con-specific-row"><div class="jw-con-specific-head"><strong>Peraturan ${i+1}</strong><button type="button" class="jw-agihan-btn jw-con-remove" onclick="jwF2ConRemove(${i})"><i class="fa-solid fa-trash-can"></i> Padam</button></div><div class="jw-con-specific-grid">${field('Kategori kekangan',sel('type',JW_F2_TYPES.filter(([id])=>id!=='LOCK_SESSION').map(([id,name])=>({id,name}))))}${t==='TEACHER_LIMIT'?field('Skop',sel('targetType',[{id:'STAFF',name:'Individu'},{id:'ROLE',name:'Kategori staf'}])):''}${field('Sasaran',sel('target',targets))}${field('Jenis',sel('strength',[{id:'HARD',name:'Wajib'},{id:'SOFT',name:'Keutamaan'}]))}${t==='TEACHER_LIMIT'?field('Maks. sehari (0 = tiada had)',input('maxDaily','number',0,40))+field('Maks. berturut',input('maxConsecutive','number',1,4))+field('Min. senggang',input('minGapPeriods','number',1,4))+field('Minimum hari (0 = bebas, kosong = ikut umum)',input('minDays','number',0,5)):t==='ROOM_USE'?field('Lokasi',sel('locationId',c.locations))+field('Kapasiti serentak',input('capacity','number',1,20)):field('Hari',sel('day',['Isnin','Selasa','Rabu','Khamis','Jumaat'].map((name,j)=>({id:String(j+1),name}))))+field('Mula',input('start','time'))+field('Tamat',input('end','time'))}${t==='LOCK_SESSION'?field('Subjek',sel('choiceId',c.subjects))+field('Kelas',sel('classId',c.classes)):''}${field('Catatan',input('note'))}</div></div>`;
 }).join('')||'<div class="jw-agihan-empty">Tiada kekangan khusus. Tetapan umum masih terpakai.</div>';
}
function jwF2ConDefault(type='ALLOC_TIME'){if(type==='LINKED_CO')return {type,mainChoiceId:'',linkedChoiceIds:[],pairMode:'FLEXIBLE',strength:'HARD',note:''};if(type==='REFERENCE_RECESS')return {type,choiceId:'',year:'-1',referenceScope:'T2',days:[1,2,3,4,5],exact:false,blockPeriods:2,displayStart:'',displayEnd:'',strength:'HARD',note:''};if(type==='ALLOC_TIME')return {type,target:'',targets:[],choiceIds:[],classIds:[],days:[1,2,3,4,5],mode:'ALLOW',strength:'HARD',start:'',end:'',blockPeriods:0,beforeOwnRecess:false,note:''};if(type==='PJ_BEFORE_T2_RECESS')return {type,target:'PJ',strength:'HARD',note:''};return {type,target:'',targetType:'STAFF',strength:type==='SUBJECT_PREFER'?'SOFT':'HARD',maxDaily:0,maxConsecutive:4,minGapPeriods:1,day:'1',start:'07:30',end:'08:00',locationId:'',capacity:1,choiceId:'',classId:'',note:''};}
function jwF2ConAdd(){if(!JW_CON_F1.data)return;JW_CON_F1.specific.push(jwF2ConDefault());jwConDirty();jwF2ConRender();}
function jwF2ConChange(i,key,value){const r=JW_CON_F1.specific[i];if(!r)return;if(key==='type')JW_CON_F1.specific[i]=jwF2ConDefault(value);else {r[key]=value;if(key==='targetType')r.target='';}jwConDirty();if(['type','targetType','day','target','choiceId'].includes(key))jwF2ConRender();}
function jwF2ConRemove(i){JW_CON_F1.specific.splice(i,1);jwConDirty();jwF2ConRender();}

function jwF2SecondaryPriority(i,checked){const r=JW_AGIHAN_CORE.rows[i];if(r?.relation?.role!=='SECOND')return;r.homeroom=checked;jwF2Refresh();}
async function jwF2Suggest(){
  const errors=jwAgihanErrors();if(errors.length)return jwAgihanErrorPopup(errors);
  const core=JW_AGIHAN_CORE,snapshot=JSON.stringify(core.rows),id=core.currentId,year=jwAgihanSessionYear(),subjectSetId=core.subjectSet?.id;
  try{const r=await jwAgihanRequest('fiJWF2Suggest',{rows:JSON.parse(snapshot),year,subjectSetId});
    const detail=`Sumber ${r.sourceYear}: ${r.paired} pasangan Co-Teaching, ${r.linked} pautan PJ–PK boleh ditetapkan. ${r.unpaired} baris Co-Teaching dan ${r.unlinked} baris PJ/PK masih bebas. Tiada kuota guru ditambah/dibuang. ${r.notes.join(' | ')}`;
    if(!r.paired&&!r.linked)return jwAgihanDialog({title:'Tiada pautan pasti',text:detail,icon:'info'});
    if(!await jwAgihanConfirm('Gunakan cadangan pautan?',detail,'Gunakan dalam draf'))return;
    if(snapshot!==JSON.stringify(core.rows)||id!==core.currentId||year!==jwAgihanSessionYear()||subjectSetId!==core.subjectSet?.id)return jwAgihanNotice('Set kerja berubah semasa semakan. Cuba semula.',true);
    core.rows=r.rows;jwF2Refresh();jwAgihanNotice('Cadangan dimasukkan dalam draf sahaja. Semak dan Simpan Versi apabila bersedia.');
  }catch(e){jwAgihanOpenError(e);}
}

// V3 UAT: allocation-aware constraint editor and independent simulation console.
function jw3List(values){return Array.isArray(values)?values:[];}
function jw3Multi(i,key,items,selected,allLabel='Pilih semua'){
  const esc=jwAgihanEscape,sel=new Set(jw3List(selected).map(String));
  const opts=items.map(x=>`<label class="jw-agihan-check jw-con-check jw3-option"><input type="checkbox" value="${esc(x.id)}" ${sel.has(String(x.id))?'checked':''} onchange="jw3MultiChange(${i},'${key}',this)"><span>${esc(x.label||x.name||x.id)}</span></label>`).join('');
  return `<details class="jw3-multi" data-rule="${i}" data-key="${key}" ${key==='days'?'open':''}><summary>${sel.size?sel.size+' dipilih':'— Pilih —'}</summary><div class="jw3-multi-actions"><button type="button" class="jw-agihan-btn jw-agihan-btn-light" onclick="jw3SelectAll(${i},'${key}',this,true)">${esc(allLabel)}</button><button type="button" class="jw-agihan-btn jw-agihan-btn-light" onclick="jw3SelectAll(${i},'${key}',this,false)">Kosongkan</button></div><div class="jw3-options">${opts||'<small>Tiada pilihan sepadan.</small>'}</div></details>`;
}
function jw3MultiChange(i,key,el){const r=JW_CON_F1.specific[i];const v=Array.from(el.closest('details').querySelectorAll('input:checked')).map(x=>key==='days'?Number(x.value):x.value);jw3SetMulti(i,key,v);}
function jw3SelectAll(i,key,el,on){const v=on?Array.from(el.closest('details').querySelectorAll('input')).map(x=>key==='days'?Number(x.value):x.value):[];jw3SetMulti(i,key,v);}
function jw3SetMulti(i,key,v){const r=JW_CON_F1.specific[i];r[key]=v;if(key==='targets'){r.target=v[0]||'';r.choiceIds=[];r.classIds=[];}if(key==='choiceIds')r.classIds=[];jwConDirty();jwF2ConRender();document.querySelector(`.jw3-multi[data-rule="${i}"][data-key="${key}"]`)?.setAttribute('open','');}
function jw3Set(i,key,val){const r=JW_CON_F1.specific[i];r[key]=val;if(r.type==='LINKED_CO'&&key==='mainChoiceId')r.linkedChoiceIds=[];if(key==='mode'){r.strength=val==='PREFER'?'SOFT':'HARD';}if(r.type==='ALLOC_TIME'&&['start','blockPeriods'].includes(key)&&r.start&&Number(r.blockPeriods)>0){const c=JW_CON_F1.data.choices,ar=c.allocations.filter(a=>r.targets.includes(a.teacherId)&&(!r.choiceIds.length||r.choiceIds.includes(a.choiceId))),yrs=[...new Set(c.classes.filter(t=>ar.some(a=>a.classIds.includes(t.id))&&(!r.classIds.length||r.classIds.includes(t.id))).map(t=>t.year))],ends=new Set();for(const y of yrs)for(const d of r.days){const ss=c.grid.filter(q=>q.year===y&&q.day===d&&q.type==='PDP').sort((a,b)=>a.start.localeCompare(b.start)),idx=ss.findIndex(q=>q.start===r.start);if(idx<0)continue;const b=ss.slice(idx,idx+Number(r.blockPeriods));if(b.length===Number(r.blockPeriods)&&b.every((q,j)=>!j||b[j-1].end===q.start))ends.add(b[b.length-1].end);}if(ends.size===1)r.end=[...ends][0];}jwConDirty();jwF2ConRender();}
function jw3TimeSelect(i,key,values,selected){const esc=jwAgihanEscape,all=[...new Set(values)].sort();return `<select onchange="jw3Set(${i},'${key}',this.value)"><option value="">— Pilih masa Grid —</option>${selected&&!all.includes(selected)?`<option selected value="${esc(selected)}">${esc(selected)} (semak Grid)</option>`:''}${all.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('')}</select>`;}
function jw3SpecificHTML(r,i,c){const esc=jwAgihanEscape,field=(label,html)=>`<div class="jw-agihan-field"><label>${label}</label>${html}</div>`;
 const header=`<div class="jw-con-specific-head"><strong>Peraturan ${i+1}</strong><button type="button" class="jw-agihan-btn jw-con-remove" onclick="jwF2ConRemove(${i})"><i class="fa-solid fa-trash-can"></i> Padam</button></div>`;
 const type=field('Kategori kekangan',`<select onchange="jwF2ConChange(${i},'type',this.value)">${jwF2ConOptions(JW_F2_TYPES.filter(([id])=>id!=='LOCK_SESSION').map(([id,name])=>({id,name})),r.type)}</select>`);
 if(r.type==='LINKED_CO'){
  const main=c.subjects.find(s=>s.id===r.mainChoiceId),single=c.subjects.filter(s=>!s.coTeaching&&s.requiredTeachers===1),children=c.subjects.filter(s=>s.coTeaching&&main&&JSON.stringify([...s.years].sort())===JSON.stringify([...main.years].sort()));
  const select=(key,items)=>`<select onchange="jw3Set(${i},'${key}',this.value)">${jwF2ConOptions(items,r[key])}</select>`;
  return `<div class="jw-agihan-quota-row jw-con-specific-row">${header}<div class="jw-con-specific-grid">${type}${field('Sumber Guru Utama (Single)',select('mainChoiceId',single))}${field('Komponen Co-Teaching berpaut',jw3Multi(i,'linkedChoiceIds',children,r.linkedChoiceIds||[]))}${field('Guru kedua',select('pairMode',[{id:'FLEXIBLE',name:'Pairing boleh sama atau berlainan'},{id:'SAME',name:'Pairing mesti sama'}]))}${field('Jenis','<span class="jw-agihan-tag">Wajib</span>')}${field('Catatan',`<input maxlength="300" value="${esc(r.note||'')}" onchange="jw3Set(${i},'note',this.value)">`)}</div><div class="jw-agihan-muted">Guru Utama dikenal pasti daripada agihan Single bagi kelas yang sama. Kuota Co-Teaching digunakan untuk kelas hakiki dahulu; baki menjadi pairing. Semua konfigurasi mesti mempunyai skop tahun yang sama.</div></div>`;
 }
 if(r.type==='REFERENCE_RECESS'){
  const select=(key,items)=>`<select onchange="jw3Set(${i},'${key}',this.value)">${jwF2ConOptions(items,r[key])}</select>`;
  const years=[{id:-1,name:'Semua kohort subjek'},...Array.from({length:7},(_,y)=>({id:y,name:y===0?'Prasekolah':'Tahun '+y}))];
  return `<div class="jw-agihan-quota-row jw-con-specific-row">${header}<div class="jw-con-specific-grid">${type}${field('Konfigurasi subjek',select('choiceId',c.subjects))}${field('Kohort sasaran',select('year',years))}${field('Grid rujukan',select('referenceScope',[{id:'T1',name:'Tahap 1'},{id:'T2',name:'Tahap 2'},...Array.from({length:6},(_,j)=>({id:'Y'+(j+1),name:'Tahun '+(j+1)}))]))}${field('Hari dibenarkan',jw3Multi(i,'days',['Isnin','Selasa','Rabu','Khamis','Jumaat'].map((name,j)=>({id:j+1,name})),r.days))}${field('Kedudukan',`<label class="jw-agihan-check"><input type="checkbox" ${r.exact?'checked':''} onchange="jw3Set(${i},'exact',this.checked)"> Blok terakhir tepat sebelum rehat (jika tidak, mana-mana slot sebelum rehat)</label>`)}${field('Bil. waktu blok tepat',select('blockPeriods',[1,2,3,4].map(n=>({id:n,name:n+' waktu'}))))}${field('Mula paparan pilihan',`<input type="time" value="${esc(r.displayStart||'')}" onchange="jw3Set(${i},'displayStart',this.value)">`)}${field('Tamat paparan pilihan',`<input type="time" value="${esc(r.displayEnd||'')}" onchange="jw3Set(${i},'displayEnd',this.value)">`)}${field('Catatan',`<input maxlength="300" value="${esc(r.note||'')}" onchange="jw3Set(${i},'note',this.value)">`)}</div><div class="jw-agihan-muted">Masa dibaca daripada Grid rujukan aktif. Untuk blok tepat, pastikan slot kohort sasaran sudah tersedia dalam Grid. Paparan penuh ialah pilihan visual, tidak menambah kuota PdPc.</div></div>`;
 }
 if(r.type==='PJ_BEFORE_T2_RECESS'){
   const starts=[1,2,3,4,5].map(day=>{const slots=c.grid.filter(s=>s.year>=4&&s.day===day&&s.type==='REHAT').map(s=>s.start).sort();return ['Isn','Sel','Rab','Kha','Jum'][day-1]+': '+(slots[0]||'Tiada rehat');});
   return `<div class="jw-agihan-quota-row jw-con-specific-row">${header}<div class="jw-con-specific-grid">${type}${field('Sumber masa',`<span class="jw-agihan-tag">Grid Masa Aktif · Rehat Tahap 2</span>`)}${field('Jenis','<span class="jw-agihan-tag">Wajib</span>')}</div><div class="jw-agihan-muted">PJ mesti tamat sebelum rehat Tahap 2. ${esc(starts.join(' · '))}. Slot kelas sendiri juga mesti PdPc.</div></div>`;
 }
 const allocations=c.allocations||[],staff=c.staff.filter(t=>allocations.some(a=>a.teacherId===t.id)),as=allocations.filter(a=>jw3List(r.targets).includes(a.teacherId));
 const ss=c.subjects.filter(s=>as.some(a=>a.choiceId===s.id)).map(s=>{const a=as.filter(a=>a.choiceId===s.id),lo=a.reduce((n,x)=>n+x.periods,0),hi=a.reduce((n,x)=>n+x.periodsMax,0);return {...s,label:`${s.label} · ${a.map(x=>x.scope).filter((v,j,b)=>b.indexOf(v)===j).join('/')} · ${lo}${hi!==lo?'–'+hi:''} waktu`};});
 const ar=as.filter(a=>!jw3List(r.choiceIds).length||r.choiceIds.includes(a.choiceId));
 const cl=c.classes.filter(t=>ar.some(a=>a.classIds.includes(t.id))).map(t=>({...t,label:t.name+(ar.some(a=>a.strategy==='TETAP'&&a.classIds.includes(t.id))?' · Tetap':' · Calon Auto')}));
 const yrs=[...new Set(cl.filter(t=>!jw3List(r.classIds).length||r.classIds.includes(t.id)).map(t=>t.year))];
 const gg=c.grid.filter(s=>yrs.includes(s.year)&&jw3List(r.days).includes(s.day)&&s.type==='PDP');
 const starts=gg.map(s=>s.start),ends=gg.filter(s=>!r.start||s.end>r.start).map(s=>s.end);const sel=(key,opts)=>`<select onchange="jw3Set(${i},'${key}',this.value)">${jwF2ConOptions(opts,r[key])}</select>`;
 const info=ar.length?ar.map(a=>`${c.staff.find(t=>t.id===a.teacherId)?.name||a.teacherId} · ${a.code} · ${a.scope} · ${a.count} kelas · ${a.strategy} · ${a.periods}${a.periods!==a.periodsMax?'–'+a.periodsMax:''} waktu`).join(' | '):'Pilih guru daripada Agihan Guru aktif.';
 return `<div class="jw-agihan-quota-row jw-con-specific-row">${header}<div class="jw-con-specific-grid">${type}${field('Kaedah masa',sel('mode',[{id:'ALLOW',name:'Hadkan dalam julat masa (Wajib)'},{id:'BLOCK',name:'Larangan masa (Wajib)'},{id:'PREFER',name:'Utamakan masa (Soft)'},{id:'LOCK',name:'Kunci satu sesi tepat (Wajib)'}]))}${field('Guru (Agihan aktif)',jw3Multi(i,'targets',staff,r.targets))}${field('Subjek / agihan (kosong = semua)',jw3Multi(i,'choiceIds',ss,r.choiceIds))}${field('Kelas (kosong = semua dalam agihan)',jw3Multi(i,'classIds',cl,r.classIds))}${field('Hari',jw3Multi(i,'days',['Isnin','Selasa','Rabu','Khamis','Jumaat'].map((name,j)=>({id:j+1,name})),r.days))}${field('Mula — Grid aktif',jw3TimeSelect(i,'start',starts,r.start))}${field('Tamat — Grid aktif',jw3TimeSelect(i,'end',ends,r.end))}${field('Saiz sesi',sel('blockPeriods',[{id:'0',name:'Ikut Tetapan Subjek'},{id:'1',name:'1 waktu'},{id:'2',name:'2 waktu berturutan'}]))}${field('Rehat kelas sendiri',`<label class="jw-agihan-check"><input type="checkbox" ${r.beforeOwnRecess?'checked':''} onchange="jw3Set(${i},'beforeOwnRecess',this.checked)"> Mesti sebelum rehat</label>`)}${field('Catatan',`<input maxlength="300" value="${esc(r.note||'')}" onchange="jw3Set(${i},'note',this.value)">`)}</div><div class="jw-agihan-muted jw3-allocation-detail">${esc(info)}. ${r.mode==='LOCK'?'Kunci tepat: satu guru, subjek, kelas dan hari bagi setiap peraturan.':'Kelas Auto ialah calon; Generator memadankan mengikut kuota.'}</div></div>`;
}
async function jw3Preset(){if(!await jwAgihanConfirm('Isi tetapan sekolah?','Tetapan ini menggantikan draf Constraints sahaja. Set sejarah dan Agihan Guru kekal.','Isi Draf'))return;try{const d=await jwAgihanRequest('fiJW3Preset');jwConApply({name:'UAT V3 — Kekangan sekolah '+JW_CON_F1.data.year,rules:d.rules});jwConDirty();jwConNotice('Tetapan sekolah dimasukkan. Simpan Versi dan Aktifkan Set.');}catch(e){jwConNotice(e.message,true);}}
let JW3_RESULT=null,JW3_BUSY=false,JW3_STOP=false;
function jw3RunButton(){jwLiveControls();const b=document.getElementById('jw3Run');if(!b)return;b.disabled=false;b.textContent=JW3_BUSY?(JW3_STOP?'Berhenti selepas pusingan ini…':'Hentikan selepas pusingan'):JW_LIVE_VIEW&&JW3_RESULT?'Buka calon jadual':JW3_RESULT?.optimization?.canContinue?'Sambung Penjanaan':'Jana Jadual Baharu';const reset=document.getElementById('jw3Reset');if(reset){reset.disabled=JW3_BUSY;reset.hidden=!!JW_LIVE_VIEW;}}
async function jw3ResetSimulation(){if(JW3_BUSY||JW_BOOT_BUSY)return;if(!await jwAgihanConfirm('Jana jadual baharu?','Calon belum disimpan akan dilepaskan. Jadual rasmi tidak berubah sehingga draf diterbitkan.','Jana Baharu'))return;JW_LIVE_VIEW=null;JW3_RESULT=null;document.getElementById('jw3Output').replaceChildren();renderJadualHasilView();await jw3RunSimulation(true);}

async function jw3RunSimulation(confirmed=false){
 if(JW_BOOT_BUSY||!JW_BOOT_READY||JW_LIVE_BUSY)return;
 if(JW3_BUSY){JW3_STOP=true;jw3RunButton();return;}
 if(JW_LIVE_VIEW&&JW3_RESULT){JW_LIVE_VIEW=null;jw3RenderResult();jwLiveUpdateStatus();renderJadualHasilView();jw3RunButton();return;}
 if(JW3_RESULT&&!JW3_RESULT.optimization?.canContinue)return jw3ResetSimulation();
 if(!JW3_RESULT&&!confirmed&&!await jwAgihanConfirm('Jana jadual baharu?','Hasil ialah calon jadual. Jadual rasmi aktif kekal sehingga penerbitan diluluskan.','Jana Baharu'))return;
 const btn=document.getElementById('jw3Run'),status=document.getElementById('jw3Status');if(!btn||!status)return;
 if(!document.getElementById('jw3Reset')){const reset=document.createElement('button');reset.id='jw3Reset';reset.type='button';reset.className='jw-agihan-btn jw-agihan-btn-light';reset.textContent='Jana Baharu';reset.addEventListener('click',jw3ResetSimulation);btn.insertAdjacentElement('afterend',reset);}
 JW_LIVE_VIEW=null;JW3_BUSY=true;JW3_STOP=false;jw3RunButton();if(!JW3_RESULT){document.getElementById('jw3Output')?.replaceChildren();renderJadualHasilView();}let stagnant=0,rounds=0;
 // Sequential bounded calls: keep the best result and checkpoint in this portal session.
 // No database writes, no triggers, and no parallel requests.
 try{
  for(let i=0;i<12&&!JW3_STOP;i++){
   const prev=JW3_RESULT,cp=prev?.checkpoint;
   status.textContent='Pusingan '+((cp?.round||0)+1)+' · '+(prev?prev.stats.scheduledPeriods+'/'+prev.stats.expectedPeriods+' waktu terbaik · '+((cp?.stall||0)>=4?'backup susun semula blok':(cp?.stall||0)>=2?'backup rantai adaptif':'membaiki konflik')+'…':'Membaca empat set CORE aktif…');
   const r=await jwAgihanRequest('fiJW3Simulate',cp?{checkpoint:cp}:{},false);
   if(!r.checkpoint||!r.optimization||r.build!=='UAT3B')throw Error('Backend belum UAT3B. Deploy New Version pada deployment sedia ada.');
   if(prev&&(r.checkpoint.signature!==cp.signature||r.checkpoint.round!==cp.round+1||r.stats.scheduledPeriods<prev.stats.scheduledPeriods||r.optimization.quality>prev.optimization.quality))throw Error('Hasil sambungan tidak konsisten; jadual terbaik terdahulu dikekalkan.');
   if(r.printBuild!=='UAT3B-PRINT1'||!Array.isArray(r.printGrid))throw Error('Backend patch cetakan belum aktif. Deploy New Version.');jw3SlotRows(r);if(prev?.generatedAt&&JSON.stringify(prev.checkpoint.picks)===JSON.stringify(r.checkpoint.picks))r.generatedAt=prev.generatedAt;JW3_RESULT=r;rounds++;stagnant=prev&&r.optimization.stall>0?stagnant+1:0;jw3RenderResult();renderJadualHasilView();
   status.textContent='Pusingan '+r.checkpoint.round+' · '+r.stats.scheduledPeriods+'/'+r.stats.expectedPeriods+' waktu · baki '+r.stats.missingPeriods+' · '+r.status;
   if(!r.optimization.canContinue||stagnant>=9)break;
  }
  const r=JW3_RESULT;if(r){const reason=JW3_STOP?'Dihentikan selepas pusingan':!r.optimization.canContinue?(r.optimization.stopReason==='LENGKAP'?'Lengkap — audit selesai':r.optimization.stopReason==='SEMAK_TETAPAN'?'Semak tetapan / padanan semasa':'Audit konflik — perlu semakan'):stagnant>=9?'Tiada peningkatan dalam 9 pusingan; backup telah dicuba; boleh sambung':'Had 12 pusingan; boleh sambung';status.textContent=reason+' · '+r.stats.scheduledPeriods+'/'+r.stats.expectedPeriods+' waktu · baki '+r.stats.missingPeriods+' · pusingan '+r.checkpoint.round+' · Jadual rasmi tidak diubah';}
 }catch(e){if(!JW3_RESULT&&JW_LIVE_ACTIVE){JW_LIVE_VIEW=JW_LIVE_ACTIVE;jw3RenderResult();renderJadualHasilView();}status.textContent='Penjanaan belum berjaya: '+e.message+(JW3_RESULT?' · Jadual terbaik terdahulu dikekalkan.':'');}finally{JW3_BUSY=false;JW3_STOP=false;jw3RunButton();}
}
function jw3RenderResult(){const r=jwLiveViewed();if(!r)return;const oldMode=document.getElementById('jw3Mode')?.value,oldFilter=document.getElementById('jw3Filter')?.value;const esc=jwAgihanEscape,st=r.stats,metrics=[['Waktu kelas dijana',st.scheduledPeriods+'/'+st.expectedPeriods],['Waktu belum dijana',st.missingPeriods],['Pertindihan guru',st.teacherClashes],['Pertindihan kelas',st.classClashes],['Pertindihan bilik',st.roomClashes],['Co-Teaching tidak padan',st.coMismatch],['Pautan Guru Utama tidak padan',st.linkedMismatch??'—'],['Blok tidak sah',st.blockMismatch],['Had harian dilanggar',st.dailyViolations],['Had berturut dilanggar',st.consecutiveViolations],['Senggang tidak cukup',st.gapViolations],['Waktu Co-Teaching belum dijana',st.missingCoPeriods],['PJ–PK tidak padan',st.linkMismatch],['Co-Teaching belum berpaut (baris)',st.unpairedRows],['Komponen tiada padanan',st.unmatchedComponents],['Kunci belum dipenuhi',st.missingLocks],['Rujukan rehat dilanggar',st.referenceViolations],['Blok rujukan belum dijana',st.referenceMissingDays],['Liputan hari belum cukup',st.coverageViolations],['Ralat / Amaran',st.errors+' / '+st.warnings],['Pusingan pengoptimuman',r.optimization?.round??'—'],['Cubaan peralihan berantai',r.optimization?.chainMovesAttempted??'—'],['Mod carian',r.optimization?.searchMode??'—'],['Kedalaman rantai',r.optimization?.chainDepth??'—'],['Susun semula blok berjaya / cubaan',(r.optimization?.repackSuccesses??0)+' / '+(r.optimization?.repackAttempts??0)]];
 const table=(head,rows)=>`<div class="jw3-scroll"><table class="jw3-table"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(String(v??''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 document.getElementById('jw3Output').innerHTML=`${jwLiveViewBanner(r)}${r.liveVersion?'<details class="jw-live-audit"><summary>Audit & statistik jadual</summary>':''}<div class="jw3-stats">${metrics.map(([k,v])=>`<div class="jw-agihan-quota-row"><small>${esc(k)}</small><strong>${esc(String(v))}</strong></div>`).join('')}</div><p class="jw-agihan-muted">Set CORE penjanaan: ${esc(JSON.stringify(r.sets))}</p><div class="jw3-toolbar"><button class="jw-agihan-btn jw-agihan-btn-light" onclick="jw3Download('csv')">Eksport jadual CSV</button><button class="jw-agihan-btn jw-agihan-btn-light" onclick="jw3Download('json')">Eksport audit JSON</button></div><details open><summary>Ralat & amaran (${r.issues.length+r.warnings.length})</summary>${table(['Jenis','Butiran'],[...r.issues,...r.warnings].map(({type,...d})=>[type,JSON.stringify(d)]))}</details>${r.linkedAudit?.length?`<details open><summary>Audit Guru Utama & Pairing (${r.linkedAudit.length} kelas)</summary>${table(['Kelas','Guru Utama','Komponen','Guru kedua','Waktu dijana / sasaran','Padanan'],r.linkedAudit.flatMap(a=>a.components.map(p=>[a.className,a.mainTeacherName,p.label,p.teacherNames.filter((n,i)=>p.teachers[i]!==a.mainTeacherId).join(' + ')||'—',p.mainScheduled+'/'+p.expected,a.valid&&p.valid?'Sepadan':'Semak'])) )}</details>`:''}<details open><summary>Statistik guru — beban Isnin hingga Jumaat</summary>${table(['Guru','Kuota waktu','Dipadankan','Dijana','Isn','Sel','Rab','Kha','Jum','Hari'],r.teacherStats.map(t=>[t.name,t.plannedMin===t.plannedMax?t.plannedMin:t.plannedMin+'–'+t.plannedMax,t.required,t.scheduled,...t.days,t.targetDays===0?t.activeDays+' (bebas)':t.activeDays+'/'+t.targetDays]))}</details><details><summary>Statistik kelas</summary>${table(['Kelas','Sasaran','Dijana','Slot PdPc'],r.classStats.map(c=>[c.name,c.expected,c.scheduled,c.gridSlots]))}</details>${r.liveVersion?'</details>':''}<div class="jw3-toolbar" ${r.liveVersion?'hidden style="display:none"':''}><label>Semakan calon jadual</label><select id="jw3Mode" onchange="jw3ViewOptions()"><option value="kelas">Mengikut kelas</option><option value="guru">Mengikut guru</option></select><select id="jw3Filter" onchange="jw3RenderSchedule()"></select></div><div id="jw3Schedule" ${r.liveVersion?'hidden':''}></div>`;if(r.liveVersion)return;if(oldMode)document.getElementById("jw3Mode").value=oldMode;jw3ViewOptions();const filter=document.getElementById("jw3Filter");if(oldFilter&&Array.from(filter.options).some(o=>o.value===oldFilter)){filter.value=oldFilter;jw3RenderSchedule();}}
function jw3ViewOptions(){const r=jwLiveViewed(),m=document.getElementById('jw3Mode').value,el=document.getElementById('jw3Filter');el.replaceChildren();const list=m==='kelas'?r.classStats:r.teacherStats;list.forEach(t=>el.add(new Option(t.name,t.id)));jw3RenderSchedule();}
function jw3RenderSchedule(){const r=jwLiveViewed(),mode=document.getElementById('jw3Mode').value,id=document.getElementById('jw3Filter').value,esc=jwAgihanEscape;const rows=r.sessions.filter(s=>mode==='kelas'?s.classId===id:s.teachers.includes(id));const display=mode==='kelas'?r.classStats.find(c=>c.id===id)?.display:null;if(display){jw3RenderSparse(rows,display);return;}document.getElementById('jw3Schedule').innerHTML=`<div class="jw3-scroll"><div class="jw3-week">${['Isnin','Selasa','Rabu','Khamis','Jumaat'].map((d,i)=>`<div><h4>${d}</h4>${rows.filter(s=>s.day===i+1).sort((a,b)=>a.start.localeCompare(b.start)).map(s=>`<div class="jw3-session"><small>${esc(s.start)}–${esc(s.end)}</small><strong>${esc(s.code)} · ${esc(s.className)}</strong><small>${esc(s.teacherNames.join(' + '))}</small></div>`).join('')||'<small>Tiada PdPc dijana</small>'}</div>`).join('')}</div></div>`;}
function jw3Download(format,r=jwLiveViewed()){if(!r)return;let data,ext;if(format==='json'){data=JSON.stringify(r,null,2);ext='json';}else{const quote=v=>{let s=String(v??'');if(/^[=+@\-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};try{const rows=jw3SlotRows(r);data='\uFEFF'+[['Kelas','Hari','Mula','Tamat','Subjek','Guru','Bilik ID','Waktu','Co-Teaching','No_Waktu','Slot_Index','Slot_Label','Slot_ID','ID_Kelas','ID_Subjek','Kod_Subjek','ID_Guru_Utama','ID_Guru_Pair','Tahun_Kelas','Hari_Index','Grid_ID','Sumber_Jadual','Masa_Jana'],...rows.map(({s,g})=>[s.className,JW3_PRINT_DAYS[s.day-1],g.start,g.end,s.subject,s.teacherNames.join(' + '),s.room,1,s.coTeaching?'Ya':'Tidak',g.number,g.number,'W'+g.number,g.id,s.classId,s.subjectId,s.code,s.teachers[0],s.teachers[1]||'',s.year,s.day,r.sets.grid,r.liveVersion?'LIVE_'+r.liveVersion.Status:'CALON_JADUAL',r.generatedAt])].map(row=>row.map(quote).join(',')).join('\r\n');}catch(e){Swal.fire('Eksport belum tersedia',e.message,'warning');return;}ext='csv';}const url=URL.createObjectURL(new Blob([data],{type:format==='json'?'application/json':'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=r.liveVersion?'SeMAKMUR_'+r.liveVersion.Jadual_ID+'.'+ext:'SeMAKMUR_CALON_JADUAL_'+r.sets.year+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

// Grid reference builder: edits draft only, no automatic activation.
async function jwGridBuildReferencePra(){
 try{jwGridEnsureDraft();}catch(e){return Swal.fire('Grid Masa',e.message,'warning');}
 const q=await Swal.fire({title:'Bina slot Prasekolah daripada Grid',html:'<label>Kohort rujukan</label><select id="jwRefScope" class="swal2-select"><option value="T2">Tahap 2</option><option value="T1">Tahap 1</option>'+[1,2,3,4,5,6].map(y=>'<option value="Y'+y+'">Tahun '+y+'</option>').join('')+'</select><div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">'+JW_GRID_DAYS.map((d,i)=>'<label><input type="checkbox" class="jwRefDay" value="'+i+'" '+([0,2].includes(i)?'checked':'')+'> '+d+'</label>').join('')+'</div><label>Bilangan slot terakhir sebelum rehat</label><input id="jwRefCount" class="swal2-input" type="number" min="1" max="4" value="2">',showCancelButton:true,confirmButtonText:'Bina Draf',cancelButtonText:'Batal',preConfirm:()=>{const scope=document.getElementById('jwRefScope').value,days=[...document.querySelectorAll('.jwRefDay:checked')].map(e=>Number(e.value)),count=Number(document.getElementById('jwRefCount').value);if(!days.length||!Number.isInteger(count)||count<1||count>4){Swal.showValidationMessage('Pilih hari dan 1–4 slot.');return false;}return {scope,days,count};}});
 if(!q.isConfirmed)return;const {scope,days,count}=q.value,backup=jwGridClone(STATE_GRID_MASA);
 try{const years=jwGridYears(scope),pdp=JW_GRID_WORK_CTRL.types.find(t=>t.id==='PDP');if(!pdp?.active)throw Error('PdPc tidak aktif.');let added=0;
 for(const d of days){const day=JW_GRID_DAYS[d],lists=years.map(y=>STATE_GRID_MASA.filter(r=>r.Hari===day&&jwGridYears(r.Tahap).includes(y))),breaks=lists.map(a=>a.find(r=>jwGridType(r).id==='REHAT')?.Jam_Mula);if(breaks.some(t=>!t)||new Set(breaks).size!==1)throw Error('Rehat tidak tersedia/seragam: '+day);const end=breaks[0],slots=lists[0].filter(r=>jwGridType(r).id==='PDP'&&r.Jam_Tamat<=end).sort((a,b)=>a.Jam_Mula.localeCompare(b.Jam_Mula)).slice(-count);if(slots.length!==count||slots.at(-1).Jam_Tamat!==end||slots.some((r,i)=>i&&slots[i-1].Jam_Tamat!==r.Jam_Mula)||slots.some(r=>!lists.every(a=>a.some(t=>jwGridType(t).id==='PDP'&&t.Jam_Mula===r.Jam_Mula&&t.Jam_Tamat===r.Jam_Tamat))))throw Error('Tiada blok sepadan pada '+day);
 for(const r of slots){const existing=STATE_GRID_MASA.filter(t=>t.Hari===day&&jwGridYears(t.Tahap).includes(0));if(existing.some(t=>jwGridType(t).id==='PDP'&&t.Jam_Mula===r.Jam_Mula&&t.Jam_Tamat===r.Jam_Tamat))continue;if(existing.some(t=>t.Jam_Mula<r.Jam_Tamat&&r.Jam_Mula<t.Jam_Tamat))throw Error('Slot PRA bertindih: '+day);STATE_GRID_MASA.push({Slot_ID:'',Hari:day,Tahap:'PRA',No_Waktu:'',Jam_Mula:r.Jam_Mula,Jam_Tamat:r.Jam_Tamat,Jenis_ID:'PDP',Jenis_Slot:pdp.legacy});added++;}
 jwGridRecalculateDay(day);}
 JW_GRID_DIRTY=true;renderGridMasaTable();jwGridColorMessage(added+' slot PRA ditambah dalam draf. Simpan versi dan aktifkan jika sesuai.');
 }catch(e){STATE_GRID_MASA=backup;renderGridMasaTable();Swal.fire('Grid tidak diubah',e.message,'warning');}
}
function jw3RenderSparse(rows,display){
 const esc=jwAgihanEscape,start=jwGridClock(display.start),end=jwGridClock(display.end),step=Number(display.minutes);if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(step)||step<=0||end<=start)return;
 const boundaries=new Set([start,end]);for(let m=start+step;m<end;m+=step)boundaries.add(m);for(const s of rows){const a=jwGridClock(s.start),b=jwGridClock(s.end);if(a>start&&a<end)boundaries.add(a);if(b>start&&b<end)boundaries.add(b);}
 const bs=[...boundaries].sort((a,b)=>a-b);const body=bs.slice(0,-1).map((a,i)=>{const b=bs[i+1];return `<tr><td>${esc(jwGridTime(a))}–${esc(jwGridTime(b))}</td>${[1,2,3,4,5].map(d=>{const s=rows.find(q=>q.day===d&&jwGridClock(q.start)<=a&&jwGridClock(q.end)>=b);return `<td>${s?'<strong>'+esc(s.code)+'</strong>':''}</td>`;}).join('')}</tr>`;}).join('');
 document.getElementById('jw3Schedule').innerHTML=`<div class="jw3-scroll"><table class="jw3-table"><thead><tr>${['Masa','Isnin','Selasa','Rabu','Khamis','Jumaat'].map(d=>'<th>'+d+'</th>').join('')}</tr></thead><tbody>${body}</tbody></table></div><p class="jw-agihan-muted">Ruang kosong tidak diurus Generator. Tamat paparan ${esc(display.end)}.</p>`;
}

function jw3LinkedQuotaHTML(state){const esc=jwAgihanEscape,rules=(state.constraints?.rules?.specific||[]).filter(r=>r.type==='LINKED_CO');
 return rules.map(r=>{const ids=[r.mainChoiceId,...r.linkedChoiceIds],teachers=new Map();for(const q of state.rows.filter(q=>ids.includes(q.choiceId))){if(!teachers.has(q.teacherId))teachers.set(q.teacherId,Array(ids.length).fill(0));teachers.get(q.teacherId)[ids.indexOf(q.choiceId)]+=Number(q.count||0);}const label=id=>state.subjects.find(s=>s.id===id)?.label||id;
 const items=[...teachers].map(([id,a])=>{const ok=a.slice(1).every(n=>n>=a[0]);return `<div class="jw-agihan-coverage-item"><strong>${esc(state.staff.find(t=>t.id===id)?.name||id)}</strong><span>Guru Utama: ${a[0]} kelas · ${a.slice(1).map((n,i)=>esc(label(ids[i+1]))+': '+n+' (baki '+(n-a[0])+')').join(' · ')}</span><em class="jw-agihan-status is-${ok?'lengkap':'kurang'}">${ok?'Kuota cukup':'Kuota kurang'}</em></div>`;}).join('');
 return `<details class="jw-agihan-coverage-year" style="grid-column:1/-1" open><summary><strong>Pautan Guru Utama — ${esc(label(ids[0]))}</strong><span>Semakan kuota individu</span></summary><div class="jw-agihan-coverage-list"><div class="jw-agihan-muted">Baki = kuota Co-Teaching tolak kelas hakiki Single. Ini semakan jumlah; skop tahun, kelas tetap dan pasangan rasmi diuji oleh Generator.</div>${items}</div></details>`;}).join('');}

// UAT3B Print/Export patch: never reads or writes official timetable when displaying simulation.
const JW3_PRINT_DAYS=['Isnin','Selasa','Rabu','Khamis','Jumaat'];
let JW3_PRINT_SOURCE=null,JW3_IMPORTED_PRINT=null;
function jw3PrintResult(){return jwLiveViewed();}
function jw3SlotMap(r){const map=new Map();for(const g of r.printGrid||[])for(const y of g.years)map.set(`${y}|${g.day}|${g.id}`,g);return map;}
function jw3SlotRows(r){const map=jw3SlotMap(r),out=[];for(const s of r.sessions){const slots=s.slotIds.map(id=>map.get(`${s.year}|${s.day}|${id}`));if(slots.length!==s.periods||slots.some(g=>!g||g.type!=='PDP'||!g.number)||slots[0]?.start!==s.start||slots.at(-1)?.end!==s.end||slots.some((g,i)=>i&&slots[i-1].end!==g.start))throw Error('Metadata Grid tidak sepadan: '+s.className+' '+s.day+' '+s.start);for(const g of slots)out.push({s,g});}return out;}
function jw3PrintStyles(){if(document.getElementById('jw3PrintStyle'))return;const style=document.createElement('style');style.id='jw3PrintStyle';style.textContent=`
.jw3-print-card{box-sizing:border-box;background:#fff;color:#101827;border:2px solid #101827;padding:16px;margin:0 0 20px;font-family:Arial,sans-serif;min-width:950px;line-height:1.25}.jw3-print-card *{box-sizing:border-box}.jw3-print-card .jw3-print-heading{text-align:center;border-bottom:1px solid #b7c2d0;padding:8px 0 10px;margin-bottom:8px}.jw3-print-heading h2{font-size:20px;font-weight:700;margin:0 0 4px}.jw3-print-heading p{font-size:12px;font-weight:500;margin:0}.jw3-print-heading .jw3-source-note{font-size:10px;color:#475569;margin-top:3px}.jw3-print-week{table-layout:fixed;border-collapse:collapse;width:100%;font-size:12px;text-align:center}.jw3-print-week th,.jw3-print-week td{border:1px solid #293342;padding:5px 2px;overflow-wrap:anywhere;vertical-align:middle}.jw3-print-week th{background:#121a2c;color:white;font-size:11px;font-weight:600}.jw3-print-week .jw3-dayname{width:68px;background:#eef2f6;color:#101827;font-weight:600;font-size:12px}.jw3-print-week thead .jw3-dayname{background:#121a2c;color:white}.jw3-print-week td{height:55px}.jw3-print-week .jw3-rehat{background:#fff2c9;color:#794000}.jw3-print-week .jw3-rehat-vertical{writing-mode:vertical-rl;transform:rotate(180deg);font-weight:500;white-space:nowrap}.jw3-print-week .jw3-other{background:#e9edf2;color:#23354a;font-weight:400}.jw3-print-week .jw3-empty{color:#a1aebf}.jw3-print-week .jw3-slot-time{font-size:10px;display:block;font-weight:400;white-space:nowrap}.jw3-print-week .jw3-slot-variant{display:block;font-size:9px;font-weight:400;line-height:1.1}.jw3-print-week .jw3-slot-code{display:block;font-size:14px;font-weight:500}.jw3-print-week .jw3-slot-detail{display:block;font-size:11px;font-weight:400}.jw3-print-week .jw3-slot-pair{font-size:9px;font-weight:400;display:block;color:#3b4658}.jw3-print-week .jw3-gap{background:#f8fafc;color:#94a3b8}.jw3-print-footer{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start;justify-content:space-between;margin-top:10px;font-size:10px}.jw3-print-meta{flex:1 1 150px;min-width:0}.jw3-print-footer p{margin:0 0 4px}.jw3-print-summary-group{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px;flex:0 1 auto;max-width:100%}.jw3-print-summary{border-collapse:collapse;min-width:115px;font-size:10px;align-self:flex-start}.jw3-print-summary th,.jw3-print-summary td{border:1px solid #293342;padding:3px 5px}.jw3-print-summary th{background:#e9edf2;font-weight:600}.jw3-print-summary td:last-child{text-align:center}.jw3-print-summary .jw3-total td{background:#e0e6ef;font-weight:600}.jw3-print-card .jw3-gen-date{font-style:italic;color:#475569}.jw3-print-root{display:none}.jw3-class-teacher{display:block}.jw3-print-card.jw3-many-cols .jw3-slot-time{white-space:normal}.jw3-print-card.jw3-many-cols .jw3-slot-code{font-size:12px}.jw3-print-card.jw3-many-cols .jw3-slot-detail{font-size:10px}
@media print{@page{size:A4 landscape;margin:6mm}body.jw3-isolated-print{margin:0!important;padding:0!important;display:block!important;overflow:visible!important;background:white!important}body.jw3-isolated-print>:not(#jw3PrintRoot){display:none!important}body.jw3-isolated-print #jw3PrintRoot{display:block!important;width:285mm!important;margin:0!important;padding:0!important;position:static!important;overflow:visible!important}.jw3-print-root .jw3-print-card{width:285mm;min-width:0;max-width:none;margin:0;padding:3mm;break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always;box-shadow:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}.jw3-print-root .jw3-print-card:last-child{break-after:auto;page-break-after:auto}.jw3-print-root .jw3-print-heading h2{font-size:14pt}.jw3-print-root .jw3-print-heading p{font-size:9pt}.jw3-print-root .jw3-print-heading .jw3-source-note{font-size:7pt}.jw3-print-root .jw3-print-week td{height:15mm;padding:2px 1px}.jw3-print-root .jw3-print-week .jw3-dayname{width:15mm;font-size:8pt}.jw3-print-root .jw3-print-week th{font-size:8pt}.jw3-print-root .jw3-print-week .jw3-slot-time{font-size:7pt}.jw3-print-root .jw3-print-week .jw3-slot-variant{font-size:6pt}.jw3-print-root .jw3-print-week .jw3-slot-code{font-size:10pt}.jw3-print-root .jw3-print-week .jw3-slot-detail{font-size:8pt}.jw3-print-root .jw3-print-kelas .jw3-slot-detail,.jw3-print-root .jw3-print-week .jw3-slot-pair{font-size:7pt;line-height:1.1}.jw3-print-root .jw3-many-cols .jw3-slot-time{font-size:6pt}.jw3-print-root .jw3-many-cols .jw3-slot-code{font-size:8pt}.jw3-print-root .jw3-many-cols .jw3-slot-detail{font-size:6.5pt}.jw3-print-root .jw3-print-week .jw3-long-name{font-size:6pt;line-height:1.02;overflow-wrap:anywhere}.jw3-print-root .jw3-print-footer{font-size:7.5pt}.jw3-print-root .jw3-print-summary{font-size:7.5pt;min-width:24mm}.jw3-print-root .jw3-print-summary td,.jw3-print-root .jw3-print-summary th{padding:1px 3px}.jw3-print-root .jw3-print-summary-group{gap:1mm}}
`;document.head.appendChild(style);}
function jw3PrintTimeLabel(g){const n=String(g.number||'');return n?'W'+n:'';}
// PRINT3 — use the actual Grid interval; merge counted activities into the period column.
function jw3PrintDayColumns(r,day,years,display){const groups=new Map();for(const g of r.printGrid||[]){const ys=g.years.filter(y=>years.includes(y));if(g.day!==day||!ys.length)continue;const type=g.type==='PDP'||(g.number&&g.type!=='REHAT')?'PDP':g.type;const key=[g.start,g.end,type].join('|');let q=groups.get(key);if(!q){q={start:g.start,end:g.end,type,name:g.name,ids:new Set(),labels:new Map(),years:new Set(),activities:new Set()};groups.set(key,q);}q.ids.add(g.id);ys.forEach(y=>q.years.add(y));if(g.type!=='PDP'&&g.type!=='REHAT')q.activities.add(g.type==='PERHIMPUNAN'?'PER':g.type==='KARAKTER'?'PEMK':g.name);const label=jw3PrintTimeLabel(g);if(label){if(!q.labels.has(label))q.labels.set(label,new Set());ys.forEach(y=>q.labels.get(label).add(y));}}
 const cols=[...groups.values()];if(display){const a=jwGridClock(display.start),b=jwGridClock(display.end),step=Number(display.minutes);if(Number.isFinite(a)&&Number.isFinite(b)&&step>0){const cuts=new Set([a,b]);for(let t=a+step;t<b;t+=step)cuts.add(t);for(const q of cols){cuts.add(jwGridClock(q.start));cuts.add(jwGridClock(q.end));}const ar=[...cuts].sort((x,y)=>x-y);for(let i=1;i<ar.length;i++){const x=ar[i-1],z=ar[i];if(x>=a&&z<=b&&!cols.some(q=>jwGridClock(q.start)<z&&jwGridClock(q.end)>x))cols.push({start:jwGridTime(x),end:jwGridTime(z),type:'DISPLAY_GAP',name:'—',ids:new Set(),labels:new Map(),years:new Set([0])});}}}
 return cols.sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)||a.type.localeCompare(b.type));}
function jw3PrintShortName(id,name){const key=String(id||'').trim().toUpperCase(),staff=Array.isArray(ALL_STAF)?ALL_STAF:[];const match=staff.find(t=>key&&String(t.ID_Staf||'').trim().toUpperCase()===key);const alias=String(match?.Nama_Samaran||'').trim()||String(match?.Samaran||'').trim();return alias||String(name||match?.Nama_Penuh||id||'').trim();}
function jw3PrintTeacherNames(r,s){const ids=s.teachers.slice();const main=(r.linkedAudit||[]).find(a=>a.classId===s.classId&&a.components?.some(c=>c.choiceId===s.choiceId))?.mainTeacherId;if(s.coTeaching&&main&&ids.includes(main))ids.sort((a,b)=>Number(b===main)-Number(a===main));return ids.map(id=>jw3PrintShortName(id,s.teacherNames[s.teachers.indexOf(id)]));}
function jw3PrintWeekColumns(r,years,display,mode){const map=new Map();for(let d=1;d<=5;d++)for(const q of jw3PrintDayColumns(r,d,years,display)){const key=[q.start,q.end,q.type].join('|');if(!map.has(key))map.set(key,{start:q.start,end:q.end,type:q.type,days:new Map()});map.get(key).days.set(d,q);}const cols=[...map.values()].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)||a.type.localeCompare(b.type));for(const q of cols){const variants=new Map();for(const [d,x] of q.days){const label=[...x.labels.keys()].map(label=>{if(mode!=='guru'||x.type!=='PDP'||label!=='W5')return label;const ys=[...x.labels.get(label)];if(ys.length&&ys.every(y=>y>=1&&y<=3))return 'W5 (T1)';if(ys.length&&ys.every(y=>y>=4&&y<=6))return 'W5 (T2)';return label;}).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join(' / ');const h=x.type==='PDP'?label||'PdPc':x.type==='DISPLAY_GAP'?'—':x.type==='REHAT'?'REHAT':x.name;if(!variants.has(h))variants.set(h,[]);variants.get(h).push(d);}q.variants=variants;}return cols;}
function jw3PrintSummaryHTML(stats,total){const esc=jwAgihanEscape,pairs=Object.entries(stats).sort((a,b)=>a[0].localeCompare(b[0]));pairs.push(['Bil. Pelajaran/Minggu',total,true]);const groups=[];for(let i=0;i<pairs.length;i+=3)groups.push(pairs.slice(i,i+3));return `<div class="jw3-print-summary-group">${groups.map(group=>`<table class="jw3-print-summary"><thead><tr><th>Subjek</th><th>Jumlah</th></tr></thead><tbody>${group.map(([name,n,isTotal])=>`<tr${isTotal?' class="jw3-total"':''}><td>${esc(name)}</td><td>${n}</td></tr>`).join('')}</tbody></table>`).join('')}</div>`;}
function jw3PrintCardHTML(r,mode,entity,slotRows){const esc=jwAgihanEscape,own=slotRows.filter(({s})=>mode==='guru'?s.teachers.includes(entity.id):s.classId===entity.id),rows=r.sessions.filter(s=>mode==='guru'?s.teachers.includes(entity.id):s.classId===entity.id),year=entity.year??rows[0]?.year,years=mode==='guru'?[1,2,3,4,5,6,...(rows.some(s=>s.year===0)?[0]:[])]:[year],total=own.length,stats={};for(const {s} of own)stats[s.code]=(stats[s.code]||0)+1;const display=mode==='kelas'?entity.display:null,cols=jw3PrintWeekColumns(r,years,display,mode);
 const cls=q=>q.type==='REHAT'?'jw3-rehat':q.type==='DISPLAY_GAP'?'jw3-gap':q.type!=='PDP'?'jw3-other':'';
 const header=q=>esc([...new Set([...q.variants.keys()].flatMap(v=>v.split(' / ')))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join(' / '));
 const find=(q,d)=>{const day=q.days.get(d);return day&&own.find(({s,g})=>s.day===d&&day.ids.has(g.id)&&g.start===q.start&&g.end===q.end);};
 const rest=q=>q.type==='REHAT'&&q.days.size===5&&q.variants.size===1&&[1,2,3,4,5].every(d=>!find(q,d));
 const body=JW3_PRINT_DAYS.map((name,i)=>{const d=i+1,cells=[];for(let j=0;j<cols.length;j++){const q=cols[j],day=q.days.get(d),a=find(q,d);if(rest(q)){if(i===0)cells.push(`<td class="jw3-rehat" rowspan="5"><span class="jw3-rehat-vertical">${header(q)}</span></td>`);continue;}if(!day){cells.push('<td class="jw3-gap">–</td>');continue;}if(!a){const activity=[...(day.activities||[])].join(' / ');cells.push(`<td class="${activity?'jw3-other':cls(q)+' jw3-empty'}">${activity?esc(activity):q.type==='REHAT'?'REHAT':q.type==='PDP'||q.type==='DISPLAY_GAP'?'–':esc(day.name)}</td>`);continue;}const {s,g}=a;const names=jw3PrintTeacherNames(r,s).join(' / '),longName=names.length>24?' jw3-long-name':'';const ids=[g.id],numbers=[g.number];let span=1;while(j+span<cols.length){const next=cols[j+span],b=find(next,d);if(!b||b.s!==s||cols[j+span-1].end!==next.start)break;ids.push(b.g.id);numbers.push(b.g.number);span++;}cells.push(`<td${span>1?' colspan="'+span+'"':''} data-slot-id="${esc(ids.join('|'))}" data-period="${esc(numbers.join('|'))}" data-slot-count="${span}"><span class="jw3-slot-code">${esc(s.code)}</span><span class="jw3-slot-detail${mode==='kelas'?longName:''}">${mode==='guru'?esc(s.className):esc(names)}</span>${s.coTeaching&&mode==='guru'?`<span class="jw3-slot-pair${longName}">${esc(names)}</span>`:''}</td>`);j+=span-1;}return `<tr><th scope="row" class="jw3-dayname">${name}</th>${cells.join('')||(!cols.length?'<td>–</td>':'')}</tr>`;}).join('');
 const week=`<table class="jw3-print-week"><thead><tr><th class="jw3-dayname">HARI</th>${cols.map(q=>`<th class="${cls(q)}">${header(q)}<span class="jw3-slot-time">${esc(q.start)}–${esc(q.end)}</span></th>`).join('')||'<th>Tiada slot</th>'}</tr></thead><tbody>${body}</tbody></table>`;
 const date=r.generatedAt&&Number.isFinite(new Date(r.generatedAt).getTime())?new Date(r.generatedAt).toLocaleString('ms-MY',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}):'[tarikh dan masa tidak direkod]';
 return `<section class="jw3-print-card jw3-print-${mode}${cols.length>16?' jw3-many-cols':''}" data-entity="${esc(entity.id)}"><div class="jw3-print-heading"><h2>JADUAL WAKTU ${mode==='guru'?'GURU':'KELAS'}: ${esc(entity.name)}</h2><p>SEKOLAH KEBANGSAAN SEGAMBUT MAKMUR | JUMLAH WAKTU: ${total} WAKTU</p></div>${week}<div class="jw3-print-footer"><div class="jw3-print-meta"><p class="jw3-gen-date">Jadual waktu dijana pada ${esc(date)} melalui SeMAKMUR I-System</p></div>${jw3PrintSummaryHTML(stats,total)}</div></section>`;}
function jw3PrintRenderBottom(){const r=jw3PrintResult(),container=document.getElementById('containerHasilJadualView'),modeEl=document.getElementById('selFilterViewJadual');if(!r||!container||!modeEl)return;const mode=modeEl.value==='kelas'?'kelas':'guru',list=mode==='guru'?r.teacherStats:r.classStats;try{const rows=jw3SlotRows(r);const f=document.getElementById('jw3PrintFilter'),old=f?.value||'';if(f){f.replaceChildren(new Option('Semua '+(mode==='guru'?'guru':'kelas'),''));list.forEach(e=>f.add(new Option(e.name,e.id)));if(list.some(e=>e.id===old))f.value=old;}container.innerHTML=list.filter(e=>!f?.value||e.id===f.value).map(e=>jw3PrintCardHTML(r,mode,e,rows)).join('');const status=document.getElementById('jwHasilStatusText');if(status)status.textContent=r.stats.scheduledPeriods+'/'+r.stats.expectedPeriods+' waktu · '+(r.liveVersion?.Jadual_ID===JW_LIVE_ACTIVE_ID?'Rasmi aktif '+r.liveVersion.Jadual_ID+' · '+r.liveVersion.Tarikh_Kuat_Kuasa:r.liveVersion?(r.liveVersion.Status==='DRAF'?'Draf dibuka: ':'Versi diterbitkan (bukan aktif): ')+r.liveVersion.Nama+' · '+r.liveVersion.Jadual_ID:'Calon jadual belum diterbitkan.');}catch(e){container.textContent='Jadual tidak dapat dipaparkan: '+e.message;}}
function renderJadualHasilView(){jwLiveControls();const mode=document.getElementById('selFilterViewJadual');if(!mode)return;jw3PrintStyles();const toolbar=mode.parentElement,heading=toolbar.parentElement.querySelector('h3');
 const master=mode.querySelector('option[value="master"]');master?.remove();if(!['guru','kelas'].includes(mode.value))mode.value='guru';
 let filter=document.getElementById('jw3PrintFilter');if(!filter){toolbar.style.flexWrap='wrap';filter=document.createElement('select');filter.id='jw3PrintFilter';filter.className=mode.className;filter.addEventListener('change',jw3PrintRenderBottom);mode.insertAdjacentElement('afterend',filter);const button=toolbar.querySelector('button');if(button){button.removeAttribute('onclick');button.addEventListener('click',jw3PrintA4);}const csv=document.createElement('button');csv.id='jw3PrintCSV';csv.type='button';csv.className='jw-agihan-btn jw-agihan-btn-light';csv.textContent='Eksport CSV Slot';csv.addEventListener('click',()=>jw3Download('csv'));toolbar.appendChild(csv);}
 const r=jw3PrintResult(),v=r?.liveVersion,isActive=v?.Jadual_ID===JW_LIVE_ACTIVE_ID&&!!v;
 if(heading)heading.textContent=v?(isActive?'Jadual Waktu Rasmi — ':'Jadual Waktu — ')+v.Nama:r?'Calon Jadual Baharu':'Jadual Waktu Rasmi';
 filter.disabled=!r;document.getElementById('jw3PrintCSV').disabled=!r;const print=toolbar.querySelector('button');if(print)print.disabled=!r;
 if(r){setJwHasilStatus('ready');jw3PrintRenderBottom();}else{setJwHasilStatus('empty');document.getElementById('containerHasilJadualView')?.replaceChildren();const status=document.getElementById('jwHasilStatusText');if(status)status.textContent=JW3_BUSY?'Penjanaan sedang berjalan…':'Belum ada jadual untuk dipaparkan.';}
}

function jw3PrintA4(){const cards=[...document.querySelectorAll('#containerHasilJadualView .jw3-print-card')];if(!cards.length)return;const old=document.getElementById('jw3PrintRoot');old?.remove();const root=document.createElement('div');root.id='jw3PrintRoot';root.className='jw3-print-root';cards.forEach(c=>root.appendChild(c.cloneNode(true)));document.body.appendChild(root);document.body.classList.add('jw3-isolated-print');const cleanup=()=>{root.remove();document.body.classList.remove('jw3-isolated-print');};window.addEventListener('afterprint',cleanup,{once:true});try{window.print();}catch(e){cleanup();throw e;}}


let JW_LIVE_BUSY=false,JW_LIVE_VIEW=null;
function jwLiveViewed(){return JW_LIVE_VIEW||JW3_RESULT;}
function jwLiveViewBanner(r){const v=r?.liveVersion,e=jwAgihanEscape,active=!!v&&v.Jadual_ID===JW_LIVE_ACTIVE_ID;return `<div style="padding:12px 15px;margin:0 0 12px;border:1px solid #cbded5;border-radius:10px;background:#f0f7f3;color:#214c3d;font-size:13px;line-height:1.6"><strong>${active?'Jadual rasmi aktif: '+e(v.Nama):v?'Jadual sedang dibuka: '+e(v.Nama):'Calon jadual baharu'}</strong>${v?`<div>${e(v.Jadual_ID)} · ${e(v.Status)} · ${e(v.Tarikh_Kuat_Kuasa||'Belum berkuat kuasa')}</div>`:'<div>Belum diterbitkan.</div>'}<div>${e(r.stats.scheduledPeriods)} waktu kelas · ${e(r.stats.teacherPeriods)} waktu guru</div>${!active&&JW_LIVE_ACTIVE_ID?'<button type="button" onclick="jwLiveReturnOfficial()" style="margin-top:8px;padding:6px 12px;border:1px solid #adc8ba;border-radius:6px;background:white;color:#214c3d;cursor:pointer">Kembali ke jadual rasmi</button>':''}</div>`;}
function jwLiveUpdateStatus(){const st=document.getElementById('jw3Status'),r=jwLiveViewed(),v=r?.liveVersion;if(st)st.textContent=v?(v.Jadual_ID===JW_LIVE_ACTIVE_ID?'Rasmi aktif: ':'Versi dibuka: ')+v.Nama+' · '+v.Jadual_ID+' · '+(v.Tarikh_Kuat_Kuasa||'Belum berkuat kuasa'):r?'Calon jadual · '+r.stats.scheduledPeriods+'/'+r.stats.expectedPeriods+' waktu':JW_BOOT_READY?'Belum ada jadual rasmi aktif.':'Maklumat rasmi belum tersedia.';}
async function jwLiveReturnOfficial(){if(JW3_BUSY||JW_LIVE_BUSY||JW_BOOT_BUSY)return;JW_LIVE_BUSY=true;showLoader('','refresh');try{jwLiveSetActive(await jwLiveReadActive());}catch(e){await Swal.fire('Jadual rasmi belum dapat dibuka',e.message,'error');}finally{JW_LIVE_BUSY=false;hideLoader();}}
function jwLiveShow(out){if(!out?.version||!out?.result?.printGrid?.length)throw Error('Snapshot versi tidak sah.');jw3SlotRows(out.result);out.result.liveVersion=out.version;JW_LIVE_VIEW=out.result;jw3RenderResult();renderJadualHasilView();jwLiveUpdateStatus();jw3RunButton();}

function jwLiveModalStyles(){if(document.getElementById('jwLiveCSS'))return;const x=document.createElement('style');x.id='jwLiveCSS';x.textContent=`.jw-live-popup{max-width:calc(100vw - 24px)!important;font-family:inherit!important;color:#24352f!important;border-radius:16px!important;padding:24px!important;box-sizing:border-box!important}.jw-live-popup .swal2-title{font-size:21px!important;font-weight:700!important;color:#173c34!important}.jw-live-popup .swal2-html-container{margin:14px 0 0!important;text-align:left!important;max-height:calc(100vh - 150px);overflow:auto!important}.jw-live-ui{font-size:13px;line-height:1.5;color:#283b33;text-align:left}.jw-live-ui *{box-sizing:border-box}.jw-live-section{border:1px solid #dce5df;border-radius:11px;padding:14px;margin:12px 0;background:#fff}.jw-live-section h4{margin:0 0 9px;color:#173c34;font-size:14px;font-weight:700}.jw-live-ui label{display:block;font-size:12px;font-weight:600;margin:7px 0 5px}.jw-live-ui input:not([type=checkbox]),.jw-live-ui select{width:100%;border:1px solid #c7d5ce;border-radius:8px;background:#fff;color:#263b32;font:inherit;padding:10px;margin:0 0 8px;min-height:40px}.jw-live-ui .livebtn{display:inline-flex;align-items:center;justify-content:center;padding:9px 15px;border:1px solid #adc8ba;border-radius:8px;font:inherit;font-weight:600;background:#fff;color:#173c34;cursor:pointer;min-height:38px}.jw-live-ui .livebtn.primary{background:#17634e;color:#fff;border-color:#17634e}.jw-live-ui .livebtn:disabled{opacity:.45;cursor:not-allowed}.jw-live-ui .liverow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.jw-live-ui .livemeta{font-size:12px;color:#54675f;overflow-wrap:anywhere}.jw-live-ui .livecurrent{padding:12px;border-radius:9px;background:#eef6f0;border:1px solid #cddfd4;margin-bottom:10px}.jw-live-ui .livegrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.jw-live-ui .livegrid>div{padding:9px;border:1px solid #e2e8e4;border-radius:8px;overflow-wrap:anywhere}@media(max-width:520px){.jw-live-popup{padding:14px!important}.jw-live-ui .livegrid{grid-template-columns:1fr}}`;document.head.appendChild(x);}

async function jwLiveFingerprint(r){const text=JSON.stringify(r.sessions.map(s=>JSON.stringify([s.classId,s.year,s.choiceId,s.settingId,s.subjectId,s.code,s.teachers,s.day,s.start,s.end,s.periods,s.slotIds,s.room,!!s.coTeaching])).sort());if(!window.crypto?.subtle)throw Error('Browser perlu menyokong SHA-256 melalui HTTPS.');const hash=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
function jwLiveCandidate(){return jwLiveViewed();}
function jwLiveControls(){const run=document.getElementById('jw3Run');if(!run||document.getElementById('jwLiveMenu'))return;const b=document.createElement('button');b.id='jwLiveMenu';b.type='button';b.className='jw-agihan-btn jw-agihan-btn-light';b.textContent='Sejarah & Penerbitan';b.addEventListener('click',jwLiveMenu);run.parentElement.appendChild(b);}
async function jwLiveMenu(){if(JW3_BUSY||JW_LIVE_BUSY)return;JW_LIVE_BUSY=true;jwLiveModalStyles();try{
 const s=await jwAgihanRequest('fiJWLiveStatus',{},true),esc=jwAgihanEscape,r=jwLiveCandidate(),v=r?.liveVersion,ready=!!r?.checkpoint&&r.stats?.errors===0&&r.stats.scheduledPeriods===r.stats.expectedPeriods&&r.optimization?.stopReason==='LENGKAP'&&!v;
 JW_LIVE_ACTIVE_ID=s.active||'';JW_LIVE_TODAY=s.today||'';
 const active=s.versions.find(x=>x.Jadual_ID===s.active),options=s.versions.slice().reverse().map(x=>`<option value="${esc(x.Jadual_ID)}" ${x.Jadual_ID===v?.Jadual_ID?'selected':''}>${esc(x.Nama)} · ${esc(x.Status)} · ${esc(x.Jadual_ID)}</option>`).join('');
 const q=await Swal.fire({title:'LIVE — Draf & Penerbitan',width:690,customClass:{popup:'jw-live-popup'},html:`<div class="jw-live-ui"><div class="livecurrent"><strong>Jadual sedang dibuka</strong><div>${v?esc(v.Nama):r?'Calon jadual baharu':'Tiada jadual dibuka'}</div><div class="livemeta">${v?esc(v.Jadual_ID)+' · '+esc(v.Status)+' · '+esc(v.Tarikh_Kuat_Kuasa||'Belum berkuat kuasa'):r?esc(r.stats.scheduledPeriods)+' waktu · '+(ready?'audit lengkap':'audit belum lengkap'):'Jana atau buka draf dahulu.'}</div></div><div class="livegrid"><div><strong>Jadual rasmi aktif</strong><div>${active?esc(active.Nama):'Belum ada LIVE'}</div><div class="livemeta">${active?esc(active.Jadual_ID)+' · '+esc(active.Tarikh_Kuat_Kuasa):''}</div></div><div><strong>Tarikh rujukan</strong><div>${esc(s.today)}</div><div class="livemeta">${esc(s.target)}</div></div></div><section class="jw-live-section"><h4>1. Simpan calon jadual</h4><label for="jwLiveName">Nama draf</label><input id="jwLiveName" value="Jadual ${esc(String(r?.sets?.year||''))}" ${!ready?'disabled':''}><button type="button" id="jwLiveSaveBtn" class="livebtn primary" ${!ready||!s.canPublish?'disabled':''}>Simpan draf</button><div class="livemeta">${v?'Versi ini sudah tersimpan. Buka calon jadual melalui butang Jana Jadual Baharu jika perlu.':'Jadual rasmi tidak berubah.'}</div></section><section class="jw-live-section"><h4>2. Sejarah & penerbitan</h4><label for="jwLivePick">Pilih versi</label><select id="jwLivePick"><option value="">— Pilih versi —</option>${options}</select><div id="jwLiveDetails" class="livemeta" style="min-height:36px;margin-bottom:8px"></div><div class="liverow"><button type="button" id="jwLiveOpenBtn" class="livebtn">Buka jadual</button><button type="button" id="jwLivePubBtn" class="livebtn primary">Terbitkan draf</button></div></section><div class="livemeta">CORE: ${esc(s.coreTarget||'Sumber CORE sedia ada')} · LIVE: ${esc(s.target)}</div></div>`,showConfirmButton:false,showCloseButton:true,didOpen:()=>{const pick=document.getElementById('jwLivePick'),open=document.getElementById('jwLiveOpenBtn'),pub=document.getElementById('jwLivePubBtn'),get=()=>s.versions.find(x=>x.Jadual_ID===pick.value);const update=()=>{const x=get();open.disabled=!x;pub.disabled=!s.canPublish||!x||x.Status!=='DRAF';document.getElementById('jwLiveDetails').textContent=x?[x.Jadual_ID,x.Status,x.Waktu_Kelas+' waktu','Simpan: '+(x.Draf_Pada||'—'),'Kuat kuasa: '+(x.Tarikh_Kuat_Kuasa||'—')].join(' · '):'Pilih versi untuk melihat butiran.';};pick.onchange=update;update();document.getElementById('jwLiveSaveBtn').onclick=()=>{const name=document.getElementById('jwLiveName').value.trim();if(!name)return Swal.showValidationMessage('Masukkan nama draf.');Swal.close({isConfirmed:true,value:{mode:'save',name}});};open.onclick=()=>{if(get())Swal.close({isConfirmed:true,value:{mode:'open',id:pick.value}});};pub.onclick=()=>{if(get()?.Status==='DRAF')Swal.close({isConfirmed:true,value:{mode:'publish',id:pick.value}});};}});
 if(!q.isConfirmed||!q.value)return;const a=q.value;
 if(a.mode==='save'){const out=await jwAgihanRequest('fiJWLiveSave',{name:a.name,checkpoint:r.checkpoint,fingerprint:await jwLiveFingerprint(r),generatedAt:r.generatedAt},true);jwLiveShow(await jwAgihanRequest('fiJWLiveGet',{id:out.id},true));JW3_RESULT=null;jw3RunButton();await Swal.fire('Draf disimpan',out.name+' · '+out.id,'success');}
 if(a.mode==='open'){const out=await jwAgihanRequest('fiJWLiveGet',{id:a.id},true);jwLiveShow(out);await Swal.fire('Jadual dibuka',out.version.Nama+' · '+out.version.Status,'success');}
 if(a.mode==='publish'){const x=s.versions.find(y=>y.Jadual_ID===a.id);const confirm=await Swal.fire({title:'Terbitkan jadual rasmi?',width:560,customClass:{popup:'jw-live-popup'},html:`<div class="jw-live-ui"><div class="livecurrent"><strong>${esc(x.Nama)}</strong><div>${esc(x.Jadual_ID)} · ${esc(x.Waktu_Kelas)} waktu</div></div><label for="jwLiveDate">Tarikh kuat kuasa</label><input type="date" id="jwLiveDate" min="${esc(s.today)}" value="${esc(s.today)}"><p>Versi sebelumnya dikekalkan. Tiada penjanaan semula.</p><label><input type="checkbox" id="jwLiveAccept"> Saya telah menyemak jadual ini dan mengesahkan pairing Auto serta amaran audit.</label></div>`,showCancelButton:true,confirmButtonText:'Terbitkan rasmi',cancelButtonText:'Batal',preConfirm:()=>{const date=document.getElementById('jwLiveDate').value;if(!date||!document.getElementById('jwLiveAccept').checked){Swal.showValidationMessage('Tetapkan tarikh dan sahkan amaran.');return false;}return date;}});if(!confirm.isConfirmed)return;const out=await jwAgihanRequest('fiJWLivePublish',{id:a.id,date:confirm.value,acceptWarnings:true,confirm:'TERBITKAN'},true);const current=await jwLiveReadActive();JW_LIVE_ACTIVE_ID=current.status.active||'';JW_LIVE_TODAY=current.status.today||'';JW_LIVE_ACTIVE=current.out?{...current.out.result,liveVersion:current.out.version}:null;if(out.id===JW_LIVE_ACTIVE_ID)jwLiveSetActive(current);else jwLiveShow(await jwAgihanRequest('fiJWLiveGet',{id:out.id},true));await Swal.fire('Versi diterbitkan',out.id+' · '+out.date+' · '+out.projection.status,'success');}
 }catch(e){await Swal.fire('Semakan LIVE',e.message+' Semak status LIVE sebelum mengulang penerbitan.','warning');}finally{JW_LIVE_BUSY=false;}}
// Mount after existing view is rendered; does not change HTML/CSS or print layout.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',jwLiveControls);else jwLiveControls();
