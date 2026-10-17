/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - FRONTEND MODULE
 * FAIL 4: js/builder.js (Logik Pembina e-RPH, DSKP, Kehadiran & Time-Freeze)
 * ==============================================================================
 */

// Pembolehubah Global Pembina RPH
let currentJadualList = [];
let currentDskpList = [];
let selectedSlotData = null;
let attendanceDataGlobal = { bilHadir: '0/0', total: 0, hadir: 0 };

/**
 * Inisialisasi Modul Builder semasa Halaman Dimuatkan
 */
document.addEventListener('DOMContentLoaded', function() {
  initBuilderWeekDropdown();
});

/**
 * Populasikan Dropdown Minggu
 */
function initBuilderWeekDropdown() {
  const selectWeek = document.getElementById('builderSelectWeek');
  if (!selectWeek) return;

  selectWeek.innerHTML = '';
  for (let i = 1; i <= 42; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = 'Minggu ' + i;
    if (i === 36) opt.selected = true; // Set Minggu Semasa Default
    selectWeek.appendChild(opt);
  }
  
  onBuilderWeekChange();
}

/**
 * Peristiwa Perubahan Minggu
 */
function onBuilderWeekChange() {
  const weekVal = document.getElementById('builderSelectWeek').value;
  const selectDateDay = document.getElementById('builderSelectDateDay');
  if (!selectDateDay) return;

  selectDateDay.innerHTML = '<option value="">-- Pilih Hari / Tarikh --</option>';

  // Penjanaan Hari Isnin - Jumaat
  const days = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];
  days.forEach(day => {
    const opt = document.createElement('option');
    opt.value = day;
    opt.textContent = day + ' (Minggu ' + weekVal + ')';
    selectDateDay.appendChild(opt);
  });

  // Reset Slot & Form
  document.getElementById('builderSelectSlot').innerHTML = '<option value="">-- Pilih Slot Jadual --</option>';
  resetRphFormFields();
}

/**
 * Peristiwa Perubahan Hari / Tarikh
 */
function onBuilderDateDayChange() {
  const dayVal = document.getElementById('builderSelectDateDay').value;
  const selectSlot = document.getElementById('builderSelectSlot');
  if (!selectSlot) return;

  selectSlot.innerHTML = '<option value="">Sedang memuatkan jadual...</option>';
  resetRphFormFields();

  if (!dayVal) {
    selectSlot.innerHTML = '<option value="">-- Pilih Slot Jadual --</option>';
    return;
  }

  // Set Tarikh Auto mengikut hari semasa
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  document.getElementById('rphDate').value = dateStr;

  // Dapatkan Jadual Waktu Backend
  const emailGuru = window.currentUser ? window.currentUser.email : '';
  
  fetchBackendApi('getJadualGuruByHari', { emailGuru: emailGuru, hari: dayVal })
    .then(res => {
      selectSlot.innerHTML = '<option value="">-- Pilih Slot Jadual --</option>';
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        currentJadualList = res.data;
        res.data.forEach((slot, index) => {
          const opt = document.createElement('option');
          opt.value = index;
          opt.textContent = slot.masaMula + ' - ' + slot.masaTamat + ' | ' + slot.subjek + ' (' + slot.kelas + ')';
          selectSlot.appendChild(opt);
        });
      } else {
        selectSlot.innerHTML = '<option value="">Tiada slot jadual ditemui</option>';
      }
    })
    .catch(err => {
      console.error('Ralat Jadual:', err);
      selectSlot.innerHTML = '<option value="">Ralat memuatkan jadual</option>';
    });
}

/**
 * Peristiwa Perubahan Slot Jadual (Trigger Auto Fill DSKP, Kehadiran & Time Freeze)
 */
function onBuilderSlotChange() {
  const slotIdx = document.getElementById('builderSelectSlot').value;
  if (slotIdx === '' || !currentJadualList[slotIdx]) {
    resetRphFormFields();
    return;
  }

  selectedSlotData = currentJadualList[slotIdx];

  // 1. Isikan Maklumat Asas
  document.getElementById('rphTime').value = selectedSlotData.hari + ' (' + selectedSlotData.masaMula + ' - ' + selectedSlotData.masaTamat + ')';
  document.getElementById('rphSubjectSelect').value = selectedSlotData.subjek;
  document.getElementById('rphClass').value = selectedSlotData.kelas;

  // 2. Tarik Data Kehadiran Automatik dari Sheet Data_Kehadiran
  const tarikhVal = document.getElementById('rphDate').value;
  fetchKehadiranData(tarikhVal, selectedSlotData.kelas);

  // 3. Semak Kawalan Masa PdPC (Time Freeze Logic)
  checkPdpcTimeAndFreeze(selectedSlotData.masaTamat);

  // 4. Dapatkan DSKP bagi Subjek & Kelas berkenaan
  fetchDskpData(selectedSlotData.subjek, selectedSlotData.kelas);
}

