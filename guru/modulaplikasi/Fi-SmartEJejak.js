/* SeMAKMUR Smart e-Jejak PdPc V1.1 — desktop & PWA UAT only.
 * Pure deterministic engine, no Firebase/Apps Script/Sheets/camera writes.
 * All timestamps, teachers, classes, QR codes and schedules in this module are simulated.
 */
(function(root,factory){const core=factory();if(typeof module==='object'&&module.exports)module.exports=core;else root.SeMAKMURJejakCore=core;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const BUILD='JEJAK-V1.1-UAT',DATE='2026-11-30';
const pad=n=>String(n).padStart(2,'0'), time=n=>pad(Math.floor(n/60))+':'+pad(n%60);
const minute=v=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)))throw Error('Masa ujian tidak sah.');return +v.slice(0,2)*60+(+v.slice(3));};
const dateValid=d=>/^20\d{2}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
const CLASSES=Array.from({length:6},(_,i)=>['IRIS','LAVENDER','VIOLET'].map((x,j)=>({id:'UAT-K'+pad(i*3+j+1),name:(i+1)+' '+x,level:i<3?1:2}))).flat();
const NAMES=['Aina','Badrul','Citra','Danish','Elina','Faris','Gina','Hakim','Intan','Johan','Kamil','Lina','Mira','Nabil','Omar','Putri','Qistina','Rafi','Sara','Taufik','Umairah','Vikram','Wani','Yasmin','Zaki','Adriana','Benny','Diana','Ehsan','Fazli','Hana','Irwan','Khadijah','Lim','Nora','Rania'];
const TEACHERS=NAMES.map((name,i)=>({id:'UAT-G'+pad(i+1),name:'Guru Demo '+name}));
const teacher=id=>TEACHERS.find(t=>t.id===id);
const klass=id=>CLASSES.find(c=>c.id===id);
const ROOMS=[{id:'UAT-B01',name:'Makmal Sains',type:'ROOM'},{id:'UAT-B02',name:'Bilik Komputer',type:'ROOM'},{id:'UAT-B03',name:'Dewan Sri Makmur',type:'ROOM'},{id:'UAT-B04',name:'Bilik Muzik',type:'ROOM'}];
const LOCATIONS=[...CLASSES.map(c=>({...c,type:'CLASS',classId:c.id})),...ROOMS].map(l=>({...l,qr:'SMKJEJAK:UAT:'+l.id}));
const PERIODS=[['W1','08:10','08:40'],['W2','08:40','09:10'],['W3','09:10','09:40'],['W4','10:10','10:40'],['W5','10:40','11:10'],['W6','11:10','11:40'],['W7','11:40','12:10'],['W8','12:10','12:40'],['W9','12:40','13:10']].map(([id,from,to])=>({id,from:minute(from),to:minute(to)}));
const subjects=['Bahasa Melayu','Bahasa Inggeris','Matematik','Sains','Pendidikan Islam','Bahasa Arab','Sejarah','Pendidikan Seni Visual'];
const ROLE={MAIN:'Guru Subjek',PAIR:'Guru Pasangan',RELIEF:'Guru Relief',KEEP:'Guru Pasangan Kekal',SHIFT:'Guru Pasangan Dialihkan'};
const participant=(id,role=ROLE.MAIN)=>({id,role});
function schoolDay(date){if(!dateValid(date))throw Error('Tarikh ujian tidak sah.');const d=new Date(date+'T12:00:00Z').getUTCDay();if(d===0||d===6)return 'Hujung Minggu';if(date==='2026-12-04')return 'Cuti (simulasi)';return date>=DATE&&date<='2026-12-03'?'Sekolah':'Belum Ditetapkan';}
function fixture(date,scenario='MIX'){
 if(schoolDay(date)!=='Sekolah')return [];
 const rows=[];
 for(let j=0;j<PERIODS.length;j++)for(let i=0;i<CLASSES.length;i++){
  const p=PERIODS[j],c=CLASSES[i];let main=TEACHERS[(i+(j<4?0:j*3))%18].id,sub=subjects[(i+(j<2?0:j<4?2:j))%subjects.length],original=[participant(main)],expected=original.map(x=>({...x})),relief=null;
  // W1 and W2: stable, contiguous examples with same class/guru/subject.
  if(j<2){
   if(i===1||i===3||i===4){const partner=TEACHERS[18+({1:0,3:1,4:2})[i]].id;sub='Pendidikan Islam';original=[participant(main),participant(partner,ROLE.PAIR)];expected=original.map(x=>({...x}));}
   if(scenario==='MIX'){
    if(i===2){expected=[participant('UAT-G23',ROLE.RELIEF)];relief={absent:[main],status:'DIAGIH',to:'UAT-G23'};}
    if(i===3){expected=[participant(main,ROLE.KEEP)];relief={absent:['UAT-G20'],status:'GURU PASANGAN KEKAL',to:main};}
    if(i===4){expected=[participant(main,ROLE.KEEP)];relief={absent:[],status:'GURU PASANGAN DIALIHKAN',to:'UAT-G21',splitFrom:c.id,splitTo:CLASSES[5].id};}
    if(i===5){expected=[participant('UAT-G21',ROLE.SHIFT)];relief={absent:[main],status:'GURU PASANGAN DIALIHKAN',to:'UAT-G21',splitFrom:CLASSES[4].id};}
    if(i===6){expected=[];relief={absent:[main],status:'PERLU TINDAKAN',to:''};}
   }
  }
  // No primary-teacher overlap in remaining periods; W9 lower primary off (demo).
  if(j===8&&c.level===1)continue;
  rows.push({id:[date,c.id,p.id].join('|'),date,classId:c.id,period:p.id,from:p.from,to:p.to,subject:sub,original,expected,relief});
 }
 return rows;
}
function create({date=DATE,clock='08:10',scenario='MIX'}={}){
 if(!['MIX','NORMAL'].includes(scenario))throw Error('Senario tidak sah.');
 const m=minute(clock);schoolDay(date);
 return {build:BUILD,date,clock:m,scenario,slots:fixture(date,scenario),scans:[],audit:[],sequence:0};
}
const active=(s,at=s.clock)=>s.slots.filter(r=>r.from<=at&&at<r.to);
const expected=(r,id)=>r.expected.find(x=>x.id===id);
const checkDate=(s,d)=>d===s.date;
function log(s,kind,detail){const e={id:++s.sequence,date:s.date,clock:s.clock,kind,...detail};s.audit.push(e);return e;}
function setClock(s,value){
 const m=minute(value);if(m<s.clock)throw Error('Untuk undur jam, mula semula sesi ujian. Rekod sedia ada tidak diputar balik.');
 if(m!==s.clock){const before=s.clock;s.clock=m;log(s,'JAM UJIAN',{message:time(before)+' → '+time(m)});}return s;
}
function reject(s,id,qr,msg,code){log(s,'DITOLAK',{teacherId:id||'',qr:String(qr||'').slice(0,100),message:msg,code});return {ok:false,code,message:msg};}
function qualifiedAt(s,id,m){return active(s,m).filter(r=>expected(r,id));}
function chain(s,r,id){
 const out=[r];let last=r;
 while(true){
  const next=s.slots.filter(x=>x.classId===r.classId&&x.subject===r.subject&&x.from===last.to&&expected(x,id));
  if(next.length!==1||qualifiedAt(s,id,last.to).length!==1||active(s,last.to).filter(x=>x.classId===r.classId).length!==1)break;
  out.push(next[0]);last=next[0];
 }
 return out;
}
function evidence(s,slot,id,at=s.clock){
 if(!expected(slot,id)||at<slot.from)return null;
 // latest location event for this exact participant and covered slot. At end,
 // preserve the last scan before its boundary; future check-ins cannot backfill.
 const cutoff=Math.min(at,slot.to-0.0001);
 return s.scans.filter(a=>a.teacherId===id&&a.date===slot.date&&a.clock<=cutoff&&a.slotIds.includes(slot.id)).at(-1)||null;
}
function locationOccupancy(s,locationId,classId){
 return active(s).some(r=>r.classId!==classId&&r.expected.some(p=>evidence(s,r,p.id)?.locationId===locationId));
}
function scan(s,{teacherId,qr,date=s.date}={}){
 const id=String(teacherId||''),payload=String(qr||'').trim();
 if(!checkDate(s,date))return reject(s,id,payload,'Tarikh imbasan tidak sepadan dengan jam ujian.','WRONG_DATE');
 if(!teacher(id))return reject(s,id,payload,'Identiti guru ujian tidak dikenali.','BAD_TEACHER');
 if(schoolDay(s.date)!=='Sekolah')return reject(s,id,payload,'Tiada PdPc pada hari ini: '+schoolDay(s.date)+'.','NO_SCHOOL');
 const loc=LOCATIONS.find(x=>x.qr===payload);
 if(!loc)return reject(s,id,payload,'Kod QR ujian tidak sah. Kod QR rasmi tidak diterima dalam Mod Ujian.','BAD_QR');
 const matches=qualifiedAt(s,id,s.clock);
 if(matches.length>1)return reject(s,id,payload,'Pertindihan jadual guru dikesan. Rujuk pentadbir; tiada rekod dicipta.','CLASH');
 if(!matches.length)return reject(s,id,payload,'Tiada tugasan PdPc yang sah untuk guru ini pada waktu tersebut.','NO_ASSIGNMENT');
 const r=matches[0],p=expected(r,id);
 if(active(s).filter(x=>x.classId===r.classId).length!==1)return reject(s,id,payload,'Terdapat pertindihan jadual kelas. Rujuk pentadbir.','CLASS_CLASH');
 if(loc.type==='CLASS'&&loc.classId!==r.classId)return reject(s,id,payload,'QR ini bukan kelas yang sepatutnya: '+klass(r.classId).name+'.','WRONG_CLASS');
 if(locationOccupancy(s,loc.id,r.classId))return reject(s,id,payload,'Bilik khas telah digunakan oleh kelas lain pada waktu ini.','ROOM_BUSY');
 const old=evidence(s,r,id);
 if(old&&old.locationId===loc.id){
  log(s,'ULANGAN',{teacherId:id,classId:r.classId,locationId:loc.id,period:r.period,message:'Sesi aktif sudah mempunyai imbasan sah; tiada rekod kehadiran berganda.'});
  return {ok:true,duplicate:true,message:'Imbasan sudah direkod. Sesi kekal aktif.',session:old};
 }
 const coverage=chain(s,r,id),end=coverage.at(-1).to;
 const rec={id:'SCAN-'+pad(s.sequence+1),date:s.date,clock:s.clock,teacherId:id,classId:r.classId,subject:r.subject,role:p.role,locationId:loc.id,slotIds:coverage.map(x=>x.id),periods:coverage.map(x=>x.period),expires:end,firstClock:old?.firstClock??s.clock,move:!!old};
 s.scans.push(rec);
 log(s,old?'PERPINDAHAN LOKASI':'IMBASAN SAH',{teacherId:id,classId:r.classId,locationId:loc.id,period:r.period,scanId:rec.id,message:(old?'Lokasi dikemas kini: ':'PdPc disahkan: ')+r.subject+' · '+time(s.clock)+'–'+time(end)});
 return {ok:true,message:old?'Lokasi PdPc dikemas kini.':'Kehadiran PdPc disahkan.',session:rec};
}
function viewClass(s,cid){
 const rows=active(s).filter(x=>x.classId===cid),c=klass(cid);
 if(!rows.length)return {classId:cid,name:c.name,level:c.level,status:'Tiada Kelas',tone:'idle',expected:[],present:[],slot:null};
 if(rows.length!==1)return {classId:cid,name:c.name,level:c.level,status:'Konflik Jadual',tone:'danger',expected:[],present:[],slot:null};
 const r=rows[0],p=r.expected.map(x=>{const ev=evidence(s,r,x.id);return {...x,name:teacher(x.id)?.name||x.id,scan:ev,location:ev?LOCATIONS.find(l=>l.id===ev.locationId)?.name:''};});
 const present=p.filter(x=>x.scan),n=p.length,k=present.length;
 const status=k===0?'Tiada Guru':n>1?'Ada Guru '+k+'/'+n:'Ada Guru';
 return {classId:cid,name:c.name,level:c.level,status,tone:k===n&&n>0?'good':k>0?'partial':'danger',expected:p,present,slot:r};
}
function monitor(s){const rows=CLASSES.map(c=>viewClass(s,c.id));return {rows,stats:{total:rows.length,good:rows.filter(x=>x.tone==='good').length,partial:rows.filter(x=>x.tone==='partial').length,danger:rows.filter(x=>x.tone==='danger').length,idle:rows.filter(x=>x.tone==='idle').length}};}
function reliefRecords(s){
 return s.slots.filter(r=>r.relief&&r.relief.status!=='GURU PASANGAN KEKAL'&&(!r.relief.splitFrom||r.relief.splitFrom!==r.classId)).map(r=>{
  const id=r.relief.to,ev=id?evidence(s,r,id):null;
  let status;if(r.relief.status==='DIBATALKAN')status='Relief Dibatalkan';else if(!id)status='Perlu Tindakan';else if(s.clock<r.from)status='Belum Bermula';else if(ev)status=s.clock>=r.to?'Dilaksana · Tamat':'Dilaksana';else status=s.clock>=r.to?'Tidak Disahkan':'Menunggu Imbasan';
  return {id:r.id,classId:r.classId,period:r.period,from:r.from,to:r.to,subject:r.subject,teacherId:id,kind:r.relief.status,status,scan:ev};
 });
}
function pdpcHistory(s){
 return s.slots.filter(r=>r.from<=s.clock).flatMap(r=>r.expected.map(p=>{
  const ev=evidence(s,r,p.id);return {slot:r.id,classId:r.classId,period:r.period,from:r.from,to:r.to,subject:r.subject,teacherId:p.id,role:p.role,locationId:ev?.locationId||'',scanClock:ev?.clock??null,firstClock:ev?.firstClock??null,status:ev?(s.clock>=r.to?'Tamat':'Sedang Berlangsung'):(s.clock>=r.to?'Tidak Disahkan':'Menunggu Imbasan')};
 }));
}
function canCancelDemoRelief(s,r){return r.classId==='UAT-K03'&&['W1','W2'].includes(r.period)&&r.from>=s.clock&&r.relief?.status==='DIAGIH'&&!s.scans.some(a=>a.clock>=r.from&&a.slotIds.includes(r.id));}
function cancelDemoRelief(s){
 if(s.scenario!=='MIX')throw Error('Pilih senario gabungan terlebih dahulu.');
 const rows=s.slots.filter(r=>canCancelDemoRelief(s,r));
 if(!rows.length)throw Error('Tiada slot relief yang belum bermula dan boleh dipulihkan secara automatik.');
 for(const r of rows){r.expected=r.original.map(x=>({...x}));r.relief={...r.relief,status:'DIBATALKAN',to:'',previous:'UAT-G23'};}
 log(s,'RELIEF DIBATALKAN',{teacherId:'UAT-G03',classId:'UAT-K03',message:'Keberadaan dibatalkan. Tugasan kembali kepada guru asal pada '+rows.map(r=>r.period).join(', ')+'. Imbasan lama kekal dalam audit.'});
 return rows.length;
}
return {BUILD,DATE,CLASSES,TEACHERS,LOCATIONS,PERIODS,ROLE,teacher,klass,time,minute,schoolDay,fixture,create,active,expected,setClock,scan,chain,evidence,monitor,viewClass,reliefRecords,pdpcHistory,canCancelDemoRelief,cancelDemoRelief};
});
/* UI — see next section. */
if(typeof document==='object')(()=>{
'use strict';
const C=window.SeMAKMURJejakCore,$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const tname=id=>C.teacher(id)?.name||'—',cname=id=>C.klass(id)?.name||'—',lname=id=>C.LOCATIONS.find(x=>x.id===id)?.name||'—';
const fmt=C.time,range=r=>fmt(r.from)+'–'+fmt(r.to),pill=(txt,tone='idle')=>'<span class="pill '+tone+'">'+esc(txt)+'</span>';
let s=C.create(),tab='monitor',timer=null,started=false,pending=null,camera=null,scanTeacher='',cameraBound=false;
const mobileView=()=>typeof window.matchMedia==='function'&&window.matchMedia('(max-width:767px)').matches;
function stopCamera(message){if(camera&&['requesting','scanning'].includes(camera.phase))camera.stop(message||'Kamera dihentikan.');}
function setCameraState(state){
 const busy=state.phase==='requesting'||state.phase==='scanning';
 $('camera-status').textContent=state.message;$('camera-status').dataset.phase=state.phase;
 $('camera-preview').hidden=!busy;$('camera-stop').hidden=!busy;$('camera-start').disabled=busy;
 $('teacher').disabled=busy;$('scan').disabled=busy;
}
function bindCamera(){
 if(cameraBound)return;cameraBound=true;
 if(typeof window.SeMAKMURJejakCamera!=='function'){ $('camera-start').disabled=true;$('camera-status').textContent='Pustaka kamera belum tersedia. Gunakan simulasi manual.';return;}
 camera=window.SeMAKMURJejakCamera({video:$('camera-video'),canvas:$('camera-canvas'),mediaDevices:typeof navigator==='object'?navigator.mediaDevices:null,decode:window.jsQR,secure:window.isSecureContext===true,onState:setCameraState,onResult:payload=>{if(!started)return;guarded(()=>handleScan(payload,scanTeacher));}});
 $('camera-start').onclick=()=>{if(!started)return;pause();scanTeacher=$('teacher').value;camera.start();};
 $('camera-stop').onclick=()=>stopCamera();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera('Kamera dihentikan kerana halaman tidak aktif.');});
 window.addEventListener('pagehide',()=>stopCamera());
}
function pause(){if(timer!==null){clearInterval(timer);timer=null;}$('play').textContent='▶ Jalankan jam';$('play').setAttribute('aria-pressed','false');}
function dialog(title,msg,tone='info',detail='',action=null){
 stopCamera();pause();const d=$('dialog');if(d.open)d.close();
 $('dialog-mark').className='dialog-mark '+tone;$('dialog-mark').textContent=tone==='good'?'✓':tone==='danger'?'!':'i';
 $('dialog-title').textContent=title;$('dialog-text').textContent=msg;$('dialog-detail').hidden=!detail;$('dialog-detail').textContent=detail;
 $('dialog-cancel').hidden=!action;$('dialog-ok').textContent=action?'Teruskan':'Baik';pending=action;d.returnValue='';d.showModal();
}
$('dialog').addEventListener('close',()=>{const action=pending;pending=null;if($('dialog').returnValue==='ok'&&action)action();});
function guarded(fn){try{fn();}catch(e){dialog('Tindakan tidak diteruskan',String(e.message||e),'danger');}}
function selectOptions(){
 $('teacher').innerHTML=C.TEACHERS.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' · '+esc(x.id.slice(4))+'</option>').join('');
 $('qr-location').innerHTML=['CLASS','ROOM'].map(type=>'<optgroup label="'+(type==='CLASS'?'Kelas akademik':'Bilik / lokasi khas')+'">'+C.LOCATIONS.filter(x=>x.type===type).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('')+'</optgroup>').join('');
 setLocation('UAT-K01');
}
function setLocation(id){const l=C.LOCATIONS.find(x=>x.id===id);if(!l)return;$('qr-location').value=id;$('qr-payload').value=l.qr;$('qr-title').textContent=l.name;}
function teacherPreview(){
 const id=$('teacher').value,rows=C.active(s).filter(r=>C.expected(r,id));
 if(rows.length===1){const r=rows[0],p=C.expected(r,id);$('teacher-current').innerHTML='<strong>'+esc(cname(r.classId))+' · '+esc(r.subject)+'</strong><br>'+esc(r.period+' · '+range(r))+'<br>'+esc(p.role);}
 else if(rows.length>1)$('teacher-current').textContent='Pertindihan jadual · perlu tindakan pentadbir.';
 else $('teacher-current').textContent='Tiada tugasan PdPc yang sah pada masa ini.';
}
function metrics(report){const a=report.stats,items=[['total','Kelas dipantau',a.total],['good','Hadir lengkap',a.good],['partial','Hadir separa',a.partial],['danger','Tiada imbasan',a.danger],['idle','Tiada kelas',a.idle]];
 $('metrics').innerHTML=items.map(([k,name,num])=>'<div class="metric '+k+'"><strong>'+num+'</strong><span>'+esc(name)+'</span></div>').join('');
}
function drawMonitor(rows){
 const q=$('search').value.trim().toLocaleLowerCase('ms'),f=$('filter-status').value,filtered=rows.filter(r=>(f==='all'||r.tone===f)&&(!q||[r.name,r.slot?.subject,...r.expected.map(p=>p.name)].join(' ').toLocaleLowerCase('ms').includes(q)));
 $('monitor-sub').textContent=C.schoolDay(s.date)==='Sekolah'?filtered.length+' daripada '+rows.length+' kelas · '+fmt(s.clock)+' waktu simulasi':'Tiada PdPc: '+C.schoolDay(s.date);
 $('monitor-body').innerHTML=filtered.length?filtered.map(r=>{
  const a=r.slot;if(!a)return '<tr><td><strong>'+esc(r.name)+'</strong><small>Tahap '+r.level+'</small></td><td>—</td><td>'+pill(r.status,r.tone)+'</td><td>—</td></tr>';
  const teachers=r.expected.length?r.expected.map(p=>'<div class="participant"><span class="mark '+(p.scan?'good':'wait')+'">'+(p.scan?'✓':'·')+'</span><div><b>'+esc(p.name)+'</b><span class="role">'+esc(p.role)+'</span></div></div>').join(''):'<strong class="warn">Belum ada guru pengganti</strong><small>Perlu tindakan pentadbir</small>';
  const reason=a.relief?.absent?.length?'<small>Guru asal tidak tersedia: '+esc(a.relief.absent.map(tname).join(', '))+'</small>':a.relief?.splitTo?'<small>Pasangan dialihkan ke '+esc(cname(a.relief.splitTo))+'</small>':'';
  const loc=r.present.length?r.present.map(p=>'<div class="location">'+esc(p.location)+'<span class="location-detail">'+esc(p.name+' · '+fmt(p.scan.firstClock))+'</span></div>').join(''):'<span class="muted">Belum disahkan</span>';
  return '<tr><td><strong>'+esc(r.name)+'</strong><small>'+esc(a.period+' · '+range(a))+'</small></td><td><strong>'+esc(a.subject)+'</strong>'+teachers+reason+'</td><td>'+pill(r.status,r.tone)+(r.tone==='good'?'<small>Disahkan melalui QR</small>':r.tone==='partial'?'<small>Menunggu guru pasangan</small>':r.expected.length?'<small>Menunggu imbasan</small>':'<small class="warn">Tiada agihan</small>')+'</td><td>'+loc+'</td></tr>';
 }).join(''):'<tr><td colspan="4" class="empty">Tiada kelas sepadan dengan tapisan.</td></tr>';
}
const historyTone=status=>status==='Tamat'||status==='Dilaksana'||status==='Dilaksana · Tamat'||status==='Sedang Berlangsung'?'good':status==='Tidak Disahkan'||status==='Perlu Tindakan'?'danger':status==='Menunggu Imbasan'?'partial':'idle';
function drawHistory(){const a=C.pdpcHistory(s).slice().sort((x,y)=>y.from-x.from||x.classId.localeCompare(y.classId)||x.teacherId.localeCompare(y.teacherId));
 $('history-body').innerHTML=a.length?a.map(r=>'<tr><td><strong>'+esc(cname(r.classId))+'</strong><small>'+esc(r.period+' · '+range(r))+'</small></td><td><strong>'+esc(tname(r.teacherId))+'</strong><small>'+esc(r.role)+'</small></td><td>'+esc(r.subject)+'</td><td>'+(r.scanClock===null?'—':esc(fmt(r.scanClock)+' · '+lname(r.locationId)))+'</td><td>'+pill(r.status,historyTone(r.status))+'</td></tr>').join(''):'<tr><td colspan="5" class="empty">Belum ada waktu PdPc bermula.</td></tr>';
}
const kindLabel=k=>({'DIAGIH':'Relief biasa','GURU PASANGAN DIALIHKAN':'Guru Pasangan Dialihkan','DIBATALKAN':'Relief Dibatalkan','PERLU TINDAKAN':'Belum Diagih'})[k]||k;
function drawRelief(){const a=C.reliefRecords(s);
 $('relief-body').innerHTML=a.length?a.map(r=>'<tr><td><strong>'+esc(cname(r.classId))+'</strong><small>'+esc(r.period+' · '+range(r))+'</small></td><td><strong>'+esc(tname(r.teacherId))+'</strong><small>'+esc(r.subject)+'</small></td><td>'+esc(kindLabel(r.kind))+'</td><td>'+(r.scan?esc(fmt(r.scan.clock)+' · '+lname(r.scan.locationId)):'—')+'</td><td>'+pill(r.status,historyTone(r.status))+'</td></tr>').join(''):'<tr><td colspan="5" class="empty">Tiada relief untuk senario ini.</td></tr>';
}
function drawAudit(){const a=s.audit.slice().reverse();
 $('audit-body').innerHTML=a.length?a.map(r=>'<tr><td>'+esc(fmt(r.clock))+'</td><td>'+pill(r.kind,r.kind==='DITOLAK'?'danger':r.kind==='IMBASAN SAH'?'good':'info')+'</td><td><strong>'+esc(tname(r.teacherId))+'</strong><small>'+esc(cname(r.classId))+'</small></td><td>'+esc(r.message||'')+(r.locationId?'<small>'+esc(lname(r.locationId))+'</small>':'')+'</td></tr>').join(''):'<tr><td colspan="4" class="empty">Belum ada peristiwa. Mulakan dengan imbasan ujian.</td></tr>';
}
function render(){
 $('app').dataset.view=tab;
 $('clock-readout').textContent=fmt(s.clock);$('clock-date').textContent=new Intl.DateTimeFormat('ms-MY',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kuala_Lumpur'}).format(new Date(s.date+'T12:00:00Z'));
 $('calendar-status').className='pill '+(C.schoolDay(s.date)==='Sekolah'?'good':'idle');$('calendar-status').textContent=C.schoolDay(s.date);
 $('time-input').value=fmt(s.clock);$('date-input').value=s.date;$('scenario').value=s.scenario;
 $('cancel-relief').disabled=!s.slots.some(r=>C.canCancelDemoRelief(s,r));
 const report=C.monitor(s);metrics(report);teacherPreview();drawMonitor(report.rows);
 if(tab==='history')drawHistory();if(tab==='relief')drawRelief();if(tab==='audit')drawAudit();
}
function changeTab(name){
 if(!['scan','monitor','history','relief','audit'].includes(name))return;
 if(name==='scan'&&!mobileView()){name='monitor';}
 if(name!=='scan')stopCamera();tab=name;document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===name)));['monitor','history','relief','audit'].forEach(id=>$('tab-'+id).hidden=id!==name);render();
 if(mobileView()){const pane=name==='scan'?$('scanner-panel'):$('tab-'+name);pane?.scrollIntoView?.({block:'start',behavior:'instant'});}
}
function reset(date,clock,scenario){const candidate=C.create({date,clock,scenario});stopCamera();pause();s=candidate;render();}
function setClockFromUI(){
 stopCamera();
 const date=$('date-input').value,clock=$('time-input').value,scenario=$('scenario').value,m=C.minute(clock);
 if(date!==s.date||scenario!==s.scenario||m<s.clock){
  C.create({date,clock,scenario});dialog('Mulakan sesi ujian baharu?','Menukar tarikh, senario atau mengundur jam akan membuang semua rekod dummy daripada sesi ini. Data rasmi tidak terjejas.','info','Sesi baharu: '+date+' · '+clock,()=>reset(date,clock,scenario));return;
 }
 C.setClock(s,clock);render();
}
function advance(delta){stopCamera();const m=Math.min(1439,s.clock+delta);C.setClock(s,fmt(m));render();if(m===1439)pause();}
function nextPeriod(){
 stopCamera();
 const boundaries=[...new Set(C.PERIODS.flatMap(x=>[x.from,x.to]))].sort((a,b)=>a-b),n=boundaries.find(x=>x>s.clock);if(n===undefined){dialog('Tiada slot seterusnya','Semua slot contoh sudah tamat.','info');return;}C.setClock(s,fmt(n));render();
}
function handleScan(payload=$('qr-payload').value,teacherId=$('teacher').value){
 stopCamera();const r=C.scan(s,{teacherId,qr:payload});render();
 if(r.ok){const p=r.session;dialog(r.duplicate?'Imbasan telah direkod':'Imbasan berjaya',r.message,'good',tname(p.teacherId)+'\n'+cname(p.classId)+' · '+p.subject+'\n'+p.role+' · '+lname(p.locationId)+'\nImbas: '+fmt(p.firstClock)+'  |  Tamat automatik: '+fmt(p.expires)+'\nSlot diliputi: '+p.periods.join(', '));}
 else dialog('Imbasan tidak diterima',r.message,'danger','Tiada rekod kehadiran dicipta. Peristiwa penolakan disimpan dalam audit ujian.');
}
const cases={single:['UAT-G01','UAT-K01'],pair1:['UAT-G02','UAT-K02'],pair2:['UAT-G19','UAT-K02'],relief:['UAT-G23','UAT-K03'],wrong:['UAT-G01','UAT-K02'],room:['UAT-G01','UAT-B01'],shift:['UAT-G21','UAT-K06'],absent:['UAT-G03','UAT-K03']};
function exportCsv(rows,filename){
 const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
 const content='\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function start(view){
 if(started){if(['scan','monitor'].includes(view))changeTab(view);return;}started=true;$('gate').hidden=true;$('app').hidden=false;$('back').hidden=window.parent===window;
 selectOptions();bindCamera();if(mobileView())$('manual-panel').open=false;changeTab(mobileView()&&(view==='scan'||window.parent===window)?'scan':'monitor');
 for(const id of ['date-input','time-input','scenario'])$(id).addEventListener('focus',pause);
 $('set-clock').onclick=()=>guarded(setClockFromUI);$('plus5').onclick=()=>guarded(()=>advance(5));$('next-period').onclick=()=>guarded(nextPeriod);
 $('play').onclick=()=>{stopCamera();if(timer!==null){pause();return;}$('play').textContent='Ⅱ Jeda jam';$('play').setAttribute('aria-pressed','true');timer=setInterval(()=>guarded(()=>advance(1)),1000);};
 $('reset').onclick=()=>dialog('Reset Mod Ujian?','Semua imbasan dan audit dummy dalam sesi ini akan dibuang. Rekod rasmi kekal.','info','Jam kembali ke 08:10 pada 30 November 2026.',()=>reset(C.DATE,'08:10','MIX'));
 $('teacher').onchange=teacherPreview;$('qr-location').onchange=()=>setLocation($('qr-location').value);$('scan').onclick=()=>guarded(handleScan);$('search').oninput=()=>drawMonitor(C.monitor(s).rows);$('filter-status').onchange=()=>drawMonitor(C.monitor(s).rows);
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>changeTab(b.dataset.tab));
 document.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>{stopCamera();const c=cases[b.dataset.case];$('teacher').value=c[0];setLocation(c[1]);teacherPreview();});
 $('cancel-relief').onclick=()=>dialog('Batalkan keberadaan ujian?','Hanya tugas yang belum bermula dikembalikan kepada Guru Demo Citra. Slot yang telah bermula, sudah tamat dan audit lama dikekalkan.','info','Ini menguji kes pembatalan di e-Keberadaan, bukan mengubah data rasmi.',()=>guarded(()=>{const n=C.cancelDemoRelief(s);render();dialog('Relief dibatalkan',n+' slot dikemas kini. Guru asal perlu imbas QR sendiri.','good');}));
 $('export-history').onclick=()=>exportCsv([['Tarikh','Kelas','Slot','Masa mula','Masa tamat','Guru','Peranan','Subjek','Masa imbas','Lokasi','Status'],...C.pdpcHistory(s).map(r=>[s.date,cname(r.classId),r.period,fmt(r.from),fmt(r.to),tname(r.teacherId),r.role,r.subject,r.scanClock===null?'':fmt(r.scanClock),r.locationId?lname(r.locationId):'',r.status])],'JEJAK-UAT-PdPc-'+s.date+'.csv');
 $('export-audit').onclick=()=>exportCsv([['Tarikh','Masa','Peristiwa','Guru','Kelas','Lokasi','Butiran'],...s.audit.map(r=>[s.date,fmt(r.clock),r.kind,tname(r.teacherId),cname(r.classId),lname(r.locationId),r.message])],'JEJAK-UAT-Audit-'+s.date+'.csv');
 $('back').onclick=()=>{stopCamera();pause();window.parent.postMessage({type:'SEMAKMUR_JEJAK_UAT_BACK'},location.origin);};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
}
function revoke(){stopCamera();pause();pending=null;const d=$('dialog');if(d.open){d.returnValue='';d.close();}s=C.create();started=false;$('app').hidden=true;$('gate').hidden=false;$('gate-copy').textContent='Akses Mod Ujian Pentadbir tidak tersedia. Buka melalui Dashboard Guru.';}
window.matchMedia?.('(max-width:767px)').addEventListener?.('change',()=>{if(started)changeTab('monitor');});
if(window.parent!==window){
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==window.parent)return;if(e.data?.type==='SEMAKMUR_JEJAK_UAT_ACCESS'){if(e.data.allowed===true)start(e.data.view);else revoke();}else if(e.data?.type==='SEMAKMUR_JEJAK_UAT_VIEW'&&started&&['scan','monitor'].includes(e.data.view))changeTab(e.data.view);});
 window.parent.postMessage({type:'SEMAKMUR_JEJAK_UAT_REQUEST'},location.origin);
 setTimeout(()=>{if(!started)$('gate-copy').textContent='Buka Smart e-Jejak melalui Dashboard Guru menggunakan akaun Admin Sistem.';},4000);
}else if(location.protocol==='file:'||['localhost','127.0.0.1','[::1]'].includes(location.hostname)){
 $('gate-copy').textContent='Pratonton setempat menggunakan data dummy.';start();
}else revoke();
})();
