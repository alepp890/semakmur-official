/* Mobile V4 – paparan khusus telefon; desktop tidak disentuh. */
(function(){'use strict';
  const mobile=()=>window.matchMedia('(max-width:767px)').matches;
  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let ready=false,launchRetry=false;
  function greeting(){const h=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',hour:'numeric',hour12:false}).format(new Date());return +h<12?'Selamat Pagi,':+h<14?'Selamat Tengah Hari,':+h<19?'Selamat Petang,':'Selamat Malam,';}
  function isWork(){return typeof dashboardAuthenticated!=='undefined' && dashboardAuthenticated;}
  function render(){if(!mobile()||!isWork()||!window.dashboardData && typeof dashboardData==='undefined')return;
    const data=dashboardData||{},user=typeof currentUser!=='undefined'?currentUser:{};
    const name=data.profile?.namaSamaran||data.profile?.namaPenuh||user?.name||'Guru';
    el('v4-greeting').textContent=greeting();el('v4-nickname').textContent=name;
    el('v4-initial').textContent=String(name).trim().charAt(0).toUpperCase()||'G';
    el('v4-date').textContent=new Intl.DateTimeFormat('ms-MY',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kuala_Lumpur'}).format(new Date());
    const day=typeof todayDay==='function'?todayDay():'';
    const list=data.jadualTersedia&&typeof blokBergabung==='function'?blokBergabung(day):[];
    const now=typeof nowMsia==='function'?nowMsia():new Date(),t=now.getHours()*60+now.getMinutes();
    const nowClass=list.find(x=>x.startMin<=t&&t<x.endMin),nextClass=list.find(x=>x.startMin>t);
    function tile(label,s){return `<div class="v4-small-card"><small>${label}</small>${s?`<strong>${esc(s.subjek)}</strong><span>${esc(s.kelas||'')} · ${esc(s.mula||'')}–${esc(s.tamat||'')}</span>`:'<strong>Tiada kelas</strong>'}</div>`;}
    el('v4-now-next').innerHTML=tile('Sekarang',nowClass)+tile('Seterusnya',nextClass);
    const rel=data.reliefHariIni;
    el('v4-relief').textContent=rel?.disahkan===true?(Array.isArray(rel.sesi)&&rel.sesi.length?rel.sesi.map(s=>[s.masa,s.kelas,s.subjek].filter(Boolean).join(' · ')).join(' | '):'Tiada relief hari ini'):'Maklumat relief belum tersedia';
    const duty=data.tugasBertugas;
    el('v4-duty').textContent=duty?.disahkan===true?(duty.bertugas===true?[duty.kumpulan,duty.catatan].filter(Boolean).join(' · '):'Anda tidak bertugas minggu ini'):'Maklumat minggu bertugas belum tersedia';
    const host=el('v4-schedule');
    if(!data.jadualTersedia||!list.length){host.innerHTML='<div class="v4-panel">Tiada jadual hari ini</div>';return;}
    host.innerHTML=list.map(s=>{
      const raw=typeof rphForSlot==='function'?rphForSlot(s):'';
      const low=String(raw||'').toLowerCase();
      const label=/hantar|dihantar/.test(low)?'Hantar':/refleksi/.test(low)?'Menunggu Refleksi':/draf/.test(low)?'Draf':Array.isArray(data.rphStatusHariIni)?'Tiada RPH':'Belum disemak';
      const cls=label==='Hantar'?'done':label==='Tiada RPH'?'warn':'';
      return `<div class="v4-day-card"><div class="v4-day-time">${esc(s.mula)}<br>– ${esc(s.tamat)}</div><div class="v4-day-info"><strong>${esc(s.subjek)}</strong><span>${esc(s.kelas)}</span></div><span class="v4-day-badge ${cls}">${esc(label)}</span></div>`;
    }).join('');
  }
  function activeName(){if(!document.getElementById('kehadiran-workspace').hidden)return 'Kehadiran';if(!document.getElementById('erph-workspace').hidden)return 'e-RPH';return null;}
  function header(){if(!mobile())return;const active=activeName();el('v4-back').hidden=!active;el('v4-header-title').textContent=active?active:'SeMAKMUR Dashboard Guru';document.body.classList.toggle('v4-on-home',!active && (typeof activePage==='undefined'||activePage==='laman_utama'));}
  function navigate(kind){const active=activeName();if(active===kind)return;if(active){if(kind==='Kehadiran')closeErphWorkspace(true);else if(kind==='e-RPH')closeKehadiranWorkspace(true);}if(kind==='Kehadiran')openKehadiranWorkspace();else if(kind==='e-RPH')openErphWorkspace();else{closeErphWorkspace(true);closeKehadiranWorkspace(true);switchMainMenu('laman_utama');}header();}
  function syncNav(){const active=activeName(),hash=location.hash;
    if(hash==='#kehadiran' && active!=='Kehadiran')navigate('Kehadiran');
    else if(hash==='#erph'&&active!=='e-RPH')navigate('e-RPH');
    else if(!hash && active)navigate('Utama');
    header();
  }
  function install(){if(!mobile())return;
    const nav=el('mobile-bottom-nav');if(nav){const icons={Utama:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',Kehadiran:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="m8 12 3 3 5-6"/>','e-RPH':'<path d="M4 19V5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 1-2-2Z"/><path d="M9 8h6m-6 4h6"/>',Menu:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'};nav.innerHTML=['Utama','Kehadiran','e-RPH','Menu'].map(k=>`<button class="bottom-btn" data-v4="${k}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[k]}</svg><span>${k}</span></button>`).join('');
      nav.addEventListener('click',ev=>{const target=ev.target.closest('[data-v4]');if(!target)return;const kind=target.dataset.v4;if(kind==='Menu'){toggleMobileMenu();return;}if(kind==='Utama'){if(activeName()){history.back();}else switchMainMenu('laman_utama');return;}navigate(kind);});}
    el('v4-back').addEventListener('click',()=>{if(activeName())history.back();else switchMainMenu('laman_utama');});
    el('v4-profile').addEventListener('click',()=>openProfile());
    el('v4-bell').addEventListener('click',()=>showInfo('Tiada notifikasi baharu yang disahkan.'));
    // PushState when opening new module; back should return to dashboard. 
    const openE=openErphWorkspace,openK=openKehadiranWorkspace;
    window.openErphWorkspace=function(){const prev=activeName();openE();if(!prev && location.hash==='#erph'){history.replaceState({v4:true,kind:'home'},'',location.pathname+location.search);history.pushState({v4:true,kind:'erph'},'','#erph');}header();};
    window.openKehadiranWorkspace=function(){const prev=activeName();openK();if(!prev && location.hash==='#kehadiran'){history.replaceState({v4:true,kind:'home'},'',location.pathname+location.search);history.pushState({v4:true,kind:'kehadiran'},'','#kehadiran');}header();};
    // Ensure a base history entry exists before a module is pushed; replaceState in legacy open gets overwritten back.
    window.addEventListener('popstate',()=>{syncNav();});
    const origMenu=switchMainMenu;
    window.switchMainMenu=function(key){origMenu(key);header();};
    const finish=finishDashboard;
    window.finishDashboard=function(d){const result=finish(d);if(result){ready=true;render();el('v4-launch').hidden=true;header();}return result;};
    const failed=unavailableDashboard;
    window.unavailableDashboard=function(err){failed(err);if(!ready){el('v4-launch-message').textContent='Sambungan belum tersedia. Sentuh untuk cuba lagi.';el('v4-launch').onclick=()=>{el('v4-launch-message').textContent='Menyelaraskan data...';hydrateDashboard(true);};}else el('v4-launch').hidden=true;};
    const oldClock=updateClock;
    window.updateClock=function(){oldClock();if(ready)render();};
    document.body.classList.add('v4-on-home');header();
  }
  // Defer script installed before DOMContentLoaded -> inline boot uses overridden methods.
  install();
  window.addEventListener('resize',()=>{header();if(ready)render();});
})();
