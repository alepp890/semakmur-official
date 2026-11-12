/* SeMAKMUR Fi V4.5.0 — optional auto-provision first login. */

import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithCredential,signInWithPopup,signOut,setPersistence,browserLocalPersistence} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const $=id=>document.getElementById(id), norm=s=>String(s||'').trim().toLowerCase();
// Tetapkan URL /exec daripada projek Apps Script FiAutoSync (Web App yang baharu).
// Ganti placeholder dengan URL Web App semasa pemasangan; login sedia ada tidak berubah.
const FI_PROVISION_WEBAPP_URL = String(window.SeMAKMURFiAPIConfig?.webAppExecUrl || '').trim();
function fiTrustedWebAppOrigin(origin){
  try{
    const url=new URL(origin), host=url.hostname.toLowerCase();
    return url.protocol==='https:' && !url.port &&
      (host==='script.google.com' || host==='script.googleusercontent.com' ||
       host.endsWith('.script.googleusercontent.com') ||
       host.endsWith('-script.googleusercontent.com'));
  }catch(_){return false;}
}
async function fiProvisionFirstLogin(u){
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(FI_PROVISION_WEBAPP_URL))
    throw new Error('URL Fi Login Provision belum ditetapkan oleh pentadbir.');
  const nonce=crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
  const token=await u.getIdToken(true);
  return new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe');
    frame.hidden=true;frame.name='fi-login-'+nonce;frame.title='Fi Login Provision';
    frame.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin');
    const form=document.createElement('form');
    form.hidden=true;form.method='POST';form.target=frame.name;form.action=FI_PROVISION_WEBAPP_URL;
    const field=document.createElement('input');field.type='hidden';field.name='payload';
    field.value=JSON.stringify({action:'fiLoginProvision',idToken:token,nonce});
    form.appendChild(field);
    let finished=false;
    function finish(error,data){
      if(finished)return;finished=true;
      clearTimeout(timer);window.removeEventListener('message',onMessage);
      form.remove();frame.remove();
      if(error)reject(error);else resolve(data);
    }
    function onMessage(event){
      if(!fiTrustedWebAppOrigin(event.origin))return;
      const data=event.data;
      if(!data || data.channel!=='semakmur-fi-doc-v1' || data.nonce!==nonce)return;
      if(data.ok && data.provisioned===true)finish(null,data);
      else finish(new Error(data.error||'Pendaftaran staf tidak disahkan.'));
    }
    const timer=setTimeout(()=>finish(new Error('Tiada respons daripada Web App. Semak URL /exec dan deployment Apps Script.')),60000);
    window.addEventListener('message',onMessage);
    document.body.append(frame,form);form.submit();
  });
}

let app,auth,db,user=null,verified=false,busy=false;
function status(s,error=false){$('status').textContent=s;$('status').classList.toggle('error',error);}
function toggle(on){busy=on;$('signin').disabled=on;$('spinner').hidden=!on;}
async function check(u,auto=false){
 if(!u){verified=false;user=null;$('actions').hidden=true;$('signin').hidden=false;status('Sila log masuk menggunakan Google MOE.');return;}
 toggle(true);status('Menyemak pendaftaran staf SeMAKMUR…');
 try{
   // Every session must use a server-confirmed active staff document.
   let d;
   try { d=await getDocFromServer(doc(db,'semakmur_dashboard_fi',u.uid)); }
   catch(e){
     // Permission denied bukan bukti akaun baharu; backend akan sahkan token dan Master_Staf.
     if(e?.code!=='permission-denied')throw e;
     d=null;
   }
   if(!d || !d.exists() || d.data().active!==true || norm(d.data().ownerEmail)!==norm(u.email)){
     status('Mengesahkan staf aktif dan menyediakan profil Fi…');
     await fiProvisionFirstLogin(u);
     d=await getDocFromServer(doc(db,'semakmur_dashboard_fi',u.uid));
   }
   if(!d.exists()||d.data().active!==true||norm(d.data().ownerEmail)!==norm(u.email))
     throw new Error('Akaun belum didaftarkan sebagai staf aktif SeMAKMUR.');
   verified=true;user=u;
   $('signin').hidden=true;$('actions').hidden=false;status('Akaun sah: '+u.email);
   if(auto){location.replace('guru/Fi-DashboardGuru.html');}
 }catch(e){verified=false;user=null;$('signin').hidden=false;$('actions').hidden=true;status('Akses Fi belum dibenarkan: '+(e.message||e),true);}
 finally{toggle(false);}
}
$('enter').onclick=()=>{if(verified&&user)location.replace('guru/Fi-DashboardGuru.html');};
$('logout').onclick=async()=>{if(auth)await signOut(auth);};
function renderGoogleButton(){
 if(!window.google?.accounts?.id){setTimeout(renderGoogleButton,500);return;}
 try{
  google.accounts.id.initialize({
   client_id:'637460698521-djt73cs1emsa5n5m7p2q8s4feohmhnuh.apps.googleusercontent.com',
   callback:async response=>{
    if(!response?.credential)return;
    toggle(true);status('Menyambungkan akaun Google ke Firebase…');
    try{const u=await signInWithCredential(auth,GoogleAuthProvider.credential(response.credential));await check(u.user,true);}
    catch(e){status('Pengesahan Google gagal: '+(e.code||e.message),true);toggle(false);}
   },
   auto_select:false
  });
  google.accounts.id.renderButton($('gis'),{theme:'outline',size:'large',shape:'pill',width:280,text:'signin_with'});
 }catch(e){console.warn('Pilihan login Google belum tersedia',e);}
}
$('signin').onclick=async()=>{
 if(busy)return;toggle(true);status('Membuka pilihan akaun Google…');
 try{
   const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account',hd:'moe-dl.edu.my'});
   const result=await signInWithPopup(auth,provider);
   await check(result.user,true);
 }catch(e){status('Login tidak berjaya: '+(e.code||e.message)+' — Jika menggunakan PWA, cuba Chrome telefon terlebih dahulu.',true);toggle(false);}
};
try{
 const cfg=window.SeMAKMURFirebasePilotConfig;if(!cfg?.projectId)throw new Error('firebase-pilot-config.js tidak ditemui.');
 app=initializeApp(cfg,'semakmur-fi-dashboard');auth=getAuth(app);db=getFirestore(app);
 await setPersistence(auth,browserLocalPersistence);
 renderGoogleButton();
 let first=true;
 onAuthStateChanged(auth,u=>{
   if(first){first=false;check(u,true);return;}
   if(!u){verified=false;user=null;$('actions').hidden=true;$('signin').hidden=false;status('Sila log masuk menggunakan akaun Google MOE.');}
 },e=>status('Sesi Firebase gagal: '+e.message,true));
}catch(e){status('Konfigurasi tidak dapat dimulakan: '+e.message,true);$('signin').disabled=true;}
