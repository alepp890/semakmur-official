/** SeMAKMUR Fi V6.4: read-only authenticated Keberadaan widget for desktop dashboard.
 * No writes, no simulated stats, no impact on Kehadiran V8.
 * Counts are limited to 100 most recent self-owned requests, not school totals.
 */
import {getApps} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,getDoc,collection,query,where,limit,onSnapshot} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const $=id=>document.getElementById(id);
const set=(id,x)=>{const el=$(id);if(el)el.textContent=String(x)};
const docRequired=r=>['CRK','CTR'].includes(r.finalType||r.type)||(r.type==='RASMI'&&r.scope==='LUAR');
const completed=r=>{
 if(r.gpkStatus==='ditolak')return true;
 if(docRequired(r)&&!r.docPath&&!r.docName)return false;
 if(['CRK','CTR'].includes(r.type)||['CRK','CTR'].includes(r.finalType||''))return r.relief==='sah'&&r.docReviewed===true;
 if(r.type==='RASMI'&&r.scope==='LUAR')return r.relief==='sah';
 if(r.type==='RASMI'&&r.scope==='DALAM'||r.type==='MC')return r.gpkStatus!=='menunggu'&&r.gpkStatus!=='';
 if(r.type==='KECEMASAN')return r.gpkStatus!=='menunggu'&&(r.task==='KELUAR'||Boolean(r.finalType))&&!['tanpa','sementara'].includes(r.relief);
 return false;
};
const pending=r=>!completed(r)||['tanpa','sementara'].includes(r.relief);
let stop=null,authApp=null;
let initTries=0;
function clear(){['kb-dash-total','kb-dash-pending','kb-dash-docs','kb-dash-relief'].forEach(k=>set(k,'—'));}
async function init(){
 const app=getApps().find(a=>a.name==='semakmur-fi-dashboard');
 if(!app){set('kb-dash-caption','Menunggu sambungan Dashboard Fi.');if(++initTries<25)setTimeout(init,250);return;}
 const db=getFirestore(app),auth=getAuth(app);authApp=auth;
 onAuthStateChanged(auth,async u=>{
  if(stop){stop();stop=null;}clear();
  if(!u){set('kb-dash-caption','Log masuk untuk melihat statistik.');return;}
  try{
   // Require same verified school dashboard profile before displaying private figures.
   const p=await getDoc(doc(db,'semakmur_dashboard_fi',u.uid));
   if(!p.exists()||p.data().active!==true||p.data().ownerEmail!==u.email){set('kb-dash-caption','Akaun guru belum disahkan.');return;}
   const rr=await getDoc(doc(db,'semakmur_fi_keberadaan_roles',u.uid)).catch(()=>null);
   const isTest=!!(rr?.exists()&&rr.data().active===true&&rr.data().ownerEmail===u.email&&(rr.data().roles||[]).includes('ADMIN_UJIAN'));
   stop=onSnapshot(query(collection(db,'semakmur_fi_keberadaan'),where('ownerUid','==',u.uid),limit(100)),snap=>{
    const rows=snap.docs.map(d=>d.data()).filter(d=>d.testMode===isTest);
    set('kb-dash-total',rows.length);set('kb-dash-pending',rows.filter(pending).length);
    set('kb-dash-docs',rows.filter(r=>(['CRK','CTR'].includes(r.finalType||r.type)||r.type==='RASMI'&&r.scope==='LUAR')&&!r.docPath&&!r.docName).length);
    set('kb-dash-relief',rows.filter(r=>['sah','tanpa','sementara'].includes(r.relief)).length);
    set('kb-dash-caption',(isTest?'Mod UJIAN · ':'')+'Rekod saya (maksimum 100) · data Firestore');
   },e=>{clear();set('kb-dash-caption','Statistik belum dapat dibaca ('+(e.code||'sambungan')+').');});
  }catch(e){clear();set('kb-dash-caption','Statistik belum tersedia.');}
 });
}
// Wait for same Firebase app initialization from Fi-DashboardGuru.js (no second Firebase app).
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
