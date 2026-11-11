'use strict';
/** V5.6 additive official Manual Backup UI. No edits to Fi-eReliefGuru.js iframe bridge.
 * Server remains authority: if a slot is not TIADA_GANTI, save is rejected.
 * Requires explicit role in dashboard profile for UI visibility.
 */
(()=>{
 const authorized=()=>typeof roles!=='undefined'&&Array.isArray(roles)&&
  roles.some(x=>['ADMIN_SISTEM','SU_KURIKULUM','SETIAUSAHA_KURIKULUM','GPK_PENTADBIRAN'].includes(x));
 const esc56=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const qs=id=>document.getElementById(id);
 let chosen='';
 function display(){
  const host=qs('daily-list');if(!host||!authorized()||typeof rows==='undefined')return;
  const group=new Map();
  rows.filter(x=>x.status!=='DIBATALKAN'&&x.status!=='DIBATALKAN_GPK').forEach(x=>{
   const key=(x.originalNames||[]).join(' / ')||'Guru tidak hadir';
   if(!group.has(key))group.set(key,[]);group.get(key).push(x);
  });
  const flat=[...group.values()].flat(),trs=[...host.querySelectorAll('tbody tr:not(.group)')];
  if(flat.length!==trs.length)return;
  flat.forEach((r,i)=>{if(r.status!=='TIADA_GANTI'||!r.id)return;
   const cell=trs[i].children[3];if(!cell||cell.querySelector('[data-fi56-manual]'))return;
   const button=document.createElement('button');button.type='button';button.className='fi-v56-official-manual';
   button.dataset.fi56Manual=r.id;button.textContent='Agih Manual (slot kosong)';
   cell.append(document.createElement('br'),button);
  });
 }
 function dialog(){let node=qs('fi56-official-modal');if(node)return node;
  node=document.createElement('div');node.id='fi56-official-modal';node.hidden=true;node.className='fi-v56-dialog';
  node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');
  node.innerHTML=`<div class="fi-v56-dialog-inner"><h3>Manual Backup — relief rasmi</h3>
   <p class="muted-note">Hanya slot TIADA_GANTI. Semua syarat wajib disemak di backend. Agihan rasmi mesti sudah diterbitkan.</p>
   <p id="fi56-official-state" role="status"></p>
   <label>Guru pengganti<select id="fi56-official-staff"></select></label>
   <label>Catatan sebab<textarea id="fi56-official-reason" rows="3" maxlength="300" placeholder="Sebab perlu agihan manual..."></textarea></label>
   <div class="fi-v56-dialog-actions"><button id="fi56-official-cancel" type="button" class="btn muted">Batal</button>
   <button id="fi56-official-save" type="button" class="btn">Sahkan Agihan</button></div></div>`;
  document.body.append(node);
  qs('fi56-official-cancel').addEventListener('click',()=>{node.hidden=true;});
  qs('fi56-official-save').addEventListener('click',save);
  return node;
 }
 async function open(id){if(!authorized())return;
  chosen=id;const dlg=dialog();dlg.hidden=false;qs('fi56-official-state').textContent='Menyemak senarai guru layak…';
  qs('fi56-official-save').disabled=true;
  try{const res=await api('relief56ManualCandidates',{date:qs('view-date').value,reliefId:id});
   const options=Array.isArray(res.candidates)?res.candidates:[];
   qs('fi56-official-staff').innerHTML=options.length?options.map(x=>
    `<option value="${esc56(x.staffId)}">${esc56(x.name)} · ${esc56(x.hakiki)}H + ${esc56(x.reliefHari)}R · ${esc56(x.reliefMinggu)}R minggu · ${esc56(x.mode)}</option>`).join(''):'<option value="">Tiada guru layak</option>';
   qs('fi56-official-state').textContent=options.length+' calon tersedia';
   qs('fi56-official-save').disabled=!options.length;
  }catch(e){qs('fi56-official-state').textContent='Gagal: '+(e?.message||String(e));}
 }
 async function save(){const id=chosen,reason=qs('fi56-official-reason').value.trim(),staffId=qs('fi56-official-staff').value;
  if(reason.length<8){qs('fi56-official-state').textContent='Sebab sekurang-kurangnya 8 aksara.';return;}
  if(!staffId||!id)return;
  if(!confirm('Sahkan agihan manual bagi slot yang belum terisi ini?'))return;
  const b=qs('fi56-official-save');b.disabled=true;
  try{const result=await api('relief56ManualAssign',{date:qs('view-date').value,reliefId:id,staffId,reason});
   qs('fi56-official-modal').hidden=true;
   if(typeof warn==='function')warn('Manual Backup berjaya: '+(result.replacementName||staffId)+'. Jadual PWA akan dikemas kini.');
  }catch(e){qs('fi56-official-state').textContent='Gagal: '+(e?.message||String(e));}
  finally{b.disabled=false;}
 }
 function setup(){const host=qs('daily-list');if(!host)return;
  host.addEventListener('click',e=>{const b=e.target.closest('[data-fi56-manual]');if(b)open(b.dataset.fi56Manual);});
  const obs=new MutationObserver(display);obs.observe(host,{childList:true});display();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
