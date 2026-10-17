/**
 * ==============================================================================
 * SEMAKMUR OFFICIAL & E-RPH DIGITAL - FRONTEND MODULE
 * FAIL: js/builder.js (Logik Pembina e-RPH, Penukaran Kod Subjek & Filter Slot Waktu)
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
 * Peristiwa Perubahan Minggu - Penjanaan Hari & Tarikh Sebenar (Contoh: Isnin (19/10/2026))
 */
function onBuilderWeekChange() {
  const weekVal = parseInt(document.getElementById('builderSelectWeek').value, 10) || 36;
  const selectDateDay = document.getElementById('builderSelectDateDay');
  if (!selectDateDay) return;

  selectDateDay.innerHTML = '<option value="">-- Pilih Hari / Tarikh --</option>';

  // Rujukan Minggu 36 Isnin (19/10/2026)
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
function onBuilderDateDayChange() {
  const selectDateDay = document.getElementById('builderSelectDateDay');
  const dayVal = selectDateDay.value;
  const selectSlot = document.getElementById('builderSelectSlot');
  if (!selectSlot) return;

  selectSlot.innerHTML = '<option value="">Sedang memuatkan jadual...</option>';
  resetRphFormFields();

  if (!dayVal) {
    selectSlot.innerHTML = '<option value="">-- Pilih Slot Jadual --</option>';
    return;
  }

  // Set Tarikh Auto mengikut pilihan
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
        
        // 1. Kumpulan & Penyatuan Slot Mengikut Subjek & Kelas
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

          // Cantumkan slot bersebelahan (Contoh Waktu 1: 07:40-08:10 + Waktu 2: 08:10-08:40 => 07:40-08:40)
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

          // PERATURAN 5: Jika wujud slot berganda (1 jam / >=50 min), abaikan/tapis slot 1 waktu terpisah (30 min)
          let hasLongSlot = merged.some(s => s.duration >= 50);
          if (hasLongSlot) {
            merged = merged.filter(s => s.duration >= 50);
          }

          processedSlots.push(...merged);
        });

        currentJadualList = processedSlots;

        // PERATURAN 3: Paparan ringkas dropdown: BM - 3 Violet
        currentJadualList.forEach((slot, index) => {
          const opt = document.createElement('option');
          opt.value = index;
          opt.textContent = `${slot.subjekShort} - ${slot.kelas}`;
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
 * Peristiwa Perubahan Slot Jadual -> Auto-fill Maklumat Asas & Penukaran Nama Subjek
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

  // 1. Isikan Maklumat Asas (Hari & Masa Mula-Tamat, Subjek Penuh & Kelas)
  document.getElementById('rphTime').value = `${hari} (${mula} - ${tamat})`;
  document.getElementById('rphSubjectSelect').value = subjekFull; // e.g. Bahasa Melayu
  document.getElementById('rphClass').value = kelas; // e.g. 3 Violet

  // 2. Tarik Data Kehadiran Automatik dari Sheet Data_Kehadiran
  const tarikhVal = document.getElementById('rphDate').value;
  fetchKehadiranData(tarikhVal, kelas);

  // 3. Semak Kawalan Masa PdPC (Time Freeze Logic)
  checkPdpcTimeAndFreeze(tamat);

  // 4. Dapatkan DSKP bagi Subjek Penuh & Kelas
  fetchDskpData(subjekFull, kelas);
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
 * Kawalan Pembekuan Refleksi Mengikut Masa Tamat PdPC
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

  const timeParts = masaTamatStr.replace(/[^0-9:]/g, '').split(':');
  if (timeParts.length < 2) return;

  let endHours = parseInt(timeParts[0], 10);
  let endMinutes = parseInt(timeParts[1], 10);

  if (masaTamatStr.toLowerCase().includes('pm') && endHours < 12) endHours += 12;
  if (masaTamatStr.toLowerCase().includes('am') && endHours === 12) endHours = 0;

  const endTimeInMinutes = (endHours * 60) + endMinutes;

  if (currentTimeInMinutes < endTimeInMinutes) {
    banner.className = 'p-3 bg-amber-100 border border-amber-300 rounded-xl flex items-center justify-between text-amber-900 font-semibold text-xs';
    msgTxt.innerHTML = '🔒 Masa PdPC slot ini (' + masaTamatStr + ') belum tamat. Seksyen Refleksi & Butang Penghantaran dibekukan sehingga PdPC selesai.';
    
    capaiInput.disabled = true;
    submitBtn.disabled = true;
    capaiInput.classList.add('bg-slate-100', 'cursor-not-allowed');
  } else {
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
    document.getElementById('rphOP').value   = matched.objektif || '';
    document.getElementById('rphKK').value   = matched.kriteria_kejayaan || '';
    document.getElementById('rphActStart').value = matched.set_induksi || '';
    document.getElementById('rphActMain').value  = matched.aktiviti || '';
    document.getElementById('rphActEnd').value   = matched.rumusan || '';
  }
}

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

function getCheckedValuesByName(name) {
  const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(checkboxes).map(cb => cb.value);
}

function saveDraftRPH() { saveRphRecordWithStatus('Draf'); }
function submitRphForm() { saveRphRecordWithStatus('Hantar'); }

function saveRphRecordWithStatus(statusTarget) {
  const emailGuru = window.currentUser ? (window.currentUser.email || window.currentUser.Email || window.currentUser.emel || '') : '';
  const namaGuru  = window.currentUser ? (window.currentUser.nama || window.currentUser.Nama_Guru || window.currentUser.name || '') : '';

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
