/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - AUTH GUARD (TOKEN-BASED & DIRECT-LINK PROTECTED)
 * FAIL: js/auth-guard.js
 * ==============================================================================
 */
(function checkSessionGuard() {
  console.log("🔒 Auth Guard: Memulakan semakan sesi & token pelancaran e-RPH...");

  // 1. Senarai kekunci penyimpanan sesi pengguna
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

  // Jika tiada sesi langsung dalam storage
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

  // 2. Semakan Token Pelancaran Unik dari URL
  const urlParams = new URLSearchParams(window.location.search);
  const launchToken = urlParams.get('launchToken');
  const usrBase64   = urlParams.get('usr');

  // Semak penanda sesi tab aktif e-RPH
  const isErphTabActive = sessionStorage.getItem('ERPH_TAB_SESSION_ACTIVE') === 'true';

  // KES A: Pelancaran baru menggunakan URL ber-token
  if (launchToken && usrBase64) {
    let urlEmail = '';
    try {
      urlEmail = atob(usrBase64).trim().toLowerCase();
    } catch(e) {
      console.error("❌ Auth Guard: Gagal dekod emel dari URL.");
    }

    // A1. Pengesahan Emel Dua Hala (URL vs Storage)
    if (!urlEmail || urlEmail !== userEmail) {
      console.warn("❌ Auth Guard: Emel URL tidak sepadan dengan emel pengguna aktif.");
      alert('Akses Ditolak! Token pelancaran ini tidak terhad atau tidak sepadan dengan akaun anda.');
      window.location.replace('LoginSession.html');
      return;
    }

    // A2. Pengesahan Masa & Ketepatan Token
    const savedTokenDataRaw = sessionStorage.getItem('ERPH_LAUNCH_TOKEN_DATA') || localStorage.getItem('ERPH_LAUNCH_TOKEN_DATA');
    let isTokenValid = false;

    if (savedTokenDataRaw) {
      try {
        const savedTokenData = JSON.parse(savedTokenDataRaw);
        const now = Date.now();
        // Token mesti padan dan berusia tidak lebih daripada 30 saat (30000ms)
        if (savedTokenData.token === launchToken && (now - savedTokenData.timestamp) <= 30000) {
          isTokenValid = true;
        }
      } catch(e) {}
    } else {
      // Fallback: Nyahtafsir timestamp yang tertanam dalam token (format: ERPH_TOK_{timestamp}_{rand})
      const parts = launchToken.split('_');
      if (parts.length >= 3) {
        const tokenTime = parseInt(parts[2], 10);
        if (!isNaN(tokenTime) && (Date.now() - tokenTime) <= 30000) {
          isTokenValid = true;
        }
      }
    }

    if (!isTokenValid) {
      console.warn("❌ Auth Guard: Launch token telah luput atau tidak sah.");
      alert('Akses Ditolak: Token pelancaran telah luput (sah 30 saat sahaja) atau ditaip secara terus. Sila buka melalui Dashboard Utama.');
      window.location.replace('LoginSession.html');
      return;
    }

    // A3. Token Sah! Setkan penanda tab aktif & padamkan token terguna (consumed)
    sessionStorage.setItem('ERPH_TAB_SESSION_ACTIVE', 'true');
    sessionStorage.removeItem('ERPH_LAUNCH_TOKEN_DATA');
    localStorage.removeItem('ERPH_LAUNCH_TOKEN_DATA');

    // Bersihkan URL bar alamat (hapuskan query string ?launchToken=...&usr=...)
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, document.title, cleanUrl);

    console.log(`✅ Auth Guard: Token pelancaran disahkan untuk [${userName}]. URL dibersihkan.`);

  } else if (!isErphTabActive) {
    // KES B: Direct Link Copy-Paste / Tiada Token & Tiada Sesi Tab Aktif
    console.warn("❌ Auth Guard: Akses pautan terus dikesan tanpa token pelancaran sah.");
    alert('Akses Ditolak! Modul e-RPH tidak boleh dibuka melalui pautan terus (direct link). Sila lancarkan dari Dashboard Utama.');
    window.location.replace('LoginSession.html');
    return;
  }

  // 3. Penyelarasan Global Objek Sesi
  window.currentUser = user;
  localStorage.setItem('currentUser', JSON.stringify(user));
  console.log(`✅ Auth Guard: Sesi tab e-RPH aktif bagi [${userName}].`);
})();
