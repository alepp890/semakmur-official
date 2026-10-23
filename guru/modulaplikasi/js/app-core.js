/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - FRONTEND CORE MODULE
 * FAIL: root/guru/modulaplikasi/js/app-core.js
 * ==============================================================================
 */

// Pemataan Kod Subjek ke Nama Penuh DSKP
const SUBJECT_MAP = {
  'BM': 'Bahasa Melayu',
  'BI': 'Bahasa Inggeris',
  'MT': 'Matematik',
  'SN': 'Sains',
  'BA': 'Bahasa Arab',
  'PMZ': 'Pendidikan Muzik',
  'PSV': 'Pendidikan Seni Visual',
  'PI/Q': 'Pendidikan Islam',
  'PI/U': 'Pendidikan Islam',
  'PI': 'Pendidikan Islam',
  'RBT': 'Reka Bentuk dan Teknologi',
  'PJ': 'Pendidikan Jasmani',
  'PK': 'Pendidikan Kesihatan',
  'SEJ': 'Sejarah',
  'HIST': 'Sejarah'
};

const state = {
  currentUserRole: 'guru',
  activeTab: 'tabDashboard',
  currentUser: null,
  currentRphId: null,
  todayJadual: [],
  allUserJadual: [],
  dskpList: [],
  rphList: [],
  takwimList: [],
  activeModalRphId: null,
  currentStarRating: 5
};

let idleTimer = null;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(onIdleTimeout, IDLE_TIMEOUT_MS);
}

function onIdleTimeout() {
  console.warn("⚠️ Pemasa Idle: Tiada aktiviti dikesan selama 5 minit.");
  sessionStorage.removeItem('ERPH_TAB_SESSION_ACTIVE');
  alert('Sesi e-RPH telah tamat masa akibat tiada aktiviti selama 5 minit. Sila log masuk semula.');
  window.location.replace('../../../LoginSession.html');
}

function initIdleTimeoutMonitor() {
  const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  activityEvents.forEach(evt => {
    window.addEventListener(evt, resetIdleTimer, { passive: true });
  });
  resetIdleTimer();
  console.log("⏳ Pemasa Idle 5 Minit diaktifkan untuk tab e-RPH.");
}

async function fetchBackendApi(action, payloadData = {}) {
  // Menyokong pembacaan URL dari config.js sama ada pembolehubah global atau objek APP_CONFIG
  const targetUrl = (typeof window.APP_CONFIG !== 'undefined' && window.APP_CONFIG.WEB_APP_URL)
    ? window.APP_CONFIG.WEB_APP_URL
    : ((typeof WEB_APP_URL !== 'undefined' && WEB_APP_URL)
      ? WEB_APP_URL
      : 'https://script.google.com/macros/s/AKfycbzxLA0J-FsbeeiwR0Y-TkOfCwRKfMCLwXLc0jr6qErT7reV17bL8UMqjq8wZbIuYTwy/exec');

  const payload = {
    action: action,
    data: payloadData,
    payload: payloadData
  };

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });

  if (!response.ok) throw new Error('Ralat Pelayan HTTP ' + response.status);
  return await response.json();
}
function cleanTimeFormatFrontend(str) {
  if (!str) return '';
  let timeStr = String(str).trim();
  if (timeStr.includes('1899-12-30') || (timeStr.includes('T') && timeStr.includes('Z'))) {
    try {
      let d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        let h = d.getHours();
        let m = d.getMinutes();
        let hh = h < 10 ? '0' + h : h;
        let mm = m < 10 ? '0' + m : m;
        return hh + ':' + mm;
      }
    } catch(e) {}
  }
  return timeStr;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  let clean = String(timeStr).trim().toLowerCase();
  
  let isPM = clean.includes('pm');
  let isAM = clean.includes('am');
  clean = clean.replace(/am|pm/g, '').trim();

  let parts = clean.split(':');
  if (parts.length < 2) return 0;

  let h = parseInt(parts[0], 10) || 0;
  let m = parseInt(parts[1], 10) || 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  if (!isAM && !isPM && h >= 1 && h <= 6) {
    h += 12;
  }

  return (h * 60) + m;
}

