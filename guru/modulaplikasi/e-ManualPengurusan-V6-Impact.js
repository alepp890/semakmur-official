/* V6.1 Fasa 2 — read-only preview against real master + downstream Sheets.
 * All requests use the existing fiManual authorization path. NO SAVE calls.
 */
(function(){
  'use strict';
  const types=[
    ['staf','Master Staf'],['lokasi','Master Kelas / Bilik'],['subjek','Master Subjek'],
    ['jawatankuasa','Master Jawatankuasa'],['minggu','Takwim Minggu'],['acara','Takwim Portal / Cuti']
  ];
  const $=id=>document.getElementById(id);
  const esc=v=>String(v===null||v===undefined?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const s=v=>String(v===null||v===undefined?'':v).trim();
  const box=(txt,kind)=>'<div class="mv6-alert mv6-'+(kind||'warn')+'">'+esc(txt)+'</div>';
  const loading=t=>'<div class="mv6-loading">'+esc(t)+'</div>';
  const statuses={DISEKAT:'bad',TIDAK_DAPAT_SAHKAN:'warn',PERLU_PENYELARASAN:'warn',SELAMAT_DALAM_SKOP:'ok'};
  let opened=false,options=[];
  function busy(flag){['mv6iLoad','mv6iCheck','mv6iEntity','mv6iRecord','mv6iField'].forEach(k=>{const x=$(k);if(x)x.disabled=flag;});}
  function resetResult(){if($('mv6iResult'))$('mv6iResult').innerHTML='<p class="mv6-note">Belum ada pratonton. Tiada data yang akan disimpan.</p>';}
  window.mv6iInit=function(){
    if(opened)return;opened=true;
    const x=$('mv6iEntity');if(!x)return;
    x.innerHTML=types.map(([id,name])=>'<option value="'+esc(id)+'">'+esc(name)+'</option>').join('');
    window.mv6iEntityChange();
  };
  window.mv6iEntityChange=function(){
    options=[];
    if($('mv6iRecord'))$('mv6iRecord').innerHTML='<option value="">Klik Muat Rekod dahulu</option>';
    if($('mv6iField'))$('mv6iField').innerHTML='<option value="">Pilih rekod dahulu</option>';
    if($('mv6iValue'))$('mv6iValue').value='';
    if($('mv6iSource'))$('mv6iSource').textContent='Rekod sebenar belum dimuatkan';
    resetResult();
  };
  window.mv6iLoad=async function(){
    window.mv6iEntityChange();
    const id=s($('mv6iEntity')?.value),out=$('mv6iResult');
    if(!id)return;
    busy(true);if(out)out.innerHTML=loading('Membaca ID dan nama rekod pusat secara selamat…');
    try{
      const r=await postToBackend({action:'manualV6ImpactOptions',data:{entity:id}});
      if(r.success!==true)throw Error(r.error||'Gagal membaca rekod pusat.');
      options=r.options||[];
      if(!options.length)throw Error('Tiada rekod ditemui bagi kategori ini.');
      if($('mv6iRecord'))$('mv6iRecord').innerHTML='<option value="">— Pilih rekod untuk diuji —</option>'+options.map(o=>'<option value="'+esc(o.id)+'">'+esc(o.label)+' ('+esc(o.id)+')</option>').join('');
      if($('mv6iField'))$('mv6iField').innerHTML='<option value="">— Pilih medan —</option>'+(r.fields||[]).map(f=>'<option value="'+esc(f)+'">'+esc(f)+'</option>').join('');
      if($('mv6iSource'))$('mv6iSource').textContent=options.length+' rekod telah dimuatkan · '+s(r.version);
      if(out)out.innerHTML=box('Pilih satu rekod, pilih medan, masukkan nilai CADANGAN dan klik Semak Kesan. Ini tidak mengubah rekod.','ok');
    }catch(err){if(out)out.innerHTML=box(err.message||String(err),'bad');}
    finally{busy(false);}
  };
  window.mv6iCheck=async function(){
    const id=s($('mv6iRecord')?.value),entity=s($('mv6iEntity')?.value),field=s($('mv6iField')?.value),newValue=s($('mv6iValue')?.value);
    const out=$('mv6iResult');if(!out)return;
    if(!id||!field){out.innerHTML=box('Pilih rekod dan medan yang hendak diuji.','warn');return;}
    if(!newValue){out.innerHTML=box('Masukkan nilai baharu untuk pratonton. Tiada data akan disimpan.','warn');return;}
    busy(true);out.innerHTML=loading('Meneliti rujukan Manual, Generator, Tugasan Mingguan dan e-Relief (jika tersedia)…');
    try{
      const r=await postToBackend({action:'manualV6ImpactPreview',data:{entity,id,field,newValue}});
      if(r.success!==true)throw Error(r.error||'Gagal mengesahkan kesan perubahan.');
      const checked=(r.coverage||[]).map(c=>'<tr><td>'+esc(c.module)+'</td><td>'+esc(c.sheet)+'</td><td><span class="mv6i-state '+(c.status==='DIBACA'?'pass':'unknown')+'">'+esc(c.status)+'</span></td><td>'+esc(c.count??c.note??'—')+'</td></tr>').join('');
      const deps=(r.dependencies||[]).map(d=>'<tr><td>'+esc(d.module)+'</td><td>'+esc(d.sheet)+'</td><td>'+esc(d.field)+'</td><td>'+esc(d.count)+'</td><td>'+(d.samples||[]).map(q=>'<div>Baris '+esc(q.row)+' · '+esc(q.reference)+'</div>').join('')+'</td></tr>').join('');
      const issues=(r.problems||[]).map(t=>'<li>'+esc(t)+'</li>').join('');
      const notes=(r.recommendations||[]).map(t=>'<li>'+esc(t)+'</li>').join('');
      const lbl=options.find(o=>o.id===id)?.label||id;
      out.innerHTML='<div class="mv6-result-head"><div><strong>Semakan Kesan Perubahan — DATA SEBENAR</strong><small>'+esc(r.version)+' · BACA SAHAJA · '+esc(lbl)+'</small></div>'+ 
        '<span class="mv6-badge mv6-badge-'+(statuses[r.status]||'muted')+'">'+esc(r.status)+'</span></div>'+
        '<div class="mv6-demo-grid"><div><small>ID rujukan</small><strong>'+esc(id)+'</strong></div><div><small>Medan</small><strong>'+esc(field)+'</strong></div><div><small>Nilai semasa</small><strong>'+esc(r.before)+'</strong></div><div><small>Cadangan (tidak disimpan)</small><strong>'+esc(r.after)+'</strong></div></div>'+
        '<div class="mv6i-summary"><div><strong>'+esc(r.summary?.sourcesChecked??0)+'</strong><small>Sumber dibaca</small></div><div><strong>'+esc(r.summary?.sourcesFailed??0)+'</strong><small>Gagal baca</small></div><div><strong>'+esc(r.summary?.matchedRecords??0)+'</strong><small>Jumlah padanan rujukan</small></div></div>'+
        (issues?'<h3>Halangan / validasi</h3><ul class="mv6-findings">'+issues+'</ul>':'')+
        '<h3>Rujukan ditemui mengikut modul</h3><div class="mv6-scroll"><table class="mv6-table"><thead><tr><th>Modul</th><th>Helaian</th><th>Jenis padanan</th><th>Bil.</th><th>Contoh</th></tr></thead><tbody>'+deps+'</tbody></table></div>'+
        '<h3>Liputan pembacaan</h3><div class="mv6-scroll"><table class="mv6-table"><thead><tr><th>Modul</th><th>Helaian</th><th>Keputusan</th><th>Rekod / sebab</th></tr></thead><tbody>'+checked+'</tbody></table></div>'+
        '<h3>Cadangan pengendalian</h3><ul class="mv6-findings">'+notes+'</ul>'+
        box('PRATONTON SAHAJA. Semakan ini tidak menyimpan perubahan. Firestore dan integrasi yang tidak mempunyai pautan rujukan lengkap belum diperakui.','warn');
    }catch(err){out.innerHTML=box(err.message||String(err),'bad');}
    finally{busy(false);}
  };
  document.addEventListener('DOMContentLoaded',()=>window.mv6iInit());
})();
