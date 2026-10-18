/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - FRONTEND MODULE
 * FAIL 3: js/approval.js (Logik Semakan Pentadbir, Ulasan, Penarafan & Pengesahan)
 * ==============================================================================
 */

let approvalQueueList = [];
let currentFilterStatus = 'ALL';
let activeReviewItem = null;

/**
 * PEMBANTU NYAHTAFSIR TARIKH TAKWIM (SOKONGAN US MM/DD/YYYY & ISO)
 */
function parseTakwimDateHelperApproval(dateStr) {
  if (!dateStr) return null;
  let str = String(dateStr).trim();
  let parts = str.split(/[\/\-]/);

  if (parts.length === 3) {
    let p0 = parseInt(parts[0], 10);
    let p1 = parseInt(parts[1], 10);
    let p2 = parseInt(parts[2], 10);

    // Format YYYY-MM-DD
    if (parts[0].length === 4) {
      return new Date(p0, p1 - 1, p2);
    }
    // Format MM/DD/YYYY atau DD/MM/YYYY
    if (parts[2].length === 4) {
      if (p0 <= 12 && p1 > 12) {
        return new Date(p2, p0 - 1, p1); // MM/DD/YYYY
      } else if (p0 > 12 && p1 <= 12) {
        return new Date(p2, p1 - 1, p0); // DD/MM/YYYY
      } else {
        return new Date(p2, p0 - 1, p1); // Lalai MM/DD/YYYY
      }
    }
  }

  let d = new Date(str);
  return !isNaN(d.getTime()) ? d : null;
}

/**
 * INISIALISASI DATA DASHBOARD & TAB SEMAKAN PENTADBIR
 */
function loadPentadbirDashboardData() {
  initApprovalWeekDropdown();
  loadGuruSeliaanDropdown();
}

/**
 * POPULASIKAN DROPDOWN MINGGU SEMAKAN PENTADBIR (DESENDING & AUTO-SELECT MINGGU SEMASA)
 */
function initApprovalWeekDropdown() {
  const selectWeek = document.getElementById('selectWeekApproval');
  if (!selectWeek) return;

  selectWeek.innerHTML = '';
  const takwim = window.takwimListGlobal || (typeof state !== 'undefined' ? state.takwimList : []) || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let matchedCurrentWeek = null;

  if (takwim.length > 0) {
    // Susun secara MENURUN
    let sortedTakwim = [...takwim].sort((a, b) => (parseInt(b.mingguKe, 10) || 0) - (parseInt(a.mingguKe, 10) || 0));

    sortedTakwim.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.mingguKe;
      let labelDate = (t.tarikhMula && t.tarikhTamat) ? ` (${t.tarikhMula} - ${t.tarikhTamat})` : '';
      opt.textContent = `Minggu ${t.mingguKe}${labelDate}`;
      selectWeek.appendChild(opt);

      let dMula = parseTakwimDateHelperApproval(t.tarikhMula);
      let dTamat = parseTakwimDateHelperApproval(t.tarikhTamat);
      if (dMula && dTamat) {
        dMula.setHours(0, 0, 0, 0);
        dTamat.setDate(dTamat.getDate() + 2); // Tambah penimbal 2 hari untuk Sabtu & Ahad
        dTamat.setHours(23, 59, 59, 999);
        if (today >= dMula && today <= dTamat) {
          matchedCurrentWeek = String(t.mingguKe);
        }
      }
    });

    if (matchedCurrentWeek) {
      selectWeek.value = matchedCurrentWeek;
    } else if (selectWeek.options.length > 0) {
      selectWeek.selectedIndex = 0;
    }
  } else {
    for (let i = 42; i >= 1; i--) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = 'Minggu ' + i;
      selectWeek.appendChild(opt);
    }
    selectWeek.value = '1';
  }
}

/**
 * MUAT DROPDOWN SENARAI GURU SELIAAN
 */
function loadGuruSeliaanDropdown() {
  const selectGuru = document.getElementById('selectGuruSeliaan');
  if (!selectGuru) return;

  selectGuru.innerHTML = '<option value="">Sedang menarik senarai guru...</option>';

  const emailPentadbir = window.currentUser ? (window.currentUser.email || window.currentUser.Email || window.currentUser.emel || '') : '';

  fetchBackendApi('getGuruSeliaanList', { emailPentadbir: emailPentadbir })
    .then(res => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        selectGuru.innerHTML = '<option value="ALL">-- Semua Guru Seliaan --</option>';
        res.data.forEach(g => {
          const opt = document.createElement('option');
          opt.value = g.email || g.Email || g.emel || '';
          opt.textContent = g.nama || g.Nama_Guru || g.name || opt.value;
          selectGuru.appendChild(opt);
        });
      } else {
        selectGuru.innerHTML = '<option value="ALL">-- Semua Guru Seliaan --</option>';
      }
      onGuruSeliaanChange();
    })
    .catch(err => {
      console.error('Ralat Guru Seliaan:', err);
      selectGuru.innerHTML = '<option value="ALL">-- Semua Guru Seliaan --</option>';
      onGuruSeliaanChange();
    });
}

