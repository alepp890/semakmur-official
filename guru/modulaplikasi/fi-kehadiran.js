/**
 * SeMAKMUR Fi V4: Firestore read/write directly for attendance.
 * Source of truth for Fi attendance: semakmur_fi_kehadiran_harian, NOT Google Sheets.
 * All school staff active in semakmur_dashboard_fi may mark any class.
 * Atomic: one class/day document + one immutable audit log per edit.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, doc, onSnapshot, getDoc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const $ = id => document.getElementById(id);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str = s => String(s??'').trim();
const dateMY = () => {
  const p = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const x = Object.fromEntries(p.filter(z=>z.type!=='literal').map(z=>[z.type,z.value]));
  return `${x.year}-${x.month}-${x.day}`;
};
const dateValid = s => /^\d{4}-\d{2}-\d{2}$/.test(str(s));
let fbApp,auth,db,user=null,teacher=null,index=null,selected=null,roster=null,record=null;
let stopIndex=null,stopRoster=null,stopRecord=null;
let rosterReady=false,recordReady=false,loadSeq=0,statusSeq=0,saving=false,ack=false,dirty=false,absent=new Set();
let mode='rekod',guruKelas=null,parentReport=null,stopParent=null,canReview=false;
const nameKey=v=>str(v).toLocaleUpperCase('ms').replace(/\s+/g,' ');
const humanDate=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?`${m[3]}/${m[2]}/${m[1]}`:s;};
function teacherClass(){
 const roles=Array.isArray(teacher?.peranan)?teacher.peranan:[];
 const found=roles.find(r=>nameKey(r.peranan)==='GURU KELAS' && nameKey(r.jawatankuasa).includes('PENGURUSAN KELAS') && str(r.skop));
 // Tiada fallback guruKelas lama: pelantikan rasmi aktif daripada Fi-Sync diperlukan.
 return str(found?.skop);
}
function resolveGuruClass(){const match=classes().find(c=>nameKey(c.namaKelas)===nameKey(teacherClass()));return match||null;}
function reportAttendanceSection(){
 const title=mode==='semakan'?'Semakan Kehadiran':(selected?.namaKelas||'Kehadiran Kelas');
 const ownHeader=$('fi-v6-attendance-header-title');if(ownHeader)ownHeader.textContent=title;
 if(window.parent!==window)window.parent.postMessage({type:'semakmur-fi-attendance-section',section:mode,title},location.origin);
}
function updateReviewAccess(){
 const c=resolveGuruClass();
 // Kelayakan ikut Peranan_Staf *dan* guruKelas terselaras yang dibaca Firestore Rules V8.
 canReview=!!(c && nameKey(teacher?.profile?.guruKelas)===nameKey(c.namaKelas));
 $('fi-attendance-tabs').hidden=!canReview;
 $('tab-semakan').hidden=!canReview;
 if(!canReview&&mode==='semakan')tabSelect('rekod');
}
function tabSelect(next){
 if(next==='semakan'&&!canReview)return;
 mode=next; selected=null; if(stopRoster)stopRoster();if(stopRecord)stopRecord();if(stopParent)stopParent();
 stopRoster=stopRecord=stopParent=null; ++loadSeq;recordReady=rosterReady=false;dirty=false;ack=false;absent.clear();mobileStudents(false);
 $('tab-rekod').classList.toggle('active',next==='rekod');$('tab-semakan').classList.toggle('active',next==='semakan');
 $('tab-rekod').setAttribute('aria-selected',String(next==='rekod'));$('tab-semakan').setAttribute('aria-selected',String(next==='semakan'));
 $('fi-rekod-panel').hidden=next!=='rekod';$('fi-semakan-panel').hidden=next!=='semakan';
 $('fi-rekod-panel').style.display=next==='rekod'?'':'none';$('fi-semakan-panel').style.display=next==='semakan'?'':'none';
 reportAttendanceSection();
 // Pindah terus ke bahagian atas, bukan scroll ke seksyen semakan di bawah.
 const root=document.scrollingElement||document.documentElement;root.scrollTop=0;
 if(next==='semakan')renderParentReview(); else {drawClasses();render();}
}
async function renderParentReview(){
 const el=$('fi-semakan-content'),c=resolveGuruClass();
 if(!canReview||!c){el.innerHTML='<div class="empty">Tiada kelas untuk disemak.</div>';return;}
 const date=dateValue(),key=date+'__'+c.docId;
 el.innerHTML=`<div class="review-heading"><strong>${esc(c.namaKelas)}</strong><span>${esc(humanDate(date))}</span></div><div class="empty">Memeriksa kehadiran dan laporan penjaga…</div>`;
 try{
   const [attendance,rosterDoc,parents]=await Promise.all([
     getDoc(doc(db,'semakmur_fi_kehadiran_harian',key)),getDoc(doc(db,'semakmur_fi_kelas',c.docId)),
     getDoc(doc(db,'semakmur_fi_semakan_penjaga',key)).catch(()=>null)]);
   if(mode!=='semakan'||date!==dateValue())return;
   if(!attendance.exists()) {el.innerHTML=`<div class="review-heading"><strong>${esc(c.namaKelas)}</strong><span>${esc(humanDate(date))}</span></div><div class="empty">Kehadiran kelas ini belum direkodkan pada tarikh dipilih.</div>`;return;}
   const absentIds=attendance.data().absentIds||[], rosterKids=rosterDoc.data()?.murid||[];
   const map=new Map(rosterKids.map(m=>[m.idMurid,m.namaMurid]));
   const report=parents?.exists()?parents.data():null;
   const flags=report?.sebabById||{};
   const list=absentIds.map((id,i)=>{
     const known=Boolean(report?.syncReady),info=flags[id];
     const title= !known?'Status penjaga belum diselaraskan':info?.sebabDiberi?'Sebab telah dilaporkan':info?.adaLaporan?'Laporan diterima, sebab belum lengkap':'Belum ada sebab daripada penjaga';
     const cls=!known?'pending':info?.sebabDiberi?'complete':'waiting';
     return `<div class="review-pupil"><span class="student-number">${i+1}</span><strong>${esc(map.get(id)||id)}</strong><span class="review-status ${cls}">${esc(title)}</span></div>`;
   }).join('');
   el.innerHTML=`<div class="review-heading"><strong>${esc(c.namaKelas)}</strong><span>${esc(humanDate(date))}</span></div><div class="review-summary">${absentIds.length} murid tidak hadir</div>${!report?.syncReady?'<p class="review-warning">Laporan penjaga belum diselaraskan ke Firebase. Status di bawah bukan pengesahan bahawa penjaga sudah atau belum melapor.</p>':''}${list||'<div class="empty">Tiada murid tidak hadir direkodkan untuk kelas ini.</div>'}`;
 }catch(e){el.innerHTML='<div class="empty">Tidak dapat membaca data semakan. '+esc(e.code||e.message||'')+'</div>';}
}

const cache=new Map();
function message(s='',error=false){const x=$('message');x.textContent=s;x.classList.toggle('error',error);x.hidden=!s;}
function loading(on,title='Membaca Kehadiran',detail='Menyediakan maklumat kelas dan murid…'){
 const x=$('fi-load-overlay');if(!x)return;x.hidden=!on || document.documentElement.classList.contains('fi-embedded');
 $('fi-load-title').textContent=title;$('fi-load-message').textContent=detail;
}
function popup(name,count,total){
 $('fi-confirm-message').textContent=`${name}: ${total-count} hadir, ${count} tidak hadir. Rekod telah disimpan dalam Firebase.`;
 $('fi-confirm-dialog').hidden=false;$('fi-confirm-close').focus();
}
function notifyParent(type){if(window.parent&&window.parent!==window)window.parent.postMessage({type},location.origin);}
function closeListeners(){for(const f of [stopIndex,stopRoster,stopRecord,stopParent])if(f)f();stopIndex=stopRoster=stopRecord=stopParent=null;}
function mobileStudents(on){
 document.body.classList.toggle('fi-view-students',!!on);
 const topBack=$('fi-v6-top-back'),topTitle=$('fi-v6-attendance-header-title');
 if(topBack)topBack.hidden=!on;
 if(topTitle)topTitle.textContent=on?(selected?.namaKelas||'Kehadiran Murid'):(mode==='semakan'?'Semakan Kehadiran':'Kehadiran Kelas');
 if(window.parent && window.parent!==window){
   window.parent.postMessage({type:'semakmur-fi-attendance-screen',screen:on?'students':'classes',className:on?(selected?.namaKelas||'Kehadiran Murid'):''},location.origin);
 }
}
// Firestore Rules V4 membenarkan GET dokumen harian, bukan LIST; baca status setiap kelas terus.
async function refreshClassStatuses(){
 if(!db||!user||!index)return;
 const seq=++statusSeq, date=dateValue(),list=classes();
 for(const c of list)if(!cache.has('status:'+date+':'+c.docId))cache.set('status:'+date+':'+c.docId,{state:'loading'});
 drawClasses();
 let n=0;
 async function worker(){
   while(n<list.length){
     const c=list[n++], key=date+'__'+c.docId;
     try{
       const snap=await getDoc(doc(db,'semakmur_fi_kehadiran_harian',key));
       if(seq!==statusSeq||date!==dateValue())return;
       const rec=snap.exists()?snap.data():null;
       cache.set('status:'+date+':'+c.docId,rec?{state:'done',present:Number(rec.present),total:Number(rec.total)}:{state:'missing'});
     }catch(e){
       if(seq!==statusSeq)return;
       cache.set('status:'+date+':'+c.docId,{state:'error'});
     }
     if(seq===statusSeq)drawClasses();
   }
 }
 await Promise.all(Array.from({length:Math.min(6,list.length)},()=>worker()));
}

function loggedOut(s='Sila masuk menggunakan Fi-LoginSession.'){
 notifyParent('semakmur-fi-attendance-error');
 loading(false);message(s,true);$('account').textContent='Belum login';
 $('classes').innerHTML='<div class="empty"><a href="../../Fi-LoginSession.html" target="_top">Buka Fi-LoginSession</a></div>';
 $('details').innerHTML='<div class="empty">Sila log masuk dahulu.</div>';
}
const classes=()=>Array.isArray(index?.classes)?index.classes:[];
function stateLabel(c){
 const x=cache.get('status:'+dateValue()+':'+c.docId);
 if(selected?.docId===c.docId && recordReady){
   if(record)return {label:`${Number(record.present)}/${Number(record.total)}`,type:'done',detail:''};
   return {label:'Tiada Rekod',type:'missing',detail:''};
 }
 if(!x || x.state==='loading')return {label:'Menyemak…',type:'loading',detail:''};
 if(x.state==='error')return {label:'Gagal semak',type:'error',detail:''};
 if(x.state==='done')return {label:`${Number(x.present)}/${Number(x.total)}`,type:'done',detail:''};
 return {label:'Tiada Rekod',type:'missing',detail:''};
}
function dateValue(){return $('date').value;}
function drawClasses(){
 const all=classes(),term=str($('class-search')?.value).toLocaleLowerCase('ms');
 $('total').textContent=all.length+' kelas';
 const filtered=all.filter(c=>str(c.namaKelas).toLocaleLowerCase('ms').includes(term));
 $('classes').innerHTML=filtered.map(c=>{
   const isSel=selected?.docId===c.docId,status=stateLabel(c);
   const cls=status.type==='done'?'done':status.type==='missing'?'missing':status.type;
   return `<button class="class${isSel?' selected':''}" type="button" data-id="${esc(c.docId)}"><div class="fi-v6-class-name"><strong>${esc(c.namaKelas)}</strong><small>${Number(c.jumlahMurid||0)} orang</small></div><div class="fi-v6-class-status"><span class="pill ${cls}">${esc(status.label)}</span>${status.detail?`<small>${esc(status.detail)}</small>`:''}</div><span class="fi-v6-class-arrow" aria-hidden="true">›</span></button>`;
 }).join('')||'<div class="empty">Tiada kelas sepadan.</div>';
 $('classes').querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.id)));
}
function render(){
 if(!selected){$('student-title').textContent='Kehadiran Kelas';$('details').innerHTML='<div class="empty">Pilih kelas untuk memaparkan senarai murid.</div>';return;}
 $('student-title').textContent=selected.namaKelas;
 if(!rosterReady||!recordReady){$('details').innerHTML='<div class="empty">Menyediakan senarai murid dan rekod kehadiran…</div>';return;}
 const students=Array.isArray(roster?.murid)?roster.murid:[];
 const n=students.length,k=absent.size;
 const editor=record?.updatedByEmail||'',version=record?.version||0;
 const editorDisplay=(str(teacher?.profile?.email).toLowerCase()===str(editor).toLowerCase() ? (teacher?.profile?.namaPenuh||teacher?.profile?.namaSamaran||'Guru').split(/\s+/)[0].toLocaleLowerCase('ms').replace(/^./,c=>c.toLocaleUpperCase('ms')) : editor.replace(/^g-[^@]+@.*/, 'guru lain')); 
 const status=record?`Rekod dikemas kini oleh ${esc(editorDisplay)}.`:'Belum direkod. Murid dianggap hadir hanya selepas pengesahan disimpan.';
 const metrics=`<div class="metrics"><div class="metric"><strong>${n}</strong>Jumlah Murid</div><div class="metric"><strong id="metric-present">${n-k}</strong>Anggaran Hadir</div><div class="metric"><strong id="metric-absent">${k}</strong>Tidak Hadir</div></div>`;
 const list=students.map((m,i)=>`<label class="student ${absent.has(m.idMurid)?'missing':''}" data-name="${esc(str(m.namaMurid).toLocaleLowerCase('ms'))}"><input type="checkbox" data-pupil="${esc(m.idMurid)}" ${absent.has(m.idMurid)?'checked':''} ${saving?'disabled':''}><span class="student-number">${i+1}</span><div><div class="name">${esc(m.namaMurid)}</div></div></label>`).join('');
 $('details').innerHTML=`<div class="muted fi-attendance-status-notice ${record?'is-saved':'is-unrecorded'}">${esc(status)}</div>${metrics}<input class="search" id="pupil-search" placeholder="Cari nama murid" aria-label="Cari murid"><div class="student-list">${list}</div><div class="footer"><label class="ack"><input id="confirm" type="checkbox" ${ack?'checked':''} ${saving?'disabled':''}> Saya mengesahkan kehadiran kelas ini untuk ${esc(humanDate(dateValue()))}.</label><button class="btn primary" id="save" type="button" ${ack&&!saving?'':'disabled'}>${record?'Simpan Pembetulan':'Sahkan Kehadiran'}</button></div>`;
 $('details').querySelectorAll('[data-pupil]').forEach(i=>i.addEventListener('change',()=>{
   i.checked?absent.add(i.dataset.pupil):absent.delete(i.dataset.pupil);dirty=true;
   i.closest('.student').classList.toggle('missing',i.checked);
   // Warna baris dan tanda semak sudah mencukupi; tiada label status berulang.
   $('metric-present').textContent=n-absent.size;$('metric-absent').textContent=absent.size;
 }));
 $('pupil-search').addEventListener('input',e=>{const q=str(e.target.value).toLocaleLowerCase('ms');$('details').querySelectorAll('[data-name]').forEach(el=>{el.hidden=!el.dataset.name.includes(q);});});
 $('confirm').addEventListener('change',e=>{ack=e.target.checked;$('save').disabled=!ack||saving;});
 $('save').addEventListener('click',save);
}
function ready(){
 if(rosterReady&&recordReady){loading(false);drawClasses();render();}
}
function choose(id){
 if(saving)return;
 const c=classes().find(x=>x.docId===id);if(!c)return;
 if(stopRoster)stopRoster();if(stopRecord)stopRecord();stopRoster=stopRecord=null;
 const seq=++loadSeq;selected=c;roster=cache.get('roster:'+id)||null;
 rosterReady=!!roster;recordReady=false;record=null;dirty=false;ack=false;absent.clear();mobileStudents(true);drawClasses();render();
 loading(true,'Membuka '+c.namaKelas,'Menyediakan senarai murid dan rekod kehadiran…');
 stopRoster=onSnapshot(doc(db,'semakmur_fi_kelas',id),snap=>{
   if(seq!==loadSeq)return;
   const data=snap.data();if(!snap.exists()||data?.active!==true||!Array.isArray(data?.murid)){
     loading(false);message('Senarai murid belum tersedia.',true);return;
   }
   roster=data;rosterReady=true;cache.set('roster:'+id,data);ready();
 },e=>{if(seq===loadSeq){loading(false);message('Tidak dapat membaca murid: '+(e.code||e.message),true);}});
 const key=dateValue()+'__'+id;
 stopRecord=onSnapshot(doc(db,'semakmur_fi_kehadiran_harian',key),snap=>{
   if(seq!==loadSeq)return;
   const incoming=snap.exists()?snap.data():null;
   // Do not erase unsaved checkboxes if another user updates the record.
   if(dirty && incoming?.version!==record?.version){
     if(saving && incoming?.updatedByUid===user?.uid && incoming?.version===(record?.version||0)+1){
       record=incoming;dirty=false;ack=false;absent=new Set(incoming.absentIds||[]);
     }else{
       message('Guru lain telah mengubah rekod ini. Sila semak dan muat semula sebelum menyimpan.',true);
     }
   }else if(!dirty){
     record=incoming;absent=new Set(Array.isArray(incoming?.absentIds)?incoming.absentIds:[]);
     ack=false;
   }
   recordReady=true;cache.set('status:'+dateValue()+':'+id,incoming?{state:'done',present:Number(incoming.present),total:Number(incoming.total)}:{state:'missing'});ready();
 },e=>{if(seq===loadSeq){loading(false);message('Tidak dapat membaca rekod: '+(e.code||e.message),true);}});
}
async function save(){
 if(saving||!ack||!rosterReady||!recordReady||!teacher||!selected)return;
 const c=selected,date=dateValue(),n=roster.murid.length,ids=[...absent].sort(),expectedVersion=record?.version||0;
 if(!dateValid(date)||date>dateMY()){message('Tarikh tidak sah.',true);return;}
 if(ids.some(id=>!roster.murid.some(m=>m.idMurid===id))){message('Terdapat ID murid yang tidak sepadan.',true);return;}
 saving=true;render();loading(true,'Menyimpan Kehadiran','Mengesahkan rekod dan log perubahan dalam Firebase…');
 try{
   const key=date+'__'+c.docId,ref=doc(db,'semakmur_fi_kehadiran_harian',key);
   await runTransaction(db,async t=>{
     const before=await t.get(ref);const old=before.exists()?before.data():null;
     if((old?.version||0)!==expectedVersion)throw new Error('CONFLICT');
     const version=expectedVersion+1,auditId=key+'__v'+version+'__'+user.uid;
     const stamp=serverTimestamp();
     const data={key,date,classDocId:c.docId,idKelas:c.idKelas,absentIds:ids,total:n,present:n-ids.length,
       version,updatedAt:stamp,updatedByUid:user.uid,updatedByEmail:user.email,
       createdAt:old?.createdAt||stamp,createdByUid:old?.createdByUid||user.uid,createdByEmail:old?.createdByEmail||user.email,auditId};
     t.set(ref,data);
     t.set(doc(db,'semakmur_fi_kehadiran_log',auditId),{key,date,classDocId:c.docId,version,absentIds:ids,uid:user.uid,email:user.email,updatedAt:stamp});
   });
   dirty=false;ack=false;
   cache.set('status:'+date+':'+c.docId,{state:'done',present:n-ids.length,total:n});drawClasses();
   message('');loading(false);popup(c.namaKelas,ids.length,n);
 }catch(e){
   loading(false);
   if(String(e?.message||'').includes('CONFLICT'))message('Rekod telah diubah oleh guru lain. Sila buka semula kelas sebelum menyimpan.',true);
   else if(e.code==='permission-denied')message('Akses ditolak. Pastikan Firestore Rules V4 dan senarai murid V4 sudah dipasang.',true);
   else message('Simpanan gagal: '+(e.message||e),true);
 }finally{saving=false;render();}
}
function setDate(){
 const d=dateValue();if(!dateValid(d)||d>dateMY()){$('date').value=dateMY();message('Pilih tarikh hari ini atau sebelumnya.',true);}
 loadSeq++;if(stopRoster)stopRoster();if(stopRecord)stopRecord();stopRoster=stopRecord=null;
 selected=null;roster=null;record=null;rosterReady=recordReady=false;dirty=false;ack=false;absent.clear();mobileStudents(false);
 drawClasses();render(); if(index)refreshClassStatuses(); if(mode==='semakan')renderParentReview();
}
function startIndex(){
 if(stopIndex)stopIndex();loading(true,'Menyediakan Senarai Kelas','Membaca daftar kelas daripada Firebase…');
 stopIndex=onSnapshot(doc(db,'semakmur_fi_kehadiran_index','active'),s=>{
   if(!s.exists()||s.data().active!==true){loading(false);notifyParent('semakmur-fi-attendance-error');message('Daftar kelas belum diselaraskan.',true);return;}
   index=s.data();guruKelas=resolveGuruClass();updateReviewAccess();drawClasses();loading(false);if(mode==='semakan')renderParentReview();notifyParent('semakmur-fi-attendance-ready');message('');refreshClassStatuses();
   if(mode==='rekod'&&window.innerWidth>780&&!selected && classes().length)choose(classes()[0].docId);
 },e=>{loading(false);notifyParent('semakmur-fi-attendance-error');message('Gagal membaca senarai kelas: '+(e.code||e.message),true);});
}
function init(){
 $('date').value=dateMY();$('date').max=dateMY();$('date').addEventListener('change',setDate);
 $('tab-rekod').addEventListener('click',()=>tabSelect('rekod'));$('tab-semakan').addEventListener('click',()=>tabSelect('semakan'));
 $('fi-v6-top-back')?.addEventListener('click',()=>mobileStudents(false));
 window.addEventListener('message',e=>{
   if(e.origin!==location.origin||e.source!==window.parent)return;
   if(e.data?.type==='semakmur-fi-back-to-classes')mobileStudents(false);
   if(e.data?.type==='semakmur-fi-back-to-record'&&mode==='semakan')tabSelect('rekod');
   if(e.data?.type==='semakmur-fi-request-screen')mobileStudents(document.body.classList.contains('fi-view-students'));
 });
 $('fi-confirm-close').addEventListener('click',()=>{$('fi-confirm-dialog').hidden=true;});
 $('refresh').addEventListener('click',()=>{if(selected)choose(selected.docId);else startIndex();});
 $('class-search')?.addEventListener('input',drawClasses);
 if(!window.SeMAKMURFirebasePilotConfig?.projectId){loggedOut('Konfigurasi Firebase tiada.');return;}
 fbApp=initializeApp(window.SeMAKMURFirebasePilotConfig,'semakmur-fi-dashboard');auth=getAuth(fbApp);db=getFirestore(fbApp);
 loading(true,'Menyemak Akaun Guru','Mengesahkan akses Firebase anda…');
 onAuthStateChanged(auth,async u=>{
   closeListeners();++statusSeq;user=u;teacher=null;index=null;selected=null;canReview=false;cache.clear();$('fi-attendance-tabs').hidden=true;
   mode='rekod';$('fi-rekod-panel').hidden=false;$('fi-rekod-panel').style.display='';$('fi-semakan-panel').hidden=true;$('fi-semakan-panel').style.display='none';$('fi-semakan-content').textContent='';
   if(!u){loggedOut();return;}
   try{
     const r=await getDoc(doc(db,'semakmur_dashboard_fi',u.uid));
     if(!r.exists()||r.data().active!==true||str(r.data().ownerEmail).toLowerCase()!==str(u.email).toLowerCase()){
       loggedOut('Akaun ini belum diberikan akses staf aktif.');return;
     }
     teacher=r.data();$('account').textContent=teacher.profile?.namaSamaran||u.email||'Guru';$('fi-attendance-tabs').hidden=true;canReview=false;startIndex();
   }catch(e){loading(false);message('Tidak dapat mengesahkan staf: '+(e.code||e.message),true);}
 },e=>loggedOut('Firebase Auth gagal: '+e.message));
 let today=dateMY();setInterval(()=>{const next=dateMY();if(next!==today){today=next;$('date').max=next;if($('date').value!==next){$('date').value=next;setDate();}}},30000);
}
init();
