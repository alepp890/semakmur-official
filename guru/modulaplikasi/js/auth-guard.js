/** Official session guard for the e-RPH module. No UI role is trusted. */
(function () {
  'use strict';
  async function boot() {
    try {
      const user = await SeMAKMURAuth.requireUser(['guru','admin_choice'], '../../LoginSession.html');
      if (!user) return;
      window.currentUser = user;
      sessionStorage.setItem('CURRENT_USER', JSON.stringify(user));
      localStorage.setItem('currentUser', JSON.stringify(user)); // UI compatibility only
      const main = document.getElementById('mainBody');
      if (main) { main.style.display = 'flex'; main.classList.remove('hidden'); }
    } catch (_e) {
      window.location.replace('../../LoginSession.html');
    }
  }
  window.addEventListener('DOMContentLoaded', boot);
})();
