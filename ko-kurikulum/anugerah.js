// SeMAKMUR Anugerah V6.2: Google Identity Services (GIS), tanpa Firebase/Firestore.
const GOOGLE_CLIENT_ID = '637460698521-djt73cs1emsa5n5m7p2q8s4feohmhnuh.apps.googleusercontent.com';
// Classroom belum diaktifkan; dikekalkan untuk kompatibiliti.
const CLASSROOM_SCOPES = 'email profile';
const $ = id => document.getElementById(id);
const API = String(window.KOKO_API_URL || '').trim();
let idToken = '', busy = false;
function showStatus(message, error=false) {
  $('status').textContent=message;
  $('status').classList.toggle('error',error);
}
function busySet(value) {
  busy=value;
  $('loading').hidden=!value;
  $('refresh').disabled=value;
}
function clearReport() {
  $('reportPanel').hidden=true;
  $('report').removeAttribute('src');
  $('report').src='about:blank';
  $('report').name='';
}
function logOut(){
  idToken='';clearReport();
  $('logout').hidden=true;$('googleButton').hidden=false;
  window.google?.accounts?.id?.disableAutoSelect();
  showStatus('Sesi paparan ditutup. Pilih akaun Google untuk log masuk semula.');
}
async function showReport() {
  if(!idToken || busy) return;
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(API)) {
    showStatus('URL Apps Script tidak sah. Semak config.js.',true);return;
  }
  busySet(true);clearReport();showStatus('Mengesahkan akaun Google dengan pelayan…');
  try {
    // HTML form POST digunakan supaya token tidak berada dalam URL atau JSONP.
    const frame=$('report');
    const frameName='semakmurAwards'+Date.now();frame.name=frameName;
    const form=document.createElement('form');form.method='POST';form.target=frameName;
    form.action=API;form.hidden=true;
    const input=document.createElement('input');input.name='payload';input.type='hidden';
    input.value=JSON.stringify({action:'anugerahPrivate',idToken});
    form.append(input);document.body.append(form);
    $('reportPanel').hidden=false;form.submit();form.remove();
    showStatus('Permintaan dihantar. Jika laporan menolak akses, semak e-mel dalam Profil_Guru dan status AKTIF.');
  } catch(error) {showStatus('Ralat membuka laporan: '+(error.message||error),true);clearReport();}
  finally {busySet(false);}
}
function onGoogleCredential(response) {
  if(!response?.credential) {showStatus('Google tidak mengembalikan token. Sila cuba lagi.',true);return;}
  idToken=response.credential;
  $('googleButton').hidden=true;
  $('logout').hidden=false;
  showReport();
}
function initializeGoogleLogin() {
  if(!window.google?.accounts?.id) {showStatus('Google Identity Services gagal dimuatkan. Semak rangkaian / sekatan pelayar.',true);return;}
  google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:onGoogleCredential,auto_select:false,
    cancel_on_tap_outside:true});
  google.accounts.id.renderButton($('googleButton'),{theme:'outline',size:'large',text:'signin_with',shape:'rectangular',width:280});
  showStatus('Sila log masuk menggunakan akaun Google MOE yang berada dalam Profil_Guru aktif.');
}
$('logout').addEventListener('click',logOut);
$('refresh').addEventListener('click',showReport);
(function waitGoogle(tries=0){
  if(window.google?.accounts?.id) initializeGoogleLogin();
  else if(tries < 35) setTimeout(()=>waitGoogle(tries+1),200);
  else showStatus('Skrip log masuk Google tidak dapat dimuatkan. Semak sambungan dan domain OAuth.',true);
})();
