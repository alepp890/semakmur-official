/** SeMAKMUR Digital: shared client for authenticated Apps Script POST requests.
 * Use in every protected page. Requires config.js BEFORE this file.
 * Access token: sessionStorage; rotating refresh token: localStorage.
 * IMPORTANT: On a static cross-origin site, localStorage is JS-readable.
 * Protect against XSS; do not treat this as HttpOnly-cookie security.
 */
(function (global) {
  'use strict';
  const REFRESH_KEY = 'SEMAKMUR_PWA_REFRESH_TOKEN';
  const ACCESS_KEY = 'SEMAKMUR_SESSION_TOKEN';
  const EXP_KEY = 'SEMAKMUR_ACCESS_EXPIRES';
  let pendingRefresh = null;
  let pendingVerify = null;

  function getApiUrl() {
    const url = (typeof WEB_APP_URL !== 'undefined' ? String(WEB_APP_URL || '') : '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\//.test(url))
      throw new Error('Perkhidmatan SeMAKMUR belum tersedia. Sila hubungi pentadbir.');
    return url;
  }
  async function rawPost(payload) {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(payload),
      cache: 'no-store',
      credentials: 'omit'
    });
    if (!response.ok) throw new Error('Sambungan tidak berjaya. Sila cuba lagi.');
    return response.json();
  }
  function storeCredentials(res) {
    if (!res || !res.success || !res.sessionToken || !res.refreshToken)
      throw new Error('Sesi tidak lengkap. Sila log masuk semula.');
    // Persist refresh first; an interrupted page reload can restore session.
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    sessionStorage.setItem(ACCESS_KEY, res.sessionToken);
    sessionStorage.setItem(EXP_KEY, String(res.sessionExpires || 0));
    if (res.user) {
      sessionStorage.setItem('CURRENT_USER', JSON.stringify(res.user));
      localStorage.setItem('SAVED_MOE_USER', JSON.stringify(res.user));
      localStorage.setItem('SEMAKMUR_PERNAH_LOGIN', '1');
    }
    return res.user;
  }
  function clear() {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(EXP_KEY);
    sessionStorage.removeItem('CURRENT_USER');
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('SAVED_MOE_USER');
    localStorage.removeItem('currentUser');
  }
  function refresh() {
    if (pendingRefresh) return pendingRefresh;
    pendingRefresh = (async function () {
      const oldRefresh = localStorage.getItem(REFRESH_KEY);
      if (!oldRefresh) return { success: false, code: 'SESSION_EXPIRED' };
      const res = await rawPost({ action: 'refreshSession', data: { refreshToken: oldRefresh } });
      if (res && res.success && res.refreshToken) {
        storeCredentials(res);
      } else if (res && ['SESSION_EXPIRED','ACCESS_REVOKED'].includes(res.code)) {
        // If another tab rotated while we were sending, retry with its new token.
        const updated = localStorage.getItem(REFRESH_KEY);
        if (updated && updated !== oldRefresh) {
          const retry = await rawPost({ action: 'refreshSession', data: { refreshToken: updated } });
          if (retry.success) { storeCredentials(retry); return retry; }
        }
        clear();
      }
      return res;
    })().finally(() => { pendingRefresh = null; });
    return pendingRefresh;
  }
  async function getAccessToken() {
    const stored = sessionStorage.getItem(ACCESS_KEY);
    const exp = Number(sessionStorage.getItem(EXP_KEY) || 0);
    if (stored && exp > Date.now() + 45000) return stored;
    const res = await refresh();
    if (!res || !res.success) return null;
    return sessionStorage.getItem(ACCESS_KEY);
  }
  async function verify() {
    if (pendingVerify) return pendingVerify;
    pendingVerify = (async () => {
      const token = await getAccessToken();
      if (!token) return { success: false, code: 'SESSION_EXPIRED' };
      let res = await rawPost({ action: 'verifySession', data: { sessionToken: token } });
      // Tab PWA lain mungkin sudah memutar token akses. Cuba pembaharuan dahulu.
      if (res && ['ACCESS_EXPIRED','SESSION_EXPIRED'].includes(res.code)) {
        const renewed = await refresh();
        if (renewed.success)
          res = await rawPost({ action: 'verifySession', data: { sessionToken: renewed.sessionToken } });
      }
      if (res && res.success && res.user) {
        sessionStorage.setItem('CURRENT_USER', JSON.stringify(res.user));
        localStorage.setItem('SAVED_MOE_USER', JSON.stringify(res.user));
      } else if (res && ['SESSION_EXPIRED','ACCESS_REVOKED'].includes(res.code)) {
        clear();
      }
      return res;
    })().finally(() => { pendingVerify = null; });
    return pendingVerify;
  }
  async function request(payload) {
    if (!payload || !payload.action) throw new Error('Permintaan tidak lengkap.');
    let token = await getAccessToken();
    if (!token) return { success: false, code: 'SESSION_EXPIRED', error: 'Sila log masuk semula.' };
    let res = await rawPost(Object.assign({}, payload, { sessionToken: token }));
    if (res && ['ACCESS_EXPIRED','SESSION_EXPIRED'].includes(res.code)) {
      const renewed = await refresh();
      if (!renewed.success) return { success: false, code: 'SESSION_EXPIRED', error: 'Sila log masuk semula.' };
      token = renewed.sessionToken;
      res = await rawPost(Object.assign({}, payload, { sessionToken: token }));
    }
    if (res && ['SESSION_EXPIRED','ACCESS_REVOKED'].includes(res.code)) clear();
    return res;
  }
  async function requireUser(roles, loginPath) {
    const login = loginPath || '/semakmur-official/LoginSession.html';
    const res = await verify();
    const user = res && res.user;
    const accepted = Array.isArray(roles) ? roles : ['guru','admin_choice','murid','parent'];
    const role = user && user.role;
    const hasRole = accepted.includes(role) || (accepted.includes('guru') && role === 'admin_choice');
    if (!res.success || !hasRole) {
      global.location.replace(login);
      return null;
    }
    return user;
  }
  async function logout(loginPath) {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const sessionToken = sessionStorage.getItem(ACCESS_KEY);
    clear(); // logout locally even if offline
    try { await rawPost({ action: 'logoutSession', data: { refreshToken, sessionToken } }); }
    catch (_ignored) {}
    if (loginPath) global.location.replace(loginPath);
  }
  global.SeMAKMURAuth = Object.freeze({
    rawPost, storeCredentials, clear, refresh, getAccessToken,
    verify, request, requireUser, logout
  });
})(window);
