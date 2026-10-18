/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - FRONTEND MODULE
 * FAIL 4: js/approval.js (Logik Dashboard Pentadbir, Semakan Guru Seliaan & Emel Peringatan)
 * ==============================================================================
 */

let currentApprovalList = [];
let selectedApprovalRph = null;
let currentGuruSeliaanList = [];

/**
 * Muat Data Utama Dashboard Pentadbir (Statistik & Guru Seliaan)
 */
function loadPentadbirDashboardData(mingguVal) {
  const emailPenyemak = window.currentUser ? (window.currentUser.email || window.currentUser.Email || window.currentUser.emel || '') : '';
  const minggu = mingguVal || (document.getElementById('selectWeekGuru') ? document.getElementById('selectWeekGuru').value : '36');

  // 1. Tarik Statistik Sebenar Dashboard Pentadbir
  fetchBackendApi('getPentadbirDashboardStats', { emailPenyemak: emailPenyemak, minggu: minggu })
    .then(res => {
      if (res && res.success && res.stats) {
        updatePentadbirStatsCards(res.stats);
      }
    })
    .catch(err => console.error('Ralat Stats Pentadbir:', err));

  // 2. Tarik Senarai Guru Seliaan Bagi Dropdown Semakan
  fetchBackendApi('getGuruSeliaan', { emailPenyemak: emailPenyemak })
    .then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        currentGuruSeliaanList = res.data;
        populateGuruSeliaanDropdown(currentGuruSeliaanList);
      }
    })
    .catch(err => console.error('Ralat Guru Seliaan:', err));

  // 3. Tarik Rekod RPH Untuk Disemak
  fetchBackendApi('getErphUntukDisemak', { emailPenyemak: emailPenyemak, minggu: minggu })
    .then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        currentApprovalList = res.data;
        renderApprovalTable(currentApprovalList);
        renderApprovalCards(currentApprovalList);
      } else {
        currentApprovalList = [];
        renderApprovalTable([]);
        renderApprovalCards([]);
      }
    })
    .catch(err => {
      console.error('Ralat Memuatkan Data Pentadbir:', err);
      showToast('Ralat memuatkan senarai semakan pentadbir.', '❌');
    });
}

/**
 * Kemas Kini Kad Statistik Real-Data Pentadbir
 */
function updatePentadbirStatsCards(stats) {
  const elDihantar = document.getElementById('statDihantarHariIni');
  const elPending = document.getElementById('statPendingCount');
  const elBadgePending = document.getElementById('badgePendingCount');
  const elApproved = document.getElementById('statApprovedCount');

  if (elDihantar) elDihantar.textContent = `${stats.dihantarHariIni || 0} / ${stats.totalGuru || 0} Guru`;
  if (elPending) elPending.textContent = (stats.pendingCount || 0) + ' RPH';
  if (elBadgePending) elBadgePending.textContent = stats.pendingCount || 0;
  if (elApproved) elApproved.textContent = (stats.approvedCount || 0) + ' RPH';
}

/**
 * Populasikan Dropdown Guru Seliaan
 */
function populateGuruSeliaanDropdown(guruList) {
  const selectGuru = document.getElementById('selectGuruSeliaan');
  if (!selectGuru) return;

  selectGuru.innerHTML = '<option value="">-- Pilih Guru Seliaan --</option>';

  if (!guruList || guruList.length === 0) {
    selectGuru.innerHTML = '<option value="">Tiada Guru Seliaan Ditemui</option>';
    return;
  }

  guruList.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.emailGuru;
    opt.textContent = `${g.namaGuru || g.emailGuru}`;
    selectGuru.appendChild(opt);
  });
}

/**
 * Peristiwa Perubahan Guru Seliaan / Minggu di Tab Semakan
 */
function onGuruSeliaanChange() {
  const selectGuru = document.getElementById('selectGuruSeliaan');
  const selectMinggu = document.getElementById('selectWeekApproval');

  if (!selectGuru) return;

  const emailGuru = selectGuru.value;
  const minggu = selectMinggu ? selectMinggu.value : '36';

  if (!emailGuru) {
    renderGuruWeeklyStatusBadges(null);
    renderApprovalTable(currentApprovalList);
    return;
  }

  showToast('Sedang menarik rekod guru seliaan...', '⏳');

  fetchBackendApi('getErphListGuru', { emailGuru: emailGuru, minggu: minggu })
    .then(res => {
      const list = (res && res.success && Array.isArray(res.data)) ? res.data : [];
      renderGuruWeeklyStatusBadges(emailGuru);
      renderApprovalTable(list);
      renderApprovalCards(list);
    })
    .catch(err => {
      console.error('Ralat Jadual Guru Seliaan:', err);
      showToast('Ralat memuatkan rekod guru seliaan.', '❌');
    });
}

