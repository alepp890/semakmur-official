/**
 * SeMAKMUR Fi-Smart Kehadiran V2 — susun atur asal 2026, Firebase-first.
 * Penulisan rasmi KEHADIRAN hanya melalui Apps Script sedia ada selepas
 * semakan sesi dan kebenaran, bukan melalui Firestore terus.
 * Jangan letak kunci Service Account atau token rahsia di GitHub.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=s=>String(s??'').trim();
const msToday=()=>{
  const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const x=Object.fromEntries(p.filter(t=>t.type!=='literal').map(t=>[t.type,t.value]));
  return `${x.year}-${x.month}-${x.day}`;
};
const weekend=s=>{const [y,m,d]=String(s).split('-').map(Number);return [0,6].includes(new Date(Date.UTC(y,m-1,d)).getUTCDay());};
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''));
const matchDate=date=>date===msToday();
let app,auth,db,firebaseUser=null,appUser=null,index=null,selected=null,roster=null;
let stopIndex=null,stopRoster=null,serverState=null,serverSummary=null;
let authReady=false,serverReady=false,serverError='',req=0,saveBusy=false,absent=new Set(),confirmedLocal=false;
const rosterCache=new Map();
const getIndexClasses=()=>Array.isArray(index?.classes)?index.classes:[];
const getCurrentClass=()=>getIndexClasses().find(c=>c.docId===selected?.docId)||selected;
function info(message,error=false){$('message').textContent=message;$('message').classList.toggle('error',error);$('message').hidden=!message;}
function authLink(){
  $('classes').innerHTML='<div class="empty">Sila login melalui <a href="../../Fi-LoginSession.html">Fi-LoginSession</a> terlebih dahulu.</div>';
  $('details').innerHTML='<div class="empty">Sesi Firebase belum tersedia.</div>';
  $('account').textContent='Belum login';
  info('Sila login menggunakan akaun Google MOE.',true);
}
function stopListeners(){if(stopIndex){stopIndex();stopIndex=null;}if(stopRoster){stopRoster();stopRoster=null;}}
function logoutLocal(){req++;stopListeners();firebaseUser=null;appUser=null;index=null;selected=null;roster=null;serverState=null;serverSummary=null;serverReady=false;authReady=false;absent.clear();rosterCache.clear();authLink();}
function badgeState(c){
  if(weekend($('date').value))return {status:'Tiada sesi',done:false};
  const date=$('date').value;
  if(date===index?.dayKey){const done=c.statusRekod==='DISAHKAN';return {status:done?'Disahkan':'Belum Direkod',done};}
  if(serverSummary?.date===date){const x=serverSummary.items.find(i=>String(i.idKelas)===String(c.idKelas));if(x){const done=x.statusRekod==='DISAHKAN';return {status:done?'Disahkan':'Belum Direkod',done};}}
  return {status:'Semak Rekod',done:false};
}
function drawClasses(){
  const list=getIndexClasses();$('total').textContent=list.length+' kelas';
  if(!list.length){$('classes').innerHTML='<div class="empty">Senarai kelas belum tersedia daripada Firebase.</div>';return;}
  const term=text($('class-search')?.value).toLocaleLowerCase('ms');
  const filtered=term?list.filter(c=>text(c.namaKelas).toLocaleLowerCase('ms').includes(term)):list;
  $('classes').innerHTML=filtered.map(c=>{
    const b=badgeState(c),v=c.docId===selected?.docId;
    const total=Number(c.jumlahMurid||0);
    return `<button class="class${v?' selected':''}" type="button" data-doc="${esc(c.docId)}" aria-pressed="${v}"><div><strong>${esc(c.namaKelas)}</strong><small>${total} murid</small></div><span class="pill ${b.done?'done':weekend($('date').value)?'no-school':''}">${esc(b.status)}</span></button>`;
  }).join('')||'<div class="empty">Tiada kelas sepadan.</div>';
  $('classes').querySelectorAll('[data-doc]').forEach(el=>el.addEventListener('click',()=>choose(el.dataset.doc)));
}
function officialDone(){
  if(serverState?.statusRekod==='DISAHKAN')return true;
  const c=getCurrentClass();return $('date').value===index?.dayKey && c?.statusRekod==='DISAHKAN';
}
function canWrite(){return !!(appUser&&firebaseUser&&serverReady&&serverState?.bolehSahkan===true&&!officialDone()&&matchDate($('date').value)&&!weekend($('date').value)&&!saveBusy);}
function renderDetails(){
  const c=getCurrentClass();if(!c){$('student-title').textContent='Kehadiran Kelas';$('details').innerHTML='<div class="empty">Pilih kelas untuk memaparkan senarai murid.</div>';return;}
  $('student-title').textContent=c.namaKelas;
  if(!roster){$('details').innerHTML='<div class="empty">Membaca senarai murid daripada Firebase…</div>';return;}
  const students=Array.isArray(roster.murid)?roster.murid:[];
  const done=officialDone(),mayWrite=canWrite();
  const officialRows=Array.isArray(serverState?.murid)?serverState.murid:[];
  const saved=new Map(officialRows.map(m=>[m.idMurid,m]));
  const confirmedAbsent=officialRows.filter(m=>m.statusKehadiran==='TIDAK_HADIR');
  const absCount=done?(serverState?.statusRekod==='DISAHKAN'?confirmedAbsent.length:(c.jumlahTidakHadir??null)):absent.size;
  let hint='';
  if(done)hint=serverState?.statusRekod==='DISAHKAN'?'Rekod kehadiran telah disahkan.':'Rekod kelas telah disahkan. Butiran rasmi sedang disemak.';
  else if(!appUser)hint='Senarai murid daripada Firebase tersedia. Mengesahkan sesi SeMAKMUR untuk tindakan rasmi…';
  else if(!serverReady)hint='Senarai murid tersedia. Menyemak kebenaran mengesahkan melalui server rasmi…';
  else if(mayWrite)hint='Tandakan murid yang TIDAK HADIR, kemudian sahkan rekod.';
  else hint='Rekod belum disahkan. Pengesahan tidak dibenarkan untuk akaun, tarikh atau waktu ini.';
  const doneAbs=done && serverState?.statusRekod==='DISAHKAN';
  const countAbs=Number.isInteger(absCount)?absCount:null;
  const confirmedPresent=(done&&serverState?.statusRekod!=='DISAHKAN'&&Number.isInteger(c.jumlahHadir))?c.jumlahHadir:null;
  const shownPresent=confirmedPresent!==null?confirmedPresent:(countAbs!==null?students.length-countAbs:null);
  const metrics=`<div class="metrics"><div class="metric"><strong>${students.length}</strong> Jumlah Murid</div><div class="metric"><strong id="metric-present">${shownPresent===null?'—':shownPresent}</strong> ${done?'Hadir':'Anggaran Hadir'}</div><div class="metric"><strong id="metric-absent">${countAbs!==null?countAbs:'—'}</strong> Tidak Hadir</div></div>`;
  let pupilUI='';
  if(doneAbs){
    pupilUI=confirmedAbsent.length?confirmedAbsent.map(m=>`<div class="student missing"><div><div class="name">${esc(m.namaMurid)}</div><div class="note">Tidak hadir</div></div></div>`).join(''):'<div class="empty">Tiada murid tidak hadir dalam rekod rasmi.</div>';
  }else if(done){
    pupilUI=`<div class="empty">Senarai murid tidak hadir akan muncul selepas semakan rekod rasmi selesai. ${serverReady?'Sila gunakan Muat Semula untuk mencuba lagi.':''}</div>`;
  }else{
    pupilUI=`<input class="search" id="pupil-search" placeholder="Cari nama murid" aria-label="Cari murid">`+students.map((m,i)=>{
      const chosen=absent.has(m.idMurid),report=saved.get(m.idMurid)?.laporanPenjaga?.ada;
      return `<label class="student ${chosen?'missing':''}" data-name="${esc(text(m.namaMurid).toLocaleLowerCase('ms'))}"><input type="checkbox" data-pupil="${esc(m.idMurid)}" ${chosen?'checked':''} ${mayWrite?'':'disabled'}><span class="student-number">${i+1}</span><div><div class="name">${esc(m.namaMurid)}</div><div class="note">${report?'Ada laporan awal penjaga':mayWrite?'Tandakan jika TIDAK HADIR':'Paparan kelas · baca sahaja'}</div></div></label>`;
    }).join('');
  }
  let controls='';
  if(mayWrite){
    controls=`<div class="footer"><label class="ack"><input id="confirm" type="checkbox" ${confirmedLocal?'checked':''}> Saya mengesahkan semakan kehadiran murid.</label><button class="btn primary" id="save" type="button" ${confirmedLocal?'':'disabled'}>Sahkan Kehadiran</button></div>`;
  }else controls=`<div class="notice" style="margin-top:14px">${esc(done?'Rekod sudah disahkan. Pindaan memerlukan kebenaran pentadbir.':'Pengesahan rasmi dikawal oleh sesi, jadual dan server SeMAKMUR.')}</div>`;
  $('details').innerHTML=`<div class="muted">${esc(hint)}</div>${metrics}<div class="student-list">${pupilUI}</div>${controls}`;
  $('details').querySelectorAll('[data-pupil]').forEach(el=>el.addEventListener('change',()=>{
    if(!canWrite())return;
    el.checked?absent.add(el.dataset.pupil):absent.delete(el.dataset.pupil);
    el.closest('.student')?.classList.toggle('missing',el.checked);
    updateCounters(students.length);
  }));
  $('pupil-search')?.addEventListener('input',e=>{
    const term=text(e.target.value).toLocaleLowerCase('ms');
    $('details').querySelectorAll('[data-name]').forEach(el=>el.hidden=!el.dataset.name.includes(term));
  });
  $('confirm')?.addEventListener('change',e=>{confirmedLocal=e.target.checked;const save=$('save');if(save)save.disabled=!confirmedLocal||!canWrite();});
  $('save')?.addEventListener('click',save);
}
function updateCounters(total){$('metric-present').textContent=String(total-absent.size);$('metric-absent').textContent=String(absent.size);}
async function api(action,data){
  if(!window.SeMAKMURAuth)throw new Error('auth-client.js belum tersedia.');
  const res=await SeMAKMURAuth.request({action,data});
  if(!res?.success){const error=new Error(res?.error||'Permintaan gagal.');error.code=res?.code;throw error;}
  return res.data||{};
}
async function verifyOfficialSession(){
  if(!window.SeMAKMURAuth){serverError='auth-client.js tidak ditemui';info('Firebase siap. Sesi rasmi belum dapat disemak.',true);return;}
  try{
    appUser=await SeMAKMURAuth.requireUser(['guru','admin_choice'],'../../Fi-LoginSession.html');
    if(!appUser){serverError='Sila login melalui Fi-LoginSession';return;}
    $('account').textContent=appUser.is_admin?'Admin + Guru':'Guru';
    if(selected)await checkClassOfficial();
    else await fetchOfficialSummary();
  }catch(e){serverError=e.message;info('Data Firebase tersedia, tetapi sesi rasmi belum disahkan: '+e.message,true);if(selected)renderDetails();}
}
async function fetchOfficialSummary(){
  if(!appUser||!index)return;
  const date=$('date').value;if(!validDate(date))return;
  try{
    const data=await api('smartKehadiranGetKelasGuru',{tarikh:date});
    if(date!==$('date').value)return;
    serverSummary={date,items:Array.isArray(data.kelas)?data.kelas:[]};drawClasses();
  }catch(e){serverError=e.message;console.warn('Fi Kehadiran: semakan ringkasan',e);}
}
async function checkClassOfficial(){
  if(!appUser||!selected)return;
  const date=$('date').value,idKelas=selected.idKelas,request=++req;
  serverReady=false;serverState=null;absent.clear();confirmedLocal=false;renderDetails();
  try{
    const data=await api('smartKehadiranGetSenarai',{tarikh:date,idKelas});
    if(request!==req||!selected||selected.idKelas!==idKelas||$('date').value!==date)return;
    serverState=data;serverReady=true;
    if(data.statusRekod!=='DISAHKAN'){
      const reports=Array.isArray(data.murid)?data.murid:[];
      reports.filter(p=>p.laporanPenjaga?.ada).forEach(p=>absent.add(p.idMurid));
    }
    renderDetails();
    if(data.statusRekod==='DISAHKAN')info('Rekod rasmi kelas telah disahkan.');
    else info('Senarai daripada Firebase tersedia. Kebenaran pengesahan disemak.');
  }catch(e){
    if(request!==req)return;
    serverReady=false;serverState=null;serverError=e.message;
    info('Senarai murid daripada Firebase tersedia. Semakan rekod rasmi gagal: '+e.message,true);
    renderDetails();
  }
}
function applyRoster(docData,id){
  if(!selected||selected.docId!==id)return;
  if(!docData||docData.active!==true||docData.idKelas!==selected.idKelas||!Array.isArray(docData.murid)){
    info('Dokumen kelas tidak sepadan dengan indeks Firebase.',true);return;
  }
  roster=docData;rosterCache.set(id,docData);renderDetails();
}
function choose(docId){
  const c=getIndexClasses().find(c=>c.docId===docId);if(!c)return;
  ++req;if(stopRoster){stopRoster();stopRoster=null;}
  selected=c;roster=rosterCache.get(docId)||null;serverState=null;serverReady=false;absent.clear();confirmedLocal=false;
  drawClasses();renderDetails();
  const id=docId;
  stopRoster=onSnapshot(doc(db,'semakmur_fi_kelas',docId),snap=>{
    if(!snap.exists()){info('Data kelas belum tersedia pada Firebase.',true);return;}
    applyRoster(snap.data(),id);
  },err=>info('Bacaan murid Firebase gagal: '+(err.code||err.message),true));
  if(appUser)checkClassOfficial();
}
function connectIndex(){
  if(stopIndex)stopIndex();
  info('Membaca senarai kelas daripada Firebase…');
  stopIndex=onSnapshot(doc(db,'semakmur_fi_kehadiran_index','active'),snap=>{
    if(!snap.exists()){info('Senarai kelas belum diselaraskan ke Firebase.',true);return;}
    const data=snap.data();
    if(data.active!==true||!Array.isArray(data.classes)||!Array.isArray(data.classIds)){
      info('Format data Firebase tidak sah. Semak FiKehadiranSync.',true);return;
    }
    index=data;drawClasses();
    if(selected&&!data.classes.some(c=>c.docId===selected.docId)){
      selected=null;roster=null;if(stopRoster){stopRoster();stopRoster=null;}
    }
    if(selected){selected=getCurrentClass();renderDetails();}
    else if(data.classes.length)choose(data.classes[0].docId);
    if(appUser)fetchOfficialSummary();
    if(!serverError)info('');
  },e=>info('Gagal membaca Firebase: '+(e.code||e.message),true));
}
async function save(){
  if(saveBusy||!canWrite()||!confirmedLocal||!selected)return;
  saveBusy=true;renderDetails();info('Menyimpan kehadiran ke sistem rasmi…');
  try{
    await api('smartKehadiranSahkan',{tarikh:$('date').value,idKelas:selected.idKelas,tidakHadir:[...absent],version:serverState?.version});
    info('Kehadiran berjaya disahkan dalam pangkalan data rasmi.');
    saveBusy=false;
    await checkClassOfficial();await fetchOfficialSummary();
  }catch(e){
    saveBusy=false;confirmedLocal=false;
    info((e.code==='ALREADY_RECORDED'||e.code==='STALE')?'Rekod sudah berubah. Sila semak semula kelas.':e.message,true);
    await checkClassOfficial();
  }
}
function dateChange(){
  if(!validDate($('date').value)||$('date').value>msToday()){
    $('date').value=msToday();info('Tarikh tidak sah. Sila pilih tarikh hari ini atau sebelumnya.',true);
  }
  ++req;serverSummary=null;serverReady=false;serverState=null;absent.clear();confirmedLocal=false;
  drawClasses();renderDetails();if(appUser){fetchOfficialSummary();if(selected)checkClassOfficial();}
}
function boot(){
  $('date').value=msToday();$('date').max=msToday();
  $('date').addEventListener('change',dateChange);
  $('refresh').addEventListener('click',()=>{if(selected){checkClassOfficial();fetchOfficialSummary();}else fetchOfficialSummary();});
  if(!window.SeMAKMURFirebasePilotConfig?.projectId){info('Konfigurasi firebase-pilot-config.js tidak ditemui.',true);return;}
  try{
    app=initializeApp(window.SeMAKMURFirebasePilotConfig,'semakmur-fi-dashboard');
    auth=getAuth(app);db=getFirestore(app);
    onAuthStateChanged(auth,u=>{
      if(!u){logoutLocal();return;}
      firebaseUser=u;$('account').textContent=u.email||'Guru MOE';
      serverError='';connectIndex();verifyOfficialSession();
    },e=>info('Sesi Firebase gagal: '+e.message,true));
    let lastDate=msToday();
    setInterval(()=>{
      const d=msToday();if(d!==lastDate){lastDate=d;$('date').max=d;if($('date').value!==d){$('date').value=d;dateChange();}}
    },30000);
  }catch(e){info('Firebase tidak dapat dimulakan: '+e.message,true);}
}
boot();