function parseTakwimDateHelper(dateStr) {
  if (!dateStr) return null;
  let str = String(dateStr).trim();
  let parts = str.split(/[\/\-]/);

  if (parts.length === 3) {
    let p0 = parseInt(parts[0], 10);
    let p1 = parseInt(parts[1], 10);
    let p2 = parseInt(parts[2], 10);

    if (parts[0].length === 4) {
      return new Date(p0, p1 - 1, p2);
    }
    if (parts[2].length === 4) {
      if (p0 <= 12 && p1 > 12) {
        return new Date(p2, p0 - 1, p1);
      } else if (p0 > 12 && p1 <= 12) {
        return new Date(p2, p1 - 1, p0);
      } else {
        return new Date(p2, p0 - 1, p1);
      }
    }
  }

  let d = new Date(str);
  return !isNaN(d.getTime()) ? d : null;
}

function initUserSession() {
  const sessionData = localStorage.getItem('currentUser') || 
                      sessionStorage.getItem('CURRENT_USER') || 
                      localStorage.getItem('SAVED_MOE_USER') ||
                      localStorage.getItem('user') ||
                      sessionStorage.getItem('user');

  if (sessionData) {
    try {
      state.currentUser = JSON.parse(sessionData);
      window.currentUser = state.currentUser;

      const sistemAkses = (
        state.currentUser.Sistem_Akses || 
        state.currentUser.sistem_akses || 
        state.currentUser.sistemAkses || 
        ''
      ).toString().trim().toLowerCase();

      const name = state.currentUser.nama || state.currentUser.Nama_Guru || state.currentUser.name || state.currentUser.Nama || 'Guru Akademik';
      const email = state.currentUser.email || state.currentUser.Email || state.currentUser.emel || state.currentUser.Emel || 'guru@moe-dl.edu.my';
      const jawatan = (state.currentUser.jawatan || state.currentUser.Jawatan || 'Guru Akademik').toString().trim();

      const userNameEl = document.getElementById('userName');
      if (userNameEl) userNameEl.innerText = name;

      const userRoleTitleEl = document.getElementById('userRoleTitle');
      if (userRoleTitleEl) userRoleTitleEl.innerText = `${jawatan} | ${email}`;
      
      if (document.getElementById('printGuruName')) {
        document.getElementById('printGuruName').innerText = name;
      }

      const pentadbirJawatanList = [
        'guru besar',
        'pk pentadbiran',
        'penolong kanan pentadbiran',
        'pk 1',
        'pk hem',
        'penolong kanan hem',
        'pk ko kurikulum',
        'pk kokurikulum',
        'penolong kanan kokurikulum'
      ];
      
      const isPentadbirRole = pentadbirJawatanList.some(j => jawatan.toLowerCase().includes(j));

      const roleToggleContainer = document.getElementById('roleToggleContainer');
      if (roleToggleContainer) {
        if (sistemAkses === 'admin') {
          roleToggleContainer.style.display = 'flex';
        } else {
          roleToggleContainer.style.display = 'none';
        }
      }

      const navApproval = document.getElementById('navTabApproval');
      if (navApproval) {
        if (isPentadbirRole) {
          navApproval.style.display = 'flex';
        } else {
          navApproval.style.display = 'none';
        }
      }

      if (isPentadbirRole) {
        switchUserRole('pentadbir');
      } else {
        switchUserRole('guru');
      }

      const mainBody = document.getElementById('mainBody');
      if (mainBody) mainBody.style.display = 'flex';

      initIdleTimeoutMonitor();

      fetchJadualHariIni(email);
      loadTakwimAndInitDropdowns();
    } catch (e) {
      console.error("Ralat membaca sesi pengguna:", e);
      window.location.replace('../../../LoginSession.html');
    }
  } else {
    window.location.replace('../../../LoginSession.html');
  }
}

function loadTakwimAndInitDropdowns() {
  fetchBackendApi('getTakwimData')
    .then(res => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        state.takwimList = res.data;
        window.takwimListGlobal = res.data;
      } else {
        state.takwimList = [];
        window.takwimListGlobal = [];
      }
      populateWeeksDropdowns();
    })
    .catch(err => {
      console.error('Ralat muat Takwim:', err);
      state.takwimList = [];
      window.takwimListGlobal = [];
      populateWeeksDropdowns();
    });
}