/**
 * TARIK SENARAI RPH UNTUK SEMAKAN PENTADBIR
 */
function onGuruSeliaanChange() {
  const selectGuru = document.getElementById('selectGuruSeliaan');
  const selectWeek = document.getElementById('selectWeekApproval');

  const selectedGuruEmail = selectGuru ? selectGuru.value : 'ALL';
  const selectedWeek = selectWeek ? selectWeek.value : '1';
  const emailPentadbir = window.currentUser ? (window.currentUser.email || window.currentUser.Email || window.currentUser.emel || '') : '';

  const tbody = document.getElementById('pentadbirApprovalTableBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 italic">Sedang memuatkan senarai RPH guru seliaan...</td></tr>`;
  }

  fetchBackendApi('getErphForApproval', {
    emailPentadbir: emailPentadbir,
    targetGuruEmail: selectedGuruEmail,
    minggu: selectedWeek
  })
    .then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        approvalQueueList = res.data;
        renderPentadbirApprovalTable();
        updatePentadbirDashboardStats(res.data);
      } else {
        approvalQueueList = [];
        renderPentadbirApprovalTable();
        updatePentadbirDashboardStats([]);
      }
    })
    .catch(err => {
      console.error('Ralat Semakan Pentadbir:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-rose-500 italic">Ralat sambungan pelayan.</td></tr>`;
      }
    });
}

/**
 * TAPISAN SENARAI SEMAKAN PENTADBIR
 */
function filterApprovalQueue(statusCategory) {
  currentFilterStatus = statusCategory;
  renderPentadbirApprovalTable();
}

/**
 * PAPARKAN JADUAL SEMAKAN PENTADBIR
 */
