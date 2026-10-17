(function checkSessionGuard() {
  const sessionData = localStorage.getItem('currentUser') || 
                      sessionStorage.getItem('CURRENT_USER') || 
                      localStorage.getItem('SAVED_MOE_USER');

  if (!sessionData) {
    alert('Akses Ditolak! Sila log masuk terlebih dahulu.');
    window.location.replace('LoginSession.html');
    return;
  }

  try {
    const user = JSON.parse(sessionData);
    if (!user || (!user.email && !user.Email && !user.nama && !user.Nama_Guru && !user.name)) {
      throw new Error('Sesi tidak lengkap');
    }
  } catch (e) {
    alert('Sesi anda tidak sah atau telah tamat tempoh. Sila log masuk semula.');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('CURRENT_USER');
    window.location.replace('LoginSession.html');
  }
})();