function populateWeeksDropdowns() {
  const selectGuru = document.getElementById('selectWeekGuru');
  if (!selectGuru) return;
  selectGuru.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let matchedCurrentWeek = null;

  if (state.takwimList && state.takwimList.length > 0) {
    let sortedTakwim = [...state.takwimList].sort((a, b) => (parseInt(b.mingguKe, 10) || 0) - (parseInt(a.mingguKe, 10) || 0));

    sortedTakwim.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.mingguKe;
      opt.textContent = `Minggu ${t.mingguKe}`;
      selectGuru.appendChild(opt);

      let dMula = parseTakwimDateHelper(t.tarikhMula);
      let dTamat = parseTakwimDateHelper(t.tarikhTamat);
      if (dMula && dTamat) {
        dMula.setHours(0, 0, 0, 0);
        dTamat.setDate(dTamat.getDate() + 2);
        dTamat.setHours(23, 59, 59, 999);

        if (today >= dMula && today <= dTamat) {
          matchedCurrentWeek = String(t.mingguKe);
        }
      }
    });

    if (matchedCurrentWeek) {
      selectGuru.value = matchedCurrentWeek;
    } else if (selectGuru.options.length > 0) {
      selectGuru.selectedIndex = 0;
    }
  } else {
    for (let i = 42; i >= 1; i--) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = 'Minggu ' + i;
      selectGuru.appendChild(opt);
    }
    selectGuru.value = '1';
  }
  
  const currentWeekVal = selectGuru.value || '1';
  const lbl = document.getElementById('lblMingguHariDashboard');
  if (lbl) lbl.textContent = `Minggu ${currentWeekVal} (Semasa)`;

  if (typeof initBuilderWeekDropdown === 'function') {
    initBuilderWeekDropdown();
  }
  if (typeof initApprovalWeekDropdown === 'function') {
    initApprovalWeekDropdown();
  }

  updateDashboardDayDropdown();
  loadGuruDashboardData();
}

function updateDashboardDayDropdown() {
  const selectWeek = document.getElementById('selectWeekGuru');
  const selectDay = document.getElementById('filterDayGuru');
  if (!selectDay || !selectWeek) return;

  const weekVal = selectWeek.value;
  const takwim = state.takwimList || window.takwimListGlobal || [];
  const currentTakwim = takwim.find(t => String(t.mingguKe) === String(weekVal));

  let refMonday = null;
  if (currentTakwim && currentTakwim.tarikhMula) {
    refMonday = parseTakwimDateHelper(currentTakwim.tarikhMula);
  }

  if (!refMonday || isNaN(refMonday.getTime())) {
    refMonday = new Date(2026, 0, 12);
    let weekDiff = (parseInt(weekVal, 10) || 1) - 1;
    refMonday.setDate(refMonday.getDate() + (weekDiff * 7));
  }

  const days = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];
  const currentVal = selectDay.value;

  selectDay.innerHTML = '<option value="ALL">Semua Hari</option>';

  days.forEach((day, idx) => {
    let dayDate = new Date(refMonday);
    dayDate.setDate(refMonday.getDate() + idx);

    let dd = String(dayDate.getDate()).padStart(2, '0');
    let mm = String(dayDate.getMonth() + 1).padStart(2, '0');
    let yyyy = dayDate.getFullYear();
    let formattedDate = `${dd}/${mm}/${yyyy}`;

    const opt = document.createElement('option');
    opt.value = day;
    opt.textContent = `${day} (${formattedDate})`;
    selectDay.appendChild(opt);
  });

  if (currentVal) selectDay.value = currentVal;
}

function changeWeekGuru() {
  const selectGuru = document.getElementById('selectWeekGuru');
  const currentWeekVal = selectGuru ? selectGuru.value : '1';
  const lbl = document.getElementById('lblMingguHariDashboard');
  if (lbl) lbl.textContent = `Minggu ${currentWeekVal}`;

  updateDashboardDayDropdown();
  loadGuruDashboardData(); 
}

function filterGuruTableByDay() { loadGuruDashboardData(); }

