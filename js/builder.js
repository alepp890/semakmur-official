/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - FRONTEND MODULE
 * FAIL: js/builder.js (Logik Pembina e-RPH, Dropdown Berkait DSKP & Kawalan Refleksi)
 * ==============================================================================
 */

// Pembolehubah Global Pembina RPH
let currentJadualList = [];
let currentDskpList = [];
let selectedSlotData = null;
let attendanceDataGlobal = { bilHadir: '0/0', total: 0, hadir: 0 };

/**
 * Pemetaan Kod Ringkas Subjek kepada Nama Penuh (Untuk carian Data_DSKP)
 */
const SUBJECT_MAP_BUILDER = {
  'BM': 'Bahasa Melayu',
  'BI': 'Bahasa Inggeris',
  'MT': 'Matematik',
  'SN': 'Sains',
  'BA': 'Bahasa Arab',
  'PMZ': 'Pendidikan Muzik',
  'PSV': 'Pendidikan Seni Visual',
  'PI/Q': 'Pendidikan Islam',
  'PI/U': 'Pendidikan Islam',
  'PI': 'Pendidikan Islam',
  'RBT': 'Reka Bentuk dan Teknologi',
  'PJ': 'Pendidikan Jasmani',
  'PK': 'Pendidikan Kesihatan',
  'SEJ': 'Sejarah',
  'HIST': 'Sejarah'
};

function getNamaSubjekPenuh(kodSubjek) {
  if (!kodSubjek) return '';
  const clean = String(kodSubjek).trim().toUpperCase();
  return SUBJECT_MAP_BUILDER[clean] || kodSubjek;
}

function timeToMinutesHelper(tStr) {
  if (!tStr) return 0;
  let parts = String(tStr).replace(/[^0-9:]/g, '').split(':');
  if (parts.length < 2) return 0;
  return (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);
}

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
    if (i === 36) opt.selected = true;
    selectWeek.appendChild(opt);
  }
  
  onBuilderWeekChange();
}

/**
 * Peristiwa Perubahan Minggu - Penjanaan Hari & Tarikh Sebenar
 */
function onBuilderWeekChange() {
  const weekVal = parseInt(document.getElementById('builderSelectWeek').value, 10) || 36;
  const selectDateDay = document.getElementById('builderSelectDateDay');
  if (!selectDateDay) return;

  selectDateDay.innerHTML = '<option value="">-- Pilih Hari / Tarikh --</option>';

  const refWeek = 36;
  const refMonday = new Date(2026, 9, 19);

  const days = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];
  days.forEach((day, idx) => {
    let dayDate = new Date(refMonday);
    let weekDiff = weekVal - refWeek;
    dayDate.setDate(refMonday.getDate() + (weekDiff * 7) + idx);

    let dd = String(dayDate.getDate()).padStart(2, '0');
    let mm = String(dayDate.getMonth() + 1).padStart(2, '0');
    let yyyy = dayDate.getFullYear();
    let formattedDate = `${dd}/${mm}/${yyyy}`;
    let isoDate = `${yyyy}-${mm}-${dd}`;

    const opt = document.createElement('option');
    opt.value = day;
    opt.dataset.isoDate = isoDate;
    opt.textContent = `${day} (${formattedDate})`;
    selectDateDay.appendChild(opt);
  });

  document.getElementById('builderSelectSlot').innerHTML = '<option value="">-- Pilih Slot Jadual --</option>';
  resetRphFormFields();
}

/**
 * Peristiwa Perubahan Hari / Tarikh - Tarik Jadual & Filter Slot Terpisah
 */
