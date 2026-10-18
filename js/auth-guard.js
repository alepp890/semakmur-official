/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - AUTH GUARD (TOKEN KEKAL DALAM URL)
 * FAIL: js/auth-guard.js
 * ==============================================================================
 */
(function checkSessionGuard() {
  console.log("🔒 Auth Guard: Memulakan semakan sesi & token pelancaran e-RPH...");

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

  const urlParams = new URLSearchParams(window.location.search);
  const launchToken = urlParams.get('launchToken');
  const usrParam    = urlParams.get('usr') || urlParams.get('email');

  const isErphTabActive = sessionStorage.getItem('ERPH_TAB_SESSION_ACTIVE') === 'true';

  if (launchToken) {
    let urlEmail = '';
    if (usrParam) {
      try {
        let decoded = decodeURIComponent(usrParam).trim();
        if (decoded.includes('@')) {
          urlEmail = decoded.toLowerCase();
        } else {
          let b64 = decoded.replace(/-/g, '+').replace(/_/g, '/');
          while (b64.length % 4) { b64 += '='; }
          urlEmail = decodeURIComponent(atob(b64)).trim().toLowerCase();
        }
      } catch(e) {
        urlEmail = usrParam.trim().toLowerCase();
      }
    }

    if (urlEmail && urlEmail !== userEmail) {
      console.warn(`❌ Auth Guard: Emel URL [${urlEmail}] tidak sepadan dengan emel akaun [${userEmail}].`);
      alert('Akses Ditolak! Token pelancaran ini tidak sepadan dengan akaun anda.');
      window.location.replace('LoginSession.html');
      return;
    }

    sessionStorage.setItem('ERPH_TAB_SESSION_ACTIVE', 'true');

    // TOKEN DIKEKALKAN PADA BAR ALAMAT URL (Komenkan replaceState)
    // const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    // window.history.replaceState({ path: cleanUrl }, document.title, cleanUrl);

    console.log(`✅ Auth Guard: Token pelancaran disahkan untuk [${userName}]. Token kekal pada URL.`);

  } else if (!isErphTabActive) {
    console.warn("❌ Auth Guard: Akses pautan terus dikesan tanpa token pelancaran sah.");
    alert('Akses Ditolak! Modul e-RPH tidak boleh dibuka melalui pautan terus (direct link). Sila lancarkan dari Dashboard Utama.');
    window.location.replace('LoginSession.html');
    return;
  }

  window.currentUser = user;
  localStorage.setItem('currentUser', JSON.stringify(user));

  unhidePage();
  console.log(`✅ Auth Guard: Sesi tab e-RPH aktif bagi [${userName}].`);
})();
