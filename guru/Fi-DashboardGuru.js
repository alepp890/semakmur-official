/** SeMAKMUR Fi Dashboard V4 — Firebase sahaja untuk Fi Dashboard/Kehadiran. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,onSnapshot} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const $=id=>document.getElementById(id),norm=s=>String(s||'').trim().toLowerCase();
let auth=null,db=null,user=null,stop=null,schoolStop=null,schoolDate=null,loaded=false,initial=false;
function note(t,m){
 $('fi-panel').hidden=false;$('fi-panel-title').textContent=t;$('fi-panel-message').textContent=m;
 $('fi-login-button').hidden=false;$('fi-refresh-button').hidden=true;$('fi-read-button').hidden=true;
 $('v4-launch-message').textContent=m;
}
function fail(e){const raw=String(e?.message||e||'Sambungan gagal');console.error('Fi Dashboard:',raw);note('Dashboard belum tersedia',raw);}
function dateMY(){
 const p=new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Kuala_Lumpur'}).formatToParts(new Date());
 const d=Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${d.year}-${d.month}-${d.day}`;
}
function apply(raw){
 if(!raw||raw.active!==true||norm(raw.ownerEmail)!==norm(user?.email)||norm(raw.profile?.email)!==norm(user?.email))throw new Error('Profil staf Firebase tidak sepadan atau tidak aktif.');
 const today=raw.dayKey===dateMY();
 const data={success:true,profile:raw.profile||{},jadual:Array.isArray(raw.jadual)?raw.jadual:[],peranan:Array.isArray(raw.peranan)?raw.peranan:[],
 jadualTersedia:raw.jadualTersedia===true,rphStatusHariIni:today?(raw.rphStatusHariIni||[]):[],cutiHariIni:today?raw.cutiHariIni:{disahkan:false,cuti:false},integrasi:raw.integrasi||{}};
 if(!window.fiApplyDashboard?.(data))throw new Error('Paparan Dashboard belum berjaya disahkan.');
 loaded=true;watchSchool();$('fi-panel').hidden=true;
 $('header-status').textContent='Data terselaras';
 $('v4-launch').hidden=true;
}
function watch(){
 if(stop){stop();stop=null;}
 if(!user)return;
 const uid=user.uid;
 stop=onSnapshot(doc(db,'semakmur_dashboard_fi',uid),snap=>{
   if(uid!==user?.uid)return;
   if(!snap.exists()){note('Akses belum diselaraskan','Akaun ini belum tersedia dalam Firestore. Jalankan FiAutoSyncJalankan di penyelaras.');return;}
   try{apply(snap.data());}catch(e){fail(e);}
 },fail);
}
function watchSchool(){
 if(!user||!db)return;
 const date=dateMY();if(schoolStop&&schoolDate===date)return;
 if(schoolStop)schoolStop();schoolDate=date;
 schoolStop=onSnapshot(doc(db,'semakmur_fi_ringkasan_sekolah',date),snap=>{
   window.fiApplySchoolSummary?.(snap.exists()?snap.data():null);
 },error=>{console.warn('Ringkasan Kehadiran belum tersedia:',error.code||error.message);window.fiApplySchoolSummary?.(null);});
}
setInterval(()=>{if(user&&schoolDate!==dateMY())watchSchool();},60000);
async function logout(){if(stop)stop();if(schoolStop)schoolStop();stop=schoolStop=null;if(auth)await signOut(auth);user=null;window.FiAuthenticatedUser=null;location.replace('../Fi-LoginSession.html');}
function login(){location.replace('../Fi-LoginSession.html');}
window.FiDashboard={
 load:async()=>{if(!auth)throw new Error('Firebase belum dimulakan.');await auth.authStateReady();if(!auth.currentUser){login();return;}user=auth.currentUser;window.FiAuthenticatedUser={uid:user.uid,email:user.email};if(!stop)watch();},
 read:async()=>{watch();},importData:async()=>{watch();},
 // Modul legacy boleh mengekalkan semakan pelayannya sendiri. Tiada panggilan Apps Script untuk Fi.
 ensureOfficial:async()=>false,signOutOnly:logout,showSignIn:login
};
$('fi-login-button').addEventListener('click',login);
$('fi-refresh-button').addEventListener('click',watch);
$('fi-read-button').addEventListener('click',watch);
try{
 const config=window.SeMAKMURFirebasePilotConfig;
 if(!config?.projectId)throw new Error('Konfigurasi firebase-pilot-config.js tiada.');
 const app=initializeApp(config,'semakmur-fi-dashboard');auth=getAuth(app);db=getFirestore(app);
 window.fiBridgeResolve?.(window.FiDashboard);
 onAuthStateChanged(auth,u=>{
   if(!u){if(stop)stop();stop=null;window.FiAuthenticatedUser=null;login();return;}
   if(u.uid!==user?.uid||!stop){user=u;window.FiAuthenticatedUser={uid:u.uid,email:u.email};watch();}
 },fail);
}catch(e){fail(e);window.fiBridgeReject?.(e);}