function onBuilderDateDayChange(callback) {
  const selectDateDay = document.getElementById('builderSelectDateDay');
  const dayVal = selectDateDay.value;
  const selectSlot = document.getElementById('builderSelectSlot');
  if (!selectSlot) return;

  selectSlot.innerHTML = '<option value="">Sedang memuatkan jadual...</option>';
  resetRphFormFields();

  if (!dayVal) {
    selectSlot.innerHTML = '<option value="">-- Pilih Slot Jadual --</option>';
    if (typeof callback === 'function') callback();
    return;
  }

  const selectedOpt = selectDateDay.options[selectDateDay.selectedIndex];
  if (selectedOpt && selectedOpt.dataset.isoDate) {
    document.getElementById('rphDate').value = selectedOpt.dataset.isoDate;
  } else {
    document.getElementById('rphDate').value = new Date().toISOString().split('T')[0];
  }

  const emailGuru = window.currentUser ? (window.currentUser.email || window.currentUser.Email || window.currentUser.emel || '') : '';
  
  fetchBackendApi('getJadualGuruByHari', { emailGuru: emailGuru, hari: dayVal })
    .then(res => {
      selectSlot.innerHTML = '<option value="">-- Pilih Slot Jadual --</option>';
      const rawList = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

      if (Array.isArray(rawList) && rawList.length > 0) {
        let grouped = {};
        rawList.forEach(slot => {
          let sCode = slot.subjek || slot.Subjek || '';
          let sKelas = slot.nama_kelas || slot.kelas || '';
          let key = (sCode + '_' + sKelas).toLowerCase().replace(/\s+/g, '');

          if (!grouped[key]) grouped[key] = [];

          let mula  = slot.jam_mula || slot.masaMula || '00:00';
          let tamat = slot.jam_tamat || slot.masaTamat || '00:00';

          grouped[key].push({
            raw: slot,
            subjekShort: sCode,
            subjekFull: getNamaSubjekPenuh(sCode),
            kelas: sKelas,
            mula: mula,
            tamat: tamat,
            mulaMin: timeToMinutesHelper(mula),
            tamatMin: timeToMinutesHelper(tamat),
            duration: timeToMinutesHelper(tamat) - timeToMinutesHelper(mula)
          });
        });

        let processedSlots = [];

        Object.keys(grouped).forEach(k => {
          let slots = grouped[k];
          slots.sort((a, b) => a.mulaMin - b.mulaMin);

          let merged = [];
          for (let i = 0; i < slots.length; i++) {
            if (merged.length > 0) {
              let prev = merged[merged.length - 1];
              let curr = slots[i];
              if (curr.mulaMin >= prev.mulaMin && curr.mulaMin <= prev.tamatMin + 5) {
                prev.tamat = curr.tamat;
                prev.tamatMin = curr.tamatMin;
                prev.duration = prev.tamatMin - prev.mulaMin;
                continue;
              }
            }
            merged.push(Object.assign({}, slots[i]));
          }

          let hasLongSlot = merged.some(s => s.duration >= 50);
          if (hasLongSlot) {
            merged = merged.filter(s => s.duration >= 50);
          }

          processedSlots.push(...merged);
        });

        currentJadualList = processedSlots;

        currentJadualList.forEach((slot, index) => {
          const opt = document.createElement('option');
          opt.value = index;
          opt.textContent = `${slot.subjekShort} - ${slot.kelas}`;
          selectSlot.appendChild(opt);
        });

      } else {
        selectSlot.innerHTML = '<option value="">Tiada slot jadual ditemui</option>';
      }

      if (typeof callback === 'function') callback();
    })
    .catch(err => {
      console.error('Ralat Jadual:', err);
      selectSlot.innerHTML = '<option value="">Ralat memuatkan jadual</option>';
      if (typeof callback === 'function') callback();
    });
}

/**
 * Peristiwa Perubahan Slot Jadual -> Auto-fill Maklumat Asas
 */
function onBuilderSlotChange() {
  const slotIdx = document.getElementById('builderSelectSlot').value;
  if (slotIdx === '' || !currentJadualList[slotIdx]) {
    resetRphFormFields();
    return;
  }

  selectedSlotData = currentJadualList[slotIdx];

  const mula       = selectedSlotData.mula || '';
  const tamat      = selectedSlotData.tamat || '';
  const kelas      = selectedSlotData.kelas || '';
  const hari       = document.getElementById('builderSelectDateDay').value;
  const subjekFull = selectedSlotData.subjekFull || '';

  // 1. Isikan Maklumat Asas
  document.getElementById('rphTime').value = `${hari} (${mula} - ${tamat})`;
  document.getElementById('rphSubjectSelect').value = subjekFull;
  document.getElementById('rphClass').value = kelas;

  // 2. Tarik Data Kehadiran Automatik dari Sheet Data_Kehadiran
  const tarikhVal = document.getElementById('rphDate').value;
  fetchKehadiranData(tarikhVal, kelas);

  // 3. Semak Kawalan Masa PdPC & Status Refleksi
  checkPdpcTimeAndFreeze(tamat);

  // 4. Dapatkan DSKP bagi Subjek Penuh & Kelas
  fetchDskpData(subjekFull, kelas);
}

