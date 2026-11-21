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
