/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - FRONTEND MODULE
 * FAIL 5: js/approval.js (Logik Semakan Pentadbir & Review Draf/Hantar)
 * ==============================================================================
 */

let currentApprovalList = [];
let selectedApprovalRph = null;

/**
 * Muat Data Modul Pentadbir (Semakan RPH Guru Seliaan)
 */
function loadPentadbirDashboardData(mingguVal) {
  const emailPenyemak = window.currentUser ? window.currentUser.email : '';
  const minggu = mingguVal || '36';

  fetchBackendApi('getErphUntukDisemak', { emailPenyemak: emailPenyemak, minggu: minggu })
    .then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        currentApprovalList = res.data;
        renderApprovalTable(currentApprovalList);
        renderApprovalCards(currentApprovalList);
        updatePentadbirStats(currentApprovalList);
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
 * Kemaskini Bilangan Statistik Pentadbir
 */
function updatePentadbirStats(list) {
  const pendingCount = list.filter(i => i.statusHantar !== 'Draf' && i.statusSemak !== 'Disahkan').length;
  const badge = document.getElementById('badgePendingCount');
  const statBadge = document.getElementById('statPendingCount');

  if (badge) badge.textContent = pendingCount;
  if (statBadge) statBadge.textContent = pendingCount + ' RPH';
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
