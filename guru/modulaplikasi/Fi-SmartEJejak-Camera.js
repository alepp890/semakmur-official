/*! Smart e-Jejak V1.1 UAT: camera lifecycle. QR decoding uses local jsQR 1.4.0 (Apache-2.0). */
(function(root,factory){const create=factory();if(typeof module==='object'&&module.exports)module.exports=create;else root.SeMAKMURJejakCamera=create;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const stopTracks=stream=>{try{stream?.getTracks().forEach(t=>t.stop());}catch(_e){}};
const errors=e=>({
 NotAllowedError:'Akses kamera tidak dibenarkan. Benarkan Kamera pada tetapan laman/telefon, kemudian cuba lagi.',
 PermissionDeniedError:'Akses kamera tidak dibenarkan. Semak kebenaran kamera.',
 NotFoundError:'Tiada kamera yang tersedia pada peranti ini.',
 NotReadableError:'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan cuba semula.',
 OverconstrainedError:'Tetapan kamera tidak disokong. Cuba semula.',
 SecurityError:'Kamera tidak dibenarkan pada konteks ini. Gunakan HTTPS.',
 AbortError:'Kamera dihentikan oleh peranti. Cuba semula.'
})[e?.name]||'Kamera tidak dapat dimulakan. Semak akses peranti dan cuba semula.';
return function create({video,canvas,mediaDevices,decode,onState=()=>{},onResult=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,secure=true,interval=125,timeout=90000}){
 let generation=0,stream=null,timer=null,deadline=null,status='idle';
 const publish=(phase,message)=>{status=phase;onState({phase,message});};
 const clear=()=>{if(timer!==null)clearTimer(timer);if(deadline!==null)clearTimer(deadline);timer=deadline=null;};
 function stop(message='Kamera dihentikan.',phase='idle'){
  generation++;clear();stopTracks(stream);stream=null;
  try{video.pause();video.srcObject=null;}catch(_e){}
  publish(phase,message);
 }
 function fail(e){stop(errors(e),'error');}
 function schedule(curr){timer=setTimer(()=>{timer=null;tick(curr);},interval);}
 function tick(curr){
  if(curr!==generation||status!=='scanning')return;
  try{
   const w=video.videoWidth,h=video.videoHeight;
   if(video.readyState>=2&&w>0&&h>0){
    // Full frame, bounded resolution; no image or camera data leaves the device.
    const scale=Math.min(1,720/Math.max(w,h)),cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
    if(canvas.width!==cw)canvas.width=cw;if(canvas.height!==ch)canvas.height=ch;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas unavailable');
    ctx.drawImage(video,0,0,cw,ch);
    const image=ctx.getImageData(0,0,cw,ch);
    const result=decode(image.data,cw,ch,{inversionAttempts:'attemptBoth'});
    if(result&&typeof result.data==='string'&&result.data.length){
     const payload=result.data;
     stop('Kod QR dikesan. Kamera dihentikan.','detected');
     onResult(payload);
     return;
    }
   }
  }catch(_e){stop('Pengimbas tidak dapat membaca imej kamera. Cuba semula atau gunakan simulasi manual.','error');return;}
  schedule(curr);
 }
 async function start(){
  if(status==='requesting'||status==='scanning')return false;
  if(!secure){stop('Kamera memerlukan laman HTTPS (atau localhost). Buka PWA melalui alamat HTTPS.','error');return false;}
  if(!mediaDevices||typeof mediaDevices.getUserMedia!=='function'){stop('Browser ini tidak menyediakan akses kamera. Gunakan Safari/Chrome terkini atau simulasi manual.','error');return false;}
  if(typeof decode!=='function'){stop('Pustaka pengimbas QR tidak dapat dimuatkan. Muat semula halaman atau gunakan simulasi manual.','error');return false;}
  stop('', 'idle');const curr=generation;
  publish('requesting','Menunggu kebenaran kamera…');
  deadline=setTimer(()=>{if(curr===generation)stop('Masa imbasan tamat. Tekan Buka kamera untuk cuba lagi.','error');},timeout);
  let acquired;
  try{
   const constraints={audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}};
   acquired=await mediaDevices.getUserMedia(constraints);
   if(curr!==generation){stopTracks(acquired);return false;}
   stream=acquired;video.srcObject=stream;video.muted=true;video.playsInline=true;
   stream.getVideoTracks?.().forEach(t=>{t.addEventListener?.('ended',()=>{if(curr===generation)stop('Kamera terputus. Buka kamera semula.','error');},{once:true});});
   await video.play();
   if(curr!==generation)return false;
   publish('scanning','Halakan kamera ke QR kelas atau bilik khas. Imbasan dihantar secara automatik.');
   schedule(curr);return true;
  }catch(e){if(curr!==generation){stopTracks(acquired);return false;}fail(e);return false;}
 }
 return {start,stop,get phase(){return status;}};
};
});
