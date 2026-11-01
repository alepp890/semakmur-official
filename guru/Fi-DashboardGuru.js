/**
 * SeMAKMUR Fi Dashboard — Auto Sync V1.
 * Fi-DashboardGuru reads a read-only, server-managed Firestore copy.
 * All official operations / role authorization continue through Apps Script.
 * School data never written to Firestore by the browser.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, doc, getDocFromServer, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const $ = id => document.getElementById(id);
const config = window.SeMAKMURFirebasePilotConfig;
const norm = s => String(s || '').trim().toLowerCase();
const COLLECTION = 'semakmur_dashboard_fi';
let auth, db, user = null, running = false, backendVerification = null, stopListen = null;
function panel(title,message,login=false){
  $('fi-panel').hidden=false;
  $('fi-panel-title').textContent=title;
  $('fi-panel-message').textContent=message;
  $('fi-login-button').hidden=!login;
  $('fi-refresh-button').hidden=!user;
  $('fi-read-button').hidden=true;
}
function error(e){
  const raw=String(e?.message||e||'Ralat tidak diketahui');
  panel('Sambungan belum berjaya',raw,false);
  console.warn('Fi Dashboard:',e);
}
function busy(on){
  running=on;
  for(const id of ['fi-login-button','fi-refresh-button','fi-read-button'])$(id).disabled=on;
}
function showSignIn(){
  panel('Log masuk SeMAKMUR','Gunakan akaun Google MOE yang telah didaftarkan.',true);
}
function nowDate(){
  const parts=new Intl.DateTimeFormat('en-GB',{
    year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Kuala_Lumpur'
  }).formatToParts(new Date());
  const x=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return x.year+'-'+x.month+'-'+x.day;
}
function displaySnapshot(raw){
  if(!user || !raw || raw.active!==true || norm(raw.ownerEmail)!==norm(user.email)
     || norm(raw.profile?.email)!==norm(user.email)){
    throw new Error('Salinan data belum disahkan untuk akaun MOE ini.');
  }
  const isToday=raw.dayKey===nowDate();
  const res={success:true,profile:raw.profile||{},
    jadual:Array.isArray(raw.jadual)?raw.jadual:[],
    jadualTersedia:raw.jadualTersedia===true,
    peranan:Array.isArray(raw.peranan)?raw.peranan:[],
    rphStatusHariIni:isToday?(raw.rphStatusHariIni||[]):[],
    cutiHariIni:isToday?raw.cutiHariIni:{disahkan:false,cuti:false},
    integrasi:raw.integrasi||{}
  };
  const valid=window.fiApplyDashboard?.(res);
  if(!valid)throw new Error('Profil atau padanan guru belum disahkan.');
  // Don't obstruct the official dashboard with the former pilot status card.
  $('fi-panel').hidden=true;
  const syncTime=raw.syncAt?.toDate?.();
  $('header-status').textContent=syncTime?'Jadual terselaras':'Data salinan';
  if(syncTime){
    $('header-status').title='Jadual diselaraskan '+syncTime.toLocaleString('ms-MY',{timeZone:'Asia/Kuala_Lumpur'});
  }
}
function stop(){if(stopListen){stopListen();stopListen=null;}}
function watch(){
  stop();
  if(!user)return;
  const uid=user.uid;
  // Realtime listener means open dashboards receive changes without refresh.
  stopListen=onSnapshot(doc(db,COLLECTION,uid),snap=>{
    if(!user||uid!==user.uid)return;
    if(!snap.exists()){
      panel('Data belum disediakan','Pentadbir perlu menjalankan FiAutoSyncJalankan dalam projek penyelaras dahulu.');
      if($('v4-launch'))$('v4-launch').hidden=true;
      return;
    }
    try{displaySnapshot(snap.data());}catch(e){error(e);}
  },e=>{if(user&&uid===user.uid)error(e);});
}
async function read(){
  if(!user){showSignIn();return;}
  busy(true);
  try{
    const uid=user.uid,start=performance.now();
    const snap=await getDocFromServer(doc(db,COLLECTION,uid));
    if(!user||user.uid!==uid)return;
    if(!snap.exists()){
      panel('Data belum disediakan','Pentadbir perlu menjalankan FiAutoSyncJalankan dahulu.');
      if($('v4-launch'))$('v4-launch').hidden=true;
      return;
    }
    displaySnapshot(snap.data());
    console.info('Fi Dashboard Firestore read',Math.round(performance.now()-start),'ms');
  }catch(e){error(e);if($('v4-launch'))$('v4-launch').hidden=true;}
  finally{busy(false);}
}
// Historical public API is preserved, but users no longer write their own data.
async function importData(){return read();}
async function ensureOfficial(){
  if(!user)return false;
  if(window.FiBackendUser&&norm(window.FiBackendUser.email)===norm(user.email))return true;
  if(backendVerification)return backendVerification;
  backendVerification=(async()=>{
    try{
      const res=await window.SeMAKMURAuth?.verify?.();
      if(!res?.success||!res.user||norm(res.user.email)!==norm(user.email))
        throw new Error('Sesi SeMAKMUR rasmi tidak aktif atau akaun berbeza. Sila login semula.');
      window.FiBackendUser=res.user;
      if(typeof currentUser!=='undefined' && currentUser){
        currentUser.is_admin=res.user.is_admin===true;
        currentUser.guru_kelas=res.user.guru_kelas||'';
        if(typeof renderShortcuts==='function')renderShortcuts();
      }
      return true;
    }catch(e){error(e);return false;}
    finally{backendVerification=null;}
  })();
  return backendVerification;
}
async function signOutOnly(){
  stop();if(auth)await signOut(auth);
  user=null;window.FiAuthenticatedUser=null;window.FiBackendUser=null;
}
if(!config||!config.projectId){
  error('Konfigurasi Fi belum tersedia. Semak firebase-pilot-config.js.');
  window.fiBridgeReject?.(new Error('Konfigurasi tiada'));
}else{
  try{
    const app=initializeApp(config,'semakmur-fi-dashboard');
    auth=getAuth(app);db=getFirestore(app);
    window.FiDashboard={
      load:async()=>{
        await auth.authStateReady();
        if(!auth.currentUser){showSignIn();if($('v4-launch'))$('v4-launch').hidden=true;return;}
        user=auth.currentUser;window.FiAuthenticatedUser={uid:user.uid,email:user.email};
        watch();return read();
      },read,importData,ensureOfficial,signOutOnly,showSignIn
    };
    window.fiBridgeResolve?.(window.FiDashboard);
    onAuthStateChanged(auth,u=>{
      const prior=user?.uid;
      stop();user=u;
      window.FiAuthenticatedUser=u?{uid:u.uid,email:u.email}:null;
      if(!u){window.FiBackendUser=null;showSignIn();if($('v4-launch'))$('v4-launch').hidden=true;return;}
      if(prior&&prior!==u.uid)window.FiBackendUser=null;
      watch();read();
    },error);
  }catch(e){error(e);window.fiBridgeReject?.(e);}
}
$('fi-login-button').addEventListener('click',async()=>{
  try{
    busy(true);
    const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
    await signInWithPopup(auth,p);
  }catch(e){error(e);}finally{busy(false);}
});
$('fi-refresh-button').textContent='Semak Data';
$('fi-refresh-button').addEventListener('click',read);
$('fi-read-button').hidden=true;
$('fi-read-button').addEventListener('click',read);
