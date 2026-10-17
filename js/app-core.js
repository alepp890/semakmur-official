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

function initUserSession() {
  const sessionData = localStorage.getItem('currentUser') || sessionStorage.getItem('CURRENT_USER') || localStorage.getItem('SAVED_MOE_USER');
  if (sessionData) {
    try {
      state.currentUser = JSON.parse(sessionData);

      const sistemAkses = (
        state.currentUser.Sistem_Akses || 
        state.currentUser.sistem_akses || 
        state.currentUser.sistemAkses || 
        state.currentUser.SISTEM_AKSES || 
        ''
      ).toString().trim().toLowerCase();

      const name = state.currentUser.nama || state.currentUser.Nama_Guru || state.currentUser.name || 'Guru Akademik';
      const email = state.currentUser.email || state.currentUser.Email || 'guru@moe-dl.edu.my';
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