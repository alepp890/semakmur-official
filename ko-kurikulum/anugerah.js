import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,browserLocalPersistence} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const $=id=>document.getElementById(id),norm=s=>String(s||'').trim().toLowerCase();
const API=String(window.KOKO_API_URL||'').trim();let auth,db,current=null,busy=false;
function status(s,err=false){$('status').textContent=s;$('status').classList.toggle('error',err);}
function busySet(v){busy=v;$('loading').hidden=!v;$('login').disabled=v;$('refresh').disabled=v;}
function clearReport(){$('reportPanel').hidden=true;$('report').removeAttribute('src');$('report').src='about:blank';$('report').name='';}
async function hasStaff(u){
  const docSnap=await getDocFromServer(doc(db,'semakmur_dashboard_fi',u.uid));
  const staff=docSnap.exists()?docSnap.data():null;
  if(!staff||staff.active!==true||norm(staff.ownerEmail)!==norm(u.email))throw Error('Akaun belum disahkan sebagai guru aktif dalam SeMAKMUR Fi. Log masuk dahulu melalui Fi-LoginSession.html.');
  if(!norm(u.email).endsWith('@moe-dl.edu.my'))throw Error('Hanya akaun Google MOE dibenarkan.');
}
async function showReport(){
  if(!current||busy)return;
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(API)){status('URL Apps Script Kokurikulum tidak sah dalam config.js.',true);return;}
  busySet(true);clearReport();status('Mengesahkan sesi Google pada pelayan…');
  try{
    const token=await current.getIdToken(true);
    // Token dihantar menggunakan HTTPS POST dalam BODY; bukan query string / JSONP.
    const frame=$('report');const name='semawards'+Date.now();frame.name=name;
    const form=document.createElement('form');form.method='POST';form.target=name;form.action=API;form.hidden=true;
    const field=document.createElement('input');field.name='payload';field.type='hidden';field.value=JSON.stringify({action:'anugerahPrivate',idToken:token});form.append(field);document.body.append(form);
    $('reportPanel').hidden=false;form.submit();form.remove();status('Laporan dilindungi telah diminta. Jika tertera ralat dalam paparan, semak akses guru dan Apps Script.');
  }catch(e){status('Tidak berjaya memuat laporan: '+(e.message||e),true);clearReport();}
  finally{busySet(false);}
}
async function accept(u){
 current=null;clearReport();$('logout').hidden=!u;$('login').hidden=!!u;
 if(!u){status('Sila log masuk menggunakan Google MOE.');return;}
 busySet(true);status('Mengesahkan staf aktif dalam Firebase…');
 try{await hasStaff(u);current=u;status('Akses disahkan: '+u.email);}
 catch(e){status(e.message||String(e),true);$('login').hidden=false;}
 finally{busySet(false);}
 if(current)await showReport();
}
$('login').onclick=async()=>{if(busy)return;busySet(true);status('Membuka log masuk Google…');
 try{const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account',hd:'moe-dl.edu.my'});await signInWithPopup(auth,p);}
 catch(e){status('Log masuk gagal: '+(e.message||e),true);}finally{busySet(false);}
};
$('logout').onclick=async()=>{clearReport();await signOut(auth);};
$('refresh').onclick=showReport;
try{const cfg=window.SeMAKMURFirebasePilotConfig;if(!cfg?.projectId)throw Error('firebase-pilot-config.js tidak ditemui.');
 const app=getApps().find(a=>a.name==='semawards')||initializeApp(cfg,'semawards');auth=getAuth(app);db=getFirestore(app);
 await setPersistence(auth,browserLocalPersistence);onAuthStateChanged(auth,u=>accept(u),e=>status(e.message,true));
}catch(e){status('Konfigurasi log masuk tidak dapat dimulakan: '+e.message,true);$('login').disabled=true;}