/**
 * Tarik Data Kehadiran Automatik
 */
function fetchKehadiranData(tarikh, kelas) {
  const displayInput = document.getElementById('rphKehadiranDisplay');
  displayInput.value = 'Sedang menarik data...';

  fetchBackendApi('getKehadiranMurid', { tarikh: tarikh, namaKelas: kelas })
    .then(res => {
      if (res && res.success && res.bilHadir) {
        displayInput.value = res.bilHadir + ' orang murid';
        
        // Parse Bilangan Hadir / Jumlah Murid (Contoh: "28/32")
        const parts = res.bilHadir.split('/');
        if (parts.length === 2) {
          attendanceDataGlobal.hadir = parseInt(parts[0].trim(), 10) || 0;
          attendanceDataGlobal.total = parseInt(parts[1].trim(), 10) || 0;
          attendanceDataGlobal.bilHadir = res.bilHadir;
        }
      } else {
        displayInput.value = '0 / 0 orang murid';
        attendanceDataGlobal = { bilHadir: '0/0', total: 0, hadir: 0 };
      }
      calculateRefleksi();
    })
    .catch(err => {
      console.error('Ralat Kehadiran:', err);
      displayInput.value = '0 / 0 orang murid';
      calculateRefleksi();
    });
}

/**
 * Kawalan Pembekuan Refleksi Mengikut Masa Tamat PdPC (Freeze Logic)
 */
function checkPdpcTimeAndFreeze(masaTamatStr) {
  const banner = document.getElementById('statusPdpcTimeBanner');
  const msgTxt = document.getElementById('txtPdpcTimeMsg');
  const capaiInput = document.getElementById('rphCapaiCount');
  const submitBtn = document.getElementById('btnSubmitRph');

  if (!masaTamatStr) return;

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = (currentHours * 60) + currentMinutes;

  // Huraikan Masa Tamat (Contoh: "08:40" atau "10:30 AM")
  const timeParts = masaTamatStr.replace(/[^0-9:]/g, '').split(':');
  if (timeParts.length < 2) return;

  let endHours = parseInt(timeParts[0], 10);
  let endMinutes = parseInt(timeParts[1], 10);

  // Penyelarasan PM
  if (masaTamatStr.toLowerCase().includes('pm') && endHours < 12) endHours += 12;
  if (masaTamatStr.toLowerCase().includes('am') && endHours === 12) endHours = 0;

  const endTimeInMinutes = (endHours * 60) + endMinutes;

  // Logik Perbandingan Masa
  if (currentTimeInMinutes < endTimeInMinutes) {
    // masa PdPC Belum Tamat -> FREEZE / LOCK REFLEKSI & SUBMIT
    banner.className = 'p-3 bg-amber-100 border border-amber-300 rounded-xl flex items-center justify-between text-amber-900 font-semibold text-xs';
    msgTxt.innerHTML = '🔒 Masa PdPC slot ini (' + masaTamatStr + ') belum tamat. Seksyen Refleksi & Butang Penghantaran dibekukan sehingga PdPC selesai.';
    
    capaiInput.disabled = true;
    submitBtn.disabled = true;
    capaiInput.classList.add('bg-slate-100', 'cursor-not-allowed');
  } else {
    // Masa PdPC Sudah Tamat -> UNLOCK REFLEKSI & SUBMIT
    banner.className = 'p-3 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-900 font-semibold text-xs';
    msgTxt.innerHTML = '🔓 Waktu PdPC telah tamat (' + masaTamatStr + '). Sila lengkapkan bilangan murid capai objektif untuk hantar RPH.';
    
    capaiInput.disabled = false;
    submitBtn.disabled = false;
    capaiInput.classList.remove('bg-slate-100', 'cursor-not-allowed');
  }
}

/**
 * Tarik Data DSKP dan Populasikan Dropdown Tema / Tajuk
 */