/**
 * Tarik Data Kehadiran Automatik
 */
function fetchKehadiranData(tarikh, kelas) {
  const displayInput = document.getElementById('rphKehadiranDisplay');
  if (!displayInput) return;

  displayInput.value = 'Sedang menarik data...';

  fetchBackendApi('getKehadiranMurid', { tarikh: tarikh, namaKelas: kelas })
    .then(res => {
      if (res && res.success && res.bilHadir) {
        displayInput.value = res.bilHadir + ' orang murid';
        
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
 * FUNGSI SEMAKAN STATUS BUTANG HANTAR (DYNAMIC VALIDATION)
 */
function validateSubmitButtonState() {
  const btnSubmit = document.getElementById('btnSubmitRph');
  if (!btnSubmit) return;

  const sectionRefleksi = document.getElementById('sectionRefleksiWrapper');
  const isHidden = sectionRefleksi && sectionRefleksi.classList.contains('hidden');

  if (isHidden) {
    btnSubmit.disabled = true;
    btnSubmit.title = "Butang Hantar dikunci kerana waktu PdPC belum tamat untuk melengkapkan refleksi.";
    return;
  }

  const chkPdpc = document.getElementById('chkPdpcPostponed');
  const isPostponed = chkPdpc ? chkPdpc.checked : false;
  const capaiVal = parseInt(document.getElementById('rphCapaiCount').value, 10) || 0;

  if (isPostponed) {
    const reason = (document.getElementById('rphPdpcReason').value || '').trim();
    if (reason === '') {
      btnSubmit.disabled = true;
      btnSubmit.title = "Sila isi sebab PdPC tidak dapat dijalankan.";
    } else {
      btnSubmit.disabled = false;
      btnSubmit.title = "";
    }
  } else {
    if (capaiVal <= 0) {
      btnSubmit.disabled = true;
      btnSubmit.title = "Sila isi bilangan murid yang mencapai objektif (> 0) untuk hantar RPH.";
    } else {
      btnSubmit.disabled = false;
      btnSubmit.title = "";
    }
  }
}

/**
 * Kawalan Menyebab/Menyorokkan Refleksi Mengikut Masa Tamat PdPC
 */
function checkPdpcTimeAndFreeze(masaTamatStr) {
  const banner = document.getElementById('statusPdpcTimeBanner');
  const msgTxt = document.getElementById('txtPdpcTimeMsg');
  const capaiInput = document.getElementById('rphCapaiCount');
  const sectionRefleksi = document.getElementById('sectionRefleksiWrapper');

  if (!masaTamatStr) {
    if (sectionRefleksi) sectionRefleksi.classList.remove('hidden');
    validateSubmitButtonState();
    return;
  }

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = (currentHours * 60) + currentMinutes;

  const timeParts = masaTamatStr.replace(/[^0-9:]/g, '').split(':');
  if (timeParts.length < 2) {
    if (sectionRefleksi) sectionRefleksi.classList.remove('hidden');
    validateSubmitButtonState();
    return;
  }

  let endHours = parseInt(timeParts[0], 10);
  let endMinutes = parseInt(timeParts[1], 10);

  if (masaTamatStr.toLowerCase().includes('pm') && endHours < 12) endHours += 12;
  if (masaTamatStr.toLowerCase().includes('am') && endHours === 12) endHours = 0;

  const endTimeInMinutes = (endHours * 60) + endMinutes;

  if (currentTimeInMinutes < endTimeInMinutes) {
    if (banner) banner.className = 'p-3 bg-amber-100 border border-amber-300 rounded-xl flex items-center justify-between text-amber-900 font-semibold text-xs';
    if (msgTxt) msgTxt.innerHTML = '🔒 Masa PdPC slot ini (' + masaTamatStr + ') belum tamat. Seksyen Refleksi disorokkan. Anda hanya boleh menyimpan Draf.';
    
    if (sectionRefleksi) sectionRefleksi.classList.add('hidden');
    if (capaiInput) capaiInput.disabled = true;
  } else {
    if (banner) banner.className = 'p-3 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-900 font-semibold text-xs';
    if (msgTxt) msgTxt.innerHTML = '🔓 Waktu PdPC telah tamat (' + masaTamatStr + '). Sila lengkapkan refleksi untuk menghantar RPH.';
    
    if (sectionRefleksi) sectionRefleksi.classList.remove('hidden');
    if (capaiInput) {
      capaiInput.disabled = false;
      capaiInput.classList.remove('bg-slate-100', 'cursor-not-allowed');
    }
  }

  validateSubmitButtonState();
}

/**
 * Tarik Data DSKP dan Populasikan Dropdown Tema
 */
function fetchDskpData(subjek, kelas, callback) {
  const badge = document.getElementById('dskpStatusBadge');
  if (badge) badge.textContent = '⏳ Sedang menarik DSKP...';

  const tahun = kelas ? kelas.charAt(0) : '1';

  fetchBackendApi('getDskpData', { subjek: subjek, tahun: tahun })
    .then(res => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        currentDskpList = res.data;
        if (badge) {
          badge.textContent = '✅ DSKP Ditemui (' + res.data.length + ' Item)';
          badge.className = 'text-[11px] text-emerald-600 font-bold';
        }
        populateDskpDropdowns();
      } else {
        if (badge) {
          badge.textContent = '⚠️ Tiada DSKP padan. Sila isi secara manual.';
          badge.className = 'text-[11px] text-amber-600 font-medium';
        }
        currentDskpList = [];
        populateDskpDropdowns();
      }
      if (typeof callback === 'function') callback();
    })
    .catch(err => {
      console.error('Ralat DSKP:', err);
      if (badge) badge.textContent = '❌ Ralat DSKP';
      if (typeof callback === 'function') callback();
    });
}

/**
 * Populasikan Dropdown Tema/Unit Sahaja Dahulu
 */
function populateDskpDropdowns() {
  const themeSelect = document.getElementById('rphThemeSelect');
  const tajukSelect = document.getElementById('rphTajukSelect');

  if (themeSelect) themeSelect.innerHTML = '<option value="">-- Pilih Tema / Unit --</option>';
  if (tajukSelect) tajukSelect.innerHTML = '<option value="">-- Pilih Tajuk --</option>';

  const themes = [...new Set(currentDskpList.map(item => item.tema_unit).filter(Boolean))];
  themes.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    if (themeSelect) themeSelect.appendChild(opt);
  });
}

