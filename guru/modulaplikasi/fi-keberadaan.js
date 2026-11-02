/** SeMAKMUR Fi — Smart Keberadaan V1 (prototaip). Tiada penulisan Firestore dan tiada trigger relief. */
const $=id=>document.getElementById(id);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const text=value=>String(value??'').trim();
const KATEGORI={CUTI:'Cuti',URUSAN_RASMI:'Urusan rasmi',KURSUS:'Kursus / Bengkel / PLC',KECEMASAN:'Urusan kecemasan',TUGAS_DALAMAN:'Tugas lain di sekolah'};
const STATUS={DRAF:'Draf',DIHANTAR:'Dihantar (simulasi)',BATAL:'Dibatalkan'};
const isDemo=new URLSearchParams(location.search).get('demo')==='1';
let owner=null,records=[],editingId=null,toastTimeout=null,authStop=null;
function dateMY(){return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Kuala_Lumpur'}).format(new Date());}
function readableDate(d){if(!/^\d{4}-\d{2}-\d{2}$/.test(d||''))return d||'—'; const [y,m,day]=d.split('-');return `${day}/${m}/${y}`;}
function notify(message){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.hidden=true,4200);}
function error(message){$('form-error').textContent=message;$('form-error').hidden=false;}
function noError(){$('form-error').hidden=true;$('form-error').textContent='';}
function storageKey(){return `SEMAKMUR_FI_KEBERADAAN_DEMO_V1_${owner.uid}`;}
function loadRecords(){try{const data=JSON.parse(localStorage.getItem(storageKey())||'[]');records=Array.isArray(data)?data.filter(r=>r&&r.ownerUid===owner.uid).slice(0,100):[];}catch(e){records=[];notify('Simpanan percubaan tidak dapat dibaca.');}}
function saveRecords(){try{localStorage.setItem(storageKey(),JSON.stringify(records.slice(0,100)));return true;}catch(e){error('Pelayar tidak membenarkan simpanan setempat. Sila semak ruang simpanan / tetapan privasi.');return false;}}
function authorized(o){owner=o;$('access-message').hidden=true;$('workspace').hidden=false;$('teacher-name').value=o.name;$('user-badge').textContent=o.name;loadRecords();draw();}
function accessFailure(message){const el=$('access-message');el.classList.add('error');el.innerHTML='';el.append(document.createTextNode(message+' '));const link=document.createElement('a');link.href='../../Fi-LoginSession.html';link.textContent='Buka Login Fi';el.append(link);$('user-badge').textContent='Akses diperlukan';}
async function initAuth(){
 if(isDemo){authorized({uid:'PRATONTON',email:'demo@localhost',name:'GURU CONTOH (DEMO)'});return;}
 try{
  const appConfig=window.SeMAKMURFirebasePilotConfig;
  if(!appConfig?.projectId)throw new Error('Konfigurasi Firebase tiada.');
  const [appLib,authLib,storeLib]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
  ]);
  const app=appLib.initializeApp(appConfig,'semakmur-fi-dashboard');
  const auth=authLib.getAuth(app),db=storeLib.getFirestore(app);
  authStop=authLib.onAuthStateChanged(auth,async user=>{
   if(!user){$('workspace').hidden=true;owner=null;accessFailure('Sila log masuk melalui Portal Fi terlebih dahulu.');return;}
   try{
    const snap=await storeLib.getDoc(storeLib.doc(db,'semakmur_dashboard_fi',user.uid));
    const r=snap.data();
    if(!snap.exists()||r?.active!==true||text(r.ownerEmail).toLowerCase()!==text(user.email).toLowerCase()||text(r.profile?.email).toLowerCase()!==text(user.email).toLowerCase())throw new Error('Profil staf Fi tidak aktif atau tidak sepadan.');
    authorized({uid:user.uid,email:user.email,name:text(r.profile?.namaPenuh)||text(user.displayName)||'Guru SeMAKMUR'});
   }catch(e){owner=null;$('workspace').hidden=true;accessFailure('Akses tidak dapat disahkan. '+(e?.code==='permission-denied'?'Kebenaran Firestore tidak mencukupi.':text(e?.message)||'Sila cuba lagi.'));}
  },e=>accessFailure('Semakan sesi gagal. '+text(e?.message)));
 }catch(e){accessFailure('Firebase tidak dapat dimulakan. '+text(e?.message));}
}
function validDay(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===v;}
function dayRange(r){return [r.startDate,r.endDate];}
function spansOverlap(a,b){
 const [as,ae]=dayRange(a),[bs,be]=dayRange(b);
 if(as>be||bs>ae)return false;
 if(a.period==='PENUH'||b.period==='PENUH')return true;
 if(as!==bs||ae!==be)return true; // V1: sebahagian hari hanya pada tarikh yang sama.
 return a.startTime<b.endTime&&b.startTime<a.endTime;
}
function dataForm(){return {category:$('category').value,startDate:$('start-date').value,endDate:$('end-date').value,period:$('period').value,startTime:$('period').value==='SEBAHAGIAN'?$('start-time').value:null,endTime:$('period').value==='SEBAHAGIAN'?$('end-time').value:null,notes:text($('notes').value)};}
function validate(d){
 if(!Object.hasOwn(KATEGORI,d.category))return 'Sila pilih kategori keberadaan.';
 if(!validDay(d.startDate)||!validDay(d.endDate))return 'Tarikh mula dan tamat perlu diisi dengan betul.';
 if(d.endDate<d.startDate)return 'Tarikh tamat tidak boleh lebih awal daripada tarikh mula.';
 if(!['PENUH','SEBAHAGIAN'].includes(d.period))return 'Sila pilih tempoh keberadaan.';
 if(d.period==='SEBAHAGIAN'){
  if(d.startDate!==d.endDate)return 'Tempoh sebahagian hari hanya dibenarkan pada tarikh yang sama dalam V1.';
  if(!/^\d{2}:\d{2}$/.test(d.startTime||'')||!/^\d{2}:\d{2}$/.test(d.endTime||'')||d.startTime>=d.endTime)return 'Masa tamat mesti selepas masa mula.';
 }
 if(d.notes.length>300)return 'Catatan melebihi 300 aksara.';
 if(records.some(r=>r.id!==editingId&&r.status!=='BATAL'&&spansOverlap(d,r)))return 'Sudah ada rekod ujian lain yang bertindih pada tarikh/masa ini.';
 return '';
}
function newId(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function commit(status){
 if(!owner)return;
 noError();const d=dataForm(),problem=validate(d);if(problem){error(problem);return;}
 const now=new Date().toISOString(),existing=records.find(r=>r.id===editingId);
 const newRecord={...d,id:existing?.id||newId(),ownerUid:owner.uid,ownerEmail:owner.email,teacherName:owner.name,createdAt:existing?.createdAt||now,updatedAt:now,status};
 const previous=records.slice();records=records.filter(r=>r.id!==editingId);records.unshift(newRecord);
 if(!saveRecords()){records=previous;return;}
 resetForm();draw();notify(status==='DRAF'?'Draf percubaan berjaya disimpan.':'Rekod berjaya dihantar dalam simulasi. Tiada permohonan rasmi dibuat.');
}
function resetForm(){editingId=null;$('keberadaan-form').reset();$('start-date').value=dateMY();$('end-date').value=dateMY();$('start-time').value='08:00';$('end-time').value='12:00';$('btn-submit').textContent='Hantar (simulasi)';$('btn-reset').hidden=true;$('time-fields').hidden=true;noError();}
function editRecord(id){const r=records.find(x=>x.id===id);if(!r||r.status==='BATAL')return;editingId=id;for(const key of ['category','startDate','endDate','period','startTime','endTime','notes']){const el=$({'startDate':'start-date','endDate':'end-date','startTime':'start-time','endTime':'end-time'}[key]||key);if(el)el.value=r[key]??'';}
 $('time-fields').hidden=r.period!=='SEBAHAGIAN';$('btn-submit').textContent='Hantar semula (simulasi)';$('btn-reset').hidden=false;noError();$('form-title').scrollIntoView({behavior:'smooth',block:'start'});notify('Mod suntingan: perubahan belum disimpan.');}
function cancelRecord(id){const r=records.find(x=>x.id===id);if(!r||r.status==='BATAL')return;if(!confirm('Batalkan rekod ujian ini? Tindakan ini tidak melibatkan rekod rasmi sekolah.'))return;const old=r.status;r.status='BATAL';r.updatedAt=new Date().toISOString();if(!saveRecords()){r.status=old;return;}if(editingId===id)resetForm();draw();notify('Rekod ujian dibatalkan.');}
function recordCard(r){
 const period=r.period==='PENUH'?'Sepanjang hari':`${escapeHTML(r.startTime)} – ${escapeHTML(r.endTime)}`;
 const days=r.startDate===r.endDate?readableDate(r.startDate):`${readableDate(r.startDate)} – ${readableDate(r.endDate)}`;
 return `<article class="record"><div class="record-top"><div><h3>${escapeHTML(KATEGORI[r.category]||'Kategori tidak diketahui')}</h3><div class="record-meta">📅 ${escapeHTML(days)}<br>◷ ${escapeHTML(period)}</div></div><span class="status-pill status-${escapeHTML(r.status)}">${escapeHTML(STATUS[r.status]||'—')}</span></div>${r.notes?`<div class="record-note">${escapeHTML(r.notes)}</div>`:''}<div class="record-bottom"><span>Dikemas kini ${escapeHTML(new Intl.DateTimeFormat('ms-MY',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(r.updatedAt)))}</span><div class="record-actions">${r.status!=='BATAL'?`<button type="button" class="tiny-btn" data-action="edit" data-id="${escapeHTML(r.id)}">Edit</button><button type="button" class="tiny-btn cancel" data-action="cancel" data-id="${escapeHTML(r.id)}">Batal</button>`:''}</div></div></article>`;
}
function draw(){
 $('stat-total').textContent=String(records.length);$('stat-draft').textContent=String(records.filter(r=>r.status==='DRAF').length);$('stat-submitted').textContent=String(records.filter(r=>r.status==='DIHANTAR').length);$('stat-cancelled').textContent=String(records.filter(r=>r.status==='BATAL').length);
 const filter=$('status-filter').value,items=records.filter(r=>filter==='ALL'||r.status===filter).sort((a,b)=>text(b.updatedAt).localeCompare(text(a.updatedAt)));
 $('record-list').innerHTML=items.length?items.map(recordCard).join(''):'<div class="empty"><span class="empty-icon">▤</span><strong>Belum ada rekod untuk dipaparkan</strong><p>Isi borang di sebelah untuk mencuba aliran Smart Keberadaan. Rekod tidak dihantar kepada pentadbir.</p></div>';
}
$('period').addEventListener('change',()=>{$('time-fields').hidden=$('period').value!=='SEBAHAGIAN';});
$('keberadaan-form').addEventListener('submit',e=>{e.preventDefault();commit('DIHANTAR');});
$('btn-draft').addEventListener('click',()=>commit('DRAF'));
$('btn-reset').addEventListener('click',resetForm);
$('status-filter').addEventListener('change',draw);
$('record-list').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='edit')editRecord(b.dataset.id);if(b.dataset.action==='cancel')cancelRecord(b.dataset.id);});
$('clear-demo').addEventListener('click',()=>{if(!records.length)return notify('Tiada rekod ujian untuk dipadam.');if(!confirm('Padam SEMUA rekod ujian daripada pelayar ini? Tiada data rasmi dipadam.'))return;const old=records;records=[];if(!saveRecords()){records=old;return;}resetForm();draw();notify('Semua rekod ujian telah dikosongkan.');});
$('today-chip').textContent=new Intl.DateTimeFormat('ms-MY',{weekday:'long',day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kuala_Lumpur'}).format(new Date());
resetForm();initAuth();
window.addEventListener('storage',event=>{if(owner&&event.key===storageKey()){loadRecords();draw();}});
window.addEventListener('beforeunload',()=>{authStop?.();});
