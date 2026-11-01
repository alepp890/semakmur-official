/* SeMAKMUR Kehadiran V4.2 – paparan Desktop ringkas; data server sebagai rujukan rasmi. */
(function(){'use strict';
  if(!window.matchMedia('(min-width:768px)').matches)return;
  const $=id=>document.getElementById(id);
  const box=$('skh-desktop-v42');if(!box)return;
  box.hidden=false;
  const ui={date:$('skh-d42-date'),day:$('skh-d42-day'),note:$('skh-d42-note'),classes:$('skh-d42-classes'),total:$('skh-d42-total'),absent:$('skh-d42-absentees'),name:$('skh-d42-class-name'),subtitle:$('skh-d42-subtitle'),stat:$('skh-d42-class-stat'),foot:$('skh-d42-footer')};
  let seq=0,classes=[],selected=null;
  const clean=s=>String(s||'').trim();
  const k=v=>clean(v).toUpperCase();
  const sort=(a,b)=>{let x=k(a.namaKelas),y=k(b.namaKelas);if(x.startsWith('PRA')&&!y.startsWith('PRA'))return -1;if(y.startsWith('PRA')&&!x.startsWith('PRA'))return 1;return x.localeCompare(y,'ms',{numeric:true})};
  const node=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el;};
  const now=()=>malaysiaDate();
  const closed=date=>['Sabtu','Ahad'].includes(weekday(date));
  function displayDate(iso){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return '';
    const parts=iso.split('-').map(Number);
    return new Intl.DateTimeFormat('ms-MY',{timeZone:'Asia/Kuala_Lumpur',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(Date.UTC(parts[0],parts[1]-1,parts[2],4)));
  }
  const statusText=c=>closed(ui.date.value)?'Tiada Sesi Persekolahan':(k(c.statusRekod)==='DISAHKAN'&&c.jumlahHadir!==null&&c.jumlahMurid!==null&&Number.isFinite(Number(c.jumlahHadir))&&Number.isFinite(Number(c.jumlahMurid))?Number(c.jumlahHadir)+'/'+Number(c.jumlahMurid):(k(c.statusRekod)==='MENYIMPAN'?'Rekod diproses':'Tiada Rekod'));
  const statusKind=c=>closed(ui.date.value)?'closed':k(c.statusRekod)==='DISAHKAN'?'done':'pending';
  function setNote(s,isError=false){ui.note.textContent=s;ui.note.classList.toggle('error',isError);}
  function placeholder(s){ui.absent.replaceChildren(node('div','skh-d42-empty',s));}
  function resetDetail(){selected=null;ui.name.textContent='Murid Tidak Hadir';ui.subtitle.textContent='Pilih kelas untuk melihat rekod.';ui.stat.textContent='—';ui.stat.className='skh-d42-badge';placeholder('Pilih mana-mana kelas di sebelah kiri.');}
  function renderClasses(){ui.classes.replaceChildren();ui.total.textContent=classes.length+' kelas';for(const c of classes){const b=node('button','skh-d42-class'+(selected?.idKelas===c.idKelas?' active':''));b.type='button';const title=node('span','skh-d42-class-name',c.namaKelas||c.idKelas);const stat=node('span','skh-d42-badge '+statusKind(c),statusText(c));b.append(title,stat);b.addEventListener('click',()=>showClass(c));ui.classes.append(b);}if(!classes.length)ui.classes.append(node('div','skh-d42-empty','Tiada kelas berdaftar.'));}
  async function refresh(){const request=++seq;ui.day.textContent=displayDate(ui.date.value);selected=null;ui.classes.replaceChildren();resetDetail();setNote('Memuatkan status kelas…');try{if(!state.user)throw new Error('Sesi guru belum tersedia.');const d=await api(ACTION.kelas,{tarikh:ui.date.value});if(request!==seq)return;classes=(Array.isArray(d?.kelas)?d.kelas:[]).filter(c=>c?.idKelas).sort(sort);renderClasses();setNote(closed(ui.date.value)?'Tiada sesi persekolahan pada hari ini. Paparan kelas untuk rujukan sahaja.':classes.length+' kelas · Pilih kelas untuk semakan rekod.');}catch(e){if(request!==seq)return;setNote(e.message||'Tidak dapat membaca kehadiran.',true);}}
  async function showClass(c){const request=++seq;selected=c;renderClasses();ui.name.textContent=c.namaKelas||c.idKelas;ui.subtitle.textContent=displayDate(ui.date.value);ui.stat.textContent=statusText(c);ui.stat.className='skh-d42-badge '+statusKind(c);
    if(closed(ui.date.value)){placeholder('Tiada Sesi Persekolahan');return;}
    if(k(c.statusRekod)!=='DISAHKAN'){placeholder('Tiada rekod rasmi untuk kelas ini pada tarikh dipilih.');return;}
    placeholder('Menyemak murid tidak hadir…');try{const d=await api(ACTION.murid,{tarikh:ui.date.value,idKelas:c.idKelas});if(request!==seq)return;const absent=(d?.murid||[]).filter(x=>k(x.statusKehadiran)==='TIDAK_HADIR');ui.absent.replaceChildren();const canReason=d?.bolehLihatSebab===true;
      if(!absent.length){placeholder('Semua murid hadir mengikut rekod rasmi.');return;}
      for(const s of absent){const row=node('div','skh-d42-student');const part=node('div','');part.append(node('div','skh-d42-student-name',s.namaMurid));
        if(canReason){const report=s.laporanPenjaga?.ada===true;part.append(node('div','skh-d42-reason',report?(clean(s.laporanPenjaga?.sebab)||'Sebab dilaporkan oleh penjaga'):'Belum ada sebab daripada penjaga'));}
        row.append(part);
        if(canReason && s.laporanPenjaga?.ada!==true){const button=node('button','skh-d42-notify','Hantar Notifikasi');button.type='button';button.disabled=true;button.title='Menunggu sambungan notifikasi Parent PWA dan padanan penjaga yang disahkan';row.append(button);}
        ui.absent.append(row);
      }
      ui.foot.textContent=canReason?'Sebab penjaga dipaparkan mengikut kebenaran backend. Butang notifikasi belum aktif sehingga integrasi Parent PWA disediakan.':'Guru biasa hanya melihat nama murid tidak hadir; sebab penjaga disembunyikan.';
    }catch(e){if(request!==seq)return;placeholder(e.message||'Gagal mendapatkan rekod.');}
  }
  ui.date.value=now();ui.date.max=now();ui.date.addEventListener('change',refresh);
  $('skh-d42-back').addEventListener('click',()=>{if(window.parent!==window){window.parent.postMessage({type:'SEMAKMUR_ATTENDANCE_BACK'},location.origin);}else if(history.length>1){history.back();}else{location.href='../DashboardGuru.html';}});
  // Sesi telah disahkan oleh boot() utama sebelum pembacaan status kelas.
  let tries=0;function awaitUser(){if(state.user){refresh();return;}if(++tries<35)setTimeout(awaitUser,200);else setNote('Sesi belum tersedia. Buka semula Dashboard Guru.',true);}
  document.addEventListener('DOMContentLoaded',awaitUser);
})();
