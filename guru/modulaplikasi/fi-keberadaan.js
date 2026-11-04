/* SeMAKMUR Fi e-Keberadaan V6.7-SPARK: frontend UI refinements and atomic audit. Firebase Storage is DISABLED (Spark plan).
   Real Firebase data and role-based views; no role-switching demo. */
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=x=>String(x??'').trim(), localDay=()=>{const x=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${x.year}-${x.month}-${x.day}`};
const niceDay=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)?x.split('-').reverse().join('/'):str(x);
const TYPE={CRK:'CRK',CTR:'CTR',MC:'Cuti Sakit (MC)',RASMI:'Urusan Rasmi / Bengkel / LDP / PLC',KECEMASAN:'Kecemasan'};
let statsLoaded=false,user=null,roles=[],realRoles=[],testAccess=false,profile=null,records=[],myRecords=[],reliefQueue=[],tab='borang',busy=false,db=null,fns=null,unsubs=[];
let readRef=null,seenReady=false,seenAt={status:0,tindakan:0,peringatan:0};
const isAdmin=()=>testAccess||roles.some(r=>['GPK','GB','PENYELARAS'].includes(r)),has=r=>roles.includes(r);
const docRequired=r=>['CRK','CTR'].includes(r.finalType||r.type)||(r.type==='RASMI'&&r.scope==='LUAR');
const reliefLabel=r=>(r.type==='RASMI'&&r.scope==='LUAR'&&r.docPath&&r.relief==='belum'?'Menunggu Semakan Surat':r.type==='RASMI'&&r.scope==='DALAM'&&r.task==='SEKAT_CALON'&&r.gpkStatus!=='disahkan'?'Layak Jadi Relief':({belum:'Belum Relief',sah:'Relief Dengan Pengesahan',tanpa:'Relief Tanpa Sokongan',sementara:'Relief Sementara',tiada:'Tiada Relief',dikecualikan:'Tidak Boleh Diberi Relief'}[r.relief]||'Belum Relief'));
const reliefTone=r=>r.relief==='sah'||r.relief==='dikecualikan'?'success':r.relief==='tanpa'||r.relief==='sementara'?'warning':'neutral';
function status(r){if(r.gpkStatus==='ditolak')return ['Tidak Disokong','danger'];if(docRequired(r)&&!r.docPath&&!r.docName)return ['Perlu Dokumen','warning'];if(r.finalType&&['CRK','CTR'].includes(r.finalType)&&!r.docReviewed)return ['Perlu Semakan Cuti','warning'];if(['CRK','CTR'].includes(r.type)&&r.docReviewed&&r.relief==='sah')return ['Bukti Disemak','success'];if(r.type==='RASMI'&&r.scope==='LUAR'&&r.docReviewed&&r.relief==='sah')return ['Surat Disemak','success'];if(r.gpkStatus==='disahkan')return ['Disahkan GPK','success'];if(r.type==='RASMI'&&r.scope==='LUAR'&&r.docPath)return ['Surat Dihantar','warning'];if(['CRK','CTR'].includes(r.type))return ['Menunggu Semakan','warning'];return ['Menunggu GPK','warning'];}
function completed(r){if(r.gpkStatus==='ditolak')return true;if(docRequired(r)&&!r.docPath&&!r.docName)return false;if(['CRK','CTR'].includes(r.type)||['CRK','CTR'].includes(r.finalType||''))return r.relief==='sah'&&r.docReviewed===true;if(r.type==='RASMI'&&r.scope==='LUAR')return r.relief==='sah';if(r.type==='RASMI'&&r.scope==='DALAM'||r.type==='MC')return r.gpkStatus!=='menunggu'&&r.gpkStatus!=='';if(r.type==='KECEMASAN')return r.gpkStatus!=='menunggu'&&(r.task==='KELUAR'||Boolean(r.finalType))&&!['tanpa','sementara'].includes(r.relief);return false;}
function needAttention(r){return !completed(r)||['tanpa','sementara'].includes(r.relief);}
const requireGpk=r=>r.type==='MC'||r.type==='KECEMASAN'||r.type==='RASMI'&&r.scope==='DALAM';
function needActionForRole(r){if(has('GPK')&&(requireGpk(r)&&r.gpkStatus==='menunggu'||r.type==='KECEMASAN'&&r.task==='UMUM'&&!r.finalType||r.relief==='tanpa'||docRequired(r)&&!r.docPath))return true;
 if(has('PENYELARAS'))return r.relief==='belum'&&(['CRK','CTR'].includes(r.type)||r.type==='RASMI'&&r.scope==='LUAR')||r.relief==='belum'&&['MC','KECEMASAN'].includes(r.type)&&r.task!=='KELUAR'&&r.gpkStatus==='menunggu';
 return false;}
function showMessage(msg='',kind='info'){const a=$('alert');a.hidden=!msg;a.textContent=msg;a.style.background=kind==='error'?'#fff0f1':'#fff5e7';a.style.color=kind==='error'?'#a2454e':'#855815';}
function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;setTimeout(()=>{$('toast').hidden=true},3600)}
function setRoleUI(){
 const personal=roles.filter(r=>['GB','GPK','PENYELARAS'].includes(r)).map(r=>r==='PENYELARAS'?'Penyelaras Relief':r);
 $('role-label').textContent=testAccess?['Admin Sistem',...personal].join(' / '):(personal.join(' / ')||'Guru');
 $('tabs').querySelector('[data-tab=tindakan]').hidden=!isAdmin();
 $('tabs').querySelector('[data-tab=peringatan]').hidden=!isAdmin();
 // Queue relief hanya untuk peranan operasi sebenar, tidak untuk Admin Sistem tanpa pelantikan.
 $('relief-box').hidden=!roles.some(r=>['GPK','GB','PENYELARAS'].includes(r));
 if((tab==='tindakan'||tab==='peringatan')&&!isAdmin())tab='borang';
}
const eventMs=r=>{
 const v=r.updatedAt;
 return typeof v?.toMillis==='function'?v.toMillis():Number(r.createdMs||0);
};
function unreadFor(name){
 if(!user||!seenReady)return 0;
 const newer=r=>eventMs(r)>seenAt[name];
 if(name==='status')return myRecords.filter(r=>r.updatedByUid!==user.uid&&newer(r)).length;
 if(name==='tindakan')return records.filter(r=>(testAccess?needAttention(r):(has('GB')?needAttention(r):needActionForRole(r)))&&newer(r)).length;
 if(name==='peringatan')return records.filter(r=>needAttention(r)&&newer(r)).length;
 return 0;
}
function renderUnread(){
 for(const [name,id] of [['status','my-count'],['tindakan','work-count'],['peringatan','remind-count']]){
  const x=$(id),n=unreadFor(name);
  x.hidden=n<1;x.textContent=n>99?'99+':String(n);
  x.setAttribute('aria-label',n+' makluman baharu');
 }
}
async function markTabSeen(which){
 if(!['status','tindakan','peringatan'].includes(which)||!user||!fns||!readRef)return;
 const prev=seenAt[which];seenAt[which]=Date.now();seenReady=true;renderUnread();
 const field={status:'seenStatus',tindakan:'seenTindakan',peringatan:'seenPeringatan'}[which];
 try{
  await fns.setDoc(readRef,{ownerUid:user.uid,ownerEmail:user.email,[field]:fns.serverTimestamp()},{merge:true});
 }catch(e){seenAt[which]=prev;renderUnread();showMessage('Tidak dapat menyimpan status notifikasi: '+(e.code||e.message),'error');}
}
function renderStats(){
  const source=isAdmin()?records:myRecords;
  const value=(id,n)=>{const el=$(id);if(el)el.textContent=statsLoaded?String(n):'—';};
  value('kb-stat-total',source.length);
  value('kb-stat-pending',source.filter(needAttention).length);
  value('kb-stat-docs',source.filter(r=>docRequired(r)&&!r.docPath&&!r.docName).length);
  value('kb-stat-relief',source.filter(r=>['sah','tanpa','sementara'].includes(r.relief)).length);
  const desc=$('kb-stat-scope');
  if(desc)desc.textContent=testAccess?'Semua rekod (rasmi dan ujian)':isAdmin()?'Rekod dibenarkan mengikut peranan':'Permohonan saya';
  const note=$('kb-stat-updated');
  if(note)note.textContent=statsLoaded?'Berdasarkan rekod yang berjaya dibaca · maks. 100 rekod':'Menunggu pengesahan data Firestore';
}
const listFilterValue={status:'SEMUA',tindakan:'AKTIF',peringatan:'AKTIF'};
function draw(){
 setRoleUI();
 document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 ['borang','status','tindakan','peringatan'].forEach(k=>$('panel-'+k).hidden=k!==tab);
 $('kb-filter-top').hidden=tab==='borang';
 if(tab!=='borang')$('list-status-filter').value=listFilterValue[tab]||'SEMUA';
 // Maintain previous counters in DOM for compatibility; no redesign of notifications in this release.
 $('my-count').textContent=myRecords.length;
 $('work-count').textContent=records.filter(needActionForRole).length;
 $('remind-count').textContent=records.filter(needAttention).length;
 if(tab==='status')renderMine();
 if(tab==='tindakan'){renderActions();renderReliefQueue();}
 if(tab==='peringatan')renderReminders();
 renderStats();
}
// Kad ringkas, tidak memaparkan ID teknikal atau status relief.
function cardStatus(r){
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
 if(r.gpkStatus==='ditolak')return ['Permohonan tidak disokong','Permohonan ini tidak disokong oleh GPK. Sila rujuk catatan pentadbir dan hubungi pihak sekolah untuk tindakan susulan.'];
 if(docRequired(r)&&!r.docPath&&!r.docName)return ['Dokumen sokongan diperlukan','Permohonan ini belum mempunyai dokumen kelulusan atau surat sokongan yang direkodkan. Sila kemukakan dokumen melalui saluran rasmi sekolah. Muat naik terus dalam modul ini belum tersedia pada pelan Firebase Spark.'];
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
   `<div class="record-summary"><span class="pill ${tone}">${esc(label)}</span>${r.testMode===true?'<span class="pill warning">UJIAN</span>':''}</div>`,
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
function actionButtons(r,context){let buttons=[];const b=(action,label,cls='secondary')=>`<button class="${cls} mini" data-do="${action}" data-id="${esc(r.id)}" type="button">${label}</button>`;
 // Lampiran belum tersedia pada pelan Spark; tiada butang muat naik.
 if(context==='action'){
  if(has('GPK')&&requireGpk(r)&&r.gpkStatus==='menunggu'){buttons.push(b('support','Sokong','success'),b('reject','Tidak Sokong','danger'));}
  if(has('GPK')&&r.type==='KECEMASAN'&&r.task==='UMUM'&&r.gpkStatus==='disahkan'&&!r.finalType)buttons.push(b('final','Tentukan Jenis Cuti'));
  if(has('PENYELARAS')&&(['CRK','CTR'].includes(r.type)||['CRK','CTR'].includes(r.finalType||'')||r.type==='RASMI'&&r.scope==='LUAR')&&(r.relief==='belum'||r.relief==='tanpa'||r.relief==='sementara'||!r.docReviewed)){
   if((r.docPath||r.docName)&&!r.docReviewed)buttons.push(b('approve','Sahkan Bukti / Relief','success'));
   if(r.relief==='belum')buttons.push(b('without','Relief Tanpa Kebenaran','warn'));
  }
  if(has('PENYELARAS')&&(r.type==='MC'||r.type==='KECEMASAN'&&r.task!=='KELUAR')&&r.gpkStatus==='menunggu'&&r.relief==='belum')buttons.push(b('temporary','Relief Sementara','warn'));
  if(has('GB'))buttons.push('<span class="note">Untuk makluman GB</span>');
 }
 if(context==='remind'&&has('GPK'))buttons.push(b('remind','Tanda Peringatan'));
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
 if(filt==='AKTIF')x=x.filter(r=>testAccess?needAttention(r):(has('GB')?needAttention(r):needActionForRole(r)));
 if(filt==='SELESAI')x=x.filter(completed);
 x.sort((a,b)=>b.createdMs-a.createdMs);
 $('action-title').textContent=testAccess?'Semua Rekod — Admin Sistem':has('GB')?'Makluman Guru Besar':has('GPK')?'Tindakan GPK':'Tindakan Penyelaras Relief';
 $('action-total').textContent=x.length+' rekod';showList('action-list',x,'action');
}
function renderReminders(){
 const filter=listFilterValue.peringatan;
 const x=records.filter(r=>filter==='SEMUA'||(filter==='AKTIF'?needAttention(r):completed(r))).sort((a,b)=>b.createdMs-a.createdMs);
 $('reminders-total').textContent=x.length+' rekod';showList('reminder-list',x,'remind');
}

function renderReliefQueue(){
  const q=$('relief-queue');if(!q)return;
  $('relief-total').textContent=String(reliefQueue.length);
  q.innerHTML=reliefQueue.length?reliefQueue.map(r=>`<div class="item"><div class="detail-line"><strong>${esc(r.teacherName||'Guru')}</strong> · ${esc(r.date||'')} · ${esc(r.from||'')}–${esc(r.to||'')}</div><div class="detail-line">${esc(r.classId||'Kelas')} · ${esc(r.subject||'')} <span class="pill ${r.pairingReview?'warning':'neutral'}">${r.pairingReview?'Semak pairing':'Perlu agihan'}</span></div></div>`).join(''):'<div class="empty">Tiada keperluan relief dijana lagi.</div>';
}
function syncForm(){const type=$('type').value,scope=$('scope').value,period=$('period').value;
 const scopeVisible=type==='RASMI',taskVisible=scopeVisible&&scope==='DALAM',emergencyVisible=type==='KECEMASAN',periodVisible=type==='RASMI'||emergencyVisible,timeVisible=periodVisible&&period==='SEPARUH',fileVisible=['CRK','CTR'].includes(type)||(scopeVisible&&scope==='LUAR');
 $('scope-row').hidden=!scopeVisible;$('task-row').hidden=!taskVisible;$('emergency-row').hidden=!emergencyVisible;$('period-row').hidden=!periodVisible;$('time-row').hidden=!timeVisible;$('file-row').hidden=!fileVisible;
 $('scope').required=scopeVisible;$('task').required=taskVisible;$('emergency').required=emergencyVisible;$('period').required=periodVisible;$('from').required=timeVisible;$('to').required=timeVisible;
 $('from').disabled=!timeVisible;$('to').disabled=!timeVisible;
 if(!fileVisible){$('document').value='';$('document-status').textContent='Pilih PDF, JPG atau PNG (maksimum 5 MB). Sambungan muat naik belum tersedia; fail tidak akan dihantar atau disimpan.';}
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
function confirmAction(r,action){let title={approve:'Relief Dengan Kebenaran',without:'Relief Tanpa Kebenaran',temporary:'Relief Sementara',support:'Sokong Keberadaan',reject:'Tidak Sokong',final:'Tentukan Jenis Cuti',upload:'Lengkapkan Dokumen',remind:'Tanda Peringatan'}[action]||'Tindakan';
 let body=`<p><strong>${esc(r.ownerName)}</strong> · ${esc(TYPE[r.type]||r.type)} · ${esc(niceDay(r.start))}</p>`;
 if(action==='approve')body+='<p>Pastikan dokumen telah dibaca dan disemak dengan sumber rasmi. Ini bukan kelulusan cuti.</p><label><input id="doc-ack" type="checkbox"> Saya telah menyemak dokumen dengan sumber rasmi.</label>';
 if(action==='upload')body+='<div class="fieldrow"><label for="add-file">Pilih fail PDF/JPG/PNG</label><input id="add-file" type="file" accept=".pdf,.jpg,.jpeg,.png"></div>';
 if(action==='final')body+='<div class="fieldrow"><label for="final-type">Jenis cuti akhir</label><select id="final-type"><option value="CRK">CRK</option><option value="CTR">CTR</option><option value="MC">MC</option><option value="KECEMASAN">Kekal Kecemasan</option></select></div><p>CRK/CTR memerlukan bukti kelulusan rasmi. Pertukaran kategori bukan kelulusan cuti.</p>';
 if(['reject','without','temporary','support','remind'].includes(action))body+='<div class="fieldrow"><label for="admin-note">Catatan ringkas</label><textarea id="admin-note" rows="2" maxlength="200" placeholder="Pilihan"></textarea></div>';
 body+=`<div class="actions" style="margin-top:15px;justify-content:flex-end"><button class="secondary mini" id="cancel-action" type="button">Batal</button><button class="primary mini" id="confirm-action" data-action="${esc(action)}" data-id="${esc(r.id)}" type="button">Sahkan</button></div>`;openDialog(title,body);
}
async function applyAction(id,act){const r=records.find(x=>x.id===id);if(!r)throw Error('Rekod tidak ditemui.');if(testAccess && r.testMode!==true&&!roles.some(k=>['GPK','PENYELARAS'].includes(k)))throw Error('Admin Sistem boleh melihat rekod rasmi, tetapi tidak meluluskan tanpa pelantikan rasmi.');if(busy)return;const who=user.uid;let change={updatedAt:fns.serverTimestamp(),updatedByUid:who};
 const note=str($('admin-note')?.value), fType=$('final-type')?.value;
 if(act==='approve'){if(!has('PENYELARAS'))throw Error('Akses Penyelaras sahaja.');if(!r.docPath&&!r.docName)throw Error('Dokumen diperlukan.');if(!$('doc-ack')?.checked)throw Error('Sahkan semakan dokumen dahulu.');change.relief='sah';change.docReviewed=true;}
 if(act==='without'||act==='temporary'){if(!has('PENYELARAS'))throw Error('Akses Penyelaras sahaja.');if(act==='temporary'&&(r.type==='KECEMASAN'&&r.task==='KELUAR'||r.gpkStatus!=='menunggu'))throw Error('Tidak boleh aktifkan relief sementara untuk kes ini.');change.relief=act==='without'?'tanpa':'sementara';}
 if(act==='support'||act==='reject'){if(!has('GPK'))throw Error('Akses GPK sahaja.');if(!requireGpk(r))throw Error('Kategori ini tidak menggunakan sokongan GPK.');change.gpkStatus=act==='support'?'disahkan':'ditolak';if(act==='support')change.relief=r.type==='RASMI'&&r.task==='SEKAT_CALON'?'dikecualikan':'sah';else change.relief=r.type==='RASMI'&&r.task==='SEKAT_CALON'?'layak':(['tanpa','sementara'].includes(r.relief)?r.relief:'tiada');}
 if(act==='final'){if(!has('GPK')||r.type!=='KECEMASAN'||r.task!=='UMUM')throw Error('Hanya GPK boleh menentukan jenis kecemasan.');if(!fType)throw Error('Pilih jenis.');change.finalType=fType==='KECEMASAN'?'':fType;change.docReviewed=false;}
 if(act==='remind'){if(!has('GPK'))throw Error('Hanya GPK boleh merekodkan peringatan.');change.reminderAt=fns.serverTimestamp();}
 if(note)change.adminNote=note.slice(0,200);
 if(act==='upload'){if(r.ownerUid!==user.uid)throw Error('Dokumen hanya boleh dimuat naik pemohon.');const file=$('add-file')?.files[0];if(!file)throw Error('Sila pilih fail dahulu.');validateFile(file);await uploadProof(id,file);closeDialog();toast('Dokumen dimuat naik untuk semakan.');return;}
 busy=true;try{await commitChange(id,change,act);closeDialog();toast('Tindakan direkodkan.');}finally{busy=false;}}
// Every update atomically creates an immutable audit row. A transaction prevents lost writes.
async function commitChange(id,change,action){
 const ref=fns.doc(db,'semakmur_fi_keberadaan',id);
 const audit=fns.doc(fns.collection(db,'semakmur_fi_keberadaan_audit'));
 await fns.runTransaction(db,async tr=>{
   const snapshot=await tr.get(ref);if(!snapshot.exists())throw Error('Rekod sudah tiada. Muat semula.');
   const before=snapshot.data();
   if(testAccess && before.testMode!==true&&!roles.some(k=>['GPK','PENYELARAS'].includes(k)))throw Error('Rekod rasmi memerlukan kuasa GPK/Penyelaras.');
   const revision=Number(before.revision||0)+1;
   const update={...change,revision,lastActionId:audit.id,updatedAt:fns.serverTimestamp(),updatedByUid:user.uid,updatedByEmail:user.email};
   // created/owner fields cannot be changed; Firebase Rules enforce the same constraint.
   tr.update(ref,update);
   tr.set(audit,{requestId:id,ownerUid:before.ownerUid,action,byUid:user.uid,byEmail:user.email,revision,
     gpkStatus:update.gpkStatus??before.gpkStatus,relief:update.relief??before.relief,
     finalType:update.finalType??before.finalType,testMode:before.testMode===true,at:fns.serverTimestamp()});
 });
}
async function uploadProof(){throw Error('Muat naik dokumen belum disokong pada pelan Spark.');}
async function submit(ev){ev.preventDefault();if(busy)return;let d;try{d=payload();}catch(e){$('form-status').textContent=e.message;return;}
 if(d.file&&!window.confirm('Dokumen dipilih tetapi belum boleh dimuat naik dalam Firebase Spark. Permohonan akan dihantar TANPA lampiran dan kekal Perlu Dokumen. Teruskan?'))return;
 busy=true;$('submit').disabled=true;$('form-status').textContent='Menyimpan…';try{const id=fns.doc(fns.collection(db,'semakmur_fi_keberadaan')).id;
 const rec={id,testMode:testAccess,ownerUid:user.uid,ownerEmail:user.email,ownerName:user.name,type:d.type,scope:d.scope,task:d.task,start:d.start,end:d.end,period:d.period,from:d.from,to:d.to,note:d.note,docPath:'',docName:'',docReviewed:false,gpkStatus:'menunggu',relief:'belum',finalType:'',adminNote:'',updatedByUid:user.uid,createdAt:fns.serverTimestamp(),updatedAt:fns.serverTimestamp(),createdMs:Date.now()};
 {const audit=fns.doc(fns.collection(db,'semakmur_fi_keberadaan_audit'));rec.revision=1;rec.lastActionId=audit.id;rec.updatedByEmail=user.email;const b=fns.writeBatch(db);b.set(fns.doc(db,'semakmur_fi_keberadaan',id),rec);b.set(audit,{requestId:id,ownerUid:user.uid,action:'CREATE',byUid:user.uid,byEmail:user.email,revision:1,gpkStatus:rec.gpkStatus,relief:rec.relief,finalType:rec.finalType,testMode:rec.testMode,at:fns.serverTimestamp()});await b.commit();/* Spark: lampiran belum diaktifkan. */}
 $('apply-form').reset();$('start').value=localDay();$('end').value=localDay();syncForm();tab='status';draw();markTabSeen('status');toast('Rekod keberadaan dihantar.');
 }catch(e){$('form-status').textContent='Gagal menyimpan: '+(e.code||e.message||e);}finally{busy=false;$('submit').disabled=false;if($('form-status').textContent==='Menyimpan…')$('form-status').textContent='';}}
async function showDocument(){toast('Pembukaan dokumen belum tersedia pada pelan Spark.');}
const FI_EMBED=new URLSearchParams(location.search).get('embed')==='1';
function tellDashboard(type,message=''){
 if(!FI_EMBED||window.parent===window)return;
 try{window.parent.postMessage({type,message},location.origin);}catch(_){}
}
function handlers(){document.addEventListener('click',ev=>{const tabBtn=ev.target.closest('#tabs [data-tab]');if(tabBtn){tab=tabBtn.dataset.tab;draw();markTabSeen(tab);return;}const card=ev.target.closest('[data-card-id]');if(card){const rec=records.find(r=>r.id===card.dataset.cardId)||myRecords.find(r=>r.id===card.dataset.cardId);if(rec)openRecord(rec,card.dataset.context||'mine');return;}const x=ev.target.closest('[data-do]');if(x){const r=records.find(r=>r.id===x.dataset.id);if(r)confirmAction(r,x.dataset.do);return;}const o=ev.target.closest('[data-open-doc]');if(o){showDocument(o.dataset.openDoc);return;}if(ev.target.id==='dialog-close'||ev.target.id==='cancel-action'){closeDialog();return;}const c=ev.target.closest('#confirm-action');if(c){applyAction(c.dataset.id,c.dataset.action).catch(e=>toast(e.message||String(e)));return;}});
 $('document').addEventListener('change',()=>{const file=$('document').files[0];try{if(file)validateFile(file);$('document-status').textContent=file?('Dipilih: '+file.name+' · Belum dimuat naik. Rekod boleh dihantar tanpa lampiran sahaja.'):'Tiada dokumen dipilih. Sambungan muat naik belum tersedia.';}catch(e){$('document').value='';$('document-status').textContent=e.message;}});
 $('apply-form').addEventListener('submit',submit);['type','scope','period','start'].forEach(id=>$(id).addEventListener('change',syncForm));$('list-status-filter').addEventListener('change',e=>{if(tab!=='borang'){listFilterValue[tab]=e.target.value;draw();}});$('dialog').addEventListener('click',e=>{if(e.target===$('dialog'))closeDialog()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('dialog').hidden)closeDialog();});

}
async function init(){handlers();$('start').min=localDay();$('end').min=localDay();$('start').value=localDay();$('end').value=localDay();syncForm();
 try{const cfg=window.SeMAKMURFirebasePilotConfig;if(!cfg?.projectId)throw Error('Konfigurasi Firebase tidak tersedia.');const [app,authlib,dbLib]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')]);
 const fb=app.getApps().find(a=>a.name==='semakmur-fi-dashboard')||app.initializeApp(cfg,'semakmur-fi-dashboard');const auth=authlib.getAuth(fb);db=dbLib.getFirestore(fb);fns={...dbLib};
 authlib.onAuthStateChanged(auth,async u=>{unsubs.forEach(fn=>fn());unsubs=[];user=null;records=[];myRecords=[];seenReady=false;seenAt={status:0,tindakan:0,peringatan:0};readRef=null;statsLoaded=false;renderStats();if(!u){$('user-label').textContent='Belum log masuk';showMessage('Sila log masuk melalui Fi-LoginSession.html.','error');tellDashboard('semakmur-fi-kb-error','Sesi log masuk tidak tersedia.');return;}try{const staff=await dbLib.getDoc(dbLib.doc(db,'semakmur_dashboard_fi',u.uid));const raw=staff.data();if(!staff.exists()||raw?.active!==true||str(raw.ownerEmail).toLowerCase()!==str(u.email).toLowerCase()||raw.profile?.email?.toLowerCase()!==u.email.toLowerCase())throw Error('Akaun guru tidak sah atau belum aktif.');user={uid:u.uid,email:u.email,name:str(raw.profile?.namaPenuh)||u.displayName||'Guru'};profile=raw;$('user-label').textContent=user.name;
 try{const roleSnap=await dbLib.getDoc(dbLib.doc(db,'semakmur_fi_keberadaan_roles',u.uid));const roleData=roleSnap.data();realRoles=roleSnap.exists()&&roleData.active===true&&roleData.ownerEmail===u.email?(roleData.roles||[]):[];}catch{realRoles=[];}
 testAccess=realRoles.includes('ADMIN_UJIAN');roles=realRoles.filter(r=>r!=='ADMIN_UJIAN');
 $('mode-label').textContent=testAccess?'ADMIN · FIRESTORE':'Fi · RASMI';
 setRoleUI();
 readRef=dbLib.doc(db,'semakmur_fi_keberadaan_bacaan',u.uid);
 unsubs.push(dbLib.onSnapshot(readRef,snap=>{
  const v=snap.exists()?snap.data():{};
  const num=x=>typeof x?.toMillis==='function'?x.toMillis():0;
  seenAt={status:num(v.seenStatus),tindakan:num(v.seenTindakan),peringatan:num(v.seenPeringatan)};
  seenReady=true;renderUnread();
 },e=>{seenReady=false;console.warn('Status notifikasi tidak dapat dibaca:',e.code||e.message);}));
 const coll=dbLib.collection(db,'semakmur_fi_keberadaan');
 unsubs.push(dbLib.onSnapshot(dbLib.query(coll,dbLib.where('ownerUid','==',u.uid),dbLib.limit(100)),s=>{
   myRecords=s.docs.map(x=>x.data());statsLoaded=true;
   if(!testAccess&&!isAdmin())records=[...myRecords];
   draw();
 },e=>showMessage('Gagal membaca rekod sendiri: '+(e.code||e.message),'error')));
 if(testAccess){
   // Admin Sistem: baca semua rekod termasuk rasmi, read-only kecuali ada peranan rasmi lain.
   unsubs.push(dbLib.onSnapshot(dbLib.query(coll,dbLib.limit(100)),s=>{
     records=s.docs.map(x=>x.data());statsLoaded=true;draw();
   },e=>showMessage('Bacaan Admin Sistem ditolak. Pasang Rules gabungan V6.7 dahulu.','error')));
 }else if(isAdmin()){
   unsubs.push(dbLib.onSnapshot(dbLib.query(coll,dbLib.where('testMode','==',false),dbLib.limit(100)),s=>{
     records=s.docs.map(x=>x.data());statsLoaded=true;draw();
   },e=>showMessage('Bacaan pentadbir ditolak. Semak Rules V6.3 dan pelantikan.','error')));
   unsubs.push(dbLib.onSnapshot(dbLib.query(dbLib.collection(db,'semakmur_fi_relief_harian'),dbLib.orderBy('date','desc'),dbLib.limit(100)),s=>{reliefQueue=s.docs.map(x=>x.data());renderReliefQueue();},e=>console.warn('Senarai relief belum tersedia:',e.code||e.message)));
 }
 showMessage('');draw();tellDashboard('semakmur-fi-kb-ready');}catch(e){$('user-label').textContent='Semakan akaun gagal';tellDashboard('semakmur-fi-kb-error',String(e.code||e.message||e));showMessage('Semakan akaun gagal: '+(e.code||e.message||e),'error');}}
 ,e=>{$('user-label').textContent='Pengesahan gagal';showMessage('Pengesahan Firebase gagal: '+(e.code||e.message||e),'error');tellDashboard('semakmur-fi-kb-error',String(e.code||e.message||e));}
 );
 }catch(e){$('user-label').textContent='Sambungan gagal';showMessage('Modul belum dapat disambungkan: '+(e.code||e.message||e),'error');tellDashboard('semakmur-fi-kb-error',String(e.code||e.message||e));}
}
window.addEventListener('message',e=>{if(FI_EMBED&&e.origin===location.origin&&e.source===window.parent&&e.data?.type==='semakmur-fi-kb-request-state'&&user)tellDashboard('semakmur-fi-kb-ready');});
init();
