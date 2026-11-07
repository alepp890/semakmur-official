/* SeMAKMUR Fi V5.0 — Keberadaan + Relief Automatik; tanpa Penyelaras wajib. */
/* SeMAKMUR Fi e-Keberadaan V6.7-SPARK: frontend UI refinements and atomic audit. Firebase Storage is DISABLED (Spark plan).
   Real Firebase data and role-based views; no role-switching demo. */
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=x=>String(x??'').trim(), localDay=()=>{const x=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${x.year}-${x.month}-${x.day}`};
const niceDay=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)?x.split('-').reverse().join('/'):str(x);
const TYPE={CRK:'CRK',CTR:'CTR',MC:'Cuti Sakit (MC)',RASMI:'Urusan Rasmi / Bengkel / LDP / PLC',KECEMASAN:'Kecemasan'};
let statsLoaded=false,user=null,roles=[],realRoles=[],profile=null,records=[],myRecords=[],reliefQueue=[],myRelief=[],reliefStaff=[],tab='borang',busy=false,db=null,fns=null,unsubs=[];
const has=r=>roles.includes(r);
const isAdmin=()=>roles.some(r=>['ADMIN_SISTEM','GPK','GB'].includes(r));
const isReliefViewer=()=>roles.some(r=>['ADMIN_SISTEM','GPK','GB','RELIEF_PEMANTAU'].includes(r));
const docRequired=r=>['CRK','CTR'].includes(r.finalType||r.type)||(r.type==='RASMI'&&r.scope==='LUAR');
const reliefLabel=r=>(r.type==='RASMI'&&r.scope==='LUAR'&&r.docPath&&r.relief==='belum'?'Menunggu Semakan Surat':r.type==='RASMI'&&r.scope==='DALAM'&&r.task==='SEKAT_CALON'&&r.gpkStatus!=='disahkan'?'Layak Jadi Relief':({belum:'Belum Relief',sah:'Relief Dengan Pengesahan',tanpa:'Relief Tanpa Sokongan',sementara:'Relief Sementara',tiada:'Tiada Relief',dikecualikan:'Tidak Boleh Diberi Relief'}[r.relief]||'Belum Relief'));
const reliefTone=r=>r.relief==='sah'||r.relief==='dikecualikan'?'success':r.relief==='tanpa'||r.relief==='sementara'?'warning':'neutral';
function status(r){
 if(r.lifecycle==='DIBATALKAN')return ['Dibatalkan','neutral'];
 if(r.gpkStatus==='ditolak')return ['Tidak Disokong','danger'];
 if(docRequired(r)&&!r.docPath)return ['Dokumen Belum Lengkap','warning'];
 if(requireGpk(r)&&r.gpkStatus==='menunggu')return ['Menunggu GPK','warning'];
 if(docRequired(r)&&r.docPath&&!r.docReviewed)return ['Menunggu Semakan Bukti','warning'];
 if(r.gpkStatus==='disahkan')return ['Disokong GPK','success'];
 if(r.docReviewed===true)return ['Bukti Disemak','success'];
 return ['Direkodkan','success'];
}
function completed(r){if(r.lifecycle==='DIBATALKAN')return true;
 return !(docRequired(r)&&!r.docPath || requireGpk(r)&&r.gpkStatus==='menunggu' || docRequired(r)&&r.docPath&&!r.docReviewed);
}
function needAttention(r){return r.lifecycle!=='DIBATALKAN'&&(!completed(r)||r.gpkStatus==='ditolak');}
const requireGpk=r=>r.type==='MC'||r.type==='KECEMASAN'||r.type==='RASMI'&&r.scope==='DALAM';
function needsCompliance(r){return r.lifecycle!=='DIBATALKAN'&&docRequired(r)&&(!r.docPath||!r.docReviewed);}
function needActionForRole(r){
 if(r.testMode===true||r.lifecycle==='DIBATALKAN')return false;
 return has('GPK')&&(requireGpk(r)&&r.gpkStatus==='menunggu'||needsCompliance(r));
}
function needsTeacherAction(r){return r.lifecycle!=='DIBATALKAN'&&r.ownerUid===user?.uid&&docRequired(r)&&!r.docPath;}
function reminderOutstanding(r){return r.lifecycle!=='DIBATALKAN'&&needAttention(r);}
function showMessage(msg='',kind='info'){const a=$('alert');a.hidden=!msg;a.textContent=msg;a.style.background=kind==='error'?'#fff0f1':'#fff5e7';a.style.color=kind==='error'?'#a2454e':'#855815';}
function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;setTimeout(()=>{$('toast').hidden=true},3600)}
function setRoleUI(){
 const personal=roles.filter(r=>['GB','GPK','ADMIN_SISTEM','RELIEF_PEMANTAU'].includes(r)).map(r=>r==='ADMIN_SISTEM'?'Admin Sistem':r==='RELIEF_PEMANTAU'?'Pemantau Relief':r);
 $('role-label').textContent=personal.join(' / ')||'Guru';
 $('tabs').querySelector('[data-tab=tindakan]').hidden=!isReliefViewer();
 $('tabs').querySelector('[data-tab=peringatan]').hidden=!isAdmin();
 $('relief-box').hidden=!isReliefViewer();
 if(tab==='tindakan'&&!isReliefViewer())tab='borang';if(tab==='peringatan'&&!isAdmin())tab='borang';
}
// Badge merah = tugasan tertunggak, bukan bilangan rekod dan bukan masa terakhir tab dibuka.
function renderUnread(){
 const counts={
   status:myRecords.filter(needsTeacherAction).length,
   tindakan:records.filter(needActionForRole).length,
   peringatan:has('GPK')?records.filter(reminderOutstanding).length:0
 };
 for(const [name,id] of [['status','my-count'],['tindakan','work-count'],['peringatan','remind-count']]){
   const node=$(id),n=counts[name];if(!node)continue;
   node.hidden=n===0;node.textContent=n>99?'99+':String(n);
   node.setAttribute('aria-label',n+' tindakan masih tertunggak');
 }
}
function renderStats(){
  const source=isAdmin()?records:myRecords;
  const value=(id,n)=>{const el=$(id);if(el)el.textContent=statsLoaded?String(n):'—';};
  value('kb-stat-total',source.length);
  value('kb-stat-pending',source.filter(needAttention).length);
  value('kb-stat-docs',source.filter(r=>docRequired(r)&&!r.docPath&&!r.docName).length);
  value('kb-stat-relief',reliefQueue.filter(r=>r.engineVersion===2&&r.status==='DIAGIH').length);
  const desc=$('kb-stat-scope');
  if(desc)desc.textContent=has('ADMIN_SISTEM')?'Semua rekod rasmi':isAdmin()?'Rekod dibenarkan mengikut peranan':'Permohonan saya';
  const note=$('kb-stat-updated');
  if(note)note.textContent=statsLoaded?'Berdasarkan rekod yang berjaya dibaca · maks. 100 rekod':'Menunggu pengesahan data Firestore';
}
const listFilterValue={status:'SEMUA',tindakan:'SEMUA',peringatan:'SEMUA'};
function draw(){
 setRoleUI();
 document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 ['borang','status','tindakan','peringatan'].forEach(k=>$('panel-'+k).hidden=k!==tab);
 // Status sentiasa kelihatan di desktop dan PWA; bekukan pada tab Borang.
 $('kb-filter-top').hidden=false;
 $('list-status-filter').disabled=tab==='borang';
 $('list-status-filter').value=tab==='borang'?'SEMUA':(listFilterValue[tab]||'SEMUA');
 // Badge dikira daripada keadaan semasa setiap rekod, bukan masa dibaca.
 renderUnread();
 if(tab==='status'){renderMine();renderMyRelief();}
 if(tab==='tindakan'){renderActions();renderReliefQueue();}
 if(tab==='peringatan')renderReminders();
 renderStats();
}
// Kad ringkas, tidak memaparkan ID teknikal atau status relief.
function cardStatus(r){
 if(r.lifecycle==='DIBATALKAN')return ['Dibatalkan','neutral'];
 if(requireGpk(r)&&r.gpkStatus==='menunggu')return ['Tindakan GPK','warning'];
 return status(r);
}
function recordDateText(r){
 const dates=niceDay(r.start)+(r.end!==r.start?' – '+niceDay(r.end):'');
 return dates+(r.period==='SEPARUH'&&r.from&&r.to?' · '+r.from+' – '+r.to:'');
}
function compact(r,context){
 const [label,tone]=cardStatus(r);
 const category=TYPE[r.finalType||r.type]||r.type;
 const subtitle=context==='mine'?'':`<div class="item-owner">${esc(r.ownerName||'Guru')}</div>`;
 return `<div class="item"><button class="record-card" data-card-id="${esc(r.id)}" data-context="${esc(context)}" type="button" aria-label="Lihat butiran ${esc(category)}"><span class="item-main"><span class="item-heading"><strong class="item-title">${esc(category)}</strong><span class="pill ${tone}">${esc(label)}</span></span><span class="item-date-new">${esc(recordDateText(r))}</span>${subtitle}</span><span class="chevron" aria-hidden="true">›</span></button></div>`;
}
function requestExplanation(r){
 const label=cardStatus(r)[0];
 if(r.lifecycle==='DIBATALKAN')return ['Permohonan dibatalkan','Rekod ini telah dibatalkan. Relief bagi waktu yang belum bermula akan dibatalkan secara automatik.'];
 if(r.gpkStatus==='ditolak')return ['Permohonan tidak disokong','Permohonan ini tidak disokong oleh GPK. Sila rujuk catatan pentadbir dan hubungi pihak sekolah untuk tindakan susulan.'];
 if(docRequired(r)&&!r.docPath&&!r.docName)return ['Dokumen sokongan diperlukan','Permohonan ini belum mempunyai dokumen kelulusan atau surat sokongan yang direkodkan. Sila kemukakan dokumen melalui saluran rasmi sekolah. Gunakan butang Muat Naik Dokumen untuk melengkapkan bukti melalui storan Google Drive sekolah.'];
 if(requireGpk(r)&&r.gpkStatus==='menunggu')return ['Menunggu tindakan GPK','Permohonan ini sedang menunggu semakan atau sokongan Guru Penolong Kanan. Status belum bermaksud kelulusan cuti rasmi.'];
 if(r.relief==='sementara')return ['Relief sementara direkodkan','Perlindungan kelas sementara telah direkodkan untuk operasi sekolah. Ia bukan bukti kelulusan cuti rasmi; dokumen dan keputusan akhir masih perlu disemak.'];
 if(r.relief==='tanpa')return ['Relief tanpa sokongan lengkap','Kelas boleh dilindungi sementara, tetapi dokumen atau pengesahan masih belum lengkap. Permohonan perlu tindakan susulan mengikut prosedur sekolah.'];
 if(r.gpkStatus==='disahkan')return ['Pengesahan direkodkan','Sokongan GPK telah direkodkan. Semak kategori permohonan dan dokumen bagi memastikan semua syarat dipenuhi sebelum rekod dianggap selesai.'];
 if(r.docReviewed===true)return ['Dokumen telah disemak','Dokumen sokongan telah ditandakan sebagai disemak. Semak status tindakan dan rekod rasmi sebelum menganggap urusan selesai.'];
 return ['Status permohonan: '+label,'Permohonan telah direkodkan dan sedang melalui proses semakan. Sila lihat sejarah tindakan serta peringatan yang berkaitan.'];
}
function openRecord(r,context){
 const [label,tone]=cardStatus(r);
 const category=TYPE[r.finalType||r.type]||r.type;
 const [summaryTitle,summaryText]=requestExplanation(r);
 const bits=[
   `<div class="record-summary"><span class="pill ${tone}">${esc(label)}</span></div>`,
   `<section class="kb-popup-status-explanation" role="status"><strong>${esc(summaryTitle)}</strong><p>${esc(summaryText)}</p></section>`,
   `<div class="popup-field"><span>Nama Guru</span><strong>${esc(r.ownerName||user?.name||'Guru')}</strong></div>`,
   `<div class="popup-field"><span>Kategori</span><strong>${esc(category)}</strong></div>`,
   `<div class="popup-field"><span>Tarikh / Masa</span><strong>${esc(recordDateText(r))}</strong></div>`,
   r.scope?`<div class="popup-field"><span>Lokasi</span><strong>${esc(r.scope==='LUAR'?'Luar sekolah':'Dalam sekolah')}</strong></div>`:'',
   r.note?`<div class="popup-field"><span>Tujuan / Catatan</span><strong>${esc(r.note)}</strong></div>`:'',
   r.adminNote?`<div class="popup-field"><span>Catatan Pentadbir</span><strong>${esc(r.adminNote)}</strong></div>`:'',
   r.docName?`<div class="popup-field"><span>Dokumen</span><button class="doclink" data-open-doc="${esc(r.id)}" type="button">${esc(r.docName)}</button></div>`:'',
   actionButtons(r,context)
 ];
 openDialog(category,bits.filter(Boolean).join(''));
}
function actionButtons(r,context){
 let buttons=[];const b=(action,label,cls='secondary')=>`<button class="${cls} mini" data-do="${action}" data-id="${esc(r.id)}" type="button">${label}</button>`;
 if(r.lifecycle!=='DIBATALKAN'){
  if(r.ownerUid===user?.uid){
    if(docRequired(r)&&!r.docPath)buttons.push(b('upload','Muat Naik Dokumen'));
    buttons.push(b('cancelRequest','Batalkan Permohonan','danger'));
    if(!r.reliefStopAt)buttons.push(b('cancelMyRelief','Saya Boleh Mengajar · Henti Relief','success'));
  }
  if(context==='action'&&has('GPK')){
    if(requireGpk(r)&&r.gpkStatus==='menunggu')buttons.push(b('support','Sokong','success'),b('reject','Tidak Sokong','danger'));
    if(r.type==='KECEMASAN'&&r.task==='UMUM'&&r.gpkStatus==='disahkan'&&!r.finalType)buttons.push(b('final','Tentukan Jenis Cuti'));
    if(docRequired(r)&&r.docPath&&!r.docReviewed)buttons.push(b('reviewProof','Tanda Bukti Disemak','success'));
    buttons.push(b('remind','Rekod Peringatan'));
  }
 }
 if(context==='action'&&has('GB'))buttons.push('<span class="note">Untuk makluman GB</span>');
 return buttons.length?`<div class="actions">${buttons.join('')}</div>`:'';
}
function showList(id,rows,context){$(id).innerHTML=rows.length?rows.map(r=>compact(r,context)).join(''):'<div class="empty">Tiada rekod.</div>';}
function renderMine(){
 const filter=listFilterValue.status;
 const x=myRecords.filter(r=>filter==='SEMUA'||(filter==='AKTIF'?needAttention(r):completed(r))).sort((a,b)=>b.createdMs-a.createdMs);
 $('status-total').textContent=x.length+' rekod';showList('my-list',x,'mine');
}
function renderActions(){
 const filt=listFilterValue.tindakan;
 let x=[...records];
 if(filt==='AKTIF')x=x.filter(r=>has('GB')&&!has('GPK')?needAttention(r):needActionForRole(r));
 if(filt==='SELESAI')x=x.filter(completed);
 x.sort((a,b)=>b.createdMs-a.createdMs);
 $('action-title').textContent=has('GPK')?'Tindakan GPK':has('GB')?'Makluman Guru Besar':has('ADMIN_SISTEM')?'Pemantauan Admin Sistem':'Pemantauan e-Relief';
 $('action-total').textContent=x.length+' rekod';showList('action-list',x,'action');
}
function renderReminders(){
 const filter=listFilterValue.peringatan;
 const x=records.filter(r=>filter==='SEMUA'||(filter==='AKTIF'?needAttention(r):completed(r))).sort((a,b)=>b.createdMs-a.createdMs);
 $('reminders-total').textContent=x.length+' rekod';showList('reminder-list',x,'remind');
}

function reliefTag(r){return ({DIAGIH:'Guru Ganti Ditugaskan',TIADA_GANTI:'Tiada Guru Ganti',DIBATALKAN:'Dibatalkan',DIBATALKAN_GPK:'Dibatalkan GPK',PERLU_SERAH_TUGAS:'Perlu Serah Tugas'})[r.status]||r.status||'Belum Agih';}
function reliefItem(r,admin=false){
 const tone=r.status==='DIAGIH'?'success':r.status==='TIADA_GANTI'||r.status==='PERLU_SERAH_TUGAS'?'warning':'neutral';
 const controls=admin&&has('GPK')&&['DIAGIH','TIADA_GANTI','DIBATALKAN_GPK'].includes(r.status)?`<div class="actions"><button class="secondary mini" type="button" data-relief-action="replaceSlot" data-relief-id="${esc(r.id)}">Tukar / Pilih Guru</button><button class="danger mini" type="button" data-relief-action="cancelSlot" data-relief-id="${esc(r.id)}">Batalkan Relief</button></div>`:'';
 return `<div class="item" style="padding:11px"><div class="detail-line"><strong>${esc(r.teacherName||'Guru asal')}</strong> · ${esc(niceDay(r.date))} · ${esc(r.from||'')}–${esc(r.to||'')}</div><div class="detail-line">${esc(r.classId||'Kelas')} · ${esc(r.subject||'')} <span class="pill ${tone}">${esc(reliefTag(r))}</span></div>${r.replacementName?`<div class="detail-line">Guru ganti: <strong>${esc(r.replacementName)}</strong></div>`:''}${r.notes?`<div class="detail-line">${esc(r.notes)}</div>`:''}${controls}</div>`;
}
function renderReliefQueue(){
 const q=$('relief-queue');if(!q)return;
 const x=reliefQueue.filter(r=>r.engineVersion===2).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.from||'').localeCompare(b.from||''));
 $('relief-total').textContent=String(x.filter(r=>['DIAGIH','TIADA_GANTI','PERLU_SERAH_TUGAS'].includes(r.status)).length);
 q.innerHTML=x.length?x.map(r=>reliefItem(r,true)).join(''):'<div class="empty">Tiada jadual relief automatik lagi.</div>';
 const pending=x.filter(r=>r.status==='TIADA_GANTI'||r.status==='PERLU_SERAH_TUGAS').length;
 const btn=$('relief-alert-count');if(btn){btn.hidden=!pending;btn.textContent=String(pending);}
}
function renderMyRelief(){
 const list=$('my-relief-list');if(!list)return;
 const x=myRelief.filter(r=>r.engineVersion===2&&r.status==='DIAGIH');
 list.innerHTML=x.length?x.map(r=>reliefItem(r,false)).join(''):'<div class="empty">Tiada tugasan relief untuk anda.</div>';
}
function syncForm(){const type=$('type').value,scope=$('scope').value,period=$('period').value;
 const scopeVisible=type==='RASMI',taskVisible=scopeVisible&&scope==='DALAM',emergencyVisible=type==='KECEMASAN',periodVisible=type==='RASMI'||emergencyVisible,timeVisible=periodVisible&&period==='SEPARUH',fileVisible=['CRK','CTR'].includes(type)||(scopeVisible&&scope==='LUAR');
 $('scope-row').hidden=!scopeVisible;$('task-row').hidden=!taskVisible;$('emergency-row').hidden=!emergencyVisible;$('period-row').hidden=!periodVisible;$('time-row').hidden=!timeVisible;$('file-row').hidden=!fileVisible;
 $('scope').required=scopeVisible;$('task').required=taskVisible;$('emergency').required=emergencyVisible;$('period').required=periodVisible;$('from').required=timeVisible;$('to').required=timeVisible;
 $('from').disabled=!timeVisible;$('to').disabled=!timeVisible;
 if(!fileVisible){$('document').value='';$('document-status').textContent='Pilih PDF, JPG atau PNG (maksimum 5 MB). Fail disimpan secara persendirian di Google Drive sekolah.';}
 $('end').min=$('start').value||localDay();if($('end').value<$('start').value)$('end').value=$('start').value;
}
function validateFile(file){if(!file)return;const okay=['application/pdf','image/jpeg','image/png'].includes(file.type)&&/\.(pdf|jpe?g|png)$/i.test(file.name);if(!okay)throw Error('Hanya PDF, JPG atau PNG dibenarkan.');if(file.size>5*1024*1024)throw Error('Fail melebihi 5 MB.');}
function payload(){const type=$('type').value,scope=type==='RASMI'?$('scope').value:'',task=type==='RASMI'&&scope==='DALAM'?$('task').value:type==='KECEMASAN'?$('emergency').value:'',start=$('start').value,end=$('end').value;
 if(!type||!start||!end||start<localDay()||end<start)throw Error('Sila semak kategori dan tarikh (hari ini atau akan datang).');if(type==='RASMI'&&!scope||type==='RASMI'&&scope==='DALAM'&&!task||type==='KECEMASAN'&&!task)throw Error('Pilih lokasi dan tujuan urusan yang berkaitan.');
 const period=['RASMI','KECEMASAN'].includes(type)?$('period').value:'PENUH',from=period==='SEPARUH'?$('from').value:'',to=period==='SEPARUH'?$('to').value:'';
 if(period==='SEPARUH'&&(!from||!to||from>=to||start!==end))throw Error('Separuh hari memerlukan satu tarikh dan masa mula/tamat yang sah.');const note=str($('note').value);if(!note||note.length>240)throw Error('Masukkan tujuan ringkas.');
 const file=$('file-row').hidden?null:($('document').files[0]||null);if(file)validateFile(file);
 return {type,scope,task,start,end,period,from,to,note,file};}
let lastPopupFocus=null;
function closeDialog(){$('dialog').hidden=true;$('dialog-content').innerHTML='';if(lastPopupFocus?.isConnected)lastPopupFocus.focus();lastPopupFocus=null;}
function openDialog(title,html){lastPopupFocus=document.activeElement;$('dialog-title').textContent=title;$('dialog-content').innerHTML=html;$('dialog').hidden=false;$('dialog-close').focus();}
function confirmAction(r,action){
 const titles={cancelRequest:'Batalkan Permohonan Keberadaan',cancelMyRelief:'Saya Boleh Mengajar — Batalkan Relief',reviewProof:'Semak Dokumen',support:'Sokong Keberadaan',reject:'Tidak Sokong',final:'Tentukan Jenis Cuti',upload:'Muat Naik Dokumen',remind:'Rekod Peringatan'};
 let body=`<p><strong>${esc(r.ownerName||'Guru')}</strong> · ${esc(TYPE[r.type]||r.type)} · ${esc(niceDay(r.start))}</p>`;
 if(action==='upload')body+='<div class="fieldrow"><label for="add-file">Pilih PDF/JPG/PNG</label><input id="add-file" type="file" accept=".pdf,.jpg,.jpeg,.png"></div>';
 if(action==='final')body+='<div class="fieldrow"><label for="final-type">Jenis cuti akhir</label><select id="final-type"><option value="CRK">CRK</option><option value="CTR">CTR</option><option value="MC">MC</option><option value="KECEMASAN">Kekal Kecemasan</option></select></div>';
 if(action!=='upload'&&action!=='final')body+='<div class="fieldrow"><label for="admin-note">'+(['cancelRequest','cancelMyRelief','reviewProof'].includes(action)?'Sebab tindakan (wajib)':'Catatan ringkas')+'</label><textarea id="admin-note" rows="2" maxlength="200"></textarea></div>';
 if(action==='cancelRequest')body+='<p>Relief yang belum bermula akan dibatalkan secara automatik. Ini tidak membatalkan cuti dalam HRMIS atau saluran rasmi.</p>';
 if(action==='cancelMyRelief')body+='<p>Rekod Keberadaan kekal. Relief yang belum bermula akan dihentikan, manakala waktu berlangsung memerlukan serah tugas.</p>';
 body+=`<div class="actions" style="margin-top:15px;justify-content:flex-end"><button class="secondary mini" id="cancel-action" type="button">Kembali</button><button class="primary mini" id="confirm-action" data-action="${esc(action)}" data-id="${esc(r.id)}" type="button">Sahkan</button></div>`;
 openDialog(titles[action]||'Tindakan',body);
}
async function applyAction(id,act){
 const r=records.find(x=>x.id===id)||myRecords.find(x=>x.id===id);
 if(!r)throw Error('Rekod tidak ditemui.');if(r.testMode===true)throw Error('Rekod ujian lama tidak boleh diubah.');
 if(busy)return;
 const note=str($('admin-note')?.value),fType=$('final-type')?.value;
 if(['cancelRequest','cancelMyRelief','reviewProof'].includes(act)){
  if(note.length<6)throw Error('Sila masukkan sebab sekurang-kurangnya 6 aksara.');
  busy=true;try{const result=await transportDoc(act,id,null,{reason:note});closeDialog();toast('Tindakan berjaya direkodkan. '+(result.sync||''));}
  finally{busy=false;}return;
 }
 if(act==='upload'){
  if(r.ownerUid!==user?.uid)throw Error('Hanya pemohon boleh muat naik.');
  const file=$('add-file')?.files[0];if(!file)throw Error('Pilih dokumen.');validateFile(file);
  busy=true;try{await uploadProof(id,file);closeDialog();toast('Dokumen telah disimpan di Google Drive.');}finally{busy=false;}return;
 }
 if(!has('GPK'))throw Error('Akses GPK diperlukan.');
 let change={updatedAt:fns.serverTimestamp(),updatedByUid:user.uid};
 if(act==='support'||act==='reject'){
  if(!requireGpk(r)||r.gpkStatus!=='menunggu')throw Error('Tiada sokongan GPK yang tertunggak untuk rekod ini.');
  change.gpkStatus=act==='support'?'disahkan':'ditolak';
 }
 else if(act==='final'){
  if(r.type!=='KECEMASAN'||r.task!=='UMUM'||!fType)throw Error('Jenis akhir hanya untuk kecemasan.');
  change.finalType=fType==='KECEMASAN'?'':fType;change.docReviewed=false;
 }else if(act==='remind')change.reminderAt=fns.serverTimestamp();
 else throw Error('Tindakan tidak disokong.');
 if(note)change.adminNote=note.slice(0,200);
 busy=true;try{await commitChange(id,change,act);closeDialog();toast('Tindakan direkodkan.');}finally{busy=false;}
}
function confirmReliefAction(r,action){
 let body=`<p><strong>${esc(r.classId||'Kelas')}</strong> · ${esc(niceDay(r.date))} · ${esc(r.from)}–${esc(r.to)}</p>`;
 if(action==='replaceSlot'){
  const opts=reliefStaff.map(x=>`<option value="${esc(x.idStaf)}">${esc(x.name||x.idStaf)}</option>`).join('');
  body+=`<div class="fieldrow"><label for="relief-staff">Guru ganti</label><select id="relief-staff"><option value="">Pilih guru</option>${opts}</select></div>`;
 }
 body+='<div class="fieldrow"><label for="relief-reason">Sebab (wajib)</label><textarea id="relief-reason" rows="2" maxlength="200"></textarea></div>';
 body+=`<div class="actions"><button class="secondary mini" id="cancel-action" type="button">Kembali</button><button class="primary mini" id="confirm-relief" data-relief-action="${esc(action)}" data-relief-id="${esc(r.id)}" type="button">Sahkan</button></div>`;
 openDialog(action==='cancelSlot'?'GPK — Batalkan Relief':'GPK — Tukar Guru Relief',body);
}
async function applyReliefAction(id,action){
 const reason=str($('relief-reason')?.value),staffId=str($('relief-staff')?.value);
 if(reason.length<6)throw Error('Isi sebab sekurang-kurangnya 6 aksara.');
 if(action==='replaceSlot'&&!staffId)throw Error('Pilih guru ganti.');
 busy=true;try{await transportDoc(action,'',null,{reliefId:id,reason,staffId});closeDialog();toast('Perubahan jadual relief direkodkan.');}
 finally{busy=false;}
}
// Every update atomically creates an immutable audit row. A transaction prevents lost writes.
async function commitChange(id,change,action){
 const ref=fns.doc(db,'semakmur_fi_keberadaan',id);
 const audit=fns.doc(fns.collection(db,'semakmur_fi_keberadaan_audit'));
 await fns.runTransaction(db,async tr=>{
   const snapshot=await tr.get(ref);if(!snapshot.exists())throw Error('Rekod sudah tiada. Muat semula.');
   const before=snapshot.data();
   if(before.testMode===true)throw Error('Rekod UJIAN lama tidak boleh dipinda.');
   const revision=Number(before.revision||0)+1;
   const update={...change,revision,lastActionId:audit.id,updatedAt:fns.serverTimestamp(),updatedByUid:user.uid,updatedByEmail:user.email};
   // created/owner fields cannot be changed; Firebase Rules enforce the same constraint.
   tr.update(ref,update);
   tr.set(audit,{requestId:id,ownerUid:before.ownerUid,action,byUid:user.uid,byEmail:user.email,revision,
     gpkStatus:update.gpkStatus??before.gpkStatus,relief:update.relief??before.relief,
     finalType:update.finalType??before.finalType,testMode:before.testMode===true,at:fns.serverTimestamp()});
 });
}
// Google Drive via Apps Script Web App. Form POST to isolated iframe avoids Apps Script CORS redirects.
// Never put a service-account key or Drive folder ID in frontend. Endpoint is public, requests require Firebase ID token.
function docEndpoint(){
 const el=document.querySelector('meta[name="semakmur-fi-document-webapp"]');
 const url=(el?.content||'').trim();
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url))
   throw Error('Tetapkan URL Web App Apps Script dokumen di Fi-KeberadaanGuru.html dahulu.');
 return url;
}
function fileBase64(file){return new Promise((resolve,reject)=>{
 const rd=new FileReader();rd.onerror=()=>reject(Error('Fail tidak dapat dibaca.'));
 rd.onload=()=>resolve(String(rd.result).split(',')[1]||'');rd.readAsDataURL(file);
});}
async function transportDoc(action,id,file,extra={}){
 if(!user)throw Error('Sesi MOE tidak tersedia.');
 const url=docEndpoint();
 const app=(await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js')).getApps().find(a=>a.name==='semakmur-fi-dashboard');
 if(!app)throw Error('Firebase belum disambungkan.');
 const auth=(await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')).getAuth(app);
 if(!auth.currentUser)throw Error('Sila log masuk semula.');
 const idToken=await auth.currentUser.getIdToken(true);
 const nonce=(crypto.randomUUID?.()||String(Date.now())+Math.random().toString(36));
 const body={action,requestId:id,idToken,nonce,...extra};
 if(file){body.fileName=file.name;body.mimeType=file.type;body.base64=await fileBase64(file);}
 return new Promise((resolve,reject)=>{
  const iframe=document.createElement('iframe');iframe.name='fi-doc-'+nonce;iframe.hidden=true;
  iframe.setAttribute('aria-hidden','true');iframe.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin');
  const form=document.createElement('form');form.method='POST';form.action=url;form.target=iframe.name;form.hidden=true;
  const f=document.createElement('input');f.name='payload';f.type='hidden';f.value=JSON.stringify(body);form.appendChild(f);
  let ended=false;
  function cleanup(){window.clearTimeout(watchdog);window.removeEventListener('message',onMessage);form.remove();iframe.remove();}
  function onMessage(ev){
   if(!/^https:\/\/(script\.google\.com|([a-z0-9-]+\.)?script\.googleusercontent\.com)$/.test(ev.origin))return;
   const data=ev.data;if(data?.channel!=='semakmur-fi-doc-v1'||data.nonce!==nonce)return;
   if(ended)return;ended=true;cleanup();data.ok?resolve(data):reject(Error(data.error||'Operasi dokumen gagal.'));
  }
  const watchdog=window.setTimeout(()=>{if(ended)return;ended=true;cleanup();reject(Error('Tiada respons Apps Script. Semak deployment dan sambungan internet.'));},45000);
  window.addEventListener('message',onMessage);document.body.append(iframe,form);form.submit();
 });
}
async function uploadProof(id,file){
 validateFile(file);
 const result=await transportDoc('upload',id,file);
 if(!result.fileName)throw Error('Respons backend tidak mengesahkan nama fail.');
 return result;
}
async function showDocument(id){
 const result=await transportDoc('view',id,null);
 if(!result.base64||!result.mimeType)throw Error('Dokumen tidak dapat dibuka.');
 const binary=atob(result.base64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const blob=new Blob([bytes],{type:result.mimeType}),u=URL.createObjectURL(blob);
 // Buka dalam tab baru; fallback muat turun jika popup disekat.
 const a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';
 a.download=String(result.fileName||'dokumen').replace(/[\/\\]/g,'_');document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(u),30000);
}
async function submit(ev){ev.preventDefault();if(busy)return;let d;try{d=payload();}catch(e){$('form-status').textContent=e.message;return;}

 busy=true;$('submit').disabled=true;$('form-status').textContent='Menyimpan…';try{if(d.file)docEndpoint();const id=fns.doc(fns.collection(db,'semakmur_fi_keberadaan')).id;
 const rec={id,testMode:false,ownerUid:user.uid,ownerEmail:user.email,ownerName:user.name,type:d.type,scope:d.scope,task:d.task,start:d.start,end:d.end,period:d.period,from:d.from,to:d.to,note:d.note,docPath:'',docName:'',docReviewed:false,gpkStatus:'menunggu',relief:'belum',finalType:'',adminNote:'',updatedByUid:user.uid,createdAt:fns.serverTimestamp(),updatedAt:fns.serverTimestamp(),createdMs:Date.now()};
 {const audit=fns.doc(fns.collection(db,'semakmur_fi_keberadaan_audit'));rec.revision=1;rec.lastActionId=audit.id;rec.updatedByEmail=user.email;const b=fns.writeBatch(db);b.set(fns.doc(db,'semakmur_fi_keberadaan',id),rec);b.set(audit,{requestId:id,ownerUid:user.uid,action:'CREATE',byUid:user.uid,byEmail:user.email,revision:1,gpkStatus:rec.gpkStatus,relief:rec.relief,finalType:rec.finalType,testMode:rec.testMode,at:fns.serverTimestamp()});await b.commit();}
 if(d.file){$('form-status').textContent='Rekod disimpan. Memuat naik lampiran ke Google Drive…';try{await uploadProof(id,d.file);}catch(uploadError){$('form-status').textContent='Permohonan telah direkodkan tetapi fail belum disimpan: '+(uploadError.message||uploadError);tab='status';draw();return;}}
 $('apply-form').reset();$('start').value=localDay();$('end').value=localDay();syncForm();tab='status';draw();toast('Rekod keberadaan dihantar.');
 }catch(e){$('form-status').textContent='Gagal menyimpan: '+(e.code||e.message||e);}finally{busy=false;$('submit').disabled=false;if($('form-status').textContent==='Menyimpan…')$('form-status').textContent='';}}

const FI_EMBED=new URLSearchParams(location.search).get('embed')==='1';
function tellDashboard(type,message=''){
 if(!FI_EMBED||window.parent===window)return;
 try{window.parent.postMessage({type,message},location.origin);}catch(_){}
}
function handlers(){document.addEventListener('click',ev=>{const tabBtn=ev.target.closest('#tabs [data-tab]');if(tabBtn){tab=tabBtn.dataset.tab;draw();return;}const card=ev.target.closest('[data-card-id]');if(card){const rec=records.find(r=>r.id===card.dataset.cardId)||myRecords.find(r=>r.id===card.dataset.cardId);if(rec)openRecord(rec,card.dataset.context||'mine');return;}const confirmRel=ev.target.closest('#confirm-relief');if(confirmRel){applyReliefAction(confirmRel.dataset.reliefId,confirmRel.dataset.reliefAction).catch(e=>toast(e.message||String(e)));return;}
 const ra=ev.target.closest('[data-relief-action]');if(ra){const r=reliefQueue.find(x=>x.id===ra.dataset.reliefId);if(r)confirmReliefAction(r,ra.dataset.reliefAction);return;}
 const x=ev.target.closest('[data-do]');if(x){const r=records.find(r=>r.id===x.dataset.id)||myRecords.find(r=>r.id===x.dataset.id);if(r)confirmAction(r,x.dataset.do);return;}const o=ev.target.closest('[data-open-doc]');if(o){showDocument(o.dataset.openDoc).catch(e=>toast(e.message||String(e)));return;}if(ev.target.id==='dialog-close'||ev.target.id==='cancel-action'){closeDialog();return;}const c=ev.target.closest('#confirm-action');if(c){applyAction(c.dataset.id,c.dataset.action).catch(e=>toast(e.message||String(e)));return;}});
 $('document').addEventListener('change',()=>{const file=$('document').files[0];try{if(file)validateFile(file);$('document-status').textContent=file?('Sedia dimuat naik: '+file.name):'Tiada dokumen dipilih.';}catch(e){$('document').value='';$('document-status').textContent=e.message;}});
 $('apply-form').addEventListener('submit',submit);['type','scope','period','start'].forEach(id=>$(id).addEventListener('change',syncForm));$('list-status-filter').addEventListener('change',e=>{if(tab!=='borang'){listFilterValue[tab]=e.target.value;draw();}});$('dialog').addEventListener('click',e=>{if(e.target===$('dialog'))closeDialog()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('dialog').hidden)closeDialog();});

}
async function init(){handlers();$('start').min=localDay();$('end').min=localDay();$('start').value=localDay();$('end').value=localDay();syncForm();
 try{const cfg=window.SeMAKMURFirebasePilotConfig;if(!cfg?.projectId)throw Error('Konfigurasi Firebase tidak tersedia.');const [app,authlib,dbLib]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')]);
 const fb=app.getApps().find(a=>a.name==='semakmur-fi-dashboard')||app.initializeApp(cfg,'semakmur-fi-dashboard');const auth=authlib.getAuth(fb);db=dbLib.getFirestore(fb);fns={...dbLib};
 authlib.onAuthStateChanged(auth,async u=>{unsubs.forEach(fn=>fn());unsubs=[];user=null;records=[];myRecords=[];myRelief=[];reliefQueue=[];statsLoaded=false;renderStats();if(!u){$('user-label').textContent='Belum log masuk';showMessage('Sila log masuk melalui Fi-LoginSession.html.','error');tellDashboard('semakmur-fi-kb-error','Sesi log masuk tidak tersedia.');return;}try{const staff=await dbLib.getDoc(dbLib.doc(db,'semakmur_dashboard_fi',u.uid));const raw=staff.data();if(!staff.exists()||raw?.active!==true||str(raw.ownerEmail).toLowerCase()!==str(u.email).toLowerCase()||raw.profile?.email?.toLowerCase()!==u.email.toLowerCase())throw Error('Akaun guru tidak sah atau belum aktif.');user={uid:u.uid,email:u.email,name:str(raw.profile?.namaPenuh)||u.displayName||'Guru'};profile=raw;$('user-label').textContent=user.name;
 try{const roleSnap=await dbLib.getDoc(dbLib.doc(db,'semakmur_fi_keberadaan_roles',u.uid));const roleData=roleSnap.data();realRoles=roleSnap.exists()&&roleData.active===true&&roleData.ownerEmail===u.email?(roleData.roles||[]):[];}catch{realRoles=[];}
 roles=realRoles.filter(r=>['GB','GPK','ADMIN_SISTEM','RELIEF_PEMANTAU'].includes(r));
 $('mode-label').textContent='RASMI';
 setRoleUI();
 const coll=dbLib.collection(db,'semakmur_fi_keberadaan');
 unsubs.push(dbLib.onSnapshot(dbLib.query(coll,dbLib.where('ownerUid','==',u.uid),dbLib.limit(100)),s=>{
   myRecords=s.docs.map(x=>x.data()).filter(r=>r.testMode===false);statsLoaded=true;
   if(!isAdmin())records=[...myRecords];
   draw();
 },e=>showMessage('Gagal membaca rekod sendiri: '+(e.code||e.message),'error')));
 if(isAdmin()){
   unsubs.push(dbLib.onSnapshot(dbLib.query(coll,dbLib.where('testMode','==',false),dbLib.limit(100)),s=>{
     records=s.docs.map(x=>x.data()).filter(r=>r.testMode===false);statsLoaded=true;draw();
   },e=>showMessage('Bacaan rekod rasmi gagal. Semak Firestore Rules dan peranan rasmi: '+(e.code||e.message),'error')));
   if(isReliefViewer()){
     unsubs.push(dbLib.onSnapshot(dbLib.query(dbLib.collection(db,'semakmur_fi_relief_harian'),dbLib.orderBy('date','desc'),dbLib.limit(100)),s=>{reliefQueue=s.docs.map(x=>({id:x.id,...x.data()})).filter(r=>r.engineVersion===2);renderReliefQueue();renderStats();},e=>console.warn('Senarai relief belum tersedia:',e.code||e.message)));
   }
 }
 // Tugasan relief yang ditujukan kepada guru ini, dibaca terus daripada Firestore.
 unsubs.push(dbLib.onSnapshot(dbLib.query(dbLib.collection(db,'semakmur_fi_relief_harian'),dbLib.where('replacementUid','==',u.uid),dbLib.limit(100)),snap=>{
   myRelief=snap.docs.map(x=>({id:x.id,...x.data()})).filter(r=>r.engineVersion===2);renderMyRelief();
 },e=>console.warn('Relief guru tidak dapat dibaca:',e.code||e.message)));
 if(has('GPK')){
   dbLib.getDoc(dbLib.doc(db,'semakmur_fi_relief_staf','active')).then(snap=>{
     reliefStaff=(snap.data()?.staff||[]).filter(x=>x.idStaf&&x.name);renderReliefQueue();
   }).catch(e=>console.warn('Senarai guru relief belum diselaraskan:',e.code||e.message));
 }
 showMessage('');draw();tellDashboard('semakmur-fi-kb-ready');}catch(e){$('user-label').textContent='Semakan akaun gagal';tellDashboard('semakmur-fi-kb-error',String(e.code||e.message||e));showMessage('Semakan akaun gagal: '+(e.code||e.message||e),'error');}}
 ,e=>{$('user-label').textContent='Pengesahan gagal';showMessage('Pengesahan Firebase gagal: '+(e.code||e.message||e),'error');tellDashboard('semakmur-fi-kb-error',String(e.code||e.message||e));}
 );
 }catch(e){$('user-label').textContent='Sambungan gagal';showMessage('Modul belum dapat disambungkan: '+(e.code||e.message||e),'error');tellDashboard('semakmur-fi-kb-error',String(e.code||e.message||e));}
}
window.addEventListener('message',e=>{if(!FI_EMBED||e.origin!==location.origin||e.source!==window.parent)return;if(e.data?.type==='semakmur-fi-kb-request-state'&&user)tellDashboard('semakmur-fi-kb-ready');if(e.data?.type==='semakmur-fi-kb-show-relief'&&isReliefViewer()){tab='tindakan';draw();$('relief-box').open=true;}});
init();
