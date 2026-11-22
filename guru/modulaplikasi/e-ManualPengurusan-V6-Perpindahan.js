/* SeMAKMUR Manual V6.2 desktop — pratonton perpindahan (no writes) */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.mv62LoadStaff=function(){
  const e=byId('mv62StaffSelect');if(!e)return;
  const list=typeof ALL_STAF!=='undefined'?ALL_STAF:[];
  e.innerHTML='<option value="">-- Pilih staf --</option>'+list.filter(s=>String(s.Status||'Aktif').toLowerCase()==='aktif').map(s=>'<option value="'+esc(s.ID_Staf)+'">'+esc(s.Nama_Penuh)+' · '+esc(s.ID_Staf)+'</option>').join('');
  const date=byId('mv62ExitDate');if(date&&!date.value)date.value=(typeof v5Today==='function'?v5Today():new Date().toISOString().slice(0,10));
};
window.mv62PreviewExit=async function(){
  const out=byId('mv62ExitResult'),button=byId('mv62BtnPreview');
  const id=byId('mv62StaffSelect')?.value,date=byId('mv62ExitDate')?.value;
  if(!out)return;
  if(!id||!date){out.innerHTML='<p class="mv6-alert mv6-warn">Pilih staf dan tarikh akhir bertugas dahulu.</p>';return;}
  button.disabled=true;out.textContent='Membaca pelantikan untuk simulasi…';
  try{
    const r=await postToBackend({action:'manualV62StaffExitPreview',data:{ID_Staf:id,Tarikh_Keluar:date}});
    if(!r?.success)throw new Error(r?.error||'Simulasi gagal.');
    const rows=(r.pelantikan||[]).map(x=>'<tr><td>'+esc(x.Nama_Jawatankuasa)+'</td><td>'+esc(x.Peranan)+'</td><td>'+esc(x.Skop_Tugas_Kelas)+'</td><td>'+esc(x.Tarikh_Tamat_Cadangan||'—')+'</td></tr>').join('');
    out.innerHTML='<div class="mv6-result-head"><div><strong>'+esc(r.Nama_Penuh)+'</strong><small> '+esc(r.ID_Staf)+'</small></div><span class="mv6-badge mv6-badge-'+(r.status==='DISEKAT'?'bad':'ok')+'">'+esc(r.status)+'</span></div>'+
      (r.ralat?'<p class="mv6-alert mv6-bad">'+esc(r.ralat)+'</p>':'<p class="mv6-note">Tarikh akhir: <b>'+esc(r.Tarikh_Akhir)+'</b> · Jawatan kosong mulai <b>'+esc(r.Kosong_Mulai)+'</b> · '+esc(r.bilPelantikan)+' pelantikan</p>')+
      (rows?'<div class="mv6-scroll"><table class="mv6-table"><thead><tr><th>Jawatankuasa</th><th>Peranan</th><th>Skop</th><th>Tamat (cadangan)</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<p class="mv6-note">Tiada pelantikan Aktif ditemui bagi staf ini.</p>')+
      '<p class="mv6-note">'+esc(r.nota)+'</p>';
  }catch(e){out.innerHTML='<p class="mv6-alert mv6-bad">'+esc(e.message||e)+'</p>';}
  finally{button.disabled=false;}
};
})();