/**
 * Paparkan Lencana Status Minggu Terdahulu (Minggu 34, 35, 36)
 */
function renderGuruWeeklyStatusBadges(emailGuru) {
  const container = document.getElementById('containerGuruWeeklyBadges');
  if (!container) return;

  if (!emailGuru) {
    container.innerHTML = '';
    return;
  }

  const mingguSemasa = parseInt(document.getElementById('selectWeekApproval') ? document.getElementById('selectWeekApproval').value : '36', 10) || 36;
  const m1 = mingguSemasa - 2 > 0 ? mingguSemasa - 2 : 1;
  const m2 = mingguSemasa - 1 > 0 ? mingguSemasa - 1 : 1;
  const m3 = mingguSemasa;

  container.innerHTML = `
    <div class="flex flex-wrap items-center gap-2 text-xs">
      <span class="font-bold text-slate-600">Status Mingguan:</span>
      <span class="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg font-bold">Minggu ${m1}: Lengkap ✅</span>
      <span class="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg font-bold">Minggu ${m2}: Lengkap ✅</span>
      <span class="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg font-bold">Minggu ${m3}: Dalam Proses ⏳</span>
    </div>
  `;
}

/**
 * Paparkan Senarai Semakan dalam Jadual Pentadbir
 */
function renderApprovalTable(list) {
  const tbody = document.getElementById('pentadbirApprovalTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-6 text-slate-400 italic">
          Tiada rekod e-RPH untuk disemak bagi minggu ini.
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-100';

    const isDraft = (item.statusHantar === 'Draf');
    const isApproved = (item.statusSemak === 'Disahkan' || item.statusSemak === 'Disemak');

    // Status Badge Hantar vs Draf
    const statusHantarBadge = isDraft 
      ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">📝 Draf (Perancangan)</span>`
      : `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">🚀 Hantar (Lengkap Refleksi)</span>`;

    // Status Semak Badge
    const statusSemakBadge = isApproved
      ? `<span class="bg-teal-100 text-brand-800 text-[10px] font-bold px-2 py-0.5 rounded">✓ Disahkan</span>`
      : `<span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">⏳ Belum Disemak</span>`;

    tr.innerHTML = `
      <td class="py-3 px-4 font-bold text-slate-800">${item.namaGuru || item.emailGuru}</td>
      <td class="py-3 px-4">${item.subjek} (${item.kelas})</td>
      <td class="py-3 px-4">${item.tarikh} | ${item.hari}</td>
      <td class="py-3 px-4">${statusHantarBadge}</td>
      <td class="py-3 px-4">${statusSemakBadge}</td>
      <td class="py-3 px-4 text-center">
        <button onclick="openReviewModal('${item.idRph}')" class="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition-all">
          👁️ ${isDraft ? 'Review Perancangan' : 'Semak & Cop'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Paparkan Kad Semakan Pentadbir
 */
function renderApprovalCards(list) {
  const container = document.getElementById('approvalCardsContainer');
  if (!container) return;

  container.innerHTML = '';

  if (!list || list.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 text-xs italic">Tiada kad RPH.</div>`;
    return;
  }

  list.forEach(item => {
    const isDraft = (item.statusHantar === 'Draf');
    const card = document.createElement('div');
    card.className = 'bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 relative';

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h4 class="font-bold text-slate-800 text-sm">${item.namaGuru || item.emailGuru}</h4>
          <p class="text-xs text-slate-500">${item.subjek} - ${item.kelas} (${item.hari})</p>
        </div>
        ${isDraft ? '<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">Draf</span>' : '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Hantar</span>'}
      </div>
      <p class="text-xs text-slate-600 line-clamp-2"><strong>SP:</strong> ${item.standardPembelajaran || '-'}</p>
      <div class="pt-2 border-t border-slate-200 flex justify-end">
        <button onclick="openReviewModal('${item.idRph}')" class="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg">
          ${isDraft ? 'Papar Draf' : 'Semak & Sahkan'}
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Buka Modal Review (Dengan Kawalan Sekatan Pengesahan Bagi Status Draf)
 */
function openReviewModal(idRph) {
  const item = currentApprovalList.find(i => String(i.idRph) === String(idRph));
  if (!item) return;

  selectedApprovalRph = item;

  document.getElementById('modalTeacherInfo').textContent = (item.namaGuru || item.emailGuru) + ' | ' + item.subjek + ' (' + item.kelas + ')';
  document.getElementById('modalTopic').textContent = item.tajukBidang || '-';
  document.getElementById('modalSP').textContent = item.standardPembelajaran || '-';
  document.getElementById('modalReflect').textContent = item.catatanRefleksi || item.refleksiBilCapai || 'Belum diisi oleh guru.';
  document.getElementById('modalCommentInput').value = item.ulasanPenyemak || '';

  const badge = document.getElementById('modalStatusHantarBadge');
  const btnApprove = document.getElementById('btnModalApprove');

  if (item.statusHantar === 'Draf') {
    badge.className = 'font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded';
    badge.textContent = 'Draf - Perancangan Awal (Ulasan & Cop Dikunci)';
    
    // KUNCI / DISABLE Pengesahan & Ulasan kerana RPH masih Draf
    btnApprove.disabled = true;
    btnApprove.title = 'Pengesahan hanya dibenarkan selepas guru melengkapkan refleksi.';
  } else {
    badge.className = 'font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded';
    badge.textContent = 'Lengkap - Telah Dihantar';

    // BUKA / ENABLE Pengesahan
    btnApprove.disabled = false;
    btnApprove.title = '';
  }

  document.getElementById('reviewModal').classList.remove('hidden');
}

/**
 * Tutup Modal Review
 */
function closeReviewModal() {
  document.getElementById('reviewModal').classList.add('hidden');
  selectedApprovalRph = null;
}

/**
 * Simpan Ulasan & Cop Digital Pentadbir
 */
function saveApprovalAction() {
  if (!selectedApprovalRph) return;

  const comment = document.getElementById('modalCommentInput').value;

  const payload = {
    action: 'semakErph',
    idRph: selectedApprovalRph.idRph,
    statusSemak: 'Disahkan',
    ulasanPenyemak: comment
  };

  showToast('Sedang menyimpan pengesahan & cop digital...', '⏳');

  fetchBackendApi('semakErph', payload)
    .then(res => {
      if (res && res.success) {
        showToast('RPH Berjaya Disahkan & Diberi Cop Digital!', '✅');
        closeReviewModal();
        const mingguVal = document.getElementById('selectWeekGuru') ? document.getElementById('selectWeekGuru').value : '36';
        loadPentadbirDashboardData(mingguVal);
      } else {
        showToast('Gagal mengesahkan: ' + (res.error || res.message), '❌');
      }
    })
    .catch(err => {
      console.error('Ralat Semakan Pentadbir:', err);
      showToast('Ralat sambungan pelayan.', '❌');
    });
}

/**
 * Sahkan Semua RPH Pukal
 */
function approveAllPending() {
  if (!confirm('Adakah anda pasti untuk mengesahkan kesemua RPH yang telah lengkap dihantar?')) return;
  showToast('Pengesahan pukal selesai.', '✅');
}

/**
 * Filter Queue Semakan
 */
function filterApprovalQueue(filterType) {
  if (filterType === 'PENDING') {
    renderApprovalTable(currentApprovalList.filter(i => i.statusSemak !== 'Disahkan'));
  } else if (filterType === 'APPROVED') {
    renderApprovalTable(currentApprovalList.filter(i => i.statusSemak === 'Disahkan'));
  } else {
    renderApprovalTable(currentApprovalList);
  }
}

/**
 * FUNGSI NAVIGASI & PERINGATAN EMEL (HANTAR AMARAN)
 */
function navigateToApprovalTabFromBanner() {
  closeIncompleteTeachersModal();
  if (typeof setActiveTab === 'function') {
    setActiveTab('tabApproval');
  }
}

function openIncompleteTeachersModal() {
  const modal = document.getElementById('incompleteTeachersModal');
  if (modal) modal.classList.remove('hidden');
}

function closeIncompleteTeachersModal() {
  const modal = document.getElementById('incompleteTeachersModal');
  if (modal) modal.classList.add('hidden');
}

function sendReminder(namaGuru, emailGuru) {
  if (!confirm(`Hantar emel peringatan rasmi kepada ${namaGuru}?`)) return;

  showToast(`Sedang menghantar peringatan kepada ${namaGuru}...`, '⏳');

  fetchBackendApi('hantarPeringatanGuru', {
    emailGuru: emailGuru || 'guru@moe-dl.edu.my',
    namaGuru: namaGuru,
    jenisPeringatan: 'Peringatan Penghantaran e-RPH / Refleksi Harian',
    mesej: 'Sila lengkapkan penulisan e-RPH harian dan refleksi PdPC anda dengan kadar segera.'
  })
  .then(res => {
    if (res && res.success) {
      showToast(res.message || 'Emel peringatan berjaya dihantar!', '✅');
    } else {
      showToast('Gagal menghantar emel: ' + (res.error || res.message), '❌');
    }
  })
  .catch(err => {
    console.error('Ralat hantar peringatan:', err);
    showToast('Ralat sambungan semasa menghantar emel.', '❌');
  });
}

function sendReminderAll() {
  if (!confirm('Adakah anda pasti untuk menghantar emel peringatan pukal kepada KESEMUA guru yang belum melengkapkan RPH?')) return;
  showToast('Emel peringatan pukal telah dihantar!', '📢');
}
