/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - AUTH GUARD (KALIS-RALAT & AUTONOMOUS)
 * FAIL: js/auth-guard.js
 * ==============================================================================
 */
(function checkSessionGuard() {
  console.log("🔒 Auth Guard: Memulakan semakan sesi pengguna...");

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

  // 4. Pengesahan Struktur Data Sesi
  try {
    const user = JSON.parse(rawData);
    
    // Semak sebarang carian kunci emel, nama atau peranan pengguna
    const hasEmail = user.email || user.Email || user.emel || user.Emel || user.username;
    const hasName  = user.nama || user.Nama_Guru || user.name || user.Nama || user.Name;

    if (!user || (!hasEmail && !hasName)) {
      throw new Error('Data objek user wujud tetapi medan Email/Nama kosong.');
    }

    // 5. Penyelarasan Global Objek & Salin ke LocalStorage supaya tab baharu tak putus sesi
    window.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));

    console.log(`✅ Auth Guard: Sesi SAH untuk [${hasName || hasEmail}] berasaskan kekunci '${usedKey}'.`);

  } catch (e) {
    console.error("❌ Auth Guard Error:", e.message);
    alert('Sesi anda tidak sah atau telah tamat tempoh. Sila log masuk semula.');
    
    // Bersihkan sesi yang rosak sahaja
    if (usedKey) {
      localStorage.removeItem(usedKey);
      sessionStorage.removeItem(usedKey);
    }
    window.location.replace('LoginSession.html');
  }
})();
