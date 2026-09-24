// Helper file: info lengkap (nama, ukuran, dimensi, durasi, hash, dll)
const gcd=(a,b)=>b?gcd(b,a%b):a;
async function sha256(f){try{if(!crypto||!crypto.subtle||f.size>50*1024*1024)return null;const b=await crypto.subtle.digest('SHA-256',await f.arrayBuffer());return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch{return null}}
function probe(f){return new Promise(res=>{
  const u=URL.createObjectURL(f),t=f.type||'';let done=false;
  const fin=v=>{if(done)return;done=true;URL.revokeObjectURL(u);res(v)};
  setTimeout(()=>fin({}),6000);
  if(t.startsWith('image/')){const i=new Image();i.onload=()=>fin({w:i.naturalWidth,h:i.naturalHeight});i.onerror=()=>fin({});i.src=u}
  else if(t.startsWith('video/')||t.startsWith('audio/')){const m=document.createElement(t.startsWith('video')?'video':'audio');m.preload='metadata';m.onloadedmetadata=()=>fin({w:m.videoWidth||0,h:m.videoHeight||0,d:m.duration});m.onerror=()=>fin({});m.src=u}
  else fin({});
})}
async function fileInfo(f){
  const p=await probe(f);
  const rows=[['Nama',f.name],['Tipe',f.type||'tidak diketahui'],['Ukuran',`${bytes(f.size)||'0 B'} (${f.size.toLocaleString('id-ID')} byte)`]];
  if(p.w&&p.h){const g=gcd(p.w,p.h);rows.push(['Dimensi',`${p.w} × ${p.h} px`],['Megapiksel',(p.w*p.h/1e6).toFixed(2)+' MP'],['Rasio',`${p.w/g}:${p.h/g}`])}
  if(p.d&&isFinite(p.d))rows.push(['Durasi',dur(p.d)]);
  if(f.lastModified)rows.push(['Terakhir diubah',new Date(f.lastModified).toLocaleString('id-ID')]);
  const h=await sha256(f);if(h)rows.push(['SHA-256',h]);
  return {rows,p};
}
const infoTable=rows=>`<table>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table>`;
function wireDrop(dz,input,onFile){
  ['dragenter','dragover'].forEach(e=>dz.addEventListener(e,x=>{x.preventDefault();dz.classList.add('on')}));
  ['dragleave','drop'].forEach(e=>dz.addEventListener(e,x=>{x.preventDefault();dz.classList.remove('on')}));
  dz.addEventListener('drop',x=>{const f=x.dataTransfer.files[0];if(f)onFile(f)});
  input.addEventListener('change',()=>{if(input.files[0])onFile(input.files[0])});
  document.addEventListener('paste',e=>{const f=e.clipboardData&&e.clipboardData.files[0];if(f)onFile(f)});
}
function xhrSend(url,body,ct,onProg){return new Promise((res,rej)=>{
  const x=new XMLHttpRequest();x.open('POST',url);if(ct)x.setRequestHeader('Content-Type',ct);
  if(onProg)x.upload.onprogress=e=>{if(e.lengthComputable)onProg(e.loaded/e.total)};
  x.onload=()=>{let j={};try{j=JSON.parse(x.responseText)}catch{j={raw:x.responseText}}x.status>=200&&x.status<300?res(j):rej(new Error(j.error||('Error '+x.status)))};
  x.onerror=()=>rej(new Error('Koneksi gagal'));x.send(body);
})}
const LIMIT=4.4*1024*1024;
// File besar: coba unggah langsung dari browser ke Catbox (bisa diblokir CORS)
function directUpload(file,expire,onProg){return new Promise((res,rej)=>{
  const fd=new FormData(),lit=['1h','12h','24h','72h'].includes(expire);
  fd.append('reqtype','fileupload');if(lit)fd.append('time',expire);fd.append('fileToUpload',file,file.name);
  const x=new XMLHttpRequest();x.open('POST',lit?'https://litterbox.catbox.moe/resources/internals/api.php':'https://catbox.moe/user/api.php');
  x.upload.onprogress=e=>{if(e.lengthComputable&&onProg)onProg(e.loaded/e.total)};
  x.onload=()=>{const t=(x.responseText||'').trim();/^https?:\/\//.test(t)?res({url:t}):rej(new Error(t.slice(0,150)||'Upload gagal'))};
  x.onerror=()=>rej(new Error('File lebih dari 4 MB dan unggah langsung diblokir browser (CORS). Pakai mode "Dari link" atau kecilkan file.'));
  x.send(fd);
})}
