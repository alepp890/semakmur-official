/* SeMAKMUR Smart Tugasan Mingguan V3.0 · Fi-Sync integrated frontend.
   Strictly authenticated POST; never write directly to Sheets or Firestore. */
'use strict';

/* === TERGABUNG V5.3.4R: CETAK A4 (SATU JS MODUL) === */
/* SeMAKMUR V5.3.1 — Template A4 Laporan Mingguan. Tiada akses DB, hanya render data dibekalkan modul. */
(function (g) {
  'use strict';
  const CSS = String.raw`

:root { --pine:#183d3b; --pine2:#285854; --muted:#668078; --cream:#f6f8f6; --line:#dce5e2; --gold:#bb9564; --ink:#1c2b2b; --saffron:#f9f2e6; }
* { box-sizing:border-box; }
html { scroll-behavior:smooth; }
body { margin:0; background:#e8eeec; font-family:'Aptos','Segoe UI',Arial,sans-serif; color:var(--ink); font-size:13px; -webkit-font-smoothing:antialiased; }
.toolbar { position:sticky;top:0;z-index:90;display:flex; align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap; padding:13px max(22px,calc((100vw - 1200px)/2));background:#173935;color:#fff;border-bottom:3px solid var(--gold); box-shadow:0 5px 20px #132f2d24; }
.toolbar-left { display:flex; align-items:center;gap:11px; }
.brand-icon { width:35px;height:35px;border:1px solid #88aba6;border-radius:9px;display:grid;place-items:center;font-family:Georgia,serif;font-weight:700;font-size:16px;color:#f7e5c9; }
.toolbar strong { display:block;font-size:13px;letter-spacing:.2px; }
.toolbar small {display:block;font-size:11px;color:#b8d1cc;margin-top:2px}
.toolbar-right { display:flex;align-items:center;gap:8px;flex-wrap:wrap }
.toolbar button,.toolbar select { border:1px solid #86aaa2;border-radius:9px;background:#315e58;color:#fff;padding:9px 12px;font:600 12px 'Segoe UI',Arial,sans-serif;cursor:pointer;min-height:36px; }
.toolbar button:hover {background:#3c7169}
.toolbar select { max-width:190px; }
.toolbar .btn-print { background:#e6c59c;border-color:#e6c59c;color:#21322e; }
.toolbar .btn-print:hover{background:#f3d7b2}
.workspace { max-width:1130px; margin:28px auto 55px; display:grid; grid-template-columns:192px 1fr;gap:26px;align-items:start; }
.preview-nav { position:sticky;top:92px;background:#fff;border:1px solid #d9e4e0;border-radius:13px;padding:16px;box-shadow:0 3px 14px #1d393311; }
.preview-nav .overline { font-size:10px;letter-spacing:1.4px;font-weight:800;color:#648079; }
.preview-nav .hint {font-size:11px;color:#6c8580;line-height:1.55;margin:8px 0 12px}
.preview-nav a {display:flex;align-items:center;gap:9px;text-decoration:none;color:#36514c;border-radius:8px;padding:9px 7px;font-size:11px;line-height:1.2;}
.preview-nav a:hover,.preview-nav a:focus {background:#e8f1ee;color:#16463d;}
.preview-nav a span {width:20px;height:20px;flex:none;border:1px solid #d0dfda;border-radius:6px;display:grid;place-items:center;color:#617e77;font-size:10px;font-weight:800}
.preview-nav .note{margin-top:13px;padding-top:13px;border-top:1px solid #e5eeea;font-size:10.5px;line-height:1.55;color:#708480}
.pages {min-width:0;display:flex;flex-direction:column;gap:22px;align-items:center;}
.paper {position:relative;width:210mm;min-height:297mm;max-width:100%;background:#fff;padding:16mm 17mm 15.5mm;box-shadow:0 8px 27px #29413b20;border-radius:2px;display:flex;flex-direction:column; page-break-after:always; break-after:page;}
.paper::before{content:"";position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,var(--pine) 0%,var(--pine) 76%,var(--gold) 76%,var(--gold) 100%);}
.schoolhead {display:flex;align-items:center;justify-content:space-between;gap:15px;padding-bottom:13px;border-bottom:1px solid var(--line);}
.school-logo { width:60px;height:60px;border:1.5px dashed #abc6bb;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#708d84;font-size:8px;text-align:center;letter-spacing:.4px;line-height:1.4;background:#f8fbf9;flex:none; }
.school-logo img {width:100%;height:100%;object-fit:contain;border-radius:8px}
.school-name{flex:1;}
.school-name .gov {font-size:9px;letter-spacing:1.3px;text-transform:uppercase;color:#647d76;font-weight:750}
.school-name h2{font-size:17px;margin:3px 0 2px;color:var(--pine);letter-spacing:-.45px;font-weight:800;}
.school-name p {font-size:9.6px;color:#5b766e;margin:0;letter-spacing:.3px}
.doc-symbol{text-align:right;flex:none;}
.doc-symbol b{display:block;color:var(--pine);font-size:10px;letter-spacing:1.3px;}
.doc-symbol span{display:block;font-size:9px;color:#728981;margin-top:4px}
.eyebrow {color:var(--gold);letter-spacing:2px;font-weight:850;font-size:10px;text-transform:uppercase;}
.cover-lead {padding-top:43px;max-width:575px;}
.cover-lead h1 {font-weight:850;letter-spacing:-1.65px;line-height:1.12;font-size:33px;margin:14px 0 11px;color:var(--pine);}
.cover-lead p {color:#5f746e;font-size:12px;line-height:1.7;margin:0;max-width:485px}
.cover-rule {width:65px;height:3px;background:var(--gold);margin:24px 0 28px;}
.week-hero {display:grid;grid-template-columns:1fr 1.4fr;background:var(--pine);border-radius:12px;color:#fff;min-height:127px;overflow:hidden;}
.week-hero .left{padding:20px 23px;border-right:1px solid #4e726c;display:flex;flex-direction:column;justify-content:center;}
.week-hero .left .tiny{font-size:9px;text-transform:uppercase;color:#b5d2ca;letter-spacing:1.4px;font-weight:700}
.week-hero .left .number{font-size:56px;letter-spacing:-2px;line-height:1;font-weight:800;font-variant-numeric:tabular-nums;}
.week-hero .right{padding:25px 25px;display:flex;flex-direction:column;justify-content:center;}
.week-hero .right .label{font-size:9.5px;color:#b7d2cd;text-transform:uppercase;letter-spacing:1px}
.week-hero .right b{font-size:20px;line-height:1.4;margin:5px 0}
.week-hero .right small{font-size:11px;color:#d1e0dc}
.section-heading {display:flex;align-items:center;gap:10px;margin:24px 0 13px;}
.section-heading span{font-size:10px;color:var(--gold);font-weight:850;letter-spacing:.7px}
.section-heading h3{font-size:14px;letter-spacing:-.2px;margin:0;color:var(--pine)}
.section-heading::after{content:"";height:1px;background:var(--line);flex:1}
.overview-strip {display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
.day-tile{background:#f6f9f7;border:1px solid #e1ebe7;padding:11px 8px;border-radius:9px;min-height:85px;}
.day-tile .day{font-size:10.5px;font-weight:850;color:#244842;}
.day-tile .date{font-size:9px;color:#7c918a;margin:3px 0 9px;}
.day-tile .name{font-size:9px;color:#475c56;line-height:1.35;}
.badge {display:inline-block;font-size:9px;font-weight:800;letter-spacing:.25px;border-radius:20px;padding:5px 9px;white-space:nowrap;}
.badge.green{color:#2e694e;background:#e3f2e9;}
.badge.amber{color:#9b672b;background:#fcf1df;}
.badge.gray{color:#72827e;background:#edf2f0;}
.badge.blue{color:#3b6685;background:#e8f1f7;}
.cover-foot-box {background:#f9faf9;border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:9px;padding:16px 17px;margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:18px}
.mini-label{display:block;font-size:9px;color:#7d8e88;font-weight:800;text-transform:uppercase;letter-spacing:1.1px;margin-bottom:6px}
.cover-foot-box b{font-size:13px;color:var(--pine);line-height:1.5;}
.cover-foot-box p {font-size:10.5px;line-height:1.55;color:#5e746d;margin:0;}
.draft-note {margin-top:18px;color:#8a8474;display:flex;gap:10px;align-items:flex-start;font-size:10px;line-height:1.6;}
.draft-note strong {color:#a4773e}
.paper-foot {margin-top:auto;padding-top:10px;border-top:1px solid #dbe5e1;display:flex;justify-content:space-between;align-items:center;gap:18px;font-size:8.8px;color:#7e9089;}
.paper-foot b {font-size:8.5px;color:#638076;letter-spacing:.8px}
.paper-foot .page-number{font-variant-numeric:tabular-nums;font-weight:800;color:var(--pine)}
.daily-hero {margin-top:23px;background:linear-gradient(90deg,#f1f7f3,#fff);border:1px solid #dce9e2;border-left:4px solid var(--pine);border-radius:10px;padding:17px 19px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;}
.daily-hero .kicker{font-size:9px;color:#6e8c80;font-weight:800;text-transform:uppercase;letter-spacing:1.4px}
.daily-hero h1{font-size:24px;letter-spacing:-.8px;color:var(--pine);margin:4px 0 5px;}
.daily-hero .sub{font-size:10.2px;color:#567167;}
.daily-hero .date-card{text-align:right;min-width:92px;border-left:1px solid #d2e4da;padding-left:15px;}
.daily-hero .date-card strong{display:block;font-size:28px;line-height:1;color:var(--pine);font-weight:850;}
.daily-hero .date-card span{display:block;font-size:9.5px;color:#668076;margin-top:4px;}
.recorder {display:flex;gap:11px;align-items:center;padding:11px 1px;margin:1px 0 6px;border-bottom:1px solid var(--line);}
.recorder .avatar{width:31px;height:31px;background:#e4f0eb;border-radius:50%;display:grid;place-items:center;color:var(--pine);font-size:10px;font-weight:850;}
.recorder .by{flex:1;}
.recorder .by small{display:block;font-size:9px;color:#80958e;font-weight:700;text-transform:uppercase;letter-spacing:1px;}
.recorder .by b{font-size:11.4px;color:#293e37;}
.daily-section{margin-top:16px;}
.sec-title{display:flex;gap:9px;align-items:center;margin-bottom:10px;}
.sec-title .num{width:23px;height:23px;background:var(--pine);color:#fff;border-radius:6px;display:grid;place-items:center;font-size:10px;font-weight:800;flex:none}
.sec-title h3{font-size:12px;color:var(--pine);margin:0;letter-spacing:-.1px;}
.sec-title::after{height:1px;background:var(--line);content:"";flex:1}
.speech-card{padding:12px 13px;border:1px solid #e1e9e5;border-radius:9px;background:#fff;}
.speech-card .cardtop,.speech-mini .cardtop {display:flex;gap:7px;align-items:center;justify-content:space-between;}
.speech-card strong{font-size:11px;color:#354c44;}
.numbered{margin:9px 0 0;padding-left:17px;color:#485b54;font-size:10.5px;line-height:1.55;}
.numbered li {padding-left:2px;margin:3px 0;}
.speech-shortcuts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px;}
.speech-mini{border-radius:8px;border:1px solid #e4eae7;background:#f9fbfa;padding:10px 11px;min-height:44px;}
.speech-mini b{font-size:10px;color:#39524a;}
.speech-mini .speechnote{font-size:10px;line-height:1.55;color:#526d63;margin-top:5px;}
.metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.metric{border:1px solid #e0e9e5;padding:10px 11px;background:#fafcfb;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:5px;}
.metric .metric-label {font-size:10px;font-weight:750;color:#4f655d;}
.activity-card{border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:8px;padding:12px 14px;margin:8px 0 0;background:#fff;}
.activity-card .activity-title{font-size:11.4px;font-weight:800;color:var(--pine);margin:0;}
.activity-card .activity-sub{margin:4px 0 0;font-size:9.7px;color:#73867f;}
.activity-card p {font-size:10.5px;line-height:1.6;color:#42564e;margin:7px 0 0;}
.activity-card ul {margin:7px 0 0;padding-left:17px;font-size:10.5px;color:#4b6058;line-height:1.55;}
.activity-card ul li{margin:3px 0;}
.emptyline{padding:12px;border:1px dashed #cbdcd5;background:#fafcfb;border-radius:8px;font-size:10.2px;color:#82958d;}
.info-line{background:#f5f8f6;border-radius:8px;border:1px solid #e6ece8;padding:11px 13px;color:#5c746a;font-size:10.5px;line-height:1.5;}
.info-line b{color:var(--pine)}
.daily-note{font-size:9.2px;color:#778b83;line-height:1.55;margin-top:9px;}
.appendix-head{padding-top:35px;}
.appendix-head h1{color:var(--pine);font-size:24px;letter-spacing:-.8px;margin:10px 0 8px;}
.appendix-head p{color:#637a71;font-size:11px;line-height:1.65;margin:0;}
.appendix-content{margin-top:27px;}
.appendix-block{margin:0 0 19px;padding:13px 16px;background:#f9fbfa;border:1px solid #dbe7e2;border-radius:9px;}
.appendix-block h3{margin:0 0 10px;font-size:12px;color:var(--pine);}
.appendix-block p,.appendix-block li{font-size:10.5px;line-height:1.55;color:#53675f;}
.appendix-block ol{margin:0;padding-left:20px;}
.approval-head{margin-top:35px;}
.approval-head h1{color:var(--pine);font-size:26px;letter-spacing:-.9px;margin:12px 0 6px;}
.approval-head p{color:#6f817b;font-size:11px;line-height:1.6;margin:0;}
.quote {margin:27px 0 24px;padding:23px;border:1px solid #d8e5dd;border-left:4px solid var(--gold);border-radius:9px;background:#f8faf8;}
.quote .over{font-size:9px;font-weight:850;letter-spacing:1.2px;color:#8b784d;text-transform:uppercase;}
.quote p{font-size:15px;line-height:1.8;font-weight:650;color:#254a40;margin:12px 0;}
.quote .end{font-size:9px;color:#758b81;}
.approval-flow {display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.approval-card{border:1px solid #dce6e0;border-radius:11px;padding:17px 17px;min-height:180px;position:relative;}
.approval-card.confirmed{background:#f4faf6;border:1px solid #cce2d5;}
.approval-card .role{font-size:9px;color:#6e887c;text-transform:uppercase;letter-spacing:1px;font-weight:850;}
.approval-card h3{font-size:13px;color:var(--pine);margin:9px 0 6px;line-height:1.4;}
.approval-card p{color:#657c71;font-size:10px;line-height:1.65;margin:0;}
.approval-card .status{position:absolute;bottom:16px;left:17px;}
.approval-card .date{font-size:10px;margin-top:8px;font-weight:700;color:#426456;}
.approval-final{border:1px solid #cbded4;border-radius:10px;padding:17px 18px;margin-top:15px;background:#f5faf7;}
.approval-final .role {font-size:9px;font-weight:850;color:#6b8c7d;letter-spacing:1.1px;}
.approval-final b {display:block;font-size:15px;color:var(--pine);margin:9px 0 5px;}
.approval-final p{font-size:10.5px;line-height:1.6;color:#5a7468;margin:0;}
.approval-final .date{font-size:10px;color:#3a6952;margin-top:8px;}
.auditbox{margin-top:20px;background:#faf8f4;border:1px solid #e9e0cf;border-radius:9px;padding:12px 14px;font-size:9.5px;line-height:1.6;color:#7e715c;}
.auditbox b{color:#80663d}
@media(max-width:1110px){.workspace{grid-template-columns:1fr;margin:20px 12px}.preview-nav{display:none}.toolbar{padding:12px 15px}.paper{width:210mm;max-width:calc(100vw - 24px);padding:5.3vw;min-height:auto;aspect-ratio:210/297}.pages{overflow:hidden}}
@media(max-width:650px){.toolbar-right select{display:none}.toolbar-left small{display:none}.toolbar{gap:8px}.toolbar button{padding:8px;font-size:11px}.workspace{width:100%;overflow-x:auto;margin:0}.pages{align-items:flex-start;overflow:visible;padding:14px}.paper{width:210mm;max-width:none;flex:none;min-height:297mm;padding:16mm 17mm 15.5mm}}

/* STANDARD TIPOGRAFI CETAKAN SeMAKMUR — semakan 21 Nov 2026.
   Isi laporan: 11pt seperti Microsoft Word. Label/caption: 12px.
   Saiz kecil 10.5pt hanya untuk catatan sokongan yang bukan caption. */
.paper { font-size:11pt; line-height:1.48; }
.paper .school-name .gov,.paper .school-name p,.paper .doc-symbol b,.paper .doc-symbol span,
.paper .eyebrow,.paper .section-heading span,.paper .mini-label,
.paper .week-hero .tiny,.paper .week-hero .right .label,.paper .week-hero .right small,
.paper .day-tile .date,.paper .daily-hero .kicker,.paper .daily-hero .date-card span,
.paper .recorder .by small,.paper .speech-mini b,
.paper .activity-sub,.paper .quote .over,.paper .quote .end,
.paper .approval-card .role,.paper .approval-final .role,
.paper .paper-foot,.paper .paper-foot b,.paper .metric-label,
.paper .badge,.paper .draft-note {font-size:12px;}
.paper .school-name h2 {font-size:19px;}
.paper .school-logo {font-size:10px;}
.paper .cover-lead p,.paper .cover-foot-box p,.paper .day-tile .name,
.paper .day-tile .day,.paper .recorder .by b,.paper .daily-hero .sub,
.paper .speech-card strong,.paper .numbered,.paper .numbered li,
.paper .speech-mini .speechnote,.paper .activity-card p,.paper .activity-card ul,
.paper .activity-card .activity-title,
.paper .info-line,.paper .emptyline,.paper .appendix-head p,
.paper .appendix-block p,.paper .appendix-block li,
.paper .approval-head p,.paper .approval-card p,.paper .approval-final p,
.paper .cover-foot-box b,.paper .week-hero .right b,
.paper .quote p {font-size:11pt;line-height:1.48;}
.paper .activity-card .activity-title {font-weight:800;}
.paper .speech-mini b {font-size:12px;}
.paper .speech-card strong {font-weight:800;}
.paper .daily-note,.paper .auditbox,.paper .approval-final .date,.paper .approval-card .date {font-size:10.5pt;line-height:1.48;}
.paper .section-heading h3,.paper .sec-title h3,.paper .appendix-block h3 {font-size:15px;}
.paper .approval-card h3 {font-size:16px;}
.paper .daily-hero h1 {font-size:25px;}
.paper .badge{padding:4px 8px;letter-spacing:0;}
/* Spasi diperhalus untuk melindungi ruang A4 selepas isi dibesarkan. */
.paper .daily-hero{margin-top:17px;padding:13px 16px;}
.paper .recorder{padding:9px 1px;margin:0 0 4px;}
.paper .daily-section{margin-top:6px;}
.paper .sec-title{margin-bottom:7px;}
.paper .speech-card{padding:10px 12px;}
.paper .numbered{margin:6px 0 0;padding-left:19px;}
.paper .numbered li{margin:2px 0;}
.paper .speech-shortcuts{margin-top:7px;}
.paper .speech-mini{padding:8px 10px;}
.paper .metric-grid{gap:6px;}
.paper .metric{padding:7px 9px;}
.paper .activity-card{padding:10px 12px;margin-top:6px;}
.paper .activity-card p{margin:4px 0 0;}
.paper .activity-card .numbered{margin-top:6px;}
.paper .info-line{padding:8px 11px;}
.paper .appendix-head{padding-top:25px;}
.paper .appendix-content{margin-top:12px;}
.paper .appendix-block{margin-bottom:7px;padding:9px 12px;}
.paper .appendix-block h3{margin-bottom:7px;}
.paper .appendix-block li{margin:2px 0;}
.paper .approval-head{margin-top:24px;}
.paper .quote{margin:18px 0 16px;padding:18px;}
.paper .approval-card{min-height:167px;padding:14px;}
.paper .approval-card .status{bottom:12px;left:14px;}
.paper .approval-final{margin-top:10px;padding:13px 15px;}
.paper .auditbox{margin-top:12px;}
.paper .daily-note{margin-top:5px;}
.paper .paper-foot{line-height:1.3;}

@page {size:A4; margin:0;}
@media print {
  html,body{background:#fff!important;margin:0!important;padding:0!important;}
  .toolbar,.preview-nav{display:none!important;}
  .workspace{display:block!important;max-width:none!important;margin:0!important;padding:0!important;}
  .pages{gap:0!important;display:block!important;overflow:visible!important;}
  .paper{width:210mm!important;height:297mm!important;min-height:297mm!important;max-width:none!important;transform:none!important;margin:0!important;padding:16mm 17mm 15.5mm!important;box-shadow:none!important;border-radius:0!important;break-after:page!important;page-break-after:always!important;overflow:hidden!important;}
  .paper:last-child{page-break-after:auto!important;break-after:auto!important;}
  .paper,.paper *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  a{color:inherit;text-decoration:none;}
}

/* V5.2.9 — pemegang tempat logo slogan sahaja; reka bentuk dan tipografi asal tidak diubah. */
.school-slogan{margin-top:auto;min-height:29px;max-height:34px;display:flex;align-items:center;justify-content:center;padding-top:3px;flex-shrink:0;}
.school-slogan img{max-width:220px;max-height:28px;object-fit:contain;}
.school-slogan .slogan-fallback {border:1px dashed #abc6bb;border-radius:6px;padding:4px 9px;font-size:10px;letter-spacing:.3px;color:#708d84;}
.school-slogan + .paper-foot {margin-top:4px;}
.school-logo.has-src .logo-fallback,.school-slogan.has-src .slogan-fallback {display:none;}
.school-logo.missing .logo-fallback,.school-slogan.missing .slogan-fallback {display:block;}
/* Bar kawalan pratonton sahaja — disembunyikan ketika cetak. */
.printbar{position:sticky;top:0;z-index:100;background:#173935;color:#fff;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px;font-family:Arial,sans-serif;}
.printbar button{font-size:14px;border:0;border-radius:8px;padding:9px 15px;background:#e6c59c;color:#223b36;cursor:pointer;font-weight:700;}
.printbar .print-note{font-size:12px;color:#c9d9d5;}
.pages{max-width:210mm;margin:22px auto 45px;}
.paper .info-line.no-record{background:#f8faf9;color:#607970;}
.paper .activity-card p,.paper .approval-final p,.paper .approval-card p{white-space:pre-line;}
@media print{
 .printbar{display:none!important;}
 .pages{margin:0!important;max-width:none!important;}
 /* Tiada pemotongan isi panjang; Chromium boleh sambung ke helaian berikutnya. */
 .paper{height:auto!important;min-height:297mm!important;overflow:visible!important;}
 .paper:last-child{break-after:auto!important;page-break-after:auto!important;}
 .daily-section,.activity-card,.metric{break-inside:avoid-page;}
}

/* V5.3.0 — 6 seksyen sedia ada dikekalkan; caption seragam dan isi 10pt. */
.paper .speech-stack{display:flex;flex-direction:column;gap:7px;}
.paper .speech-card{padding:8px 11px;}
.paper .speech-card .cardtop,.paper .program-card .cardtop{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.paper .speech-card .cardtop strong,.paper .program-card .cardtop strong,
.paper .metric .metric-label,.paper .activity-card .activity-title{font-family:'Aptos','Segoe UI',Arial,sans-serif;font-size:10.5pt;font-weight:700;line-height:1.3;}
.paper .speech-card .numbered,.paper .speech-card .numbered li,
.paper .speech-card .narrative,.paper .speech-card .narrative p,
.paper .activity-card .narrative,.paper .activity-card .narrative p,
.paper .activity-card .numbered,.paper .activity-card .numbered li,
.paper .activity-card p:not(.activity-title),.paper .info-line,
.paper .metric .badge,.paper .program-card .numbered,
.paper .program-card .numbered li{font-size:10pt;font-weight:400;line-height:1.45;}
.paper .speech-card .badge,.paper .program-card .badge{flex:none;margin-left:auto;}
.paper .program-card .cardtop{width:100%;}
.paper .activity-card .activity-number{font-variant-numeric:tabular-nums;margin-right:4px;}
.paper .daily-section{break-inside:avoid-page;page-break-inside:avoid;flex-shrink:0;}
.paper .daily-section .sec-title{break-after:avoid-page;page-break-after:avoid;}
/* Footer satu baris: jenama sekolah | logo slogan | minggu. */
.paper .paper-foot{display:grid;grid-template-columns:1fr minmax(90px,220px) 1fr;gap:12px;align-items:center;margin-top:auto;padding:7px 0 0;min-height:34px;}
.paper .paper-foot>b{font-size:10pt;letter-spacing:.1px;text-transform:none;justify-self:start;white-space:nowrap;}
.paper .paper-foot>.page-number{font-size:10pt;justify-self:end;white-space:nowrap;text-transform:none;}
.paper .paper-foot .school-slogan{margin:0;min-height:20px;max-height:30px;padding:0;justify-self:center;width:100%;}
.paper .paper-foot .school-slogan img{max-height:27px;max-width:195px;}
.paper .paper-foot .school-slogan .slogan-fallback{font-size:8px;padding:2px 6px;text-align:center;}
.paper.tm530-daily{height:297mm;min-height:297mm;max-height:297mm;overflow:hidden;}
.paper.tm530-daily .daily-section{flex-shrink:0;}
.paper .daily-hero.tm530-continued{margin-top:14px;padding:9px 14px;}
.paper .daily-hero.tm530-continued h1{font-size:19px;}
@media print{
 .paper.tm530-daily{height:297mm!important;min-height:297mm!important;max-height:297mm!important;overflow:hidden!important;}
 .paper .daily-section{break-inside:avoid-page!important;page-break-inside:avoid!important;}
 .paper .speech-stack,.paper .activity-card{break-inside:avoid-page;}
}

/* Ruang halaman pengesahan diselaraskan supaya footer tidak melewati kertas A4. */
.paper#pengesahan .approval-head{margin-top:12px;}
.paper#pengesahan .quote{margin:10px 0 9px;padding:12px 16px;}
.paper#pengesahan .section-heading{margin:12px 0 8px;}
.paper#pengesahan .approval-card{min-height:130px;padding:12px 14px;}
.paper#pengesahan .approval-final{margin-top:7px;padding:10px 13px;}
.paper#pengesahan .auditbox{margin-top:8px;padding:8px 10px;}
.paper.tm530-daily.tm530-oversize{height:auto!important;max-height:none!important;overflow:visible!important;}
@media print{.paper.tm530-daily.tm530-oversize{height:auto!important;max-height:none!important;overflow:visible!important;}}

/* V5.3.1 — Ruang pernafasan cetakan. Biar bersambung ke halaman baharu, bukan mampatkan teks. */
.paper.tm530-daily .daily-section{margin-top:20px!important;flex-shrink:0!important;break-inside:avoid-page;page-break-inside:avoid;}
.paper.tm530-daily .daily-section + .daily-section{margin-top:22px!important;}
.paper.tm530-daily .daily-section .sec-title{margin-bottom:13px!important;break-after:avoid-page;page-break-after:avoid;}
.paper.tm530-daily .speech-stack{gap:11px!important;}
.paper.tm530-daily .speech-card{padding:11px 13px!important;}
.paper.tm530-daily .speech-card .numbered{margin-top:10px!important;}
.paper.tm530-daily .speech-card .narrative{margin-top:9px;}
.paper.tm530-daily .metric-grid{gap:9px!important;}
.paper.tm530-daily .metric{padding:10px 12px!important;}
.paper.tm530-daily .activity-card{padding:12px 14px!important;margin-top:10px!important;}
.paper.tm530-daily .info-line{padding:11px 13px!important;}
.paper.tm530-daily .recorder{margin-bottom:5px!important;}
/* Hari baharu sentiasa halaman baharu; sambungan bagi hari sama di halaman susulan. */
.paper.tm530-daily{break-before:page;page-break-before:always;}
.paper.tm530-daily .daily-section .sec-title{break-inside:avoid-page;}
@media print{
 .paper.tm530-daily{break-before:page!important;page-break-before:always!important;}
 .paper.tm530-daily .daily-section{break-inside:avoid-page!important;page-break-inside:avoid!important;}
}

`;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isID=v=>/^(SKSM\d+|[A-Fa-f0-9-]{20,})$/.test(String(v||'').trim());
  const humanName=v=>!v||isID(v)?'Nama tidak tersedia':String(v);
  const text=v=>String(v??'').trim();
  const nonempty=v=>text(v)||'—';
  function formatDate(v) {
    const raw=text(v);
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){const [y,m,d]=raw.split('-');return `${d}/${m}/${y}`;}
    if(/^\d{4}-\d{2}-\d{2}T/.test(raw)){const d=new Date(raw);if(!isNaN(d))return new Intl.DateTimeFormat('ms-MY',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'2-digit',year:'numeric'}).format(d);}
    return raw||'—';
  }
  function label(v) {const s=text(v).toUpperCase().replace(/_/g,' ');return ({ADA:'Ada',TIADA:'Tiada',BERSIH:'Bersih',SANGAT_BERSIH:'Sangat Bersih',MEMUASKAN:'Memuaskan',TERKAWAL:'Terkawal',PERLU_PERHATIAN:'Perlu Perhatian',BATAL:'Batal',BERJALAN:'Berjalan',LENGKAP:'Lengkap'})[s.replaceAll(' ','_')]||text(v)||'Tiada rekod';}
  function badge(v){const name=label(v),s=name.toUpperCase();const cls=/TERKAWAL|BERSIH|ADA|LENGKAP|BERJALAN/.test(s)?'green':/MEMUASKAN/.test(s)?'blue':/PERHATIAN|BATAL/.test(s)?'amber':'gray';return `<span class="badge ${cls}">${esc(name)}</span>`;}
  function lines(v){return text(v).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);}
  function narrative(v){const ls=lines(v);if(!ls.length)return '';
    const numbered=ls.every(x=>/^\d+[.)]\s*/.test(x));
    if(numbered)return `<ol class="numbered">${ls.map(x=>`<li>${esc(x.replace(/^\d+[.)]\s*/,''))}</li>`).join('')}</ol>`;
    return `<div class="narrative">${ls.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`;
  }
  const section=(n,title,body)=>`<section class="daily-section"><div class="sec-title"><span class="num">${n}</span><h3>${esc(title)}</h3></div>${body}</section>`;
  function assets() {
    const config=g.SeMAKMUR_TM_PRINT_ASSETS||{};
    const resolve=(which,name)=>{
      if(config[which])return String(config[which]);
      try{return new URL('../../assets/'+name,document.baseURI).href;}catch(_){return '';}
    };
    return {logo:resolve('logoSekolah','logo-sekolah.png'),slogan:resolve('logoSlogan','logo-slogan.png')};
  }
  function logoHtml(src){return `<div class="school-logo ${src?'has-src':''}">${src?`<img src="${esc(src)}" alt="Logo rasmi SK Segambut Makmur" onerror="this.parentNode.classList.add('missing');this.style.display='none'">`:''}<span class="logo-fallback">RUANG<br><b>LOGO</b><br>SEKOLAH</span></div>`;}
  function sloganHtml(src){return `<div class="school-slogan ${src?'has-src':''}">${src?`<img src="${esc(src)}" alt="Logo slogan rasmi sekolah" onerror="this.parentNode.classList.add('missing');this.style.display='none'">`:''}<span class="slogan-fallback">RUANG LOGO SLOGAN RASMI SEKOLAH</span></div>`;}
  function head(r,urls){return `<header class="schoolhead">${logoHtml(urls.logo)}<div class="school-name"><div class="gov">Kementerian Pendidikan Malaysia</div><h2>SK SEGAMBUT MAKMUR</h2><p>SeMAKMUR DIGITAL · SMART TUGASAN MINGGUAN</p></div><div class="doc-symbol"><b>${r.simulation?'SIMULASI UJIAN':'LAPORAN RASMI'}</b><span>TAHUN ${esc(r.year||'')}</span></div></header>`;}
  function footer(r,urls){return `<footer class="paper-foot"><b>SeMAKMUR I-System</b>${sloganHtml(urls.slogan)}<span class="page-number">Minggu ${esc(r.week||'—')}</span></footer>`;}
  function paper(r,urls,id,body){return `<section class="paper ${id.startsWith('hari-')?'tm530-daily':''}" id="${esc(id)}">${head(r,urls)}${body}${footer(r,urls)}</section>`;}
  function cover(r){const days=(r.days||[]).map(d=>`<div class="day-tile"><div class="day">${esc(d.day)}</div><div class="date">${esc(formatDate(d.date))}</div><div class="name">${d.holiday?'Cuti / Tiada Laporan':esc(humanName(d.reporter))}</div></div>`).join('');return `
    <div class="cover-lead"><div class="eyebrow">Laporan Pengurusan · Guru Bertugas</div><h1>Laporan Rumusan<br>Guru Bertugas<br>Mingguan</h1><p>Dokumentasi pemerhatian harian, pengurusan murid dan aktiviti sekolah bagi minggu persekolahan yang telah direkodkan.</p></div>
    <div class="cover-rule"></div><div class="week-hero"><div class="left"><span class="tiny">Minggu Persekolahan</span><div class="number">${esc(r.week||'—')}</div></div><div class="right"><div class="label">Tempoh Laporan</div><b>${esc(formatDate(r.from))} – ${esc(formatDate(r.to))}</b><small>Kumpulan Bertugas ${esc(r.group||'—')} · Tahun ${esc(r.year||'')}</small></div></div>
    <div class="section-heading"><span>01</span><h3>Rekod Harian</h3></div><div class="overview-strip">${days}</div>
    <div class="section-heading"><span>02</span><h3>Maklumat Dokumen</h3></div><div class="cover-foot-box"><div><span class="mini-label">Ketua Kumpulan</span><b>${esc(humanName(r.leader))}</b><p>Kumpulan Bertugas ${esc(r.group||'')}</p></div><div><span class="mini-label">GPK Penyelia</span><b>${esc(humanName(r.gpk))}</b><p>Semakan laporan mingguan.</p></div></div>
    ${r.simulation?'<div class="draft-note"><strong>UJIAN</strong><span>Data simulasi. Bukan rekod rasmi sekolah.</span></div>':''}`;}
  function pair(p){if(typeof p==='object'&&p!==null)return {status:text(p.status),note:text(p.text)};return {status:text(p),note:''};}
  function speech(p,title){const x=pair(p),status=x.status||'TIADA';return `<article class="speech-card"><div class="cardtop"><strong>${esc(title)}</strong>${badge(status)}</div>${status==='ADA'&&x.note?narrative(x.note):''}</article>`;}
  function metric(items){return `<div class="metric-grid">${items.map(([n,v])=>`<div class="metric"><span class="metric-label">${esc(n)}</span>${badge(pair(v).status||'Tiada rekod')}</div>`).join('')}</div>`;}
  function daily(r,d,i){const v=d.data||{},speeches=[
    ['Ucapan Guru Besar / Pentadbir',v.speech_gb],['Ucapan Guru Bertugas',v.speech_duty],['Ucapan Guru Disiplin',v.speech_discipline]];
    const speechBody=`<div class="speech-stack">${speeches.map(([name,val])=>speech(val,name)).join('')}</div>`;
    const hygiene=metric([['Tandas Murid',v.clean_student],['Tandas Guru',v.clean_teacher],['Dewan Sri Makmur',v.clean_hall],['Persekitaran Sekolah',v.clean_ground]]);
    const disiplin=metric([['Waktu Perhimpunan',v.discipline_assembly],['Waktu Rehat',v.discipline_break],['Waktu Pulang',v.discipline_exit]]);
    const ps=text(v.makmur_status||v.program||'TIADA');const desc=ps==='BATAL'?text(v.makmur_cancel_reason||v.program_reason):text(v.makmur_note||v.program_note);
    const program= `<div class="activity-card program-card"><div class="cardtop"><strong>Pelaksanaan Program Makmur</strong>${badge(ps)}</div>${desc?narrative(desc):''}${v.makmur_teacher?`<p><b>Guru Pengendali:</b> ${esc(humanName(v.makmur_teacher_name||v.makmur_teacher))}</p>`:''}</div>`;
    const visitors=Array.isArray(v.visitors)?v.visitors:(Array.isArray(v.visitors_list)?v.visitors_list:[]);
    const visitorBody=visitors.filter(Boolean).length?`<ol class="numbered">${visitors.filter(Boolean).map(n=>`<li>${esc(n)}</li>`).join('')}</ol>`:'<div class="info-line no-record">Tiada kehadiran pelawat direkodkan.</div>';
    const acts=Array.isArray(v.activities)?v.activities:(Array.isArray(v.activities_list)?v.activities_list:[]);
    const activityBody=acts.length?acts.map((a,i)=>`<article class="activity-card"><p class="activity-title"><span class="activity-number">${i+1}.</span> ${esc(a.title||'Aktiviti')}</p>${narrative(a.desc||a.description||'')}</article>`).join(''):'<div class="info-line no-record">Tiada aktiviti tambahan direkodkan.</div>';
    if(d.holiday)return `<div class="daily-hero"><div><div class="kicker">Laporan Harian · ${i+1} / ${r.days.length}</div><h1>${esc(d.day)}</h1><div class="sub">${esc(formatDate(d.date))}</div></div></div><div class="info-line no-record" style="margin-top:25px"><b>Tiada laporan diperlukan</b> — ${esc(d.holidayTitle||'Cuti Persekolahan')}</div>`;
    return `<div class="daily-hero"><div><div class="kicker">Laporan Harian · ${i+1} / ${r.days.length}</div><h1>${esc(d.day)}</h1><div class="sub">${esc(formatDate(d.date))}</div></div><div class="date-card"><strong>${esc(String(d.date||'').slice(-2))}</strong><span>${esc(r.year||'')}</span></div></div>
      <div class="recorder"><div class="avatar">${esc(humanName(d.reporter).slice(0,2))}</div><div class="by"><small>Direkodkan oleh</small><b>${esc(humanName(d.reporter))}</b></div>${badge('Lengkap')}</div>
      ${section('01','Ucapan dan Makluman',speechBody)}
      ${section('02','Pemantauan Kebersihan',hygiene)}
      ${section('03','Pemantauan Disiplin',disiplin)}
      ${section('04','Program Makmur',program)}
      ${section('05','Kehadiran Pelawat',visitorBody)}
      ${section('06','Aktiviti dan Program',activityBody)}`;
  }
  function approval(r){return `<div class="approval-head"><div class="eyebrow">Penutupan Laporan</div><h1>Rumusan & Pengesahan</h1><p>Laporan mingguan telah melalui aliran semakan mengikut pelantikan dan peranan pentadbir.</p></div>
    <div class="quote"><span class="over">Ulasan Ketua Kumpulan</span><p>${esc(nonempty(r.summary))}</p><div class="end">${esc(humanName(r.leader))}</div></div>
    <div class="section-heading"><span>01</span><h3>Tindakan Susulan</h3></div><div class="activity-card"><p>${esc(nonempty(r.followup))}</p></div>
    <div class="section-heading"><span>02</span><h3>Semakan GPK Penyelia</h3></div><div class="approval-card confirmed"><div class="role">GPK Penyelia</div><h3>${esc(humanName(r.gpk))}</h3><p>${esc(nonempty(r.gpkNote))}</p></div>
    <div class="section-heading"><span>03</span><h3>Pengesahan Guru Besar</h3></div><div class="approval-final"><div class="role">Pengesahan Digital</div><b>${esc(humanName(r.verifiedName))}</b><p>Guru Besar · SK Segambut Makmur<br>${esc(nonempty(r.gbNote))}</p><div class="date">Tarikh Pengesahan: ${esc(formatDate(r.verifiedAt))}</div></div>
    <div class="auditbox"><b>Makluman:</b> Dokumen ini dijana daripada rekod laporan mingguan yang telah disahkan dalam SeMAKMUR Digital. Pengesahan digital direkodkan oleh sistem; tandatangan fizikal tidak diperlukan tertakluk kepada ketetapan sekolah.</div>`;}
  function generate(r) {
    if(!r||typeof r!=='object'||!Array.isArray(r.days))throw new Error('Data laporan tidak lengkap.');
    if(!r.simulation&&r.status!=='DISAHKAN')throw new Error('Laporan belum disahkan Guru Besar; cetakan rasmi tidak dibenarkan.');
    const urls=assets(),items=[paper(r,urls,'kulit',cover(r)),...r.days.map((d,i)=>paper(r,urls,'hari-'+i,daily(r,d,i))),paper(r,urls,'pengesahan',approval(r))];
    const paginateScript=String.raw`<script>
(function(){
 'use strict';
 function paginate(){
  const pages=document.querySelector('.pages');if(!pages)return;
  const originalDays=[...pages.querySelectorAll('.paper.tm530-daily:not(.tm530-continued-page)')];
  for(const origin of originalDays){
   let current=origin,count=0;
   const originalSections=[...origin.querySelectorAll(':scope > .daily-section')];
   const footerOf=p=>p.querySelector(':scope > .paper-foot');
   function fits(section,page){
    const r=page.getBoundingClientRect();
    const f=footerOf(page).getBoundingClientRect();
    const pad=parseFloat(getComputedStyle(page).paddingBottom)||0;
    return section.getBoundingClientRect().bottom <= r.bottom-pad-f.height-12;
   }
   function newPage(){
    count+=1;
    const next=document.createElement('section');
    next.className='paper tm530-daily tm530-continued-page';
    next.id=origin.id+'-sambungan-'+count;
    const header=origin.querySelector(':scope > .schoolhead').cloneNode(true);
    const banner=origin.querySelector(':scope > .daily-hero').cloneNode(true);
    banner.classList.add('tm530-continued');
    const kicker=banner.querySelector('.kicker');
    if(kicker)kicker.textContent='Laporan Harian · Sambungan';
    next.append(header,banner,footerOf(origin).cloneNode(true));
    current.after(next);current=next;
    return next;
   }
   function place(el){current.insertBefore(el,footerOf(current));}
   function emptySection(section){
    const el=document.createElement('section');el.className='daily-section';
    const title=section.querySelector(':scope > .sec-title');
    if(title)el.append(title.cloneNode(true));
    return el;
   }
   // When a single section is longer than an A4 page, distribute its
   // individual cards / list items across continuation sheets, repeating
   // the section heading. This avoids cutting off the end of the report.
   function atomize(section){
    const content=[...section.children].filter(n=>!n.classList.contains('sec-title'));
    if(content.length>1)return {kind:'direct',atoms:content};
    const wrap=content[0];if(!wrap)return null;
    if(wrap.classList.contains('speech-stack'))return {kind:'speech-stack',atoms:[...wrap.children]};
    if(wrap.classList.contains('metric-grid')){
      const children=[...wrap.children],pairs=[];
      for(let i=0;i<children.length;i+=2)pairs.push(children.slice(i,i+2));
      return {kind:'metric-grid',atoms:pairs};
    }
    if(wrap.tagName==='OL')return {kind:'OL',atoms:[...wrap.children]};
    if(wrap.classList.contains('narrative'))return {kind:'narrative',atoms:[...wrap.children]};
    // A single long activity/speech card can be divided at its paragraphs.
    if(wrap.classList.contains('activity-card')||wrap.classList.contains('speech-card')){
      const number=wrap.querySelector(':scope > .numbered');
      const description=wrap.querySelector(':scope > .narrative');
      if(number&&number.children.length>1)return {kind:'card-list',card:wrap,atoms:[...number.children]};
      if(description&&description.children.length>1)return {kind:'card-paras',card:wrap,atoms:[...description.children]};
    }
    return null;
   }
   function buildWrapper(spec,section){
    const el=emptySection(section),kind=spec.kind;
    if(kind==='speech-stack'||kind==='metric-grid'||kind==='narrative'){
      const wrap=document.createElement('div');wrap.className=kind;el.append(wrap);
    }else if(kind==='OL'){
      el.append(document.createElement('ol')).lastChild.className='numbered';
    }else if(kind==='card-list'||kind==='card-paras'){
      const card=spec.card.cloneNode(true);
      const child=card.querySelector(':scope > .'+(kind==='card-list'?'numbered':'narrative'));
      if(child)child.replaceChildren();
      el.append(card);
    }
    return el;
   }
   function appendAtom(el,atom,spec){
    if(spec.kind==='direct')el.append(atom);
    else if(spec.kind==='speech-stack'||spec.kind==='narrative'||spec.kind==='OL')el.lastElementChild.append(atom);
    else if(spec.kind==='metric-grid')atom.forEach(node=>el.lastElementChild.append(node));
    else if(spec.kind==='card-list'||spec.kind==='card-paras'){
      const selector=spec.kind==='card-list'?'.numbered':'.narrative';
      el.lastElementChild.querySelector(selector).append(atom);
    }
   }
   function splitLong(section){
    const spec=atomize(section);
    if(!spec||spec.atoms.length<2){
      // Even one giant text item cannot be kept on a physical sheet.
      // Allow native continuation rather than crop text.
      current.classList.add('tm530-oversize');
      current.style.overflow='visible';
      return;
    }
    const parent=current;
    section.remove();
    let frag=null;
    for(const atom of spec.atoms){
      if(!frag){frag=buildWrapper(spec,section);place(frag);}
      appendAtom(frag,atom,spec);
      if(fits(frag,current))continue;
      // If this chunk is too tall, put it on a new A4 continuation page.
      if(spec.kind==='metric-grid')atom.forEach(a=>a.remove());
      else atom.remove();
      const hadPrevious=spec.kind==='metric-grid'?frag.lastElementChild.children.length>0:
         (spec.kind==='direct'?frag.children.length>1:
           spec.kind==='card-list'||spec.kind==='card-paras'?frag.lastElementChild.querySelector(spec.kind==='card-list'?'.numbered':'.narrative').children.length>0:
             frag.lastElementChild.children.length>0);
      if(!hadPrevious){frag.remove();frag=null;}
      newPage();frag=buildWrapper(spec,section);place(frag);appendAtom(frag,atom,spec);
      if(!fits(frag,current)){
       current.classList.add('tm530-oversize');
       current.style.overflow='visible';
      }
    }
   }
   for(const section of originalSections){
    if(current!==origin)place(section); // preserve original section order on first sheet
    if(fits(section,current))continue;
    // Move entire section to following sheet, never leave a lone header.
    newPage();place(section);
    if(!fits(section,current))splitLong(section);
   }
  }
 }
 function start(){
  const ready=(document.fonts&&document.fonts.ready)?document.fonts.ready:Promise.resolve();
  ready.then(()=>Promise.all([...document.querySelectorAll('.paper img')].map(img=>img.complete?Promise.resolve():new Promise(done=>{img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});setTimeout(done,1500);}))))
   .then(()=>requestAnimationFrame(()=>requestAnimationFrame(paginate)));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;
    const documentTitle=`Laporan Minggu ${r.week} - Kumpulan ${r.group}`;
    return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(documentTitle)}</title><style>${CSS}</style></head><body><div class="printbar"><div><strong>${esc(documentTitle)}</strong><div class="print-note">A4 · Isi laporan 11pt · ${r.simulation?'Simulasi ujian':'Disahkan Guru Besar'}</div></div><button type="button" onclick="window.print()">Cetak / Simpan PDF</button></div><main class="pages">${items.join('')}</main>${paginateScript}</body></html>`;
  }
  function open(r){const html=generate(r),win=g.open('','_blank');if(!win)throw new Error('Tetingkap cetakan disekat. Benarkan pop-up untuk portal.');win.opener=null;win.document.open();win.document.write(html);win.document.close();return win;}
  function download(r){const html=generate(r),safe=String(r.week||'').replace(/[^a-zA-Z0-9_-]/g,'_'),url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`Laporan_Minggu_${safe}_Kumpulan_${String(r.group||'').replace(/[^0-9A-Za-z_-]/g,'_')}.html`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  g.SeMAKMUR_TM528_PRINT=Object.freeze({generate,open,download});
})(window);


/* === SKRIP TERAS MODUL TUGASAN MINGGUAN === */

const tm$=id=>document.getElementById(id);
const tmEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tmFmt=d=>{if(!/^\d{4}-\d\d-\d\d$/.test(String(d||'')))return String(d||'—');const [y,m,dd]=d.split('-');return `${dd}/${m}/${y}`;};
const tmToday=()=>{const v=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const parts=Object.fromEntries(v.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${parts.year}-${parts.month}-${parts.day}`;};
const tmState={overviewMeta:{},auth:null,user:null,data:null,detail:null,calendar:null,year:'2026',weekId:'',tab:'overview',busy:false,audit:null};
const tm51={db:null,fns:null,overviewStop:null,weekStops:[],schedule:null,audit:null,overview:null,year:'',weekKey:'',tab:'schedule',initStarted:false};
/* V5.1B: satu paparan dimuat sekali sahaja; tiada cache kekal untuk laporan peribadi. */
const tm51b={detailCache:new Map(),detailPending:new Map(),maxAge:120000,authUid:null};
function tm51bReset(){tm51b.detailCache.clear();tm51b.detailPending.clear();}
async function tm51bFallbackDetail(){
  const year=tmState.year,week=tmState.weekId,key=year+'|'+week;
  if(!week||tmState.tab!=='tasks'||tm51.schedule?.published)return;
  const record=tm51b.detailCache.get(key);
  if(record&&Date.now()-record.at<15*60*1000){
    if(record.data&&tmState.year===year&&tmState.weekId===week){
      tmState.detail=record.data;tmRenderAssignments();}
    return;
  }
  if(tm51b.detailPending.has(key))return tm51b.detailPending.get(key);
  const job=tmAPI('detail',{year,weekId:week}).then(data=>{
    tm51b.detailCache.set(key,{data,at:Date.now()});
    if(tmState.year===year&&tmState.weekId===week&&!tm51.schedule?.published){
      tmState.detail=data;tmRenderAssignments();}
  }).catch(e=>console.warn('[TM51B fallback]',e?.message||String(e)))
    .finally(()=>tm51b.detailPending.delete(key));
  tm51b.detailPending.set(key,job);return job;
}

const tmManager=()=>tmState.data?.actor?.isAdmin===true;
const tmMe=()=>tmState.data?.actor?.id||'';
const tmSelected=()=>tmState.data?.weeks?.find(w=>w.ID_Minggu===tmState.weekId);
const tmNames=()=>Object.fromEntries((tmState.detail?.members||[]).map(x=>[x.id,x.name]));
function tmNotice(text='',bad=false){const el=tm$('tm-notice');el.hidden=!text;el.textContent=String(text);el.classList.toggle('tm-error',!!bad);}
/* V5.0.2: lapisan loading berkongsi gaya e-Kehadiran/e-Relief.
   Hanya paparan; tidak menukar API, akses, tugasan atau data. */
const tmProcessKeys=new Set(['startup']);
function tmProcess(key,on,title='',message=''){
  if(on)tmProcessKeys.add(key);else tmProcessKeys.delete(key);
  const overlay=tm$('tm-process-overlay');if(!overlay)return;
  if(on){if(title)tm$('tm-process-title').textContent=title;if(message)tm$('tm-process-message').textContent=message;}
  overlay.hidden=tmProcessKeys.size===0;
  overlay.setAttribute('aria-busy',String(tmProcessKeys.size>0));
}
function tmBusy(flag){tmState.busy=!!flag;tm$('tm-loading').hidden=!flag;
  tmProcess('api',!!flag,'Memuatkan Data Tugasan Mingguan','Menyemak rekod rasmi, minggu dan kumpulan bertugas…');
  document.querySelectorAll('button,select,input,textarea').forEach(el=>{if(el.id==='tm-year'||el.id==='tm-refresh')el.disabled=flag;});}
function tmSignal(type){if(new URLSearchParams(location.search).get('embed')==='1'&&window.parent!==window)window.parent.postMessage({type},location.origin);}
function tmTrusted(origin){try{const u=new URL(origin);if(u.protocol!=='https:'||u.port||u.username||u.password)return false;const host=u.hostname.toLowerCase();return host==='script.google.com'||host==='script.googleusercontent.com'||host.endsWith('.script.googleusercontent.com')||host.endsWith('-script.googleusercontent.com');}catch{return false;}}
async function tmAPI(op,extra={}){
  const user=tmState.auth?.currentUser;
  if(!user)throw Error('Sila log masuk melalui Dashboard Guru terlebih dahulu.');
  const url=String(window.SeMAKMURFiAPIConfig?.webAppExecUrl||'').trim();
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url))throw Error('Fi-APIConfig.js tiada URL Web App Fi yang sah.');
  const nonce=(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
  const idToken=await user.getIdToken();
  return new Promise((resolve,reject)=>{
    const iframe=document.createElement('iframe');iframe.hidden=true;iframe.name='tm3-'+nonce;
    iframe.setAttribute('sandbox','allow-forms allow-scripts allow-same-origin');
    const form=document.createElement('form');form.method='POST';form.action=url;form.target=iframe.name;form.hidden=true;
    const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify({action:'fiTM',nonce,idToken,op,...extra});form.appendChild(input);
    let finished=false;
    function cleanup(){clearTimeout(timer);window.removeEventListener('message',onMessage);form.remove();iframe.remove();}
    function onMessage(e){if(e.data?.channel!=='semakmur-fi-doc-v1'||!tmTrusted(e.origin)||e.data?.nonce!==nonce||finished)return;
      finished=true;cleanup();e.data.ok?resolve(e.data):reject(Error(e.data.error||'Backend menolak permintaan.'));
    }
    const timer=setTimeout(()=>{if(!finished){finished=true;cleanup();reject(Error('Tiada respons backend. Simpanan mungkin masih diproses; semak Apps Script → Executions dahulu sebelum tekan Simpan lagi.'));}},90000);
    window.addEventListener('message',onMessage);document.body.append(iframe,form);form.submit();
  });
}
async function tmRun(action,after){if(tmState.busy)return;tmBusy(true);tmNotice('');try{return await action();}catch(e){console.error('[Smart Tugasan Mingguan]',e);tmNotice(e.message||String(e),true);tmSignal('semakmur-tm-error');return null;}finally{tmBusy(false);if(after)after();}}

/* V5.3.5 — paparan PWA ringkas. Desktop kekal penuh. */
function tmPwaCompact(){return window.matchMedia('(max-width:900px)').matches;}
function tmPwaISO(value){
  const v=String(value??'').trim();
  if(/^20\d{2}-\d{2}-\d{2}$/.test(v))return v;
  if(/^20\d{2}-\d{2}-\d{2}T/.test(v))return v.slice(0,10);
  const d=new Date(v);if(!Number.isFinite(d.getTime()))return '';
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(d);
  const m=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${m.year}-${m.month}-${m.day}`;
}
function tmPwaDate(value){const v=tmPwaISO(value);return v?tmFmt(v):tmFmt(value);}
function tmPwaWeekChoices(weeks,now=tmToday()){
  const list=(weeks||[]).filter(w=>tmPwaISO(w.Tempoh_Mula)).slice()
    .sort((a,b)=>tmPwaISO(a.Tempoh_Mula).localeCompare(tmPwaISO(b.Tempoh_Mula)));
  const past=list.filter(w=>tmPwaISO(w.Tempoh_Mula)<=now);
  return (past.length?past.slice(-3):list.slice(0,1)).reverse();
}
function tmPwaDefaultDutyDay(dates,now=tmToday()){
  if(dates.includes(now))return now;
  const weekday=new Date(now+'T12:00:00Z').getUTCDay();
  const idx=weekday===0?4:Math.min(4,weekday-1);
  return dates[Math.min(Math.max(idx,0),dates.length-1)]||'';
}
function tmPwaSetDayOptions(dates){
  const select=tm$('tm-pwa-day-select');if(!select)return;
  const prev=tmState.dutyFilter;
  select.innerHTML=dates.map(date=>`<option value="${tmEsc(date)}">${tmEsc(tmDayName(date))}</option>`).join('');
  const chosen=dates.includes(prev)?prev:tmPwaDefaultDutyDay(dates);
  if(!dates.length){select.innerHTML='<option value="">Tiada hari tersedia</option>';select.disabled=true;return;}
  select.disabled=false;select.value=chosen;
}

/* V5.3.6: picker mengikut tab. Desktop sentiasa menggunakan komponen asal. */
const tm536Selection={week:'',group:''};
function tm536WeeksForOverview(){
  const weeks=(tmState.data?.weeks||[]).filter(w=>tmPwaISO(w.Tempoh_Mula)).slice()
    .sort((a,b)=>tmPwaISO(a.Tempoh_Mula).localeCompare(tmPwaISO(b.Tempoh_Mula)));
  const today=tmToday();const last=weeks.filter(w=>tmPwaISO(w.Tempoh_Mula)<=today).at(-1)||null;
  const next=weeks.find(w=>tmPwaISO(w.Tempoh_Mula)>(last?tmPwaISO(last.Tempoh_Mula):today));
  return weeks.filter(w=>tmPwaISO(w.Tempoh_Mula)<=today||(next&&w.ID_Minggu===next.ID_Minggu)).reverse();
}
function tm536Picker(){
  const root=tm$('tm536-top-filter'),weekWrap=tm$('tm536-week-wrap'),groupWrap=tm$('tm536-group-wrap');
  const wk=tm$('tm536-week-select'),group=tm$('tm536-group-select');
  if(!root||!wk||!group)return;
  if(!tmPwaCompact()){root.hidden=true;return;}
  const mode=tmState.tab||'overview',isWeek=mode==='tasks',isGroup=mode==='members';
  root.hidden=!(isWeek||isGroup);weekWrap.hidden=!isWeek;groupWrap.hidden=!isGroup;
  if(isWeek){
    const choices=tmPwaWeekChoices(tm51.overview?.weeks||tmState.data?.weeks||[]);
    const value=tmState.weekId;
    wk.innerHTML=choices.map(w=>`<option value="${tmEsc(w.ID_Minggu)}">Minggu ${tmEsc(String(w.Minggu||'').replace(/^Minggu\s*/i,''))}</option>`).join('');
    let next=choices.some(w=>w.ID_Minggu===value)?value:(choices[0]?.ID_Minggu||'');
    wk.value=next;
    if(next&&next!==tmState.weekId){
      tm$('tm51-week-select').value=next;tm51ChooseScheduleWeek(next);
    }
  }
  if(isGroup){
    const groups=Array.isArray(tm51.overview?.currentGroups)?tm51.overview.currentGroups:[];
    const actor=String(tmState.data?.actor?.id||'');
    const own=groups.find(g=>(g.members||[]).some(m=>String(m.id||'')===actor));
    if(!tm536Selection.group||!groups.some(g=>String(g.id)===tm536Selection.group))
      tm536Selection.group=String(own?.id||groups[0]?.id||'');
    group.innerHTML=groups.length?groups.map(g=>`<option value="${tmEsc(g.id)}">${tmEsc(/^Kumpulan\s+/i.test(String(g.name||''))?g.name:('Kumpulan '+g.id))}</option>`).join(''):'<option value="">Memuatkan senarai kumpulan…</option>';
    group.value=tm536Selection.group;
  }
}
function tm536TeacherName(id,original,short){
  if(!tmPwaCompact())return original;
  if(short&&String(short).trim())return String(short).trim();
  const member=(tm51.schedule?.week?.members||[]).find(p=>String(p.id)===String(id));
  const current=(tm51.overview?.currentGroups||[]).flatMap(g=>g.members||[]).find(p=>String(p.id)===String(id));
  return String(member?.nickname||member?.shortName||current?.nickname||original||id);
}
function tmTab(name){
  tmState.tab=name;
  document.querySelectorAll('[data-tm-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tmTab===name));
  document.querySelectorAll('[data-tm-panel]').forEach(x=>x.hidden=x.dataset.tmPanel!==name);
  tm536Picker();
}

async function tm52BootstrapFast(){
  if(!tmState.user)return null;
  try{
    if(!tm51.db){
      const [a,f]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')]);
      const app=a.getApps().find(x=>x.name==='semakmur-fi-dashboard')||
        a.initializeApp(window.SeMAKMURFirebasePilotConfig,'semakmur-fi-dashboard');
      tm51.db=f.getFirestore(app);tm51.fns=f;tm51.initStarted=true;
    }
    const [b,u]=await Promise.all([
      tm51.fns.getDoc(tm51.fns.doc(tm51.db,'semakmur_fi_tm52_bootstrap',String(tmState.year))),
      tm51.fns.getDoc(tm51.fns.doc(tm51.db,'semakmur_fi_tm52_staff',String(tmState.user.uid)))]);
    if(!b.exists()||!u.exists())return null;
    const boot=b.data(),staff=u.data();if(!boot.active||!staff.active)return null;
    return {status:'SEDIA',sesi:boot.year,actor:{id:staff.id,name:staff.name,
      manager:staff.manager===true,isAdmin:staff.isAdmin===true,isGB:staff.isGB===true},
      weeks:boot.weeks||[],groups:boot.groups||[],settings:boot.settings||{},warnings:boot.warnings||[]};
  }catch(e){console.warn('[TM52 fast bootstrap fallback]',e.code||e);return null;}
}
async function tmBootstrap(){
  let result=await tm52BootstrapFast();
  if(!result)result=await tmRun(()=>tmAPI('bootstrap',{year:tmState.year}));
  if(!result)return;
  if(!(result.weeks||[]).length && tmState.year===tmToday().slice(0,4)){
    const next=String(Number(tmState.year)+1);
    const alternate=await tmRun(()=>tmAPI('bootstrap',{year:next}));
    if(alternate?.weeks?.length){result=alternate;tmState.year=next;tm$('tm-year').value=next;}
  }
  // V5.2.1: Clear startup notice only after successful authentication/bootstrap.
  tmNotice('');
  tmState.data=result;tm$('tm-user').textContent=result.actor?.name||tmState.user?.email||'Guru';tm$('tm-tab-settings').hidden=!result.actor?.isAdmin;tm$('tm-preflight').hidden=!result.actor?.isAdmin;tm$('tm-sim-area').hidden=!result.actor?.isAdmin;tm$('tm4-tab').hidden=!result.actor?.isAdmin;
  const weeks=result.weeks||[];
  if(!weeks.some(x=>x.ID_Minggu===tmState.weekId)){
    const today=tmToday();tmState.weekId=(weeks.find(x=>x.Tempoh_Mula<=today&&today<=x.Tempoh_Tamat)||weeks[0])?.ID_Minggu||'';
  }
  tmState.overviewMeta={};tmRenderOverview();tm525MembersRender();tm536Picker();tmRenderSettings();tmState.tm4WeeksLoaded=false;
  if(result.actor?.isAdmin&&tmState.tab==='smart'){await tm4LoadWeeks(false);tmState.tm4WeeksLoaded=true;}
  tmSignal('semakmur-tm-ready');
  // V5.1B: jadual diterbitkan terus melalui Firestore. Jangan memanggil
  // 'detail' + 'calendarView' Apps Script secara automatik setiap bootstrap.
  tmState.detail=null;tmState.calendar=null;tmRenderDetail();
  tm51PopulateWeekSelector();
  if(!tm51.initStarted)tm51InitFirestore();else{tm51ListenOverview();tm51ListenWeek();}
  document.dispatchEvent(new Event('semakmur-tm-auth-ready'));
}
/* V5.3.4 — Tab Minggu PWA: satu minggu akan datang + semasa/terdahulu.
   Data hanya daripada bootstrap/overview sah sedia ada; desktop tidak diubah. */
function tmPwaRenderWeeks(){
  const box=tm$('tm-pwa-week-cards'),shell=tm$('tm-pwa-weeks-shell'),count=tm$('tm-pwa-week-count');
  if(!box||!shell)return;
  const all=(tmState.data?.weeks||[]).filter(w=>tmPwaISO(w.Tempoh_Mula))
    .slice().sort((a,b)=>tmPwaISO(a.Tempoh_Mula).localeCompare(tmPwaISO(b.Tempoh_Mula)));
  const today=tmToday(),current=all.find(w=>tmPwaISO(w.Tempoh_Mula)<=today&&today<=tmPwaISO(w.Tempoh_Tamat));
  // Jika tiada minggu sekolah semasa (cuti), gunakan minggu terdahulu paling dekat.
  const past=all.filter(w=>tmPwaISO(w.Tempoh_Mula)<=today);
  const anchor=current||past[past.length-1]||null;
  const next=all.find(w=>tmPwaISO(w.Tempoh_Mula)>(anchor?tmPwaISO(anchor.Tempoh_Mula):today));
  const allowed=all.filter(w=>tmPwaISO(w.Tempoh_Mula)<=today||(next&&String(w.ID_Minggu)===String(next.ID_Minggu)));
  const display=allowed.slice().sort((a,b)=>tmPwaISO(b.Tempoh_Mula).localeCompare(tmPwaISO(a.Tempoh_Mula)));
  if(count)count.textContent=display.length+' minggu';
  const meta=tmState.overviewMeta||{};
  box.innerHTML=display.length?display.map(w=>{
    const m=meta[w.ID_Minggu]||{};
    const active=tmPwaISO(w.Tempoh_Mula)<=today&&today<=tmPwaISO(w.Tempoh_Tamat);
    const future=tmPwaISO(w.Tempoh_Mula)>today;
    const status=future?'Akan datang':active?'Semasa':'Lepas';
    const tone=future?'upcoming':active?'current':'past';
    const rawWeek=String(w.Minggu||'').replace(/^Minggu\s*/i,'').trim();
    const weekLabel='Minggu '+(rawWeek||'—');
    const group=String(w.Nama_Kumpulan||('Kumpulan '+(w.ID_Kumpulan||'—'))).replace(/^Kumpulan\s*Kumpulan\s*/i,'Kumpulan ');
    const role=String(m.gpkRole||m.gpkCategory||'').trim();
    const gpk=String(m.gpkName||'Belum ditetapkan').trim();
    const safeRole=role?role+' · ':'GPK · ';
    const leader=String(w.Nama_Ketua_Cadangan||m.leaderName||'Belum ditetapkan').trim();
    return `<article class="tm-pwa-week tm-pwa-week-${tone}" data-tm-week-card="${tmEsc(w.ID_Minggu)}" aria-label="${tmEsc(weekLabel+' '+group+' '+status)}">
      <div class="tm-pwa-week-top"><div><h3>${tmEsc(weekLabel)} <span>·</span> ${tmEsc(group)}</h3><p>${tmPwaDate(w.Tempoh_Mula)} – ${tmPwaDate(w.Tempoh_Tamat)}</p></div><span class="tm-pwa-week-status tm-pwa-status-${tone}">${status}</span></div>
      <div class="tm-pwa-week-details"><div><span>Penyelia</span><strong>${tmEsc(safeRole+gpk)}</strong></div><div><span>Ketua Kumpulan</span><strong>${tmEsc(leader)}</strong></div><div><span>Tema</span><strong>${tmEsc(m.theme||'Belum ditetapkan')}</strong></div><div><span>Tajuk Nilai Murni</span><strong>${tmEsc(m.nilaiTitle||'Belum ditetapkan')}</strong></div></div>
    </article>`;
  }).join(''):'<p class="tm-empty">Tiada minggu persekolahan yang tersedia.</p>';
  shell.hidden=false;
  // V5.3.7: navigasi ke kad, BUKAN penapis; semua minggu kekal dalam DOM.
  const picker=tm$('tm537-overview-week-select');
  if(picker){
    const navWeeks=tm536WeeksForOverview();
    const selected=tm536Selection.week;
    picker.innerHTML='<option value="">Pilih minggu</option>'+navWeeks.map(w=>
      `<option value="${tmEsc(w.ID_Minggu)}">Minggu ${tmEsc(String(w.Minggu||'').replace(/^Minggu\s*/i,''))}</option>`).join('');
    picker.value=navWeeks.some(w=>w.ID_Minggu===selected)?selected:'';
  }
}
function tmRenderOverview(){
  const a=tmState.data||{},weeks=a.weeks||[],today=tmToday(),meta=tmState.overviewMeta||{};
  const summary=[['Minggu Persekolahan',weeks.length],['Kumpulan',a.groups?.length||0],
    ['Minggu Berlangsung',weeks.filter(w=>w.Tempoh_Mula<=today&&today<=w.Tempoh_Tamat).length],
    ['Laporan Dihantar',weeks.filter(w=>['MENUNGGU_GPK','MENUNGGU_GB','DISAHKAN'].includes(meta[w.ID_Minggu]?.reportStatus)).length]];
  tm$('tm-summary').innerHTML=summary.map(([lab,num])=>`<div class="tm-metric"><strong>${num}</strong><span>${tmEsc(lab)}</span></div>`).join('');
  tm$('tm-weeks').innerHTML=weeks.length?weeks.map(w=>{
    const m=meta[w.ID_Minggu]||{},name=w.Nama_Ketua_Cadangan||'Belum ditetapkan';
    const period=today<w.Tempoh_Mula?'Akan datang':today>w.Tempoh_Tamat?'Lepas':'Semasa';
    const sent=['MENUNGGU_GPK','MENUNGGU_GB','DISAHKAN'].includes(m.reportStatus);
    const group=String(w.Nama_Kumpulan||'Kumpulan '+w.ID_Kumpulan);
    const leader=w.pelan?.leader&&w.pelan?.leader!==w.ID_Ketua_Cadangan?'<span class="tm-week-note">Ketua mengikut jadual rasmi</span>':'';
    return `<article class="tm-week tm-week-v508"><div class="tm-week-head"><h3>Minggu ${tmEsc(w.Minggu||w.ID_Minggu)}</h3><span class="tm-tag tm-time-${period==='Semasa'?'now':period==='Lepas'?'past':'future'}">${period}</span></div>
      <div class="tm-week-group">${tmEsc(group)}</div><div class="tm-week-dates">${tmFmt(w.Tempoh_Mula)} – ${tmFmt(w.Tempoh_Tamat)}</div>
      <div class="tm-week-info"><span>Ketua Kumpulan</span><strong>${tmEsc(name)}</strong>${leader}</div>
      <div class="tm-week-info"><span>Penyelia GPK</span><strong>${tmEsc(m.gpkName||'Belum ditetapkan')}</strong></div>
      <div class="tm-week-info tm-week-theme"><span>Tema Nilai Murni</span><strong>${tmEsc(m.theme||'Belum ditetapkan')}</strong>
        <span>Tajuk</span><strong>${tmEsc(m.nilaiTitle||'Belum ditetapkan')}</strong></div>
      <div class="tm-week-bottom"><span class="tm5-pill ${sent?'submitted':'pending'}">${sent?'Laporan dihantar':'Belum dihantar'}</span>
      <button type="button" class="tm-btn tm-primary" data-tm-choose="${tmEsc(w.ID_Minggu)}">${sent?'Lihat Laporan':'Isi Laporan'}</button></div></article>`;
  }).join(''):'<p class="tm-empty">Tiada minggu persekolahan.</p>';
  const warnings=a.warnings||[];if(tm$('tm-source-card'))tm$('tm-source-card').hidden=!warnings.length;
  tm$('tm-warnings').innerHTML=warnings.map(x=>`<div class="tm-warning-line">${tmEsc(x)}</div>`).join('');
  tmPwaRenderWeeks();
}
async function tmOverviewMeta(){
  if(tm51.overview?.year===tmState.year)return;
  const year=tmState.year;try{const r=await tmAPI('tm5OverviewMeta',{year});
    if(tmState.year!==year||tm51.overview?.year===year)return;tmState.overviewMeta=r.weeks||{};tmRenderOverview();
  }catch(e){console.warn('[TM5 metadata]',e?.message||String(e));}
}
async function tmLoadDetail(showMessage=true){
  const id=tmState.weekId;if(!id){tmState.detail=null;tmRenderDetail();return;}
  const r=await tmRun(()=>tmAPI('detail',{year:tmState.year,weekId:id}));if(!r)return;
  tmState.detail=r;tmState.calendar=null;tmRenderDetail();
  if(showMessage)tmNotice('Data minggu bertugas telah dimuatkan.');
  // Baca maklumat CUTI/aktiviti secara berasingan; kegagalan tidak menyekat jadual rasmi.
  const expectedYear=tmState.year,expectedWeek=id;
  tmAPI('calendarView',{year:expectedYear,weekId:expectedWeek}).then(calendar=>{
    if(tmState.year!==expectedYear||tmState.weekId!==expectedWeek)return;
    tmState.calendar=calendar;tmRenderAssignments();
  }).catch(err=>console.warn('[TM calendar]',err.message||String(err)));
}
function tmRenderDetail(){
  const d=tmState.detail,sel=tmSelected();
  const blurb=sel?`<strong>Minggu ${tmEsc(sel.Minggu||sel.ID_Minggu)} · ${tmEsc(sel.Nama_Kumpulan)}</strong><small>${tmFmt(sel.Tempoh_Mula)} hingga ${tmFmt(sel.Tempoh_Tamat)}</small>`:'<strong>Belum pilih minggu bertugas.</strong>';
  const about=`<div>${blurb}</div><div><strong>Ketua: ${tmEsc((d?.members||[]).find(x=>x.id===d?.plan?.leader)?.name||sel?.Nama_Ketua_Cadangan||'Belum ditetapkan')}</strong></div>`;
  ['tm-selection-daily','tm-selection-weekly','tm-selection-tasks'].forEach(id=>tm$(id).innerHTML=about);
  const mine=!!d?.members?.some(x=>x.id===tmMe());
  tm$('tm-daily-form').hidden=!(mine&&d?.plan);tm$('tm-weekly-form').hidden=!(d?.plan&&d.plan.leader===tmMe()&&mine);
  if(d?.week){tm$('tm-day-date').min=d.week.mula;tm$('tm-day-date').max=d.week.tamat;
    const today=tmToday(),date=tm$('tm-day-date').value;
    if(!date||date<d.week.mula||date>d.week.tamat)tm$('tm-day-date').value=(today>=d.week.mula&&today<=d.week.tamat)?today:d.week.mula;
  }
  tmRenderSections();tmRenderDaily();tmRenderWeekly();tmRenderAssignments();
}
function tmDayName(date){if(!date)return '';const d=new Date(date+'T00:00:00Z').getUTCDay();return ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'][d]||'';}
function tmRenderSections(){
  const date=tm$('tm-day-date').value,day=tmDayName(date);
  const sections=(tmState.data?.settings?.sections||[]).filter(x=>!x.day||x.day==='Semua'||x.day===day);
  const sel=tm$('tm-day-section').value;
  tm$('tm-day-section').innerHTML='<option value="">Pilih bahagian…</option>'+sections.map(x=>`<option value="${tmEsc(x.id)}">${tmEsc(x.name)}</option>`).join('');
  if(sections.some(x=>x.id===sel))tm$('tm-day-section').value=sel;
  tmRestoreOwnEntry();
}
function tmRestoreOwnEntry(){
  const d=tmState.detail,date=tm$('tm-day-date').value,sect=tm$('tm-day-section').value;
  const day=d?.days?.find(x=>x.date===date);
  const own=d?.entries?.find(x=>x.daily===day?.id&&x.section===sect&&x.author===tmMe());
  tm$('tm-day-text').value=own?.text||'';
}
function tmRenderDaily(){
  const d=tmState.detail,entries=d?.entries||[],days=d?.days||[],names=tmNames(),sections=tmState.data?.settings?.sections||[];
  const lookup=Object.fromEntries(sections.map(x=>[x.id,x.name]));
  const byDay=days.map(day=>({...day,notes:entries.filter(x=>x.daily===day.id)})).filter(x=>x.notes.length);
  tm$('tm-daily-list').innerHTML=byDay.length?byDay.map(day=>`<div class="tm-record"><strong>${tmEsc(day.day)} · ${tmFmt(day.date)}</strong>${day.notes.map(note=>`<div class="tm-record"><small>${tmEsc(lookup[note.section]||note.section)} · ${tmEsc(names[note.author]||note.author)}</small><p>${tmEsc(note.text)}</p></div>`).join('')}</div>`).join(''):'<p class="tm-empty">Tiada catatan direkod untuk minggu ini.</p>';
}
function tmRenderWeekly(){
  const d=tmState.detail,w=d?.weekly,status=w?.status||'BELUM DIISI',isLeader=!!(d?.plan?.leader===tmMe()&&d?.members?.some(x=>x.id===tmMe()));
  const editable=isLeader&&!['DIHANTAR','DISEMAK'].includes(status);
  tm$('tm-weekly-status').textContent=status;
  tm$('tm-weekly-form').hidden=!editable;
  tm$('tm-weekly-readonly').hidden=!w||editable;
  if(w&&!editable)tm$('tm-weekly-readonly').innerHTML=`<h3>Ulasan keseluruhan</h3><p>${tmEsc(w.summary)}</p><h3>Cadangan penambahbaikan</h3><p>${tmEsc(w.followup||'—')}</p>${w.review?`<p><strong>Ulasan GB:</strong> ${tmEsc(w.review)}</p>`:''}`;
  if(editable){tm$('tm-weekly-summary').value=w?.summary||'';tm$('tm-weekly-followup').value=w?.followup||'';}
  tm$('tm-review').hidden=!(tmState.data?.actor?.isGB&&status==='DIHANTAR');
}
/* V5.0.6 — Paparan jadual RASMI. Format sahaja; tidak mengubah agihan / API / data. */
function tmDutyClock(value){
  if(value===null||value===undefined||value==='')return '';
  if(typeof value==='number'&&Number.isFinite(value)){
    const frac=((value%1)+1)%1,mins=Math.round(frac*1440)%1440;
    return String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
  }
  const text=String(value).trim();
  // Apps Script String(Date) daripada sel masa mengandungi tarikh palsu 1899.
  // Ambil komponen jam secara langsung, tanpa Date.parse yang boleh menukar zon waktu.
  const match=text.match(/(?:^|[ T])(\d{1,2}):(\d{2})(?::\d{2})?(?=$|\s|Z|[+-]|\.)/);
  if(match){
    const hh=Number(match[1]),mm=Number(match[2]);
    if(hh<24&&mm<60)return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
  }
  if(/^\d{1,2}\.\d{2}$/.test(text)){
    const parts=text.split('.'),hh=Number(parts[0]),mm=Number(parts[1]);
    if(hh<24&&mm<60)return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
  }
  return ''; // Jangan papar tarikh 1899 atau nilai masa rosak kepada guru.
}
function tmDutyDateList(week,rows){
  const start=tmPwaISO(week?.mula||week?.start||week?.from||week?.Tempoh_Mula),stop=tmPwaISO(week?.tamat||week?.end||week?.to||week?.Tempoh_Tamat);
  if(/^20\d{2}-\d\d-\d\d$/.test(String(start||''))&&/^20\d{2}-\d\d-\d\d$/.test(String(stop||''))){
    const dates=[];
    for(let d=new Date(start+'T00:00:00Z'),last=new Date(stop+'T00:00:00Z');d<=last&&dates.length<7;d.setUTCDate(d.getUTCDate()+1)){
      if(d.getUTCDay()>=1&&d.getUTCDay()<=5)dates.push(d.toISOString().slice(0,10));
    }
    if(dates.length)return dates;
  }
  return [...new Set(rows.map(x=>String(x.date||'')).filter(Boolean))].sort();
}
function tmDutySetFilter(date){
  tmState.dutyFilter=date;
  const wrap=tm$('tm-assignments');if(!wrap)return;
  wrap.querySelectorAll('[data-duty-filter]').forEach(btn=>{
    const active=btn.dataset.dutyFilter===date;
    btn.classList.toggle('is-active',active);
    btn.setAttribute('aria-pressed',String(active));
  });
  wrap.querySelectorAll('[data-duty-card]').forEach(el=>{el.hidden=date!=='ALL'&&el.dataset.dutyCard!==date;});
}
function tmRenderAssignments(){
  const detail=tmState.detail||{},published=tm51.schedule?.published===true&&tm51.schedule?.weekId===tmState.weekId&&tm51.schedule?.year===tmState.year?tm51.schedule:null;
  const raw=published?.assignments||detail.assignments||[],types=tmState.data?.settings?.types||[];
  const names=Object.fromEntries([
    ...(detail.members||[]),...(published?.week?.members||[]),
    ...raw.filter(a=>a.staff&&a.name).map(a=>({id:a.staff,name:a.name}))
  ].map(x=>[String(x.id),x.name]));
  const typeNames=Object.fromEntries(types.map(x=>[String(x.id),x.name]));
  const week=published?.week||detail.week||{},fallback=tmState.data?.weeks?.find(w=>w.ID_Minggu===tmState.weekId)||{};
  const dates=tmDutyDateList(Object.keys(week).length?week:fallback,raw);
  const holder=tm$('tm-assignments');if(!holder)return;
  const calendarSource=published?.calendarDays||(tmState.calendar?.weekId===tmState.weekId?tmState.calendar.days:[]);
  const calDays=Array.isArray(calendarSource)?calendarSource:[];
  const calendar=new Map(calDays.map(d=>[String(d.date),d]));
  if(!raw.length&&!calDays.length){tmPwaSetDayOptions(dates);holder.innerHTML='<div class="tm-duty-empty"><strong>Jadual rasmi belum tersedia untuk minggu ini.</strong></div>';return;}
  const valid=raw.filter(x=>x&&x.date),uniqueStaff=new Set(valid.map(x=>String(x.staff||'')).filter(Boolean));
  const byDate=new Map(dates.map(date=>[date,[]]));
  valid.forEach(x=>{if(!byDate.has(x.date))byDate.set(x.date,[]);byDate.get(x.date).push(x);});
  const activeDays=[...byDate].filter(([,entries])=>entries.length>0).length;
  const summary=`<div class="tm-duty-meta">${valid.length} penugasan <span>·</span> ${uniqueStaff.size} guru <span>·</span> ${activeDays} hari bertugas</div>`;
  const tabs=`<div class="tm-duty-filters" role="group" aria-label="Tapis jadual mengikut hari">
    <button type="button" data-duty-filter="ALL">Semua Hari</button>
    ${dates.map(date=>{
      const cal=calendar.get(date),isHoliday=String(cal?.kind||'').toUpperCase()==='CUTI';
      return `<button type="button" data-duty-filter="${tmEsc(date)}">${tmEsc(tmDayName(date))}<span>${isHoliday?'Cuti':byDate.get(date)?.length||0}</span></button>`;
    }).join('')}
  </div>`;
  const dayCards=[...byDate].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,entries])=>{
    const cal=calendar.get(date)||{},events=Array.isArray(cal.events)?cal.events:[];
    const holiday=String(cal.kind||'').toUpperCase()==='CUTI'||events.some(e=>String(e.type||'').toUpperCase()==='CUTI');
    const labels=events.filter(e=>e&&e.title).map(e=>({title:String(e.title),holiday:String(e.type||'').toUpperCase()==='CUTI'}));
    if(holiday&&!labels.some(e=>e.holiday))labels.unshift({title:'Cuti',holiday:true});
    const eventsHtml=labels.length?`<div class="tm-duty-events">${labels.map(e=>`<span class="tm-duty-event ${e.holiday?'is-holiday':''}" title="${tmEsc(e.title)}">${tmEsc(e.title)}</span>`).join('')}</div>`:'';
    // Paparan menyatukan guru mengikut jenis tugasan; masa sebenar kekal dalam data/enjin V4.
    const grouped=new Map();
    entries.forEach(x=>{
      const id=String(x.task||''),title=x.taskName||typeNames[id]||id||'Tugasan';
      if(!grouped.has(id))grouped.set(id,{title,staff:[]});
      grouped.get(id).staff.push({id:String(x.staff||''),name:tm536TeacherName(x.staff,names[String(x.staff)]||String(x.staff||'Belum ditetapkan'),x.shortName||x.nickname||x.alias)});
    });
    const sorted=[...grouped.values()].sort((a,b)=>a.title.localeCompare(b.title,'ms'));
    const content=sorted.length?sorted.map(item=>{
      const unique=[...new Map(item.staff.map(s=>[s.id,s])).values()];
      return `<div class="tm-duty-taskrow">
        <div class="tm-duty-taskname"><strong>${tmEsc(item.title)}</strong></div>
        <div class="tm-duty-teachers">${unique.map(s=>`<span class="tm-duty-person" title="${tmEsc(s.id)}">${tmEsc(s.name)}</span>`).join('')}</div>
      </div>`;
    }).join(''):`<div class="tm-duty-no-tasks">${holiday?'Tiada tugasan — cuti':'Tiada tugasan pada hari ini.'}</div>`;
    return `<section class="tm-duty-daycard" data-duty-card="${tmEsc(date)}">
      <div class="tm-duty-dayhead"><div class="tm-duty-daytitle"><strong>${tmEsc(tmDayName(date))}</strong><span>${tmFmt(date)}</span>${eventsHtml}</div><span class="tm-duty-count">${holiday?'CUTI':entries.length+' penugasan'}</span></div>
      ${sorted.length?'<div class="tm-duty-columns"><span>Tugasan</span><span>Guru Bertugas</span></div>':''}${content}</section>`;
  }).join('');
  holder.innerHTML=summary+tabs+'<div class="tm-duty-days">'+dayCards+'</div>';
  holder.querySelectorAll('[data-duty-filter]').forEach(btn=>btn.addEventListener('click',()=>tmDutySetFilter(btn.dataset.dutyFilter)));
  const validFilters=['ALL',...byDate.keys()];
  tmPwaSetDayOptions(dates);
  const pwaChoice=tm$('tm-pwa-day-select')?.value||'';
  tmDutySetFilter(tmPwaCompact()&&pwaChoice?pwaChoice:validFilters.includes(tmState.dutyFilter)?tmState.dutyFilter:'ALL');
}
function tmPrintDocumentHTML(title,inner){
  const old=document.getElementById('tm508-print-host');if(old)old.remove();
  const host=document.createElement('section');host.id='tm508-print-host';
  host.innerHTML=`<h1 class="tm508-print-heading">${tmEsc(title)}</h1>${inner}`;
  document.body.append(host);
  const done=()=>{host.remove();window.removeEventListener('afterprint',done);};
  window.addEventListener('afterprint',done,{once:true});
  try{window.print();}catch(e){done();tmNotice('Cetakan tidak dapat dibuka. Cuba semula.',true);}
}
function tmPrintScheduleOfficial(){
  const w=tmSelected(),d=tmState.detail,table=tm$('tm-assignments');
  const valid=tm51.schedule?.published===true&&tm51.schedule?.weekId===tmState.weekId?tm51.schedule.assignments:d?.assignments;
  if(!w||!valid?.length||!table)return tmNotice('Jadual rasmi belum tersedia untuk dicetak.',true);
  const clone=table.cloneNode(true);
  clone.querySelector('.tm-duty-filters')?.remove();clone.querySelectorAll('[data-duty-card]').forEach(x=>x.hidden=false);
  const paper=`<div class="tm52-schedule-paper"><p class="tm52-paper-school">SK SEGAMBUT MAKMUR</p><h2>JADUAL GURU BERTUGAS MINGGUAN</h2><div class="tm508-print-meta">Minggu ${tmEsc(w.Minggu)} · ${tmEsc(w.Nama_Kumpulan)} · ${tmFmt(w.Tempoh_Mula)} – ${tmFmt(w.Tempoh_Tamat)}</div>${clone.outerHTML}</div>`;
  tm52PreviewSchedule(paper);
}
function tm52PreviewSchedule(paper){
  let host=document.getElementById('tm52-schedule-overlay');if(host)host.remove();
  host=document.createElement('section');host.id='tm52-schedule-overlay';host.setAttribute('role','dialog');host.setAttribute('aria-label','Pratonton Jadual Tugasan');
  host.innerHTML=`<div class="tm52-preview-toolbar"><strong>Pratonton Jadual Tugasan</strong><div><button type="button" id="tm52-schedule-close">Tutup</button><button type="button" id="tm52-schedule-print" class="primary">Cetak Jadual</button></div></div><div id="tm52-schedule-paper-wrap">${paper}</div>`;
  document.body.append(host);
  host.querySelector('#tm52-schedule-close').onclick=()=>host.remove();
  host.querySelector('#tm52-schedule-print').onclick=()=>tmPrintDocumentHTML('Jadual Guru Bertugas',paper);
}
function tm43SelectedType(){return tmState.data?.settings?.types?.find(x=>x.id===tm$('tm-time-task').value)||null;}
function tm43SyncTimeForm(){
  const t=tm43SelectedType(),mode=t?.mode||'TANPA_MASA';
  tm$('tm-time-start-wrap').hidden=mode==='TANPA_MASA';
  tm$('tm-time-end-wrap').hidden=mode!=='JULAT';
  tm$('tm-time-from').required=mode!=='TANPA_MASA';
  tm$('tm-time-to').required=mode==='JULAT';
  if(mode==='TANPA_MASA'){tm$('tm-time-from').value='';tm$('tm-time-to').value='';}
  if(mode==='MULA_SAHAJA')tm$('tm-time-to').value='';
  tm$('tm-time-count').value=t?.min||1;
  tm$('tm-time-mode-note').textContent=mode==='TANPA_MASA'
    ?'Tiada masa diperlukan. Pilih hari dan tahap; tugasan disemak mengikut keberadaan guru, bukan konflik jam PdPc.'
    :mode==='JULAT'?'Rehat: isi masa mula dan masa tamat. Kelayakan guru disemak dengan waktu PdPc sebenar.'
    :'Isi masa mula sahaja. Sistem menggunakan 15 minit selepas masa mula untuk semakan konflik PdPc.';
}
function tm43UpdateTaskMode(){
  const name=tm$('tm-task-name').value.trim();
  if(!name||tm$('tm-task-id').value)return;
  const timed=/REHAT|BALIK|PULANG/i.test(name);
  tm$('tm-task-time-required').value=timed?'YA':'TIDAK';
}
function tmRenderSettings(){
  const types=tmState.data?.settings?.types||[],times=tmState.data?.settings?.times||[];
  const names=Object.fromEntries(types.map(x=>[x.id,x.name]));
  const labels={TANPA_MASA:'Tiada tetapan masa',JULAT:'Masa mula + tamat',MULA_SAHAJA:'Masa mula sahaja'};
  tm$('tm-task-list').innerHTML='<div class="tm-mini-list">'+(types.length?types.map(x=>
    `<div class="tm-mini"><div><strong>${tmEsc(x.name)}</strong><small>${tmEsc(x.category)} · Mata ${Number(x.weight)||0} · ${Number(x.min)||1} guru · ${tmEsc(labels[x.mode]||'Semak tetapan masa')}</small></div><button class="tm-btn tm-ghost" data-edit-task="${tmEsc(x.id)}">Edit</button></div>`).join('')
    :'<p class="tm-empty">Belum ada jenis tugasan.</p>')+'</div>';
  const old=tm$('tm-time-task').value;
  tm$('tm-time-task').innerHTML='<option value="">Pilih tugasan…</option>'+types.filter(x=>x.status.toUpperCase()==='AKTIF').map(x=>`<option value="${tmEsc(x.id)}">${tmEsc(x.name)}</option>`).join('');
  if(types.some(x=>x.id===old))tm$('tm-time-task').value=old;
  tm43SyncTimeForm();
  tm$('tm-time-list').innerHTML='<div class="tm-mini-list">'+(times.length?times.map(x=>{
    const t=types.find(t=>t.id===x.task),mode=t?.mode||'TANPA_MASA';
    const clock=mode==='TANPA_MASA'?'Tiada masa':mode==='MULA_SAHAJA'?(x.start||'Masa mula belum diisi'):(x.start+'–'+x.end);
    return `<div class="tm-mini"><div><strong>${tmEsc(names[x.task]||x.task)}</strong><small>${tmEsc(x.day==='Semua Hari'?'Semua Hari (Isnin–Jumaat)':x.day)} · ${tmEsc(x.level||'Semua')} · ${tmEsc(clock)} · ${t?.min||x.count||1} guru · kuat kuasa ${tmFmt(x.from)}</small></div><button class="tm-btn tm-ghost" data-edit-time="${tmEsc(x.id)}">Edit</button></div>`;
  }).join(''):'<p class="tm-empty">Belum ada tetapan hari untuk tugasan bermasa. Jenis tanpa masa akan disediakan untuk Semua Hari apabila disimpan.</p>')+'</div>';
}
function tmEditTask(id){const x=tmState.data?.settings?.types?.find(x=>x.id===id);if(!x)return;
  tm$('tm-task-id').value=x.id;tm$('tm-task-name').value=x.name;tm$('tm-task-category').value=x.category;
  tm$('tm-task-weight').value=x.weight;tm$('tm-task-min').value=x.min;
  tm$('tm-task-time-required').value=x.mode==='TANPA_MASA'?'TIDAK':'YA';
  tm$('tm-task-name').focus();}
function tmEditTime(id){const x=tmState.data?.settings?.times?.find(x=>x.id===id);if(!x)return;
  for(const [key,val] of [['tm-time-id',x.id],['tm-time-task',x.task],['tm-time-day',x.day],['tm-time-level',x.level||'Semua'],
    ['tm-time-from',x.start],['tm-time-to',x.end],['tm-time-effective',x.from],['tm-time-expiry',x.to]])tm$(key).value=val||'';
  tm43SyncTimeForm();
  const mode=tm43SelectedType()?.mode||'TANPA_MASA';
  if(mode!=='TANPA_MASA')tm$('tm-time-from').value=x.start||'';
  if(mode==='JULAT')tm$('tm-time-to').value=x.end||'';
  tm$('tm-time-task').focus();}
async function tmChoose(id){tmState.weekId=id;tm51ListenWeek();
  if(window.SeMAKMUR_TM5_UI)await window.SeMAKMUR_TM5_UI.openFromOverview(id);else tmTab('report-studio');}
async function tmSaveDaily(e){e.preventDefault();if(!tmState.detail?.plan)return tmNotice('Draf minggu belum disediakan.',true);
  const date=tm$('tm-day-date').value,section=tm$('tm-day-section').value,text=tm$('tm-day-text').value;
  const result=await tmRun(()=>tmAPI('saveDaily',{year:tmState.year,weekId:tmState.weekId,date,section,text}));
  if(result){await tmLoadDetail(false);tmNotice('Catatan anda berjaya disimpan.');}}
async function tmSaveWeekly(submit){
  const summary=tm$('tm-weekly-summary').value,followup=tm$('tm-weekly-followup').value;
  if(submit&&!await tm5318Confirm('Hantar laporan kepada Guru Besar? Laporan akan dikunci sehingga disemak atau dipulangkan.'))return;
  const result=await tmRun(()=>tmAPI('saveWeekly',{year:tmState.year,weekId:tmState.weekId,summary,followup,submit}));
  if(result){await tmLoadDetail(false);tmNotice(submit?'Laporan mingguan telah dihantar kepada Guru Besar.':'Draf ulasan disimpan.');}}
async function tmReview(decision){const note=tm$('tm-review-note').value;
  if(!await tm5318Confirm(decision==='DISEMAK'?'Tandakan laporan ini telah disemak?':'Pulangkan laporan kepada ketua untuk pembetulan?'))return;
  const r=await tmRun(()=>tmAPI('review',{year:tmState.year,weekId:tmState.weekId,decision,note}));
  if(r){await tmLoadDetail(false);tmNotice('Keputusan semakan telah disimpan.');}}
async function tmDraft(id){if(!await tm5318Confirm('Sediakan draf ketua bagi minggu ini? Ini tidak menjana atau menerbitkan tugasan harian.'))return;
  const r=await tmRun(()=>tmAPI('draft',{year:tmState.year,weekId:id}));
  if(r){tmNotice('Draf minggu disediakan. Agihan tugasan masih belum diterbitkan.');await tmBootstrap();}}
async function tmSeed(){if(!await tm5318Confirm('Tambah contoh 9 jenis tugasan dan 9 bahagian laporan? Rekod sedia ada tidak dipadam.'))return;
  const r=await tmRun(()=>tmAPI('seed'));if(r){tmNotice('Tetapan asas berjaya disediakan.');await tmBootstrap();tmTab('settings');}}
async function tmSaveTask(e){e.preventDefault();const payload={id:tm$('tm-task-id').value,name:tm$('tm-task-name').value,
  category:tm$('tm-task-category').value,weight:Number(tm$('tm-task-weight').value),min:Number(tm$('tm-task-min').value),
  hasTime:tm$('tm-task-time-required').value,from:tmState.year+'-01-01'};
  const r=await tmRun(()=>tmAPI('upsertTask',payload));if(r){tm$('tm-task-form').reset();tm$('tm-task-id').value='';tm$('tm-task-time-required').value='YA';tmNotice('Jenis tugasan disimpan.');await tmBootstrap();tmTab('settings');}}
async function tmSaveTime(e){e.preventDefault();const payload={id:tm$('tm-time-id').value,task:tm$('tm-time-task').value,
  day:tm$('tm-time-day').value,level:tm$('tm-time-level').value,start:tm$('tm-time-from').value,end:tm$('tm-time-to').value,
  from:tm$('tm-time-effective').value,to:tm$('tm-time-expiry').value};
  const r=await tmRun(()=>tmAPI('upsertWindow',payload));if(r){tm$('tm-time-form').reset();tm$('tm-time-id').value='';tmNotice('Waktu tugasan disimpan.');await tmBootstrap();tmTab('settings');}}
async function tmPreflight(){const r=await tmRun(()=>tmAPI('preflight',{year:tmState.year}));if(!r)return;
  tm$('tm-preflight-result').innerHTML=`<div class="tm-card"><h3>Semakan Kesediaan — ${tmEsc(r.status)}</h3><p>${r.rekodJadual} rekod jadual, ${r.ahli} pelantikan kumpulan, ${r.waktuTugas} tetapan waktu.</p>${(r.warnings||[]).map(x=>`<p class="tm-warning-line">${tmEsc(x)}</p>`).join('')}<strong>Agihan belum boleh diterbitkan.</strong></div>`;}
async function tmPreviewSimulation(){
  if(!tmManager())return tmNotice('Hanya pentadbir boleh melihat simulasi.',true);
  const r=await tmRun(()=>tmAPI('simPreview'));
  if(!r)return;
  const out=tm$('tm-sim-grid');
  const list=r.jadual||[];
  out.innerHTML=list.length?list.map(w=>`<article class="tm-week">
    <div class="tm-week-head"><h3>${tmEsc(w.Minggu)}</h3><span class="tm-tag">SIMULASI</span></div>
    <p>${tmEsc(w.Nama_Kumpulan)} · ${tmFmt(w.Tempoh_Mula)} – ${tmFmt(w.Tempoh_Tamat)}</p>
    <div class="tm-week-leader">Ketua dicadangkan: ${tmEsc(w.Nama_Ketua_Cadangan||'Belum ada pelantikan ahli')}</div>
    <p>${tmEsc(w.Bil_Ahli_Layak)} ahli · ${tmEsc(w.Nota)}</p>
    </article>`).join(''):'<p class="tm-empty">Tiada minggu simulasi.</p>';
  tm$('tm-sim-warning').innerHTML=(r.amaran||[]).map(x=>`<p class="tm-warning-line">${tmEsc(x)}</p>`).join('');
}
function tmPrint(){
  const d=tmState.detail,w=tmSelected();if(!d?.plan)return tmNotice('Pilih minggu yang telah mempunyai draf dahulu.',true);
  const sections=Object.fromEntries((tmState.data?.settings?.sections||[]).map(x=>[x.id,x.name]));
  const names=tmNames();const days=(d.days||[]).sort((a,b)=>a.date.localeCompare(b.date));
  const notes=days.map(day=>`<section><h3>${tmEsc(day.day)} — ${tmFmt(day.date)}</h3>${(d.entries||[]).filter(x=>x.daily===day.id).map(n=>`<p><b>${tmEsc(sections[n.section]||n.section)}</b> (${tmEsc(names[n.author]||n.author)})</p><p>${tmEsc(n.text).replace(/\n/g,'<br>')}</p>`).join('')||'<p>Tiada catatan.</p>'}</section>`).join('');
  const html=`<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>Laporan Guru Bertugas — ${tmEsc(w?.Minggu)}</title><style>@page{size:A4;margin:16mm}body{font:12px/1.65 Arial,sans-serif;color:#222}h1{font-size:18px;margin-bottom:4px}h2{font-size:15px;border-bottom:2px solid #333;padding-bottom:4px}h3{font-size:13px;background:#f5f5f5;padding:7px;margin-top:22px}section{break-inside:avoid}p{white-space:normal;overflow-wrap:anywhere}.meta{border-bottom:1px solid #aaa;padding:10px 0;margin-bottom:16px}@media print{button{display:none}}</style></head><body>
  <h1>SK SEGAMBUT MAKMUR</h1><h2>LAPORAN GURU BERTUGAS MINGGUAN</h2>
  <div class="meta"><b>Sesi:</b> ${tmEsc(tmState.year)} &nbsp; <b>Minggu:</b> ${tmEsc(w?.Minggu||w?.ID_Minggu)} &nbsp; <b>Kumpulan:</b> ${tmEsc(w?.Nama_Kumpulan)}<br>
  <b>Tarikh:</b> ${tmFmt(w?.Tempoh_Mula)} – ${tmFmt(w?.Tempoh_Tamat)}<br><b>Ketua:</b> ${tmEsc(names[d.plan.leader]||d.plan.leader)} &nbsp; <b>Status:</b> ${tmEsc(d.weekly?.status||'DRAF')}</div>
  <h2>1. Laporan Harian</h2>${notes||'<p>Belum ada laporan harian.</p>'}
  <h2>2. Ulasan Keseluruhan Ketua</h2><p>${tmEsc(d.weekly?.summary||'Belum diisi.').replace(/\n/g,'<br>')}</p>
  <h2>3. Cadangan Penambahbaikan</h2><p>${tmEsc(d.weekly?.followup||'—').replace(/\n/g,'<br>')}</p>
  <h2>4. Semakan Guru Besar</h2><p>${tmEsc(d.weekly?.review||'Belum disemak.').replace(/\n/g,'<br>')}</p>
  <br><br><p>Disediakan oleh (Ketua Guru Bertugas): ______________________________</p><p>Disemak oleh (Guru Besar): ______________________________</p>
  <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350))<\/script></body></html>`;
  const printWindow=window.open('','_blank');
  if(printWindow)printWindow.opener=null;
  if(!printWindow){tmNotice('Tetingkap cetakan disekat. Benarkan pop-up untuk portal.',true);return;}
  printWindow.document.open();printWindow.document.write(html);printWindow.document.close();
}

// V4: simulation & safety-gated duty scheduler. Existing daily/weekly reports unchanged.
const tm4GetMode=()=>tm$('tm4-mode').value;
const tm4Input=()=>({mode:tm4GetMode(),weekId:tm$('tm4-week').value,asOf:tm$('tm4-asof').value,year:tmState.year});
// V4.8: load group members independently of generated schedules.
function tm48RenderMemberPicker(members,week){
  const picker=tm$('tm4-teacher'),old=picker.value;
  picker.innerHTML='<option value="">'+(members.length?'Pilih guru bertugas…':'Tiada ahli kumpulan untuk minggu ini')+'</option>'+
    members.map(p=>`<option value="${tmEsc(p.id)}">${tmEsc(p.name)}</option>`).join('');
  if(members.some(p=>p.id===old))picker.value=old;
  if(week){
    for(const id of ['tm4-absence-from','tm4-absence-to','tm4-cal-date']){
      const el=tm$(id);if(!el.value||el.value<week.from||el.value>week.to)el.value=week.from;
      el.min=week.from;el.max=week.to;
    }
  }
}
async function tm48LoadMembers(){
  const args=tm4Input(),picker=tm$('tm4-teacher');
  // Do not show members of a previously selected week.
  tmState.tm48Members=null;
  picker.innerHTML='<option value="">'+(args.weekId?'Memuatkan nama guru…':'Pilih minggu dahulu…')+'</option>';
  if(!args.weekId)return;
  const r=await tmRun(()=>tmAPI('tm4Members',args));
  if(!r){picker.innerHTML='<option value="">Gagal muat nama guru — cuba Muat Jadual</option>';return;}
  // Ignore a stale response when the user changed session/mode/week mid-request.
  if(args.mode!==tm4GetMode()||args.weekId!==tm$('tm4-week').value||args.year!==tmState.year)return;
  const members=Array.isArray(r.members)?r.members:[];
  tmState.tm48Members={mode:args.mode,weekId:args.weekId,members};
  tm48RenderMemberPicker(members,r);
  if(!members.length)tm4Message('Tiada ahli kumpulan aktif bagi minggu ini.',true);
}
function tm4Message(message,bad=false){
  const box=tm$('tm4-status');box.textContent=message||'';box.classList.toggle('tm4-error',bad);
}
async function tm4LoadWeeks(loadSchedule=true){
  if(!tmManager())return;
  const mode=tm4GetMode(),sel=tm$('tm4-week'),old=sel.value;
  let weeks=[];
  if(mode==='SIMULASI'){
    const data=await tmRun(()=>tmAPI('tm4SimList'));
    if(!data)return;
    weeks=(data.weeks||[]).map(w=>({id:w.id,label:w.label,from:w.from,to:w.to,group:w.group}));
  }else{
    weeks=(tmState.data?.weeks||[]).map(w=>({id:w.ID_Minggu,label:w.Minggu||w.ID_Minggu,from:w.Tempoh_Mula,to:w.Tempoh_Tamat,group:w.ID_Kumpulan}));
  }
  sel.innerHTML='<option value="">Pilih minggu…</option>'+weeks.map(w=>`<option value="${tmEsc(w.id)}">${tmEsc(w.label)} · ${tmFmt(w.from)} · Kumpulan ${tmEsc(w.group)}</option>`).join('');
  if(weeks.some(w=>w.id===old))sel.value=old;
  else if(weeks.length)sel.value=weeks[0].id;
  tm$('tm4-asof').disabled=mode!=='SIMULASI';
  tm$('tm4-absence-form').querySelectorAll('input,select,button').forEach(x=>x.disabled=mode!=='SIMULASI');
  tm$('tm47-sim-section').hidden=mode!=='SIMULASI';
  tm$('tm4-mode-badge').textContent=mode==='SIMULASI'?'UJIAN TERASING':'DATA RASMI';
  tm4Message(mode==='SIMULASI'?'Simulasi aktif. Rekod rasmi tidak berubah.':'Mod rasmi menggunakan masa pelayan semasa. Pastikan takwim, hari sekolah dan penyegerakan keberadaan disahkan.');
  // Keahlian simulasi sahaja memerlukan semakan backend, jangan lakukan
  // bacaan berat setiap kali tab Smart Auto Agihan dibuka dalam mod RASMI.
  if(mode==='SIMULASI')await tm48LoadMembers();
  if(loadSchedule&&sel.value)await tm4LoadSchedule();
}
function tm43TimeLabel(x){
  if(x.mode==='TANPA_MASA')return 'Tiada tetapan masa';
  if(x.mode==='MULA_SAHAJA')return x.from||'Masa belum ditetapkan';
  return (x.from||'—')+'–'+(x.to||'—');
}
function tm43DayCards(rows,week){
  if(!rows.length)return '<p class="tm-empty">Belum ada jadual. Isi Jenis Tugasan dan tetapan hari dahulu, kemudian klik Jana Jadual Bertugas.</p>';
  const order=['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
  const closedStatuses=new Set(['DIGANTI','DIBATALKAN_CUTI','DIBATALKAN']);
  const pendingStatus='PERLU_TINDAKAN';
  const grouped=new Map();
  rows.slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||
    (a.mode==='TANPA_MASA'?1:0)-(b.mode==='TANPA_MASA'?1:0)||
    String(a.from||'').localeCompare(String(b.from||''))||
    String(a.taskName||'').localeCompare(String(b.taskName||'')))
    .forEach(x=>{if(!grouped.has(x.date))grouped.set(x.date,[]);grouped.get(x.date).push(x);});
  // Tetap paparkan semua hari persekolahan minggu ini, termasuk hari yang tiada tugas.
  if(week?.from&&week?.to){
    for(let d=new Date(week.from+'T00:00:00Z'),stop=new Date(week.to+'T00:00:00Z');d<=stop;d.setUTCDate(d.getUTCDate()+1)){
      if(d.getUTCDay()===0||d.getUTCDay()===6)continue;
      const iso=d.toISOString().slice(0,10);
      if(!grouped.has(iso))grouped.set(iso,[]);
    }
  }
  return [...grouped].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,list])=>{
    const day=list[0]?.day||order[new Date(date+'T00:00:00Z').getUTCDay()]||'Hari';
    const weekLabel=week?.label||week?.id||'—';
    const active=list.filter(x=>!closedStatuses.has(x.status)&&x.status!==pendingStatus);
    const pending=list.filter(x=>x.status===pendingStatus);
    const history=list.filter(x=>closedStatuses.has(x.status));
    // Gabungkan dua guru Rehat Tahap 1/2 di bawah SATU nama tugasan.
    // Simpan nama penuh: papar tanpa masa, beban dan maklumat teknikal.
    const dutyGroups=new Map();
    for(const x of [...active,...pending]){
      const title=String(x.taskName||'Tugasan belum dinamakan').trim();
      const key=title.toLocaleLowerCase('ms-MY');
      if(!dutyGroups.has(key))dutyGroups.set(key,{title,teachers:[]});
      dutyGroups.get(key).teachers.push({name:x.status===pendingStatus?'Belum ditetapkan — Perlu Tindakan':x.name||'Belum ditetapkan',pending:x.status===pendingStatus});
    }
    const duties=[...dutyGroups.values()].map(g=>`<div class="tm45-duty">
      <div class="tm45-task">${tmEsc(g.title)}</div>
      <div class="tm45-names">${g.teachers.map((t,i)=>`<span class="tm45-teacher${t.pending?' tm45-needs-action':''}">${tmEsc(t.name)}${i<g.teachers.length-1?' ; ':''}</span>`).join('')}</div>
    </div>`).join('')||'<p class="tm43-no-duty">Tiada tugasan dijana pada hari ini. Semak sama ada hari cuti atau tetapan hari.</p>';
    // Sejarah tidak dibuang; disimpan dalam panel yang tertutup secara lalai.
    const oldRecords=history.length?`<details class="tm45-history"><summary>Sejarah perubahan (${history.length})</summary>
      ${history.map(x=>`<div class="tm45-history-row"><span>${tmEsc(x.taskName||'Tugasan')}</span><span>${tmEsc(x.name||'—')} · ${tmEsc(x.status)}</span></div>`).join('')}
    </details>`:'';
    return `<section class="tm43-day tm45-day"><header class="tm43-day-head"><div><h3>${tmEsc(day)} <span>· ${tmFmt(date)}</span></h3><p>${tmEsc(weekLabel)}</p></div><span class="tm-tag">${active.length} tugas aktif</span></header>
      <div class="tm45-duty-head"><span>Tugasan</span><span>Guru Bertugas</span></div>${duties}${oldRecords}</section>`;
  }).join('');
}
function tm4Render(schedule){
  tmState.tm4=schedule;
  const members=schedule?.week?.members||[];
  const yearNames=Object.fromEntries((tm51.overview?.weeks||[]).flatMap(w=>w.members||[]).map(m=>[String(m.id),String(m.name)]));
  const rows=(schedule?.assignments||[]).map(x=>({...x,name:(x.name&&String(x.name)!==String(x.staff)?x.name:'')||
    yearNames[String(x.staff)]||x.name||String(x.staff||'')}));
  const w=schedule?.week;
  tm48RenderMemberPicker(members,w);
  tmState.tm48Members={mode:tm4GetMode(),weekId:tm$('tm4-week').value,members};
  tm$('tm4-total').textContent=rows.filter(x=>!['DIGANTI','DIBATALKAN_CUTI','DIBATALKAN','PERLU_TINDAKAN'].includes(x.status)).length+' tugasan aktif';
  tm$('tm4-rows').innerHTML=tm43DayCards(rows,w);
  const fair=schedule?.fairness||{},names=Object.fromEntries(members.map(m=>[m.id,m.name]));
  tm$('tm4-fairness').innerHTML=Object.keys(fair).length?Object.entries(fair)
    .sort((a,b)=>Number(a[1].weight)-Number(b[1].weight))
    .map(([id,v])=>`<div class="tm4-fair"><span>${tmEsc(names[id]||id)}</span><strong>${Number(v.weight)||0} mata</strong><small>Rehat: ${v.rest||0} · Tugas Pagi: ${v.morning||0} · Berat: ${v.heavy||0} · Ringan: ${v.light||0} · Jumlah: ${v.all||0}</small></div>`).join(''):
    '<p class="tm-empty">Keadilan boleh dilihat selepas jadual dijana.</p>';
  tm$('tm4-warning').innerHTML=(w?.warnings||[]).map(x=>`<p class="tm-warning-line">${tmEsc(x)}</p>`).join('')+
    (schedule?.alerts||[]).map(x=>`<p class="tm-warning-line"><strong>PERLU TINDAKAN:</strong> ${tmEsc(x.date)} ${tmEsc(x.from)}–${tmEsc(x.to)} ${tmEsc(x.task)} — ${tmEsc(x.reason)}</p>`).join('')+
    (schedule?.doubleConflicts||[]).map(x=>`<p class="tm-warning-line"><strong>TUGAS BERGANDA TIDAK SERASI:</strong> ${tmEsc(x.date)} · ${tmEsc(x.staff)} · ${tmEsc(x.task)} — ${tmEsc(x.reason)}</p>`).join('')+
    (schedule?.frequencyWarnings||[]).map(x=>`<p class="tm-warning-line"><strong>SEMAKAN GILIRAN:</strong> ${tmEsc(x)}</p>`).join('');
  tmState.audit=null;
  tm$('tm47-audit-result').innerHTML='<p class="tm-empty">Klik Semak Statistik & Konflik PdPc untuk mengaudit jadual ini.</p>';
  tm4Message(`Status pelan: ${schedule?.status||'BELUM_JANA'}. Rujukan masa: ${schedule?.asOf||'—'}.`);
  if(tm4GetMode()==='SIMULASI')tm47LoadAbsences();
}
async function tm4LoadSchedule(){
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  const r=await tmRun(()=>tmAPI('tm4Schedule',args));if(r)tm4Render(r);
}
async function tm4Generate(){
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  if(!await tm5318Confirm(args.mode==='SIMULASI'?'Jana jadual ujian untuk minggu ini? Tetapan jenis dan waktu tugasan mesti sudah diisi.':'Jana jadual RASMI? Hanya waktu akan datang disediakan, dan hari sekolah mesti disahkan.'))return;
  const r=await tmRun(()=>tmAPI('tm4Generate',args));if(!r)return;
  tm4Render(r.schedule);
  tm4Message(`Jana: ${r.bilJana||0} tugasan. ${r.bilKosong||0} slot belum dapat diisi.`);
  if(r.unfilled?.length)tm$('tm4-warning').innerHTML=r.unfilled.map(u=>`<p class="tm-warning-line">${tmEsc(u.date)} ${tmEsc(u.from)} ${tmEsc(u.task)}: Tiada calon bebas.</p>`).join('');
}
async function tm4Repair(){
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  const r=await tmRun(()=>tmAPI('tm4Repair',args));if(!r)return;
  tm4Render(r.schedule);
  tm4Message(`${r.bilGanti||0} guru diganti. ${r.bilBelumSelesai||0} slot memerlukan tindakan pentadbir. Tugasan lampau kekal.`);
  if(r.pending?.length)tm$('tm4-warning').innerHTML=r.pending.map(u=>`<p class="tm-warning-line">BELUM DIGANTI: ${tmEsc(u.date)} ${tmEsc(u.from)} ${tmEsc(u.task)}</p>`).join('');
}
/** V4.6: only future dates of an unpublished draft can be reassigned. */
async function tm46Rebalance(){
  const args=tm4Input();
  if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  if(!tmState.tm4?.planId)return tm4Message('Jana jadual dahulu sebelum mengimbangkan draf.',true);
  const note=args.mode==='SIMULASI'
    ?'Imbang semula jadual SIMULASI bagi hari selepas tarikh rujukan? Rekod asal kekal sebagai DIGANTI. Untuk keseluruhan Minggu 2, pilih masa rujukan 22/11/2026 sebelum minggu bermula.'
    :'Imbang semula DRAF RASMI yang belum diterbitkan? Hanya hari selepas hari ini akan diubah; rekod terdahulu kekal.';
  if(!await tm5318Confirm(note))return;
  const r=await tmRun(()=>tmAPI('tm46Rebalance',args));
  if(!r)return;
  if(r.schedule)tm4Render(r.schedule);
  tm4Message((r.status==='TIADA_PERUBAHAN'?'Tiada perubahan diperlukan. ':'Draf telah diimbangkan semula. ')+
    (r.bilBerubah||0)+' tugasan dipinda. Hari semasa dan lampau dikunci.');
}
async function tm4Publish(){
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  if(!await tm5318Confirm(args.mode==='SIMULASI'?'Terbitkan jadual SIMULASI sahaja? Tidak akan dihantar kepada GB.':'Terbitkan jadual RASMI? Pastikan semua tugasan telah disemak.'))return;
  const r=await tmRun(()=>tmAPI('tm4Publish',args));if(r){tm4Render(r.schedule);tm4Message('Jadual berjaya diterbitkan: '+r.status);}
}
async function tm4RecordAbsence(e){
  e.preventDefault();if(tm4GetMode()!=='SIMULASI')return tm4Message('Borang ini untuk simulasi sahaja.',true);
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu terlebih dahulu.',true);
  const more={staff:tm$('tm4-teacher').value,from:tm$('tm4-absence-from').value,to:tm$('tm4-absence-to').value,
    start:tm$('tm4-absence-start').value,end:tm$('tm4-absence-end').value,reason:tm$('tm4-absence-reason').value,
    location:tm$('tm4-absence-location').value,stage:tm$('tm4-absence-stage').value,note:tm$('tm4-absence-note').value};
  if(!more.staff)return tm4Message('Pilih nama guru untuk ujian.',true);
  const r=await tmRun(()=>tmAPI('tm47AbsenceSave',{...args,...more}));if(!r)return;
  await tm47LoadAbsences();
  tm4Message(r.eligible?'Keberadaan di sekolah direkod; guru masih boleh diagihkan.':
    (tmState.tm4?.planId?'Ketiadaan direkod. Klik Semak & Ganti untuk membetulkan tugasan masa hadapan.':
     'Ketiadaan dirancang disimpan. Jana jadual selepas menyemak senarai ini; guru tersebut akan dikecualikan.'));
}
async function tm4Calendar(e){
  e.preventDefault();const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  const more={date:tm$('tm4-cal-date').value,kind:tm$('tm4-cal-kind').value,note:tm$('tm4-cal-note').value};
  if(args.mode==='RASMI'&&!await tm5318Confirm('Sahkan jenis hari RASMI untuk tarikh '+more.date+'?'))return;
  const r=await tmRun(()=>tmAPI('tm4SetCalendar',{...args,...more}));if(r)tm4Message('Tarikh '+tmFmt(more.date)+' ditetapkan '+r.kind+'. Tetapkan sebelum jana jadual; perubahan selepas penjanaan memerlukan semakan manual.');
}

async function tm47LoadAbsences(){
  const root=tm$('tm47-absence-list');if(!root||tm4GetMode()!=='SIMULASI')return;
  const args=tm4Input();if(!args.weekId){root.innerHTML='<p class="tm-muted">Pilih minggu simulasi dahulu.</p>';return;}
  try{
    const visible=(tmState.tm48Members?.weekId===args.weekId&&tmState.tm48Members?.mode===args.mode)
      ?tmState.tm48Members.members:(tmState.tm4?.week?.members||[]);
    const result=await tmAPI('tm47AbsenceList',args),people=Object.fromEntries(visible.map(x=>[x.id,x.name]));
    const rows=result?.entries||[];
    root.innerHTML='<h3 class="tm47-subhead">Senarai Keberadaan Minggu Ini ('+rows.filter(x=>x.status==='AKTIF').length+' aktif)</h3>'+
      (rows.length?rows.map(x=>`<div class="tm47-absence-item ${x.status!=='AKTIF'?'is-cancelled':''}">
        <div><strong>${tmEsc(people[x.staff]||x.staff)}</strong><small>${tmFmt(x.from)} – ${tmFmt(x.to)} · ${tmEsc(x.category)} · ${x.onCampus?'Di sekolah (LAYAK)':'Luar sekolah (TIDAK LAYAK)'} · ${tmEsc(x.stage)} ${x.status!=='AKTIF'?'· BATAL':''}</small></div>
        ${x.status==='AKTIF'?`<button type="button" class="tm-btn tm-ghost" data-tm47-cancel="${tmEsc(x.id)}">Batalkan</button>`:''}</div>`).join(''):'<p class="tm-muted">Belum ada keberadaan simulasi. Cikgu boleh rekod lebih awal sebelum menjana jadual.</p>');
  }catch(e){root.innerHTML='<p class="tm-warning-line">Senarai keberadaan gagal dibaca: '+tmEsc(e.message||e)+'</p>';}
}
async function tm47CancelAbsence(id){
  if(!id||!await tm5318Confirm('Batalkan rekod keberadaan ujian ini? Rekod sejarah disimpan. Jika jadual sudah dijana, jalankan Semak & Ganti.'))return;
  const args=tm4Input(),r=await tmRun(()=>tmAPI('tm47AbsenceCancel',{...args,id}));
  if(r){tm4Message('Keberadaan dibatalkan. Jika jadual sudah dijana, klik Semak & Ganti untuk menilai semula slot masa hadapan.');await tm47LoadAbsences();}
}
function tm47RenderAudit(a){
  const root=tm$('tm47-audit-result'),s=a.summary||{};
  const fields=[['Tugas Aktif',s.active],['Guru',s.teachers],['Rehat T1 / T2',`${s.rest1??0} / ${s.rest2??0}`],
    ['Semakan PdPc',s.checked],['Konflik PdPc',s.pdpcConflicts],['Slot Rehat Kurang Guru',s.restShortages]];
  const summary=`<div class="tm47-metrics">${fields.map(([k,v])=>`<div><span>${tmEsc(k)}</span><strong>${tmEsc(v??0)}</strong></div>`).join('')}</div>`;
  const personRows=(a.people||[]).map(x=>`<tr><td>${tmEsc(x.name)}</td><td>${Number(x.total)||0}</td><td>${Number(x.rest1)||0}</td><td>${Number(x.rest2)||0}</td><td>${Number(x.rest)||0}</td><td>${Number(x.morning)||0}</td><td>${Number(x.heavy)||0}</td><td>${Number(x.light)||0}</td><td>${Number(x.weight)||0}</td><td>${tmEsc(x.repeats||'—')}</td></tr>`).join('');
  const table=`<h3 class="tm47-subhead">Keadilan dan Kekerapan Jenis Tugas</h3><div class="tm-table-scroll"><table class="tm47-table"><thead><tr><th>Guru</th><th>Jumlah</th><th>Rehat T1</th><th>Rehat T2</th><th>Rehat</th><th>Pagi</th><th>Berat</th><th>Ringan</th><th>Mata</th><th>Ulangan Pagi</th></tr></thead><tbody>${personRows}</tbody></table></div>`;
  const rest=(a.restByDay||[]).map(x=>`<tr><td>${tmEsc(x.day)} · ${tmFmt(x.date)}</td><td>${x.t1}/${x.need1}</td><td>${x.t2}/${x.need2}</td><td>${x.ok?'Cukup':'PERLU TINDAKAN'}</td></tr>`).join('');
  const restTable=`<h3 class="tm47-subhead">Bilangan Petugas Waktu Rehat Mengikut Hari</h3><div class="tm-table-scroll"><table class="tm47-table"><thead><tr><th>Hari / Tarikh</th><th>Tahap 1</th><th>Tahap 2</th><th>Status</th></tr></thead><tbody>${rest}</tbody></table></div>`;
  const checks=(a.timedChecks||[]).map(x=>`<tr class="${x.status==='KONFLIK'?'tm47-clash':''}"><td>${tmEsc(x.day)}<small>${tmFmt(x.date)}</small></td><td>${tmEsc(x.task)}</td><td>${tmEsc(x.name)}</td><td>${tmEsc(x.expected)}</td><td><strong>${x.status==='KONFLIK'?'KELAS / KONFLIK':'Tiada Kelas'}</strong>${x.conflicts?.length?'<small>'+x.conflicts.map(v=>tmEsc(`${v.period} ${v.level} · ${v.className} (${v.from}–${v.to})`)).join('; ')+'</small>':''}</td></tr>`).join('');
  const cross=`<h3 class="tm47-subhead">Audit Silang W5 / Rehat / Pulang × Jadual PdPc</h3><div class="tm-table-scroll"><table class="tm47-table"><thead><tr><th>Hari</th><th>Tugasan</th><th>Guru</th><th>Semakan</th><th>Keputusan PdPc</th></tr></thead><tbody>${checks}</tbody></table></div>`;
  const warnings=(a.warnings||[]).map(w=>`<p class="tm-warning-line">${tmEsc(w)}</p>`).join('');
  root.innerHTML=summary+restTable+table+cross+warnings;
}
async function tm47Audit(){
  const args=tm4Input();if(!args.weekId)return tm4Message('Pilih minggu dahulu.',true);
  const result=await tmRun(()=>tmAPI('tm47Audit',args));if(!result)return;
  tmState.audit=result;tm47RenderAudit(result);
  tm4Message(`Audit siap: ${result.summary.checked} tugasan bermasa disemak · ${result.summary.pdpcConflicts} konflik PdPc · ${result.summary.restShortages} sesi rehat kurang petugas.`);
}


/* V5.1 P1: Firestore read-only subscriptions; never write to Firestore from client.
   Fallback remains the existing authenticated Fi-Sync backend. */
function tm51StopListening(){
  tm51.overviewStop?.();tm51.overviewStop=null;
  for(const stop of tm51.weekStops)stop();tm51.weekStops=[];
  tm51.schedule=null;tm51.audit=null;tm51.overview=null;tm51.year='';tm51.weekKey='';
}
function tm51SetStatus(status){const el=tm$('tm51-sync-status');if(el)el.textContent=status;}
async function tm51InitFirestore(){
  if(tm51.initStarted){tm51ListenOverview();tm51ListenWeek();return;}
  tm51.initStarted=true;
  try{
    const cfg=window.SeMAKMURFirebasePilotConfig;
    const [appmod,fire]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
    ]);
    const app=appmod.getApps().find(a=>a.name==='semakmur-fi-dashboard')||appmod.initializeApp(cfg,'semakmur-fi-dashboard');
    tm51.db=fire.getFirestore(app);tm51.fns=fire;
    tm51ListenOverview();tm51ListenWeek();
  }catch(err){tm51SetStatus('Bacaan Fi-Sync');console.warn('[TM51 Firestore disabled]',err);
    tmOverviewMeta();if(tmState.weekId)tmLoadDetail(false).catch(e=>console.warn('[TM51 fallback detail]',e));}
}
function tm51PopulateWeekSelector(){
  const el=tm$('tm51-week-select');if(!el)return;
  const weeks=tm51.overview?.year===tmState.year?tm51.overview.weeks:(tmState.data?.weeks||[]);
  const choices=tmPwaCompact()?tmPwaWeekChoices(weeks):(weeks||[]);
  const old=tmState.weekId;
  el.innerHTML='<option value="">Pilih minggu</option>'+choices.map(w=>
    `<option value="${tmEsc(w.ID_Minggu)}">Minggu ${tmEsc(w.Minggu)} · ${tmEsc(w.Nama_Kumpulan)}${tmPwaCompact()?'':' · '+tmPwaDate(w.Tempoh_Mula)}</option>`
  ).join('');
  const selected=choices.some(w=>w.ID_Minggu===old)?old:(tmPwaCompact()?choices[0]?.ID_Minggu||'':'');
  el.value=selected;
  if(tmPwaCompact()&&selected&&selected!==old)tm51ChooseScheduleWeek(selected);
  tm536Picker();
}
function tm51ChooseScheduleWeek(id){
  if(!id||!/^[A-Za-z0-9_-]{1,120}$/.test(id))return;
  if(id!==tmState.weekId)tmState.dutyFilter='';
  tmState.weekId=id;tmState.detail=null;tmState.calendar=null;
  tm51.schedule=null;tm51.audit=null;tm51.weekKey='';
  const week=(tm51.overview?.weeks||tmState.data?.weeks||[]).find(w=>w.ID_Minggu===id);
  tm$('tm-selection-tasks').innerHTML=week?`<strong>Minggu ${tmEsc(week.Minggu)} · ${tmEsc(week.Nama_Kumpulan)}</strong><small>${tmFmt(week.Tempoh_Mula)} hingga ${tmFmt(week.Tempoh_Tamat)}</small>`:'';
  tmRenderAssignments();tm51RenderAudit();tm51ListenWeek();
}
function tm51ApplyOverview(data){
  if(!data||data.year!==tmState.year||!tmState.data)return;
  const allowed=new Set((tmState.data.weeks||[]).map(w=>String(w.ID_Minggu)));
  const mapped=new Map((data.weeks||[]).filter(w=>allowed.has(String(w.ID_Minggu))).map(w=>[String(w.ID_Minggu),w]));
  tmState.data.weeks=(tmState.data.weeks||[]).map(w=>({...w,...(mapped.get(String(w.ID_Minggu))||{})}));
  tmState.overviewMeta=Object.fromEntries(Object.entries(data.metadata||{}).filter(([id])=>allowed.has(id)));
  tmRenderOverview();tm525MembersRender();tm51PopulateWeekSelector();tm536Picker();tm51SetStatus('Firestore · Langsung');
  window.SeMAKMUR_TM5_UI?.notifyOverview?.(tmState.overviewMeta);
}
function tm51ListenOverview(){
  if(!tm51.db||!tmState.user||!tmState.data)return;
  const year=tmState.year;
  if(tm51.year===year&&tm51.overviewStop){tm51ApplyOverview(tm51.overview);return;}
  tm51.overviewStop?.();tm51.overviewStop=null;tm51.year=year;tm51.overview=null;
  tm51.overviewStop=tm51.fns.onSnapshot(tm51.fns.doc(tm51.db,'semakmur_fi_tm51_overview',year),snap=>{
    if(tmState.year!==year)return;
    if(!snap.exists()){tm51SetStatus('Menunggu penerbitan Firestore');tmOverviewMeta();return;}
    const data=snap.data();if(!data.active||data.year!==year)return;
    tm51.overview=data;tm51ApplyOverview(data);
  },err=>{console.warn('[TM51 overview listener]',err?.code||err);tm51SetStatus('Fi-Sync · Cadangan');tmOverviewMeta();});
}
function tm51ListenWeek(){
  if(!tm51.db||!tmState.user)return;
  const year=tmState.year,weekId=String(tmState.weekId||'');
  const key=year+'_'+weekId;
  if(tm51.weekKey===key&&tm51.weekStops.length)return;
  for(const stop of tm51.weekStops)stop();tm51.weekStops=[];
  tm51.weekKey=key;tm51.schedule=null;tm51.audit=null;
  if(!/^20\d\d$/.test(year)||!/^[A-Za-z0-9_-]{1,120}$/.test(weekId))return;
  tm51.weekStops.push(tm51.fns.onSnapshot(tm51.fns.doc(tm51.db,'semakmur_fi_tm51_schedule',key),snap=>{
    if(tmState.year!==year||tmState.weekId!==weekId)return;
    tm51.schedule=snap.exists()&&snap.data().published===true?snap.data():null;
    tmRenderAssignments();tm51RenderAudit();
    if(!tm51.schedule&&tmState.tab==='tasks')tm51bFallbackDetail();
  },err=>{console.warn('[TM51 schedule listener]',err?.code||err);tm51SetStatus('Fi-Sync · Cadangan');}));
  tm51.weekStops.push(tm51.fns.onSnapshot(tm51.fns.doc(tm51.db,'semakmur_fi_tm51_audit',key),snap=>{
    if(tmState.year!==year||tmState.weekId!==weekId)return;
    tm51.audit=snap.exists()&&snap.data().published===true?snap.data():null;
    tm51RenderAudit();
  },err=>console.warn('[TM51 audit listener]',err?.code||err)));
}
function tm51SelectTab(value){
  tm51.tab=value==='audit'?'audit':'schedule';
  document.querySelectorAll('[data-tm51-subtab]').forEach(btn=>{
    const chosen=btn.dataset.tm51Subtab===tm51.tab;
    btn.classList.toggle('is-current',chosen);btn.setAttribute('aria-pressed',String(chosen));
  });
  tm$('tm51-schedule-view').hidden=tm51.tab!=='schedule';
  tm$('tm51-audit-view').hidden=tm51.tab!=='audit';
  if(tm51.tab==='audit')tm51RenderAudit();
}
function tm51RenderAudit(){
  const root=tm$('tm47-audit-result'),fairEl=tm$('tm4-fairness'),warnings=tm$('tm4-warning');
  if(!root||!fairEl)return;
  const schedule=tm51.schedule?.published&&tm51.schedule.weekId===tmState.weekId?tm51.schedule:null;
  const audit=tm51.audit?.published&&tm51.audit.weekId===tmState.weekId?tm51.audit:null;
  const names=Object.fromEntries([...(schedule?.week?.members||[]),
    ...(schedule?.assignments||[]).filter(a=>a.staff&&a.name).map(a=>({id:a.staff,name:a.name}))]
    .map(x=>[x.id,x.name]));
  const fairness=schedule?.fairness||{};
  fairEl.innerHTML=Object.entries(fairness).sort((a,b)=>(Number(a[1]?.weight)||0)-(Number(b[1]?.weight)||0)).map(([id,v])=>
    `<div class="tm4-fair"><span>${tmEsc(names[id]||id)}</span><strong>${Number(v.weight)||0} mata</strong><small>Rehat: ${Number(v.rest)||0} · Pagi: ${Number(v.morning)||0} · Berat: ${Number(v.heavy)||0} · Ringan: ${Number(v.light)||0} · Jumlah: ${Number(v.all)||0}</small></div>`
  ).join('')||'<p class="tm-empty">Jadual rasmi belum diterbitkan untuk minggu ini.</p>';
  warnings.innerHTML=(schedule?.warnings||[]).map(w=>`<p class="tm-warning-line">${tmEsc(w)}</p>`).join('');
  if(!audit||!schedule||audit.scheduleHash!==schedule.scheduleHash){
    root.innerHTML='<p class="tm-empty">Audit rasmi belum tersedia untuk minggu ini. Sistem akan menerbitkannya selepas jadual diselaraskan.</p>';return;
  }
  tm47RenderAudit(audit);
}

/* V5.2.6 — Empat kumpulan TERKINI sahaja, bukan sejarah mingguan. */
function tm525MembersRender(){
  const out=tm$('tm525-members-content'),stamp=tm$('tm526-members-updated');
  if(!out||!stamp)return;
  const overview=tm51.overview?.year===tmState.year?tm51.overview:null;
  const groups=Array.isArray(overview?.currentGroups)?overview.currentGroups:[];
  if(!groups.length){
    stamp.textContent='Menunggu penyegerakan terkini · Firestore 15 minit';
    out.innerHTML='<p class="tm-empty">Senarai terkini belum tersedia di Firestore. Senarai sejarah minggu tidak digunakan untuk paparan ini.</p>';
    return;
  }
  const iso=String(overview?.updatedAt||'');
  let updated='';try{if(iso&&!Number.isNaN(new Date(iso).getTime()))
    updated=new Intl.DateTimeFormat('ms-MY',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'2-digit',year:'numeric',
      hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(iso));}catch(e){}
  stamp.textContent='Kemaskini pada: '+(updated||'Belum direkodkan');
  const total=groups.reduce((n,g)=>n+(Array.isArray(g.members)?g.members.length:0),0);
  if(tmPwaCompact()&&tmState.tab==='members')tm536Picker();
  const shown=tmPwaCompact()?groups.filter(g=>String(g.id)===tm536Selection.group):groups;
  out.innerHTML=(tmPwaCompact()?'':`<div class="tm526-groups-intro"><strong>Keahlian kumpulan terkini</strong><span>${groups.length} kumpulan · ${total} ahli</span></div>`)+
    `<div class="tm526-groups-grid">${shown.map(g=>{
       const list=Array.isArray(g.members)?g.members:[];
       return `<section class="tm526-group" aria-label="${tmEsc(g.name||'Kumpulan '+g.id)}">
          <header class="tm526-group-head"><strong>${tmEsc(g.name||'Kumpulan '+g.id)}</strong><span>${list.length} ahli</span></header>
          <div class="tm526-group-members">${list.length?list.map((p,i)=>
            `<div class="tm526-group-member"><span class="tm526-member-num">${tmPwaCompact()?i+1:(i+1)+'.'}</span><span>${tmEsc(tmPwaCompact()?(p.nickname||p.shortName||p.name||''):(p.name||''))}</span></div>`
          ).join(''):'<p class="tm-empty">Tiada ahli aktif.</p>'}</div>
        </section>`;
    }).join('')}</div>`;
}
function tmListeners(){
  document.addEventListener('click',async e=>{
    const subtab=e.target.closest('[data-tm51-subtab]');if(subtab){tm51SelectTab(subtab.dataset.tm51Subtab);return;}
    const tab=e.target.closest('[data-tm-tab]');if(tab){tmTab(tab.dataset.tmTab);
      if(tab.dataset.tmTab==='report-studio'&&window.SeMAKMUR_TM5_UI)await window.SeMAKMUR_TM5_UI.resume?.();
      if(tab.dataset.tmTab==='smart'&&tmManager()&&!tmState.tm4WeeksLoaded){await tm4LoadWeeks(false);tmState.tm4WeeksLoaded=true;}
      if(tab.dataset.tmTab==='tasks'&&!tm51.schedule?.published)tm51bFallbackDetail();
      if(tab.dataset.tmTab==='members')tm525MembersRender();
      return;}
    const choose=e.target.closest('[data-tm-choose]');if(choose){await tmChoose(choose.dataset.tmChoose);return;}
    const draft=e.target.closest('[data-tm-draft]');if(draft){await tmDraft(draft.dataset.tmDraft);return;}
    const edTask=e.target.closest('[data-edit-task]');if(edTask){tmEditTask(edTask.dataset.editTask);return;}
    const edTime=e.target.closest('[data-edit-time]');if(edTime){tmEditTime(edTime.dataset.editTime);return;}
    const cancel=e.target.closest('[data-tm47-cancel]');if(cancel){await tm47CancelAbsence(cancel.dataset.tm47Cancel);return;}
  });
  tm$('tm51-week-select').addEventListener('change',e=>tm51ChooseScheduleWeek(e.target.value));
  tm$('tm536-week-select')?.addEventListener('change',e=>{
    if(tmState.tab==='tasks'){
      if(e.target.value){tm$('tm51-week-select').value=e.target.value;tm51ChooseScheduleWeek(e.target.value);}
    }
  });
  tm$('tm537-overview-week-select')?.addEventListener('change',e=>{
    tm536Selection.week=e.target.value||'';
    const cards=tm$('tm-pwa-week-cards');
    const card=[...(cards?.querySelectorAll('[data-tm-week-card]')||[])].find(x=>x.dataset.tmWeekCard===tm536Selection.week);
    if(card)card.scrollIntoView({behavior:'smooth',block:'start'});
  });
  tm$('tm536-group-select')?.addEventListener('change',e=>{
    tm536Selection.group=e.target.value||'';tm525MembersRender();
  });
  tm$('tm-pwa-day-select')?.addEventListener('change',e=>{if(e.target.value)tmDutySetFilter(e.target.value);});
  tm$('tm-year').addEventListener('change',async()=>{tm51StopListening();tmState.year=tm$('tm-year').value;tmState.weekId='';tm49.ready=false;tm51bReset();window.SeMAKMUR_TM5_UI?.clearCache?.();await tmBootstrap();
    if(tmState.tab==='report-studio')await window.SeMAKMUR_TM5_UI?.reload?.();});
  tm$('tm-refresh').addEventListener('click',()=>{tm51bReset();window.SeMAKMUR_TM5_UI?.clearCache?.();tmBootstrap();});
  tm$('tm-day-date').addEventListener('change',tmRenderSections);
  tm$('tm-day-section').addEventListener('change',tmRestoreOwnEntry);
  tm$('tm-daily-form').addEventListener('submit',tmSaveDaily);
  tm$('tm-weekly-form').addEventListener('submit',e=>{e.preventDefault();tmSaveWeekly(true);});
  tm$('tm-weekly-draft').addEventListener('click',()=>tmSaveWeekly(false));
  tm$('tm-review-accept').addEventListener('click',()=>tmReview('DISEMAK'));
  tm$('tm-review-return').addEventListener('click',()=>tmReview('DIPULANGKAN'));
  tm$('tm-print').addEventListener('click',tmPrint);
  tm$('tm-preflight').addEventListener('click',tmPreflight);tm$('tm-print-schedule-live').addEventListener('click',tmPrintScheduleOfficial);
  tm$('tm-sim-preview').addEventListener('click',tmPreviewSimulation);
  tm$('tm-seed').addEventListener('click',tmSeed);
  tm$('tm4-mode').addEventListener('change',()=>tm4LoadWeeks(true));
  tm$('tm4-week').addEventListener('change',async()=>{await tm48LoadMembers();await tm4LoadSchedule();});
  tm$('tm49-open-from-smart').addEventListener('click',async()=>{const x=tm4Input();if(!x.weekId){tm4Message('Pilih minggu dahulu.',true);return;}
    tmTab('report-studio');tm49ModeOptions();tm$('tm49-mode').value=x.mode;await tm49LoadWeeks(x.weekId);});
  tm$('tm4-load').addEventListener('click',tm4LoadSchedule);
  tm$('tm4-generate').addEventListener('click',tm4Generate);
  tm$('tm4-repair').addEventListener('click',tm4Repair);
  tm$('tm4-rebalance').addEventListener('click',tm46Rebalance);
  tm$('tm4-publish').addEventListener('click',tm4Publish);
  tm$('tm4-absence-form').addEventListener('submit',tm4RecordAbsence);
  tm$('tm4-calendar-form').addEventListener('submit',tm4Calendar);

  tm$('tm4-absence-reason').addEventListener('change',()=>{const v=tm$('tm4-absence-reason').value; if(v==='URUSAN_RASMI_DALAM')tm$('tm4-absence-location').value='DALAM_SEKOLAH';else if(['URUSAN_RASMI_LUAR','CRK','CTR','MC','KECEMASAN'].includes(v))tm$('tm4-absence-location').value='LUAR_SEKOLAH';});
  tm$('tm-task-form').addEventListener('submit',tmSaveTask);
  tm$('tm-task-name').addEventListener('change',tm43UpdateTaskMode);
  tm$('tm-time-task').addEventListener('change',tm43SyncTimeForm);
  tm$('tm-time-form').addEventListener('submit',tmSaveTime);
  tm$('tm-task-cancel').addEventListener('click',()=>{tm$('tm-task-form').reset();tm$('tm-task-id').value='';tm$('tm-task-time-required').value='YA';});
  tm$('tm-time-cancel').addEventListener('click',()=>{tm$('tm-time-form').reset();tm$('tm-time-id').value='';tm43SyncTimeForm();});
  tm$('tm-time-effective').value=tmState.year+'-01-01';tm43SyncTimeForm();tm49Install();
}
async function tmInit(){tmListeners();tmTab('overview');
  setInterval(()=>{if(tmState.data)tmPwaRenderWeeks();},60000);tmNotice('Menyemak akaun Google MOE dan peranan…');
  try{
    const cfg=window.SeMAKMURFirebasePilotConfig;if(!cfg?.projectId)throw Error('Konfigurasi Firebase belum tersedia.');
    const [appMod,authMod]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')]);
    const fb=appMod.getApps().find(x=>x.name==='semakmur-fi-dashboard')||appMod.initializeApp(cfg,'semakmur-fi-dashboard');
    tmState.auth=authMod.getAuth(fb);
    authMod.onAuthStateChanged(tmState.auth,async user=>{
      if(tm51b.authUid!==String(user?.uid||'')){
        tm51bReset();tm51StopListening();window.SeMAKMUR_TM5_UI?.resetAccount?.();
        tmState.detail=null;tmState.data=null;tmTab('overview');
        for(const id of ['tm-tab-settings','tm-preflight','tm-sim-area','tm4-tab']){
          const el=tm$(id);if(el)el.hidden=true;
        }
      }
      tm51b.authUid=String(user?.uid||'');tmState.user=user;
      try{
        if(!user){tmNotice('Akaun belum log masuk. Sila kembali ke Fi-LoginSession melalui Dashboard Guru.',true);tmSignal('semakmur-tm-error');return;}
        await tmBootstrap();
      }catch(e){console.error('[TM auth]',e);tmNotice('Gagal memuatkan modul: '+(e.message||String(e)),true);tmSignal('semakmur-tm-error');}
      finally{tmProcess('startup',false);}
    },err=>{tmProcess('startup',false);tmNotice('Firebase Authentication gagal: '+(err.message||err),true);tmSignal('semakmur-tm-error');});
  }catch(e){tmProcess('startup',false);tmNotice('Sambungan modul gagal: '+(e.message||String(e)),true);tmSignal('semakmur-tm-error');}
}
/* V4.9 Laporan & Cetakan: additive, does not modify the V4.8 duty engine. */
const tm49={mode:'',weekId:'',year:'',date:'',weeks:[],data:null,dirty:false,dailyDirty:false,weeklyDirty:false,ready:false};
const tm49Names=()=>Object.fromEntries((tm49.data?.members||[]).map(x=>[x.id,x.name]));
const tm49Status=()=>String(tm49.data?.weekly?.status||'BELUM DIISI');
const tm49Input=()=>({mode:tm49.mode,weekId:tm49.weekId,year:tmState.year});
const tm49SectionForDay=(s,day)=>!s.day||String(s.day).toUpperCase()==='SEMUA'||String(s.day).toUpperCase()===String(day).toUpperCase();
const tm49DayName=d=>tm49.data?.days?.find(x=>x.date===d)?.day||tmDayName(d);
function tm49Message(message,bad=false){
  const e=tm$('tm49-info');if(!e)return;e.textContent=message||'';e.classList.toggle('tm49-error',bad);
}
function tm49ModeOptions(){
  const select=tm$('tm49-mode');if(!select)return;
  const maySim=tmManager(),val=tm49.ready?select.value:((tmState.data?.weeks||[]).length?'RASMI':'SIMULASI');
  select.innerHTML='<option value="RASMI">Rasmi (Takwim Sekolah)</option>'+
    (maySim?'<option value="SIMULASI">SIMULASI — Ujian sahaja</option>':'');
  select.value=maySim?(val==='RASMI'?'RASMI':'SIMULASI'):'RASMI';
  tm49.mode=select.value;
}
async function tm49Ensure(){
  if(!tmState.data)return;
  tm49ModeOptions();
  if(!tm49.ready||tm49.year!==tmState.year||tm49.mode!==tm$('tm49-mode').value){
    tm49.year=tmState.year;tm49.ready=true;await tm49LoadWeeks();
  }
}
async function tm49LoadWeeks(preferred){
  const mode=tm$('tm49-mode').value;
  tm49.mode=mode;tm49.data=null;tm49.dirty=false;tm49.dailyDirty=false;tm49.weeklyDirty=false;
  let weeks=[];
  if(mode==='SIMULASI'){
    const r=await tmRun(()=>tmAPI('tm4SimList'));if(!r)return;
    weeks=(r.weeks||[]).map(w=>({id:w.id,label:w.label,from:w.from,to:w.to,group:w.group}));
  }else{
    weeks=(tmState.data?.weeks||[]).map(w=>({id:w.ID_Minggu,label:w.Minggu||w.ID_Minggu,from:w.Tempoh_Mula,
      to:w.Tempoh_Tamat,group:w.Nama_Kumpulan||w.ID_Kumpulan}));
  }
  tm49.weeks=weeks;
  const sel=tm$('tm49-week'),last=preferred||tm49.weekId;
  sel.innerHTML='<option value="">Pilih minggu bertugas…</option>'+weeks.map(w=>
    `<option value="${tmEsc(w.id)}">${tmEsc(w.label)} · ${tmFmt(w.from)} · ${tmEsc(w.group)}</option>`).join('');
  tm49.weekId=weeks.some(w=>w.id===last)?last:(weeks[0]?.id||'');sel.value=tm49.weekId;
  if(tm49.weekId)await tm49Load();else tm49Message('Tiada minggu untuk mod ini. Jika takwim rasmi kosong, gunakan simulasi pentadbir.',true);
}
async function tm49Load(){
  const weekId=tm$('tm49-week').value;if(!weekId)return;
  if(tm49.dirty&&!await tm5318Confirm('Catatan belum disimpan. Teruskan dan buang perubahan ini?')){
    tm$('tm49-week').value=tm49.weekId;return;
  }
  tm49.weekId=weekId;tm49.dirty=false;tm49.dailyDirty=false;tm49.weeklyDirty=false;
  const result=await tmRun(()=>tmAPI('tm49Load',tm49Input()));
  if(!result){tm49Message('Gagal membaca laporan.',true);return;}
  tm49.data=result;tm49Render();
  tm49Message(result.mode==='SIMULASI'?'Mod simulasi: catatan tidak masuk laporan rasmi dan tidak dihantar kepada Guru Besar.':
    'Mod rasmi: setiap catatan direkod di bawah akaun Google MOE pengguna.');
}
function tm49Render(){
  const d=tm49.data;if(!d)return;
  const demo=d.mode==='SIMULASI',names=tm49Names();
  tm$('tm49-banner').textContent=demo?'SIMULASI — BUKAN LAPORAN RASMI':'LAPORAN RASMI';
  tm$('tm49-banner').classList.toggle('tm49-demo',demo);
  tm$('tm49-title').textContent=`${d.week.label} · Kumpulan ${d.week.group} · ${tmFmt(d.week.from)} – ${tmFmt(d.week.to)}`;
  tm$('tm49-leader').textContent='Ketua: '+(names[d.week.leader]||d.week.leader||'Belum ditetapkan');
  const sections=d.sections||[],entries=d.entries||[],has=d.days||[];
  tm$('tm49-progress').innerHTML=`<div><strong>${has.length}</strong><span>Hari sekolah</span></div>`+
    `<div><strong>${new Set(entries.map(x=>x.date)).size}</strong><span>Hari ada laporan</span></div>`+
    `<div><strong>${entries.length}</strong><span>Catatan</span></div>`+
    `<div><strong>${tmEsc(tm49Status())}</strong><span>Status mingguan</span></div>`;
  const oldDate=tm$('tm49-date').value;
  tm$('tm49-date').innerHTML=has.map(x=>`<option value="${tmEsc(x.date)}">${tmEsc(x.day)} · ${tmFmt(x.date)}</option>`).join('');
  if(has.some(x=>x.date===oldDate))tm$('tm49-date').value=oldDate;
  tm49.date=tm$('tm49-date').value;
  const status=tm49Status();
  const writable=(demo?d.actor.manager:d.members.some(x=>x.id===d.actor.id))&&
    !['DIHANTAR','DISEMAK','SIM_DIHANTAR','SIM_DISEMAK'].includes(status)&&!!d.planId;
  tm$('tm49-save-day').disabled=!writable;
  tm$('tm49-blocked').textContent=!d.planId?'Jadual/pelan belum dijana untuk minggu ini. Sediakan pelan dahulu.':
    !writable?'Laporan terkunci atau akaun ini tidak mempunyai akses menyunting.':'';
  tm49RenderDay();tm49RenderWeek();
}
function tm49RenderDay(){
  const d=tm49.data;if(!d)return;
  const date=tm$('tm49-date').value,day=tm49DayName(date),own=d.actor.id,names=tm49Names();
  const sect=(d.sections||[]).filter(s=>tm49SectionForDay(s,day)),entries=(d.entries||[]).filter(e=>e.date===date);
  const locked=!d.planId||['DIHANTAR','DISEMAK','SIM_DIHANTAR','SIM_DISEMAK'].includes(tm49Status())||
    (d.mode==='SIMULASI'?!d.actor.manager:!d.members.some(x=>x.id===own));
  tm$('tm49-sections').innerHTML=sect.length?sect.map((s,i)=>{
    const ownEntry=entries.find(e=>e.section===s.id&&e.author===own),other=entries.filter(e=>e.section===s.id&&e.author!==own);
    return `<div class="tm49-section"><div class="tm49-section-head"><strong>${i+1}. ${tmEsc(s.name)}</strong>`+
       `${s.day&&String(s.day).toUpperCase()!=='SEMUA'?'<span class="tm49-daybadge">'+tmEsc(s.day)+'</span>':''}</div>`+
       `<textarea class="tm49-textarea" data-tm49-section="${tmEsc(s.id)}" rows="3" maxlength="3000" ${locked?'disabled':''}`+
       ` placeholder="Tulis pemerhatian, isu, tindakan atau aktiviti yang berlaku…">${tmEsc(ownEntry?.text||'')}</textarea>`+
       (other.length?`<div class="tm49-other"><b>Catatan ahli lain</b>${other.map(e=>
         `<p><strong>${tmEsc(names[e.author]||e.author)}:</strong> ${tmEsc(e.text)}</p>`).join('')}</div>`:'')+'</div>';
  }).join(''):'<p class="tm-empty">Tiada bahagian laporan aktif untuk tarikh ini. Semak TM_Tetapan_Laporan.</p>';
  tm$('tm49-save-day').disabled=locked||!sect.length;
  tm$('tm49-day-summary').textContent=`${entries.length} catatan direkod pada ${day} · ${tmFmt(date)}. Bahagian kosong tidak memadam catatan lama.`;
}
function tm49RenderWeek(){
  const d=tm49.data;if(!d)return;
  const w=d.weekly||{},s=tm49Status(),isLeader=!!d.actor.isLeader,locked=['DIHANTAR','DISEMAK','SIM_DIHANTAR','SIM_DISEMAK'].includes(s);
  tm$('tm49-weekly-status').textContent=s;
  tm$('tm49-summary').value=w.summary||'';tm$('tm49-followup').value=w.followup||'';
  tm$('tm49-summary').disabled=!isLeader||locked||!d.planId;tm$('tm49-followup').disabled=!isLeader||locked||!d.planId;
  tm$('tm49-save-week').disabled=!isLeader||locked||!d.planId;
  tm$('tm49-submit-week').disabled=!isLeader||locked||!d.planId;
  tm$('tm49-submit-week').textContent=d.mode==='SIMULASI'?'Hantar (Simulasi sahaja)':'Hantar kepada Guru Besar';
  const reviewReady=s===(d.mode==='SIMULASI'?'SIM_DIHANTAR':'DIHANTAR');
  tm$('tm49-review-box').hidden=!(reviewReady&&(d.mode==='SIMULASI'?d.actor.manager:d.actor.isGB));
  tm$('tm49-gb-comment').textContent=w.review?'Ulasan semakan: '+w.review:'';
}
async function tm49SaveDay(e){
  e.preventDefault();if(!tm49.data?.planId)return tm49Message('Jana pelan minggu terlebih dahulu.',true);
  if(tm49.weeklyDirty)return tm49Message('Simpan Draf Ulasan Mingguan dahulu sebelum menyimpan catatan harian.',true);
  const date=tm$('tm49-date').value,items=[...tm$('tm49-sections').querySelectorAll('[data-tm49-section]')]
    .map(x=>({section:x.dataset.tm49Section,text:x.value})).filter(x=>x.text.trim());
  if(!items.length)return tm49Message('Isi sekurang-kurangnya satu catatan.',true);
  const r=await tmRun(()=>tmAPI('tm49SaveDay',{...tm49Input(),date,items}));if(!r)return;
  tm49.dirty=false;tm49.dailyDirty=false;await tm49Load();tm49Message(`${r.saved} bahagian laporan harian disimpan. Catatan ahli lain tidak berubah.`);
}
async function tm49SaveWeek(submit){
  if(tm49.dailyDirty)return tm49Message('Simpan catatan harian dahulu sebelum menyimpan Ulasan Mingguan.',true);
  if(submit&&!await tm5318Confirm(tm49.mode==='SIMULASI'?'Hantar laporan simulasi untuk ujian? Tiada makluman rasmi dihantar kepada GB.':
    'Hantar laporan mingguan kepada Guru Besar? Selepas dihantar, penyuntingan dikunci.'))return;
  const r=await tmRun(()=>tmAPI('tm49SaveWeek',{...tm49Input(),summary:tm$('tm49-summary').value,
    followup:tm$('tm49-followup').value,submit}));if(!r)return;
  tm49.dirty=false;tm49.dailyDirty=false;tm49.weeklyDirty=false;await tm49Load();tm49Message(submit?(tm49.mode==='SIMULASI'?'Status penghantaran simulasi direkod; tiada tindakan GB sebenar.':
    'Laporan dihantar kepada Guru Besar.'):'Draf ulasan ketua disimpan.');
}
async function tm49Review(decision){
  const txt=tm$('tm49-review-note').value;
  if(!await tm5318Confirm('Simpan keputusan semakan '+decision+'?'))return;
  const r=await tmRun(()=>tmAPI('tm49Review',{...tm49Input(),decision,note:txt}));if(!r)return;
  await tm49Load();tm49Message(tm49.mode==='SIMULASI'?'Keputusan semakan simulasi disimpan.':'Keputusan semakan GB disimpan.');
}
function tm49PrintStyles(kind){return `
  @page{size:${kind==='schedule'?'A4 landscape':'A4 portrait'};margin:14mm 13mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1d2d23;font-size:10pt;margin:0;line-height:1.48}
  .printhead{border-bottom:3px solid #244e39;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;gap:18px}
  .printhead h1{font-size:15pt;margin:0 0 3px}.printhead h2{font-size:11pt;margin:0;font-weight:600;color:#4b6254}
  .small{font-size:8pt;color:#526457}.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;background:#f2f5ef;border:1px solid #dce5d9;padding:9px 10px;margin-bottom:12px}
  h3{font-size:11pt;color:#1d4b35;margin:18px 0 7px;border-bottom:1px solid #c7d4c9;padding-bottom:5px}h4{font-size:9.6pt;margin:8px 0 2px}
  table{border-collapse:collapse;width:100%;font-size:9pt}th,td{border:1px solid #cad6ca;padding:6px 7px;vertical-align:top;text-align:left}th{background:#e9efe8}
  .tm49-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;break-after:page;page-break-after:always}.tm49-pair:last-child{break-after:auto;page-break-after:auto}
  .tm49-pair .daypage{min-width:0}.tm49-pair table{font-size:8pt}.tm49-pair th,.tm49-pair td{padding:5px 6px}
  .daypage{break-inside:avoid;page-break-inside:avoid;margin-bottom:14px}.notebox{margin:7px 0;page-break-inside:avoid;break-inside:avoid;padding:6px 9px;border-left:3px solid #a8bdaa;background:#f9fbf8}
  .notebox p{white-space:pre-wrap;overflow-wrap:anywhere;margin:2px 0}.notebox small{color:#607062}.watermark{color:#a33a2b;font-weight:bold;font-size:10pt;letter-spacing:.05em}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:28px}.sign>div{padding-top:28px;border-top:1px solid #444;font-size:9pt}
  .printbar{padding:10px;background:#fffde7;margin-bottom:15px;border:1px solid #d8c779}
  @media print{.printbar{display:none}}`;
}
function tm49PrintHeader(data,title){
  const w=data.week,names=tm49Names(),sim=data.mode==='SIMULASI',draft=!['DIHANTAR','DISEMAK'].includes(String(data.weekly?.status||'').toUpperCase());
  return `<div class="printhead"><div><h1>SK SEGAMBUT MAKMUR</h1><h2>${tmEsc(title)}</h2></div><div class="small">SeMAKMUR I-System<br>${sim?'<span class="watermark">SIMULASI · BUKAN RASMI</span>':(draft?'<span class="watermark">DRAF · BELUM DISAHKAN</span>':'DOKUMEN SEKOLAH')}</div></div>`+
    `<div class="meta"><div><b>Sesi:</b> ${tmEsc(tmState.year)}</div><div><b>Minggu:</b> ${tmEsc(w.label)}</div>`+
    `<div><b>Kumpulan:</b> ${tmEsc(w.group)}</div><div><b>Tarikh:</b> ${tmFmt(w.from)} – ${tmFmt(w.to)}</div>`+
    `<div><b>Ketua:</b> ${tmEsc(names[w.leader]||w.leader||'Belum ditetapkan')}</div><div><b>Status:</b> ${tmEsc(data.weekly?.status||'DRAF')}</div></div>`;
}
function tm49ScheduleBody(data){
  const valid=data.assignments||[],dates=data.days||[];
  const cards=dates.map(day=>{
    const rows=valid.filter(x=>x.date===day.date),groups=new Map();
    rows.forEach(x=>{const task=x.taskName||x.task||'Tugasan';if(!groups.has(task))groups.set(task,[]);
      groups.get(task).push(x.name||tm49Names()[x.staff]||x.staff||'PERLU TINDAKAN');});
    return `<section class="daypage"><h4>${tmEsc(day.day)} · ${tmFmt(day.date)}</h4><table><thead><tr><th style="width:40%">Tugasan</th><th>Guru Bertugas</th></tr></thead><tbody>`+
      ([...groups].map(([task,names])=>`<tr><td>${tmEsc(task)}</td><td>${names.map(tmEsc).join('<hr style="border:0;border-top:1px dotted #d1ddd1;margin:3px 0">')}</td></tr>`).join('')||
      '<tr><td colspan="2">Tiada agihan / hari cuti / pelan belum dijana</td></tr>')+'</tbody></table></section>';
  });
  const pairs=[];for(let i=0;i<cards.length;i+=2)pairs.push(`<div class="tm49-pair">${cards.slice(i,i+2).join('')}</div>`);
  return `<h3>Jadual Agihan Mengikut Hari</h3>`+pairs.join('');
}

function tm49DailyBody(data,onlyDate){
  const members=tm49Names(),sec=Object.fromEntries((data.sections||[]).map(x=>[x.id,x.name]));
  const days=(data.days||[]).filter(x=>!onlyDate||x.date===onlyDate);
  return days.map(day=>{
    const entries=(data.entries||[]).filter(x=>x.date===day.date);
    const grouped=new Map();entries.forEach(x=>{if(!grouped.has(x.section))grouped.set(x.section,[]);grouped.get(x.section).push(x);});
    const bodies=[...grouped].map(([section,group])=>`<div class="notebox"><h4>${tmEsc(sec[section]||section)}</h4>`+
      group.map(x=>`<p>${tmEsc(x.text)}</p><small>Dicatat oleh: ${tmEsc(members[x.author]||x.author)}</small>`).join('')+'</div>').join('');
    return `<section class="daypage"><h3>${tmEsc(day.day)} · ${tmFmt(day.date)}</h3>${bodies||'<p>Belum ada catatan pada hari ini.</p>'}</section>`;
  }).join('');
}
function tm49WeeklyBody(data){const w=data.weekly||{};
  return `<h3>Ulasan Keseluruhan Ketua</h3><p>${tmEsc(w.summary||'Belum diisi.').replace(/\n/g,'<br>')}</p>`+
    `<h3>Cadangan & Tindakan Susulan</h3><p>${tmEsc(w.followup||'—').replace(/\n/g,'<br>')}</p>`+
    `<h3>Semakan Guru Besar</h3><p>${tmEsc(w.review||'Belum disemak.').replace(/\n/g,'<br>')}</p>`+
    `<div class="sign"><div>Disediakan oleh<br>Ketua Guru Bertugas</div><div>Disemak oleh<br>Guru Besar</div></div>`;
}
function tm49Print(kind){
  const d=tm49.data;if(!d)return tm49Message('Muatkan laporan minggu dahulu.',true);
  const date=tm$('tm49-date').value;
  const titles={schedule:'JADUAL GURU BERTUGAS MINGGUAN',day:'LAPORAN HARIAN GURU BERTUGAS',week:'LAPORAN GURU BERTUGAS MINGGUAN'};
  let body='';if(kind==='schedule')body=tm49ScheduleBody(d);
  else if(kind==='day')body=tm49DailyBody(d,date);
  else if(kind==='week')body=tm49DailyBody(d)+tm49WeeklyBody(d);
  else return;
  const html=`<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>${titles[kind]} — ${tmEsc(d.week.label)}</title>`+
    `<style>${tm49PrintStyles(kind)}</style></head><body><div class="printbar">Pratonton A4 · Tekan <b>Ctrl+P</b> atau klik Cetak. `+
    `<button onclick="window.print()">Cetak / Simpan PDF</button></div>${tm49PrintHeader(d,titles[kind])}${body}</body></html>`;
  const win=window.open('','_blank');
  if(!win)return tm49Message('Pop-up cetakan disekat. Benarkan tetingkap baharu untuk laman ini.',true);
  win.opener=null;win.document.open();win.document.write(html);win.document.close();win.focus();
}
function tm49Install(){
  tm$('tm49-mode').addEventListener('change',async()=>{
    if(tm49.dirty&&!await tm5318Confirm('Ada perubahan laporan yang belum disimpan. Tukar mod?')){tm$('tm49-mode').value=tm49.mode;return;}
    tm49.dirty=false;await tm49LoadWeeks();
  });
  tm$('tm49-week').addEventListener('change',tm49Load);
  tm$('tm49-date').addEventListener('change',async()=>{
    if(tm49.dirty&&!await tm5318Confirm('Perubahan belum disimpan. Tukar tarikh?')){tm$('tm49-date').value=tm49.date;return;}
    tm49.date=tm$('tm49-date').value;tm49.dirty=false;tm49RenderDay();
  });
  tm$('tm49-sections').addEventListener('input',()=>{tm49.dirty=true;tm49.dailyDirty=true;});
  tm$('tm49-summary').addEventListener('input',()=>{tm49.dirty=true;tm49.weeklyDirty=true;});
  tm$('tm49-followup').addEventListener('input',()=>{tm49.dirty=true;tm49.weeklyDirty=true;});
  tm$('tm49-save-day').addEventListener('click',tm49SaveDay);
  tm$('tm49-save-week').addEventListener('click',()=>tm49SaveWeek(false));
  tm$('tm49-submit-week').addEventListener('click',()=>tm49SaveWeek(true));
  tm$('tm49-review-accept').addEventListener('click',()=>tm49Review('DISEMAK'));
  tm$('tm49-review-return').addEventListener('click',()=>tm49Review('DIPULANGKAN'));
  tm$('tm49-print-day').addEventListener('click',()=>tm49Print('day'));
  tm$('tm49-print-week').addEventListener('click',()=>tm49Print('week'));
  tm$('tm49-print-schedule').addEventListener('click',()=>tm49Print('schedule'));
  tm$('tm49-refresh').addEventListener('click',tm49Load);
}

// Existing authentication and page boot remain unchanged.
tmInit();

/* V5 auth bridge: uses the existing Fi token, nonce and validated Web App response. */
window.SeMAKMUR_TM5_API = function(payload){return tmAPI(payload.op,payload);};


/* SeMAKMUR TM V5.0.8: laporan live, direktori, pratonton dokumen dan cetak manual. */
  // V5.2.3: Penomboran huraian hanya dalam borang desktop (rasmi dan mod ujian).
  // Kandungan disimpan sebagai teks bernombor supaya pratonton/cetakan konsisten.
  function tm523Renumber_(value){
    const lines=String(value||'').replace(/\r/g,'').split('\n');
    if(lines.every(line=>!line.replace(/^\s*\d+[.)]\s*/, '').trim()))return '';
    return lines.map((line,i)=>`${i+1}. ${line.replace(/^\s*\d+[.)]\s*/, '').replace(/^\s+/, '')}`).join('\n');
  }
  function tm523BindNumbering_(host){
    if(!host||host.dataset.tm523Bound==='true')return;
    host.dataset.tm523Bound='true';
    host.addEventListener('focusin',ev=>{
      const el=ev.target;if(!el.matches?.('textarea[data-tm-numbered]')||el.disabled)return;
      const formatted=tm523Renumber_(el.value);
      if(!formatted){el.value='1. ';el.setSelectionRange(el.value.length,el.value.length);}
      else if(formatted!==el.value){el.value=formatted;el.setSelectionRange(el.value.length,el.value.length);}
    });
    host.addEventListener('keydown',ev=>{
      const el=ev.target;if(!el.matches?.('textarea[data-tm-numbered]')||el.disabled||ev.key!=='Enter'||ev.isComposing||ev.ctrlKey||ev.altKey||ev.metaKey)return;
      ev.preventDefault();
      // Popup edit is a child of the demo form. Prevent its Enter event from
      // reaching the second (outer) delegated numbering handler.
      ev.stopPropagation();
      const selectionStart=el.selectionStart;
      const selectionEnd=el.selectionEnd;
      const before=el.value.slice(0,selectionStart);
      const after=el.value.slice(selectionEnd);
      const cursorLine=before.split('\n').length;
      const raw=(before+'\n'+after).split('\n');
      const numbered=raw.map((line,i)=>`${i+1}. ${line.replace(/^\s*\d+[.)]\s*/, '').replace(/^\s+/, '')}`);
      el.value=numbered.join('\n');
      // The cursor belongs immediately after the NEW number, not two rows down.
      const position=numbered.slice(0,cursorLine).reduce((acc,line)=>acc+line.length+1,0)+`${cursorLine+1}. `.length;
      el.setSelectionRange(position,position);
      el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    host.addEventListener('input',ev=>{
      const el=ev.target;if(!el.matches?.('textarea[data-tm-numbered]'))return;
      if(ev.inputType==='insertFromPaste'||ev.inputType==='insertFromDrop'){
        el.value=tm523Renumber_(el.value)||'';el.setSelectionRange(el.value.length,el.value.length);
      }
    });
    host.addEventListener('focusout',ev=>{
      const el=ev.target;if(!el.matches?.('textarea[data-tm-numbered]'))return;
      const numbered=tm523Renumber_(el.value);
      if(numbered!==el.value)el.value=numbered;
    });
  }
  function tm523Narrative_(key,text,prompt,attr=''){
    return `<textarea class="tm53-numbered" data-tm-numbered ${attr} ${key} rows="3" maxlength="3000" placeholder="1. ${tmEsc(prompt)}">${tmEsc(text||'')}</textarea>`;
  }
  function tm523VisitorLabels_(host,selector){
    const items=[...host.querySelectorAll(selector)];
    items.forEach((item,i)=>{
      const lab=item.querySelector('label');if(!lab)return;
      // Label mengandungi input, jadi hanya ubah node teksnya.
      const node=[...lab.childNodes].find(x=>x.nodeType===3);
      if(node)node.textContent=i===0?'Nama Pelawat 1':'Nama Pelawat';
    });
  }

/* V5.3.3: Pandu pengguna ke medan wajib yang belum lengkap (desktop sahaja). */
function tm533ClearFieldErrors(root){
  if(!root)return;
  root.querySelectorAll('.tm533-field-error').forEach(e=>e.remove());
  root.querySelectorAll('.tm533-invalid').forEach(e=>{e.classList.remove('tm533-invalid');e.removeAttribute('aria-invalid');});
  root.querySelectorAll('.tm533-invalid-section').forEach(e=>e.classList.remove('tm533-invalid-section'));
}
function tm533Invalid(root,control,message='Sila lengkapkan bahagian ini.'){
  if(!root||!control)return false;
  tm533ClearFieldErrors(root);
  tm5313RevealInvalid(control);
  const group=control.closest('[data-pair],[data-dem-pair],.tm53-field,.tm53-repeat-item,.tm5-field')||control.closest('label')||control.parentElement;
  control.classList.add('tm533-invalid');control.setAttribute('aria-invalid','true');
  group?.closest('.tm53-form-section')?.classList.add('tm533-invalid-section');
  const label=control.closest('label')||group;
  const note=document.createElement('p');note.className='tm533-field-error';note.setAttribute('role','alert');note.textContent=message;
  (label||control).insertAdjacentElement('afterend',note);
  const scrollPane=control.closest('.tm524-modal,.tm524-demo-modal');
  if(scrollPane){
    const target=group||control, a=target.getBoundingClientRect(),b=scrollPane.getBoundingClientRect();
    scrollPane.scrollTo({top:scrollPane.scrollTop+a.top-b.top-105,behavior:'smooth'});
  }else control.scrollIntoView({behavior:'smooth',block:'center'});
  try{control.focus({preventScroll:true});}catch(_){control.focus();}
  return false;
}
function tm533BindClear(root){
  if(!root||root.dataset.tm533ClearBound)return;
  root.dataset.tm533ClearBound='1';
  const clear=event=>{
    const el=event.target;
    if(!el?.classList?.contains('tm533-invalid'))return;
    el.classList.remove('tm533-invalid');el.removeAttribute('aria-invalid');
    const group=el.closest('[data-pair],[data-dem-pair],.tm53-field,.tm53-repeat-item,.tm5-field')||el.closest('label');
    group?.querySelectorAll('.tm533-field-error').forEach(x=>x.remove());
    group?.closest('.tm53-form-section')?.classList.remove('tm533-invalid-section');
  };
  root.addEventListener('input',clear);root.addEventListener('change',clear);
}

(()=>{'use strict';
  const panel=document.getElementById('tm-panel-report-studio');if(!panel)return;
  [...panel.children].forEach(el=>el.hidden=true);
  const root=document.createElement('div');root.id='tm5-root';panel.append(root);
  const S={weeks:[],week:null,days:[],actor:null,teachers:[],corrections:[],current:null,reportStop:null,reportListenKey:'',forceBackendOnce:false,
    chosen:'',screen:'fill',mobileDetail:false,loaded:false,request:0,previewOrigin:'directory',directoryAt:0,
    directoryPending:null,reportCache:new Map(),reportPending:new Map(),reportAt:0,activeYear:'',dirty:false,modalRoot:null};
  const TM51B_TTL=120000;
  const reporterKey=(w,year)=>String(tmState.user?.uid||'')+'|'+String(year)+'|'+String(w);
  function clearReportCache(){S.directoryAt=0;S.loaded=false;S.directoryPending=null;
    S.reportCache.clear();S.reportPending.clear();S.activeYear='';}
  function resetAccount(){S.modalRoot?.remove();S.modalRoot=null;S.returnRoot?.remove();S.returnRoot=null;S.reportStop?.();S.reportStop=null;S.reportListenKey='';clearReportCache();S.week=null;S.days=[];S.actor=null;
    S.teachers=[];S.corrections=[];S.chosen='';S.screen='fill';S.mobileDetail=false;S.returnPage=false;S.gpkDraftNote='';S.dirty=false;
    chrome();}
  const reportWrites=new Set(['tm5SaveDay','tm5Reopen','tm5RequestEdit','tm5SaveWeek','tm5GpkReview','tm5GBReview']);
  const esc=v=>tmEsc(v);
  const showDate=v=>tmPwaDate(v); // V5.3.8: menormal tarikh Date/ISO kepada dd/mm/yyyy
  const names=()=>Object.fromEntries(S.teachers.map(t=>[String(t.id),String(t.name)]));
  const teacherName=id=>names()[String(id)]||String(id||'—');
  const statusName=s=>({DISAHKAN:'Lengkap',MENUNGGU_GPK:'Semakan GPK Penyelia',MENUNGGU_GB:'Pengesahan GB'}[String(s)]||'Tiada Laporan');
  const dayStatus=s=>({CUTI:'Cuti / Tiada laporan',LENGKAP:'Lengkap',DRAF:'Draf',PEMBETULAN:'Perlu pembetulan',BELUM_DIISI:'Belum diisi'}[String(s)]||'Belum diisi');
  const api=async p=>{if(typeof window.SeMAKMUR_TM5_API!=='function')throw Error('Sambungan laporan tidak tersedia.');return window.SeMAKMUR_TM5_API(p);};
  const msg=(s='',bad=false)=>{const el=root.querySelector('#tm5-message');if(el){el.textContent=s;el.dataset.error=bad?'1':'0';}};
  async function call(p){tmProcess('laporan',true,'Memuatkan Laporan Mingguan','Menyemak rekod rasmi…');try{
    const raw=await api(p);if(raw?.ok===false||raw?.status==='RALAT')throw Error(raw?.message||raw?.error||'Tindakan tidak berjaya');
    if(reportWrites.has(String(p?.op||''))){
      // Simpanan disahkan oleh Fi-Sync; jangan kekalkan cache laporan lama.
      S.directoryAt=0;S.dirty=false;
      S.reportCache.delete(reporterKey(p.weekId,p.year));S.forceBackendOnce=true;
    }
    return raw?.data&&typeof raw.data==='object'&&raw.weeks===undefined&&raw.days===undefined?raw.data:raw;
  }catch(e){msg(e?.message||String(e),true);throw e;}finally{tmProcess('laporan',false);}}
  const guard=fn=>async(...args)=>{try{return await fn(...args);}catch(e){console.error('[TM5]',e);msg(e?.message||String(e),true);}};
  const common=()=>({weekId:S.week?.id,year:S.week?.year||String(S.week?.from||'').slice(0,4)});
  const isApproved=()=>S.week?.status==='DISAHKAN';
  const weekId=w=>String(w?.weekId||w?.id||'');
  const daysAllComplete=()=>S.days.some(d=>!d.holiday)&&S.days.every(d=>d.holiday||d.status==='LENGKAP');
  const dayWritable=d=>!!d?.canWrite;
  const today=()=>tmToday();
  function chrome(){root.innerHTML=`<div class="tm5-toolbar-card tm538-nav-shell"><div class="tm5-report-actions tm538-attached-tabs" role="group" aria-label="Menu laporan">
    <button type="button" id="tm5-fill-tab" class="tm5-action current" aria-pressed="true">Isi Laporan</button>
    <button type="button" id="tm5-directory-tab" class="tm5-action" aria-pressed="false">Direktori Program</button>
  </div><div class="tm5311-desktop-demo-control"><button type="button" id="tm52-demo-toggle" aria-pressed="false" hidden>Mod Ujian Pentadbir: OFF</button></div><div id="tm5-message" role="status" aria-live="polite"></div></div><div id="tm5-content"></div>`;
    root.querySelector('#tm5-fill-tab').onclick=guard(async()=>{
      if(window.SeMAKMUR_TM52_DEMO?.isOn()){setTab('fill');return window.SeMAKMUR_TM52_DEMO.show?.(slot());}
      if(S.mobileDetail&&!tm53Desktop()){if(S.dirty&&!await tm5318Confirm('Borang belum disimpan. Kembali ke senarai dan buang perubahan?'))return;S.dirty=false;S.mobileDetail=false;S.returnPage=false;renderEditorLegacyMobile();return;}
      return openPrimary();});
    root.querySelector('#tm5-directory-tab').onclick=guard(async()=>{
      if((S.dirty||window.SeMAKMUR_TM52_DEMO?.hasUnsaved?.())&&!await tm5318Confirm('Perubahan borang belum disimpan. Buka direktori dan buang perubahan?'))return;
      S.dirty=false;S.mobileDetail=false;return directory(false);
    });
    root.addEventListener('input',event=>{
      if(event.target.closest('.tm5-daily-form,.tm5-leader-panel'))S.dirty=true;
    });
  }
  const slot=()=>root.querySelector('#tm5-content');
  const setTab=name=>{S.screen=name;
    const fill=root.querySelector('#tm5-fill-tab'),dir=root.querySelector('#tm5-directory-tab');
    fill?.classList.toggle('current',name==='fill');dir?.classList.toggle('current',name==='directory'||name==='preview');
    fill?.setAttribute('aria-pressed',name==='fill'?'true':'false');dir?.setAttribute('aria-pressed',name==='directory'||name==='preview'?'true':'false');
  };
  async function fetchWeeks(force=false){
    const year=String(tmState.year);
    if(!force&&S.loaded&&S.activeYear===year&&Date.now()-S.directoryAt<TM51B_TTL)return;
    if(!force&&S.directoryPending)return S.directoryPending;
    const job=(async()=>{
      const overview=(tm51.overview?.year===year?tm51.overview:null);
      const fromOverview=overview?.weeks?.length?overview.weeks:(tmState.data?.weeks||[]);
      if(fromOverview.length){
        const meta=overview?.metadata||tmState.overviewMeta||{};
        S.weeks=fromOverview.map(w=>({weekId:String(w.ID_Minggu),year,
          label:String(w.Minggu||''),group:String(w.ID_Kumpulan||w.Nama_Kumpulan||''),
          from:tmPwaISO(w.Tempoh_Mula)||String(w.Tempoh_Mula||''),
          to:tmPwaISO(w.Tempoh_Tamat)||String(w.Tempoh_Tamat||''),
          status:String(meta[w.ID_Minggu]?.reportStatus||'BELUM_DIHANTAR'),
          ready:true})).sort((a,b)=>b.from.localeCompare(a.from));
      }else{
        const res=await call({op:'tm5Directory',years:[year]});S.weeks=(res.weeks||[]).map(w=>({...w,from:tmPwaISO(w.from)||w.from,to:tmPwaISO(w.to)||w.to}));
      }
      if(String(tmState.year)!==year)return;
      S.loaded=true;S.activeYear=year;S.directoryAt=Date.now();
    })();
    S.directoryPending=job;
    try{await job;}finally{if(S.directoryPending===job)S.directoryPending=null;}
  }
  const planned=w=>!!w?.ready;
  const containsNow=w=>String(w.from||'')<=today()&&today()<=String(w.to||'');
  async function openPrimary(){
    // Jika borang sudah ada, jangan panggil backend sekali lagi bila menukar tab.
    if(S.screen==='fill'&&S.week&&String(S.week.year)===String(tmState.year)&&root.querySelector('.tm5-editor-layout')){
      setTab('fill');return;
    }
    setTab('fill');await fetchWeeks();
    let w=S.weeks.find(w=>weekId(w)===S.chosen&&planned(w));
    if(!w)w=S.weeks.find(w=>containsNow(w)&&planned(w))||S.weeks.find(planned);
    if(!w){slot().innerHTML='<div class="tm5-card tm5-empty">Belum ada jadual rasmi untuk diisi.</div>';return;}
    await loadWeek(w,false);
  }
  async function openFromOverview(id){S.chosen=String(id||'');tmTab('report-studio');if(!S.loaded)await fetchWeeks();
    const w=S.weeks.find(x=>weekId(x)===S.chosen);
    if(!w){setTab('fill');slot().innerHTML='<div class="tm5-card tm5-empty">Minggu belum tersedia.</div>';return;}
    await loadWeek(w,false);
  }
  async function directory(reload=false){
    setTab('directory');
    if(window.SeMAKMUR_TM52_DEMO?.isOn())return window.SeMAKMUR_TM52_DEMO.directory?.(slot());
    await fetchWeeks(reload);
    const visible=S.weeks.filter(w=>String(w.from||'')<=today()).sort((a,b)=>String(b.from).localeCompare(String(a.from)));
    const rows=visible.map((w,i)=>{const complete=w.status==='DISAHKAN'&&planned(w);
      const label=statusName(w.status),cls=w.status==='DISAHKAN'?'approved':w.status==='MENUNGGU_GPK'?'tm525-gpk':w.status==='MENUNGGU_GB'?'tm525-gb':'pending';
      return `<div class="tm5-dirrow ${complete?'tm5-dir-open':'tm5-dir-disabled'}" ${complete?`role="button" tabindex="0" data-preview-week="${i}"`:'aria-disabled="true"'}>
        <div class="tm5-dir-title"><strong>Minggu ${esc(w.label)} · Kumpulan ${esc(w.group)}</strong><span>${showDate(w.from)} – ${showDate(w.to)}</span></div>
        ${label==='Tiada Laporan'?'':`<span class="tm5-pill ${cls}">${esc(label)}</span>`}
        <span class="tm5-dir-arrow" aria-hidden="true">${complete?'›':'—'}</span>
      </div>`;}).join('');
    slot().innerHTML=`<section class="tm5-card tm5-dir-card"><h2>Direktori Laporan Mingguan</h2><div class="tm5-directory">${rows||'<p class="tm5-muted">Belum ada minggu persekolahan sehingga tarikh semasa.</p>'}</div></section>`;
    slot().querySelectorAll('[data-preview-week]').forEach(el=>{const open=guard(()=>loadWeek(visible[Number(el.dataset.previewWeek)],true));
      el.addEventListener('click',open);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});});
  }
  function reportFromMirror(record){
    const me=String(tmMe()||''),week=record.week||{},approved=week.status==='DISAHKAN';
    const myActor={id:me,isMember:Array.isArray(week.memberIds)?week.memberIds.map(String).includes(me):null,isLeader:String(week.leader||'')===me,
      isGPK:String(week.gpk||'')===me,isGB:tmState.data?.actor?.isGB===true};
    const days=(record.days||[]).map(d=>({...d,canWrite:!d.holiday&&d.available&&
       [String(d.teacher),String(week.leader)].includes(me)&&
       ['BELUM_DIISI','DRAF','PEMBETULAN'].includes(d.status)&&
       !['MENUNGGU_GPK','MENUNGGU_GB','DISAHKAN'].includes(week.status)}));
    return {week,days,actor:myActor,teachers:record.teachers||[],
      corrections:record.corrections||[]};
  }
  async function tm52MirrorRead(year,id){
    if(!tm51.db||!tm51.fns)return null;
    const key=year+'_'+id;if(S.reportListenKey===key&&S.week?.id===id)
      return S.reportCache.get(reporterKey(id,year))?.data||null;
    S.reportStop?.();S.reportStop=null;S.reportListenKey=key;
    return new Promise(resolve=>{
      let first=true,done=false,stop=null;
      const finish=data=>{if(!done){done=true;resolve(data);}};
      try{
        stop=tm51.fns.onSnapshot(tm51.fns.doc(tm51.db,'semakmur_fi_tm52_reports',key),snap=>{
          if(S.reportListenKey!==key)return;
          const data=snap.exists()&&snap.data().active!==false?reportFromMirror(snap.data()):null;
          if(data){S.reportCache.set(reporterKey(id,year),{data,at:Date.now()});}
          if(first){first=false;finish(data);return;}
          if(!data)return;
          if(S.dirty){msg('Laporan berubah di server. Simpan dahulu atau tekan Muat Semula.');return;}
          if(S.week?.id===id&&String(S.week.year)===year){
            const date=S.current?.date;S.week={...data.week,year,from:tmPwaISO(data.week?.from)||data.week?.from,to:tmPwaISO(data.week?.to)||data.week?.to};S.actor=data.actor;
            S.days=(data.days||[]).map(d=>({...d,date:tmPwaISO(d.date)||d.date}));S.teachers=data.teachers;S.corrections=data.corrections;
            S.current=S.days.find(d=>d.date===date)||S.days[0]||null;
            if(S.screen==='preview')renderDocument();
            else if(S.screen==='fill')renderEditor();
          }
        },err=>{console.warn('[TM52 report listener]',err.code||err);finish(null);});
        S.reportStop=stop;
      }catch(e){console.warn('[TM52 report read]',e);finish(null);}
      setTimeout(()=>finish(null),1200);
    });
  }
  async function loadWeek(w,preview=false,selectedDate=''){
    const seq=++S.request,year=String(w.year||tmState.year),key=reporterKey(weekId(w),year);
    let data,record=S.reportCache.get(key);
    if(!S.forceBackendOnce&&record&&Date.now()-record.at<TM51B_TTL){data=record.data;}
    else{
      if(!S.forceBackendOnce)data=await tm52MirrorRead(year,weekId(w));
      if(!data){
      let promise=S.reportPending.get(key);
      if(!promise){promise=call({op:'tm5Load',year,weekId:weekId(w),mode:'RASMI'});
        S.reportPending.set(key,promise);}
      try{data=await promise;if(data&&String(tmState.year)===year)
        S.reportCache.set(key,{data,at:Date.now()});}
      catch(e){
        if(/tidak mempunyai akses kepada minggu ini/i.test(String(e?.message||e))){
          msg('');setTab('fill');slot().innerHTML='<section class="tm5-card tm524-not-assigned"><span aria-hidden="true">▣</span><h3>Kumpulan anda tidak bertugas pada minggu ini.</h3><p>Tiada borang atau status laporan harian untuk dipaparkan.</p></section>';
          S.week=null;S.days=[];S.actor=null;S.current=null;return;
        }
        throw e;
      }
      finally{if(S.reportPending.get(key)===promise)S.reportPending.delete(key);}
      }
    }
    S.forceBackendOnce=false;
    if(seq!==S.request||String(tmState.year)!==year)return;
    S.week={...data.week,year,from:tmPwaISO(data.week?.from)||data.week?.from,to:tmPwaISO(data.week?.to)||data.week?.to};
    S.actor=data.actor||{};S.days=(data.days||[]).map(d=>({...d,date:tmPwaISO(d.date)||d.date}));S.teachers=data.teachers||[];
    S.corrections=data.corrections||[];S.chosen=S.week.id;
    const currentIndex=S.weeks.find(x=>weekId(x)===S.week.id);
    if(currentIndex)currentIndex.status=String(S.week.status||'BELUM_DIHANTAR');
    if(tm53Desktop()&&S.actor?.isMember===false&&!S.actor?.isGPK&&!S.actor?.isGB&&!tmState.data?.actor?.isAdmin){
      setTab('fill');slot().innerHTML='<section class="tm5-card tm524-not-assigned"><span aria-hidden="true">▣</span><h3>Kumpulan anda tidak bertugas pada minggu ini.</h3><p>Tiada borang atau status laporan harian untuk dipaparkan.</p></section>';return;
    }
    if(preview){S.mobileDetail=false;S.previewOrigin='directory';setTab('preview');renderDocument();return;}
    S.mobileDetail=false;S.returnPage=false;setTab('fill');S.current=S.days.find(d=>d.date===selectedDate)||S.days.find(d=>d.date===today())||
      S.days.filter(d=>d.available).at(-1)||S.days[0]||null;
    if(String(S.week.status)==='MENUNGGU_GPK'&&!S.actor?.isLeader&&
       S.days.some(d=>String(d.teacher)===String(tmMe())&&d.status==='LENGKAP')&&
       String(S.current?.teacher)!==String(tmMe()))
      S.current=S.days.find(d=>String(d.teacher)===String(tmMe())&&d.status==='LENGKAP');
    renderEditor();
  }
  function titleStatus(s){if(statusName(s)==='Tiada Laporan')return '';return `<span class="tm5-pill ${s==='DISAHKAN'?'approved':'pending'}">${esc(statusName(s))}</span>`;}
  const tm524Sent=()=>['MENUNGGU_GPK','MENUNGGU_GB','DISAHKAN'].includes(String(S.week?.status||''));
  const tm524CanAmend=()=>S.week?.status==='MENUNGGU_GPK'&&(S.actor?.isLeader||S.days.some(d=>!d.holiday&&d.teacher===tmMe()));
  const tm524Badge=d=>{
    const state=d.holiday?'CUTI':d.status;
    const map={LENGKAP:['✓','Lengkap','done'],DRAF:['✎','Draf','draft'],CUTI:['◇',d.holidayTitle||'Cuti','holiday'],PEMBETULAN:['!','Pembetulan','fix'],BELUM_DIISI:['○','Belum lengkap','pending']};
    const [symbol,text,cls]=map[state]||['○','Belum lengkap','pending'];
    return `<span class="tm524-day-status ${cls}"><span aria-hidden="true">${symbol}</span> ${esc(text)}</span>`;
  };
  /* V5.3.8: Pada PWA, pilih hari membuka halaman borang berasingan dalam iframe yang sama.
     Pemeriksaan canWrite kekal daripada backend; peranan Ketua/GPK/GB tidak diubah. */
  function renderEditorLegacyMobile(){
    const w=S.week;if(!w)return;
    if(S.returnPage&&S.actor?.isGPK&&w.status==='MENUNGGU_GPK'){
      tm5317OfficialReturnPage();return;
    }
    const all=daysAllComplete(),canSend=all&&S.actor?.isLeader&&!['MENUNGGU_GPK','MENUNGGU_GB','DISAHKAN'].includes(w.status);
    const right=all?`<section class="tm5-card tm5-leader-panel"><h3>Ulasan Ketua Kumpulan</h3>
      ${S.actor?.isLeader?`<label>Ulasan keseluruhan<textarea id="tm5-summary" ${canSend?'':'disabled'}>${esc(w.summary||'')}</textarea></label>
        <label>Cadangan / Tindakan Susulan<textarea id="tm5-followup" ${canSend?'':'disabled'}>${esc(w.followup||'')}</textarea></label>
        ${canSend?'<div class="tm5-row"><button id="tm5-draft">Simpan Ulasan</button><button id="tm5-submit" class="primary">Hantar kepada GPK</button></div>':''}`
       :`<p class="tm5-readonly">${esc(w.summary||'Tiada ulasan.')}</p><p class="tm5-readonly">${esc(w.followup||'')}</p>`}</section>`:'';
    const banner=`<section class="tm5-card tm5-report-banner tm538-week-banner"><div><h2>Minggu ${esc(w.label)} · Kumpulan ${esc(w.group)}</h2>
      <span class="tm5-period">${showDate(w.from)} – ${showDate(w.to)}</span>
      <span class="tm5-people tm538-people"><span class="tm538-role-line"><strong>Penyelia GPK:</strong> ${esc(teacherName(w.gpk))}</span> <span class="tm538-role-line"><strong>Ketua Kumpulan:</strong> ${esc(teacherName(w.leader))}</span></span></div>
      <div class="tm5-banner-right">${titleStatus(w.status)}${isApproved()?'<button id="tm5-print-now" class="primary">Cetak Laporan Ini</button>':''}</div></section>`;
    if(S.mobileDetail&&S.current){
      const d=S.current;
      slot().innerHTML=`<div class="tm538-mobile-page" aria-label="Paparan laporan harian">
        <button type="button" id="tm538-back-to-days" class="tm538-back-button"><span aria-hidden="true">←</span> Kembali ke Laporan Harian</button>
        <div class="tm538-mobile-page-heading"><span class="tm538-page-icon" aria-hidden="true">▤</span><div><h2>${esc(d.day)}</h2><p>${showDate(d.date)} · Minggu ${esc(w.label)} · Kumpulan ${esc(w.group)}</p></div></div>
        <div id="tm5-detail"></div></div>`;
      const back=slot().querySelector('#tm538-back-to-days');back.onclick=async()=>{
        if(S.dirty&&!await tm5318Confirm('Borang belum disimpan. Kembali ke senarai dan buang perubahan?'))return;
        S.mobileDetail=false;S.dirty=false;renderEditorLegacyMobile();
        try{root.scrollIntoView({block:'start'});}catch(_){}
      };
      renderDay();return;
    }
    const reviewerNotice=(S.actor?.isGPK||S.actor?.isGB)?`<section class="tm5313-reviewer-notice"><span class="tm5313-reviewer-icon" aria-hidden="true">${S.actor?.isGPK?'▣':'◈'}</span><div><strong>${esc(tm525RoleNotice())}</strong><small>${esc(S.actor?.isGPK?'GPK Penyelia':'Guru Besar')}</small></div></section>`:'';
    const reviewerSummary=(S.actor?.isGPK||S.actor?.isGB)&&['MENUNGGU_GPK','MENUNGGU_GB','DISAHKAN'].includes(w.status)&&w.summary?`<section class="tm5-card tm5313-reviewer-summary"><h3>Ulasan Ketua Kumpulan</h3><p>${esc(w.summary)}</p>${w.followup?`<h4>Cadangan / Tindakan Susulan</h4><p>${esc(w.followup)}</p>`:''}</section>`:'';
    const submitted=tm524Sent();
    const statusTitle=(S.actor?.isGPK||S.actor?.isGB)?tm525RoleNotice():
      w.status==='DISAHKAN'?'Laporan telah disahkan oleh Guru Besar.':
      w.status==='MENUNGGU_GB'?'Laporan telah disokong GPK dan menunggu pengesahan Guru Besar.':
      'Laporan telah dihantar dan menunggu semakan GPK Penyelia.';
    const statusDetail=w.status==='MENUNGGU_GPK'?'Guru yang ditugaskan atau Ketua boleh membuat pindaan sebelum keputusan GPK.':
      w.status==='MENUNGGU_GB'?'Laporan dalam proses pengesahan Guru Besar.':
      'Laporan telah selesai melalui proses pengesahan.';
    const statusTop=submitted?`<section class="tm5316-status-card" role="status"><span class="tm5316-status-mark" aria-hidden="true">✓</span><div><strong>${esc(statusTitle)}</strong><p>${esc(statusDetail)}</p></div></section>`:
      reviewerNotice;
    slot().innerHTML=`${banner}${statusTop}
      <div class="tm5-editor-layout tm538-list-layout"><aside class="tm5-card tm5-daylist tm538-daylist"><h3 class="tm538-list-heading"><span class="tm538-heading-icon" aria-hidden="true">▦</span> Status Laporan Harian</h3>
      ${S.days.map((d,i)=>`<button type="button" class="tm538-day-row ${d.status==='PEMBETULAN'?'tm5317-fix-target':''}" data-day-index="${i}" ${!d.available&&!d.holiday&&d.status!=='LENGKAP'?'disabled':''}>
        <span class="tm538-day-info"><strong>${esc(d.day)}</strong><small>${showDate(d.date)}</small></span>
        ${tm538MobileDayBadge(d)}</button>`).join('')}
      </aside><div class="tm5-report-right tm538-summary-area">${reviewerSummary}${right}
      ${S.actor?.isGPK&&w.status==='MENUNGGU_GPK'?reviewCard('GPK'):''}
      ${S.actor?.isGB&&w.status==='MENUNGGU_GB'?reviewCard('GB'):''}</div></div>`;
    slot().querySelectorAll('[data-day-index]').forEach(el=>el.onclick=async()=>{
      const d=S.days[Number(el.dataset.dayIndex)];if(!d)return;
      const me=String(tmMe());const assigned=String(d.teacher||'')===me;
      const roleCanReview=!!(S.actor?.isLeader||S.actor?.isGPK||S.actor?.isGB);
      if(d.status!=='LENGKAP'&&!dayWritable(d)&&!assigned&&!roleCanReview&&!d.holiday){
        tm5318Alert('Anda tidak bertugas untuk mengisi laporan pada hari ini.');return;
      }
      if(!d.available&&!d.holiday&&d.status!=='LENGKAP'){tm5318Alert('Laporan untuk hari ini belum tersedia.');return;}
      S.current=d;S.mobileDetail=true;S.dirty=false;renderEditorLegacyMobile();
      try{root.scrollIntoView({block:'start'});}catch(_){}
    });
    if(canSend){slot().querySelector('#tm5-draft').onclick=guard(()=>saveWeek(false));slot().querySelector('#tm5-submit').onclick=guard(()=>saveWeek(true));}
    const r=slot().querySelector('#tm5-review-submit');if(r)r.onclick=guard(()=>review('APPROVE'));
    const ret=slot().querySelector('#tm5317-open-return');if(ret)ret.onclick=()=>{S.gpkDraftNote=slot().querySelector('#tm5-review-note')?.value||'';S.returnPage=true;tm5317OfficialReturnPage();};
    const print=slot().querySelector('#tm5-print-now');if(print)print.onclick=printDocument;
  }
  function tm538MobileDayBadge(d){
    const state=d.holiday?'CUTI':String(d.status||'BELUM_DIISI');
    const map={LENGKAP:['✓','Lengkap','done'],DRAF:['✎','Draf','draft'],CUTI:['◇','Cuti','holiday'],
      PEMBETULAN:['!','Perlu pembetulan','fix'],BELUM_DIISI:['○','Belum diisi','pending']};
    const [symbol,label,tone]=map[state]||['○','Belum diisi','pending'];
    return `<span class="tm538-day-status ${tone}"><span class="tm538-status-icon" aria-hidden="true">${symbol}</span>${esc(label)}</span>`;
  }

  function tm525RoleNotice(){
    const w=S.week||{};
    if(S.actor?.isGPK){
      return w.status==='MENUNGGU_GPK'?'Laporan diterima untuk semakan GPK Penyelia.':
        w.status==='MENUNGGU_GB'?(w.gbPendingAppointment?'Semakan GPK selesai. Menunggu pelantikan Guru Besar atau Pemangku GB yang sah.':'Semakan GPK selesai. Laporan sedang menunggu pengesahan Guru Besar.'):
        w.status==='DISAHKAN'?'Laporan telah disahkan Guru Besar.':'Laporan Ketua Kumpulan belum dihantar untuk semakan GPK Penyelia.';
    }
    if(S.actor?.isGB){
      return w.status==='MENUNGGU_GB'?(w.gbPendingAppointment?'Laporan telah disokong GPK. Menunggu pelantikan Guru Besar atau Pemangku GB yang sah.':'Laporan telah disokong GPK Penyelia dan menunggu pengesahan Guru Besar.'):
        w.status==='DISAHKAN'?'Laporan telah disahkan Guru Besar.':
        w.status==='MENUNGGU_GPK'?'Laporan telah dihantar oleh Ketua Kumpulan dan sedang menunggu semakan GPK Penyelia.':
        'Laporan belum dihantar oleh Ketua Kumpulan dan belum disemak oleh GPK Penyelia.';
    }
    return '';
  }
  function tm525MayEdit(d){
    return !!d&&!d.holiday&&d.status==='LENGKAP'&&
      (S.actor?.isLeader||String(d.teacher)===String(tmMe()))&&
      !['MENUNGGU_GB','DISAHKAN'].includes(String(S.week?.status));
  }
  function tm525SentTabs(){
    const days=S.days.filter(d=>!d.holiday&&(S.actor?.isLeader||String(d.teacher)===String(tmMe())));
    if(!days.length)return '';
    return `<div class="tm525-sent-tabs" role="group" aria-label="Pilih hari laporan untuk semakan">${days.map(d=>`<button type="button" data-tm525-sent-day="${esc(d.date)}" class="${S.current?.date===d.date?'active':''}">${esc(d.day)} · ${showDate(d.date)}</button>`).join('')}</div>`;
  }
  function renderEditor(){if(!tm53Desktop())return renderEditorLegacyMobile();
    const w=S.week;if(!w)return;
    const isGpk=!!S.actor?.isGPK, isGb=!!S.actor?.isGB,isReviewer=isGpk||isGb;
    const all=daysAllComplete(), sent=tm524Sent(),isLeader=!!S.actor?.isLeader;
    const canSend=all&&isLeader&&!sent&&['BELUM_DIHANTAR','LENGKAP','DIPULANGKAN'].includes(w.status);
    const leaderSummary=all&&isLeader&&!sent;
    const right=leaderSummary?`<section class="tm5-card tm5-leader-panel"><h3>Ulasan dan Cadangan Ketua Kumpulan</h3>
      <p class="tm532-summary-hint">Semua laporan harian telah lengkap. Klik hari untuk semakan dokumen dalam popup sebelum menghantar laporan.</p>
      <label>Ulasan Keseluruhan<textarea id="tm5-summary" rows="4">${esc(w.summary||'')}</textarea></label>
      <label>Cadangan / Tindakan Susulan<textarea id="tm5-followup" rows="4">${esc(w.followup||'')}</textarea></label>
      ${canSend?'<div class="tm5-row"><button id="tm5-draft" type="button">Simpan Ulasan</button><button id="tm5-submit" type="button" class="primary">Hantar kepada GPK</button></div>':''}
      </section>`:'';
    const sentHeadline=w.status==='DISAHKAN'?'Laporan telah disahkan oleh Guru Besar.':w.status==='MENUNGGU_GB'?(w.gbPendingAppointment?'Menunggu pelantikan Guru Besar atau Pemangku GB yang sah.':'Laporan telah disemak GPK dan menunggu pengesahan Guru Besar.'):'Laporan telah dihantar kepada GPK Penyelia untuk semakan.';
    const sentInfo=sent?`<section class="tm5-card tm524-submitted tm532-submitted"><div class="tm524-status-symbol" aria-hidden="true">✓</div><h3>${sentHeadline}</h3>
      <p>${w.status==='MENUNGGU_GPK'?'Guru yang ditugaskan atau Ketua boleh membuat pindaan sebelum GPK membuat keputusan. Pilih hari dan tekan Edit pada kad hari.':'Laporan harian boleh dilihat untuk semakan. Pindaan tidak dibenarkan selepas sokongan GPK atau pengesahan GB.'}</p></section>`:'';
    const reviewerNotice=isReviewer?`<section class="tm5-card tm525-role-notice tm532-role-notice"><div class="tm532-state-icon" aria-hidden="true">${isGpk?'▣':'◈'}</div><div><strong>${esc(tm525RoleNotice())}</strong><p>${!sent?'Klik mana-mana hari untuk semakan. Hari belum lengkap akan memaparkan status dalam popup.':'Klik hari untuk melihat laporan lengkap dalam popup.'}</p></div></section>`:'';
    const statusSection=sent?sentInfo:(isReviewer?reviewerNotice:'');
    slot().innerHTML=`<section class="tm5-card tm5-report-banner"><div><h2>Minggu ${esc(w.label)} · Kumpulan ${esc(w.group)}</h2>
        <span class="tm5-period">${showDate(w.from)} – ${showDate(w.to)}</span>
        <span class="tm5-people tm538-people"><span class="tm538-role-line"><strong>Penyelia GPK:</strong> ${esc(teacherName(w.gpk))}</span> <span class="tm538-role-line"><strong>Ketua Kumpulan:</strong> ${esc(teacherName(w.leader))}</span></span></div>
        <div class="tm5-banner-right">${titleStatus(w.status)}${isApproved()?'<button id="tm5-print-now" class="primary">Cetak Laporan Ini</button>':''}</div></section>
      <div class="tm5-editor-layout"><aside class="tm5-card tm5-daylist"><h3 class="tm524-status-heading"><span aria-hidden="true">▣</span> Status Laporan Harian</h3>
      ${S.days.map((d,i)=>`<div class="tm525-day-row tm532-day-card ${S.current?.date===d.date?'tm532-selected':''}" data-tm533-card="${i}" role="group"><button type="button" class="tm5-daybutton ${S.current?.date===d.date?'chosen':''} ${d.status==='LENGKAP'?'tm524-complete':''}"
        data-day-index="${i}" ${!isReviewer&&!d.available&&!d.holiday?'disabled':''} ${S.current?.date===d.date?'aria-current="date"':''}>
        <span><strong>${esc(d.day)} · ${showDate(d.date)}</strong></span></button><div class="tm532-day-bottom">${tm524Badge(d)}
        ${!isReviewer&&tm525MayEdit(d)?`<button type="button" class="tm525-edit-day" data-tm525-edit="${esc(d.date)}" aria-label="Edit laporan ${esc(d.day)}">✎ Edit</button>`:''}</div></div>`).join('')}
      </aside><div class="tm5-report-right">${statusSection}${leaderSummary?right:''}<div id="tm5-detail"></div>
      ${isGpk&&w.status==='MENUNGGU_GPK'?reviewCard('GPK'):''}
      ${isGb&&w.status==='MENUNGGU_GB'?reviewCard('GB'):''}</div></div>`;
    const detail=slot().querySelector('#tm5-detail');
    function updateDetail(){
      const d=S.current;if(!detail||!d)return;
      if(isReviewer){detail.innerHTML='';return;} // GPK / GB sentiasa menggunakan popup.
      if(d.holiday){detail.innerHTML=`<section class="tm5-card tm52-holiday-card"><h3>${esc(d.day)} · ${showDate(d.date)}</h3><div class="tm52-holiday">${esc(d.holidayTitle||'Cuti Persekolahan')}</div></section>`;return;}
      if(leaderSummary){detail.innerHTML='<section class="tm5-card tm524-review-hint"><strong>Semakan laporan harian</strong><p>Semua hari telah lengkap. Pilih hari di sebelah kiri untuk membuka popup semakan.</p></section>';return;}
      if(d.status==='LENGKAP'){
        detail.innerHTML=`<section class="tm5-card tm532-inline-document">${docDay(d)}</section>`;return;
      }
      if(d.canWrite){renderDay();return;}
      if(isLeader){detail.innerHTML='<section class="tm5-card tm532-no-duty"><span aria-hidden="true">◷</span><strong>Laporan hari ini belum lengkap.</strong><p>Hari ini belum boleh disunting. Sila semak semula status dan tarikh laporan.</p></section>';return;}
      detail.innerHTML='<section class="tm5-card tm532-no-duty"><span class="tm532-state-icon" aria-hidden="true">▣</span><strong>Anda tidak bertugas untuk mengisi laporan harian pada hari ini.</strong><p>Hanya guru yang ditugaskan boleh mengisi laporan. Laporan lengkap boleh dibaca di sini.</p></section>';
    }
    updateDetail();
    slot().querySelectorAll('[data-day-index]').forEach(el=>el.onclick=async()=>{
      if(S.dirty&&!await tm5318Confirm('Perubahan borang belum disimpan. Tukar hari dan buang perubahan?'))return;
      S.dirty=false;S.current=S.days[Number(el.dataset.dayIndex)];
      slot().querySelectorAll('.tm532-day-card').forEach(card=>card.classList.toggle('tm532-selected',card.contains(el)));
      slot().querySelectorAll('[data-day-index]').forEach(btn=>{const chosen=btn===el;btn.classList.toggle('chosen',chosen);btn.setAttribute('aria-current',chosen?'date':'false');});
      if(isReviewer){openDayModal(S.current,S.current?.status==='LENGKAP'?'view':'missing');return;}
      if(isLeader&&all&&S.current?.status==='LENGKAP'){openDayModal(S.current,'view');return;}
      updateDetail();
    });
    // Keseluruhan kad (tarikh DAN status) membuka hari; butang Edit tetap berfungsi secara berasingan.
    slot().querySelectorAll('[data-tm533-card]').forEach(card=>card.addEventListener('click',ev=>{
      if(ev.target.closest('[data-tm525-edit],[data-day-index]'))return;
      const button=card.querySelector('[data-day-index]');if(button&&!button.disabled)button.click();
    }));
    if(canSend){slot().querySelector('#tm5-draft').onclick=guard(()=>saveWeek(false));slot().querySelector('#tm5-submit').onclick=guard(()=>saveWeek(true));}
    const print=slot().querySelector('#tm5-print-now');if(print)print.onclick=printDocument;
    slot().querySelectorAll('[data-tm525-edit]').forEach(btn=>btn.onclick=guard(()=>requestDayEdit(btn.dataset.tm525Edit)));
    const gpkApprove=slot().querySelector('#tm5-gpk-approve');if(gpkApprove)gpkApprove.onclick=guard(()=>review('APPROVE'));
    const gpkReturn=slot().querySelector('#tm5-gpk-return');if(gpkReturn)gpkReturn.onclick=()=>tm533OpenReturnModal();
    const gbApprove=slot().querySelector('#tm5-gb-confirm');if(gbApprove)gbApprove.onclick=guard(()=>review('APPROVE'));
  }
  function closeDayModal(){S.modalRoot?.remove();S.modalRoot=null;}
  function openDayModal(d,mode='view'){
    if(!tm53Desktop()||!d)return;
    closeDayModal();S.current=d;
    const wrapper=document.createElement('div');wrapper.className='tm524-modal-overlay';
    wrapper.innerHTML=`<div class="tm524-modal" role="dialog" aria-modal="true" aria-label="Semakan laporan ${esc(d.day)}" tabindex="-1">
      <div class="tm524-modal-top"><div><strong>${esc(d.day)} · ${showDate(d.date)}</strong><span>${esc(dayStatus(d.status))}</span></div><button type="button" class="tm524-close" data-tm524-close aria-label="Tutup">✕</button></div>
      <div class="tm524-modal-detail"></div>
      <div class="tm524-modal-actions"><button type="button" data-tm524-close>Tutup</button>
        </div>
      </div>`;
    root.append(wrapper);S.modalRoot=wrapper;
    const detail=wrapper.querySelector('.tm524-modal-detail');
    if(mode==='edit'&&dayWritable(d)){renderDay(detail);}
    else if(d.holiday)detail.innerHTML=`<section class="tm5-card tm532-modal-notice"><h3>${esc(d.day)} — Cuti</h3><p>${esc(d.holidayTitle||'Tiada laporan diperlukan.')}</p></section>`;
    else if(d.status!=='LENGKAP')detail.innerHTML='<section class="tm5-card tm532-modal-notice"><div class="tm532-state-icon" aria-hidden="true">◷</div><h3>Laporan Belum Diisi</h3><p>Laporan harian belum dilengkapkan oleh guru bertugas. Tiada dokumen untuk disemak pada hari ini.</p></section>';
    else detail.innerHTML=`<section class="tm5-card tm524-day-document">${docDay(d)}</section>`;
    const closer=()=>closeDayModal();wrapper.querySelectorAll('[data-tm524-close]').forEach(b=>b.onclick=closer);
    wrapper.addEventListener('click',e=>{if(e.target===wrapper)closer();});

    wrapper.querySelector('.tm524-modal').focus();
  }
  async function requestDayEdit(date){
    const d=S.days.find(x=>x.date===date&&x.status==='LENGKAP'&&!x.holiday&&(S.actor?.isLeader||x.teacher===tmMe()));
    if(!d)return msg('Tiada laporan lengkap yang boleh dipinda oleh akaun ini.',true);
    if(!S.actor?.isLeader&&d.teacher!==tmMe())return msg('Hanya guru laporan hari tersebut atau Ketua boleh membuat pindaan.',true);
    if(['MENUNGGU_GB','DISAHKAN'].includes(S.week.status))return msg('Laporan tidak boleh diubah selepas sokongan GPK atau pengesahan GB.',true);
    const reason=await tm5318Prompt(`Sebab pindaan laporan ${d.day}, ${showDate(d.date)} (wajib):`);
    if(!reason?.trim())return;
    const operation=S.week.status==='MENUNGGU_GPK'?'tm5RequestEdit':'tm5Reopen';
    closeDayModal();await call({op:operation,...common(),date:d.date,reason:reason.trim()});
    await loadWeek({weekId:S.week.id,year:S.week.year,from:S.week.from},false,d.date);
    if(!tm53Desktop()&&S.week){S.mobileDetail=true;renderEditorLegacyMobile();}
    // Borang suntingan dibuka di ruang kanan; popup hanya untuk semakan Ketua / GPK / GB.
    // loadWeek sudah memaparkan medan sebenar apabila backend membenarkan suntingan.
  }
  function reviewCard(role){
    // V5.3.17: PWA: arahan pembetulan di halaman berasingan, bukan di bawah ulasan.
    if(!tm53Desktop()){
      if(role==='GB')return `<section class="tm5-card tm5-review tm532-review-card"><h3>Pengesahan Guru Besar</h3><p>Laporan yang telah disokong GPK sedia untuk pengesahan.</p><button class="primary" type="button" id="tm5-review-submit">Sahkan Laporan</button></section>`;
      return `<section class="tm5-card tm5-review tm532-review-card"><h3>Semakan GPK Penyelia</h3>
        <label>Ulasan dan Cadangan GPK<textarea id="tm5-review-note" rows="4" placeholder="Sila masukkan ulasan dan cadangan...">${esc(S.gpkDraftNote||'')}</textarea></label>
        <div class="tm5317-review-actions"><button type="button" class="primary" id="tm5-review-submit">Sokong kepada GB</button>
        <button type="button" id="tm5317-open-return">Pulangkan untuk Pembetulan</button></div></section>`;
    }
    if(role==='GB')return `<section class="tm5-card tm5-review tm532-review-card"><h3>Pengesahan Guru Besar</h3>
      <p class="tm532-review-help">Laporan telah disemak GPK Penyelia. Sila sahkan laporan selepas penelitian.</p>
      <button class="primary" id="tm5-gb-confirm" type="button">Sahkan Laporan</button></section>`;
    return `<section class="tm5-card tm5-review tm532-review-card"><h3>Semakan GPK Penyelia</h3>
      <label>Ulasan dan Cadangan GPK<textarea id="tm5-review-note" rows="4" placeholder="Sila masukkan ulasan dan cadangan semakan..."></textarea></label>
      <div class="tm532-review-actions"><button class="primary" type="button" id="tm5-gpk-approve">Sokong kepada GB</button><button type="button" id="tm5-gpk-return">Pulangkan untuk Pembetulan</button></div></section>`;
  }
  function tm5317OfficialReturnPage(){
    if(tm53Desktop()||!S.actor?.isGPK||S.week?.status!=='MENUNGGU_GPK')return;
    const valid=S.days.filter(d=>!d.holiday);
    slot().innerHTML=`<div class="tm5317-return-page tm538-mobile-page">
       <button type="button" class="tm538-back-button" id="tm5317-return-back">← Kembali ke Semakan GPK</button>
       <section class="tm5-card tm5317-return-card"><span class="tm5317-kicker">SEMAKAN GPK PENYELIA</span>
       <h2>Pulangkan untuk Pembetulan</h2><p class="tm5317-help">Pilih satu atau beberapa hari. Hanya hari pilihan akan dibuka untuk pembetulan.</p>
       <div class="tm5317-return-options" role="group" aria-label="Hari yang perlu dibetulkan">
         ${valid.map(d=>`<button type="button" class="tm5317-return-day" aria-pressed="false" data-tm5317-date="${esc(d.date)}"><span><strong>${esc(d.day)}</strong><small>${showDate(d.date)}</small></span><span class="tm5317-day-check" aria-hidden="true">✓</span></button>`).join('')}
       </div><p class="tm5317-count" aria-live="polite">Belum memilih hari</p>
       <label class="tm5317-note-label">Arahan Pembetulan GPK<textarea id="tm5317-return-note" rows="5" placeholder="Nyatakan dengan jelas perkara yang perlu dibetulkan..."></textarea></label>
       <p class="tm5317-error" role="alert" hidden></p>
       <button class="primary tm5317-submit" type="button" id="tm5317-send-return">Hantar Arahan Pembetulan</button>
       </section></div>`;
    const selected=new Set(),error=slot().querySelector('.tm5317-error');
    const warn=t=>{error.textContent=t;error.hidden=false;};
    slot().querySelector('#tm5317-return-back').onclick=()=>{S.returnPage=false;renderEditorLegacyMobile();tm5316ScrollTop(root);};
    slot().querySelectorAll('[data-tm5317-date]').forEach(b=>b.onclick=()=>{
      const date=b.dataset.tm5317Date;if(selected.has(date))selected.delete(date);else selected.add(date);
      b.classList.toggle('is-selected',selected.has(date));b.setAttribute('aria-pressed',String(selected.has(date)));
      slot().querySelector('.tm5317-count').textContent=selected.size?`${selected.size} hari dipilih untuk pembetulan`:'Belum memilih hari';
      error.hidden=true;
    });
    slot().querySelector('#tm5317-send-return').onclick=guard(async()=>{
      const note=slot().querySelector('#tm5317-return-note')?.value.trim()||'';
      if(!selected.size)return warn('Sila pilih sekurang-kurangnya satu hari.');
      if(!note)return warn('Sila nyatakan arahan pembetulan.');
      await review('RETURN',[...selected].map(date=>({date,note})));
    });
    tm5316ScrollTop(root);
  }
  function tm533OpenReturnModal(){
    if(!tm53Desktop()||!S.actor?.isGPK||S.week?.status!=='MENUNGGU_GPK')return;
    S.returnRoot?.remove();
    const overlay=document.createElement('div');overlay.className='tm524-modal-overlay tm533-return-overlay';
    overlay.innerHTML=`<section class="tm524-modal tm533-return-modal" role="dialog" aria-modal="true" aria-labelledby="tm533-return-heading" tabindex="-1">
      <div class="tm524-modal-top"><div><strong id="tm533-return-heading">Pulangkan untuk Pembetulan</strong><span>Pilih satu atau beberapa hari untuk dibuka semula</span></div><button type="button" class="tm524-close" data-tm533-close aria-label="Tutup">✕</button></div>
      <div class="tm533-return-content"><p class="tm533-return-label">01 · Pilih hari laporan yang perlu dibetulkan</p><div class="tm533-return-tabs" role="group" aria-label="Pilih hari pembetulan">
        ${S.days.filter(d=>!d.holiday).map(d=>`<button type="button" class="tm533-return-day" aria-pressed="false" data-tm533-return-date="${esc(d.date)}">${esc(d.day)}<small>${showDate(d.date)}</small></button>`).join('')}
      </div><p class="tm533-return-help">Anda boleh memilih lebih daripada satu hari.</p>
      <label class="tm533-return-label" for="tm533-return-note">02 · Catatan dan arahan pembetulan</label>
      <textarea id="tm533-return-note" rows="5" placeholder="Nyatakan perkara yang perlu dibetulkan oleh guru bertugas bagi hari yang dipilih..."></textarea>
      <p class="tm533-return-error" role="alert" hidden></p></div>
      <div class="tm524-modal-actions"><button type="button" data-tm533-close>Batal</button><button type="button" class="primary" id="tm533-return-submit">Hantar Arahan Pembetulan</button></div></section>`;
    root.appendChild(overlay);S.returnRoot=overlay;
    const selected=new Set();
    const error=overlay.querySelector('.tm533-return-error');
    const warn=m=>{error.hidden=false;error.textContent=m;};
    overlay.querySelectorAll('[data-tm533-return-date]').forEach(b=>b.onclick=()=>{
      const date=b.dataset.tm533ReturnDate;if(selected.has(date))selected.delete(date);else selected.add(date);
      b.setAttribute('aria-pressed',selected.has(date)?'true':'false');error.hidden=true;
    });
    const close=()=>{overlay.remove();if(S.returnRoot===overlay)S.returnRoot=null;};
    overlay.querySelectorAll('[data-tm533-close]').forEach(b=>b.onclick=close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.querySelector('#tm533-return-submit').onclick=guard(async()=>{
      if(!selected.size)return warn('Sila pilih sekurang-kurangnya satu hari laporan.');
      const note=overlay.querySelector('#tm533-return-note');
      if(!note.value.trim()){warn('Sila masukkan catatan pembetulan.');note.focus();return;}
      await review('RETURN',[...selected].map(date=>({date,note:note.value.trim()})));
    });
    overlay.querySelector('.tm533-return-modal').focus();
  }
  async function review(decision,selectedCorrections=null){
    const isGpk=!!S.actor?.isGPK;
    // Keputusan PWA diberi terus oleh butang semakan; RETURN datang daripada halaman pembetulan.
    if(!isGpk&&decision!=='APPROVE')throw Error('Pengesahan Guru Besar hanya mempunyai tindakan Sahkan.');
    const corrections=Array.isArray(selectedCorrections)?selectedCorrections:[];
    // Pemilihan hari dibuat di halaman berasingan; jangan baca checkbox lama di bawah ulasan.
    if(decision==='RETURN'&&(!corrections.length||corrections.some(x=>!x.note.trim())))throw Error('Pilih hari dan isi arahan pembetulan bagi setiap hari yang dipilih.');
    if(isGpk&&decision==='APPROVE'){
      const note=slot().querySelector('#tm5-review-note');
      if(note&&!note.value.trim()){tm533Invalid(slot(),note,'Sila isi ulasan dan cadangan GPK sebelum menyokong laporan.');return;}
    }
    if(!await tm5318Confirm(isGpk?(decision==='APPROVE'?'Sokong laporan kepada Guru Besar?':'Pulangkan laporan untuk pembetulan?'):'Sahkan laporan sebagai Guru Besar?'))return;
    await call({op:isGpk?'tm5GpkReview':'tm5GBReview',...common(),decision,note:isGpk||!tm53Desktop()?(S.returnPage?S.gpkDraftNote:(slot().querySelector('#tm5-review-note')?.value||'')):'',corrections});
    S.returnRoot?.remove();S.returnRoot=null;S.returnPage=false;S.gpkDraftNote='';
    await loadWeek({weekId:S.week.id,year:S.week.year,from:S.week.from},false,S.current?.date);
    if(!tm53Desktop()){
      const title=decision==='RETURN'?'Laporan dipulangkan untuk pembetulan':isGpk?'Semakan GPK berjaya dihantar':'Laporan berjaya disahkan';
      const detail=decision==='RETURN'?'Arahan pembetulan telah dihantar kepada guru berkaitan.':isGpk?
        'Laporan telah disokong dan dihantar untuk pengesahan Guru Besar.':'Pengesahan Guru Besar telah direkodkan.';
      tm5316Success(title,detail,()=>tm5316ScrollTop(root.querySelector('.tm538-week-banner')||root));
    }
  }
  async function saveWeek(submit){
    if(submit&&tm53Desktop()){
      const summary=slot().querySelector('#tm5-summary'),followup=slot().querySelector('#tm5-followup');
      if(summary&&!summary.value.trim()){tm533Invalid(slot(),summary,'Sila isi ulasan keseluruhan Ketua Kumpulan.');return;}
      if(followup&&!followup.value.trim()){tm533Invalid(slot(),followup,'Sila isi cadangan atau tindakan susulan.');return;}
    }
    if(submit&&!await tm5318Confirm('Hantar laporan kepada GPK?'))return;
    await call({op:'tm5SaveWeek',...common(),summary:slot().querySelector('#tm5-summary').value,
      followup:slot().querySelector('#tm5-followup').value,submit});
    await loadWeek({weekId:S.week.id,year:S.week.year,from:S.week.from},false,S.current?.date);
    if(submit&&!tm53Desktop())tm5316Success('Laporan berjaya dihantar',
      'Laporan mingguan telah dihantar kepada GPK Penyelia untuk semakan.',
      ()=>tm5316ScrollTop(root.querySelector('.tm538-week-banner')||root));
  }
  // Desktop-only layout: PWA uses the existing one-column report form.
  function tm53Desktop(){return window.matchMedia('(min-width: 901px)').matches;}
  function field(key,title,options,value){const o=value||{},v=String(o.status||''),desktop=tm53Desktop();return `<div class="tm5-field" data-pair="${key}">
    <label>${esc(title)}<select data-status="${key}" ${desktop?'required':''}><option value="" ${!v?'selected':''} ${desktop?'disabled hidden':''}>${desktop?"Pilih status":"Pilih..."}</option>${options.map(x=>`<option value="${x}" ${v===x?'selected':''}>${x.replaceAll('_',' ')}</option>`).join('')}</select></label>
    <div data-extra="${key}">${desktop?
      tm523Narrative_(`data-text="${key}"`,o.text||'',key==='speech_gb'?'Sila isi ucapan guru besar / pentadbir di sini...':key==='speech_duty'?'Sila isi ucapan guru bertugas di sini...':key==='speech_discipline'?'Sila isi ucapan guru disiplin di sini...':'Sila berikan penerangan atau huraian di sini...'):
      `<label>Catatan / Penerangan<textarea data-text="${key}">${esc(o.text||'')}</textarea></label>`}</div></div>`;}
  function items(list,type){const desktop=tm53Desktop();return (list||[]).map((a,i)=>desktop?
    `<div class="tm53-repeat-item tm5-field" data-${type}-item>
       ${type==='activity'?`<div class="tm53-repeat-grid"><label>Tajuk Aktiviti<input data-item-title value="${esc(a.title||'')}" maxlength="200" placeholder="Nama aktiviti"></label>
       <label>Ringkasan${tm523Narrative_('data-item-desc',a.desc||'','Sila isi ringkasan aktiviti di sini...')}</label></div>`:
       `<label>${i===0?"Nama Pelawat 1":"Nama Pelawat"}<input data-item-title value="${esc(a||'')}" maxlength="250" placeholder="Nama pelawat"></label>`}
       <button type="button" data-remove class="tm53-remove" aria-label="Buang ${type==='activity'?'aktiviti':'pelawat'} ${i+1}">Buang</button>
     </div>`:
    `<div class="tm5-field" data-${type}-item><label>${type==='activity'?'Aktiviti':'Pelawat'} ${i+1}</label>
    <input data-item-title value="${esc(type==='activity'?a.title:a)}" placeholder="${type==='activity'?'Tajuk aktiviti':'Nama / maklumat pelawat'}">
    ${type==='activity'?`<textarea data-item-desc placeholder="Penerangan aktiviti">${esc(a.desc||'')}</textarea>`:''}<button type="button" data-remove>Buang</button></div>`).join('');}
  function tm53OfficialDesktopFields(d,x){
    const program=['Perhimpunan Pagi','Penerapan Nilai','Senamrobik','Bacaan Hadis 40','Bacaan Yaasin'][d.dayIndex]||'Program Makmur';
    const block=(title,inner)=>`<section class="tm53-form-section"><h4>${title}</h4><div class="tm53-field-grid">${inner}</div></section>`;
    return `<div class="tm53-official-form">
      ${block('Laporan Perhimpunan Rasmi / Rehat',
       field('speech_gb','Ucapan Guru Besar / Pentadbir',['ADA','TIADA'],x.speech_gb)+
       field('speech_duty','Ucapan Guru Bertugas',['ADA','TIADA'],x.speech_duty)+
       field('speech_discipline','Ucapan Guru Disiplin',['ADA','TIADA'],x.speech_discipline))}
      ${block('Laporan Kebersihan', [['clean_student','Tandas Murid'],['clean_teacher','Tandas Guru'],['clean_hall','Dewan Sri Makmur'],['clean_ground','Persekitaran Sekolah']].map(([k,v])=>field(k,v,['BERSIH','MEMUASKAN','PERLU_PERHATIAN'],x[k])).join(''))}
      ${block('Laporan Kawalan dan Disiplin Murid', [['discipline_assembly','Waktu Perhimpunan'],['discipline_break','Waktu Rehat'],['discipline_exit','Waktu Pulang']].map(([k,v])=>field(k,v,['TERKAWAL','MEMUASKAN','PERLU_PERHATIAN'],x[k])).join(''))}
      ${block('Lain-lain',
       `<div class="tm53-field" data-tm53-makmur><label>Program Makmur <small>· ${esc(program)}</small><select id="tm5-program" required><option value="" ${!x.makmur_status?'selected':''} disabled hidden>Pilih status</option><option value="ADA" ${x.makmur_status==='ADA'?'selected':''}>Berjalan</option><option value="BATAL" ${x.makmur_status==='BATAL'?'selected':''}>Batal</option></select></label></div>
        <div class="tm53-field" data-tm53-program-note><label>Catatan pelaksanaan${tm523Narrative_('id="tm53-makmur-note"',x.makmur_note||'','Sila nyatakan pelaksanaan Program Makmur di sini...')}</label></div>
        ${d.dayIndex===0?`<p class="tm53-smallhint">Guru pengendali: Kumpulan ${esc(S.week.group)}</p>`:`<div class="tm53-field" data-program-teacher><label>Guru Pengendali<select id="tm5-program-teacher"><option value="" ${!x.makmur_teacher?'selected':''} disabled hidden>Pilih guru</option>${S.teachers.map(t=>`<option value="${esc(t.id)}" ${String(x.makmur_teacher)===String(t.id)?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label></div>`}
        <div data-cancel-wrap class="tm53-field"><label>Sebab pembatalan${tm523Narrative_('id="tm5-cancel"',x.makmur_cancel_reason||'','Sila nyatakan sebab pembatalan di sini...')}</label></div>`)}
      <section class="tm53-form-section"><h4>Jemputan / Kehadiran Pelawat</h4>
        <input id="tm5-visitors-status" type="hidden" value="${(x.visitors||[]).length?'ADA':'TIADA'}">
        <div id="tm5-visitors" class="tm53-repeater">${items((x.visitors||[]).length?x.visitors:[''],'visitor')}</div>
        <button type="button" id="tm5-add-visitor" class="tm53-add">+ Tambah Nama</button></section>
      <section class="tm53-form-section"><h4>Laporan Aktiviti / Program</h4>
        <div class="tm53-field-grid"><div class="tm53-field"><label>Aktiviti / Program<select id="tm53-activities-status" required><option value="" ${(x.activities||[]).length?'':'selected'} disabled hidden>Pilih status</option><option value="TIADA">Tiada</option><option value="ADA" ${(x.activities||[]).length?'selected':''}>Ada</option></select></label></div></div>
        <div id="tm5-activities" class="tm53-repeater">${items(x.activities,'activity')}</div><button type="button" id="tm5-add-activity" class="tm53-add">+ Tambah Aktiviti</button>
      </section></div>`;
  }
  function renderDay(targetEl=null){const d=S.current;if(!d||(!d.available&&!d.holiday&&d.status!=='LENGKAP'))return;const edit=dayWritable(d)&&(tm53Desktop()||d.status!=='LENGKAP'),x=d.data||{},el=targetEl||slot().querySelector('#tm5-detail');if(!el)return;
    if(d.holiday){el.innerHTML=`<section class="tm5-card tm52-holiday-card"><h3>${esc(d.day)} · ${showDate(d.date)}</h3><div class="tm52-holiday">${esc(d.holidayTitle||'Cuti Persekolahan')}</div><p>Tiada laporan harian diperlukan pada tarikh ini. Hari ini tetap dicetak dalam laporan mingguan.</p></section>`;return;}
    if(!edit){
      const hasData=(!tm53Desktop()||d.status==='LENGKAP')&&!!d.data&&Object.keys(d.data).length>0;
      const reopenAllowed=S.actor?.isLeader&&d.status==='LENGKAP'&&['BELUM_DIHANTAR','LENGKAP','DIPULANGKAN'].includes(S.week.status);
      el.innerHTML=`<section class="tm5-card tm5-day-view"><div class="tm5-formhead"><h3>${esc(d.day)} · ${showDate(d.date)}</h3>
        <span class="tm5-pill">${esc(dayStatus(d.status))}</span></div>
        ${hasData?docDay(d):`<div class="tm5-empty">${S.actor?.isMember&&!S.actor?.isLeader&&d.teacher!==tmMe()?'Anda tidak bertugas untuk mengisi borang pada hari ini.': 'Laporan belum diisi atau masih dalam proses.'}</div>`}
        ${!tm53Desktop()&&tm525MayEdit(d)?'<div class="tm5313-view-actions"><button type="button" id="tm5313-edit-completed">✎ Edit Laporan</button></div>':''}
        ${tm53Desktop()&&reopenAllowed?'<div class="tm5-field"><label>Alasan Buka Semula<textarea id="tm5-reopen-reason"></textarea></label><button id="tm5-reopen">Buka Semula Laporan</button></div>':''}
        </section>`;
      const editCompleted=el.querySelector('#tm5313-edit-completed');if(editCompleted)editCompleted.onclick=guard(()=>requestDayEdit(d.date));
      const reopen=el.querySelector('#tm5-reopen');if(reopen)reopen.onclick=guard(async()=>{
        await call({op:'tm5Reopen',...common(),date:d.date,reason:el.querySelector('#tm5-reopen-reason').value});
        await loadWeek({weekId:S.week.id,year:S.week.year,from:S.week.from},false,d.date);
      });return;
    }
    el.innerHTML=`<section class="tm5-card tm5-daily-form"><div class="tm5-formhead"><h3>${esc(d.day)} · ${showDate(d.date)}</h3><span class="tm5-pill">${esc(dayStatus(d.status))}</span></div>
      ${S.corrections.filter(c=>String(c.Tarikh)===d.date&&String(c.Status)==='TERBUKA').map(c=>`<div class="tm5-fix-note"><strong>Arahan pembetulan</strong><p>${esc(c.Catatan)}</p></div>`).join('')}
      ${tm53OfficialDesktopFields(d,x)}
      ${edit?'<div class="tm5-row tm5-save-actions"><button id="tm5-save-draft">Simpan Draf</button><button class="primary" id="tm5-finish">Tandakan Lengkap & Kunci</button></div>':''}
      ${S.actor?.isLeader&&d.status==='LENGKAP'&&['BELUM_DIHANTAR','LENGKAP','DIPULANGKAN'].includes(S.week.status)?'<div class="tm5-field"><label>Alasan Buka Semula<textarea id="tm5-reopen-reason"></textarea></label><button id="tm5-reopen">Buka Semula Laporan</button></div>':''}
    </section>`;
    tm523BindNumbering_(el); // Borang penuh desktop/PWA: fungsi penomboran catatan seragam.
    el.querySelector('#tm5-program').value=x.makmur_status||'';el.querySelector('#tm5-visitors-status').value=x.visitors_status||'TIADA';
    const desktop=true; // Kod borang penuh digunakan oleh desktop dan PWA; UI desktop asal kekal.
    const toggle=()=>{el.querySelectorAll('[data-pair]').forEach(p=>{const k=p.dataset.pair,v=p.querySelector('select').value;
      p.querySelector('[data-extra]').hidden= v==='TIADA'||(k.startsWith('clean_')||k.startsWith('discipline_'))&&v!=='PERLU_PERHATIAN'||!v;});
      const running=el.querySelector('#tm5-program').value==='ADA';
      el.querySelector('[data-cancel-wrap]').hidden=running;
      const note=el.querySelector('[data-tm53-program-note]');if(note)note.hidden=!running;
      const teacher=el.querySelector('[data-program-teacher]');if(teacher)teacher.hidden=!running;
      if(desktop){
        const has=el.querySelector('#tm53-activities-status').value==='ADA';
        el.querySelector('#tm5-activities').hidden=!has;el.querySelector('#tm5-add-activity').hidden=!has;
        el.querySelector('#tm5-visitors').hidden=false;el.querySelector('#tm5-add-visitor').hidden=false;
      }else{
        const has=el.querySelector('#tm5-visitors-status').value==='ADA';
        el.querySelector('#tm5-visitors').hidden=!has;el.querySelector('#tm5-add-visitor').hidden=!has;
      }
    };
    el.querySelectorAll('select').forEach(s=>s.onchange=toggle);toggle();
    if(!edit){el.querySelectorAll('input,select,textarea,button:not(#tm5-reopen)').forEach(x=>x.disabled=true);}
    else{el.querySelector('#tm5-save-draft').onclick=guard(()=>saveDay(false));el.querySelector('#tm5-finish').onclick=guard(()=>saveDay(true));
      el.querySelector('#tm5-add-activity').onclick=()=>el.querySelector('#tm5-activities').insertAdjacentHTML('beforeend',items([{title:'',desc:''}],'activity'));
      el.querySelector('#tm5-add-visitor').onclick=()=>{el.querySelector('#tm5-visitors').insertAdjacentHTML('beforeend',items([''],'visitor'));if(desktop)tm523VisitorLabels_(el,'[data-visitor-item]');};
      el.addEventListener('click',ev=>{if(ev.target.closest('[data-remove]')){ev.target.closest('.tm5-field').remove();if(desktop)tm523VisitorLabels_(el,'[data-visitor-item]');}});}
    const reopen=el.querySelector('#tm5-reopen');if(reopen)reopen.onclick=guard(async()=>{const reason=el.querySelector('#tm5-reopen-reason').value;
      await call({op:'tm5Reopen',...common(),date:d.date,reason});await loadWeek({weekId:S.week.id,year:S.week.year,from:S.week.from},false,d.date);});
    if(!tm53Desktop()&&edit)tm5313Wizard(el.querySelector('.tm53-official-form'));
  }
  function collect(){const area=S.modalRoot?.querySelector('.tm524-modal-detail .tm5-daily-form')||slot().querySelector('#tm5-detail'),out={},desktop=!!area?.querySelector('.tm53-official-form');area.querySelectorAll('[data-pair]').forEach(el=>{
    out[el.dataset.pair]={status:el.querySelector('select').value,text:el.querySelector('[data-text]')?.value||''};});
    out.makmur_status=area.querySelector('#tm5-program').value;out.makmur_teacher=area.querySelector('#tm5-program-teacher')?.value||'';
    out.makmur_cancel_reason=area.querySelector('#tm5-cancel').value;
    if(desktop){out.makmur_note=area.querySelector('#tm53-makmur-note')?.value||'';
      const hasActivity=area.querySelector('#tm53-activities-status').value==='ADA';
      out.activities=hasActivity?[...area.querySelectorAll('[data-activity-item]')].map(x=>({title:x.querySelector('[data-item-title]').value.trim(),desc:x.querySelector('[data-item-desc]').value.trim()})):[];
      if(hasActivity&&!out.activities.length)throw Error('Tambah sekurang-kurangnya satu aktiviti atau pilih Tiada.');
      out.visitors=[...area.querySelectorAll('[data-visitor-item]')].map(x=>x.querySelector('[data-item-title]').value.trim()).filter(Boolean);
      out.visitors_status=out.visitors.length?'ADA':'TIADA';
    }else{
      if(S.current?.data?.discipline_assembly)out.discipline_assembly=S.current.data.discipline_assembly;
      if(S.current?.data?.makmur_note!==undefined)out.makmur_note=S.current.data.makmur_note;
      out.activities=[...area.querySelectorAll('[data-activity-item]')].map(x=>({title:x.querySelector('[data-item-title]').value,desc:x.querySelector('[data-item-desc]').value}));
      out.visitors_status=area.querySelector('#tm5-visitors-status').value;
      out.visitors=[...area.querySelectorAll('[data-visitor-item]')].map(x=>x.querySelector('[data-item-title]').value);
    }return out;
  }
  function tm532ValidateOfficial_(area){
    // Validasi lengkap digunakan untuk kedua-dua platform: PWA dan desktop.
    if(!area)throw Error('Borang laporan tidak ditemui.');
    tm533ClearFieldErrors(area);tm533BindClear(area);
    const fail=(control,message)=>{
      tm533Invalid(area,control,message);
      return false;
    };
    for(const pair of area.querySelectorAll('[data-pair]')){
      const dropdown=pair.querySelector('select');
      const label=pair.querySelector('label')?.childNodes[0]?.textContent?.trim()||'medan laporan';
      if(!dropdown?.value)return fail(dropdown,`Sila pilih status bagi ${label}.`);
      const explanation=pair.querySelector('[data-text]');
      const extraRequired=dropdown.value==='ADA'||dropdown.value==='PERLU_PERHATIAN';
      if(explanation&&extraRequired&&!explanation.value.trim())return fail(explanation,`Sila lengkapkan huraian bagi ${label}.`);
    }
    const makmur=area.querySelector('#tm5-program');
    if(!makmur?.value)return fail(makmur,'Sila pilih status Program Makmur.');
    if(makmur.value==='BATAL'&&!area.querySelector('#tm5-cancel')?.value.trim())return fail(area.querySelector('#tm5-cancel'),'Sila nyatakan sebab pembatalan Program Makmur.');
    if(makmur.value==='ADA'){
      const description=area.querySelector('#tm53-makmur-note');
      if(description&&!description.value.trim())return fail(description,'Sila isi catatan pelaksanaan Program Makmur.');
      const teacher=area.querySelector('#tm5-program-teacher');
      if(teacher&&!teacher.value)return fail(teacher,'Sila pilih guru pengendali Program Makmur.');
    }
    const activities=area.querySelector('#tm53-activities-status');
    if(!activities?.value)return fail(activities,'Sila pilih status Aktiviti / Program.');
    if(activities.value==='ADA'){
      const rows=[...area.querySelectorAll('[data-activity-item]')];
      if(!rows.length)return fail(activities,'Sila tambah sekurang-kurangnya satu aktiviti.');
      for(const [i,row] of rows.entries()){
        const title=row.querySelector('[data-item-title]'),desc=row.querySelector('[data-item-desc]');
        if(!title?.value.trim())return fail(title,`Sila isi tajuk Aktiviti ${i+1}.`);
        if(!desc?.value.trim())return fail(desc,`Sila isi ringkasan Aktiviti ${i+1}.`);
      }
    }
    // Tiada pelawat sah tanpa nama; jika lebih daripada satu nama diberikan, setiap baris tambahan wajib lengkap.
    const visitors=[...area.querySelectorAll('[data-visitor-item] input')];
    if(visitors.some(x=>x.value.trim())){
      for(const visitor of visitors)if(!visitor.value.trim())return fail(visitor,'Sila isi nama pelawat atau buang baris kosong.');
    }
    return true;
  }

  async function saveDay(complete){
    const date=S.current.date;
    const area=S.modalRoot?.querySelector('.tm524-modal-detail .tm5-daily-form')||slot().querySelector('#tm5-detail');
    if(complete&&!tm532ValidateOfficial_(area))return;
    if(complete&&!await tm5318Confirm('Laporan akan dikunci selepas dimuktamadkan. Teruskan?'))return;
    await call({op:'tm5SaveDay',...common(),date,data:collect(),complete});
    if(!tm53Desktop())S.mobileDetail=false;
    closeDayModal();await loadWeek({weekId:S.week.id,year:S.week.year,from:S.week.from},false,date);
  }
  const cell=(name,value)=>`<div class="tm5-doc-cell"><b>${esc(name)}</b><p>${esc(value||'—')}</p></div>`;
  const itemVal=(d,k)=>{const x=d?.data?.[k]||{};if(!x.status)return '—';
    if(x.status==='TIADA')return 'Tiada ucapan';if(x.status==='PERLU_PERHATIAN')return 'Perlu perhatian: '+(x.text||'');
    if(x.status==='ADA')return x.text||'—';return x.status==='BERSIH'?'Bersih':x.status==='TERKAWAL'?'Terkawal':x.status==='MEMUASKAN'?'Memuaskan':x.status;};
  function docDay(d){const v=d.data||{},program=['Perhimpunan Pagi','Penerapan Nilai','Senamrobik','Bacaan Hadis 40','Bacaan Yaasin'][d.dayIndex]||'Program Makmur';
    if(d.holiday)return `<section class="tm5-doc-day tm52-doc-holiday"><h3>${esc(d.day)} · ${showDate(d.date)}</h3><p><strong>Tiada laporan — ${esc(d.holidayTitle||'Cuti Persekolahan')}</strong></p></section>`;
    return `<section class="tm5-doc-day"><h3>${esc(d.day)} · ${showDate(d.date)}</h3><div class="tm5-doc-grid">
      ${cell('Ucapan Guru Besar / Pentadbir',itemVal(d,'speech_gb'))}${cell('Ucapan Guru Bertugas',itemVal(d,'speech_duty'))}${cell('Ucapan Guru Disiplin',itemVal(d,'speech_discipline'))}
      ${[['clean_student','Tandas Murid'],['clean_teacher','Tandas Guru'],['clean_hall','Dewan Sri Makmur'],['clean_ground','Persekitaran Sekolah'],...(v.discipline_assembly?[['discipline_assembly','Disiplin Waktu Perhimpunan']]:[]),['discipline_break','Disiplin Waktu Rehat'],['discipline_exit','Disiplin Waktu Pulang']].map(([k,label])=>cell(label,itemVal(d,k))).join('')}
      ${cell(program,v.makmur_status==='BATAL'?'Dibatalkan. '+(v.makmur_cancel_reason||''):'Berlangsung. '+(v.makmur_note?v.makmur_note+'. ':'')+'Guru pengendali: '+(d.dayIndex===0?'Kumpulan '+S.week.group:teacherName(v.makmur_teacher)))}
      ${cell('Laporan Aktiviti',(v.activities||[]).length?(v.activities||[]).map((a,i)=>`${i+1}. ${a.title}: ${a.desc}`).join('\n'):'Tiada laporan aktiviti yang berjalan pada hari ini.')}
      ${cell('Senarai Pelawat',v.visitors_status==='ADA'?(v.visitors||[]).join('; '):'Tiada pelawat dilaporkan.')}
      </div></section>`;
  }
  function documentHTML(){const w=S.week;return `<article class="tm5-document" id="tm5-document"><div class="tm5-doc-title"><div class="tm5-doc-school">SK SEGAMBUT MAKMUR</div>
    <h2>LAPORAN GURU BERTUGAS MINGGUAN</h2><p>Minggu ${esc(w.label)} · Kumpulan ${esc(w.group)} · ${showDate(w.from)} – ${showDate(w.to)}</p></div>
    <div class="tm5-doc-signatures"><div><b>Ketua Kumpulan</b><span>${esc(teacherName(w.leader))}</span></div><div><b>GPK Penyelia</b><span>${esc(teacherName(w.gpk))}</span></div></div>
    ${S.days.map(docDay).join('')}
    <section class="tm5-doc-day"><h3>Ulasan Ketua Kumpulan</h3>${cell('Ulasan Keseluruhan',w.summary)}${cell('Cadangan / Tindakan Susulan',w.followup)}</section>
    <section class="tm5-doc-day"><h3>Semakan dan Pengesahan</h3>${cell('Ulasan GPK',w.gpkNote)}${cell('Ulasan Guru Besar',w.gbNote)}
      ${cell('Disahkan Oleh',w.verifiedName||teacherName(w.verifiedBy))}${cell('Tarikh Pengesahan',String(w.verifiedAt||''))}</section>
    </article>`;}
  function tm5317OfficialRead(){
    const w=S.week||{};
    if(!isApproved())return;
    const fullDate=v=>String(v||'').match(/^\d{2}\/\d{2}\/\d{4}/)?esc(v):esc(v?showDate(v):'Tidak direkodkan');
    const gpkDate=w.gpkReviewedAt||w.gpkReviewedOn||w.gpkAt||w.gpkReviewAt||w.disemakPada||'';
    const dayCards=S.days.map(d=>{
      const reporter=d.holiday?'':String(d.recordedByName||d.reporterName||d.teacherName||teacherName(d.filledBy||d.teacher)||'—');
      const content=docDay(d).replace(/(<h3>[^<]*<\/h3>)/,`$1${d.holiday?'':`<p class="tm5317-reporter"><strong>Dilaporkan oleh</strong> ${esc(reporter)}</p>`}`);
      return `<div class="tm5317-read-day">${content}</div>`;
    }).join('');
    setTab('preview');slot().innerHTML=`<div class="tm5317-read-report">
      <div class="tm5317-read-actions"><button type="button" id="tm5317-read-back">← Direktori Program</button>
      <button type="button" class="primary" id="tm5317-read-print">▤ Cetak</button></div>
      <header class="tm5317-read-head"><span class="tm5317-kicker">LAPORAN MINGGUAN DISAHKAN</span>
        <h2>Minggu ${esc(w.label)}</h2><h3>Kumpulan ${esc(w.group)}</h3>
        <p>${showDate(w.from)} – ${showDate(w.to)}</p>
        <div class="tm5317-people"><div><small>GPK Penyelia</small><strong>${esc(teacherName(w.gpk))}</strong></div>
          <div><small>Ketua Kumpulan</small><strong>${esc(teacherName(w.leader))}</strong></div></div></header>
      ${dayCards}
      <section class="tm5317-read-section"><h3>Ulasan Ketua Kumpulan</h3>${cell('Ulasan Keseluruhan',w.summary)}${cell('Cadangan / Tindakan Susulan',w.followup)}</section>
      <section class="tm5317-read-section"><h3>Semakan GPK Penyelia</h3>
        <p class="tm5317-meta"><strong>Disemak oleh:</strong> ${esc(teacherName(w.gpk))}</p>
        <p class="tm5317-meta"><strong>Tarikh:</strong> ${gpkDate?fullDate(gpkDate):'Tidak direkodkan dalam data tersedia'}</p>
        ${cell('Ulasan / Cadangan GPK',w.gpkNote)}</section>
      <section class="tm5317-read-section"><h3>Pengesahan Guru Besar</h3>
        <p class="tm5317-meta"><strong>Disahkan oleh:</strong> ${esc(w.verifiedName||teacherName(w.verifiedBy))}</p>
        <p class="tm5317-meta"><strong>Tarikh:</strong> ${fullDate(w.verifiedAt)}</p>
        ${w.gbNote?cell('Catatan Guru Besar',w.gbNote):''}</section>
      </div>`;
    slot().querySelector('#tm5317-read-back').onclick=()=>directory(false);
    slot().querySelector('#tm5317-read-print').onclick=printDocument;
    tm5316ScrollTop(root);
  }
  function renderDocument(){if(!S.week||!daysAllComplete()){msg('Pratonton hanya tersedia setelah semua laporan hari sekolah lengkap.',true);return;}
    if(!tm53Desktop()&&isApproved())return tm5317OfficialRead();
    setTab('preview');slot().innerHTML=`<section class="tm5-card tm5-preview-banner"><div><h2>Minggu ${esc(S.week.label)} · Kumpulan ${esc(S.week.group)}</h2>
       <span>${showDate(S.week.from)} – ${showDate(S.week.to)}</span></div><div class="tm5-banner-right">
       <button id="tm5-preview-back">← Direktori</button>${isApproved()?'<button id="tm525-download-preview" type="button">Muat Turun Dokumen</button><button id="tm5-print-preview" class="primary">Cetak Laporan Ini</button>':'<span class="tm52-not-approved">Pratonton sahaja · Belum disahkan GB</span>'}</div></section>
       ${documentHTML()}`;
    slot().querySelector('#tm5-preview-back').onclick=guard(directory);
    const pbtn=slot().querySelector('#tm5-print-preview');if(pbtn)pbtn.onclick=printDocument;
    const download=slot().querySelector('#tm525-download-preview');if(download)download.onclick=downloadDocument;
  }
  // V5.2.8: Template HTML A4 — data rasmi dibaca daripada laporan yang sudah dimuatkan.
  // Tidak mengubah data Sheets, Firestore atau kebenaran laporan.
  function tm528OfficialPayload(){
    const w=S.week||{},teacherMap=Object.fromEntries((S.teachers||[]).map(t=>[String(t.id),String(t.name||'')]));
    const resolveName=(id,fromRecord='')=>String(fromRecord||teacherMap[String(id)]||'');
    const days=(S.days||[]).map(d=>{
      const data={...(d.data||{})};
      if(data.makmur_teacher)data.makmur_teacher_name=resolveName(data.makmur_teacher);
      return {...d,reporter:resolveName(d.teacher,d.teacherName||d.recordedByName||''),data};
    });
    return {status:String(w.status||''),simulation:false,year:String(w.year||tmState.year),
      week:String(w.label||''),group:String(w.group||''),from:w.from,to:w.to,
      leader:resolveName(w.leader,w.leaderName||''),gpk:resolveName(w.gpk,w.gpkName||''),
      summary:w.summary||'',followup:w.followup||'',gpkNote:w.gpkNote||'',gbNote:w.gbNote||'',
      verifiedName:resolveName(w.verifiedBy,w.verifiedName||''),verifiedAt:w.verifiedAt||'',days};
  }
  function tm528PrintReady(){
    if(!isApproved()){msg('Laporan belum disahkan oleh Guru Besar.',true);return false;}
    if(!window.SeMAKMUR_TM528_PRINT){msg('Template cetakan V5.2.8 belum dimuatkan. Semak fungsi cetakan dalam Fi-TugasanMingguan.js.',true);return false;}
    return true;
  }
  function downloadDocument(){
    if(!tm528PrintReady())return;
    try{window.SeMAKMUR_TM528_PRINT.download(tm528OfficialPayload());}
    catch(e){msg(e?.message||'Muat turun dokumen gagal.',true);}
  }
  function printDocument(){
    if(!tm528PrintReady())return;
    try{window.SeMAKMUR_TM528_PRINT.open(tm528OfficialPayload());}
    catch(e){msg(e?.message||'Pratonton cetakan tidak dapat dibuka.',true);}
  }
  // P1: jangan mengambil direktori/laporan ketika tab laporan tidak dibuka.
  // `openPrimary` atau `openFromOverview` akan memuat sekali ketika pengguna memerlukan data.
  // V5.3.11: satu enjin Mod Ujian untuk desktop dan PWA, akses hanya pentadbir.
  // PWA menggunakan header dashboard induk apabila iframe berasal dari domain sama.
  // Jika header induk tidak boleh dicapai, switch fallback kekal dalam iframe.
  let parentDemoSwitch=null,parentDemoStyle=null,hostObserver=null,hostFrame=null;
  const pwaView=()=>window.matchMedia('(max-width:900px)').matches;
  const demoActive=()=>window.SeMAKMUR_TM52_DEMO?.isOn()===true;
  function unmountParentSwitch(){
    hostObserver?.disconnect();hostObserver=null;
    parentDemoSwitch?.remove();parentDemoSwitch=null;
    parentDemoStyle?.remove();parentDemoStyle=null;
    hostFrame=null;
  }
  function mountParentSwitch(){
    if(!pwaView()||!tmManager()||window.parent===window){unmountParentSwitch();return false;}
    try{
      const doc=window.parent.document;
      const header=doc.querySelector('#v4-mobile-head');
      const actions=header?.querySelector('.v4-head-actions');
      if(!header||!actions){unmountParentSwitch();return false;}
      if(parentDemoSwitch?.isConnected)return true;
      unmountParentSwitch();
      parentDemoStyle=doc.createElement('style');parentDemoStyle.id='tm5311-demo-host-style';
      parentDemoStyle.textContent=`@media(max-width:900px){
        #v4-mobile-head #tm5311-header-demo-switch{border:0;background:transparent;padding:5px 2px;display:inline-flex;align-items:center;justify-content:center;flex:none;cursor:pointer;order:-1}
        #v4-mobile-head #tm5311-header-demo-switch .tm5311-switch-track{display:block;position:relative;width:42px;height:24px;background:#ffffff42;border:1px solid #ffffff80;border-radius:999px;transition:background .15s}
        #v4-mobile-head #tm5311-header-demo-switch .tm5311-switch-knob{position:absolute;left:3px;top:3px;width:16px;height:16px;background:#fff;border-radius:50%;box-shadow:0 1px 3px #153d65a8;transition:transform .15s}
        #v4-mobile-head #tm5311-header-demo-switch[aria-checked="true"] .tm5311-switch-track{background:#28ae82;border-color:#d5ffe9}
        #v4-mobile-head #tm5311-header-demo-switch[aria-checked="true"] .tm5311-switch-knob{transform:translateX(17px)}
        #v4-mobile-head:has(#tm5311-header-demo-switch) #v4-header-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      }`;
      doc.head.appendChild(parentDemoStyle);
      parentDemoSwitch=doc.createElement('button');
      parentDemoSwitch.id='tm5311-header-demo-switch';parentDemoSwitch.type='button';
      parentDemoSwitch.setAttribute('role','switch');parentDemoSwitch.setAttribute('aria-checked','false');
      parentDemoSwitch.setAttribute('aria-label','Hidupkan Mod Ujian Pentadbir');
      parentDemoSwitch.title='Mod Ujian Pentadbir';
      parentDemoSwitch.innerHTML='<span class="tm5311-switch-track"><span class="tm5311-switch-knob"></span></span>';
      parentDemoSwitch.addEventListener('click',toggleDemo);
      actions.insertBefore(parentDemoSwitch,actions.firstChild);
      hostFrame=window.frameElement;
      // Elak switch modul tertinggal apabila pengguna membuka modul lain dalam dashboard.
      const updateHostVisibility=()=>{
        if(!parentDemoSwitch?.isConnected)return;
        const visible=!!hostFrame?.isConnected&&hostFrame.getClientRects().length>0;
        if(parentDemoSwitch.hidden===visible)parentDemoSwitch.hidden=!visible;
        const intended=visible?'':'none';
        if(parentDemoSwitch.style.display!==intended)parentDemoSwitch.style.display=intended;
      };
      hostObserver=new MutationObserver(updateHostVisibility);
      hostObserver.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['hidden','class','style']});
      updateHostVisibility();
      return true;
    }catch(e){unmountParentSwitch();return false;}
  }
  function syncDemoControls(){
    const admin=tmManager(),on=demoActive(),pwa=pwaView();
    if(!admin&&on)window.SeMAKMUR_TM52_DEMO?.off();
    const active=admin&&demoActive();
    document.documentElement.classList.toggle('tm5311-demo-on',active&&pwa);
    const desktop=root.querySelector('#tm52-demo-toggle');
    if(desktop){desktop.hidden=!admin;desktop.textContent='Mod Ujian Pentadbir: '+(active?'ON':'OFF');desktop.setAttribute('aria-pressed',String(active));}
    const rolebar=document.getElementById('tm5311-demo-rolebar');
    if(rolebar){rolebar.hidden=!(admin&&active&&pwa);const sel=document.getElementById('tm5311-demo-role');if(sel)sel.value=window.SeMAKMUR_TM52_DEMO?.getRole?.()||'GURU';}
    if(admin&&pwa)mountParentSwitch();else unmountParentSwitch();
    const local=document.getElementById('tm5311-pwa-local-toggle');
    if(local)local.hidden=!(admin&&pwa&&!parentDemoSwitch);
    for(const el of [parentDemoSwitch,document.getElementById('tm5311-local-demo-switch')]){
      if(!el)continue;el.setAttribute('aria-checked',String(active));el.setAttribute('aria-label',(active?'Matikan':'Hidupkan')+' Mod Ujian Pentadbir');
    }
  }
  async function toggleDemo(){
    if(!tmManager())return;
    if((S.dirty||window.SeMAKMUR_TM52_DEMO?.hasUnsaved?.())&&!await tm5318Confirm('Borang belum disimpan. Tukar Mod Ujian?'))return;
    if(demoActive()){
      window.SeMAKMUR_TM52_DEMO.off();S.mobileDetail=false;S.dirty=false;S.screen='fill';
      syncDemoControls();if(tmState.tab==='report-studio')await guard(openPrimary)();
    }else{
      S.mobileDetail=false;S.dirty=false;
      tmTab('report-studio');setTab('fill');
      window.SeMAKMUR_TM52_DEMO?.on(slot());syncDemoControls();
    }
  }
  function init(){
    chrome();
    root.addEventListener('click',e=>{if(e.target.closest('#tm52-demo-toggle'))toggleDemo();});
    document.getElementById('tm5311-local-demo-switch')?.addEventListener('click',toggleDemo);
    document.getElementById('tm5311-demo-role')?.addEventListener('change',e=>{
      if(!tmManager()||!demoActive())return;
      window.SeMAKMUR_TM52_DEMO?.setRole?.(e.target.value);
    });
    document.addEventListener('semakmur-tm-auth-ready',syncDemoControls);
    window.addEventListener('semakmur-tm52-demo-changed',syncDemoControls);
    window.addEventListener('pagehide',unmountParentSwitch);
    window.addEventListener('resize',syncDemoControls,{passive:true});
  }
  function resume(){
    if(window.SeMAKMUR_TM52_DEMO?.isOn())return Promise.resolve();
    // Satu sesi: kembali ke tab yang sedang terbuka tanpa sync semula.
    if(S.screen==='directory'&&root.querySelector('.tm5-directory'))return Promise.resolve();
    if(S.screen==='preview'&&(root.querySelector('.tm5-document')||root.querySelector('.tm5317-read-report')))return Promise.resolve();
    if(S.screen==='fill'&&(root.querySelector('.tm5-editor-layout')||root.querySelector('.tm538-mobile-page')))return Promise.resolve();
    return openPrimary();
  }
  function notifyOverview(meta){
    if(!S.loaded||!meta||S.activeYear!==String(tmState.year))return;
    let changed=false;
    S.weeks.forEach(w=>{
      const next=meta[weekId(w)]?.reportStatus;
      if(next&&next!==w.status){w.status=next;changed=true;
        S.reportCache.delete(reporterKey(weekId(w),w.year||tmState.year));}
    });
    if(changed&&S.screen==='directory')directory(false);
    else if(changed&&S.screen==='fill')msg('Status laporan berubah. Tekan Muat Semula untuk mendapatkan perubahan terkini.');
  }
  window.SeMAKMUR_TM5_UI={openFromOverview:guard(openFromOverview),openPrimary:guard(openPrimary),
    resume:guard(resume),notifyOverview,clearCache:clearReportCache,resetAccount,
    reload:guard(async()=>{clearReportCache();await fetchWeeks(true);
      if(S.screen==='directory')return directory(false);
      if(S.week)return loadWeek({weekId:S.week.id,year:tmState.year,from:S.week.from},S.screen==='preview',S.current?.date);
      return openPrimary();})};
  init();
})();


/* SeMAKMUR V5.3.18 — Dialog rasmi PWA untuk mesej/amaran, persetujuan dan input.
   Desktop KEKAL menggunakan alert/confirm/prompt asal. Tindakan PWA ialah Promise:
   tidak boleh melangkaui pengesahan hanya kerana dialog visual tidak menyekat thread. */
function tm5318Mobile(){return window.matchMedia('(max-width: 900px)').matches;}
function tm5318Dialog(kind,message){
  return new Promise(resolve=>{
    const previous=document.activeElement;
    const overlay=document.createElement('div');
    const isPrompt=kind==='prompt',isConfirm=kind==='confirm';
    overlay.className='tm5318-overlay';
    const title=kind==='alert' && /tidak bertugas|tidak dibenarkan|belum tersedia|belum lengkap|tidak boleh/i.test(message)?'Makluman Akses':
      kind==='alert'?'Makluman':isPrompt?'Maklumat Diperlukan':'Pengesahan Tindakan';
    overlay.innerHTML=`<section class="tm5318-dialog" role="alertdialog" aria-modal="true" aria-labelledby="tm5318-title" aria-describedby="tm5318-message" tabindex="-1">
      <div class="tm5318-mark" aria-hidden="true">${isPrompt?'✎':isConfirm?'?':'!'}</div>
      <h3 id="tm5318-title"></h3>
      <p id="tm5318-message"></p>
      ${isPrompt?'<label class="tm5318-input-label" for="tm5318-prompt-value">Sila masukkan maklumat</label><textarea id="tm5318-prompt-value" rows="3" maxlength="1500" placeholder="Masukkan catatan di sini..."></textarea><p class="tm5318-input-error" role="alert" hidden>Sila isi maklumat sebelum meneruskan.</p>':''}
      <div class="tm5318-actions">${kind!=='alert'?'<button type="button" class="tm5318-cancel">Batal</button>':''}<button type="button" class="tm5318-ok">${kind==='alert'?'OK':isPrompt?'Simpan':'Teruskan'}</button></div>
    </section>`;
    overlay.querySelector('#tm5318-title').textContent=title;
    overlay.querySelector('#tm5318-message').textContent=String(message ?? '');
    document.body.append(overlay);
    const oldOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const card=overlay.querySelector('.tm5318-dialog');
    const ok=overlay.querySelector('.tm5318-ok');
    const cancel=overlay.querySelector('.tm5318-cancel');
    const input=overlay.querySelector('#tm5318-prompt-value');
    let completed=false;
    function done(result){
      if(completed)return;completed=true;
      overlay.removeEventListener('keydown',keys);
      overlay.remove();document.body.style.overflow=oldOverflow;
      try{if(previous?.isConnected)previous.focus({preventScroll:true});}catch(_){ }
      resolve(result);
    }
    function submit(){
      if(isPrompt){const value=input.value.trim();if(!value){const err=overlay.querySelector('.tm5318-input-error');err.hidden=false;input.focus();return;}done(value);}
      else done(isConfirm?true:undefined);
    }
    function keys(e){
      if(e.key==='Escape'){e.preventDefault();done(isPrompt?null:isConfirm?false:undefined);return;}
      if(e.key==='Tab'){
        const controls=[input,cancel,ok].filter(Boolean);
        const active=document.activeElement;const idx=controls.indexOf(active);
        if((e.shiftKey&&idx<=0)||(!e.shiftKey&&idx===controls.length-1)){
          e.preventDefault();(e.shiftKey?controls[controls.length-1]:controls[0]).focus();
        }
      }
      if(e.key==='Enter'&&!e.shiftKey&&document.activeElement!==input){e.preventDefault();submit();}
    }
    overlay.addEventListener('keydown',keys);
    ok.addEventListener('click',submit);
    cancel?.addEventListener('click',()=>done(isPrompt?null:false));
    // Klik di luar dialog tidak membenarkan operasi tanpa keputusan jelas.
    (input||ok).focus();
  });
}
async function tm5318Confirm(message){
  if(!tm5318Mobile())return window.confirm(message);
  return await tm5318Dialog('confirm',message);
}
async function tm5318Prompt(message){
  if(!tm5318Mobile())return window.prompt(message);
  return await tm5318Dialog('prompt',message);
}
function tm5318Alert(message){
  if(!tm5318Mobile()){window.alert(message);return Promise.resolve();}
  return tm5318Dialog('alert',message);
}

/* V5.3.16 — Navigasi PWA: selepas bertukar seksyen, bawa skrol ke atas borang.
   Dialog kejayaan hanya muncul selepas tindakan berjaya dalam Mod Ujian atau backend rasmi. */
function tm5316ScrollTop(element){
  if(!element||window.matchMedia('(min-width: 901px)').matches)return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    try{element.scrollIntoView({behavior:'auto',block:'start'});}catch(_){ }
  }));
}
function tm5316Success(title,description,afterClose){
  if(window.matchMedia('(min-width: 901px)').matches)return;
  document.querySelector('.tm5316-success-overlay')?.remove();
  const overlay=document.createElement('div');
  overlay.className='tm5316-success-overlay';
  overlay.innerHTML=`<section class="tm5316-success-dialog" role="alertdialog" aria-modal="true" aria-labelledby="tm5316-success-title" aria-describedby="tm5316-success-message" tabindex="-1">
    <span class="tm5316-success-icon" aria-hidden="true">✓</span>
    <h3 id="tm5316-success-title"></h3>
    <p id="tm5316-success-message"></p>
    <button type="button" class="tm5316-success-ok primary">OK</button>
  </section>`;
  overlay.querySelector('#tm5316-success-title').textContent=title;
  overlay.querySelector('#tm5316-success-message').textContent=description;
  document.body.append(overlay);
  const ok=overlay.querySelector('.tm5316-success-ok');
  const close=()=>{overlay.remove();document.removeEventListener('keydown',onKey);if(typeof afterClose==='function')afterClose();};
  const onKey=e=>{if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();close();}};
  document.addEventListener('keydown',onKey);
  ok.addEventListener('click',close,{once:true});ok.focus();
}

/* V5.3.19 — Semakan wajib PER SEKSIEN bagi Mod Ujian dan PWA rasmi sahaja.
   Menggunakan peraturan validasi akhir asal, tanpa mengubah tindakan Simpan Draf.
   Jika ada ralat, kekal pada seksyen yang sama dan fokus medan pertama. */
function tm5319ValidateWizardSection(step,form){
  if(!step||!form)return true;
  tm533ClearFieldErrors(step);
  step.querySelectorAll('.tm5319-has-error').forEach(el=>el.classList.remove('tm5319-has-error'));
  if(!form.dataset.tm5319ClearBound){
    form.dataset.tm5319ClearBound='1';
    const clear=(ev)=>{
      const control=ev.target;
      if(!control?.matches?.('select,input,textarea')||!control.classList.contains('tm533-invalid'))return;
      control.classList.remove('tm533-invalid');control.removeAttribute('aria-invalid');
      const label=control.closest('label');
      const note=label?.nextElementSibling;
      if(note?.classList.contains('tm5319-step-error'))note.remove();
      const group=control.closest('[data-pair],[data-dem-pair],.tm53-field,.tm53-repeat-item,.tm5-field')||label||control.parentElement;
      if(!group?.querySelector('.tm533-invalid'))group?.classList.remove('tm5319-has-error');
    };
    form.addEventListener('input',clear);
    form.addEventListener('change',clear);
  }
  const demo=form.classList.contains('tm53-demo-form');
  const issues=[];
  const add=(control,message)=>{if(control&&!control.disabled)issues.push({control,message});};
  const text=(selector)=>step.querySelector(selector)?.value?.trim()||'';
  for(const pair of step.querySelectorAll(demo?'[data-dem-pair]':'[data-pair]')){
    const select=pair.querySelector('select');
    if(!select||select.disabled)continue;
    const label=pair.querySelector('label')?.childNodes?.[0]?.textContent?.trim()||'medan laporan';
    if(!select.value){add(select,`Sila pilih status bagi ${label}.`);continue;}
    const note=pair.querySelector(demo?'[data-dem-note]':'[data-text]');
    if(note&&(select.value==='ADA'||select.value==='PERLU_PERHATIAN')&&!note.value.trim())
      add(note,`Sila lengkapkan huraian bagi ${label}.`);
  }
  const program=step.querySelector(demo?'#demo-program':'#tm5-program');
  if(program){
    if(!program.value)add(program,'Sila pilih status Program Makmur.');
    else if(program.value==='BATAL'){
      const reason=step.querySelector(demo?'#demo-program-reason':'#tm5-cancel');
      if(reason&&!reason.value.trim())add(reason,'Sila nyatakan sebab pembatalan Program Makmur.');
    }else if(program.value==='ADA'){
      const note=step.querySelector(demo?'#demo-program-note':'#tm53-makmur-note');
      if(note&&!note.value.trim())add(note,'Sila isi catatan pelaksanaan Program Makmur.');
      if(!demo){const teacher=step.querySelector('#tm5-program-teacher');
        if(teacher&&!teacher.value)add(teacher,'Sila pilih guru pengendali Program Makmur.');}
    }
  }
  const activity=step.querySelector(demo?'#demo-activity-status':'#tm53-activities-status');
  if(activity){
    if(!activity.value)add(activity,'Sila pilih status Aktiviti / Program.');
    else if(activity.value==='ADA'){
      const rows=[...step.querySelectorAll(demo?'[data-demo-activity]':'[data-activity-item]')];
      if(!rows.length)add(activity,'Sila tambah sekurang-kurangnya satu aktiviti.');
      rows.forEach((row,i)=>{
        const title=row.querySelector(demo?'[data-demo-title]':'[data-item-title]');
        const desc=row.querySelector(demo?'[data-demo-summary]':'[data-item-desc]');
        if(title&&!title.value.trim())add(title,`Sila isi tajuk Aktiviti ${i+1}.`);
        if(desc&&!desc.value.trim())add(desc,`Sila isi ringkasan Aktiviti ${i+1}.`);
      });
    }
  }
  const visitors=[...step.querySelectorAll(demo?'[data-demo-visitor] input':'[data-visitor-item] input')];
  if(visitors.some(el=>el.value.trim()))visitors.forEach(el=>{
    if(!el.value.trim())add(el,'Sila isi nama pelawat atau buang baris kosong.');
  });
  // Future required controls should also be checked in the current section.
  // Avoid duplicate messages for those already checked above.
  for(const control of step.querySelectorAll('input[required],select[required],textarea[required]')){
    if(control.disabled||control.type==='hidden'||issues.some(x=>x.control===control))continue;
    if(!control.value?.trim())add(control,'Medan wajib ini perlu dilengkapkan.');
  }
  if(!issues.length)return true;
  issues.forEach(({control,message})=>{
    const group=control.closest('[data-pair],[data-dem-pair],.tm53-field,.tm53-repeat-item,.tm5-field')||control.closest('label')||control.parentElement;
    const label=control.closest('label')||group;
    control.classList.add('tm533-invalid');control.setAttribute('aria-invalid','true');
    group?.classList.add('tm5319-has-error');
    const note=document.createElement('p');
    note.className='tm533-field-error tm5319-step-error';note.setAttribute('role','alert');
    const icon=document.createElement('span');icon.className='tm5319-error-icon';icon.setAttribute('aria-hidden','true');icon.textContent='!';
    const body=document.createElement('span');body.textContent=message;
    note.append(icon,body);
    (label||control).insertAdjacentElement('afterend',note);
  });
  const first=issues[0].control;
  requestAnimationFrame(()=>{
    try{first.scrollIntoView({behavior:'smooth',block:'center'});}catch(_){ }
    try{first.focus({preventScroll:true});}catch(_){try{first.focus();}catch(__){ }}
  });
  return false;
}

/* V5.3.13 — Borang enam seksyen untuk PWA rasmi dan Mod Ujian.
   Seksyen disembunyikan (tidak dikeluarkan daripada DOM); input kekal untuk simpan/validasi. */
function tm5313Wizard(form){
  if(!form||form.dataset.tm5313Wizard==='1')return;
  const steps=[...form.querySelectorAll(':scope > .tm53-form-section')];
  if(steps.length<2)return;
  form.dataset.tm5313Wizard='1';
  const firstHeading=steps[0].querySelector('h4');
  if(firstHeading)firstHeading.textContent='Ucapan dan Makluman';
  const card=form.closest('.tm5312-demo-form-card,.tm5-daily-form')||form.parentElement;
  const oldActions=card.querySelector('.tm5312-page-actions,.tm5-save-actions');
  const nav=document.createElement('div');nav.className='tm5313-wizard-footer';nav.setAttribute('aria-label','Navigasi seksyen laporan');
  const progress=document.createElement('span');progress.className='tm5313-wizard-counter';
  const back=document.createElement('button');back.type='button';back.className='tm5313-wizard-back';back.textContent='← Sebelum';
  const next=document.createElement('button');next.type='button';next.className='tm5313-wizard-next';next.textContent='Seterusnya →';
  nav.append(progress,back,next);
  if(oldActions){oldActions.classList.add('tm5313-last-actions');nav.append(oldActions);}
  form.insertAdjacentElement('afterend',nav);
  let current=0;
  const display=(i,scroll=true)=>{
    current=Math.max(0,Math.min(steps.length-1,i));
    steps.forEach((step,index)=>{step.hidden=index!==current;step.setAttribute('aria-hidden',String(index!==current));});
    progress.textContent=`Seksyen ${current+1} daripada ${steps.length}`;
    back.hidden=current===0;next.hidden=current===steps.length-1;
    if(oldActions)oldActions.hidden=current!==steps.length-1;
    if(scroll)tm5316ScrollTop(form.closest('.tm538-mobile-page')||card||form);
  };
  form.tm5313GoTo=display;
  back.onclick=()=>display(current-1);
  next.onclick=()=>{if(!tm5319ValidateWizardSection(steps[current],form))return;display(current+1);};
  display(0,false);
}
function tm5313RevealInvalid(control){
 const step=control?.closest?.('.tm53-form-section');
 const form=step?.closest?.('.tm53-demo-form,.tm53-official-form');
 if(!step||!form?.tm5313GoTo)return;
 const list=[...form.querySelectorAll(':scope > .tm53-form-section')];
 const index=list.indexOf(step);if(index>=0)form.tm5313GoTo(index);
}

/* V5.3.12 — PWA Mod Ujian: paparan harian rasmi, borang pada halaman berasingan. */
(()=>{'use strict';
 const D={on:false,root:null,role:'GURU',phase:'BELUM_DIHANTAR',index:1,days:[],popup:null,mobilePage:false,mobileDirty:false,returnPage:false,
   summary:'',followup:'',gpkNote:'',gbNote:'',returnNote:'',week:null};
 const E=tmEsc,show=tmFmt;
 const roleText={GURU:'Guru Laporan Isnin',SELASA:'Guru Laporan Selasa',KETUA:'Ketua Kumpulan',GPK:'GPK Penyelia',GB:'Guru Besar',LUAR:'Guru Tidak Bertugas Minggu Ini'};
 const statText={BELUM_DIHANTAR:'Belum dihantar',MENUNGGU_GPK:'Semakan GPK',MENUNGGU_GB:'Menunggu GB',
  DIPULANGKAN:'Perlu pembetulan',DISAHKAN:'Disahkan'};
 function selectedWeek(){const w=(tmState.data?.weeks||[]).find(x=>x.Tempoh_Mula<=tmToday()&&tmToday()<=x.Tempoh_Tamat)||tmSelected();return w?{
   name:'Minggu '+w.Minggu+' · '+w.Nama_Kumpulan,from:w.Tempoh_Mula,to:w.Tempoh_Tamat,
   group:w.ID_Kumpulan}:{name:'Minggu 42 · Kumpulan 2',from:'2026-11-23',to:'2026-11-27',group:'2'};}
 function makeDays(){const w=D.week,days=[];
  for(let time=Date.parse(w.from+'T00:00:00Z'),i=0;time<=Date.parse(w.to+'T00:00:00Z')&&i<7;time+=86400000,i++){
    const date=new Date(time).toISOString().slice(0,10),dow=new Date(time).getUTCDay();if(!dow||dow===6)continue;
    const title=['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'][dow];
    const cal=(tm51.schedule?.calendarDays||[]).find(c=>c.date===date)||{};
    const ev=(cal.events||[]).find(x=>String(x.type).toUpperCase()==='CUTI');
    const holiday=String(cal.kind||'').toUpperCase()==='CUTI'||!!ev||date==='2026-11-23';
    days.push({date,day:title,holiday,holidayTitle:holiday?(ev?.title||'Cuti Peristiwa'):'',
      status:holiday?'CUTI':'BELUM_DIISI',data:{speech:'',clean:'',discipline:'',program:window.matchMedia('(min-width: 901px)').matches?'':'ADA',activities:'',visitors:'',activity_status:''}});
  }return days;
 }
 // V5.3.11: Mod Ujian PWA dan desktop menggunakan borang dan aliran desktop yang sama.
 const desktopDemo=()=>true;
 const demoPairs=[['speech_gb','Ucapan Guru Besar / Pentadbir','speech'],['speech_duty','Ucapan Guru Bertugas','speech'],['speech_discipline','Ucapan Guru Disiplin','speech'],
   ['clean_student','Tandas Murid','clean'],['clean_teacher','Tandas Guru','clean'],['clean_hall','Dewan Sri Makmur','clean'],['clean_ground','Persekitaran Sekolah','clean'],
   ['discipline_assembly','Waktu Perhimpunan','discipline'],['discipline_break','Waktu Rehat','discipline'],['discipline_exit','Waktu Pulang','discipline']];
 function valueOf(obj,key){const r=obj?.[key];if(!r)return '—';if(typeof r==='string')return r;
   return r.status==='ADA'?r.text||'Ada':r.status==='TIADA'?'Tiada':r.status==='PERLU_PERHATIAN'?'Perlu perhatian: '+(r.text||''):(r.status||'—');}
 function tm53DemoFields(d,editableNow){const x=d.data||{},disabled=editableNow?'':'disabled';
   const selection=(key,label,options)=>{const v=x[key]||{},status=typeof v==='object'?v.status:'';
     const note=typeof v==='object'?v.text||'':'';return `<div class="tm53-field" data-dem-pair="${key}"><label>${E(label)}<select data-dem-status="${key}" ${disabled} required><option value="" ${!status?'selected':''} ${desktopDemo()?'disabled hidden':''}>Pilih status</option>
       ${options.map(o=>`<option value="${o}" ${status===o?'selected':''}>${E(o.replaceAll('_',' '))}</option>`).join('')}</select></label>
       <div data-dem-extra="${key}" hidden>${tm523Narrative_(`data-dem-note="${key}"`,note,key==='speech_gb'?'Sila isi ucapan guru besar / pentadbir di sini...':key==='speech_duty'?'Sila isi ucapan guru bertugas di sini...':key==='speech_discipline'?'Sila isi ucapan guru disiplin di sini...':'Sila berikan penerangan atau huraian di sini...',disabled)}</div></div>`;};
   const section=(name,body)=>`<section class="tm53-form-section"><h4>${E(name)}</h4><div class="tm53-field-grid">${body}</div></section>`;
   const speeches=demoPairs.filter(a=>a[2]==='speech').map(a=>selection(a[0],a[1],['ADA','TIADA'])).join('');
   const cleans=demoPairs.filter(a=>a[2]==='clean').map(a=>selection(a[0],a[1],['BERSIH','MEMUASKAN','PERLU_PERHATIAN'])).join('');
   const disc=demoPairs.filter(a=>a[2]==='discipline').map(a=>selection(a[0],a[1],['TERKAWAL','MEMUASKAN','PERLU_PERHATIAN'])).join('');
   const visitors=Array.isArray(x.visitors_list)&&x.visitors_list.length?x.visitors_list:[''];
   const activities=Array.isArray(x.activities_list)?x.activities_list:[];
   return `<div class="tm53-demo-form">
     ${section('Laporan Perhimpunan Rasmi / Rehat',speeches)}
     ${section('Laporan Kebersihan',cleans)}
     ${section('Laporan Kawalan dan Disiplin Murid',disc)}
     ${section('Lain-lain',`<div class="tm53-field"><label>Program Makmur<select id="demo-program" ${disabled}>
       <option value="" ${!x.program?'selected':''} disabled hidden>Pilih status</option><option value="ADA" ${x.program==='ADA'?'selected':''}>Berjalan</option><option value="BATAL" ${x.program==='BATAL'?'selected':''}>Batal</option></select></label></div>
       <div class="tm53-field" data-demo-program-note><label>Catatan pelaksanaan${tm523Narrative_('id="demo-program-note"',x.program_note||'','Sila nyatakan pelaksanaan Program Makmur di sini...',disabled)}</label></div>
       <div class="tm53-field" data-demo-program-reason><label>Sebab pembatalan${tm523Narrative_('id="demo-program-reason"',x.program_reason||'','Sila nyatakan sebab pembatalan di sini...',disabled)}</label></div>`)}
     <section class="tm53-form-section"><h4>Jemputan / Kehadiran Pelawat</h4><div id="demo-visitors-list" class="tm53-repeater">
        ${visitors.map((v,i)=>`<div class="tm53-repeat-item" data-demo-visitor><label>${i===0?'Nama Pelawat 1':'Nama Pelawat'}<input value="${E(v)}" maxlength="250" ${disabled}></label>${editableNow?'<button type="button" data-demo-remove="visitor">Buang</button>':''}</div>`).join('')}</div>
        ${editableNow?'<button type="button" class="tm53-add" data-demo-add="visitor">+ Tambah Nama</button>':''}</section>
     <section class="tm53-form-section"><h4>Laporan Aktiviti / Program</h4><div class="tm53-field-grid"><label>Aktiviti / Program<select id="demo-activity-status" ${disabled}>
       <option value="" ${!x.activity_status&&!activities.length?'selected':''} disabled hidden>Pilih status</option><option value="TIADA" ${x.activity_status==='TIADA'?'selected':''}>Tiada</option><option value="ADA" ${x.activity_status==='ADA'||activities.length?'selected':''}>Ada</option></select></label></div>
       <div id="demo-activities-list" class="tm53-repeater">${activities.map((a,i)=>`<div class="tm53-repeat-item" data-demo-activity>
         <div class="tm53-repeat-grid"><label>Tajuk Aktiviti<input data-demo-title maxlength="200" value="${E(a.title||'')}" ${disabled}></label><label>Ringkasan${tm523Narrative_('data-demo-summary',a.desc||'','Sila isi ringkasan aktiviti di sini...',disabled)}</label></div>
         ${editableNow?'<button type="button" data-demo-remove="activity">Buang</button>':''}</div>`).join('')}</div>
       ${editableNow?'<button type="button" class="tm53-add" data-demo-add="activity">+ Tambah Aktiviti</button>':''}</section>
   </div>`;
 }
 // V5.2.8: Cetakan Mod Ujian menggunakan template sama, berlabel BUKAN RASMI.
 function tm528DemoPayload(){
   const parts=String(D.week?.name||'').match(/Minggu\s+(\d+)/i);
   return {simulation:true,status:D.phase,year:String(D.week?.from||'').slice(0,4),week:parts?.[1]||'—',
     group:String(D.week?.group||''),from:D.week?.from,to:D.week?.to,
     leader:'Ketua Kumpulan (Simulasi)',gpk:'GPK Penyelia (Simulasi)',
     summary:D.summary,followup:D.followup,gpkNote:D.gpkNote,gbNote:D.gbNote,
     verifiedName:'Guru Besar (Simulasi)',verifiedAt:D.phase==='DISAHKAN'?tmToday():'',
     days:D.days.map(d=>{
       const v=d.data||{};
       return {day:d.day,date:d.date,holiday:d.holiday,holidayTitle:d.holidayTitle,
         reporter:d.holiday?'':'Guru Laporan '+d.day,
         data:{...v,makmur_status:v.program||'TIADA',makmur_note:v.program_note||'',
           makmur_cancel_reason:v.program_reason||'',activities:v.activities_list||[],
           visitors:v.visitors_list||[]}};
     })};
 }
 const doc=()=>`<article class="tm5-document tm52-demo-paper"><div class="tm5-doc-title"><div class="tm5-doc-school">SK SEGAMBUT MAKMUR · CONTOH UJIAN</div>
 <h2>LAPORAN GURU BERTUGAS MINGGUAN</h2><p>${E(D.week.name)} · ${show(D.week.from)} – ${show(D.week.to)}</p></div>
 ${D.days.map(d=>`<section class="tm5-doc-day"><h3>${E(d.day)} · ${show(d.date)}</h3>${d.holiday?
  `<p><b>Tiada laporan — ${E(d.holidayTitle)}</b></p>`:
  `<div class="tm5-doc-grid">${desktopDemo()?`${demoPairs.map(([key,title])=>`<div class="tm5-doc-cell"><b>${E(title)}</b><p>${E(valueOf(d.data,key))}</p></div>`).join('')}
   <div class="tm5-doc-cell"><b>Program Makmur</b><p>${E(d.data.program==='BATAL'?'Batal — '+(d.data.program_reason||''): 'Berjalan — '+(d.data.program_note||''))}</p></div>
   <div class="tm5-doc-cell"><b>Aktiviti</b><p>${E((d.data.activities_list||[]).map((a,i)=>`${i+1}. ${a.title}: ${a.desc}`).join('\n')||'Tiada')}</p></div>
   <div class="tm5-doc-cell"><b>Pelawat</b><p>${E((d.data.visitors_list||[]).join('; ')||'Tiada')}</p></div>`:
   `<div class="tm5-doc-cell"><b>Ucapan</b><p>${E(d.data.speech||'Tiada')}</p></div>
   <div class="tm5-doc-cell"><b>Kebersihan</b><p>${E(d.data.clean||'—')}</p></div>
   <div class="tm5-doc-cell"><b>Disiplin</b><p>${E(d.data.discipline||'—')}</p></div>
   <div class="tm5-doc-cell"><b>Program Makmur</b><p>${E(d.data.program||'—')}</p></div>
   <div class="tm5-doc-cell"><b>Aktiviti</b><p>${E(d.data.activities||'Tiada')}</p></div>
   <div class="tm5-doc-cell"><b>Pelawat</b><p>${E(d.data.visitors||'Tiada')}</p></div>`}</div>`}</section>`).join('')}
 <section class="tm5-doc-day"><h3>Ulasan Ketua Kumpulan</h3><p>${E(D.summary||'Belum diisi')}</p>
 <h3>Sokongan GPK</h3><p>${E(D.gpkNote||'Belum disemak')}</p>
 <h3>Pengesahan Guru Besar</h3><p>${E(D.gbNote||'Belum disahkan')}</p></section>
 </article>`;
 const complete=()=>D.days.some(d=>!d.holiday)&&D.days.every(d=>d.holiday||d.status==='LENGKAP');
 const editable=d=>!d.holiday&&(D.role==='KETUA'||(D.role==='GURU'&&(!desktopDemo()||d.day==='Isnin'))||(desktopDemo()&&D.role==='SELASA'&&d.day==='Selasa'))&&
   ['BELUM_DIHANTAR','DIPULANGKAN'].includes(D.phase)&&
   ['BELUM_DIISI','DRAF','PEMBETULAN'].includes(d.status);
 function collect(){const d=D.days[D.index],r=D.popup?.mode==='edit'?D.root.querySelector('.tm524-demo-modal'):D.root;
   if(!d||d.holiday||!r)return;
   if(D.role==='KETUA'&&r.querySelector('#demo-summary')){D.summary=r.querySelector('#demo-summary')?.value||'';D.followup=r.querySelector('#demo-followup')?.value||'';}
   if(!r.querySelector('.tm53-demo-form,#demo-speech'))return;
   if(desktopDemo()&&r.querySelector('.tm53-demo-form')){
     const out={};r.querySelectorAll('[data-dem-pair]').forEach(p=>{const key=p.dataset.demPair;
       out[key]={status:p.querySelector('select').value,text:p.querySelector('[data-dem-note]')?.value||''};});
     out.program=r.querySelector('#demo-program')?.value||'';out.activity_status=r.querySelector('#demo-activity-status')?.value||'';out.program_note=r.querySelector('#demo-program-note')?.value||'';
     out.program_reason=r.querySelector('#demo-program-reason')?.value||'';
     out.visitors_list=[...r.querySelectorAll('[data-demo-visitor] input')].map(x=>x.value.trim()).filter(Boolean);
     out.activities_list=r.querySelector('#demo-activity-status')?.value==='ADA'? [...r.querySelectorAll('[data-demo-activity]')].map(x=>({title:x.querySelector('[data-demo-title]').value.trim(),desc:x.querySelector('[data-demo-summary]').value.trim()})):[];
     d.data={...d.data,...out};return;
   }

   for(const [a,b] of [['speech','demo-speech'],['clean','demo-clean'],['discipline','demo-discipline'],
      ['program','demo-program'],['activities','demo-activities'],['visitors','demo-visitors']]){
      d.data[a]=r.querySelector('#'+b)?.value||'';
   }
 }
 function tm532ValidateDemo_(day){
   if(!desktopDemo())return true;
   const area=D.popup?.mode==='edit'?D.root.querySelector('.tm524-demo-modal'):D.root;
   if(!area)return false;
   tm533ClearFieldErrors(area);tm533BindClear(area);
   const fail=(selector,message)=>tm533Invalid(area,area.querySelector(selector),message);
   for(const [key,label,kind] of demoPairs){
     const select=area.querySelector(`[data-dem-status="${key}"]`);
     if(!select?.value)return fail(`[data-dem-status="${key}"]`,`Sila pilih status bagi ${label}.`);
     const note=area.querySelector(`[data-dem-note="${key}"]`);
     if(((kind==='speech'&&select.value==='ADA')||select.value==='PERLU_PERHATIAN')&&note&&!note.value.trim())
       return fail(`[data-dem-note="${key}"]`,`Sila lengkapkan huraian bagi ${label}.`);
   }
   const program=area.querySelector('#demo-program');
   if(!program?.value)return fail('#demo-program','Sila pilih status Program Makmur.');
   if(program.value==='BATAL'&&!area.querySelector('#demo-program-reason')?.value.trim())return fail('#demo-program-reason','Sila isi sebab pembatalan Program Makmur.');
   if(program.value==='ADA'&&!area.querySelector('#demo-program-note')?.value.trim())return fail('#demo-program-note','Sila isi catatan pelaksanaan Program Makmur.');
   const activities=area.querySelector('#demo-activity-status');
   if(!activities?.value)return fail('#demo-activity-status','Sila pilih status Aktiviti / Program.');
   if(activities.value==='ADA'){
     const items=[...area.querySelectorAll('[data-demo-activity]')];
     if(!items.length)return fail('#demo-activity-status','Sila tambah sekurang-kurangnya satu aktiviti.');
     for(const [i,row] of items.entries()){
       const title=row.querySelector('[data-demo-title]'),desc=row.querySelector('[data-demo-summary]');
       if(!title?.value.trim())return tm533Invalid(area,title,`Sila isi tajuk Aktiviti ${i+1}.`);
       if(!desc?.value.trim())return tm533Invalid(area,desc,`Sila isi ringkasan Aktiviti ${i+1}.`);
     }
   }
   const visitors=[...area.querySelectorAll('[data-demo-visitor] input')];
   if(visitors.some(x=>x.value.trim()))for(const field of visitors)if(!field.value.trim())return tm533Invalid(area,field,'Sila isi nama pelawat atau buang baris kosong.');
   return true;
 }

 function demoDayView(d){const x=d.data||{};return `<section class="tm524-day-document"><h3>${E(d.day)} · ${show(d.date)}</h3>
    ${d.holiday?`<p>${E(d.holidayTitle)}</p>`:`<div class="tm5-doc-grid">${demoPairs.map(([k,title])=>`<div class="tm5-doc-cell"><b>${E(title)}</b><p>${E(valueOf(x,k))}</p></div>`).join('')}
    <div class="tm5-doc-cell"><b>Program Makmur</b><p>${E(x.program==='BATAL'?'Batal — '+(x.program_reason||''):'Berjalan — '+(x.program_note||''))}</p></div>
    <div class="tm5-doc-cell"><b>Aktiviti</b><p>${E((x.activities_list||[]).map((a,i)=>`${i+1}. ${a.title}: ${a.desc}`).join('\n')||'Tiada')}</p></div>
    <div class="tm5-doc-cell"><b>Pelawat</b><p>${E((x.visitors_list||[]).join('; ')||'Tiada')}</p></div></div>`}</section>`;}
 function demoSent(){return ['MENUNGGU_GPK','MENUNGGU_GB','DISAHKAN'].includes(D.phase);}
 function renderLegacyMobile(){if(!D.on||!D.root)return;
   const d=D.days[D.index]||D.days[0];
   D.root.innerHTML=`<div class="tm52-demo"><div class="tm52-demo-banner">MOD UJIAN PENTADBIR · Rekod simulasi sahaja · Tidak disimpan dalam Sheets / Firestore</div>
    <div class="tm52-demo-nav">${Object.entries(roleText).filter(([key])=>['GURU','KETUA','GPK','GB'].includes(key)).map(([key,value])=>`<button type="button" data-dem-role="${key}" aria-current="${D.role===key}">${E(key==='GURU'?'Guru Laporan Harian':value)}</button>`).join('')}</div>
    <section class="tm52-demo-card" style="margin-bottom:14px"><strong>${E(D.week.name)}</strong>
      <span class="tm5-pill" style="margin-left:10px">${E(statText[D.phase]||D.phase)}</span>
      <p class="muted">${show(D.week.from)} – ${show(D.week.to)} · Paparan peranan semasa: ${E(roleText[D.role])}</p>
      <div class="tm52-demo-actions"><button type="button" data-dem-action="sample">Isi Contoh Semua Hari</button>
       <button type="button" data-dem-action="doc">Pratonton Dokumen</button>
       <button type="button" data-dem-action="schedule">Pratonton Jadual Agihan</button>
       <button type="button" data-dem-action="reset">Mula Semula</button></div></section>
    <div class="tm52-demo-grid"><aside class="tm52-demo-card"><strong>Status Laporan Harian</strong>
       ${D.days.map((x,i)=>`<button type="button" class="tm52-demo-day ${i===D.index?'chosen':''}" data-dem-day="${i}">
        <b>${E(x.day)} · ${show(x.date)}</b><br><span class="muted">${E(x.holiday?x.holidayTitle:
        x.status==='LENGKAP'?'Lengkap dan dikunci':x.status==='PEMBETULAN'?'Perlu pembetulan':'Belum lengkap')}</span></button>`).join('')}
     </aside><div class="tm52-demo-card" id="tm52-demo-content">
      <h3>${E(d.day)} · ${show(d.date)}</h3>
      ${d.holiday?`<div class="tm52-holiday">${E(d.holidayTitle)}</div><p>Tiada laporan harian diperlukan.</p>`:
        `<p class="muted">${d.status==='LENGKAP'?'Laporan dimuktamadkan · baca sahaja':
          editable(d)?'Anda boleh mencuba mengisi borang':'Paparan baca sahaja bagi peranan ini'}</p>
         ${desktopDemo()?tm53DemoFields(d,editable(d)):`
         <label>Ucapan Guru Besar / Guru Bertugas<textarea id="demo-speech" ${editable(d)?'':'disabled'}>${E(d.data.speech)}</textarea></label>
         <label>Kebersihan<select id="demo-clean" ${editable(d)?'':'disabled'}><option value="">Pilih status</option>${['Bersih','Memuaskan','Perlu Perhatian'].map(v=>`<option ${d.data.clean===v?'selected':''}>${v}</option>`).join('')}</select></label>
         <label>Disiplin<select id="demo-discipline" ${editable(d)?'':'disabled'}><option value="">Pilih status</option>${['Terkawal','Memuaskan','Perlu Perhatian'].map(v=>`<option ${d.data.discipline===v?'selected':''}>${v}</option>`).join('')}</select></label>
         <label>Program Makmur<select id="demo-program" ${editable(d)?'':'disabled'}>${['ADA','BATAL'].map(v=>`<option ${d.data.program===v?'selected':''}>${v}</option>`).join('')}</select></label>
         <label>Aktiviti<textarea id="demo-activities" ${editable(d)?'':'disabled'}>${E(d.data.activities)}</textarea></label>
         <label>Pelawat<textarea id="demo-visitors" ${editable(d)?'':'disabled'}>${E(d.data.visitors)}</textarea></label>
         `}
         ${editable(d)?'<div class="tm52-demo-actions"><button type="button" data-dem-action="save">Simpan Draf</button><button type="button" class="primary" data-dem-action="finish">Lengkap & Kunci</button></div>':''}`}
       ${D.role==='KETUA'?`<hr><h3>Ulasan Ketua Kumpulan</h3>
         <label>Ulasan<textarea id="demo-summary" ${complete()&&D.phase!=='DISAHKAN'?'':'disabled'}>${E(D.summary)}</textarea></label>
         <label>Cadangan<textarea id="demo-followup" ${complete()&&D.phase!=='DISAHKAN'?'':'disabled'}>${E(D.followup)}</textarea></label>
         ${complete()&&['BELUM_DIHANTAR','DIPULANGKAN'].includes(D.phase)?'<button type="button" class="primary" data-dem-action="submit">Hantar kepada GPK</button>':'<p class="muted">Hanya boleh hantar selepas semua hari sekolah lengkap.</p>'}`:''}
       ${D.role==='GPK'&&D.phase==='MENUNGGU_GPK'?`<hr><h3>Semakan Penyelia GPK</h3><label>Ulasan<textarea id="demo-review">${E(D.gpkNote)}</textarea></label>
         <div class="tm52-demo-actions"><button type="button" class="primary" data-dem-action="gpk-ok">Sokong kepada GB</button><button type="button" data-dem-action="gpk-return">Pulangkan Hari Dipilih</button></div>`:''}
       ${D.role==='GB'&&D.phase==='MENUNGGU_GB'?`<hr><h3>Pengesahan Guru Besar</h3><label>Ulasan<textarea id="demo-review">${E(D.gbNote)}</textarea></label>
         <div class="tm52-demo-actions"><button type="button" class="primary" data-dem-action="gb-ok">Sahkan</button><button type="button" data-dem-action="gb-return">Pulangkan Hari Dipilih</button></div>`:''}
       </div></div>
       <section class="tm52-demo-card" style="margin-top:14px"><strong>Direktori laporan</strong><p>${E(D.week.name)} · ${E(statText[D.phase]||D.phase)}</p>
         ${complete()?'<button data-dem-action="doc">Lihat Pratonton Dokumen</button>':'<span class="muted">Dikunci sehingga semua hari sekolah lengkap.</span>'}
         ${D.phase==='DISAHKAN'?'<p style="color:#276344">Cetak laporan telah dibenarkan.</p>':''}</section>
    </div>`;
   if(desktopDemo()){
     const toggle=()=>{D.root.querySelectorAll('[data-dem-pair]').forEach(p=>{const v=p.querySelector('select').value,k=p.dataset.demPair;
       p.querySelector('[data-dem-extra]').hidden=!v||v==='TIADA'||(k.startsWith('clean_')||k.startsWith('discipline_'))&&v!=='PERLU_PERHATIAN';});
       const yes=D.root.querySelector('#demo-program')?.value==='ADA';
       if(D.root.querySelector('[data-demo-program-note]'))D.root.querySelector('[data-demo-program-note]').hidden=!yes;
       if(D.root.querySelector('[data-demo-program-reason]'))D.root.querySelector('[data-demo-program-reason]').hidden=yes;
       const has=D.root.querySelector('#demo-activity-status')?.value==='ADA';
       if(D.root.querySelector('#demo-activities-list'))D.root.querySelector('#demo-activities-list').hidden=!has;
       D.root.querySelectorAll('[data-demo-add="activity"]').forEach(b=>b.hidden=!has);
     };
     D.root.querySelectorAll('[data-dem-pair] select,#demo-program,#demo-activity-status').forEach(sel=>sel.onchange=()=>{
       if(sel.id==='demo-activity-status'&&sel.value==='ADA'&&!D.root.querySelector('[data-demo-activity]')&&!sel.disabled){
         D.root.querySelector('#demo-activities-list').insertAdjacentHTML('beforeend',`<div class="tm53-repeat-item" data-demo-activity><div class="tm53-repeat-grid"><label>Tajuk Aktiviti<input data-demo-title maxlength="200"></label><label>Ringkasan${tm523Narrative_('data-demo-summary','','Sila isi ringkasan aktiviti di sini...')}</label></div><button type="button" data-demo-remove="activity">Buang</button></div>`);
       }toggle();});
     D.root.querySelectorAll('[data-demo-add]').forEach(b=>b.onclick=()=>{
       const type=b.dataset.demoAdd;
       if(type==='visitor')D.root.querySelector('#demo-visitors-list').insertAdjacentHTML('beforeend',`<div class="tm53-repeat-item" data-demo-visitor><label>Nama Pelawat<input maxlength="250"></label><button type="button" data-demo-remove="visitor">Buang</button></div>`);
       else D.root.querySelector('#demo-activities-list').insertAdjacentHTML('beforeend',`<div class="tm53-repeat-item" data-demo-activity><div class="tm53-repeat-grid"><label>Tajuk Aktiviti<input data-demo-title maxlength="200"></label><label>Ringkasan${tm523Narrative_('data-demo-summary','','Sila isi ringkasan aktiviti di sini...')}</label></div><button type="button" data-demo-remove="activity">Buang</button></div>`);
       if(type==='visitor')tm523VisitorLabels_(D.root,'[data-demo-visitor]');
     });
     const area=D.root.querySelector('#tm52-demo-content');if(area){
       area.onclick=ev=>{const b=ev.target.closest('[data-demo-remove]');if(b){b.closest('.tm53-repeat-item').remove();tm523VisitorLabels_(area,'[data-demo-visitor]');}};
       tm523BindNumbering_(area);
     }
     toggle();
   }
   D.root.querySelectorAll('[data-dem-role]').forEach(el=>el.onclick=()=>{collect();D.role=el.dataset.demRole;render();});
   D.root.querySelectorAll('[data-dem-day]').forEach(el=>el.onclick=()=>{collect();D.index=Number(el.dataset.demDay);render();});
   D.root.querySelectorAll('[data-dem-action]').forEach(el=>el.onclick=()=>action(el.dataset.demAction));
 }

 // V5.3.12: Hanya PWA Mod Ujian. Komponen senarai/hari sama dengan PWA rasmi V5.3.8.
 // Enjin simulator, hak akses, validasi, modal GPK, desktop dan cetakan tidak diubah.
 function renderPwaDemo(ctx){
   if(!D.on||!D.root)return;
   const d=D.days[D.index]||D.days[0], outside=D.role==='LUAR';
   const canEditCompleted=x=>!x.holiday&&x.status==='LENGKAP'&&
     ['BELUM_DIHANTAR','MENUNGGU_GPK','DIPULANGKAN'].includes(D.phase)&&
     (D.role==='KETUA'||D.role==='GURU'&&x.day==='Isnin'||D.role==='SELASA'&&x.day==='Selasa');
   const assigned=x=>D.role==='KETUA'||D.role==='GURU'&&x.day==='Isnin'||D.role==='SELASA'&&x.day==='Selasa';
   const badge=x=>{const state=x.holiday?'CUTI':x.status;
     const options={LENGKAP:['✓','Lengkap','done'],DRAF:['✎','Draf','draft'],CUTI:['◇',x.holidayTitle||'Cuti','holiday'],
       PEMBETULAN:['!','Perlu pembetulan','fix'],BELUM_DIISI:['○','Belum diisi','pending']};
     const [icon,label,tone]=options[state]||options.BELUM_DIISI;
     return `<span class="tm538-day-status ${tone}"><span class="tm538-status-icon" aria-hidden="true">${icon}</span>${E(label)}</span>`;};
   if(D.returnPage&&!outside&&D.role==='GPK'&&D.phase==='MENUNGGU_GPK'){
     D.root.innerHTML=`<div class="tm52-demo tm5312-pwa-demo"><div class="tm5317-return-page tm538-mobile-page">
        <button class="tm538-back-button" type="button" data-dem-return-back>← Kembali ke Semakan GPK</button>
        <section class="tm5-card tm5317-return-card"><span class="tm5317-kicker">MOD UJIAN · GPK PENYELIA</span>
        <h2>Pulangkan untuk Pembetulan</h2>
        <p class="tm5317-help">Pilih hari yang perlu dibetulkan. Hari lain kekal lengkap dan terkunci.</p>
        <div class="tm5317-return-options" role="group" aria-label="Pilih hari pembetulan">${D.days.filter(x=>!x.holiday).map(x=>`<button type="button" class="tm5317-return-day" aria-pressed="false" data-dem-return-date="${E(x.date)}"><span><strong>${E(x.day)}</strong><small>${show(x.date)}</small></span><span class="tm5317-day-check" aria-hidden="true">✓</span></button>`).join('')}</div>
        <p class="tm5317-count" aria-live="polite">Belum memilih hari</p>
        <label class="tm5317-note-label">Arahan Pembetulan GPK<textarea id="tm5317-demo-return-note" rows="5" placeholder="Nyatakan perkara yang perlu dibetulkan..."></textarea></label>
        <p class="tm5317-error" role="alert" hidden></p>
        <button type="button" class="primary tm5317-submit" data-dem-return-submit>Hantar Arahan Pembetulan</button>
        </section></div></div>`;
     const selected=new Set(),alertEl=D.root.querySelector('.tm5317-error');
     D.root.querySelector('[data-dem-return-back]').onclick=()=>{D.returnPage=false;render();tm5316ScrollTop(D.root);};
     D.root.querySelectorAll('[data-dem-return-date]').forEach(btn=>btn.onclick=()=>{
       const day=btn.dataset.demReturnDate;if(selected.has(day))selected.delete(day);else selected.add(day);
       btn.classList.toggle('is-selected',selected.has(day));btn.setAttribute('aria-pressed',String(selected.has(day)));
       D.root.querySelector('.tm5317-count').textContent=selected.size?`${selected.size} hari dipilih untuk pembetulan`:'Belum memilih hari';alertEl.hidden=true;
     });
     D.root.querySelector('[data-dem-return-submit]').onclick=()=>{
       const note=D.root.querySelector('#tm5317-demo-return-note')?.value.trim()||'';
       if(!selected.size){alertEl.textContent='Sila pilih sekurang-kurangnya satu hari.';alertEl.hidden=false;return;}
       if(!note){alertEl.textContent='Sila isi arahan pembetulan.';alertEl.hidden=false;return;}
       D.returnNotes=D.returnNotes||{};
       selected.forEach(date=>{const item=D.days.find(x=>x.date===date);if(item){item.status='PEMBETULAN';D.returnNotes[date]=note;}});
       D.returnNote=note;D.phase='DIPULANGKAN';D.returnPage=false;D.mobilePage=false;
       D.index=Math.max(0,D.days.findIndex(x=>selected.has(x.date)));render();
       tm5316Success('Arahan pembetulan berjaya dihantar','Hari pilihan telah dibuka semula untuk pembetulan.',()=>tm5316ScrollTop(D.root.querySelector('.tm5312-demo-week')||D.root));
     };
     tm5316ScrollTop(D.root);return;
   }
   const page=!!D.mobilePage&&!outside; // V5.3.14: penyelia juga membuka halaman bacaan, bukan popup dalam senarai.
   if(page){
     const editableNow=editable(d);
     const view=d.holiday?`<section class="tm5-card tm52-holiday-card"><h3>Tiada laporan diperlukan</h3><p>${E(d.holidayTitle||'Cuti Persekolahan')}</p></section>`:
       d.status==='LENGKAP'?`<section class="tm5-card tm5312-demo-day-document">${demoDayView(d)}
           ${canEditCompleted(d)?'<div class="tm5312-page-actions"><button type="button" data-dem-page-edit>✎ Edit Laporan</button></div>':''}</section>`:
       editableNow?`<section class="tm5-card tm5312-demo-form-card">
          ${d.status==='PEMBETULAN'&&D.returnNotes?.[d.date]?`<div class="tm5-fix-note"><strong>Arahan Pembetulan GPK</strong><p>${E(D.returnNotes[d.date])}</p></div>`:''}
          ${tm53DemoFields(d,true)}
          <div class="tm52-demo-actions tm5312-page-actions"><button type="button" data-dem-action="save">Simpan Draf</button><button type="button" class="primary" data-dem-action="finish">Lengkap &amp; Kunci</button></div>
         </section>`:
       '<section class="tm5-card tm532-no-duty"><span class="tm532-state-icon" aria-hidden="true">▣</span><strong>Anda tidak ditugaskan untuk isi laporan hari ini.</strong></section>';
     D.root.innerHTML=`<div class="tm52-demo tm5312-pwa-demo">
       <div class="tm538-mobile-page tm5312-demo-mobile-page" aria-label="Borang Laporan Harian Mod Ujian">
         <button type="button" class="tm538-back-button" data-dem-page-back><span aria-hidden="true">←</span> Kembali ke Laporan Harian</button>
         <div class="tm538-mobile-page-heading"><span class="tm538-page-icon" aria-hidden="true">▤</span><div><h2>${E(d.day)}</h2><p>${show(d.date)} · ${E(D.week.name)}</p></div></div>
         <div class="tm5312-demo-page-status">${badge(d)}<span>Mod Ujian · Rekod simulasi sahaja</span></div>
         ${view}
       </div></div>`;
     if(editableNow){const card=D.root.querySelector('.tm5312-demo-form-card');bindDemoForm(card);tm5313Wizard(card?.querySelector('.tm53-demo-form'));}
     D.root.querySelector('[data-dem-page-back]').onclick=async()=>{
       if(D.mobileDirty&&!await tm5318Confirm('Borang belum disimpan. Kembali ke senarai dan buang perubahan?'))return;
       D.mobileDirty=false;D.mobilePage=false;render();
     };
     D.root.querySelector('[data-dem-page-edit]')?.addEventListener('click',()=>{
       if(!canEditCompleted(d))return;
       if(D.phase==='MENUNGGU_GPK')D.phase='BELUM_DIHANTAR';
       d.status='PEMBETULAN';D.mobileDirty=false;render();
     });
     D.root.querySelectorAll('[data-dem-action]').forEach(el=>el.onclick=()=>action(el.dataset.demAction));
     if(editableNow){
       D.root.querySelector('.tm5312-demo-form-card')?.addEventListener('input',()=>{D.mobileDirty=true;});
       D.root.querySelector('.tm5312-demo-form-card')?.addEventListener('change',()=>{D.mobileDirty=true;});
       D.root.querySelector('.tm5312-demo-form-card')?.addEventListener('click',ev=>{if(ev.target.closest('[data-demo-add],[data-demo-remove]'))D.mobileDirty=true;});
     }
   }else{
     D.mobilePage=false;D.mobileDirty=false;
     const weekHead=`<section class="tm5-card tm5-report-banner tm538-week-banner tm5312-demo-week">
         <div><h2>${E(D.week.name)}</h2><span class="tm5-period">${show(D.week.from)} – ${show(D.week.to)}</span>
         <span class="tm5-people tm538-people"><span class="tm538-role-line"><strong>Penyelia GPK:</strong> GPK Penyelia (Simulasi)</span>
         <span class="tm538-role-line"><strong>Ketua Kumpulan:</strong> Ketua Kumpulan (Simulasi)</span></span></div>
         <div class="tm5-banner-right"><span class="tm5-pill">${E(statText[D.phase]||D.phase)}</span></div>
         <div class="tm52-demo-actions tm5312-demo-utilities">
           <button type="button" data-dem-action="sample">Isi Contoh Semua Hari</button>
           <button type="button" data-dem-action="doc">Pratonton Dokumen</button>
           <button type="button" data-dem-action="schedule">Pratonton Jadual Agihan</button>
           <button type="button" data-dem-action="reset">Mula Semula</button>
         </div>
       </section>`;
     const statusVisible=demoSent()||D.phase==='DIPULANGKAN';
     const statusTitle=D.phase==='DISAHKAN'?'Laporan telah disahkan oleh Guru Besar.':
       D.phase==='MENUNGGU_GB'?(D.role==='GPK'?'Semakan GPK selesai. Menunggu pengesahan Guru Besar.':'Laporan telah disokong GPK dan menunggu pengesahan Guru Besar.'):
       D.phase==='MENUNGGU_GPK'?'Laporan telah dihantar dan menunggu semakan GPK Penyelia.':
       'Laporan telah dipulangkan untuk pembetulan.';
     const statusDetail=D.phase==='MENUNGGU_GPK'?'Guru yang ditugaskan atau Ketua boleh membuat pindaan sebelum semakan GPK.':
       D.phase==='MENUNGGU_GB'?'Semakan telah selesai dan laporan dihantar kepada Guru Besar.':
       D.phase==='DISAHKAN'?'Laporan telah selesai dan disahkan.':'Hanya hari yang memerlukan pembetulan perlu dikemas kini.';
     const reviewerTop=statusVisible?`<section class="tm5316-status-card" role="status"><span class="tm5316-status-mark" aria-hidden="true">✓</span><div><strong>${E(statusTitle)}</strong><p>${E(statusDetail)}</p></div></section>`:
       ctx.isReviewer?ctx.reviewerNotice:'';
     const reviewerReadout=ctx.isReviewer&&demoSent()?`<section class="tm5-card tm5313-reviewer-summary"><h3>Ulasan Ketua Kumpulan</h3><p>${E(D.summary||'Belum diisi.')}</p><h4>Cadangan / Tindakan Susulan</h4><p>${E(D.followup||'—')}</p></section>`:'';
     const list=outside?`<section class="tm5-card tm524-not-assigned"><span aria-hidden="true">▣</span><h3>Kumpulan anda tidak bertugas pada minggu ini.</h3><p>Tiada borang atau status laporan harian dipaparkan.</p></section>`:
       `<div class="tm5-editor-layout tm538-list-layout">
         <aside class="tm5-card tm5-daylist tm538-daylist"><h3 class="tm538-list-heading"><span class="tm538-heading-icon" aria-hidden="true">▦</span> Status Laporan Harian</h3>
          ${D.days.map((x,i)=>`<button type="button" class="tm538-day-row ${x.status==='PEMBETULAN'?'tm5317-fix-target':''}" data-dem-day="${i}">
            <span class="tm538-day-info"><strong>${E(x.day)}</strong><small>${show(x.date)}</small></span>${badge(x)}</button>`).join('')}
         </aside>
         <div class="tm5-report-right tm538-summary-area">${reviewerReadout}
           ${ctx.leaderReady?ctx.leaderForm:''}${ctx.gpkReview}${ctx.gbReview}
         </div></div>
         `;
     D.root.innerHTML=`<div class="tm52-demo tm5312-pwa-demo"><div class="tm52-demo-banner">MOD UJIAN PENTADBIR · Rekod simulasi sahaja · Tidak disimpan dalam Sheets / Firestore</div>
       ${weekHead}${reviewerTop}${list}</div>`;
     D.root.querySelectorAll('[data-dem-day]').forEach(btn=>btn.onclick=()=>{
       const next=D.days[Number(btn.dataset.demDay)];if(!next)return;
       D.index=Number(btn.dataset.demDay);
       if(ctx.isReviewer&&!next.holiday&&next.status!=='LENGKAP'){
          tm5318Alert('Laporan harian ini belum lengkap. Tiada laporan untuk disemak.');return;
        }
       if(!next.holiday&&next.status!=='LENGKAP'&&!assigned(next)){tm5318Alert('Anda tidak bertugas untuk mengisi laporan pada hari ini.');return;}
       D.popup=null;D.mobilePage=true;D.mobileDirty=false;render();
       try{D.root.scrollIntoView({block:'start'});}catch(_){}
     });
     D.root.querySelectorAll('[data-dem-action]').forEach(el=>el.onclick=()=>action(el.dataset.demAction));
   }
   window.dispatchEvent(new CustomEvent('semakmur-tm52-demo-changed',{detail:{on:D.on,role:D.role,phase:D.phase}}));
 }
 function render(){if(!D.on||!D.root)return;
   const d=D.days[D.index]||D.days[0],leaderReady=D.role==='KETUA'&&complete()&&!demoSent();
   const outside=D.role==='LUAR',sent=demoSent(),isReviewer=['GPK','GB'].includes(D.role),isLeader=D.role==='KETUA';
   const writable=editable(d),readonly=d.status==='LENGKAP';
   const statusChip=x=>{const st=x.holiday?'CUTI':x.status;
     const table={CUTI:['◇',x.holidayTitle||'Cuti','holiday'],LENGKAP:['✓','Lengkap','done'],DRAF:['✎','Draf','draft'],PEMBETULAN:['!','Pembetulan','fix'],BELUM_DIISI:['○','Belum lengkap','pending']};
     const [icon,message,cls]=table[st]||table.BELUM_DIISI;
     return `<span class="tm524-day-status ${cls}"><span aria-hidden="true">${icon}</span> ${E(message)}</span>`;};
   const demoCanEdit=x=>!x.holiday&&x.status==='LENGKAP'&&['BELUM_DIHANTAR','MENUNGGU_GPK','DIPULANGKAN'].includes(D.phase)&&
     (D.role==='KETUA'||D.role==='GURU'&&x.day==='Isnin'||D.role==='SELASA'&&x.day==='Selasa');
   const sentTitle=D.phase==='DISAHKAN'?'Laporan telah disahkan oleh Guru Besar.':
     D.phase==='MENUNGGU_GB'?'Laporan telah disemak GPK dan menunggu pengesahan Guru Besar.':'Laporan telah dihantar dan menunggu semakan GPK Penyelia.';
   const sentInfo=sent?`<section class="tm524-submitted tm532-submitted"><span class="tm524-status-symbol" aria-hidden="true">✓</span><h3>${sentTitle}</h3><p>${D.phase==='MENUNGGU_GPK'?'Guru yang ditugaskan atau Ketua boleh membuat pindaan dengan butang Edit pada kad hari, sebelum semakan GPK.':'Laporan harian boleh dibaca sahaja selepas sokongan GPK atau pengesahan GB.'}</p></section>`:'';
   const rolesNotice=D.role==='GPK'?(D.phase==='MENUNGGU_GPK'?'Laporan telah dihantar oleh Ketua Kumpulan. Sila buat semakan.':D.phase==='MENUNGGU_GB'?'Semakan GPK selesai. Menunggu pengesahan Guru Besar.':D.phase==='DISAHKAN'?'Laporan telah disahkan oleh Guru Besar.':'Laporan belum dihantar oleh Ketua Kumpulan.'):
     D.role==='GB'?(D.phase==='MENUNGGU_GB'?'Laporan telah disemak GPK Penyelia dan sedia untuk pengesahan Guru Besar.':D.phase==='DISAHKAN'?'Laporan telah disahkan oleh Guru Besar.':D.phase==='MENUNGGU_GPK'?'Laporan telah dihantar oleh Ketua Kumpulan dan sedang menunggu semakan GPK Penyelia.':'Laporan belum dihantar oleh Ketua Kumpulan dan belum disemak GPK Penyelia.') : '';
   const reviewerNotice=isReviewer?`<section class="tm525-role-notice tm532-role-notice"><span class="tm532-state-icon" aria-hidden="true">${D.role==='GPK'?'▣':'◈'}</span><div><strong>${E(rolesNotice)}</strong><p>Klik hari untuk semakan dalam popup. Hari belum lengkap akan memaparkan status laporan belum diisi.</p></div></section>`:'';
   const leaderForm=leaderReady?`<section class="tm524-leader-ready"><h3>Ulasan dan Cadangan Ketua Kumpulan</h3><p class="muted">Semua laporan harian telah lengkap. Klik hari untuk semakan dalam popup.</p>
      <label>Ulasan<textarea id="demo-summary">${E(D.summary)}</textarea></label><label>Cadangan<textarea id="demo-followup">${E(D.followup)}</textarea></label>
      <button type="button" class="primary" data-dem-action="submit">Hantar kepada GPK</button></section>`:'';
   const gpkReview=D.role==='GPK'&&D.phase==='MENUNGGU_GPK'?`<section class="tm532-review-card"><h3>Semakan GPK Penyelia</h3><label>Ulasan dan Cadangan GPK<textarea id="demo-review" rows="4" placeholder="Masukkan ulasan dan cadangan...">${E(D.gpkNote)}</textarea></label>
      <div class="tm532-review-actions"><button class="primary" data-dem-action="gpk-ok">Sokong kepada GB</button><button data-dem-action="gpk-return">Pulangkan untuk Pembetulan</button></div></section>`:'';
   const gbReview=D.role==='GB'&&D.phase==='MENUNGGU_GB'?`<section class="tm532-review-card"><h3>Pengesahan Guru Besar</h3><p>Semakan GPK telah selesai. Sila semak laporan sebelum pengesahan.</p><button type="button" class="primary" data-dem-action="gb-ok">Sahkan Laporan</button></section>`:'';
   const daily= d.holiday?`<div class="tm52-holiday">${E(d.holidayTitle)}</div><p>Tiada laporan harian diperlukan.</p>`:
     readonly?demoDayView(d):writable?`${d.status==='PEMBETULAN'&&D.returnNotes?.[d.date]?`<div class="tm5-fix-note"><strong>Arahan Pembetulan GPK</strong><p>${E(D.returnNotes[d.date])}</p></div>`:''}${tm53DemoFields(d,true)}<div class="tm52-demo-actions"><button data-dem-action="save">Simpan Draf</button><button class="primary" data-dem-action="finish">Lengkap & Kunci</button></div>`:
     '<div class="tm532-no-duty"><span class="tm532-state-icon" aria-hidden="true">▣</span><strong>Anda tidak bertugas untuk mengisi laporan harian pada hari ini.</strong><p>Hanya guru yang ditugaskan boleh mengisi borang. Hari lengkap boleh dibaca di sini.</p></div>';
   const statusOrForm=isReviewer?`${sent?sentInfo:reviewerNotice}${gpkReview}${gbReview}`:
     `${sentInfo}${leaderReady?leaderForm:isLeader&&complete()&&sent?'<section class="tm524-review-hint"><strong>Semakan laporan harian</strong><p>Klik hari untuk paparan dokumen dalam popup.</p></section>':`<h3>${E(d.day)} · ${show(d.date)}</h3>${daily}`}`;
   if(window.matchMedia('(max-width:900px)').matches)return renderPwaDemo({leaderReady,isReviewer,isComplete:complete(),sentInfo,leaderForm,reviewerNotice,gpkReview,gbReview});
   const main=outside?`<section class="tm52-demo-card tm524-not-assigned"><span aria-hidden="true">▣</span><h3>Kumpulan anda tidak bertugas pada minggu ini.</h3><p>Tiada borang atau status laporan harian dipaparkan.</p></section>`:
    `<div class="tm52-demo-grid"><aside class="tm52-demo-card"><strong class="tm524-status-heading"><span aria-hidden="true">▣</span> Status Laporan Harian</strong>
       ${D.days.map((x,i)=>`<div class="tm525-day-row tm532-day-card ${i===D.index?'tm532-selected':''}" data-tm533-demo-card="${i}" role="group"><button type="button" class="tm52-demo-day ${i===D.index?'chosen':''}" data-dem-day="${i}" ${i===D.index?'aria-current="date"':''}>
         <b>${E(x.day)} · ${show(x.date)}</b></button><div class="tm532-day-bottom">${statusChip(x)}
         ${demoCanEdit(x)?`<button type="button" class="tm525-edit-day" data-dem-day-edit="${i}">✎ Edit</button>`:''}</div></div>`).join('')}
       </aside><div class="tm52-demo-card" id="tm52-demo-content">${statusOrForm}</div></div>
       <section class="tm52-demo-card tm524-demo-directory"><strong>Direktori laporan</strong><p>${E(D.week.name)} · ${E(statText[D.phase]||D.phase)}</p>
          ${complete()?'<button data-dem-action="doc">Lihat Pratonton Dokumen</button>':'<span class="muted">Pratonton laporan belum lengkap.</span>'}</section>`;
   D.root.innerHTML=`<div class="tm52-demo"><div class="tm52-demo-banner">MOD UJIAN PENTADBIR · Rekod simulasi sahaja · Tidak disimpan dalam Sheets / Firestore</div>
     <div class="tm52-demo-nav">${Object.entries(roleText).map(([key,value])=>`<button type="button" data-dem-role="${key}" aria-current="${D.role===key}">${E(value)}</button>`).join('')}</div>
     <section class="tm52-demo-card tm524-demo-header"><strong>${E(D.week.name)}</strong><span class="tm5-pill">${E(statText[D.phase]||D.phase)}</span>
       <p class="muted">${show(D.week.from)} – ${show(D.week.to)} · Paparan peranan: ${E(roleText[D.role])}</p>
       <div class="tm52-demo-actions"><button data-dem-action="sample">Isi Contoh Semua Hari</button><button data-dem-action="doc">Pratonton Dokumen</button><button data-dem-action="schedule">Pratonton Jadual Agihan</button><button data-dem-action="reset">Mula Semula</button></div></section>${main}</div>`;
   if(desktopDemo())bindDemoForm(D.root);
   D.root.querySelectorAll('[data-dem-role]').forEach(el=>el.onclick=()=>{if(!D.popup)collect();D.popup=null;D.role=el.dataset.demRole;render();});
   D.root.querySelectorAll('[data-dem-day]').forEach(el=>el.onclick=()=>{if(!D.popup)collect();D.index=Number(el.dataset.demDay);const selected=D.days[D.index];
      D.popup=(isReviewer||isLeader&&complete())?{date:selected.date,mode:'view'}:null;render();});
   D.root.querySelectorAll('[data-tm533-demo-card]').forEach(card=>card.addEventListener('click',ev=>{
     if(ev.target.closest('[data-dem-day-edit],[data-dem-day]'))return;
     card.querySelector('[data-dem-day]')?.click();
   }));
   D.root.querySelectorAll('[data-dem-day-edit]').forEach(el=>el.onclick=()=>{
     const i=Number(el.dataset.demDayEdit),day=D.days[i];if(!day||!demoCanEdit(day))return;
     if(!D.popup)collect();D.index=i;if(D.phase==='MENUNGGU_GPK')D.phase='BELUM_DIHANTAR';
     day.status='PEMBETULAN';D.popup=null;render();
   });
   D.root.querySelectorAll('[data-dem-action]').forEach(el=>el.onclick=()=>action(el.dataset.demAction));
   if(D.popup)showDemoModal();
   window.dispatchEvent(new CustomEvent('semakmur-tm52-demo-changed',{detail:{on:D.on,role:D.role,phase:D.phase}}));
 }
 function bindDemoForm(container){
   const toggle=()=>{container.querySelectorAll('[data-dem-pair]').forEach(p=>{const v=p.querySelector('select').value,k=p.dataset.demPair;
     p.querySelector('[data-dem-extra]').hidden=!v||v==='TIADA'||(k.startsWith('clean_')||k.startsWith('discipline_'))&&v!=='PERLU_PERHATIAN';});
     const yes=container.querySelector('#demo-program')?.value==='ADA';
     if(container.querySelector('[data-demo-program-note]'))container.querySelector('[data-demo-program-note]').hidden=!yes;
     if(container.querySelector('[data-demo-program-reason]'))container.querySelector('[data-demo-program-reason]').hidden=yes;
     const has=container.querySelector('#demo-activity-status')?.value==='ADA';
     if(container.querySelector('#demo-activities-list'))container.querySelector('#demo-activities-list').hidden=!has;
     container.querySelectorAll('[data-demo-add="activity"]').forEach(b=>b.hidden=!has);
   };
   container.querySelectorAll('[data-dem-pair] select,#demo-program,#demo-activity-status').forEach(sel=>sel.onchange=()=>{
     if(sel.id==='demo-activity-status'&&sel.value==='ADA'&&!container.querySelector('[data-demo-activity]')&&!sel.disabled)
       container.querySelector('#demo-activities-list').insertAdjacentHTML('beforeend',`<div class="tm53-repeat-item" data-demo-activity><div class="tm53-repeat-grid"><label>Tajuk Aktiviti<input data-demo-title maxlength="200"></label><label>Ringkasan${tm523Narrative_('data-demo-summary','','Sila isi ringkasan aktiviti di sini...')}</label></div><button type="button" data-demo-remove="activity">Buang</button></div>`);
     toggle();});
   container.querySelectorAll('[data-demo-add]').forEach(b=>b.onclick=()=>{
     const type=b.dataset.demoAdd;
     if(type==='visitor')container.querySelector('#demo-visitors-list').insertAdjacentHTML('beforeend',`<div class="tm53-repeat-item" data-demo-visitor><label>Nama Pelawat<input maxlength="250"></label><button type="button" data-demo-remove="visitor">Buang</button></div>`);
     else container.querySelector('#demo-activities-list').insertAdjacentHTML('beforeend',`<div class="tm53-repeat-item" data-demo-activity><div class="tm53-repeat-grid"><label>Tajuk Aktiviti<input data-demo-title maxlength="200"></label><label>Ringkasan${tm523Narrative_('data-demo-summary','','Sila isi ringkasan aktiviti di sini...')}</label></div><button type="button" data-demo-remove="activity">Buang</button></div>`);
     if(type==='visitor')tm523VisitorLabels_(container,'[data-demo-visitor]');
   });
   container.addEventListener('click',ev=>{const b=ev.target.closest('[data-demo-remove]');if(b){b.closest('.tm53-repeat-item').remove();tm523VisitorLabels_(container,'[data-demo-visitor]');}});
   tm523BindNumbering_(container);toggle();
 }
 function showDemoModal(){const day=D.days.find(d=>d.date===D.popup.date);if(!day)return;
   const overlay=document.createElement('div');overlay.className='tm524-modal-overlay tm524-demo-overlay';
   overlay.innerHTML=`<div class="tm524-modal tm524-demo-modal" role="dialog" aria-modal="true" tabindex="-1"><div class="tm524-modal-top"><div><strong>${E(day.day)} · ${show(day.date)}</strong><span>${D.popup.mode==='view'?'Semakan dokumen':'Pindaan borang'}</span></div><button data-dem-popup-close aria-label="Tutup">✕</button></div>
     <div class="tm524-demo-modal-body">${D.popup.mode==='view'?(day.holiday?`<div class="tm532-modal-notice"><h3>Tiada laporan — Cuti</h3><p>${E(day.holidayTitle||'Tiada laporan diperlukan.')}</p></div>`:day.status==='LENGKAP'?demoDayView(day):'<div class="tm532-modal-notice"><span class="tm532-state-icon">◷</span><h3>Laporan Belum Diisi</h3><p>Laporan harian belum dilengkapkan oleh guru bertugas. Tiada dokumen untuk disemak bagi hari ini.</p></div>'):tm53DemoFields(day,true)}</div>
     <div class="tm524-modal-actions"><button data-dem-popup-close>Tutup</button>
       ${D.popup.mode==='edit'?'<button data-dem-popup-save>Simpan Draf</button><button class="primary" data-dem-popup-finish>Lengkap & Kunci</button>':''}</div></div>`;
   D.root.append(overlay);if(D.popup.mode==='edit')bindDemoForm(overlay);
   overlay.querySelectorAll('[data-dem-popup-close]').forEach(b=>b.onclick=()=>{D.popup=null;overlay.remove();});
   overlay.onclick=e=>{if(e.target===overlay){D.popup=null;overlay.remove();}};

   const save=overlay.querySelector('[data-dem-popup-save]');if(save)save.onclick=()=>{collect();day.status='DRAF';D.popup=null;render();};
   const finish=overlay.querySelector('[data-dem-popup-finish]');if(finish)finish.onclick=()=>{if(!tm532ValidateDemo_(day))return;collect();day.status='LENGKAP';D.popup=null;render();};
   overlay.querySelector('.tm524-modal').focus();
 }
 function tm533DemoReturnModal(){
   if(!desktopDemo()||D.role!=='GPK'||D.phase!=='MENUNGGU_GPK')return;
   D.returnOverlay?.remove();
   const overlay=document.createElement('div');overlay.className='tm524-modal-overlay tm533-return-overlay';
   overlay.innerHTML=`<section class="tm524-modal tm533-return-modal" role="dialog" aria-modal="true" aria-labelledby="tm533-demo-return-heading" tabindex="-1">
     <div class="tm524-modal-top"><div><strong id="tm533-demo-return-heading">Pulangkan untuk Pembetulan</strong><span>Pilih hari yang memerlukan tindakan guru</span></div><button class="tm524-close" type="button" data-tm533-demo-close>✕</button></div>
     <div class="tm533-return-content"><p class="tm533-return-label">01 · Pilih satu atau beberapa hari</p><div class="tm533-return-tabs" role="group" aria-label="Pilih hari pembetulan">
       ${D.days.filter(d=>!d.holiday).map(d=>`<button type="button" class="tm533-return-day" aria-pressed="false" data-tm533-demo-return-date="${E(d.date)}">${E(d.day)}<small>${show(d.date)}</small></button>`).join('')}</div>
       <p class="tm533-return-help">Pilih semua hari yang perlu dibuka semula untuk pembetulan.</p>
       <label class="tm533-return-label" for="tm533-demo-return-note">02 · Catatan pembetulan</label>
       <textarea id="tm533-demo-return-note" rows="5" placeholder="Nyatakan dengan jelas bahagian yang perlu dibetulkan oleh guru..."></textarea>
       <p class="tm533-return-error" role="alert" hidden></p></div>
       <div class="tm524-modal-actions"><button type="button" data-tm533-demo-close>Batal</button><button type="button" class="primary" id="tm533-demo-return-submit">Hantar Arahan Pembetulan</button></div>
    </section>`;
   D.root.append(overlay);D.returnOverlay=overlay;
   const selected=new Set(),error=overlay.querySelector('.tm533-return-error');
   const close=()=>{overlay.remove();if(D.returnOverlay===overlay)D.returnOverlay=null;};
   overlay.querySelectorAll('[data-tm533-demo-close]').forEach(b=>b.onclick=close);
   overlay.onclick=e=>{if(e.target===overlay)close();};
   overlay.querySelectorAll('[data-tm533-demo-return-date]').forEach(b=>b.onclick=()=>{
     const date=b.dataset.tm533DemoReturnDate;
     if(selected.has(date))selected.delete(date);else selected.add(date);
     b.setAttribute('aria-pressed',selected.has(date)?'true':'false');error.hidden=true;
   });
   overlay.querySelector('#tm533-demo-return-submit').onclick=()=>{
     if(!selected.size){error.textContent='Sila pilih sekurang-kurangnya satu hari.';error.hidden=false;return;}
     const note=overlay.querySelector('#tm533-demo-return-note');
     if(!note.value.trim()){error.textContent='Sila isi catatan pembetulan.';error.hidden=false;note.focus();return;}
     D.returnNotes=D.returnNotes||{};
     for(const date of selected){const day=D.days.find(d=>d.date===date);if(day){day.status='PEMBETULAN';D.returnNotes[date]=note.value.trim();}}
     D.returnNote=note.value.trim();D.phase='DIPULANGKAN';D.role=window.matchMedia('(min-width:901px)').matches?'GURU':'GPK';D.index=Math.max(0,D.days.findIndex(d=>selected.has(d.date)));
     close();render();
     if(window.matchMedia('(max-width:900px)').matches)tm5316Success('Arahan pembetulan berjaya dihantar',
       'Hari terpilih telah dipulangkan untuk pembetulan.',
       ()=>tm5316ScrollTop(D.root.querySelector('.tm5312-demo-week')||D.root));
   };
   overlay.querySelector('.tm533-return-modal').focus();
 }
 async function action(cmd){const day=D.days[D.index];
   if(cmd==='edit-sent'&&D.phase==='MENUNGGU_GPK'){
     const eligible=D.days[D.index]?.status==='LENGKAP'&&(D.role==='KETUA'||D.role==='GURU'&&D.days[D.index].day==='Isnin'||D.role==='SELASA'&&D.days[D.index].day==='Selasa')?
       D.days[D.index]:D.days.find(d=>d.status==='LENGKAP'&&(D.role==='KETUA'||D.role==='GURU'&&d.day==='Isnin'||D.role==='SELASA'&&d.day==='Selasa'));
     if(!eligible)return tm5318Alert('Tiada laporan harian yang boleh anda sunting.');
     D.phase='BELUM_DIHANTAR';eligible.status='PEMBETULAN';D.index=D.days.indexOf(eligible);D.popup={date:eligible.date,mode:'edit'};render();return;
   }
   if(cmd==='reset'){D.week=selectedWeek();D.days=makeDays();D.phase='BELUM_DIHANTAR';D.index=1;D.popup=null;D.mobilePage=false;D.mobileDirty=false;D.returnPage=false;
     D.role='GURU';D.summary='';D.followup='';D.gpkNote='';D.gbNote='';D.gpkReviewedAt='';D.verifiedAt='';D.returnNotes={};render();return;}
   if(cmd==='doc'){
     collect();showDemoPrintPreview(false);return;
   }
   if(cmd==='schedule'){tmPrintScheduleOfficial();return;}
   if(cmd==='sample'){
     D.days.forEach(d=>{if(!d.holiday){d.data={speech:'Tiada ucapan khas.',clean:'Bersih',discipline:'Terkawal',program:'ADA',
       activities:'Aktiviti berjalan lancar.',visitors:'Tiada',program_note:'Program berlangsung dengan baik.',
       activities_list:[{title:'Aktiviti Kelas',desc:'Aktiviti berjalan dengan lancar.'}],activity_status:'ADA',visitors_list:[]};
       demoPairs.forEach(([key,,kind])=>d.data[key]={status:kind==='speech'?'TIADA':kind==='clean'?'BERSIH':'TERKAWAL',text:''});
       d.status='LENGKAP';}});render();return;
   }
   if(cmd==='save'||cmd==='finish'){
     if(!editable(day))return;
     if(cmd==='finish'&&desktopDemo()&&!tm532ValidateDemo_(day))return;
     collect();
     if(cmd==='finish'&&!desktopDemo()&&(!day.data.clean||!day.data.discipline))return tm5318Alert('Sila isi kebersihan dan disiplin.');
     day.status=cmd==='finish'?'LENGKAP':'DRAF';D.mobilePage=false;D.mobileDirty=false;render();return;
   }
   if(cmd==='submit'){
     if(D.role!=='KETUA'||!complete()||!['BELUM_DIHANTAR','DIPULANGKAN'].includes(D.phase))return;
     const summary=D.root.querySelector('#demo-summary'),followup=D.root.querySelector('#demo-followup');
     if(desktopDemo()&&summary&&!summary.value.trim()){tm533Invalid(D.root,summary,'Sila isi ulasan Ketua Kumpulan.');return;}
     if(desktopDemo()&&followup&&!followup.value.trim()){tm533Invalid(D.root,followup,'Sila isi cadangan atau tindakan susulan.');return;}
     D.summary=summary?.value||'Semua guru telah melaksanakan tugasan mingguan.';
     D.followup=followup?.value||'';
     D.phase='MENUNGGU_GPK';D.role='KETUA';D.popup=null;render();
     if(window.matchMedia('(max-width:900px)').matches)tm5316Success('Laporan berjaya dihantar',
       'Ulasan Ketua Kumpulan telah dihantar kepada GPK Penyelia untuk semakan.',
       ()=>tm5316ScrollTop(D.root.querySelector('.tm5312-demo-week')||D.root));
     return;
   }
   if(cmd==='gpk-ok'&&D.phase==='MENUNGGU_GPK'){
     const note=D.root.querySelector('#demo-review');
     if(desktopDemo()&&note&&!note.value.trim()){tm533Invalid(D.root,note,'Sila isi ulasan dan cadangan GPK sebelum menyokong laporan.');return;}
     D.gpkNote=note?.value||'Disokong oleh GPK.';D.gpkReviewedAt=tmToday();
     D.phase='MENUNGGU_GB';D.role='GPK';render();
     if(window.matchMedia('(max-width:900px)').matches)tm5316Success('Semakan GPK berjaya dihantar',
       'Laporan telah disokong dan dihantar untuk pengesahan Guru Besar.',
       ()=>tm5316ScrollTop(D.root.querySelector('.tm5312-demo-week')||D.root));
     return;
   }
   if(cmd==='gb-ok'&&D.phase==='MENUNGGU_GB'){
     D.gbNote='Disahkan oleh Guru Besar.';D.verifiedAt=tmToday();
     D.phase='DISAHKAN';D.role=window.matchMedia('(min-width:901px)').matches?'GURU':'GB';render();
     if(window.matchMedia('(max-width:900px)').matches)tm5316Success('Laporan berjaya disahkan',
       'Pengesahan Guru Besar telah direkodkan dalam Mod Ujian.',
       ()=>tm5316ScrollTop(D.root.querySelector('.tm5312-demo-week')||D.root));
     return;
   }
   if(cmd==='gpk-return'&&D.phase==='MENUNGGU_GPK'){
     if(window.matchMedia('(max-width:900px)').matches){D.returnPage=true;D.mobilePage=false;render();return;}
     if(desktopDemo()){tm533DemoReturnModal();return;}
     if(day.holiday)return tm5318Alert('Hari cuti tidak boleh dipulangkan. Pilih hari persekolahan.');
     const note=await tm5318Prompt('Masukkan arahan pembetulan bagi '+day.day+':');if(!note?.trim())return;
     day.status='PEMBETULAN';D.returnNote=note.trim();D.phase='DIPULANGKAN';D.role='GPK';render();
     tm5316Success('Arahan pembetulan berjaya dihantar',
       'Laporan dipulangkan untuk pembetulan oleh guru berkaitan.',
       ()=>tm5316ScrollTop(D.root.querySelector('.tm5312-demo-week')||D.root));
     return;
   }
 }
 function demoDirectory(root){
   if(!D.on||!D.week)return;
   D.root=root;D.popup=null;D.mobilePage=false;D.mobileDirty=false;D.returnPage=false;
   const status=D.phase==='DISAHKAN'?'Lengkap':D.phase==='MENUNGGU_GPK'?'Semakan GPK Penyelia':D.phase==='MENUNGGU_GB'?'Pengesahan GB':'Tiada Laporan';
   const approved=D.phase==='DISAHKAN';
   const weeklyName=D.week.name||'Minggu Semasa';
   D.root.innerHTML=`<section class="tm5-card tm5-dir-card tm525-demo-directory"><div class="tm525-demo-header"><h2>Direktori Laporan Mingguan — Mod Ujian</h2><p>Perubahan simulasi tidak mengubah laporan rasmi.</p></div><div class="tm5-directory"><div class="tm5-dirrow ${approved?'tm5-dir-open':'tm5-dir-disabled'}" ${approved?'role="button" tabindex="0" data-demo-dir-open':''}><div class="tm5-dir-title"><strong>${E(weeklyName)}</strong><span>${show(D.week.from)} – ${show(D.week.to)}</span></div><span class="tm5-pill ${approved?'approved':'pending'}">${status}</span><span class="tm5-dir-arrow">${approved?'›':'—'}</span></div></div></section>`;
   const link=D.root.querySelector('[data-demo-dir-open]');if(link){link.onclick=()=>demoDocument();link.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();demoDocument();}};}
 }
 // V5.2.9: satu sumber reka bentuk — pratonton UAT dan cetakan rasmi menggunakan
 // generator HTML A4 yang sama. Pratonton tidak memerlukan pengesahan GB;
 // tindakan Cetak/Muat Turun simulasi kekal hanya selepas DISAHKAN.
 function showDemoPrintPreview(fromDirectory){
   if(!window.SeMAKMUR_TM528_PRINT?.generate){
     tm5318Alert('Template cetakan tidak tersedia. Muat semula Fi-TugasanMingguan.js yang terkini.');
     return;
   }
   let report;
   try{report=tm528DemoPayload();window.SeMAKMUR_TM528_PRINT.generate(report);}
   catch(e){tm5318Alert('Gagal menghasilkan pratonton: '+(e?.message||e));return;}
   const approved=D.phase==='DISAHKAN';
   D.root.innerHTML=`<section class="tm5-card tm5-preview-banner"><div>
     <h2>Pratonton Laporan A4 · ${E(D.week.name)}</h2>
     <span>MOD UJIAN PENTADBIR · ${approved?'Disahkan dalam simulasi':'Pratonton sahaja — belum disahkan Guru Besar'}</span>
     </div><div class="tm5-banner-right"><button type="button" data-demo-preview-back>Kembali</button>
     ${approved?'<button type="button" data-demo-preview-download>Muat Turun Contoh</button><button type="button" class="primary" data-demo-preview-print>Cetak Contoh Ujian</button>':''}
     </div></section><div class="tm529-preview-container" style="width:100%;max-width:100%;padding:12px 0 25px;">
     <iframe title="Pratonton A4 Laporan Mingguan · Mod Ujian" data-demo-print-frame style="display:block;width:100%;min-height:900px;border:1px solid #dce5e2;border-radius:10px;background:#e8eeec;"></iframe>
     </div>`;
   const frame=D.root.querySelector('[data-demo-print-frame]');
   frame.addEventListener('load',()=>{
     try{
       const body=frame.contentDocument?.body, doc=frame.contentDocument?.documentElement;
       const h=Math.max(body?.scrollHeight||0,doc?.scrollHeight||0);
       if(h>100)frame.style.height=Math.min(h+40,40000)+'px';
       // Images in the school header/footer may load after the iframe document.
       frame.contentDocument?.querySelectorAll('img').forEach(im=>im.addEventListener('load',()=>{
         const next=Math.max(frame.contentDocument.body?.scrollHeight||0,frame.contentDocument.documentElement?.scrollHeight||0);
         if(next>100)frame.style.height=Math.min(next+40,40000)+'px';
       },{once:true}));
     }catch(e){/* Dalam pelayar terhad, bingkai masih boleh ditatal. */}
   },{once:true});
   frame.srcdoc=window.SeMAKMUR_TM528_PRINT.generate(report).replace('</style>','.printbar{display:none!important}</style>');
   D.root.querySelector('[data-demo-preview-back]').onclick=()=>fromDirectory?demoDirectory(D.root):render();
   if(approved){
     D.root.querySelector('[data-demo-preview-print]').onclick=()=>{
       try{window.SeMAKMUR_TM528_PRINT.open(tm528DemoPayload());}catch(e){tm5318Alert(e?.message||e);}
     };
     D.root.querySelector('[data-demo-preview-download]').onclick=()=>{
       try{window.SeMAKMUR_TM528_PRINT.download(tm528DemoPayload());}catch(e){tm5318Alert(e?.message||e);}
     };
   }
 }
 function tm5317DemoRead(){
   const payload=tm528DemoPayload(),weekNumber=String(payload.week||'—');
   D.root.innerHTML=`<div class="tm5317-read-report">
     <div class="tm5317-read-actions"><button type="button" data-demo-read-back>← Direktori Program</button>
       <button type="button" class="primary" data-demo-read-print>▤ Cetak</button></div>
     <header class="tm5317-read-head"><span class="tm5317-kicker">MOD UJIAN · LAPORAN DISAHKAN</span>
       <h2>Minggu ${E(weekNumber)}</h2><h3>Kumpulan ${E(payload.group)}</h3>
       <p>${show(payload.from)} – ${show(payload.to)}</p>
       <div class="tm5317-people"><div><small>GPK Penyelia</small><strong>${E(payload.gpk)}</strong></div>
       <div><small>Ketua Kumpulan</small><strong>${E(payload.leader)}</strong></div></div></header>
     ${D.days.map(d=>`<div class="tm5317-read-day">${demoDayView(d).replace(/(<h3>[^<]*<\/h3>)/,`$1${d.holiday?'':`<p class="tm5317-reporter"><strong>Dilaporkan oleh</strong> ${E('Guru Laporan '+d.day)}</p>`}`)}</div>`).join('')}
     <section class="tm5317-read-section"><h3>Ulasan Ketua Kumpulan</h3>
       <div class="tm5-doc-cell"><b>Ulasan Keseluruhan</b><p>${E(D.summary||'—')}</p></div>
       <div class="tm5-doc-cell"><b>Cadangan / Tindakan Susulan</b><p>${E(D.followup||'—')}</p></div></section>
     <section class="tm5317-read-section"><h3>Semakan GPK Penyelia</h3>
       <p class="tm5317-meta"><strong>Disemak oleh:</strong> ${E(payload.gpk)}</p>
       <p class="tm5317-meta"><strong>Tarikh:</strong> ${E(D.gpkReviewedAt||'Tidak direkodkan')}</p>
       <div class="tm5-doc-cell"><b>Ulasan GPK</b><p>${E(D.gpkNote||'—')}</p></div></section>
     <section class="tm5317-read-section"><h3>Pengesahan Guru Besar</h3>
       <p class="tm5317-meta"><strong>Disahkan oleh:</strong> ${E(payload.verifiedName)}</p>
       <p class="tm5317-meta"><strong>Tarikh:</strong> ${E(D.verifiedAt||'Tidak direkodkan')}</p>
       ${D.gbNote?`<div class="tm5-doc-cell"><b>Catatan GB</b><p>${E(D.gbNote)}</p></div>`:''}</section>
     </div>`;
   D.root.querySelector('[data-demo-read-back]').onclick=()=>demoDirectory(D.root);
   D.root.querySelector('[data-demo-read-print]').onclick=()=>{try{window.SeMAKMUR_TM528_PRINT.open(tm528DemoPayload());}catch(e){tm5318Alert(e?.message||e);}};
   tm5316ScrollTop(D.root);
 }
 function demoDocument(){if(D.phase!=='DISAHKAN')return;
   if(window.matchMedia('(max-width:900px)').matches)return tm5317DemoRead();
   showDemoPrintPreview(true);
 }
 window.SeMAKMUR_TM52_DEMO={isOn:()=>D.on,getRole:()=>D.role,hasUnsaved:()=>D.mobilePage&&D.mobileDirty,
  setRole:async role=>{if(!D.on||!Object.hasOwn(roleText,role))return;
    if(D.mobilePage&&D.mobileDirty&&!await tm5318Confirm('Borang belum disimpan. Tukar peranan dan buang perubahan?')){const sel=document.getElementById('tm5311-demo-role');if(sel)sel.value=D.role;return;}
    if(!D.popup&&!D.mobilePage)collect();D.popup=null;D.role=role;D.mobilePage=false;D.mobileDirty=false;D.returnPage=false;render();},
  show:root=>{D.root=root;render();},directory:demoDirectory,
  on:root=>{D.on=true;D.root=root;D.mobilePage=false;D.mobileDirty=false;D.returnPage=false;D.week=selectedWeek();D.days=makeDays();D.index=D.days.findIndex(d=>!d.holiday);if(D.index<0)D.index=0;
   D.phase='BELUM_DIHANTAR';D.role='GURU';D.popup=null;D.summary='';D.followup='';render();},
  off:()=>{D.on=false;D.root=null;D.days=[];D.mobilePage=false;D.mobileDirty=false;window.dispatchEvent(new CustomEvent('semakmur-tm52-demo-changed',{detail:{on:false}}));}};
})();