/**
 * Kemas Kini Pilihan Dropdown Tajuk Berdasarkan Tema/Unit yang Dipilih (DROPDOWN BERKAIT)
 */
function updateTajukDropdown(selectedTheme) {
  const tajukSelect = document.getElementById('rphTajukSelect');
  if (!tajukSelect) return;

  tajukSelect.innerHTML = '<option value="">-- Pilih Tajuk --</option>';

  if (!selectedTheme) return;

  // Tapis DSKP untuk mendapatkan Tajuk-Tajuk di bawah Tema/Unit ini sahaja
  const filteredDskp = currentDskpList.filter(item => item.tema_unit === selectedTheme);
  const tajuks = [...new Set(filteredDskp.map(item => item.tajuk).filter(Boolean))];

  tajuks.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    tajukSelect.appendChild(opt);
  });
}

/**
 * Peristiwa Penukaran Tema/Unit -> Populasikan Tajuk Berkaitan & Kosongkan Medan Borang
 */
function onThemeChange() {
  const selectedTheme = document.getElementById('rphThemeSelect').value;
  updateTajukDropdown(selectedTheme);
  
  // Kosongkan medan DSKP sehingga Tajuk dipilih
  clearDskpFormFields();
}

/**
 * Peristiwa Penukaran Tajuk -> Lakukan Auto-fill
 */
function onTajukChange() {
  autoFillDskpContent();
}

function clearDskpFormFields() {
  document.getElementById('rphSP').value = '';
  document.getElementById('rphOP').value = '';
  document.getElementById('rphKK').value = '';
  document.getElementById('rphActStart').value = '';
  document.getElementById('rphActMain').value = '';
  document.getElementById('rphActEnd').value = '';
}

/**
 * Auto-fill Medan DSKP Hanya Apabila KEDUA-DUA Tema DAN Tajuk Dipilih
 */
