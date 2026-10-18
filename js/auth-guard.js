/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - AUTH GUARD (PENAMBAHBAIKAN BEBAS RALAT)
 * FAIL: js/auth-guard.js
 * ==============================================================================
 */
(function checkSessionGuard() {
  console.log("🔒 Auth Guard: Memulakan semakan sesi & token pelancaran e-RPH...");

  // Fungsi selamat untuk memaparkan semula laman web jika disorok
  function unhidePage() {
    const showTarget = () => {
      const mainBody = document.getElementById('mainBody');
      if (mainBody) {
        mainBody.style.display = 'flex';
        mainBody.classList.remove('hidden');
      }
      if (document.body) {
        document.body.style.display = 'block';
        document.body.classList.remove('hidden');
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showTarget);
    } else {
      showTarget();
    }
  }

  // 1. Cari data sesi pengguna daripada LocalStorage / SessionStorage
  const possibleKeys = [
    'currentUser', 'CURRENT_USER', 'SAVED_MOE_USER', 
    'user', 'USER', 'userData', 'userProfile', 'loggedUser'
  ];

  let rawData = null;
  let usedKey = '';

  for (let key of possibleKeys) {
    rawData = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (rawData) {
      usedKey = key;
      break;
    }
  }

  if (!rawData) {
    console.warn("❌ Auth Guard: Tiada sesi pengguna ditemui.");
    alert('Akses Ditolak! Sila log masuk ke Portal terlebih dahulu.');
    window.location.replace('LoginSession.html');
    return;
  }

  let user = null;
  try {
    user = JSON.parse(rawData);
  } catch (e) {
    console.error("❌ Auth Guard: Format data sesi tidak sah.");
    alert('Sesi anda tidak sah. Sila log masuk semula.');
    window.location.replace('LoginSession.html');
    return;
  }

  const userEmail = (user.email || user.Email || user.emel || user.Emel || user.username || '').toString().trim().toLowerCase();
  const userName  = user.nama || user.Nama_Guru || user.name || user.Nama || user.Name || 'Guru';

  if (!userEmail) {
    console.warn("❌ Auth Guard: Emel pengguna tidak ditemui.");
    alert('Akses Ditolak: Emel pengguna tidak sah.');
    window.location.replace('LoginSession.html');
    return;
  }

  // 2. Semak Parameter URL (launchToken & usr / email)
  const urlParams = new URLSearchParams(window.location.search);
  const launchToken = urlParams.get('launchToken');
  const usrParam    = urlParams.get('usr') || urlParams.get('email');

  const isErphTabActive = sessionStorage.getItem('ERPH_TAB_SESSION_ACTIVE') === 'true';

  // KES A: Pelancaran baharu menggunakan URL ber-token
  if (launchToken) {
    let urlEmail = '';
    if (usrParam) {
      try {
        // Nyahtafsir URL parameter secara selamat (Sokong Plain / Encoded / Base64)
        let decoded = decodeURIComponent(usrParam).trim();
        if (decoded.includes('@')) {
          urlEmail = decoded.toLowerCase();
        } else {
          // Cubaan Base64 jika bukan emel terus
          let b64 = decoded.replace(/-/g, '+').replace(/_/g, '/');
          while (b64.length % 4) { b64 += '='; }
          urlEmail = decodeURIComponent(atob(b64)).trim().toLowerCase();
        }
      } catch(e) {
        console.warn("⚠️ Auth Guard: Penyahkodan emel fallback ke carian langsung.");
        urlEmail = usrParam.trim().toLowerCase();
      }
    }

    // A1. Pengesahan Emel Dua Hala (URL vs Storage)
    if (urlEmail && urlEmail !== userEmail) {
      console.warn(`❌ Auth Guard: Emel URL [${urlEmail}] tidak sepadan dengan emel akaun [${userEmail}].`);
      alert('Akses Ditolak! Token pelancaran ini tidak sepadan dengan akaun anda.');
      window.location.replace('LoginSession.html');
      return;
    }

    // A2. Pengesahan Masa Token (30 Saat)
    let isTokenValid = false;
    const savedTokenDataRaw = localStorage.getItem('ERPH_LAUNCH_TOKEN_DATA') || sessionStorage.getItem('ERPH_LAUNCH_TOKEN_DATA');

    if (savedTokenDataRaw) {
      try {
        const savedTokenData = JSON.parse(savedTokenDataRaw);
        const now = Date.now();
        if (savedTokenData.token === launchToken && (now - savedTokenData.timestamp) <= 30000) {
          isTokenValid = true;
        }
      } catch(e) {}
    }

    // Fallback semakan timestamp terpasang pada string token (Format: ERPH_TOK_{timestamp}_{rand})
    if (!isTokenValid && launchToken.startsWith('ERPH_TOK_')) {
      const parts = launchToken.split('_');
      if (parts.length >= 3) {
        const tokenTime = parseInt(parts[2], 10);
        if (!isNaN(tokenTime) && (Date.now() - tokenTime) <= 30000) {
          isTokenValid = true;
        }
      }
    }

    if (!isTokenValid) {
      console.warn("❌ Auth Guard: Token pelancaran telah luput atau tidak sah.");
      alert('Akses Ditolak: Token pelancaran telah luput (sah 30 saat) atau ditaip secara terus. Sila buka melalui Dashboard Utama.');
      window.location.replace('LoginSession.html');
      return;
    }

    // A3. Token Sah! Aktifkan sesi tab & bersihkan token terguna
    sessionStorage.setItem('ERPH_TAB_SESSION_ACTIVE', 'true');
    localStorage.removeItem('ERPH_LAUNCH_TOKEN_DATA');
    sessionStorage.removeItem('ERPH_LAUNCH_TOKEN_DATA');

    // Bersihkan URL bar alamat secara selamat
    try {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, document.title, cleanUrl);
    } catch(e) {}

    console.log(`✅ Auth Guard: Token pelancaran disahkan untuk [${userName}]. URL dibersihkan.`);

  } else if (!isErphTabActive) {
    // KES B: Direct Link Copy-Paste / Tiada Token & Tiada Sesi Tab Aktif
    console.warn("❌ Auth Guard: Akses pautan terus dikesan tanpa token pelancaran sah.");
    alert('Akses Ditolak! Modul e-RPH tidak boleh dibuka melalui pautan terus (direct link). Sila lancarkan dari Dashboard Utama.');
    window.location.replace('LoginSession.html');
    return;
  }

  // 3. Penyelarasan Global Objek Sesi & Paparkan Laman
  window.currentUser = user;
  localStorage.setItem('currentUser', JSON.stringify(user));

  // Buka paparan elemen body / mainBody serta-merta
  unhidePage();

  console.log(`✅ Auth Guard: Sesi tab e-RPH aktif bagi [${userName}].`);
})();
