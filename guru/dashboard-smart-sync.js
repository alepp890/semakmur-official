/** SeMAKMUR Dashboard Guru - Smart Sync V1
 * One teacher, one device cache. No tokens, learner records, RPH content or phone
 * numbers are stored. A successful authenticated server response is required
 * BEFORE the cached timetable/duty data is ever rendered.
 */
(function(global){
  'use strict';
  const KEY='SEMAKMUR_GURU_SMART_CACHE_V1';
  const MAX_AGE=7*24*60*60*1000;
  const clean=s=>String(s||'').trim().toLowerCase();
  const plainObj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  function read(email){
    try{
      const v=JSON.parse(localStorage.getItem(KEY)||'null');
      if(!v||v.email!==clean(email)||!Number.isFinite(v.at)||v.at>Date.now()+60000||Date.now()-v.at>MAX_AGE||
        !Array.isArray(v.jadual)||v.jadual.length>250||!Array.isArray(v.peranan)||v.peranan.length>100)return null;
      return v;
    }catch(_){return null;}
  }
  function write(obj){try{localStorage.setItem(KEY,JSON.stringify(obj));}catch(_){} }
  function clear(){try{localStorage.removeItem(KEY);}catch(_){} }
  function safeSchedule(src){return (Array.isArray(src)?src:[]).slice(0,250).map(r=>({
    hari:String(r.hari||'').slice(0,25),mula:String(r.mula||'').slice(0,16),
    tamat:String(r.tamat||'').slice(0,16),kelas:String(r.kelas||'').slice(0,65),
    subjek:String(r.subjek||'').slice(0,95),pairing:!!r.pairing
  }));}
  function safeRoles(src){return(Array.isArray(src)?src:[]).slice(0,100).map(r=>({
    kategori:String(r.kategori||'').slice(0,100),jawatankuasa:String(r.jawatankuasa||'').slice(0,160),
    peranan:String(r.peranan||'').slice(0,80),skop:String(r.skop||'').slice(0,120)
  }));}
  function safeDuty(src){
    const d=plainObj(src);
    return {disahkan:d.disahkan===true,bertugas:d.bertugas===true,
      kumpulan:String(d.kumpulan||'').slice(0,70),catatan:String(d.catatan||'').slice(0,150)};
  }
  function merge(email,delta,previous){
    const canonical=clean(delta.profile?.email);
    if(!canonical || (email&&canonical!==clean(email)))
      throw new Error('Identiti sesi tidak sepadan. Sila log masuk semula.');
    let v=previous&&previous.email===canonical?previous:null;
    const changed=plainObj(delta.changed),versions=plainObj(delta.versions);
    // Guard against server claiming unchanged data when the local cache is absent.
    if((!v||!Array.isArray(v.jadual)) && !changed.schedule)
      throw new Error('Cache jadual tidak dijumpai; penyegerakan penuh diperlukan.');
    if((!v||!Array.isArray(v.peranan)) && !changed.duty)
      throw new Error('Cache tugas tidak dijumpai; penyegerakan penuh diperlukan.');
    const jadual=changed.schedule?safeSchedule(delta.jadual):safeSchedule(v.jadual);
    const peranan=changed.duty?safeRoles(delta.peranan):safeRoles(v.peranan);
    const duty=changed.duty?safeDuty(delta.tugasBertugas):safeDuty(v.tugasBertugas);
    const present=changed.schedule?delta.jadualTersedia===true:v.jadualTersedia===true;
    // Dynamic badges/holiday are returned by the server if fresh, not part of cache.
    const result={success:true,profile:delta.profile,peranan,jadual,
      jadualTersedia:present,tugasBertugas:duty,cutiHariIni:delta.cutiHariIni||{disahkan:false},
      rphStatusHariIni:Array.isArray(delta.rphStatusHariIni)?delta.rphStatusHariIni:[],
      integrasi:{tindakan:false,hebahan:false,takwim:false,relief:false}};
    write({email:canonical,at:Date.now(),versions:{schedule:String(versions.schedule||''),
      duty:String(versions.duty||'')},jadual,peranan,jadualTersedia:present,tugasBertugas:duty});
    return result;
  }
  function storeLegacy(email,data){
    // For compatibility only: the original API always loads the full dataset.
    // Never pretend that the legacy endpoint supports incremental versions.
    const canonical=clean(email);
    if(!canonical || canonical!==clean(data.profile?.email))return;
    write({email:canonical,at:Date.now(),versions:{},jadual:safeSchedule(data.jadual),
      jadualTersedia:data.jadualTersedia===true,peranan:safeRoles(data.peranan),
      tugasBertugas:safeDuty(data.tugasBertugas)});
  }
  global.SeMAKMURSmartSync=Object.freeze({read,merge,clear,storeLegacy});
})(window);
