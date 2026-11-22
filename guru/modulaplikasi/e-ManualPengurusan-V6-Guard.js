/* SeMAKMUR Manual V6 — audit baca sahaja & simulasi dummy. Desktop only.
 * Menggunakan fiManualRequest melalui postToBackend sedia ada. Tiada request simpan.
 */
(function(){
  'use strict';
  const TESTS={
    RENAME_STAF:'Tukar nama guru yang masih mempunyai jadual',
    EMAIL_DUP:'Cuba daftar e-mel guru yang sudah digunakan',
    STAFF_LEAVE:'Nyahaktif guru yang masih mempunyai jadual',
    EDIT_UNUSED_LOCATION:'Tukar nama bilik yang belum digunakan',
    RENAME_ACTIVE_LOCATION:'Tukar nama kelas yang mempunyai jadual',
    RECODE_SUB:'Ubah kod subjek yang digunakan oleh Generator',
    DISABLE_JK:'Nyahaktif JK yang mempunyai pelantikan',
    STALE_REVISION:'Dua pentadbir menyimpan rekod versi lama',
    GRID_SAME_VERSION:'Tukar jenis slot tanpa versi grid baharu',
    GRID_NEW_VERSION:'Tukar jenis slot dengan versi grid baharu',
    MISSING_MASTER:'Cubaan simpan apabila master gagal dibaca'
  };
  function el(id){return document.getElementById(id)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function alertBox(text,type){return '<div class="mv6-alert mv6-'+type+'">'+esc(text)+'</div>'}
  function badge(status){const t=String(status||'BELUM DISEMAK');return '<span class="mv6-badge mv6-badge-'+(/LULUS|LAYAK/.test(t)?'ok':/AMARAN|PERLU/.test(t)?'warn':/GAGAL|DITOLAK/.test(t)?'bad':'muted')+'">'+esc(t)+'</span>'}
  function setBusy(flag){['mv6BtnHealth','mv6BtnUat'].forEach(id=>{const b=el(id);if(b)b.disabled=flag;});}
  window.v6GuardOpen=function(){
    if(typeof showView!=='function')return;
    showView('viewV6DataGuard');
    const title=el('txtBreadcrumb');if(title)title.textContent='Kesihatan Data & Mod Ujian V6';
    const select=el('mv6Case');
    if(select&&!select.options.length){select.innerHTML=Object.entries(TESTS).map(([value,label])=>'<option value="'+esc(value)+'">'+esc(label)+'</option>').join('');}
  };
  window.v6GuardAudit=async function(){
    const output=el('mv6HealthResult');if(!output)return;
    output.innerHTML='<div class="mv6-loading">Memeriksa data pusat sebenar… (baca sahaja)</div>';setBusy(true);
    try{
      const r=await postToBackend({action:'manualV6HealthAudit',data:{}});
      if(r.success!==true)throw Error(r.error||'Audit gagal.');
      const counts=Object.entries(r.counts||{}).map(([name,n])=>'<tr><td>'+esc(name)+'</td><td class="mv6-numeric">'+esc(n===null?'Gagal baca':n)+'</td></tr>').join('');
      const issues=(r.issues||[]).map(item=>'<tr><td>'+badge(item.level)+'</td><td>'+esc(item.sheet)+'</td><td><strong>'+esc(item.code)+'</strong><div>'+esc(item.message)+'</div></td><td>'+esc(item.row||'—')+'</td></tr>').join('');
      output.innerHTML='<div class="mv6-result-head"><div><strong>Audit Data Pusat</strong><small> '+esc(r.generatedAt||'')+' · '+esc(r.version||'')+'</small></div>'+badge(r.status)+'</div>'+
        '<div class="mv6-metrics"><div><strong>'+esc(r.summary?.gagal??0)+'</strong><span>Ralat kritikal</span></div><div><strong>'+esc(r.summary?.amaran??0)+'</strong><span>Amaran</span></div><div><strong>'+esc(r.summary?.semakan??0)+'</strong><span>Helaian disemak</span></div></div>'+
        '<h3>Inventori helaian</h3><div class="mv6-scroll"><table class="mv6-table"><thead><tr><th>Helaian</th><th>Rekod</th></tr></thead><tbody>'+counts+'</tbody></table></div>'+
        '<h3>Penemuan</h3>'+(issues?'<div class="mv6-scroll"><table class="mv6-table"><thead><tr><th>Tahap</th><th>Sumber</th><th>Perkara</th><th>Baris</th></tr></thead><tbody>'+issues+'</tbody></table></div>':alertBox('Tiada masalah dalam skop audit semasa.','ok'))+
        (r.truncated?alertBox('Senarai penemuan dihadkan kepada 200 item.','warn'):'')+
        '<p class="mv6-note">'+esc(r.note||'')+' Audit ini tidak mengubah sebarang data.</p>';
    }catch(e){output.innerHTML=alertBox(e.message||String(e),'bad');}
    finally{setBusy(false);}
  };
  window.v6GuardSimulate=async function(){
    const output=el('mv6UatResult');if(!output)return;
    const caseId=el('mv6Case')?.value||'RENAME_STAF';
    const value=el('mv6Value')?.value||'';
    output.innerHTML='<div class="mv6-loading">Mengesahkan senario menggunakan data dummy…</div>';setBusy(true);
    try{
      const r=await postToBackend({action:'manualV6UatPreview',data:{caseId,newValue:value}});
      if(r.success!==true)throw Error(r.error||'Simulasi gagal.');
      const z=r.result||{},changed=r.change||{};
      const items=(z.affected||[]).map(x=>'<li><b>'+esc(x.module)+'</b> — '+esc(x.reason)+'</li>').join('');
      const issues=(z.issues||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
      const oldValue=z.before&&z.before[changed.field]!==undefined?z.before[changed.field]:'—';
      output.innerHTML='<div class="mv6-result-head"><div><strong>Keputusan Mod Ujian</strong><small> '+esc(TESTS[caseId]||caseId)+'</small></div>'+badge(z.status)+'</div>'+
        '<div class="mv6-demo-grid"><div><small>ID dummy</small><strong>'+esc(changed.id||'—')+'</strong></div><div><small>Medan</small><strong>'+esc(changed.field||'—')+'</strong></div><div><small>Nilai sebelum</small><strong>'+esc(oldValue)+'</strong></div><div><small>Cadangan selepas</small><strong>'+esc(changed.value||'—')+'</strong></div></div>'+
        '<h3>Semakan validasi</h3>'+(issues?'<ul class="mv6-findings">'+issues+'</ul>':alertBox('Semakan lulus dalam data dummy. Ini bukan kelulusan penerbitan rasmi.','ok'))+
        '<h3>Modul yang terlibat</h3>'+(items?'<ul class="mv6-findings">'+items+'</ul>':'<p class="mv6-note">Tiada rujukan aktif dalam data dummy senario ini.</p>')+
        '<p class="mv6-note">'+esc(z.note||'')+' Enjin ini belum disambung kepada proses simpan rasmi.</p>';
    }catch(e){output.innerHTML=alertBox(e.message||String(e),'bad');}
    finally{setBusy(false);}
  };
  window.v6GuardChangeCase=function(){if(el('mv6Value'))el('mv6Value').value='';if(el('mv6UatResult'))el('mv6UatResult').innerHTML='<p class="mv6-note">Klik Uji Perubahan untuk melihat keputusan.</p>';};
})();
