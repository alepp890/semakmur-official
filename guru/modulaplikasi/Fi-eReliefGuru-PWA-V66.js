'use strict';
/* SeMAKMUR Smart e-Relief V6.6 — lapisan paparan responsif sahaja.
 * Firestore, API, e-Relief V6.0, bridge V5.5.4 dan hak pengguna kekal.
 */
(function(){
  const ID='fi-v66-date';
  const byId=id=>document.getElementById(id);
  const html=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mobile=()=>window.matchMedia('(max-width:767px)').matches && document.body.classList.contains('is-embed');
  const slot=x=>{
    const period=Number(x.periodNo);
    if(Number.isFinite(period)&&period>0)return String(period);
    const m=String(x.slotId||'').match(/SLOT[-_]0*(\d+)$/i);
    return m?String(Number(m[1])):'—';
  };
  const time=x=>String(x||'').replace(':','.');
  const names=x=>Array.isArray(x.originalNames)&&x.originalNames.length?x.originalNames.filter(Boolean).join(' / '):'Guru tidak hadir';
  const valid=x=>!['DIBATALKAN','DIBATALKAN_GPK'].includes(String(x.status||''));
  const sortRows=(a,b)=>String(a.from||'').localeCompare(String(b.from||''),'ms')||Number(slot(a))-Number(slot(b))||String(a.classId||'').localeCompare(String(b.classId||''),'ms');
  const fmtDate=val=>{
    const m=String(val||'').match(/^(\d{4})-(\d\d)-(\d\d)$/);
    if(!m)return val||'';
    return new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(+m[1],+m[2]-1,+m[3])));
  };

  let openId='';
  let returnTab='jadual';
  let lastListScroll=0;
  function allRows(){try{return typeof rows!=='undefined'&&Array.isArray(rows)?rows:[];}catch(_){return [];}}
  function isPublished(){try{return schedulePublished===true;}catch(_){return false;}}
  function dateValue(){return byId('view-date')?.value||'';}
  function today(){try{return dateMY();}catch(_){return ''}}
  function renderList(){
    if(!mobile())return;
    const box=byId('fi-v66-mobile-list'),title=byId('fi-v66-day-title'),date=byId(ID);
    if(!box)return;
    const selected=dateValue();
    if(date&&selected&&date.value!==selected)date.value=selected;
    if(title)title.textContent=selected===today()?'Jadual Relief Hari Ini':'Jadual Relief · '+fmtDate(selected);
    if(!isPublished()){
      box.innerHTML='<p class="empty">Jadual relief belum diterbitkan untuk tarikh ini.</p>';
      return;
    }
    const active=allRows().filter(valid);
    if(!active.length){box.innerHTML='<p class="empty">Tiada tugasan relief untuk tarikh ini.</p>';return;}
    const groups=new Map();
    for(const item of active){
      const key=names(item);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(item);
    }
    const ordered=[...groups].sort((a,b)=>a[0].localeCompare(b[0],'ms',{sensitivity:'base'}));
    box.innerHTML=ordered.map(([name,items])=>`<section class="fi-v66-group" aria-label="Guru asal ${html(name)}">
      <div class="fi-v66-group-title">${html(name)}</div>
      ${items.sort(sortRows).map(item=>{
        const replacement=item.replacementName||(['PERLU_SERAH_TUGAS'].includes(item.status)?'Perlu serah tugas':'Belum diagih');
        const unfilled=!item.replacementName;
        return `<button type="button" class="fi-v66-row" data-fi66-id="${html(item.id)}" aria-label="Audit agihan ${html(item.subject||'')} ${html(item.classId||'')} waktu ${html(slot(item))}, guru ganti ${html(replacement)}">
          <span class="fi-v66-cell"><strong>${html(item.subject||'—')}</strong><small>${html(item.classId||'')}</small></span>
          <span class="fi-v66-cell"><strong>Waktu ${html(slot(item))}</strong><small>${html(time(item.from))}–${html(time(item.to))}</small></span>
          <span class="fi-v66-cell fi-v66-replacement${unfilled?' fi-v66-unfilled':''}"><strong>${html(replacement)}</strong></span>
          <span class="fi-v66-chevron" aria-hidden="true">›</span>
        </button>`;
      }).join('')}
    </section>`).join('');
  }
  function tag(value){return `<span class="fi-v66-audit-tag">${html(value)}</span>`;}
  function metric(label,value){return `<div class="fi-v66-audit-item"><small>${html(label)}</small><strong>${html(value??'—')}</strong></div>`;}
  function listSlots(a){return Array.isArray(a)&&a.length?a.map(String).map(tag).join(''):'—';}
  function auditHtml(record){
    if(!record)return '<div class="fi-v66-detail-empty">Rekod agihan tidak lagi tersedia untuk tarikh ini.</div>';
    const a=record.auditSummary||null;
    const teacher=names(record),replace=record.replacementName||'Belum diagih';
    const status=String(record.status||'—');
    const warning=/TIADA|PERLU/.test(status);
    const fields=`<div class="fi-v66-audit-card"><h3>Maklumat Tugasan</h3><div class="fi-v66-audit-grid">
       ${metric('Guru asal',teacher)}${metric('Guru ganti / penerus',replace)}
       ${metric('Subjek',record.subject)}${metric('Kelas',record.classId)}
       ${metric('Waktu','Waktu '+slot(record))}${metric('Masa',time(record.from)+'–'+time(record.to))}
       ${metric('Kaedah',record.assignmentMode||'—')}${metric('Status',status)}
       ${metric('Fasa',record.phase||'UTAMA')}${metric('Pelaksanaan',record.completed?'Disahkan guru':'Belum disahkan')}
       ${record.manualTier?metric('Manual Backup','Tahap '+record.manualTier):''}
      </div></div>`;
    let extra='';
    if(a){
      const pairing=Number(a.pairingPecah||0);
      const total=(a.totalSelepas??'—');
      extra=`<div class="fi-v66-audit-card"><h3>Audit Beban Guru</h3><div class="fi-v66-audit-grid">
         ${metric('Waktu hakiki',a.hakiki??'—')}${metric('Pecah pairing',pairing)}
         ${metric('Relief selepas agihan',a.reliefSelepas??'—')}${metric('Beban selepas',total+' waktu')}
         ${metric('Had harian',a.hadHarian!=null?a.hadHarian+' waktu':'—')}
         ${metric('Berturut-turut',(a.berturutSelepas??'—')+' / '+(a.hadBerturut??'—'))}
         ${metric('Relief minggu sebelum dipilih',a.reliefMingguSebelum??'—')}${metric('Pusingan',a.pusingan||'—')}
       </div></div>
       <div class="fi-v66-audit-card"><h3>Butiran Jadual</h3>
         <div class="fi-v66-audit-full"><strong>Hakiki asal</strong><div class="fi-v66-audit-list">${listSlots(a.slotsHakikiW?.length?a.slotsHakikiW:a.slotsHakiki)}</div></div>
         <div class="fi-v66-audit-full"><strong>Relief diberikan</strong><div class="fi-v66-audit-list">${listSlots(a.slotsReliefW)}</div></div>
         ${pairing?`<div class="fi-v66-audit-full"><strong>Pairing dipecahkan</strong><div class="fi-v66-audit-list">${listSlots(a.slotsPecahW)}</div></div>`:''}
       </div>
       <div class="fi-v66-audit-card"><h3>Keputusan Audit</h3><div class="fi-v66-audit-full">${html(a.keputusan||'—')}</div></div>`;
    }else{
      extra='<div class="fi-v66-detail-empty">Audit beban belum tersedia bagi slot yang belum diagihkan.</div>';
    }
    let actions='';
    try{
      if(record.status==='DIAGIH'&&!record.completed&&record.replacementUid===user?.uid)
        actions+=`<button type="button" data-fi66-confirm="${html(record.id)}">Sahkan selepas PdPc</button>`;
      if(record.status==='DIAGIH'&&Array.isArray(roles)&&roles.includes('GPK'))
        actions+=`<button type="button" data-fi66-cancel="${html(record.id)}">Batal relief (jika tidak perlu)</button>`;
    }catch(_){}
    return `<button type="button" class="fi-v66-back" id="fi-v66-back" aria-label="Kembali ke jadual relief">← Kembali</button>
      <h2 class="fi-v66-audit-title">Audit Agihan</h2>
      <p class="fi-v66-audit-sub">${html(teacher)} · ${html(fmtDate(dateValue()))}</p>
      ${fields}${extra}${actions?`<div class="fi-v66-audit-actions">${actions}</div>`:''}`;
  }
  function renderAudit(){
    if(!openId||!mobile())return;
    const root=byId('fi-v66-detail');if(!root)return;
    root.innerHTML=auditHtml(allRows().find(x=>String(x.id)===openId&&valid(x)));
  }
  function enterAudit(id,withHistory){
    if(!mobile())return;
    const record=allRows().find(x=>String(x.id)===String(id)&&valid(x));
    if(!record)return;
    if(!openId){lastListScroll=window.scrollY||0;returnTab=document.querySelector('.tabs button.active')?.dataset.tab||'jadual';}
    openId=String(record.id);
    if(withHistory){
      const url=new URL(window.location.href);url.searchParams.set('fiAudit',openId);
      window.history.pushState({fi66ReliefAudit:openId,fi66FromTab:returnTab},'',url.pathname+url.search+url.hash);
    }
    const bar=byId('fi-v66-datebar'),tabs=document.querySelector('.tabs');
    if(bar)bar.hidden=true;if(tabs)tabs.hidden=true;
    document.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!=='audit');
    document.body.classList.add('fi-v66-audit-open');renderAudit();window.scrollTo(0,0);
  }
  function exitAudit(){
    if(!openId)return;
    openId='';document.body.classList.remove('fi-v66-audit-open');
    const bar=byId('fi-v66-datebar'),tabs=document.querySelector('.tabs');
    if(bar)bar.hidden=false;if(tabs)tabs.hidden=false;
    if(typeof currentTab==='function')currentTab(returnTab);
    else document.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!==returnTab);
    window.scrollTo(0,lastListScroll);
  }
  function back(){
    if(!openId)return;
    if(window.history.state?.fi66ReliefAudit)window.history.back();
    else exitAudit();
  }
  function install(){
    const date=byId(ID),originalDate=byId('view-date'),list=byId('fi-v66-mobile-list'),detail=byId('fi-v66-detail');
    if(!date||!originalDate||!list||!detail)return;
    date.value=originalDate.value;
    date.addEventListener('change',()=>{
      if(date.value&&date.value!==originalDate.value){originalDate.value=date.value;originalDate.dispatchEvent(new Event('change',{bubbles:true}));}
    });
    list.addEventListener('click',event=>{
      const button=event.target.closest('button[data-fi66-id]');
      if(button)enterAudit(button.dataset.fi66Id,true);
    });
    detail.addEventListener('click',event=>{
      if(event.target.closest('#fi-v66-back')){back();return;}
      const yes=event.target.closest('[data-fi66-confirm]');
      if(yes&&typeof confirmRelief==='function'){confirmRelief(yes.dataset.fi66Confirm);return;}
      const no=event.target.closest('[data-fi66-cancel]');
      if(no&&typeof cancelSlot==='function')cancelSlot(no.dataset.fi66Cancel);
    });
    window.addEventListener('popstate',event=>{
      const id=event.state?.fi66ReliefAudit||'';
      if(id){enterAudit(id,false)}else exitAudit();
    });
    window.addEventListener('message',event=>{
      if(event.origin!==window.location.origin||event.source!==window.parent)return;
      if(event.data?.type==='semakmur-relief-audit-back')back();
    });
    /* Patch hanya fungsi paparan. Pendengar onSnapshot dan kawalan backend asal tidak ditukar. */
    if(typeof draw==='function'){
      const stableDraw=draw;
      draw=function(...args){
        const result=stableDraw.apply(this,args);
        renderList();renderAudit();
        return result;
      };
    }
    renderList();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