function fetchDskpData(subjek, kelas) {
  const badge = document.getElementById('dskpStatusBadge');
  badge.textContent = '⏳ Sedang menarik DSKP...';

  // Ekstrak Tahun / Tingkatan dari Nama Kelas (Contoh: "1 Iris" -> "1")
  const tahun = kelas ? kelas.charAt(0) : '1';

  fetchBackendApi('getDskpData', { subjek: subjek, tahun: tahun })
    .then(res => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        currentDskpList = res.data;
        badge.textContent = '✅ DSKP Ditemui (' + res.data.length + ' Item)';
        badge.className = 'text-[11px] text-emerald-600 font-bold';

        populateDskpDropdowns();
      } else {
        badge.textContent = '⚠️ Tiada DSKP padan. Sila isi secara manual.';
        badge.className = 'text-[11px] text-amber-600 font-medium';
        currentDskpList = [];
      }
    })
    .catch(err => {
      console.error('Ralat DSKP:', err);
      badge.textContent = '❌ Ralat DSKP';
    });
}

/**
 * Populasikan Dropdown Tema & Tajuk
 */
function populateDskpDropdowns() {
  const themeSelect = document.getElementById('rphThemeSelect');
  const tajukSelect = document.getElementById('rphTajukSelect');

  themeSelect.innerHTML = '<option value="">-- Pilih Tema / Unit --</option>';
  tajukSelect.innerHTML = '<option value="">-- Pilih Tajuk --</option>';

  const themes = [...new Set(currentDskpList.map(item => item.tema_unit).filter(Boolean))];
  themes.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    themeSelect.appendChild(opt);
  });

  const tajuks = [...new Set(currentDskpList.map(item => item.tajuk).filter(Boolean))];
  tajuks.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    tajukSelect.appendChild(opt);
  });
}

/**
 * Peristiwa Tukar Tema / Tajuk -> Auto Fill SP, OP, KK & Aktiviti
 */
function onThemeChange() { autoFillDskpContent(); }
function onTajukChange() { autoFillDskpContent(); }

function autoFillDskpContent() {
  const selectedTheme = document.getElementById('rphThemeSelect').value;
  const selectedTajuk = document.getElementById('rphTajukSelect').value;

  const matched = currentDskpList.find(item => 
    (!selectedTheme || item.tema_unit === selectedTheme) &&
    (!selectedTajuk || item.tajuk === selectedTajuk)
  );

  if (matched) {
    document.getElementById('rphSP').value   = matched.sp || '';
    document.getElementById('rphOP').value   = matched.objektif || ''; // Kolum G (Objektif)
    document.getElementById('rphKK').value   = matched.kriteria_kejayaan || ''; // Kolum H
    document.getElementById('rphActStart').value = matched.set_induksi || '';
    document.getElementById('rphActMain').value  = matched.aktiviti || '';
    document.getElementById('rphActEnd').value   = matched.rumusan || '';
  }
}

/**
 * Pengiraan Dinamik Refleksi
 */
function calculateRefleksi() {
  const isPostponed = document.getElementById('chkPdpcPostponed').checked;
  const capaiInput = parseInt(document.getElementById('rphCapaiCount').value, 10) || 0;
  const totalStudents = attendanceDataGlobal.hadir || 0;

  const txtCapai = document.getElementById('txtCapaiOp');
  const txtBimbingan = document.getElementById('txtBimbingan');
  const txtTidakCapai = document.getElementById('txtTidakCapai');

  if (isPostponed) {
    const reason = document.getElementById('rphPdpcReason').value || 'PdPC Ditangguhkan';
    txtCapai.textContent = '0 / ' + totalStudents;
    txtBimbingan.textContent = '0 / ' + totalStudents;
    txtTidakCapai.textContent = '0 / ' + totalStudents;
    document.getElementById('rphReflectCount').value = 'PdPC tidak dapat dijalankan kerana ' + reason + '.';
    return;
  }

  let capai = capaiInput > totalStudents ? totalStudents : capaiInput;
  let tidakCapai = totalStudents - capai;

  txtCapai.textContent = capai + ' / ' + totalStudents;
  txtBimbingan.textContent = '0 / ' + totalStudents;
  txtTidakCapai.textContent = tidakCapai + ' / ' + totalStudents;

  document.getElementById('rphReflectCount').value = capai + ' / ' + totalStudents + ' orang murid capai objektif.';
}

