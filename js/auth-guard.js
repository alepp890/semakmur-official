/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - AUTH GUARD (TOKEN-BASED & DIRECT-LINK PROTECTED)
 * FAIL: js/auth-guard.js
 * ==============================================================================
 */
(function checkSessionGuard() {
  console.log("🔒 Auth Guard: Memulakan semakan sesi pengguna...");

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

  // 1. Senarai semua kemungkinan nama kekunci penyimpanan sesi
  const possibleKeys = [
    'currentUser', 'CURRENT_USER', 'SAVED_MOE_USER', 
    'user', 'USER', 'userData', 'userProfile', 'loggedUser'
  ];

  let rawData = null;
  let usedKey = '';

  // 2. Imbas LocalStorage dan SessionStorage
  for (let key of possibleKeys) {
    rawData = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (rawData) {
      usedKey = key;
      break;
    }
  }

  // 3. Jika langsung tiada data sesi ditemui
  if (!rawData) {
    console.warn("❌ Auth Guard: Tiada sesi ditemui dalam LocalStorage / SessionStorage.");
    alert('Akses Ditolak! Sila log masuk terlebih dahulu.');
    window.location.replace('LoginSession.html');
    return;
  }

  // 4. Pengesahan Struktur Data Sesi & Semakan Token URL
  try {
    const user = JSON.parse(rawData);
    
    // Semak sebarang carian kunci emel, nama atau peranan pengguna
    const userEmail = (user.email || user.Email || user.emel || user.Emel || user.username || '').toString().trim().toLowerCase();
    const userName  = user.nama || user.Nama_Guru || user.name || user.Nama || user.Name;

    if (!user || (!userEmail && !userName)) {
      throw new Error('Data objek user wujud tetapi medan Email/Nama kosong.');
    }

    // 5. Semakan Parameter Token Pelancaran (URL)
    const urlParams   = new URLSearchParams(window.location.search);
    const launchToken = urlParams.get('launchToken');
    const usrParam    = urlParams.get('usr') || urlParams.get('email');
    const isErphTabActive = sessionStorage.getItem('ERPH_TAB_SESSION_ACTIVE') === 'true';

    // KES A: Pelancaran baharu dari Dashboard
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

      // Pengesahan Emel Dua Hala (URL vs Sesi Storage)
      if (urlEmail && urlEmail !== userEmail) {
        console.warn(`❌ Auth Guard: Emel URL [${urlEmail}] tidak sepadan dengan emel akaun [${userEmail}].`);
        alert('Akses Ditolak! Token pelancaran ini tidak sepadan dengan akaun anda.');
        window.location.replace('LoginSession.html');
        return;
      }

      // Token Sah! Tandakan sesi tab e-RPH aktif (Token kekal dipaparkan pada URL)
      sessionStorage.setItem('ERPH_TAB_SESSION_ACTIVE', 'true');
      console.log(`✅ Auth Guard: Launch Token disahkan bagi [${userName || userEmail}].`);

    } else if (!isErphTabActive) {
      // KES B: Direct Link Copy-Paste / Tanpa Token
      console.warn("❌ Auth Guard: Akses pautan terus dikesan tanpa token pelancaran sah.");
      alert('Akses Ditolak! Modul e-RPH tidak boleh dibuka melalui pautan terus (direct link). Sila lancarkan dari Dashboard Utama.');
      window.location.replace('LoginSession.html');
      return;
    }

    // 6. Penyelarasan Global Objek & Buka Paparan
    window.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    unhidePage();

    console.log(`✅ Auth Guard: Sesi SAH untuk [${userName || userEmail}] berasaskan kekunci '${usedKey}'.`);

  } catch (e) {
    console.error("❌ Auth Guard Error:", e.message);
    alert('Sesi anda tidak sah atau telah tamat tempoh. Sila log masuk semula.');
    
    if (usedKey) {
      localStorage.removeItem(usedKey);
      sessionStorage.removeItem(usedKey);
    }
    window.location.replace('LoginSession.html');
  }
})();