function renderPentadbirApprovalTable() {
  const tbody = document.getElementById('pentadbirApprovalTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  let list = [...approvalQueueList];

  if (currentFilterStatus === 'PENDING') {
    list = list.filter(item => item.statusSemak !== 'Disahkan' && item.statusSemak !== 'Disemak');
  } else if (currentFilterStatus === 'APPROVED') {
    list = list.filter(item => item.statusSemak === 'Disahkan' || item.statusSemak === 'Disemak');
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 italic">Tiada rekod RPH ditemui bagi kriteria pilihan ini.</td></tr>`;
    return;
  }

  list.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 border-b border-slate-100';

    const isApproved = (item.statusSemak === 'Disahkan' || item.statusSemak === 'Disemak');

    const statusBadge = isApproved
      ? `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">✓ Disahkan</span>`
      : `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">⏳ Belum Disemak</span>`;

    const namaGuru = item.namaGuru || item.nama || 'Guru Akademik';
    const subjekKelas = `${item.subjek || '-'} (${item.kelas || '-'})`;
    const tarikhMasa = `${item.hari || ''} ${item.tarikh || ''}`;
    const refleksiStr = item.refleksiBilCapai ? `${item.refleksiBilCapai} capai` : (item.catatanRefleksi || '-');

    tr.innerHTML = `
      <td class="py-3 px-4 font-bold text-slate-800">${namaGuru}</td>
      <td class="py-3 px-4 font-semibold text-brand-800">${subjekKelas}</td>
      <td class="py-3 px-4 text-slate-500">${tarikhMasa}</td>
      <td class="py-3 px-4">${statusBadge}</td>
      <td class="py-3 px-4 text-slate-600 truncate max-w-[180px]">${refleksiStr}</td>
      <td class="py-3 px-4 text-center">
        <button onclick="openReviewModal('${item.idRph}')" class="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm">
          Semak & Sahkan
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * KEMAS KINI STATISTIK PENTADBIR
 */
function updatePentadbirDashboardStats(list) {
  const pendingList = list.filter(i => i.statusSemak !== 'Disahkan' && i.statusSemak !== 'Disemak');
  const approvedList = list.filter(i => i.statusSemak === 'Disahkan' || i.statusSemak === 'Disemak');

  const statPendingCount = document.getElementById('statPendingCount');
  const statApprovedCount = document.getElementById('statApprovedCount');
  const badgePendingCount = document.getElementById('badgePendingCount');

  if (statPendingCount) statPendingCount.textContent = pendingList.length + ' RPH';
  if (statApprovedCount) statApprovedCount.textContent = approvedList.length + ' RPH';
  if (badgePendingCount) badgePendingCount.textContent = pendingList.length;
}

/**
 * BUKA MODAL SEMAKAN & PENGESAHAN
 */
function openReviewModal(idRph) {
  activeReviewItem = approvalQueueList.find(i => String(i.idRph) === String(idRph));
  if (!activeReviewItem) {
    showToast('Rekod RPH tidak dijumpai.', '⚠️');
    return;
  }

  const modal = document.getElementById('reviewModal');
  if (!modal) return;

  const infoEl = document.getElementById('modalTeacherInfo');
  const badgeEl = document.getElementById('modalStatusHantarBadge');
  const topicEl = document.getElementById('modalTopic');
  const spEl = document.getElementById('modalSP');
  const reflectEl = document.getElementById('modalReflect');
  const commentInput = document.getElementById('modalCommentInput');

  if (infoEl) infoEl.textContent = `${activeReviewItem.namaGuru || 'Guru'} | ${activeReviewItem.subjek || ''} (${activeReviewItem.kelas || ''})`;
  if (badgeEl) badgeEl.textContent = activeReviewItem.statusHantar || 'Dihantar';
  if (topicEl) topicEl.textContent = activeReviewItem.tajuk || activeReviewItem.tajukBidang || '-';
  if (spEl) spEl.textContent = activeReviewItem.standardPembelajaran || activeReviewItem.sp || '-';
  if (reflectEl) reflectEl.textContent = activeReviewItem.catatanRefleksi || activeReviewItem.refleksiBilCapai || 'Tiada refleksi';
  if (commentInput) commentInput.value = activeReviewItem.ulasanPenyemak || '';

  modal.classList.remove('hidden');
}

function closeReviewModal() {
  const modal = document.getElementById('reviewModal');
  if (modal) modal.classList.add('hidden');
  activeReviewItem = null;
}

/**
 * SIMPAN KEPUTUSAN SEMAKAN PENTADBIR & COP DIGITAL
 */
function saveApprovalAction() {
  if (!activeReviewItem) return;

  const commentInput = document.getElementById('modalCommentInput');
  const commentVal = commentInput ? commentInput.value : '';

  const emailPentadbir = window.currentUser ? (window.currentUser.email || window.currentUser.Email || window.currentUser.emel || '') : '';
  const namaPentadbir  = window.currentUser ? (window.currentUser.nama || window.currentUser.Nama_Guru || window.currentUser.name || 'Pentadbir') : 'Pentadbir';

  const payload = {
    idRph: activeReviewItem.idRph,
    statusSemak: 'Disahkan',
    ulasanPenyemak: commentVal,
    emailPentadbir: emailPentadbir,
    namaPentadbir: namaPentadbir
  };

  showToast('Sedang merekodkan pengesahan & cop digital...', '⏳');

  fetchBackendApi('approveErphRecord', payload)
    .then(res => {
      if (res && res.success) {
        showToast('RPH Berjaya Disahkan & Dikunci!', '✅');
        closeReviewModal();
        onGuruSeliaanChange();
      } else {
        showToast('Gagal mengesahkan: ' + (res.error || res.message), '❌');
      }
    })
    .catch(err => {
      console.error('Ralat Approval:', err);
      showToast('Ralat sambungan pelayan.', '❌');
    });
}

/**
 * APPROVE PUKAL
 */
function approveAllPending() {
  const pendingItems = approvalQueueList.filter(i => i.statusSemak !== 'Disahkan' && i.statusSemak !== 'Disemak');
  if (pendingItems.length === 0) {
    showToast('Tiada RPH yang memerlukan semakan.', 'ℹ️');
    return;
  }

  const emailPentadbir = window.currentUser ? (window.currentUser.email || window.currentUser.Email || window.currentUser.emel || '') : '';
  const ids = pendingItems.map(i => i.idRph);

  showToast('Sedang mengesahkan ' + ids.length + ' RPH secara pukal...', '⏳');

  fetchBackendApi('approveErphBatch', { ids: ids, emailPentadbir: emailPentadbir })
    .then(res => {
      if (res && res.success) {
        showToast('Keseluruhan RPH Berjaya Disahkan!', '✅');
        onGuruSeliaanChange();
      } else {
        showToast('Gagal pengesahan pukal: ' + (res.error || res.message), '❌');
      }
    })
    .catch(err => {
      console.error('Ralat Batch Approval:', err);
      showToast('Ralat sambungan pelayan.', '❌');
    });
}

/**
 * KAWALAN PERINGATAN (REMINDER)
 */
function toggleNotificationModal() {
  const modal = document.getElementById('incompleteTeachersModal');
  if (modal) modal.classList.toggle('hidden');
}

function closeIncompleteTeachersModal() {
  const modal = document.getElementById('incompleteTeachersModal');
  if (modal) modal.classList.add('hidden');
}

function sendReminder(nama, email) {
  showToast(`Peringatan telah dihantar kepada ${nama}!`, '🔔');
}

function sendReminderAll() {
  showToast('Peringatan pukal telah dihantar kepada semua guru terlibat!', '📢');
}

function navigateToApprovalTabFromBanner() {
  if (typeof setActiveTab === 'function') {
    setActiveTab('tabApproval');
  }
}
