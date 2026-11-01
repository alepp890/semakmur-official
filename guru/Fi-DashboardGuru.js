/* SeMAKMUR Fi Dashboard Guru V1 — Firestore is a per-user display copy only.
   Backend Apps Script remains the authority for staff roles, profile edits and every module action. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,setDoc,serverTimestamp,getDocFromServer} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const $=id=>document.getElementById(id);
const config=window.SeMAKMURFirebasePilotConfig;
const dayKey=()=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Kuala_Lumpur'}).format(new Date());
const norm=s=>String(s||'').trim().toLowerCase();
const COLLECTION='semakmur_dashboard_fi';
let auth,db,user=null,running=false,backendVerification=null;
function panel(title,message,login=false){
  $('fi-panel').hidden=false;$('fi-panel-title').textContent=title;$('fi-panel-message').textContent=message;
  $('fi-login-button').hidden=!login;
  $('fi-refresh-button').hidden=!user;
  $('fi-read-button').hidden=!user;
}
function error(e){const raw=String(e?.message||e||'Ralat tidak diketahui');panel('Sambungan belum berjaya',raw,false);console.warn('Fi Dashboard:',e);}
function busy(on){running=on;for(const id of ['fi-login-button','fi-refresh-button','fi-read-button'])$(id).disabled=on;}
function showSignIn(){panel('Log masuk SeMAKMUR','Gunakan akaun Google MOE yang telah didaftarkan.',true);}
function nowDate(){
  const d=new Date();
  const parts=new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Kuala_Lumpur'}).formatToParts(d);
  const x=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return x.year+'-'+x.month+'-'+x.day;
}
function onlyText(v,max=180){return String(v??'').slice(0,max);}
function safeMap(o,fields){const out={};for(const [key,max] of fields){out[key]=onlyText(o?.[key],max);}return out;}
function cleanResponse(res){
  const data={
    ownerEmail:norm(user?.email),source:'apps_script_dashboard',schemaVersion:1,dayKey:nowDate(),
    profile:safeMap(res.profile,[['namaPenuh',120],['namaSamaran',75],['telefon',35],['email',160],['jawatan',90],['opsyen',110],['guruKelas',80]]),
    jadualTersedia:res.jadualTersedia===true,
    jadual:(Array.isArray(res.jadual)?res.jadual:[]).slice(0,150).map(s=>({
      ...safeMap(s,[['hari',30],['slot',55],['mula',25],['tamat',25],['waktu',20],['kelas',80],['subjek',110]]),pairing:s?.pairing===true
    })),
    peranan:(Array.isArray(res.peranan)?res.peranan:[]).slice(0,120).map(x=>safeMap(x,[['kategori',90],['jawatankuasa',160],['peranan',100],['skop',180]])),
    rphStatusHariIni:(Array.isArray(res.rphStatusHariIni)?res.rphStatusHariIni:[]).slice(0,100).map(x=>safeMap(x,[['kelas',80],['subjek',110],['mula',25],['tamat',25],['status',45]])),
    cutiHariIni:{disahkan:res.cutiHariIni?.disahkan===true,cuti:res.cutiHariIni?.cuti===true,nama:onlyText(res.cutiHariIni?.nama,130)},
    integrasi:{tindakan:false,hebahan:false,takwim:false,relief:false},
    importedAt:serverTimestamp()
  };
  if(data.profile.email.toLowerCase()!==norm(user?.email))throw new Error('Akaun MOE Firebase tidak sepadan dengan akaun Guru dalam Data Induk.');
  return data;
}
function displaySnapshot(raw){
  if(!raw||norm(raw.ownerEmail)!==norm(user?.email)||norm(raw.profile?.email)!==norm(user?.email))throw new Error('Data bukan milik akaun yang sedang login.');
  const isToday=raw.dayKey===nowDate();
  const res={success:true,profile:raw.profile||{},jadual:Array.isArray(raw.jadual)?raw.jadual:[],jadualTersedia:raw.jadualTersedia===true,
    peranan:Array.isArray(raw.peranan)?raw.peranan:[],
    rphStatusHariIni:isToday?(raw.rphStatusHariIni||[]):[],
    cutiHariIni:isToday?raw.cutiHariIni:{disahkan:false,cuti:false},
    integrasi:raw.integrasi||{}}
  const valid=window.fiApplyDashboard?.(res);
  if(!valid)throw new Error('Maklumat profil tidak sesuai atau akaun tidak dipadankan.');
  const at=raw.importedAt?.toDate?.();
  const saved=at?at.toLocaleString('ms-MY',{timeZone:'Asia/Kuala_Lumpur'}):'masa tidak diketahui';
  panel(isToday?'Data dashboard tersedia':'Salinan perlu disegarkan',
    'Salinan terakhir: '+saved+(isToday?' · Paparan daripada Firestore.':' · Maklumat hari ini mungkin sudah berubah.'),false);
  $('header-status').textContent=isToday?'Data salinan':'Salinan lama';
}
async function read(){
  if(!user){showSignIn();return;}
  busy(true);
  panel('Membaca data','Mendapatkan salinan Dashboard Guru…');
  try{
    const start=performance.now();
    const snapshot=await getDocFromServer(doc(db,COLLECTION,user.uid));
    if(!snapshot.exists()){
      panel('Belum ada salinan penuh','Klik “Segarkan Data” sekali. Proses pertama membaca data asal melalui Apps Script.');
      if($('v4-launch'))$('v4-launch').hidden=true;
      return;
    }
    displaySnapshot(snapshot.data());
    console.info('Fi Dashboard Firestore read',Math.round(performance.now()-start),'ms');
  }catch(e){error(e);if($('v4-launch'))$('v4-launch').hidden=true;}finally{busy(false);}
}
async function importData(){
  if(!user){showSignIn();return;}
  busy(true);panel('Menyelaraskan data','Membaca Dashboard asal yang telah disahkan oleh Apps Script…');
  try{
    if(!window.SeMAKMURAuth?.request)throw new Error('Komponen sesi SeMAKMUR belum tersedia.');
    const start=performance.now();
    const response=await SeMAKMURAuth.request({action:'getGuruDashboardData'});
    if(!response?.success)throw new Error(response?.error||'Sesi portal asal tidak aktif. Login SeMAKMUR dahulu, kemudian kembali ke sini.');
    // A successful protected endpoint call is a trusted proof of portal identity for current import.
    const data=cleanResponse(response);
    await setDoc(doc(db,COLLECTION,user.uid),data);
    console.info('Fi Dashboard import total',Math.round(performance.now()-start),'ms');
    await read();
  }catch(e){error(e);if($('v4-launch'))$('v4-launch').hidden=true;}finally{busy(false);}
}
async function ensureOfficial(){
  if(!user)return false;
  if(window.FiBackendUser && norm(window.FiBackendUser.email)===norm(user.email))return true;
  if(backendVerification)return backendVerification;
  backendVerification=(async()=>{
    try{
      const res=await window.SeMAKMURAuth?.verify?.();
      if(!res?.success||!res.user||norm(res.user.email)!==norm(user.email))throw new Error('Sesi rasmi tidak aktif atau akaun MOE berbeza. Login dalam portal SeMAKMUR asal dahulu.');
      window.FiBackendUser=res.user;
      if(typeof currentUser!=='undefined' && currentUser){
        currentUser.is_admin=res.user.is_admin===true;currentUser.guru_kelas=res.user.guru_kelas||'';
        if(typeof renderShortcuts==='function')renderShortcuts();
      }
      return true;
    }catch(e){error(e);return false;}
    finally{backendVerification=null;}
  })();
  return backendVerification;
}
async function signOutOnly(){if(auth)await signOut(auth);user=null;window.FiAuthenticatedUser=null;window.FiBackendUser=null;}

if(!config||!config.projectId){error('Konfigurasi fi belum tersedia. Pastikan firebase-pilot-config.js telah dimuat naik.');window.fiBridgeReject?.(new Error('Konfigurasi tiada'));}
else{
  try{
    const app=initializeApp(config,'semakmur-fi-dashboard');auth=getAuth(app);db=getFirestore(app);
    window.FiDashboard={load:async()=>{
      await auth.authStateReady();
      if(!auth.currentUser){showSignIn();if($('v4-launch'))$('v4-launch').hidden=true;return;}
      user=auth.currentUser;window.FiAuthenticatedUser={uid:user.uid,email:user.email};
      return read();
    },read,importData,ensureOfficial,signOutOnly,showSignIn};
    window.fiBridgeResolve?.(window.FiDashboard);
    onAuthStateChanged(auth,u=>{
      const prior=user?.uid;
      user=u;window.FiAuthenticatedUser=u?{uid:u.uid,email:u.email}:null;
      if(!u){window.FiBackendUser=null;showSignIn();if($('v4-launch'))$('v4-launch').hidden=true;return;}
      if(prior&&prior!==u.uid){window.FiBackendUser=null;}
      read();
    },error);
  }catch(e){error(e);window.fiBridgeReject?.(e);}
}
$('fi-login-button').addEventListener('click',async()=>{
  try{busy(true);const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,p);}catch(e){error(e);}finally{busy(false);}
});
$('fi-refresh-button').addEventListener('click',importData);
$('fi-read-button').addEventListener('click',read);