function processAndMergeJadual(dataList) {
  if (!Array.isArray(dataList) || dataList.length === 0) return [];

  let slots = dataList.map(s => {
    const mula = cleanTimeFormatFrontend(s.jam_mula || s.masaMula);
    const tamat = cleanTimeFormatFrontend(s.jam_tamat || s.masaTamat);
    return {
      subjek: (s.subjek || 'Subjek').trim(),
      kelas: (s.nama_kelas || s.kelas || 'Tiada Kelas').trim(),
      jam_mula: mula,
      jam_tamat: tamat,
      mula_min: timeToMinutes(mula),
      tamat_min: timeToMinutes(tamat),
      raw: s
    };
  });

  slots.sort((a, b) => a.mula_min - b.mula_min);

  let merged = [];
  for (let slot of slots) {
    if (merged.length > 0) {
      let prev = merged[merged.length - 1];
      if (prev.subjek.toLowerCase() === slot.subjek.toLowerCase() &&
          prev.kelas.toLowerCase() === slot.kelas.toLowerCase() &&
          (prev.jam_tamat === slot.jam_mula || prev.tamat_min === slot.mula_min)) {
        
        prev.jam_tamat = slot.jam_tamat;
        prev.tamat_min = slot.tamat_min;
        prev.waktuCount = (prev.waktuCount || 1) + 1;
        continue;
      }
    }
    slot.waktuCount = 1;
    merged.push(slot);
  }

  const isBM = (subj) => {
    let str = subj.toLowerCase();
    return str === 'bm' || str === 'bahasa melayu';
  };

  const hasBmDoublePeriod = merged.some(s => isBM(s.subjek) && s.waktuCount >= 2);

  if (hasBmDoublePeriod) {
    merged = merged.filter(s => {
      if (isBM(s.subjek) && s.waktuCount === 1) {
        console.log("ℹ️ Abaikan 1 waktu terpisah BM sebab wujud 2 waktu bersama pada hari ini.");
        return false;
      }
      return true;
    });
  }

  return merged;
}

function fetchJadualHariIni(emailGuru) {
  const container = document.getElementById('jadualWidgetContainer');
  if (!container) return;

  const days = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  const todayName = days[new Date().getDay()];

  fetchBackendApi('getJadualGuruByHari', { emailGuru: emailGuru, hari: todayName })
    .then(res => {
      const rawDataList = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      
      const processedList = processAndMergeJadual(rawDataList);
      state.todayJadual = processedList;

      if (Array.isArray(processedList) && processedList.length > 0) {
        container.innerHTML = '';
        processedList.forEach(slot => {
          const mula  = slot.jam_mula;
          const tamat = slot.jam_tamat;
          const kelas = slot.kelas;
          const subjek = slot.subjek;
          const masaRange = (mula && tamat) ? `${mula} - ${tamat}` : 'Masa Jadual';

          const div = document.createElement('div');
          div.className = 'p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2';
          div.innerHTML = `
            <div class="flex justify-between items-center text-xs font-bold text-slate-800">
              <span>${subjek} (${kelas})</span>
              <span class="text-brand-600">${masaRange}</span>
            </div>
            <div class="flex justify-end pt-1 border-t border-slate-100">
              <button onclick="binaRphDariJadualDirect('${todayName}', '${subjek}', '${kelas}')" class="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all flex items-center gap-1">
                <span>+ Bina RPH</span>
              </button>
            </div>
          `;
          container.appendChild(div);
        });
      } else {
        container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-100">Tiada jadual PdPC bagi hari ${todayName}.</div>`;
      }
    })
    .catch(err => {
      console.error('Ralat Jadual Hari Ini:', err);
      container.innerHTML = `<div class="p-4 text-center text-rose-500 text-xs italic bg-rose-50 rounded-xl">Ralat memuatkan jadual.</div>`;
    });
}

function loadGuruDashboardData() {
  const emailGuru = window.currentUser ? (window.currentUser.email || window.currentUser.Email || window.currentUser.emel || '') : '';
  const selectWeek = document.getElementById('selectWeekGuru');
  const minggu = selectWeek ? selectWeek.value : '1';
  const filterDay = document.getElementById('filterDayGuru') ? document.getElementById('filterDayGuru').value : 'ALL';

  const tbody = document.getElementById('guruRphTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400 italic">Sedang menarik rekod e-RPH...</td></tr>`;

  fetchBackendApi('getErphListGuru', { emailGuru: emailGuru, minggu: minggu })
    .then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        let list = res.data;
        state.rphList = list;
        window.currentGuruRphList = list;

        if (filterDay && filterDay !== 'ALL') {
          list = list.filter(item => String(item.hari).toLowerCase() === filterDay.toLowerCase());
        }
        renderGuruRphTable(list);
        updateGuruStats(res.data);

        if (state.activeTab === 'tabPrint') {
          initPrintFolderExplorer();
        }
      } else {
        state.rphList = [];
        window.currentGuruRphList = [];
        renderGuruRphTable([]);
        updateGuruStats([]);
        if (state.activeTab === 'tabPrint') {
          initPrintFolderExplorer();
        }
      }
    })
    .catch(err => {
      console.error('Ralat loadGuruDashboardData:', err);
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-rose-500 italic">Ralat sambungan pelayan.</td></tr>`;
    });
}

