function populateWeeksDropdowns() {
  const selectGuru = document.getElementById('selectWeekGuru');
  const selectBuilder = document.getElementById('builderSelectWeek');
   
  let html = '';
  for (let w = 36; w >= 1; w--) {
    html += `<option value="${w}">Minggu ${w}</option>`;
  }

  if (selectGuru) selectGuru.innerHTML = html;
  if (selectBuilder) selectBuilder.innerHTML = html;

  onBuilderWeekChange();
  calculateRefleksi();
}

async function fetchJadualHariIni(emailGuru) {
  const daysName = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
  let todayName = daysName[new Date().getDay()];
  if (todayName === "Ahad" || todayName === "Sabtu") todayName = "Isnin";

  const labelHari = document.getElementById('labelHariJadual');
  if (labelHari) labelHari.innerText = `Hari: ${todayName}`;

  try {
    const targetUrl = (typeof WEB_APP_URL !== 'undefined' && WEB_APP_URL) ? WEB_APP_URL : '';
    if (!targetUrl) return;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'getJadualGuruByHari',
        payload: { emailGuru: emailGuru, hari: todayName }
      })
    });

    const result = await response.json();
    if (result && result.success && Array.isArray(result.data)) {
      state.todayJadual = result.data;
      renderJadualWaktuWidget(todayName);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderJadualWaktuWidget(namaHari) {
  const container = document.getElementById('jadualWidgetContainer');
  if (!container) return;

  if (state.todayJadual.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl">Tiada slot mengajar hari ${namaHari}.</div>`;
    return;
  }

  let html = '';
  state.todayJadual.forEach((slot, idx) => {
    const waktu = slot.waktu || slot.Waktu || ('Waktu ' + (idx + 1));
    const jamMula = slot.jam_mula || slot.Jam_Mula || '-';
    const jamTamat = slot.jam_tamat || slot.Jam_Tamat || '-';
    const namaKelas = slot.nama_kelas || slot.Nama_Kelas || 'Kelas';
    const subjek = slot.subjek || slot.Subjek || 'Subjek';
    const kategori = slot.kategori || slot.Kategori || 'Biasa';

    html += `
      <div class="p-3.5 rounded-xl bg-teal-50/50 border border-teal-100">
        <div class="flex items-center justify-between text-xs text-brand-700 font-semibold mb-1">
          <span>${waktu} | ${jamMula} - ${jamTamat}</span>
          <span class="bg-teal-200/60 px-2 py-0.5 rounded text-[10px] font-bold">${namaKelas}</span>
        </div>
        <h4 class="font-bold text-slate-800 text-sm">${subjek}</h4>
        <p class="text-xs text-slate-500 mt-0.5">Kategori: ${kategori}</p>
        <div class="mt-2 flex items-center justify-between pt-2 border-t border-teal-100/60 text-xs">
          <span class="text-amber-700 font-medium">⏳ Menunggu e-RPH</span>
          <button onclick="setActiveTab('tabBuilder')" class="text-brand-600 hover:underline font-semibold">Bina RPH</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function combineConsecutiveSlots(slots) {
  if (!slots || slots.length === 0) return [];

  const combined = [];

  slots.forEach(slot => {
    const last = combined[combined.length - 1];
    const subjekCurrent = (slot.subjek || slot.Subjek || '').trim();
    const kelasCurrent = (slot.nama_kelas || slot.Nama_Kelas || '').trim();

    const subjekLast = last ? (last.subjek || last.Subjek || '').trim() : '';
    const kelasLast = last ? (last.nama_kelas || last.Nama_Kelas || '').trim() : '';

    if (last && subjekCurrent === subjekLast && kelasCurrent === kelasLast) {
      last.jam_tamat = slot.jam_tamat || slot.Jam_Tamat;
      last.waktu_label = `${last.waktu_awal} - ${slot.waktu || slot.Waktu}`;
      last.duration_count = (last.duration_count || 1) + 1;
    } else {
      combined.push({
        ...slot,
        waktu_awal: slot.waktu || slot.Waktu,
        waktu_label: slot.waktu || slot.Waktu,
        jam_mula: slot.jam_mula || slot.Jam_Mula,
        jam_tamat: slot.jam_tamat || slot.Jam_Tamat,
        subjek: subjekCurrent,
        nama_kelas: kelasCurrent,
        duration_count: 1
      });
    }
  });

  const multiPeriodKeys = new Set();
  combined.forEach(s => {
    if (s.duration_count > 1) {
      multiPeriodKeys.add(`${s.subjek.toLowerCase()}_${s.nama_kelas.toLowerCase()}`);
    }
  });

  return combined.filter(s => {
    const key = `${s.subjek.toLowerCase()}_${s.nama_kelas.toLowerCase()}`;
    if (multiPeriodKeys.has(key) && s.duration_count === 1) {
      return false;
    }
    return true;
  });
}

function onBuilderWeekChange() {
  const weekSelect = document.getElementById('builderSelectWeek');
  const weekNum = parseInt(weekSelect ? weekSelect.value : '36');
  const dateSelect = document.getElementById('builderSelectDateDay');
  if (!dateSelect) return;
  
  const hariList = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'];
  let html = '';
  
  hariList.forEach((hari, idx) => {
    const mockDate = `2026-10-${19 + idx}`;
    html += `<option value="${hari}|${mockDate}">${hari} (${mockDate})</option>`;
  });

  dateSelect.innerHTML = html;
  onBuilderDateDayChange();
}

async function onBuilderDateDayChange() {
  const valEl = document.getElementById('builderSelectDateDay');
  if (!valEl || !valEl.value) return;

  const [selectedHari, selectedDate] = valEl.value.split('|');
  const slotSelect = document.getElementById('builderSelectSlot');
  if (!slotSelect) return;
  
  const emailGuru = (state.currentUser && state.currentUser.email) ? state.currentUser.email : 'guru@moe-dl.edu.my';

  slotSelect.innerHTML = `<option value="">Sedang menarik slot ${selectedHari}...</option>`;

  try {
    const targetUrl = (typeof WEB_APP_URL !== 'undefined' && WEB_APP_URL) ? WEB_APP_URL : '';
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'getJadualGuruByHari',
        payload: { emailGuru: emailGuru, hari: selectedHari }
      })
    });

    const result = await response.json();
    if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
      const combinedSlots = combineConsecutiveSlots(result.data);
      state.allUserJadual = combinedSlots;

      let html = '<option value="">-- Pilih Slot Jadual --</option>';
      combinedSlots.forEach((slot, idx) => {
        const namaKelas = slot.nama_kelas;
        const subjekKode = slot.subjek;
        const subjekPenuh = SUBJECT_MAP[subjekKode] || subjekKode;

        html += `<option value="${idx}">${subjekPenuh} - ${namaKelas}</option>`;
      });

      slotSelect.innerHTML = html;
    } else {
      slotSelect.innerHTML = `<option value="">Tiada slot jadual pada ${selectedHari}</option>`;
    }
  } catch (err) {
    slotSelect.innerHTML = `<option value="">Ralat pangkalan data</option>`;
  }
}

function onBuilderSlotChange() {
  const slotEl = document.getElementById('builderSelectSlot');
  if (!slotEl) return;
  const idx = slotEl.value;
  if (idx === '' || !state.allUserJadual[idx]) return;

  const slot = state.allUserJadual[idx];
  const dateDayEl = document.getElementById('builderSelectDateDay');
  const [selectedHari, selectedDate] = dateDayEl ? dateDayEl.value.split('|') : ['Isnin', '2026-10-19'];
  const weekEl = document.getElementById('builderSelectWeek');
  const weekNum = weekEl ? weekEl.value : '36';

  const jamMula = slot.jam_mula || '';
  const jamTamat = slot.jam_tamat || '';
  const subjekKode = slot.subjek || '';
  const namaKelas = slot.nama_kelas || '';

  const subjekPenuh = SUBJECT_MAP[subjekKode] || subjekKode;

  // AUTO-PULL BILANGAN MURID DARI SHEET/SLOT
  const bilMurid = slot.bil_murid || slot.Bil_Murid || slot.bilMurid || slot.jumlah_murid || '35';
  const totalStudentsEl = document.getElementById('rphTotalStudents');
  if (totalStudentsEl) totalStudentsEl.value = bilMurid;

  if (document.getElementById('rphDate')) document.getElementById('rphDate').value = selectedDate;
  if (document.getElementById('rphTime')) document.getElementById('rphTime').value = `${selectedHari} (${jamMula} - ${jamTamat})`;
  if (document.getElementById('rphSubjectSelect')) document.getElementById('rphSubjectSelect').value = subjekPenuh;
  if (document.getElementById('rphClass')) document.getElementById('rphClass').value = namaKelas;

  if (document.getElementById('printMinggu')) document.getElementById('printMinggu').innerText = weekNum;
  if (document.getElementById('printTarikh')) document.getElementById('printTarikh').innerText = selectedDate;
  if (document.getElementById('printHariMasa')) document.getElementById('printHariMasa').innerText = `${selectedHari} (${jamMula} - ${jamTamat})`;
  if (document.getElementById('printSubjek')) document.getElementById('printSubjek').innerText = subjekPenuh;
  if (document.getElementById('printKelas')) document.getElementById('printKelas').innerText = namaKelas;

  let tahunMatch = namaKelas.match(/\d+/);
  let tahun = tahunMatch ? tahunMatch[0] : '3';

  fetchDskpData(subjekPenuh, tahun);
  calculateRefleksi();
}

async function fetchDskpData(subjek, tahun) {
  const badge = document.getElementById('dskpStatusBadge');
  if (badge) {
    badge.innerText = '⏳ Sedang menarik DSKP dari pangkalan data...';
    badge.className = 'text-[11px] text-amber-600 font-medium';
  }

  try {
    const targetUrl = (typeof WEB_APP_URL !== 'undefined' && WEB_APP_URL) ? WEB_APP_URL : '';
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'getDskpData',
        payload: { subjek: subjek, tahun: tahun }
      })
    });

    const result = await response.json();
    if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
      state.dskpList = result.data;
      
      let uniqueTema = [...new Set(result.data.map(item => item.tema_unit))];
      let themeSelect = document.getElementById('rphThemeSelect');
      let html = '<option value="">-- Pilih Tema / Unit --</option>';
      
      uniqueTema.forEach(t => {
        html += `<option value="${t}">${t}</option>`;
      });

      if (themeSelect) themeSelect.innerHTML = html;
      if (badge) {
        badge.innerText = `✓ DSKP ${subjek} Tahun ${tahun} Dimuatkan (${result.data.length} Rekod)`;
        badge.className = 'text-[11px] text-emerald-600 font-bold';
      }
    } else {
      if (badge) {
        badge.innerText = `⚠️ Tiada DSKP dijumpai bagi ${subjek} Tahun ${tahun}`;
        badge.className = 'text-[11px] text-rose-600 font-medium';
      }
    }
  } catch (err) {
    if (badge) badge.innerText = '❌ Ralat menarik DSKP';
  }
}

function onThemeChange() {
  const themeEl = document.getElementById('rphThemeSelect');
  const selectedTheme = themeEl ? themeEl.value : '';
  const tajukSelect = document.getElementById('rphTajukSelect');
  if (!tajukSelect) return;

  if (!selectedTheme) {
    tajukSelect.innerHTML = '<option value="">-- Pilih Tajuk --</option>';
    return;
  }

  const filteredList = state.dskpList.filter(item => item.tema_unit === selectedTheme);
  let html = '<option value="">-- Pilih Tajuk --</option>';

  filteredList.forEach(item => {
    html += `<option value="${item.tajuk}">${item.tajuk}</option>`;
  });

  tajukSelect.innerHTML = html;
}

function onTajukChange() {
  const themeEl = document.getElementById('rphThemeSelect');
  const tajukEl = document.getElementById('rphTajukSelect');
  const selectedTheme = themeEl ? themeEl.value : '';
  const selectedTajuk = tajukEl ? tajukEl.value : '';

  if (!selectedTheme || !selectedTajuk) return;

  const item = state.dskpList.find(x => x.tema_unit === selectedTheme && x.tajuk === selectedTajuk);
  if (item) {
    if (document.getElementById('rphSP')) document.getElementById('rphSP').value = item.sp || '';
    if (document.getElementById('rphOP')) document.getElementById('rphOP').value = item.objektif || '';
    if (document.getElementById('rphKK')) document.getElementById('rphKK').value = item.kriteria_kejayaan || '';
    if (document.getElementById('rphActStart')) document.getElementById('rphActStart').value = item.set_induksi || '';
    if (document.getElementById('rphActMain')) document.getElementById('rphActMain').value = item.aktiviti || '';
    if (document.getElementById('rphActEnd')) document.getElementById('rphActEnd').value = item.rumusan || '';

    if (document.getElementById('printTema')) document.getElementById('printTema').innerText = selectedTheme;
    if (document.getElementById('printTajuk')) document.getElementById('printTajuk').innerText = selectedTajuk;
    if (document.getElementById('printSP')) document.getElementById('printSP').innerText = item.sp || '';
    if (document.getElementById('printOP')) document.getElementById('printOP').innerText = item.objektif || '';
    if (document.getElementById('printKK')) document.getElementById('printKK').innerText = item.kriteria_kejayaan || '';
    if (document.getElementById('printActStart')) document.getElementById('printActStart').innerText = item.set_induksi || '';
    if (document.getElementById('printActMain')) document.getElementById('printActMain').innerText = item.aktiviti || '';
    if (document.getElementById('printActEnd')) document.getElementById('printActEnd').innerText = item.rumusan || '';

    showToast('Data DSKP (SP, OP, KK & Aktiviti) diisi secara automatik!', '✨');
  }
}

// LOGIK PENGIRAAN REFLEKSI & CATATAN IMPAK (PINDAAN TERKINI)
function calculateRefleksi() {
  const totalEl = document.getElementById('rphTotalStudents');
  const absentEl = document.getElementById('rphAbsentCount');
  const capaiEl = document.getElementById('rphCapaiCount');
  const chkPdpc = document.getElementById('chkPdpcPostponed');
  const reasonEl = document.getElementById('rphPdpcReason');

  const total = parseInt(totalEl ? totalEl.value : '0') || 0;
  const absent = parseInt(absentEl ? absentEl.value : '0') || 0;
  let capai = parseInt(capaiEl ? capaiEl.value : '0') || 0;

  const present = Math.max(0, total - absent);
  if (capai > present) {
    capai = present;
    if (capaiEl) capaiEl.value = capai;
  }

  const bimbingan = Math.max(0, present - capai);
  const tidakCapai = absent + bimbingan;

  const lblKehadiran = document.getElementById('lblKehadiran');
  if (lblKehadiran) lblKehadiran.innerText = `${absent} / ${total}`;

  const txtCapaiOp = document.getElementById('txtCapaiOp');
  if (txtCapaiOp) txtCapaiOp.innerText = `${capai} / ${total}`;

  const txtBimbingan = document.getElementById('txtBimbingan');
  if (txtBimbingan) txtBimbingan.innerText = `${bimbingan} / ${total}`;

  const txtTidakCapai = document.getElementById('txtTidakCapai');
  if (txtTidakCapai) txtTidakCapai.innerText = `${tidakCapai} / ${total}`;

  let reflectSummary = '';
  if (chkPdpc && chkPdpc.checked) {
    const reason = (reasonEl && reasonEl.value.trim() !== '') ? reasonEl.value.trim() : '________________________________';
    reflectSummary = `Pengajaran dan pembelajaran tidak dapat dijalankan pada hari ini dan akan diteruskan pada sesi pembelajaran seterusnya kerana: ${reason}`;
  } else {
    reflectSummary = `${capai} / ${total} orang murid dapat mencapai objektif pembelajaran yang ditetapkan.\n` +
                     `${bimbingan} / ${total} orang murid dapat mencapai objektif pembelajaran dengan bimbingan.\n` +
                     `${tidakCapai} / ${total} orang murid tidak berjaya mencapai objektif pembelajaran.`;
  }

  const reflectCountEl = document.getElementById('rphReflectCount');
  if (reflectCountEl) reflectCountEl.value = reflectSummary;

  const printReflectCount = document.getElementById('printReflectCount');
  if (printReflectCount) printReflectCount.innerText = reflectSummary;

  const noteInput = document.getElementById('rphReflectNote');
  const printNote = document.getElementById('printReflectNote');
  if (printNote && noteInput) {
    printNote.innerText = noteInput.value || 'Bimbingan pemulihan berterusan dijalankan.';
  }

  return reflectSummary;
}

function togglePdpcReason() {
  const chkPdpc = document.getElementById('chkPdpcPostponed');
  const reasonBox = document.getElementById('pdpcReasonBox');
  if (reasonBox) {
    if (chkPdpc && chkPdpc.checked) {
      reasonBox.classList.remove('hidden');
    } else {
      reasonBox.classList.add('hidden');
    }
  }
  calculateRefleksi();
}

async function processRphSaveOrSubmit(statusRph) {
  const subjekEl = document.getElementById('rphSubjectSelect');
  const tarikhEl = document.getElementById('rphDate');

  const subjek = subjekEl ? subjekEl.value : '';
  const tarikh = tarikhEl ? tarikhEl.value : '';

  if (!subjek || !tarikh) {
    alert('Sila pilih Slot Jadual (Minggu, Hari/Tarikh & Slot) terlebih dahulu sebelum menyimpan!');
    return;
  }

  const emailGuru = state.currentUser ? (state.currentUser.email || state.currentUser.Email || '') : '';
  const namaGuru = state.currentUser ? (state.currentUser.nama || state.currentUser.Nama_Guru || state.currentUser.name || '') : '';

  calculateRefleksi();

  const payload = {
    rphId: state.currentRphId || '',
    emailGuru: emailGuru,
    namaGuru: namaGuru,
    minggu: document.getElementById('builderSelectWeek') ? document.getElementById('builderSelectWeek').value : '36',
    tarikh: tarikh,
    hariMasa: document.getElementById('rphTime') ? document.getElementById('rphTime').value : '',
    subjek: subjek,
    kelas: document.getElementById('rphClass') ? document.getElementById('rphClass').value : '',
    temaUnit: document.getElementById('rphThemeSelect') ? document.getElementById('rphThemeSelect').value : '',
    tajuk: document.getElementById('rphTajukSelect') ? document.getElementById('rphTajukSelect').value : '',
    sp: document.getElementById('rphSP') ? document.getElementById('rphSP').value : '',
    op: document.getElementById('rphOP') ? document.getElementById('rphOP').value : '',
    kk: document.getElementById('rphKK') ? document.getElementById('rphKK').value : '',
    actStart: document.getElementById('rphActStart') ? document.getElementById('rphActStart').value : '',
    actMain: document.getElementById('rphActMain') ? document.getElementById('rphActMain').value : '',
    actEnd: document.getElementById('rphActEnd') ? document.getElementById('rphActEnd').value : '',
    reflectCount: document.getElementById('rphReflectCount') ? document.getElementById('rphReflectCount').value : '',
    reflectNote: document.getElementById('rphReflectNote') ? document.getElementById('rphReflectNote').value : '',
    statusRph: statusRph
  };

  showToast(statusRph === 'Draf' ? 'Sedang menyimpan draf ke Google Sheets...' : 'Sedang menghantar e-RPH...', '⏳');

  try {
    const targetUrl = (typeof WEB_APP_URL !== 'undefined' && WEB_APP_URL) ? WEB_APP_URL : '';
    if (!targetUrl) {
      alert('Ralat: URL Web App Google Script tidak dijumpai dalam config.js!');
      return;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveRph',
        payload: payload
      })
    });

    const result = await response.json();

    if (result && result.success) {
      state.currentRphId = result.idRph || result.rphId;

      if (document.getElementById('rphTimestampDisplay')) {
        document.getElementById('rphTimestampDisplay').innerText = `Status: ${statusRph} (${result.timestamp || ''})`;
      }

      showToast(result.message || 'Berjaya disimpan!', statusRph === 'Draf' ? '💾' : '🚀');
    } else {
      alert('Gagal menyimpan ke Google Sheets: ' + (result.error || result.message || 'Ralat tidak diketahui'));
    }
  } catch (err) {
    console.error("Ralat Fetch RPH:", err);
    alert('Ralat sambungan ke backend Google Sheets! Sila semak sambungan rangkaian atau URL Web App.');
  }
}

function saveDraftRPH() {
  processRphSaveOrSubmit('Draf');
}

function submitRphForm() {
  processRphSaveOrSubmit('Hantar');
}

function changeWeekGuru() {
  const selectGuru = document.getElementById('selectWeekGuru');
  const weekVal = selectGuru ? selectGuru.value : '36';
  if (document.getElementById('labelWeekBadge')) {
    document.getElementById('labelWeekBadge').innerText = `Minggu ${weekVal}`;
  }
  showToast(`Rekod dikemaskini untuk Minggu ${weekVal}`, '📅');
}

function filterGuruTableByDay() {}
