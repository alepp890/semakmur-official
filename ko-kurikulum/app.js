const el=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pc=x=>x==null?'—':Number(x).toFixed(2)+'%';
function render(d){if(d.error)throw Error(d.error);const s=d.summary||{};
 el('reports').textContent=s.reports??'—';el('attendance').textContent=s.attendanceRows??'—';el('percent').textContent=pc(s.overallPercent);el('verified').textContent=s.verifiedReports??'—';
 el('weekBars').innerHTML=(d.byWeek||[]).map(x=>`<div class="barrow"><span>Perjumpaan ${x.week}</span><div class="track"><div class="bar" style="width:${Math.max(0,Math.min(100,Number(x.percent)||0))}%"></div></div><strong>${pc(x.percent)}</strong></div>`).join('');
 el('statusList').innerHTML=Object.entries(d.reportStatuses||{}).map(([k,v])=>`<div class="statrow"><span>${esc(k)}</span><b>${v}</b></div>`).join('');
 el('unitRows').innerHTML=(d.byUnit||[]).map(x=>`<tr><td>${esc(x.unit)}</td><td>${esc(x.category)}</td><td>${x.sessions}</td><td>${x.possible}</td><td>${pc(x.percent)}</td></tr>`).join('');
 el('classRows').innerHTML=(d.byClass||[]).map(x=>`<tr><td>${esc(x.class)}</td><td>${x.present}</td><td>${x.possible}</td><td>${pc(x.percent)}</td></tr>`).join('');
 el('updated').textContent=d.generatedAt?'Kemaskini '+new Date(d.generatedAt).toLocaleString('ms-MY'):'';
}
function load(){const url=window.KOKO_API_URL;if(!url||url.startsWith('ISI_')){el('error').hidden=false;el('error').textContent='Sila isi URL Apps Script dalam config.js selepas deploy.';return;}
 const name='kokoCallback'+Date.now(),script=document.createElement('script');let complete=false;window[name]=data=>{complete=true;delete window[name];script.remove();try{render(data);el('error').hidden=true}catch(e){el('error').hidden=false;el('error').textContent=e.message}};
 script.onerror=()=>{el('error').hidden=false;el('error').textContent='Gagal mengambil data. Semak URL, ID dan deployment Apps Script.';delete window[name];};
 const timer=setTimeout(()=>{if(!complete){script.remove();delete window[name];el('error').hidden=false;el('error').textContent='Tiada respons daripada Apps Script.';}},15000);
 script.src=url+(url.includes('?')?'&':'?')+'action=summary&callback='+name;document.body.appendChild(script);
}
const priv=window.KOKO_PRIVATE_PRINT_URL;['privateLink','privateSide'].forEach(id=>{const a=el(id);if(priv&&!priv.startsWith('ISI_'))a.href=priv;else{a.href='#';a.addEventListener('click',e=>{e.preventDefault();alert('Isi pautan Apps Script dalam config.js dahulu.')})}});
el('refresh').addEventListener('click',load);load();
