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

    function toggleSidebar() {
      document.getElementById('sidebar').classList.toggle('hidden');
    }

    function switchView(viewId, btnEl) {
      ['viewGridMasa', 'viewMasterSubjek', 'viewAgihanTugas', 'viewGuruConstraints', 'viewGeneratorConsole'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });

      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active', 'bg-brand-600', 'text-white'));
      if (btnEl) btnEl.classList.add('active');

      const target = document.getElementById(viewId);
      if (target) target.classList.remove('hidden');
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
      STATE_SUBJEK = res.tetapanSubjek || [];
      STATE_AGIHAN = res.agihanTugas || [];
      STATE_GURU_CONSTRAINT = res.guruConstraints || [];
      parseFlatAgihanToGuruView();
      JW_AGIHAN_REVISION = 0;
      setAgihanSaveStatus('saved');
      renderGridMasaTable();
      renderSubjekTable();
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
    let JW_GRID_PRESETS = [];
    let JW_GRID_MODE = 'legacy';  // grid aktif asal: lihat sahaja sehingga buat draf baharu
    let JW_GRID_SOURCE = 'ASAL_BACA_SAHAJA';
    let JW_GRID_DIRTY = false;
    let JW_GRID_LOADED = false;
    const JW_GRID_DAYS = ['Isnin','Selasa','Rabu','Khamis','Jumaat'];
    const JW_GRID_COHORTS = [
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
    function jwGridYears(scope){return (JW_GRID_COHORTS.find(c=>c.value===(JW_GRID_LEGACY_SCOPES[scope]||scope))||JW_GRID_COHORTS[0]).years;}
    function jwGridClock(time){const [h,m]=String(time||'').split(':').map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:NaN;}
    function jwGridTime(n){return Number.isFinite(n)&&n>=0&&n<1440?`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`:'—';}
    function jwGridStart(day){return JW_GRID_WORK_CTRL.startByDay?.[day]||JW_GRID_WORK_CTRL.start||'07:40';}
    function jwGridColorMessage(message,isError){
      const el=document.getElementById('jwGridStateMessage');if(!el)return;
      el.textContent=message;el.className='jw-grid-message '+(isError?'jw-grid-message--error':'');
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
        <td class="jw-grid-td jw-grid-center"><i class="fa-solid fa-lock text-slate-400" title="Tempoh grid terkunci; ubah melalui Controller"></i></td>
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
    function jwGridSetTab(tab){
      if(tab!=='controller')try{jwGridReadController();}catch(e){jwGridColorMessage(e.message,true);}
      document.querySelectorAll('.jw-grid-tab').forEach(el=>el.classList.toggle('jw-grid-tab--active',el.dataset.tab===tab));
      ['controller','grid','history'].forEach(id=>document.getElementById('jwGridPanel_'+id)?.classList.toggle('hidden',tab!==id));
    }
    async function jwGridStudioLoad(){
      try{
        const res=await postToBackend({action:'fiJWGridStudioGet'});
        if(!res?.success)throw Error(res?.error||'Studio Grid tidak tersedia');
        JW_GRID_CTRL=res.controller;JW_GRID_WORK_CTRL=jwGridClone(res.controller);JW_GRID_CTRL_VERSION=res.controllerVersion||0;
        JW_GRID_PRESETS=res.presets||[];JW_GRID_SOURCE=res.source;
        JW_GRID_LOADED=true;
        const src=document.getElementById('jwGridSourceBadge');if(src)src.textContent=res.source==='SALINAN_UAT'?'Sumber: UAT':'Sumber: ASAL (baca sahaja)';
        jwGridRenderController();jwGridRenderMode();renderGridMasaTable();
      }catch(e){console.warn('Studio Grid:',e);jwGridColorMessage('Studio Grid tidak dapat dibaca: '+e.message,true);}
    }
    function jwGridRenderMode(){
      const el=document.getElementById('jwGridWorkingLabel');if(el)el.textContent=JW_GRID_MODE==='legacy'?'Grid aktif sedia ada · baca sahaja':JW_GRID_MODE==='draft'?'Grid baharu · belum disimpan':'Salinan versi lama · boleh diubah';
      const hint=document.getElementById('jwGridModeHint');if(hint)hint.textContent=JW_GRID_MODE==='legacy'?'Klik “Tambah Grid Masa” untuk membuat draf baharu. Grid aktif tidak diubah secara senyap.':'ID slot dijana semasa simpan. Hanya kumpulan dan jenis slot perlu dipilih.';
    }
    function jwGridRenderPresets(){
      const select=document.getElementById('jwGridPresetSelect');if(!select)return;
      const old=select.value;
      select.innerHTML='<option value="">— Pilih sejarah grid —</option>'+JW_GRID_PRESETS.map(p=>`<option value="${jwGridEsc(p.id)}">${jwGridEsc(p.name)} · ${jwGridEsc(String(p.createdAt).slice(0,16))}</option>`).join('');
      if(JW_GRID_PRESETS.some(p=>p.id===old))select.value=old;
      const qty=document.getElementById('jwGridPresetCount');if(qty)qty.textContent=String(JW_GRID_PRESETS.length);
    }
    function jwGridEnsureDraft(){if(JW_GRID_MODE==='legacy')throw Error('Grid aktif asal dipaparkan baca sahaja. Klik “Tambah Grid Masa” dahulu untuk mengedit.');}
    function jwGridNextCohort(day){
      const d=STATE_GRID_MASA.filter(r=>r.Hari===day);
      const cursor=[1,2,3,4,5,6].map(year=>({year,time:jwGridClock(jwGridStart(day))}));
      for(const r of d){for(const year of jwGridYears(r.Tahap))cursor[year-1].time=Math.max(cursor[year-1].time,jwGridClock(r.Jam_Tamat));}
      const first=Math.min(...cursor.map(x=>x.time));const available=cursor.filter(x=>x.time===first).map(x=>x.year);
      const found=JW_GRID_COHORTS.filter(c=>c.years.every(y=>available.includes(y)))
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
        const type=jwGridType(r),years=jwGridYears(r.Tahap),times=years.map(y=>cursors[y].minute);
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
      const rows=STATE_GRID_MASA.filter(r=>r.Hari===day),edit=JW_GRID_MODE!=='legacy';
      const disabled=edit?'':'disabled';
      tbody.innerHTML=rows.map((r,i)=>`<tr class="jw-grid-row">
        <td class="jw-grid-td jw-grid-center jw-grid-muted">${i+1}</td>
        <td class="jw-grid-td"><select class="jw-grid-input" aria-label="Kumpulan murid baris ${i+1}" ${disabled} onchange="jwGridEditRow(${i},'Tahap',this.value)">${jwGridScopeOptions(r.Tahap)}</select></td>
        <td class="jw-grid-td jw-grid-center jw-grid-day">${jwGridEsc(day)}</td>
        <td class="jw-grid-td jw-grid-center">${r.No_Waktu===''||r.No_Waktu===0||String(r.No_Waktu)==='0'?'—':jwGridEsc(r.No_Waktu)}</td>
        <td class="jw-grid-td jw-grid-center jw-grid-time">${jwGridEsc(formatTimeString(r.Jam_Mula)||'—')}</td>
        <td class="jw-grid-td jw-grid-center jw-grid-time">${jwGridEsc(formatTimeString(r.Jam_Tamat)||'—')} <i class="fa-solid fa-lock jw-grid-lock" aria-hidden="true"></i></td>
        <td class="jw-grid-td"><select class="jw-grid-input" aria-label="Jenis slot baris ${i+1}" ${disabled} onchange="jwGridEditRow(${i},'Jenis_ID',this.value)">${jwGridTypeOptions(r)}</select></td>
        <td class="jw-grid-td jw-grid-center"><div class="jw-grid-actions"><button title="Padam slot" aria-label="Padam baris ${i+1}" ${disabled} onclick="padamBarisGridMasa(${i})" class="jw-grid-icon jw-grid-icon--delete"><i class="fa-solid fa-trash"></i></button>${edit&&i===rows.length-1?'<button title="Tambah slot" aria-label="Tambah slot seterusnya" onclick="tambahBarisGridMasa()" class="jw-grid-icon jw-grid-icon--add"><i class="fa-solid fa-plus"></i></button>':''}</div></td>
      </tr>`).join('');
      if(!rows.length)tbody.innerHTML=`<tr><td colspan="8" class="jw-grid-empty"><span>Belum ada slot ${jwGridEsc(day)}.</span> ${edit?'<button onclick="tambahBarisGridMasa()" class="jw-grid-icon jw-grid-icon--add" aria-label="Tambah slot pertama"><i class="fa-solid fa-plus"></i></button>':'<span>Klik “Tambah Grid Masa” untuk memulakan draf.</span>'}</td></tr>`;
      const count=document.getElementById('jwGridDayCount');if(count)count.textContent=rows.length+' slot';
    }
    function jwGridEditRow(index,field,value){
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
    function tambahBarisGridMasa(){
      try{jwGridEnsureDraft();}catch(e){Swal.fire('Grid Masa',e.message,'warning');return;}
      const day=document.getElementById('selHariGridMasa')?.value||LAST_GRID_HARI||'Isnin';
      let scope;try{scope=jwGridNextCohort(day);}catch(e){return Swal.fire('Kohort',e.message,'warning');}
      const type=JW_GRID_WORK_CTRL.types.find(t=>t.id==='PDP'&&t.active)||JW_GRID_WORK_CTRL.types.find(t=>t.active);
      if(!type)return Swal.fire('Controller','Tiada jenis slot yang Aktif.','warning');
      const old=jwGridClone(STATE_GRID_MASA);
      STATE_GRID_MASA.push({Slot_ID:'',Tahap:scope,Hari:day,No_Waktu:'',Jam_Mula:'',Jam_Tamat:'',Jenis_ID:type.id,Jenis_Slot:type.legacy});
      try{jwGridRecalculateDay(day);JW_GRID_DIRTY=true;jwGridColorMessage('Baris ditambah. Pilih kumpulan murid dan jenis slot jika perlu.');}
      catch(e){STATE_GRID_MASA=old;Swal.fire('Tidak dapat tambah slot',e.message,'warning');}
      renderGridMasaTable();
    }
    function padamBarisGridMasa(index){
      if(JW_GRID_MODE==='legacy')return;
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
      const res=await postToBackend({action:'fiJWGridArchiveSave',data:{name,controller:JW_GRID_CTRL,grid:prepared}});
      if(!res?.success)throw Error(res?.error||'Gagal menyimpan versi.');
      STATE_GRID_MASA=res.grid;JW_GRID_PRESETS=res.presets||[];JW_GRID_DIRTY=false;
      jwGridRenderPresets();return res;
    }
    async function simpanGridMasa(){
      if(!JW_GRID_LOADED)return Swal.fire('Sumber belum sedia','Muat semula halaman dan pastikan Studio Grid berjaya dibaca.','warning');
      // Simpan sebagai sejarah — tidak menimpa Master_Grid_Masa secara senyap.
      if(!STATE_GRID_MASA.length)return Swal.fire('Grid kosong','Tambah sekurang-kurangnya satu slot sebelum menyimpan.','warning');
      const q=await Swal.fire({title:'Simpan sejarah Grid Masa',input:'text',inputLabel:'Nama versi grid',
        inputValue:'Grid '+new Date().toLocaleDateString('ms-MY')+' — '+(JW_GRID_MODE==='legacy'?'Sandaran Asal':'Draf'),
        inputPlaceholder:'Contoh: Grid 2027 — Tahun 1 Karakter',showCancelButton:true,confirmButtonText:'Simpan versi',cancelButtonText:'Batal',
        inputValidator:value=>!String(value||'').trim()?'Masukkan nama versi grid.':undefined});
      if(!q.isConfirmed)return;
      showLoader('','save');try{
        const res=await jwGridSavePreset(q.value);hideLoader();
        jwGridColorMessage('Versi '+res.id+' telah disimpan bersama tetapan Controller.');
        Swal.fire('Versi disimpan','Grid dan Controller telah disimpan dalam sejarah UAT. Grid aktif tidak berubah.','success');
      }catch(e){hideLoader();Swal.fire('Belum disimpan',e.message,'error');}
    }
    async function jwGridCreateNew(){
      if(!JW_GRID_LOADED)return Swal.fire('Sumber belum sedia','Studio Grid belum selesai dimuatkan.','warning');
      try{jwGridReadController();}catch(e){return Swal.fire('Controller',e.message,'error');}
      if(STATE_GRID_MASA.length){
        const q=await Swal.fire({title:'Tambah Grid Masa Baharu',text:'Simpan grid semasa sebagai sejarah terlebih dahulu sebelum memulakan grid kosong?',
          input:'text',inputValue:'Grid sebelum perubahan '+new Date().toLocaleDateString('ms-MY'),
          showCancelButton:true,confirmButtonText:'Simpan & Tambah Baharu',cancelButtonText:'Batal',
          inputValidator:value=>!String(value||'').trim()?'Nama sejarah diperlukan.':undefined});
        if(!q.isConfirmed)return;
        showLoader('','save');try{await jwGridSavePreset(q.value);}catch(e){hideLoader();return Swal.fire('Tidak dapat memulakan grid',e.message,'error');}hideLoader();
      }
      JW_GRID_WORK_CTRL=jwGridClone(JW_GRID_CTRL);
      STATE_GRID_MASA=[];JW_GRID_MODE='draft';JW_GRID_DIRTY=true;LAST_GRID_HARI='Isnin';
      document.getElementById('selHariGridMasa').value='Isnin';jwGridRenderMode();renderGridMasaTable();jwGridSetTab('grid');
      jwGridColorMessage('Grid baharu kosong. Tekan + untuk slot pertama; masa mula diambil daripada Controller.');
    }
    async function jwGridRecall(){
      const id=document.getElementById('jwGridPresetSelect')?.value;
      if(!id)return Swal.fire('Pilih versi','Sila pilih sejarah grid terlebih dahulu.','info');
      const q=await Swal.fire({title:'Panggil semula versi grid?',text:'Versi akan dibuka sebagai DRAF salinan. Grid aktif tidak ditimpa.',showCancelButton:true,confirmButtonText:'Panggil semula',cancelButtonText:'Batal'});
      if(!q.isConfirmed)return;
      showLoader('','refresh');try{
        const res=await postToBackend({action:'fiJWGridArchiveRecall',data:{id}});
        if(!res?.success)throw Error(res?.error||'Versi tidak ditemui');
        JW_GRID_CTRL=jwGridClone(res.controller);JW_GRID_WORK_CTRL=jwGridClone(res.controller);STATE_GRID_MASA=res.grid.map(r=>({...r,__legacy:true}));
        JW_GRID_MODE='recall';JW_GRID_DIRTY=false;jwGridRenderController();jwGridRenderMode();
        jwGridSetTab('grid');renderGridMasaTable();
        jwGridColorMessage('Versi '+res.name+' telah dipanggil sebagai draf dengan Controller asal. Tiada perubahan pada grid aktif.');
        hideLoader();
      }catch(e){hideLoader();Swal.fire('Gagal panggil semula',e.message,'error');}
    }
    async function jwGridUseLatestController(){
      if(JW_GRID_MODE==='legacy')return Swal.fire('Grid aktif asal','Cipta draf baharu sebelum menerapkan Controller.','info');
      try{jwGridReadController();}catch(e){return Swal.fire('Controller tidak sah',e.message,'error');}
      const q=await Swal.fire({title:'Terapkan Controller ke draf?',text:'Tempoh dan jam mula akan dikira semula. Grid versi lama yang telah disimpan tidak berubah.',icon:'warning',showCancelButton:true,confirmButtonText:'Pratonton & Terap',cancelButtonText:'Batal'});
      if(!q.isConfirmed)return;
      const oldCtrl=jwGridClone(JW_GRID_WORK_CTRL),oldGrid=jwGridClone(STATE_GRID_MASA);
      JW_GRID_WORK_CTRL=jwGridClone(JW_GRID_CTRL);
      try{jwGridRecalculateAll();JW_GRID_DIRTY=true;renderGridMasaTable();jwGridColorMessage('Controller terkini diterapkan pada draf ini. Simpan versi baharu jika berpuas hati.');}
      catch(e){JW_GRID_WORK_CTRL=oldCtrl;STATE_GRID_MASA=oldGrid;Swal.fire('Tidak boleh terap',e.message,'warning');}
    }
    async function jwGridSaveController(){
      if(!JW_GRID_LOADED)return Swal.fire('Sumber belum sedia','Studio Grid belum berjaya dimuatkan.','warning');
      try{jwGridReadController();}catch(e){return Swal.fire('Controller',e.message,'error');}
      const q=await Swal.fire({title:'Simpan Controller?',text:'Tetapan baharu digunakan untuk draf seterusnya. Grid aktif dan sejarah lama tidak berubah.',showCancelButton:true,confirmButtonText:'Simpan Controller',cancelButtonText:'Batal'});
      if(!q.isConfirmed)return;
      showLoader('','save');try{
        const res=await postToBackend({action:'fiJWGridControllerSave',data:{controller:JW_GRID_CTRL,expectedVersion:JW_GRID_CTRL_VERSION}});
        if(!res?.success)throw Error(res?.error||'Gagal simpan Controller');
        JW_GRID_CTRL_VERSION=res.controllerVersion;JW_GRID_CTRL=res.controller;
        jwGridRenderController();hideLoader();
        Swal.fire('Controller disimpan','Tetapan digunakan untuk pengisian baharu; grid lama tidak diubah.','success');
      }catch(e){hideLoader();Swal.fire('Controller tidak disimpan',e.message,'error');}
    }
    async function jwGridApplyActive(){
      if(!JW_GRID_LOADED)return Swal.fire('Sumber belum sedia','Studio Grid belum berjaya dimuatkan.','warning');
      if(JW_GRID_MODE==='legacy')return Swal.fire('Tiada perubahan','Buka draf terlebih dahulu.','info');
      try{if(JW_GRID_MODE==='draft'||JW_GRID_DIRTY)jwGridRecalculateAll();}catch(e){return Swal.fire('Semakan grid',e.message,'warning');}
      const q=await Swal.fire({title:'Gunakan sebagai Grid Aktif UAT?',text:'Hanya salinan UAT boleh ditulis. Jika ada jadual hasil sedia ada yang akan terjejas, sistem menyekat pengaktifan.',
        icon:'warning',showCancelButton:true,confirmButtonText:'Semak & Aktifkan UAT',cancelButtonText:'Batal'});
      if(!q.isConfirmed)return;
      showLoader('','save');try{
        const res=await postToBackend({action:'fiJWGridActiveApply',data:{controller:JW_GRID_WORK_CTRL,grid:STATE_GRID_MASA.map(r=>({...r,__legacy:false}))}});
        if(!res?.success)throw Error(res?.error||'Pengaktifan tidak berjaya');
        STATE_GRID_MASA=res.grid;JW_GRID_MODE='legacy';JW_GRID_DIRTY=false;
        jwGridRenderMode();renderGridMasaTable();hideLoader();
        Swal.fire('Grid UAT',res.status==='TIADA_PERUBAHAN'?'Grid aktif sudah sama.':'Grid UAT dikemas kini; sandaran automatik disimpan.','success');
      }catch(e){hideLoader();Swal.fire({icon:'warning',title:'Pengaktifan disekat',text:e.message});}
    }

    // ================= 2. SUBJEK =================
    function generateUniqueSubjekID(kodSubjek, kategoriTahap, idx) {
      if (!kodSubjek) return `SUBJ-${idx + 1}`;
      let tag = 'ALL';
      const k = String(kategoriTahap || '').toLowerCase();
      
      if (k.includes('tahap 1') || k.includes('thp 1') || k.includes('tahun 1')) {
        tag = 'T1';
      } else if (k.includes('tahap 2') || k.includes('thp 2')) {
        tag = 'T2';
      } else if (k.includes('semua')) {
        tag = 'ALL';
      }
      return `${kodSubjek}-${tag}`;
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
        return;
      }

      STATE_SUBJEK.forEach((row, idx) => {
        const selectedKod = row.Kod_Subjek || row.ID_Subjek || '';
        let optS = optMasterSubjek.replace(`value="${selectedKod}"`, `value="${selectedKod}" selected`);
        let modeBlokVal = row.Mode_Block || 'Double Slot (60 Minit)';

        if (!row.ID_Subjek) {
          row.ID_Subjek = generateUniqueSubjekID(selectedKod, row.Kategori_Tahap, idx);
        }

        tbody.innerHTML += `
          <tr class="hover:bg-slate-50 transition">
            <td class="table-cell-std text-center font-bold text-slate-400">${idx + 1}</td>
            <td class="p-1.5">
              <select data-field="Kod_Subjek" onchange="onSelectMasterSubjekCode(this, ${idx})" class="w-full p-1.5 border rounded-lg text-xs font-extrabold text-emerald-800 bg-white">
                ${optS}
              </select>
              <input type="hidden" data-field="ID_Subjek" value="${row.ID_Subjek}">
            </td>
            <td class="p-1.5">
              <input type="text" data-field="Nama_Subjek" value="${row.Nama_Subjek || ''}" readonly class="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 cursor-not-allowed">
            </td>
            <td class="p-1.5">
              <select data-field="Kategori_Tahap" onchange="onChangeKategoriTahap(this, ${idx})" class="w-full p-1.5 border rounded-lg text-xs font-semibold bg-white">
                <option value="Semua (KSSR)" ${row.Kategori_Tahap === 'Semua (KSSR)' ? 'selected' : ''}>Semua (KSSR)</option>
                <option value="Tahap 1 (KSSR)" ${row.Kategori_Tahap === 'Tahap 1 (KSSR)' ? 'selected' : ''}>Tahap 1 (KSSR)</option>
                <option value="Tahap 2 (KSSR)" ${row.Kategori_Tahap === 'Tahap 2 (KSSR)' ? 'selected' : ''}>Tahap 2 (KSSR)</option>
                <option value="Tahun 1 (KP27)" ${row.Kategori_Tahap === 'Tahun 1 (KP27)' ? 'selected' : ''}>Tahun 1 (KP27)</option>
                <option value="Tahap 1 (KP27)" ${row.Kategori_Tahap === 'Tahap 1 (KP27)' ? 'selected' : ''}>Tahap 1 (KP27)</option>
              </select>
            </td>
            <td class="p-1.5"><input type="number" data-field="Bil_Waktu_Seminggu" value="${row.Bil_Waktu_Seminggu || 6}" class="w-full p-1.5 border rounded-lg text-xs font-extrabold text-center bg-white text-emerald-700"></td>
            <td class="p-1.5">
              <select data-field="Mode_Block" class="w-full p-1.5 border rounded-lg text-xs font-bold bg-white">
                <option value="Double Slot (60 Minit)" ${modeBlokVal.includes('Double') || modeBlokVal === 'Double' ? 'selected' : ''}>Double Slot (60 Minit)</option>
                <option value="Single Slot (30 Minit)" ${modeBlokVal.includes('Single') || modeBlokVal === 'Single' ? 'selected' : ''}>Single Slot (30 Minit)</option>
                <option value="Hybrid (Auto 2+1 Masa)" ${modeBlokVal.includes('Hybrid') || modeBlokVal.includes('Auto') ? 'selected' : ''}>Hybrid (Auto 2+1 Masa)</option>
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
    }

    function onSelectMasterSubjekCode(el, idx) {
      const selectedKod = el.value;
      const masterItem = ALL_MASTER_SUBJEK_LIST.find(m => (m.Kod_Subjek || m.ID_Subjek) === selectedKod);
      const nama = masterItem ? (masterItem['Nama_Subjek / Komponen'] || masterItem.Nama_Subjek || selectedKod) : '';

      STATE_SUBJEK[idx].Kod_Subjek = selectedKod;
      STATE_SUBJEK[idx].Nama_Subjek = nama;
      STATE_SUBJEK[idx].ID_Subjek = generateUniqueSubjekID(selectedKod, STATE_SUBJEK[idx].Kategori_Tahap, idx);

      const tr = el.closest('tr');
      if (tr) {
        const namaInput = tr.querySelector('[data-field="Nama_Subjek"]');
        if (namaInput) namaInput.value = nama;
        const idInput = tr.querySelector('[data-field="ID_Subjek"]');
        if (idInput) idInput.value = STATE_SUBJEK[idx].ID_Subjek;
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
        Swal.fire('Info', 'Tiada data Master Subjek dijumpai.', 'info');
        return;
      }
      if (STATE_SUBJEK.length) {
        const confirm = await Swal.fire({
          icon: 'warning', title: 'Ganti semua tetapan subjek?',
          text: 'Tindakan ini menggantikan senarai subjek yang sedang diedit. Jika ada perubahan belum disimpan, perubahan itu akan hilang.',
          showCancelButton: true, confirmButtonText: 'Ya, tarik dari Master', cancelButtonText: 'Batal'
        });
        if (!confirm.isConfirmed) return;
      }

      STATE_SUBJEK = ALL_MASTER_SUBJEK_LIST.map((s, idx) => {
        const kod = s.Kod_Subjek || s.ID_Subjek || '';
        const kateg = s.Kategori_Tahap || 'Semua (KSSR)';
        return {
          ID_Subjek: generateUniqueSubjekID(kod, kateg, idx),
          Kod_Subjek: kod,
          Nama_Subjek: s['Nama_Subjek / Komponen'] || s.Nama_Subjek || s.Nama || '',
          Kategori_Tahap: kateg,
          Bil_Waktu_Seminggu: parseInt(s.Bil_Waktu_Seminggu || 6, 10),
          Mode_Block: s.Mode_Block || 'Double Slot (60 Minit)',
          Flag_CoTeaching: s.Flag_CoTeaching || 'FALSE'
        };
      });

      renderSubjekTable();
      Swal.fire('Berjaya', `Berjaya menarik ${STATE_SUBJEK.length} subjek!`, 'success');
    }

    function syncSubjekDOM() {
      const rows = document.querySelectorAll('#tbodyMasterSubjek tr');
      if (rows.length === 0) return;
      const updated = [];
      rows.forEach((r, idx) => {
        const kodSubjek = r.querySelector('[data-field="Kod_Subjek"]')?.value || '';
        const namaSubjek = r.querySelector('[data-field="Nama_Subjek"]')?.value || '';
        const kategoriTahap = r.querySelector('[data-field="Kategori_Tahap"]')?.value || 'Semua (KSSR)';
        const bilWaktu = r.querySelector('[data-field="Bil_Waktu_Seminggu"]')?.value || 6;
        const modeBlock = r.querySelector('[data-field="Mode_Block"]')?.value || 'Double Slot (60 Minit)';
        const flagCoTeaching = r.querySelector('[data-field="Flag_CoTeaching"]')?.value || 'FALSE';

        let idSubjek = r.querySelector('[data-field="ID_Subjek"]')?.value || '';
        if (!idSubjek || idSubjek.trim() === '') {
          idSubjek = generateUniqueSubjekID(kodSubjek, kategoriTahap, idx);
        }

        if (kodSubjek) {
          updated.push({
            ID_Subjek: idSubjek,
            Kod_Subjek: kodSubjek,
            Nama_Subjek: namaSubjek,
            Kategori_Tahap: kategoriTahap,
            Bil_Waktu_Seminggu: parseInt(bilWaktu, 10),
            Mode_Block: modeBlock,
            Flag_CoTeaching: flagCoTeaching
          });
        }
      });
      if (updated.length > 0) STATE_SUBJEK = updated;
    }

    function tambahBarisSubjek() {
      syncSubjekDOM();
      STATE_SUBJEK.push({
        ID_Subjek: '',
        Kod_Subjek: '',
        Nama_Subjek: '',
        Kategori_Tahap: 'Semua (KSSR)',
        Bil_Waktu_Seminggu: 6,
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
      syncSubjekDOM();
      showLoader('', 'save');
      try {
        const res = await postToBackend({ action: 'saveJWConstraints', data: { type: 'subjek', data: STATE_SUBJEK } });
        hideLoader();
        if (res && res.success) {
          Swal.fire('Berjaya', 'Tetapan subjek telah disimpan.', 'success');
          renderAgihanGuruMatrix();
        } else {
          console.warn('Simpan tetapan subjek gagal:',res?.error);
          Swal.fire('Belum disimpan','Sila semak maklumat dan cuba lagi.','error');
        }
      } catch (err) {
        hideLoader();
        console.error(err);
        Swal.fire('Sambungan terganggu','Sila cuba lagi.','error');
      }
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
        if (row.subjekIndex !== undefined && row.subjekIndex !== null && STATE_SUBJEK[row.subjekIndex]) {
          sub = STATE_SUBJEK[row.subjekIndex];
        } else {
          sub = STATE_SUBJEK.find(s => s.ID_Subjek === row.idSubjek || s.Kod_Subjek === row.idSubjek) || {};
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
          if (row.subjekIndex !== undefined && row.subjekIndex !== null && STATE_SUBJEK[row.subjekIndex]) {
            sub = STATE_SUBJEK[row.subjekIndex];
          } else {
            sub = STATE_SUBJEK.find(s => s.ID_Subjek === row.idSubjek || s.Kod_Subjek === row.idSubjek) || {};
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
      if (Number.isInteger(row.subjekIndex) && STATE_SUBJEK[row.subjekIndex]) {
        return STATE_SUBJEK[row.subjekIndex];
      }
      return STATE_SUBJEK.find(s => s.ID_Subjek === row.idSubjek) ||
          STATE_SUBJEK.find(s => s.Kod_Subjek === row.idSubjek || s.Kod_Subjek === row.kodSubjek) || {};
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

      const sourceSubjek = (STATE_SUBJEK && STATE_SUBJEK.length > 0) ? STATE_SUBJEK : ALL_MASTER_SUBJEK_LIST;
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
          const matchIndex = STATE_SUBJEK.findIndex(s => s.ID_Subjek === row.idSubjek || s.Kod_Subjek === row.idSubjek);
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
        const subObj = STATE_SUBJEK[subIndex] || {};
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
      return (STATE_SUBJEK || []).filter(s => {
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
          <tr class="hover:bg-slate-50 transition">
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
  