function autoFillDskpContent() {
  const selectedTheme = document.getElementById('rphThemeSelect').value;
  const selectedTajuk = document.getElementById('rphTajukSelect').value;

  // KETAT: Mesti memilih KEDUA-DUA Tema dan Tajuk
  if (!selectedTheme || !selectedTajuk) {
    clearDskpFormFields();
    return;
  }

  // Cari rekod DSKP yang sepadan secara tepat dengan Tema DAN Tajuk
  const matched = currentDskpList.find(item => 
    item.tema_unit === selectedTheme && item.tajuk === selectedTajuk
  );

  if (matched) {
    document.getElementById('rphSP').value       = matched.sp || '';
    document.getElementById('rphOP').value       = matched.objektif || '';
    document.getElementById('rphKK').value       = matched.kriteria_kejayaan || '';
    document.getElementById('rphActStart').value = matched.set_induksi || '';
    document.getElementById('rphActMain').value  = matched.aktiviti || '';
    document.getElementById('rphActEnd').value   = matched.rumusan || '';
  } else {
    clearDskpFormFields();
  }
}

function calculateRefleksi() {
  const chkPdpc = document.getElementById('chkPdpcPostponed');
  const isPostponed = chkPdpc ? chkPdpc.checked : false;
  const capaiInput = parseInt(document.getElementById('rphCapaiCount').value, 10) || 0;
  const totalStudents = attendanceDataGlobal.hadir || 0;

  const txtCapai = document.getElementById('txtCapaiOp');
  const txtBimbingan = document.getElementById('txtBimbingan');
  const txtTidakCapai = document.getElementById('txtTidakCapai');

  if (isPostponed) {
    const reason = document.getElementById('rphPdpcReason').value || 'PdPC Ditangguhkan';
    if (txtCapai) txtCapai.textContent = '0 / ' + totalStudents;
    if (txtBimbingan) txtBimbingan.textContent = '0 / ' + totalStudents;
    if (txtTidakCapai) txtTidakCapai.textContent = '0 / ' + totalStudents;
    document.getElementById('rphReflectCount').value = 'PdPC tidak dapat dijalankan kerana ' + reason + '.';
    validateSubmitButtonState();
    return;
  }

  let capai = capaiInput > totalStudents ? totalStudents : capaiInput;
  let tidakCapai = totalStudents - capai;

  if (txtCapai) txtCapai.textContent = capai + ' / ' + totalStudents;
  if (txtBimbingan) txtBimbingan.textContent = '0 / ' + totalStudents;
  if (txtTidakCapai) txtTidakCapai.textContent = tidakCapai + ' / ' + totalStudents;

  document.getElementById('rphReflectCount').value = capai + ' / ' + totalStudents + ' orang murid capai objektif.';
  
  validateSubmitButtonState();
}

function togglePdpcReason() {
  const chk = document.getElementById('chkPdpcPostponed');
  const box = document.getElementById('pdpcReasonBox');
  if (chk && chk.checked) {
    box.classList.remove('hidden');
  } else if (box) {
    box.classList.add('hidden');
  }
  calculateRefleksi();
}

function getCheckedValuesByName(name) {
  const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(checkboxes).map(cb => cb.value);
}

function setCheckedValuesByName(name, valData) {
  const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
  if (!checkboxes || checkboxes.length === 0) return;

  let strVal = '';
  if (Array.isArray(valData)) {
    strVal = valData.join(', ');
  } else {
    strVal = String(valData || '');
  }

  checkboxes.forEach(cb => {
    if (strVal && strVal.toLowerCase().includes(cb.value.toLowerCase())) {
      cb.checked = true;
    } else {
      cb.checked = false;
    }
  });
}

/**
 * SIMPAN DRAF ATAU HANTAR REKOD RPH
 */
function saveDraftRPH() { saveRphRecordWithStatus('Draf'); }
function submitRphForm() { saveRphRecordWithStatus('Hantar'); }

