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
  // Memory only: trusted after an authenticated Dashboard API response. Never persisted.
  let trustedDashboard = null;

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
    trustedDashboard = null;
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(EXP_KEY);
    sessionStorage.removeItem('CURRENT_USER');
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('SAVED_MOE_USER');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('SEMAKMUR_LAST_WORKSPACE_V2');
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
  /**
   * Dashboard calls this only AFTER getGuruDashboardData succeeded with the
   * access token. This allows its same-origin embedded modules to reuse the
   * already-confirmed identity without a separate verifySession HTTP request.
   * Token & role are still verified on EVERY protected backend API action.
   */
  function acceptDashboardSession(user, backendEmail) {
    const verifiedEmail = String(backendEmail || '').trim().toLowerCase();
    const claimedEmail = String(user && user.email || '').trim().toLowerCase();
    const token = sessionStorage.getItem(ACCESS_KEY);
    const expires = Number(sessionStorage.getItem(EXP_KEY) || 0);
    if (!verifiedEmail || verifiedEmail !== claimedEmail || !token || expires <= Date.now() + 5000) {
      trustedDashboard = null;
      return false;
    }
    trustedDashboard = {token, expires, user: Object.freeze(Object.assign({}, user, {email: verifiedEmail}))};
    return true;
  }

  function getDashboardTrustedUser() {
    const context = trustedDashboard;
    if (!context || !sessionStorage.getItem(ACCESS_KEY) ||
        sessionStorage.getItem(ACCESS_KEY) !== context.token ||
        Number(sessionStorage.getItem(EXP_KEY) || 0) <= Date.now() + 5000) return null;
    return Object.assign({}, context.user);
  }

  function getEmbeddedDashboardUser() {
    try {
      // A standalone tab must still verify its own session on the server.
      if (global.parent === global) return null;
      const host = global.parent;
      if (host.location.origin !== global.location.origin) return null;
      // Only these two actual workspace iframes may inherit the Dashboard login.
      const frames = ['erph-workspace-frame', 'kehadiran-workspace-frame'];
      const isWorkspace = frames.some(id => host.document.getElementById(id)?.contentWindow === global);
      if (!isWorkspace) return null;
      const hostAuth = host.SeMAKMURAuth;
      if (!hostAuth || typeof hostAuth.getDashboardTrustedUser !== 'function') return null;
      return hostAuth.getDashboardTrustedUser();
    } catch (_e) {
      return null;
    }
  }

  async function requireUser(roles, loginPath) {
    const login = loginPath || '/semakmur-official/LoginSession.html';
    const parentUser = getEmbeddedDashboardUser();
    // Avoid verifySession for embedded workspaces when Dashboard is already confirmed.
    // If the parent trust has expired/rotated, use the original server check.
    const res = parentUser ? {success: true, user: parentUser} : await verify();
    const user = res && res.user;
    const accepted = Array.isArray(roles) ? roles : ['guru','admin_choice','murid','parent'];
    const role = user && user.role;
    const hasRole = accepted.includes(role) ||
      (accepted.includes('guru') && (role === 'admin_choice' || (role === 'admin' && user?.is_admin === true))) ||
      (accepted.includes('admin_choice') && user?.is_admin === true);
    if (!res.success || !hasRole) {
      // A denied UI check is not an authorization grant: protected API actions
      // independently verify the session and official permissions on server.
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
    verify, request, requireUser, logout,
    acceptDashboardSession, getDashboardTrustedUser
  });
})(window);
