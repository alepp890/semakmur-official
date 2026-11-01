/**
 * SeMAKMUR Fi-Smart Kehadiran V1 (BACA SAHAJA).
 * Firebase Auth app name sama seperti Fi-LoginSession supaya berkongsi sesi.
 * Hanya 2 jenis bacaan: indeks kelas dan dokumen murid kelas terpilih.
 * Tiada penulisan kehadiran; tiada API Apps Script untuk membuka roster.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const $=id=>document.getElementById(id);
const localTimeZone='Asia/Kuala_Lumpur';
let app=null,auth=null,db=null,stopIndex=null,stopRoster=null;
let signedUser=null,index=null,selectedId='',selectedPupils=[],rosterCache=new Map();
const todayIso=()=>{
  const parts=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:localTimeZone}).formatToParts(new Date());
  const fields=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
};
function dateLabel(){
  return new Intl.DateTimeFormat('ms-MY',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:localTimeZone}).format(new Date());
}
function state(message,type='info'){$('status').textContent=message;$('status').className='state'+(type==='info'?'':' '+type);$('status').hidden=false;}
function clean(s){return String(s??'').trim();}
function bool(x){return x===true;}
function clearListeners(){if(stopIndex){stopIndex();stopIndex=null;}if(stopRoster){stopRoster();stopRoster=null;}}
function showLogIn(){
  clearListeners();index=null;selectedId='';selectedPupils=[];rosterCache.clear();
  $('user-pill').textContent='Belum login';$('classes').replaceChildren();$('pupils').replaceChildren();
  $('total-classes').textContent='—';$('total-pupils').textContent='—';$('confirmed-classes').textContent='—';
  const message=document.createElement('div');message.className='empty';
  message.textContent='Sila masuk melalui Fi-LoginSession untuk membuka senarai murid.';
  const link=document.createElement('a');link.href='../../Fi-LoginSession.html';link.textContent='Buka Fi-LoginSession';link.style.cssText='display:block;margin-top:10px;color:#196b89;font-weight:800';message.append(link);
  $('classes').append(message);
  $('pupils').innerHTML='<div class="empty">Sesi Firebase belum tersedia.</div>';
  $('selected-class').textContent='Senarai Murid';$('record-pill').hidden=true;
  state('Sila login dengan akaun MOE yang dibenarkan.','error');
}
function selectedClass(){return (index?.classes||[]).find(c=>c.docId===selectedId)||null;}
function validOverview(src){
  return !!src&&src.active===true&&Array.isArray(src.classes)&&Array.isArray(src.classIds)
    &&src.classes.every(c=>c&&typeof c.docId==='string'&&src.classIds.includes(c.docId))
    &&typeof src.dayKey==='string';
}
function cleanStatus(){
  const sourceDate=index?.dayKey;
  return sourceDate===todayIso();
}
function updateHeader(){
  $('day-pill').textContent=dateLabel();
  if(!index)return;
  const fresh=cleanStatus();
  const confirmed=fresh?index.classes.filter(c=>c.statusRekod==='DISAHKAN').length:null;
  $('total-classes').textContent=String(index.classes.length);
  $('total-pupils').textContent=String(index.totalPupils??'—');
  $('confirmed-classes').textContent=confirmed===null?'—':String(confirmed);
  const stamp=index.syncAt?.toDate?.();
  $('sync-pill').textContent=stamp?'Dikemas kini: '+new Intl.DateTimeFormat('ms-MY',{hour:'2-digit',minute:'2-digit',timeZone:localTimeZone}).format(stamp):'Salinan Firestore';
}
function classStatus(c){
  if(!cleanStatus())return {label:'Menunggu semakan hari ini',cls:'pending'};
  return c.statusRekod==='DISAHKAN'?{label:'Disahkan',cls:'done'}:{label:'Belum direkod',cls:'pending'};
}
function renderClasses(){
  const area=$('classes');area.replaceChildren();
  if(!index)return;
  const keyword=clean($('class-search').value).toLocaleLowerCase('ms');
  const classes=index.classes.filter(c=>clean(c.namaKelas).toLocaleLowerCase('ms').includes(keyword));
  $('class-counter').textContent=String(classes.length)+' kelas';
  if(!classes.length){const p=document.createElement('div');p.className='empty';p.textContent='Tiada kelas yang sepadan.';area.append(p);return;}
  for(const c of classes){
    const btn=document.createElement('button');btn.type='button';btn.className='class-btn'+(selectedId===c.docId?' active':'');
    btn.setAttribute('aria-pressed',String(selectedId===c.docId));
    const name=document.createElement('div');name.className='class-title';name.textContent=c.namaKelas;
    const bottom=document.createElement('div');bottom.className='class-bottom';
    const count=document.createElement('span');count.textContent=String(c.jumlahMurid??0)+' murid';
    const badge=document.createElement('span');const st=classStatus(c);badge.className='pill '+st.cls;badge.textContent=st.label;
    bottom.append(count,badge);btn.append(name,bottom);
    btn.addEventListener('click',()=>chooseClass(c.docId));area.append(btn);
  }
}
function renderRosterHeading(){
  const c=selectedClass();if(!c)return;
  $('selected-class').textContent=c.namaKelas;
  $('class-detail').textContent='Senarai murid aktif · '+String(c.jumlahMurid??0)+' murid';
  const pill=$('record-pill');const s=classStatus(c);
  pill.textContent=s.label;pill.className='pill '+s.cls;pill.hidden=false;
  const stats=$('roster-stats');stats.replaceChildren();stats.hidden=false;
  const add=(label,cls)=>{const el=document.createElement('span');el.className='roster-stat '+(cls||'');el.textContent=label;stats.append(el);};
  add('Jumlah murid: '+String(c.jumlahMurid??'—'));
  if(cleanStatus()&&c.statusRekod==='DISAHKAN'){
    add('Hadir: '+String(c.jumlahHadir??'—'),'good');add('Tidak hadir: '+String(c.jumlahTidakHadir??'—'),'warn');
  }else add(cleanStatus()?'Kehadiran belum disahkan':'Status hari ini belum diselaraskan','warn');
}
function renderPupils(){
  const area=$('pupils');area.replaceChildren();
  const word=clean($('pupil-search').value).toLocaleLowerCase('ms');
  const pupils=selectedPupils.filter(p=>clean(p.namaMurid).toLocaleLowerCase('ms').includes(word));
  if(!pupils.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=word?'Nama murid tidak ditemui.':'Tiada murid aktif direkodkan untuk kelas ini.';area.append(empty);return;}
  for(const p of pupils){
    const card=document.createElement('div');card.className='pupil';
    const no=document.createElement('span');no.className='pupil-no';no.textContent=String(selectedPupils.indexOf(p)+1);
    const name=document.createElement('span');name.className='pupil-name';name.textContent=clean(p.namaMurid);
    card.append(no,name);area.append(card);
  }
}
function showRoster(cdata,id){
  if(id!==selectedId)return;
  if(!cdata || cdata.active!==true || cdata.idKelas!==selectedClass()?.idKelas || !Array.isArray(cdata.murid)){
    state('Senarai kelas belum tersedia atau tidak sepadan. Semak log penyelaras.','error');return;
  }
  selectedPupils=cdata.murid;rosterCache.set(id,cdata);
  $('pupil-search').disabled=false;
  renderRosterHeading();renderPupils();
}
function chooseClass(docId){
  if(!index?.classIds?.includes(docId))return;
  if(stopRoster){stopRoster();stopRoster=null;}
  selectedId=docId;selectedPupils=[];$('pupil-search').value='';$('pupil-search').disabled=true;
  renderClasses();renderRosterHeading();
  $('pupils').innerHTML='<div class="empty">Membaca nama murid daripada Firestore…</div>';
  if(rosterCache.has(docId))showRoster(rosterCache.get(docId),docId);
  stopRoster=onSnapshot(doc(db,'semakmur_fi_kelas',docId),snap=>{
    if(!snap.exists()){state('Dokumen kelas belum diselaraskan.','error');return;}
    showRoster(snap.data(),docId);
  },err=>state('Gagal membaca senarai murid: '+(err.code||err.message)+'. Semak Firestore Rules.','error'));
}
function listenIndex(){
  clearListeners();
  state('Membaca indeks kelas daripada Firebase…');
  stopIndex=onSnapshot(doc(db,'semakmur_fi_kehadiran_index','active'),snap=>{
    if(!snap.exists()){state('Data Fi Kehadiran belum disediakan. Pentadbir perlu jalankan FiKehadiranJalankan.','error');return;}
    const data=snap.data();
    if(!validOverview(data)){state('Format salinan kelas tidak sah. Semak versi kod Auto Sync.','error');return;}
    index=data;
    if(selectedId && !index.classIds.includes(selectedId)){
      selectedId='';selectedPupils=[];if(stopRoster){stopRoster();stopRoster=null;}
    }
    updateHeader();renderClasses();
    if(selectedId){renderRosterHeading();if(selectedPupils.length)renderPupils();}
    else if(index.classes.length)chooseClass(index.classes[0].docId);
    state('Senarai kelas telah disambungkan ke Firebase. Paparan baca sahaja.','success');
  },err=>state('Tidak dapat membaca senarai kelas: '+(err.code||err.message)+'. Semak sesi Fi dan Firestore Rules.','error'));
}
$('class-search').addEventListener('input',renderClasses);
$('pupil-search').addEventListener('input',renderPupils);
$('day-pill').textContent=dateLabel();
let dayKey=todayIso();
setInterval(()=>{const today=todayIso();$('day-pill').textContent=dateLabel();if(today!==dayKey){dayKey=today;if(index){updateHeader();renderClasses();renderRosterHeading();}}},30000);
try{
  const config=window.SeMAKMURFirebasePilotConfig;
  if(!config?.projectId)throw new Error('Fail firebase-pilot-config.js tiada atau tidak sah.');
  // Sama seperti Fi-LoginSession dan Fi-DashboardGuru supaya sesi dikongsi.
  app=initializeApp(config,'semakmur-fi-dashboard');auth=getAuth(app);db=getFirestore(app);
  onAuthStateChanged(auth,user=>{
    signedUser=user;
    if(!user){showLogIn();return;}
    $('user-pill').textContent=clean(user.email)||'Akaun MOE';
    listenIndex();
  },err=>state('Sesi Firebase tidak dapat disahkan: '+err.message,'error'));
}catch(err){state('Konfigurasi Firebase gagal: '+err.message,'error');}
