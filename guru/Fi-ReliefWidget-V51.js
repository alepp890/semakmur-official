/* Dashboard Fi: ringkasan Relief Saya sahaja, dibaca daripada jadual awam yang telah diterbitkan. */
(async()=>{try{
 const {getApps}=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js');
 const {getAuth,onAuthStateChanged}=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js');
 const {getFirestore,doc,onSnapshot}=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js');
 const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 let stop=null,activeDay='';
 function display(html){window.fi51ReliefWidgetHtml=html;const el=document.getElementById('fi-v6-relief-value');if(el)el.innerHTML=html;}
 async function init(){const app=getApps().find(a=>a.name==='semakmur-fi-dashboard');if(!app){setTimeout(init,350);return;}
  const auth=getAuth(app),db=getFirestore(app);
  onAuthStateChanged(auth,user=>{if(stop){stop();stop=null;}if(!user){display('Sila log masuk.');return;}
   activeDay=day();stop=onSnapshot(doc(db,'semakmur_fi_relief_public_harian',activeDay),snap=>{
    const rows=snap.exists()&&Array.isArray(snap.data().rows)?snap.data().rows:[];
    const mine=rows.filter(r=>r.replacementUid===user.uid&&r.status==='DIAGIH');
    display(mine.length?`<strong>${mine.length} waktu relief saya</strong><div class="fi51-widget-small">${mine.map(r=>`${esc(r.slotId.replace(/^.*-SLOT-0*/,'W'))} · ${esc(r.classId)}${r.phase==='BACKUP'?' (Backup)':''}`).join(' • ')}</div>`:'Tiada relief ditugaskan kepada saya.');
   },()=>display('Tugasan belum dapat disemak.'));
  });
  setInterval(()=>{if(auth.currentUser&&activeDay!==day()){if(stop)stop();stop=onSnapshot(doc(db,'semakmur_fi_relief_public_harian',day()),snap=>{
   const mine=(snap.exists()?snap.data().rows||[]:[]).filter(r=>r.replacementUid===auth.currentUser.uid&&r.status==='DIAGIH');
   activeDay=day();display(mine.length?`<strong>${mine.length} waktu relief saya</strong><div class="fi51-widget-small">${mine.map(r=>esc(r.slotId)+' · '+esc(r.classId)).join(' • ')}</div>`:'Tiada relief ditugaskan kepada saya.');
  });}},60000);
 }
 init();
}catch(e){console.warn('Widget e-Relief Fi:',e.message);}})();
