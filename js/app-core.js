/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - FRONTEND CORE MODULE
 * FAIL: js/app-core.js (Penambahan Format Masa Clean & Logik Dashboard Utama)
 * ==============================================================================
 */

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
  'RBT': 'Reka Bentuk dan Teknologi',
  'PJ': 'Pendidikan Jasmani',
  'PK': 'Pendidikan Kesihatan'
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
  activeModalRphId: null,
  currentStarRating: 5
};

/**
 * FUNGSI UTAMA PENGHUBUNG BACKEND API
 */
async function fetchBackendApi(action, payloadData = {}) {
  const targetUrl = (typeof WEB_APP_URL !== 'undefined' && WEB_APP_URL)
    ? WEB_APP_URL
    : 'https://script.google.com/macros/s/AKfycbzjOd3r_56-OkWFiYEyTWhyYdoEbA6MXi5fgfIMDIRHRDVe3hzNHxjYUuitWSX_04hL/exec';

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

/**
 * PEMBANTU FORMAT MASA FRONTEND (PEMBERSIHAN ISO 1899)
 */
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

/**
 * INISIALISASI SESI PENGGUNA
 */
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
      const jawatan = state.currentUser.jawatan || state.currentUser.Jawatan || 'Guru Akademik';

      const userNameEl = document.getElementById('userName');
      if (userNameEl) userNameEl.innerText = name;

      const userRoleTitleEl = document.getElementById('userRoleTitle');
      if (userRoleTitleEl) userRoleTitleEl.innerText = `${jawatan} | ${email}`;
      
      if (document.getElementById('printGuruName')) {
        document.getElementById('printGuruName').innerText = name;
      }

      const roleToggleContainer = document.getElementById('roleToggleContainer');
      if (roleToggleContainer) {
        if (sistemAkses === 'admin') {
          roleToggleContainer.style.display = 'flex';
        } else {
          roleToggleContainer.style.display = 'none';
        }
      }

      const pentadbirJawatanList = ['Guru Besar', 'PK Pentadbiran', 'PK HEM', 'PK Ko Kurikulum', 'PK Kokurikulum'];
      const isPentadbirRole = pentadbirJawatanList.some(j => j.toLowerCase() === jawatan.toString().trim().toLowerCase());

      if (isPentadbirRole) {
        switchUserRole('pentadbir');
      } else {
        switchUserRole('guru');
      }

      const mainBody = document.getElementById('mainBody');
      if (mainBody) mainBody.style.display = 'flex';

      fetchJadualHariIni(email);
    } catch (e) {
      console.error("Ralat membaca sesi pengguna:", e);
      window.location.replace('LoginSession.html');
    }
  } else {
    window.location.replace('LoginSession.html');
  }

  populateWeeksDropdowns();
}

/**
 * POPULASI DROPDOWN MINGGU & AMBIL DATA RPH DASHBOARD
 */
function populateWeeksDropdowns() {
  const selectGuru = document.getElementById('selectWeekGuru');
  if (selectGuru) {
    selectGuru.innerHTML = '';
    for (let i = 1; i <= 42; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = 'Minggu ' + i;
      if (i === 36) opt.selected = true;
      selectGuru.appendChild(opt);
    }
  }
  
  const lbl = document.getElementById('lblMingguHariDashboard');
  if (lbl) lbl.textContent = 'Minggu 36 (Hari Ini)';

  loadGuruDashboardData();
}

function changeWeekGuru() {
  loadGuruDashboardData();
}

function filterGuruTableByDay() {
  loadGuruDashboardData();
}

/**
 * TARIK JADUAL WAKTU HARI INI
 */
function fetchJadualHariIni(emailGuru) {
  const container = document.getElementById('jadualWidgetContainer');
  if (!container) return;

  const days = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  const todayName = days[new Date().getDay()];

  fetchBackendApi('getJadualGuruByHari', { emailGuru: emailGuru, hari: todayName })
    .then(res => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        container.innerHTML = '';
        res.data.forEach(slot => {
          const masaMulaDisplay = cleanTimeFormatFrontend(slot.masaMula);
          const masaTamatDisplay = cleanTimeFormatFrontend(slot.masaTamat);
          const masaRange = (masaMulaDisplay && masaTamatDisplay) ? `${masaMulaDisplay} - ${masaTamatDisplay}` : 'Masa Jadual';

          const div = document.createElement('div');
          div.className = 'p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1';
          div.innerHTML = `
            <div class="flex justify-between items-center text-xs font-bold text-slate-800">
              <span>${slot.subjek} (${slot.kelas || 'Tiada Kelas'})</span>
              <span class="text-brand-600">${masaRange}</span>
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

/**
 * MUAT DATA DASHBOARD RPH GURU
 */
function loadGuruDashboardData() {
  const emailGuru = window.currentUser ? (window.currentUser.email || window.currentUser.Email || window.currentUser.emel || '') : '';
  const selectWeek = document.getElementById('selectWeekGuru');
  const minggu = selectWeek ? selectWeek.value : '36';
  const filterDay = document.getElementById('filterDayGuru') ? document.getElementById('filterDayGuru').value : 'ALL';

  const tbody = document.getElementById('guruRphTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400 italic">Sedang menarik rekod e-RPH...</td></tr>`;

  fetchBackendApi('getErphListGuru', { emailGuru: emailGuru, minggu: minggu })
    .then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        let list = res.data;
        if (filterDay && filterDay !== 'ALL') {
          list = list.filter(item => String(item.hari).toLowerCase() === filterDay.toLowerCase());
        }
        renderGuruRphTable(list);
        updateGuruStats(res.data);
      } else {
        renderGuruRphTable([]);
        updateGuruStats([]);
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
    const statusBadge = isDraft 
      ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">📝 Draf</span>`
      : `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">🚀 Dihantar</span>`;

    const masaMulaClean = cleanTimeFormatFrontend(item.masaMula);
    const masaDisplay = masaMulaClean ? `${masaMulaClean} (${item.kelas || '-'})` : (item.kelas || '-');

    tr.innerHTML = `
      <td class="py-2.5 px-3 font-bold text-slate-800">${item.hari} - ${item.subjek}</td>
      <td class="py-2.5 px-3">${masaDisplay}</td>
      <td class="py-2.5 px-3">${statusBadge}</td>
      <td class="py-2.5 px-3 text-slate-500">${item.ulasanPenyemak || '-'}</td>
      <td class="py-2.5 px-3 text-right">
        <button onclick="setActiveTab('tabBuilder')" class="px-2.5 py-1 bg-brand-600 text-white rounded text-[11px] font-bold">Edit/Lanjut</button>
      </td>
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

  if (role === 'guru') {
    if (btnGuru) btnGuru.className = "px-3 py-1 rounded-lg font-semibold transition-all bg-white text-brand-700 shadow-sm";
    if (btnPentadbir) btnPentadbir.className = "px-3 py-1 rounded-lg font-medium text-white hover:text-teal-200 transition-all";
    if (guruView) guruView.classList.remove('hidden');
    if (pentadbirView) pentadbirView.classList.add('hidden');
  } else {
    if (btnPentadbir) btnPentadbir.className = "px-3 py-1 rounded-lg font-semibold transition-all bg-white text-brand-700 shadow-sm";
    if (btnGuru) btnGuru.className = "px-3 py-1 rounded-lg font-medium text-white hover:text-teal-200 transition-all";
    if (pentadbirView) pentadbirView.classList.remove('hidden');
    if (guruView) guruView.classList.add('hidden');
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