/**
 * Toggle Paparan Sebab PdPC Ditangguhkan
 */
function togglePdpcReason() {
  const chk = document.getElementById('chkPdpcPostponed');
  const box = document.getElementById('pdpcReasonBox');
  if (chk.checked) {
    box.classList.remove('hidden');
  } else {
    box.classList.add('hidden');
  }
  calculateRefleksi();
}

/**
 * Pembantu Mengambil Nilai Checkbox (T, U, V, W)
 */
function getCheckedValuesByName(name) {
  const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Simpan Draf Perancangan RPH (Fasa 1)
 */
function saveDraftRPH() {
  saveRphRecordWithStatus('Draf');
}

/**
 * Hantar RPH Harian Lengkap Refleksi (Fasa 2)
 */
function submitRphForm() {
  saveRphRecordWithStatus('Hantar');
}

/**
 * Fungsi Pengendali Simpan / Hantar Utama Backend
 */
function saveRphRecordWithStatus(statusTarget) {
  const emailGuru = window.currentUser ? window.currentUser.email : '';
  const namaGuru  = window.currentUser ? window.currentUser.name  : '';

  const payload = {
    action: 'saveErph',
    data: {
      emailGuru: emailGuru,
      namaGuru: namaGuru,
      tarikh: document.getElementById('rphDate').value,
      hariMasa: document.getElementById('rphTime').value,
      minggu: document.getElementById('builderSelectWeek').value,
      kelas: document.getElementById('rphClass').value,
      subjek: document.getElementById('rphSubjectSelect').value,
      temaUnit: document.getElementById('rphThemeSelect').value,
      tajuk: document.getElementById('rphTajukSelect').value,
      sp: document.getElementById('rphSP').value,
      op: document.getElementById('rphOP').value,
      kk: document.getElementById('rphKK').value,
      actStart: document.getElementById('rphActStart').value,
      actMain: document.getElementById('rphActMain').value,
      actEnd: document.getElementById('rphActEnd').value,
      
      // Tangkapan Checkbox T, U, V, W
      bbm: getCheckedValuesByName('chkBbm'),
      emk: getCheckedValuesByName('chkEmk'),
      kbat: getCheckedValuesByName('chkKbat'),
      pbd: getCheckedValuesByName('chkPbd'),

      kehadiranMurid: document.getElementById('rphKehadiranDisplay').value,
      refleksiBilCapai: document.getElementById('rphCapaiCount').value,
      catatanRefleksi: document.getElementById('rphReflectNote').value,
      statusRph: statusTarget
    }
  };

  showToast('Sedang menyimpan RPH (' + statusTarget + ')...', '⏳');

  fetchBackendApi('saveErph', payload.data)
    .then(res => {
      if (res && res.success) {
        showToast(res.message || 'RPH Berjaya Disimpan!', '✅');
        document.getElementById('rphTimestampDisplay').textContent = 'Dikemaskini: ' + (res.timestamp || new Date().toLocaleTimeString());
        
        if (typeof loadGuruDashboardData === 'function') {
          loadGuruDashboardData();
        }
      } else {
        showToast('Gagal menyimpan: ' + (res.error || res.message), '❌');
      }
    })
    .catch(err => {
      console.error('Ralat Simpan RPH:', err);
      showToast('Ralat sambungan pelayan.', '❌');
    });
}

/**
 * Reset Borang Pembina RPH
 */
function resetRphFormFields() {
  document.getElementById('rphTime').value = '';
  document.getElementById('rphSubjectSelect').value = '';
  document.getElementById('rphClass').value = '';
  document.getElementById('rphThemeSelect').innerHTML = '<option value="">-- Pilih Tema / Unit --</option>';
  document.getElementById('rphTajukSelect').innerHTML = '<option value="">-- Pilih Tajuk --</option>';
  document.getElementById('rphSP').value = '';
  document.getElementById('rphOP').value = '';
  document.getElementById('rphKK').value = '';
  document.getElementById('rphActStart').value = '';
  document.getElementById('rphActMain').value = '';
  document.getElementById('rphActEnd').value = '';
  document.getElementById('rphKehadiranDisplay').value = '0 / 0 orang murid';
  document.getElementById('rphCapaiCount').value = '0';
  document.getElementById('rphReflectNote').value = '';
  calculateRefleksi();
}
