/** SeMAKMUR e-RPH — semakan sesi rasmi (bukan launchToken URL).
 * Memastikan akses disahkan oleh backend SEBELUM e-RPH dimulakan.
 * Fail ini perlu diletak pada guru/modulaplikasi/js/auth-guard.js.
 */
(function () {
  'use strict';
  const LOGIN_URL = '../../LoginSession.html';
  function inlineError() {
    // Tiada popup. Beri mesej sopan yang tidak mendedahkan maklumat teknikal.
    const show = () => {
      document.getElementById('erph-opening-screen')?.remove();
      if (document.getElementById('erph-access-unavailable')) return;
      const box = document.createElement('section');
      box.id = 'erph-access-unavailable';
      box.setAttribute('role', 'alert');
      box.style.cssText = 'max-width:420px;margin:12vh auto;padding:26px;border:1px solid #dbe5f0;border-radius:15px;background:#fff;color:#263450;font:500 14px/1.8 system-ui;box-shadow:0 12px 32px rgba(19,40,72,.08)';
      const title = document.createElement('h2');
      title.textContent = 'Pengesahan akses tidak dapat diselesaikan';
      title.style.cssText = 'font-size:19px;line-height:1.4;margin:0 0 10px;color:#1a2851';
      const p = document.createElement('p');
      p.textContent = 'Sila semak sambungan internet dan cuba buka semula e-RPH melalui Dashboard Guru.';
      p.style.margin = '0';
      box.append(title,p);
      document.body.appendChild(box);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, {once:true});
    else show();
  }
  window.SEMAKMUR_ERPH_AUTH_READY = new Promise(resolve => {
    let started = false;
    async function verify() {
      if (started) return;
      started = true;
      try {
        if (!window.SeMAKMURAuth || typeof window.SeMAKMURAuth.requireUser !== 'function') {
          inlineError(); resolve(null); return;
        }
        // Sesi baharu pada tab baharu dipulihkan melalui refresh token yang disimpan secara berpusat.
        const user = await window.SeMAKMURAuth.requireUser(['guru','admin_choice'], LOGIN_URL);
        if (!user) { resolve(null); return; }
        // Untuk paparan e-RPH lama sahaja; backend tidak mempercayai cache ini.
        sessionStorage.setItem('CURRENT_USER', JSON.stringify(user));
        localStorage.setItem('currentUser', JSON.stringify(user));
        window.currentUser = user;
        const main = document.getElementById('mainBody');
        if (main) { main.style.display = 'flex'; main.classList.remove('hidden'); }
        document.getElementById('erph-opening-screen')?.remove();
        resolve(user);
      } catch (error) {
        // Jangan dedahkan ralat backend atau sebarang token kepada pengguna.
        console.error('e-RPH: pengesahan gagal.');
        inlineError(); resolve(null);
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', verify, {once:true});
    else verify();
  });
})();