function saveRphRecordWithStatus(statusTarget) {
  if (statusTarget === 'Hantar') {
    const sectionRefleksi = document.getElementById('sectionRefleksiWrapper');
    if (sectionRefleksi && sectionRefleksi.classList.contains('hidden')) {
      showToast('Gagal Hantar: Waktu PdPC belum tamat untuk melengkapkan refleksi!', '⚠️');
      return;
    }

    const chkPdpc = document.getElementById('chkPdpcPostponed');
    const isPostponed = chkPdpc ? chkPdpc.checked : false;
    const capaiVal = parseInt(document.getElementById('rphCapaiCount').value, 10) || 0;

    if (isPostponed) {
      const reason = (document.getElementById('rphPdpcReason').value || '').trim();
      if (!reason) {
        showToast('Gagal Hantar: Sila nyatakan sebab PdPC ditangguhkan!', '⚠️');
        return;
      }
    } else {
      if (capaiVal <= 0) {
        showToast('Gagal Hantar: Sila isi bilangan murid yang mencapai objektif (> 0)!', '⚠️');
        return;
      }
    }
  }

  const emailGuru = window.currentUser ? (window.currentUser.email || window.currentUser.Email || window.currentUser.emel || '') : '';
  const namaGuru  = window.currentUser ? (window.currentUser.nama || window.currentUser.Nama_Guru || window.currentUser.name || '') : '';
  const existingIdRph = document.getElementById('rphIdHidden') ? document.getElementById('rphIdHidden').value : '';

  const payload = {
    action: 'saveErph',
    data: {
      idRph: existingIdRph,
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
        
        if (res.idRph && document.getElementById('rphIdHidden')) {
          document.getElementById('rphIdHidden').value = res.idRph;
        }

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

function resetRphFormFields() {
  if (document.getElementById('rphIdHidden')) {
    document.getElementById('rphIdHidden').value = '';
  }
  document.getElementById('rphTime').value = '';
  document.getElementById('rphSubjectSelect').value = '';
  document.getElementById('rphClass').value = '';
  document.getElementById('rphThemeSelect').innerHTML = '<option value="">-- Pilih Tema / Unit --</option>';
  document.getElementById('rphTajukSelect').innerHTML = '<option value="">-- Pilih Tajuk --</option>';
  clearDskpFormFields();
  document.getElementById('rphKehadiranDisplay').value = '0 / 0 orang murid';
  document.getElementById('rphCapaiCount').value = '0';
  document.getElementById('rphReflectNote').value = '';
  
  const sectionRefleksi = document.getElementById('sectionRefleksiWrapper');
  if (sectionRefleksi) sectionRefleksi.classList.remove('hidden');

  calculateRefleksi();
}

/**
 * EDIT / LANJUT RPH DRAF DARIPADA DASHBOARD GURU
 */
function editRphRecord(idRph) {
  if (!idRph) return;

  const list = window.currentGuruRphList || state.rphList || [];
  const item = list.find(r => String(r.idRph) === String(idRph));

  if (!item) {
    showToast('Rekod RPH tidak dijumpai.', '⚠️');
    return;
  }

  if (typeof setActiveTab === 'function') {
    setActiveTab('tabBuilder');
  }

  const hiddenIdEl = document.getElementById('rphIdHidden');
  if (hiddenIdEl) hiddenIdEl.value = item.idRph;

  document.getElementById('rphDate').value = item.tarikh || '';
  
  let masaMulaClean = cleanTimeFormatFrontend(item.masaMula);
  let masaTamatClean = cleanTimeFormatFrontend(item.masaTamat);
  let timeStr = (masaMulaClean && masaTamatClean) ? `${item.hari || ''} (${masaMulaClean} - ${masaTamatClean})` : (item.hariMasa || item.hari || '');
  document.getElementById('rphTime').value = timeStr;
  
  document.getElementById('rphSubjectSelect').value = item.subjek || '';
  document.getElementById('rphClass').value = item.kelas || '';

  // Tarik DSKP Dahulu Sebelum Menetapkan Nilai Dropdown Tema/Unit & Tajuk Berkait
  fetchDskpData(item.subjek, item.kelas, () => {
    const themeSelect = document.getElementById('rphThemeSelect');
    const tajukSelect = document.getElementById('rphTajukSelect');

    const targetTema = item.temaUnit || '';
    const targetTajuk = item.tajuk || item.tajukBidang || '';

    // 1. Tetapkan Tema/Unit
    if (themeSelect && targetTema) {
      let themeExists = Array.from(themeSelect.options).some(opt => opt.value === targetTema);
      if (!themeExists) {
        let opt = document.createElement('option');
        opt.value = targetTema;
        opt.textContent = targetTema;
        themeSelect.appendChild(opt);
      }
      themeSelect.value = targetTema;
    }

    // 2. Kemaskini Dropdown Tajuk Mengikut Tema Ini
    updateTajukDropdown(targetTema);

    // 3. Tetapkan Tajuk
    if (tajukSelect && targetTajuk) {
      let tajukExists = Array.from(tajukSelect.options).some(opt => opt.value === targetTajuk);
      if (!tajukExists) {
        let opt = document.createElement('option');
        opt.value = targetTajuk;
        opt.textContent = targetTajuk;
        tajukSelect.appendChild(opt);
      }
      tajukSelect.value = targetTajuk;
    }
  });

  document.getElementById('rphSP').value = item.standardPembelajaran || item.sp || '';
  document.getElementById('rphOP').value = item.objektifPembelajaran || item.op || '';
  document.getElementById('rphKK').value = item.kriteriaKejayaan || item.kk || '';

  document.getElementById('rphActStart').value = item.aktivitiPemula || item.actStart || '';
  document.getElementById('rphActMain').value = item.aktivitiUtama || item.actMain || '';
  document.getElementById('rphActEnd').value = item.aktivitiPenutup || item.actEnd || '';

  setCheckedValuesByName('chkBbm', item.bbm);
  setCheckedValuesByName('chkEmk', item.emk);
  setCheckedValuesByName('chkKbat', item.kbat);
  setCheckedValuesByName('chkPbd', item.pbd);

  document.getElementById('rphKehadiranDisplay').value = item.kehadiranMurid || '0 / 0 orang murid';
  document.getElementById('rphCapaiCount').value = item.refleksiBilCapai || 0;
  document.getElementById('rphReflectNote').value = item.catatanRefleksi || '';

  if (item.kehadiranMurid && item.kehadiranMurid.includes('/')) {
    let parts = item.kehadiranMurid.replace(/[^0-9\/]/g, '').split('/');
    if (parts.length === 2) {
      attendanceDataGlobal.hadir = parseInt(parts[0], 10) || 0;
      attendanceDataGlobal.total = parseInt(parts[1], 10) || 0;
    }
  }

  checkPdpcTimeAndFreeze(item.masaTamat);
  calculateRefleksi();

  const stampEl = document.getElementById('rphTimestampDisplay');
  if (stampEl) {
    stampEl.textContent = 'Mengedit Draf ID: ' + item.idRph;
  }

  showToast('Data Draf RPH berjaya dimuatkan!', '📝');
}

/**
 * BINA RPH DARI JADUAL WAKTU HARIAN (DIRECT)
 */
function binaRphDariJadualDirect(hariTarget, subjekTarget, kelasTarget) {
  if (typeof setActiveTab === 'function') {
    setActiveTab('tabBuilder');
  }

  resetRphFormFields();

  const selectDateDay = document.getElementById('builderSelectDateDay');
  if (!selectDateDay) return;

  let matchedOptIndex = -1;
  for (let i = 0; i < selectDateDay.options.length; i++) {
    if (selectDateDay.options[i].value.toLowerCase() === String(hariTarget).toLowerCase()) {
      matchedOptIndex = i;
      break;
    }
  }

  if (matchedOptIndex !== -1) {
    selectDateDay.selectedIndex = matchedOptIndex;
    
    onBuilderDateDayChange(() => {
      const selectSlot = document.getElementById('builderSelectSlot');
      if (!selectSlot || !currentJadualList || currentJadualList.length === 0) return;

      let slotIndexToSelect = -1;
      for (let idx = 0; idx < currentJadualList.length; idx++) {
        let s = currentJadualList[idx];
        let subjekMatch = (s.subjekShort.toLowerCase() === String(subjekTarget).toLowerCase() || 
                           s.subjekFull.toLowerCase() === String(subjekTarget).toLowerCase());
        let kelasMatch  = (s.kelas.toLowerCase() === String(kelasTarget).toLowerCase());

        if (subjekMatch && kelasMatch) {
          slotIndexToSelect = idx;
          break;
        }
      }

      if (slotIndexToSelect !== -1) {
        selectSlot.value = slotIndexToSelect;
        onBuilderSlotChange();
        showToast('Slot ' + subjekTarget + ' (' + kelasTarget + ') dipilih!', '⚡');
      }
    });
  }
}
