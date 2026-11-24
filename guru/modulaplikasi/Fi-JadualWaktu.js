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
    async function initialiseJWPortal() {
      showLoader('', 'startup');
      try {
        // Semua maklumat diminta serta-merta; hasil jadual tidak menunggu tetapan siap.
        // Data utama dibuka apabila tetapan dan jadual semasa siap.
        // Direktori staf bukan prasyarat paparan jadual kelas; baca di belakang.
        const staffPromise = postToBackend({ action:'getManualV2Data' })
          .then(res => {
            if (res && res.success) {
              ALL_STAF = res.staf || [];
              ALL_LOKASI = res.lokasi || [];
              ALL_MASTER_SUBJEK_LIST = res.subjek || [];
              // Pilihan kod/nama subjek perlu dimuat semula setelah master tiba.
              renderSubjekTable();
              if (JW_HASIL_VIEW_RENDERED && JW_AGIHAN_REVISION === 0 && !JW_AGIHAN_SAVING) {
                // Data staf sampai selepas paparan dibuka: segarkan label dan pilihan yang diperlukan.
                renderAgihanGuruMatrix();
                renderGuruConstraintTable();
                renderJadualHasilView();
              }
            }
          })
          .catch(error => console.warn('Direktori guru belum tersedia:',error));
        // Janji ini bukan di-await supaya tidak mengunci pelancaran modul.
        void staffPromise;
        const [jwResult, hasilResult] = await Promise.all([
          postToBackend({ action: 'getJWConstraints' }),
          postToBackend({ action: 'getJadualWaktuHasil' }).catch(error => {
            console.warn('Jadual semasa belum dapat dimuatkan:',error);
            return null;
          })
        ]);
        if (!jwResult || !jwResult.success) throw new Error('Tetapan jadual tidak dapat dibaca.');
        // Biarkan animasi dipaparkan satu bingkai sebelum kerja membina matriks bermula.
        await new Promise(resolve => requestAnimationFrame(resolve));
        applyJWConstraintsData(jwResult);
        void jwGridStudioLoad();
        if (!ALL_STAF.length) {
          // Paparan kelas tetap boleh digunakan walaupun direktori staf lambat dibaca.
          const modePilihan = document.getElementById('selFilterViewJadual');
          if (modePilihan) modePilihan.value = 'kelas';
        }
        // Ketika portal siap, jadual yang sudah disimpan terus berada dalam grid.
        if (hasilResult && hasilResult.success) {
          STATE_HASIL_JADUAL = normalizeJwHasilRows(hasilResult.data);
          JW_HASIL_VIEW_RENDERED = false;
          setJwHasilStatus(STATE_HASIL_JADUAL.length ? 'ready' : 'empty');
        } else {
          setJwHasilStatus('error');
        }
        renderJadualHasilView();
        JW_HASIL_VIEW_RENDERED = true;
        hideLoader();
        syncJwActionButtons();
        fiJWMessageParent('semakmur-fi-jw-ready');
      } catch (error) {
        console.error('Gagal membuka portal jadual waktu:',error);
        hideLoader();
        fiJWMessageParent('semakmur-fi-jw-error',error && error.message || error);
        setJwHasilStatus('error');
        Swal.fire({icon:'error',title:'Paparan belum tersedia',
          text:'Sila semak sambungan internet dan cuba muat semula halaman.',
          confirmButtonText:'Faham'});
      }
    }

    async function postToBackend(payload) {
      // Format request asal dikekalkan; cuma laluan HTTP kini melalui Fi-Sync.
      return fiJWRequest(payload);
    }

    // Pengekalan nama fungsi untuk keserasian kod asal; navigasi kini menggunakan tab.
    function toggleSidebar() {
      const tabs = document.getElementById('jw-main-tablist');
      if (tabs) tabs.scrollIntoView({block:'nearest',behavior:'smooth'});
    }

    function switchView(viewId, btnEl) {
      const views = ['viewGridMasa', 'viewMasterSubjek', 'viewAgihanTugas', 'viewGuruConstraints', 'viewGeneratorConsole'];
      // Abaikan ID yang tidak wujud: tiada perubahan pada panel lain.
      if (!views.includes(viewId)) return;
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
      if (viewId === 'viewAgihanTugas') void jwAgihanOpen();
      if (viewId === 'viewGuruConstraints') void jwConLoad();
      if (viewId === 'viewGeneratorConsole' && !JW_HASIL_VIEW_RENDERED) {
        if (STATE_HASIL_JADUAL.length) {
          renderJadualHasilView();
          JW_HASIL_VIEW_RENDERED = true;
        } else {
          const output = document.getElementById('containerHasilJadualView');
          if (output && !output.innerHTML.trim()) output.innerHTML =
            '<div class="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">Paparan jadual waktu akan tersedia di sini.</div>';
        }
      }
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

    function syncCurrentDayGridMasaDOM(dayToSync) {
      const day = dayToSync || LAST_GRID_HARI || 'Isnin';
      const rows = document.querySelectorAll('#tbodyGridMasa tr');

      STATE_GRID_MASA = STATE_GRID_MASA.filter(r => r.Hari !== day);

      const updatedForDay = [];
      rows.forEach(r => {
        const inputs = r.querySelectorAll('[data-field]');
        if (inputs.length > 0) {
          const item = { Hari: day };
          inputs.forEach(i => {
            let val = i.value;
            if (i.getAttribute('data-field') === 'Jam_Mula' || i.getAttribute('data-field') === 'Jam_Tamat') {
              val = formatTimeString(val);
            }
            item[i.getAttribute('data-field')] = val;
          });
          updatedForDay.push(item);
        }
      });

      STATE_GRID_MASA = STATE_GRID_MASA.concat(updatedForDay);
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
      showLoader('', 'refresh');
      try {
        const [res, hasil] = await Promise.all([
          postToBackend({ action:'getJWConstraints' }),
          postToBackend({ action:'getJadualWaktuHasil' }).catch(() => null)
        ]);
        if (!res || !res.success) throw new Error('Maklumat jadual tidak dapat dibaca.');
        await new Promise(resolve => requestAnimationFrame(resolve));
        applyJWConstraintsData(res);
        JW_GRID_MODE='legacy';void jwGridStudioLoad();
        if (hasil && hasil.success) {
          STATE_HASIL_JADUAL = normalizeJwHasilRows(hasil.data);
          setJwHasilStatus(STATE_HASIL_JADUAL.length ? 'ready' : 'empty');
          renderJadualHasilView();
          JW_HASIL_VIEW_RENDERED = true;
        } else {
          setJwHasilStatus('error');
        }
        syncJwActionButtons();
        hideLoader();
      } catch (err) {
        console.error('Tidak dapat memuatkan maklumat terkini:',err);
        hideLoader();
        Swal.fire('Paparan belum dikemas kini', 'Sila semak sambungan anda dan cuba lagi.', 'error');
      }
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
    async function jwGridStudioLoad(){
      try{
        const res=await postToBackend({action:'fiJWGridStudioGet'});
        if(!res?.success)throw Error(res?.error||'Studio Grid tidak tersedia');
        JW_GRID_CTRL=res.controller;JW_GRID_CTRL_SAVED=jwGridClone(res.controller);JW_GRID_WORK_CTRL=jwGridClone(res.controller);JW_GRID_CTRL_VERSION=res.controllerVersion||0;
        JW_GRID_PRESETS=res.presets||[];JW_GRID_SOURCE=res.source;
        JW_GRID_SELECTED=res.selected||null;
        JW_GRID_LOADED=true;
        const src=document.getElementById('jwGridSourceBadge');if(src)src.textContent=res.source==='GOOGLE_SHEETS_TERAS'?'Sumber: Sheets CORE':res.source==='SALINAN_UAT'?'Sumber: UAT':'Sumber lama · jalankan Setup CORE';
        if(res.selected && Array.isArray(res.selectedGrid) && res.selectedController){
          STATE_GRID_MASA=res.selectedGrid.map(r=>({...r,__legacy:true}));
          JW_GRID_WORK_CTRL=jwGridClone(res.selectedController);
          JW_GRID_VIEW_ID=res.selected.id;
          JW_GRID_MODE='selected';JW_GRID_DIRTY=false;
        }else if(JW_GRID_MODE!=='draft'&&JW_GRID_MODE!=='recall'){
          STATE_GRID_MASA=(res.grid||[]).map(r=>({...r,__legacy:true}));
          JW_GRID_VIEW_ID='';JW_GRID_MODE='legacy';
        }
        jwGridRenderController();jwGridRenderMode();renderGridMasaTable();
        if(res.selectionWarning)jwGridColorMessage(res.selectionWarning,true);
      }catch(e){console.warn('Studio Grid:',e);jwGridColorMessage('Studio Grid tidak dapat dibaca: '+e.message,true);}
    }
    function jwGridRenderMode(){
      const el=document.getElementById('jwGridWorkingLabel');
      if(el)el.textContent=JW_GRID_MODE==='selected'?'Grid persediaan aktif: '+(JW_GRID_SELECTED?.name||'Versi tersimpan')+' · klik Edit Grid untuk ubah':
        JW_GRID_MODE==='legacy'?'Grid operasi asal · baca sahaja':JW_GRID_MODE==='draft'?'Grid baharu · belum disimpan':'Grid dipanggil · boleh edit dan simpan sebagai versi baharu';
      const hint=document.getElementById('jwGridModeHint');
      if(hint)hint.textContent=JW_GRID_MODE==='selected'?'Klik Edit Grid untuk menghasilkan salinan baharu; perubahan hanya aktif apabila disimpan lalu diaktifkan.':
        JW_GRID_MODE==='legacy'?'Klik “Tambah Grid Masa” untuk membuat draf baharu. Jadual sedia ada tidak berubah.':'ID slot dijana semasa simpan. Hanya kumpulan dan jenis slot perlu dipilih.';
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
      const praButton=document.getElementById('jwGridAddPra');if(praButton)praButton.disabled=!edit;
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
    async function jwSubjectStudioLoad(){
      if(JW_SUBJECT_LOADING)return;
      JW_SUBJECT_LOADING=true;showLoader('','refresh');
      try{
        const res=await postToBackend({action:'fiJWSubjectStudioGet'});
        if(!res?.success)throw Error(res?.error||'Tetapan sejarah subjek tidak dapat dibaca.');
        JW_SUBJECT_PRESETS=res.presets||[];JW_SUBJECT_SELECTED=res.selected||null;
        JW_SUBJECT_SOURCE=String(res.source||'');jwSubjectRefreshOptions();
        JW_SUBJECT_TARGETS=Array.isArray(res.activeTargets)?JSON.parse(JSON.stringify(res.activeTargets)):[];jwSubjectRenderTargets();
        if(res.selected && Array.isArray(res.activeData) && res.activeData.length){
          STATE_SUBJEK=JSON.parse(JSON.stringify(res.activeData));
          JW_SUBJECT_YEAR=Number(res.selected.year)||JW_SUBJECT_YEAR;
          renderSubjekTable();
        }
        if(res.selectionWarning)jwSubjectNotice(res.selectionWarning,true);
      }catch(err){jwSubjectNotice('Sejarah Tetapan Subjek belum tersedia: '+String(err.message||err),true);}
      finally{JW_SUBJECT_LOADING=false;hideLoader();}
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
    function renderJadualHasilView() {
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
function jwAgihanCheckVersion(res){if(res.version!=='V2.7.3')throw Error('Backend Agihan belum V2.7.3. Deploy FiJadualWaktu.gs versi baharu dahulu.');}
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
async function jwAgihanReload(quiet=false){
  if(JW_AGIHAN_CORE.loading)return;
  if(!quiet&&JW_AGIHAN_CORE.dirty&&!(await jwAgihanConfirm('Perubahan belum disimpan',
    'Muat semula akan membuang perubahan Agihan yang belum disimpan.','Muat semula')))return;
  JW_AGIHAN_CORE.loading=true;
  try{
    const res=await jwAgihanRequest('fiJWAgihanStudioGet');jwAgihanCheckVersion(res);
    Object.assign(JW_AGIHAN_CORE,{loaded:true,staff:res.staff||[],historyStaff:res.historyStaff||[],classes:res.classes||[],
      subjects:res.subjects||[],subjectSet:res.subjectSet||null,roleData:res.roleData||{ok:false,roles:[]},selected:res.selected||null,
      presets:res.presets||[],rows:JSON.parse(JSON.stringify(res.activeRows||[])),
      takeovers:res.takeovers||[],plans:res.plans||[],currentId:res.selected?.id||'',dirty:false,needsResave:!!res.needsResave});
    JW_AGIHAN_CORE.openTeachers.clear();
    JW_AGIHAN_CORE.rows.filter(r=>r.needsReview).forEach(r=>JW_AGIHAN_CORE.openTeachers.add(r.teacherId));
    const year=document.getElementById('jwAgihanYear');if(year)year.value=res.selected?.year||res.subjectSet?.year||new Date().getFullYear();
    const name=document.getElementById('jwAgihanSetName');if(name)name.value=res.selected?.name||'';
    document.getElementById('jwPlanYear').value=year.value;
    jwAgihanSetDirty(false);jwAgihanReviewNotice();jwAgihanRenderAll();
  }catch(err){jwAgihanNotice(err.message,true);await jwAgihanDialog({title:'Agihan Guru belum dapat dibuka',text:err.message,icon:'error'});}
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
      ${yearControls}${quotas}${fixed}
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
  const r=JW_AGIHAN_CORE.rows[idx];if(!r)return;
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
  jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderStats();jwAgihanRenderCoverage();
}
function jwAgihanToggleQuota(idx,checked){
  const r=JW_AGIHAN_CORE.rows[idx];if(!r)return;
  r.yearQuota=checked?Object.fromEntries(jwAgihanYears(r.scope).map(y=>[y,0])):{};
  jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderStats();jwAgihanRenderCoverage();
}
function jwAgihanSetQuota(idx,year,value){
  const r=JW_AGIHAN_CORE.rows[idx];if(!r)return;r.yearQuota[String(year)]=Math.max(0,Number(value)||0);
  jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderStats();jwAgihanRenderCoverage();
}
function jwAgihanFixedClass(idx,id,checked){
  const r=JW_AGIHAN_CORE.rows[idx];if(!r)return;
  const set=new Set(r.fixedClassIds||[]);checked?set.add(id):set.delete(id);r.fixedClassIds=[...set];
  jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderCoverage();
}
async function jwAgihanDeleteRow(idx){
  if(!(await jwAgihanConfirm('Padam tugasan guru?','Baris ini akan dibuang daripada set kerja. Set sejarah tidak akan terpadam.','Padam Baris')))return;
  JW_AGIHAN_CORE.rows.splice(idx,1);jwAgihanSetDirty(true);jwAgihanRenderTeachers();jwAgihanRenderStats();jwAgihanRenderCoverage();
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
    if(g)years.forEach(y=>{const key=JSON.stringify([r.teacherId,r.choiceId,y]);if(seen.has(key)){problem.push('guru/subjek/tahun bertindih dengan baris '+(seen.get(key)+1));}else seen.set(key,i);});
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
  el.innerHTML=(missingPra?'<div class="jw-agihan-empty">Kelas Prasekolah aktif tidak dikesan. Semak Master_Kelas_Bilik.</div>':'')+html;
}
function jwAgihanErrors(){
  const errors=[],bySub=new Map(JW_AGIHAN_CORE.subjects.map(s=>[s.id+'|'+s.year,s]));
  const seen=new Set();
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
      if(seen.has(key))issue('Subjek dan tahun bertindih dengan baris guru ini yang lain.');seen.add(key);});
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
    const res=await jwAgihanRequest('fiJWAgihanCoreSave',{name,year,subjectSetId:JW_AGIHAN_CORE.subjectSet.id,rows:JW_AGIHAN_CORE.rows});
    JW_AGIHAN_CORE.currentId=res.id;JW_AGIHAN_CORE.dirty=false;JW_AGIHAN_CORE.needsResave=false;jwAgihanSetDirty(false);jwAgihanNotice('');
    await jwAgihanRefreshMetadata();
    await jwAgihanDialog({title:'Versi Agihan disimpan',text:'Set ini belum aktif. Klik Aktifkan Set untuk menjadikannya pilihan persediaan.',icon:'success'});
  }catch(e){jwAgihanNotice(e.message,true);jwAgihanOpenError(e);}
}
async function jwAgihanRefreshMetadata(){
  const res=await jwAgihanRequest('fiJWAgihanStudioGet');jwAgihanCheckVersion(res);
  JW_AGIHAN_CORE.presets=res.presets||[];JW_AGIHAN_CORE.selected=res.selected||null;JW_AGIHAN_CORE.roleData=res.roleData||{ok:false,roles:[]};
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
    JW_AGIHAN_CORE.subjects=r.subjects||[];JW_AGIHAN_CORE.subjectSet=r.subjectSet||null;JW_AGIHAN_CORE.roleData=r.roleData||{ok:false,roles:[]};JW_AGIHAN_CORE.needsResave=!!r.needsResave;
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
function jwConNotice(message,error=false){const el=jwConEl('jwConNotice');el.textContent=message;el.classList.toggle('hidden',!message);el.style.color=error?'#a33b32':'';}
function jwConDirty(){JW_CON_F1.dirty=true;jwConEl('jwConActivate').disabled=true;}
function jwConTab(tab){jwConEl('jwConEdit').classList.toggle('hidden',tab!=='edit');jwConEl('jwConHistory').classList.toggle('hidden',tab!=='history');}
function jwConRules(){return {maxConsecutive:Number(jwConEl('jwConRun').value),minGapPeriods:Number(jwConEl('jwConGap').value),maxDaily:Number(jwConEl('jwConDaily').value),balanceDaily:jwConEl('jwConBalance').checked,coverEveryDay:jwConEl('jwConCover').checked,linkPJPK:jwConEl('jwConLink').checked};}
function jwConApply(set){const d=JW_CON_F1.data,r=set?.rules||d.defaults;JW_CON_F1.id=set?.id||'';JW_CON_F1.dirty=false;
  jwConEl('jwConName').value=set?.name||('Kekangan Sesi '+d.year);jwConEl('jwConYear').value=d.year;
  jwConEl('jwConRun').value=r.maxConsecutive;jwConEl('jwConGap').value=r.minGapPeriods;jwConEl('jwConDaily').value=r.maxDaily;
  jwConEl('jwConBalance').checked=r.balanceDaily;jwConEl('jwConCover').checked=r.coverEveryDay;jwConEl('jwConLink').checked=r.linkPJPK;
  jwConEl('jwConActivate').disabled=!set?.id||set.id===d.active?.id;
}
function jwConMeta(d){JW_CON_F1.data=d;jwConEl('jwConActive').textContent=d.active?'Aktif: '+d.active.name:'Belum ada set aktif';
  const select=jwConEl('jwConHistorySelect');select.replaceChildren(new Option('— Pilih Set —',''));const list=jwConEl('jwConHistoryList');list.replaceChildren();
  d.sets.forEach(s=>{select.add(new Option(s.name+' · '+s.year+(s.id===d.active?.id?' · ✓ Aktif':''),s.id));const e=document.createElement('div');e.className='jw-agihan-coverage-item';e.textContent=s.name+' · '+s.savedAt+(s.id===d.active?.id?' · ✓ Aktif':'');list.appendChild(e);});
  const locked=jwConEl('jwConLocked');locked.replaceChildren();const labels={TIADA_PERTINDIHAN_GURU:'Tiada pertindihan guru',TIADA_PERTINDIHAN_KELAS:'Tiada pertindihan kelas',TIADA_PERTINDIHAN_BILIK_MELEBIHI_KAPASITI:'Tiada pertindihan bilik melebihi kapasiti',CUKUP_WAKTU_SUBJEK:'Cukup waktu subjek',PATUH_CORAK_BLOK:'Patuh corak blok',BLOK_TIDAK_RENTAS_REHAT_ATAU_SLOT_BUKAN_PDPC:'Blok tidak merentasi rehat atau slot bukan PdPc',CO_TEACHING_SERENTAK:'Co-Teaching serentak',DALAM_GRID_MASA:'Dalam Grid Masa',PRA_SUBJEK_DITETAPKAN_SAHAJA:'Prasekolah: subjek yang ditetapkan sahaja'};
  d.locked.forEach(k=>{const e=document.createElement('div');e.textContent='🔒 '+(labels[k]||k);locked.appendChild(e);});
}
async function jwConLoad(force=false){if(JW_CON_F1.loading||JW_CON_F1.loaded&&!force)return;if(JW_CON_F1.dirty&&!await jwAgihanConfirm('Muat semula?','Perubahan belum disimpan akan hilang.','Muat Semula'))return;JW_CON_F1.loading=true;
  try{const d=await jwAgihanRequest('fiJWConstraintF1Get');if(d.version!=='V2.8.0-F1')throw Error('Backend Constraints belum versi Fasa 1.');jwConMeta(d);jwConApply(d.active);JW_CON_F1.loaded=true;jwConNotice('');}catch(e){jwConNotice(e.message,true);}finally{JW_CON_F1.loading=false;}}
async function jwConNew(){if(!JW_CON_F1.data)return;if(JW_CON_F1.dirty&&!await jwAgihanConfirm('Set baharu?','Perubahan belum disimpan akan hilang.','Set Baharu'))return;jwConApply(null);jwConTab('edit');jwConDirty();}
async function jwConRecall(){const d=JW_CON_F1.data,set=d?.sets.find(x=>x.id===jwConEl('jwConHistorySelect').value);if(!set)return jwConNotice('Pilih set dahulu.',true);if(JW_CON_F1.dirty&&!await jwAgihanConfirm('Panggil semula?','Perubahan belum disimpan akan hilang.','Panggil Semula'))return;jwConApply(set);jwConTab('edit');jwConNotice('Versi sejarah dibuka; belum diaktifkan.');}
async function jwConSave(){if(!JW_CON_F1.data)return;try{const r=await jwAgihanRequest('fiJWConstraintF1Save',{year:JW_CON_F1.data.year,name:jwConEl('jwConName').value,rules:jwConRules()});const d=await jwAgihanRequest('fiJWConstraintF1Get');jwConMeta(d);jwConApply(d.sets.find(x=>x.id===r.id));jwConNotice('Versi disimpan. Klik Aktifkan Set jika mahu digunakan.');}catch(e){jwConNotice(e.message,true);}}
async function jwConActivate(){if(JW_CON_F1.dirty||!JW_CON_F1.id)return;if(!await jwAgihanConfirm('Aktifkan Constraints?','Set ini digunakan untuk perancangan sahaja; jadual rasmi tidak disentuh.','Aktifkan'))return;try{await jwAgihanRequest('fiJWConstraintF1Activate',{id:JW_CON_F1.id});const d=await jwAgihanRequest('fiJWConstraintF1Get');jwConMeta(d);jwConApply(d.active);jwConNotice('Constraints aktif. Set agihan lama tidak diubah.');}catch(e){jwConNotice(e.message,true);}}