function renderGuruRphTable(list) {
  const tbody = document.getElementById('guruRphTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400 italic">Tiada rekod e-RPH dijumpai bagi minggu/hari ini.</td></tr>`;
    return;
  }

  list.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 border-b border-slate-100';

    const isDraft = (item.statusHantar === 'Draf');
    const isApproved = (item.statusSemak === 'Disahkan' || item.statusSemak === 'Disemak');

    const statusBadge = isDraft 
      ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">📝 Draf</span>`
      : `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">🚀 Dihantar</span>`;

    const mulaClean  = cleanTimeFormatFrontend(item.masaMula);
    const tamatClean = cleanTimeFormatFrontend(item.masaTamat);
    
    let masaRange = '';
    if (mulaClean && tamatClean) {
      masaRange = `${mulaClean} - ${tamatClean}`;
    } else if (mulaClean) {
      masaRange = mulaClean;
    }

    const masaDisplay = masaRange 
      ? `${masaRange} (${item.kelas || '-'})` 
      : (item.kelas || '-');

    let actionBtn = '';
    if (isApproved) {
      actionBtn = `
        <span class="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[11px] font-bold border border-slate-200 cursor-not-allowed" title="RPH telah disemak & disahkan oleh Pentadbir">🔒 Dikunci</span>
        <button onclick="cetakRphRecord('${item.idRph}')" class="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-bold transition-all shadow-sm ml-1">🖨️ Cetak</button>
      `;
    } else {
      actionBtn = `
        <button onclick="editRphRecord('${item.idRph}')" class="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded text-[11px] font-bold transition-all shadow-sm">Edit/Lanjut</button>
        <button onclick="cetakRphRecord('${item.idRph}')" class="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-bold transition-all shadow-sm ml-1">🖨️ Cetak</button>
      `;
    }

    tr.innerHTML = `
      <td class="py-2.5 px-3 font-bold text-slate-800">${item.hari} - ${item.subjek}</td>
      <td class="py-2.5 px-3">${masaDisplay}</td>
      <td class="py-2.5 px-3">${statusBadge}</td>
      <td class="py-2.5 px-3 text-slate-500">${item.ulasanPenyemak || '-'}</td>
      <td class="py-2.5 px-3 text-right">${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateGuruStats(allList) {
  const noRphCount = allList.filter(i => !i.statusHantar).length;
  const noReflectCount = allList.filter(i => i.statusHantar === 'Draf').length;

  const elNoRph = document.getElementById('countGuruNoRph');
  const elNoReflect = document.getElementById('countGuruNoReflect');

  if (elNoRph) elNoRph.textContent = noRphCount + ' Slot';
  if (elNoReflect) elNoReflect.textContent = noReflectCount + ' Slot';
}

function switchUserRole(role) {
  state.currentUserRole = role;
  const btnGuru = document.getElementById('roleBtnGuru');
  const btnPentadbir = document.getElementById('roleBtnPentadbir');
  const guruView = document.getElementById('guruDashboardView');
  const pentadbirView = document.getElementById('pentadbirDashboardView');
  const navApproval = document.getElementById('navTabApproval');

  if (guruView) guruView.classList.remove('hidden');

  if (role === 'guru') {
    if (btnGuru) btnGuru.className = "px-3 py-1 rounded-lg font-semibold transition-all bg-white text-brand-700 shadow-sm";
    if (btnPentadbir) btnPentadbir.className = "px-3 py-1 rounded-lg font-medium text-white hover:text-teal-200 transition-all";
    if (pentadbirView) pentadbirView.classList.add('hidden');
    if (navApproval && state.currentUser) {
      const jawatan = (state.currentUser.jawatan || state.currentUser.Jawatan || '').toString().trim().toLowerCase();
      const isPentadbirRole = ['guru besar', 'pk pentadbiran', 'penolong kanan pentadbiran', 'pk 1', 'pk hem', 'penolong kanan hem', 'pk ko kurikulum', 'pk kokurikulum', 'penolong kanan kokurikulum'].some(j => jawatan.includes(j));
      if (!isPentadbirRole) navApproval.style.display = 'none';
    }
  } else {
    if (btnPentadbir) btnPentadbir.className = "px-3 py-1 rounded-lg font-semibold transition-all bg-white text-brand-700 shadow-sm";
    if (btnGuru) btnGuru.className = "px-3 py-1 rounded-lg font-medium text-white hover:text-teal-200 transition-all";
    if (pentadbirView) pentadbirView.classList.remove('hidden');
    if (navApproval) navApproval.style.display = 'flex';
    if (typeof loadPentadbirDashboardData === 'function') {
      loadPentadbirDashboardData();
    }
  }
}

function setActiveTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const targetEl = document.getElementById(tabId);
  if (targetEl) targetEl.classList.remove('hidden');

  const tabs = ['tabDashboard', 'tabBuilder', 'tabApproval', 'tabPrint', 'tabWorkflow'];
  tabs.forEach(id => {
    const btnId = 'nav' + id.charAt(0).toUpperCase() + id.slice(1);
    const btn = document.getElementById(btnId);
    if (btn) {
      if (id === tabId) {
        btn.className = "px-4 py-2.5 rounded-t-lg transition-all flex items-center space-x-2 bg-[#f4f7f6] text-brand-700 font-bold";
      } else {
        btn.className = "px-4 py-2.5 rounded-t-lg transition-all flex items-center space-x-2 text-teal-100 hover:text-white hover:bg-white/10";
      }
    }
  });

  if (tabId === 'tabPrint') {
    initPrintFolderExplorer();
  }
}

function cetakRphRecord(idRph) {
  if (!idRph) return;

  const list = window.allGuruRphList || window.currentGuruRphList || state.rphList || [];
  const item = list.find(r => String(r.idRph) === String(idRph));

  if (!item) {
    showToast('Rekod RPH tidak dijumpai.', '⚠️');
    return;
  }

  setActiveTab('tabPrint');
  populatePrintPreview(item);
  
  setTimeout(() => {
    const elTreeItem = document.getElementById(`tree-item-${item.idRph}`);
    if (elTreeItem) {
      document.querySelectorAll('.tree-file-node').forEach(n => n.classList.remove('bg-teal-100', 'font-bold', 'text-brand-800'));
      elTreeItem.classList.add('bg-teal-100', 'font-bold', 'text-brand-800');
    }
  }, 300);

  showToast('RPH dimuatkan ke paparan cetakan!', '🖨️');
}

function initPrintFolderExplorer() {
  const container = document.getElementById('printFolderTreeContainer');
  if (!container) return;

  container.innerHTML = `<div class="p-4 text-xs text-slate-400 italic text-center">Sedang memuatkan direktori RPH...</div>`;

  const emailGuru = window.currentUser ? (window.currentUser.email || window.currentUser.Email || window.currentUser.emel || '') : '';
  
  fetchBackendApi('getErphListGuru', { emailGuru: emailGuru, minggu: '' })
    .then(res => {
      let allList = (res && res.success && Array.isArray(res.data)) ? res.data : [];
      window.allGuruRphList = allList;
      renderPrintFolderTree(allList);
    })
    .catch(err => {
      console.error('Ralat direktori RPH:', err);
      let fallbackList = window.currentGuruRphList || state.rphList || [];
      renderPrintFolderTree(fallbackList);
    });
}

function renderPrintFolderTree(allList) {
  const container = document.getElementById('printFolderTreeContainer');
  if (!container) return;
  container.innerHTML = '';

  const selectWeekGuru = document.getElementById('selectWeekGuru');
  let currentWeekVal = parseInt(selectWeekGuru ? selectWeekGuru.value : '1', 10) || 1;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const takwim = state.takwimList || window.takwimListGlobal || [];
  
  if (takwim && takwim.length > 0) {
    takwim.forEach(t => {
      let dMula = parseTakwimDateHelper(t.tarikhMula);
      let dTamat = parseTakwimDateHelper(t.tarikhTamat);
      if (dMula && dTamat) {
        dMula.setHours(0, 0, 0, 0);
        dTamat.setDate(dTamat.getDate() + 2);
        dTamat.setHours(23, 59, 59, 999);
        if (today >= dMula && today <= dTamat) {
          currentWeekVal = parseInt(t.mingguKe, 10) || currentWeekVal;
        }
      }
    });
  }

  const maxWeekDisplay = currentWeekVal + 1;

  const groupedByWeek = {};
  (allList || []).forEach(item => {
    const m = parseInt(item.minggu, 10) || 1;
    if (m <= maxWeekDisplay) {
      const h = item.hari || 'Isnin';
      if (!groupedByWeek[m]) groupedByWeek[m] = {};
      if (!groupedByWeek[m][h]) groupedByWeek[m][h] = [];
      groupedByWeek[m][h].push(item);
    }
  });

  let weekNumbers = [];
  for (let w = maxWeekDisplay; w >= 1; w--) {
    weekNumbers.push(w);
  }

  if (weekNumbers.length === 0) {
    container.innerHTML = `<div class="p-4 text-xs text-slate-400 italic text-center">Tiada rekod RPH dijumpai.</div>`;
    return;
  }

  weekNumbers.forEach(mVal => {
    const weekDiv = document.createElement('div');
    weekDiv.className = 'space-y-1 mb-2';

    const dayGroup = groupedByWeek[mVal] || {};
    const totalDayKeys = Object.keys(dayGroup).length;
    let totalSlotsInWeek = 0;
    Object.keys(dayGroup).forEach(h => { totalSlotsInWeek += dayGroup[h].length; });

    const isCurrentOrFutureLabel = (mVal === currentWeekVal) ? ' (Semasa)' : (mVal === maxWeekDisplay ? ' (Hadapan)' : '');

    let weekHtml = `
      <div class="font-bold text-xs text-slate-800 bg-slate-100 p-2 rounded-lg flex items-center justify-between cursor-pointer hover:bg-slate-200" onclick="toggleTreeNode('week-${mVal}')">
        <span>📁 Minggu ${mVal}${isCurrentOrFutureLabel}</span>
        <span class="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">${totalSlotsInWeek} Slot</span>
      </div>
      <div id="week-${mVal}" class="pl-3 space-y-1 ${mVal === currentWeekVal ? '' : 'hidden'}">
    `;

    if (totalDayKeys === 0) {
      weekHtml += `<div class="p-2 text-[11px] text-slate-400 italic">Tiada rekod RPH bagi minggu ini.</div>`;
    } else {
      Object.keys(dayGroup).forEach(hVal => {
        const itemsInDay = dayGroup[hVal];
        const tarikhDisplay = itemsInDay[0] ? (itemsInDay[0].tarikh || '') : '';

        weekHtml += `
          <div class="space-y-0.5">
            <div class="font-semibold text-[11px] text-slate-700 p-1.5 rounded flex items-center justify-between cursor-pointer hover:bg-slate-50" onclick="toggleTreeNode('day-${mVal}-${hVal}')">
              <span>📂 ${hVal} ${tarikhDisplay ? '(' + tarikhDisplay + ')' : ''}</span>
              <span class="text-[9px] text-slate-400">${itemsInDay.length} Slot</span>
            </div>
            <div id="day-${mVal}-${hVal}" class="pl-3 space-y-0.5">
        `;

        itemsInDay.forEach(r => {
          const mulaClean  = cleanTimeFormatFrontend(r.masaMula);
          const tamatClean = cleanTimeFormatFrontend(r.masaTamat);
          const masaStr = (mulaClean && tamatClean) ? `${mulaClean}-${tamatClean}` : (r.kelas || '');

          weekHtml += `
            <div id="tree-item-${r.idRph}" onclick="selectRphForPrintFromTree('${r.idRph}')" class="tree-file-node p-1.5 rounded text-xs text-slate-600 cursor-pointer hover:bg-teal-50 hover:text-brand-800 transition-all flex items-center space-x-1.5">
              <span>📝</span>
              <span class="truncate">${r.subjek} - ${r.kelas} (${masaStr})</span>
            </div>
          `;
        });

        weekHtml += `</div></div>`;
      });
    }

    weekHtml += `</div>`;
    weekDiv.innerHTML = weekHtml;
    container.appendChild(weekDiv);
  });

  if (allList && allList.length > 0) {
    populatePrintPreview(allList[0]);
    setTimeout(() => {
      const firstTreeItem = document.getElementById(`tree-item-${allList[0].idRph}`);
      if (firstTreeItem) {
        firstTreeItem.classList.add('bg-teal-100', 'font-bold', 'text-brand-800');
      }
    }, 100);
  }
}

function toggleTreeNode(nodeId) {
  const el = document.getElementById(nodeId);
  if (el) {
    el.classList.toggle('hidden');
  }
}

function selectRphForPrintFromTree(idRph) {
  const list = window.allGuruRphList || window.currentGuruRphList || state.rphList || [];
  const item = list.find(r => String(r.idRph) === String(idRph));

  if (!item) return;

  document.querySelectorAll('.tree-file-node').forEach(n => n.classList.remove('bg-teal-100', 'font-bold', 'text-brand-800'));
  const elTreeItem = document.getElementById(`tree-item-${idRph}`);
  if (elTreeItem) {
    elTreeItem.classList.add('bg-teal-100', 'font-bold', 'text-brand-800');
  }

  populatePrintPreview(item);
}

function populatePrintPreview(item) {
  if (!item) return;

  const name = window.currentUser ? (window.currentUser.nama || window.currentUser.Nama_Guru || window.currentUser.name || 'Guru Akademik') : 'Guru Akademik';
  
  if (document.getElementById('printGuruName')) document.getElementById('printGuruName').innerText = name;
  
  let mulaClean  = cleanTimeFormatFrontend(item.masaMula);
  let tamatClean = cleanTimeFormatFrontend(item.masaTamat);
  let masaStr = (mulaClean && tamatClean) ? `${mulaClean} - ${tamatClean}` : '';
  
  if (document.getElementById('printHariMasa')) {
    document.getElementById('printHariMasa').innerText = `${item.hari || ''} (${masaStr || item.hariMasa || '-'})`;
  }
  
  if (document.getElementById('printSubjek')) document.getElementById('printSubjek').innerText = item.subjek || '-';
  if (document.getElementById('printMinggu')) document.getElementById('printMinggu').innerText = item.minggu || '1';
  if (document.getElementById('printTarikh')) document.getElementById('printTarikh').innerText = item.tarikh || '--/--/----';
  if (document.getElementById('printKelas')) document.getElementById('printKelas').innerText = `${item.kelas || '-'} (${item.kehadiranMurid || '0/0'})`;
  
  if (document.getElementById('printTema')) document.getElementById('printTema').innerText = item.temaUnit || '-';
  if (document.getElementById('printTajuk')) document.getElementById('printTajuk').innerText = item.tajuk || item.tajukBidang || '-';
  if (document.getElementById('printSP')) document.getElementById('printSP').innerText = item.standardPembelajaran || item.sp || '-';
  if (document.getElementById('printOP')) document.getElementById('printOP').innerText = item.objektifPembelajaran || item.op || '-';
  if (document.getElementById('printKK')) document.getElementById('printKK').innerText = item.kriteriaKejayaan || item.kk || '-';
  
  if (document.getElementById('printActStart')) document.getElementById('printActStart').innerText = item.aktivitiPemula || item.actStart || '-';
  if (document.getElementById('printActMain')) document.getElementById('printActMain').innerText = item.aktivitiUtama || item.actMain || '-';
  if (document.getElementById('printActEnd')) document.getElementById('printActEnd').innerText = item.aktivitiPenutup || item.actEnd || '-';
  
  if (document.getElementById('printReflectCount')) {
    let capai = item.refleksiBilCapai || 0;
    let note = item.catatanRefleksi || '';
    document.getElementById('printReflectCount').innerText = `${capai} orang murid mencapai objektif. ${note}`;
  }
  
  if (document.getElementById('printReflectNote')) document.getElementById('printReflectNote').innerText = item.catatanRefleksi || '-';
}

function showToast(message, icon = '🔔') {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');
  if (toastMessage) toastMessage.innerText = message;
  if (toastIcon) toastIcon.innerText = icon;
  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}

window.addEventListener('DOMContentLoaded', () => {
  initUserSession();
});
