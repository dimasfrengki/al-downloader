const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isUrl=s=>typeof s==='string'&&/^https?:\/\//i.test(s);
const short=n=>{n=Number(n);if(!isFinite(n))return null;const f=(v,s)=>v.toFixed(v<10?1:0).replace(/\.0$/,'')+s;return n>=1e9?f(n/1e9,'B'):n>=1e6?f(n/1e6,'M'):n>=1e3?f(n/1e3,'K'):String(n)};
const bytes=n=>{n=Number(n);if(!isFinite(n)||n<=0)return null;const u=['B','KB','MB','GB'];let i=0;while(n>=1024&&i<3){n/=1024;i++}return n.toFixed(i?1:0)+' '+u[i]};
const dur=n=>{n=Number(n);if(!isFinite(n))return null;if(n>36000)n=Math.round(n/1000);return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0')};
const dt=n=>{n=Number(n);if(!isFinite(n))return null;if(n<1e9)return null;if(n<1e12)n*=1000;return new Date(n).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})};

function flat(o,path='',d=0,acc=[]){
  if(o===null||o===undefined)return acc;
  if(Array.isArray(o))o.slice(0,60).forEach((v,i)=>flat(v,path+'['+i+']',d+1,acc));
  else if(typeof o==='object'){for(const k in o)flat(o[k],path?path+'.'+k:k,d+1,acc)}
  else acc.push({p:path,k:path.split('.').pop().replace(/\[\d+\]$/,'').toLowerCase(),v:o,d});
  return acc;
}
function kind(p,u){
  const uu=u.toLowerCase(),k=p.toLowerCase();
  if(/\.(mp4|webm|mov|m4v|m3u8)(\?|#|$)/.test(uu)||/mime_type=video|video_mp4|\/video\//.test(uu))return 'video';
  if(/\.(mp3|m4a|aac|ogg|opus|wav)(\?|#|$)/.test(uu)||/mime_type=audio|audio_mp/.test(uu))return 'audio';
  if(/\.(jpe?g|png|webp|gif|avif|heic)(\?|#|$)/.test(uu))return 'image';
  if(/^https?:\/\/(open\.spotify|www\.youtube|youtu\.be|m\.youtube|www\.tiktok|vt\.tiktok|www\.instagram|github\.com)/.test(uu))return 'link';
  if(/cover|thumb|avatar|poster|image|img|photo|pic|icon|banner|preview|wallpaper/.test(k))return 'image';
  if(/music|audio|sound|mp3|song/.test(k))return 'audio';
  if(/video|play|nowm|mp4|stream|media|hd/.test(k))return 'video';
  return 'link';
}
const label=p=>{const s=p.replace(/\[(\d+)\]/g,' $1').split('.').slice(-2).join(' ').replace(/[_-]/g,' ').trim();return s?s[0].toUpperCase()+s.slice(1):'Link'};

const STATS=[
 ['👁','Views',/^(views?|view_?count|viewcount|play_?count|playcount|plays|views_count)$/,short],
 ['❤️','Suka',/^(likes?|like_?count|likecount|digg_?count|diggcount)$/,short],
 ['💬','Komentar',/^(comments?|comment_?count|commentcount|replies|reply_?count)$/,short],
 ['↗️','Share',/^(shares?|share_?count|sharecount|forward_?count|reposts?)$/,short],
 ['🔖','Simpan',/^(collect_?count|collectcount|saves?|save_?count|bookmarks?)$/,short],
 ['⏱','Durasi',/^(duration|length|dur|duration_?ms|durasi)$/,dur],
 ['📦','Ukuran',/^(size|file_?size|filesize|bytes)$/,bytes]
];
const METAS=[
 ['📅','',/^(create_?time|createtime|created_?at|created|upload_?date|published?(_?at)?|release_?date|date|uploaded)$/,dt],
 ['🌍','',/^(region|country|negara)$/],
 ['🎞','',/^(quality|resolution|res|definition)$/],
 ['🧩','',/^(format|ext|extension|mime_?type)$/],
 ['💿','',/^(album)$/],['🎼','',/^(genre|category|kategori)$/],
 ['🏷','v',/^(version|versi)$/],['👨‍💻','',/^(developer|publisher)$/],['⭐','',/^(rating|score)$/],['💰','',/^(price|harga)$/]
];
function analyze(o){
  const F=flat(o);
  const pick=(re,ok)=>F.filter(f=>re.test(f.k)&&(!ok||ok(f))).sort((a,b)=>a.d-b.d)[0];
  const txt=f=>typeof f.v==='string'&&!isUrl(f.v)&&f.v.trim().length>0;
  const tf=pick(/^(title|judul|name|nama|caption|text)$/,txt)||pick(/^(desc|description|deskripsi)$/,txt);
  const title=tf?String(tf.v).trim():'';
  const df=pick(/^(desc|description|deskripsi|caption|synopsis|sinopsis|summary)$/,f=>txt(f)&&String(f.v).trim()!==title);
  const af=pick(/^(nickname|author_?name|authorname|uploader|creator|artists?|channel|owner|unique_?id|username|user|author)$/,txt);
  const av=pick(/^(avatar|avatar_?thumb|profile_?pic|avatar_?url)$/,f=>isUrl(f.v));
  const stats=[],metas=[];
  STATS.forEach(([i,l,re,fm])=>{const f=pick(re,x=>x.v!==''&&typeof x.v!=='object');if(!f)return;const s=String(f.v).trim();const v=(typeof f.v==='number'||/^\d+(\.\d+)?$/.test(s))?fm(f.v):(s&&s.length<20?s:null);if(v)stats.push([i,l,v])});
  METAS.forEach(([i,pre,re,fm])=>{const f=pick(re,x=>x.v!==''&&typeof x.v!=='object'&&!isUrl(x.v));if(!f)return;let v=fm?fm(f.v):null;if(!v)v=String(f.v).trim();if(v&&v.length<40)metas.push([i,pre+v])});
  const tags=F.filter(f=>/^(hashtags?|tags?|hashtag_?names?)$/.test(f.k)&&txt(f)&&f.v.length<40).slice(0,8).map(f=>'#'+String(f.v).replace(/^#/,''));
  const seen=new Set(av?[av.v]:[]),M={video:[],audio:[],image:[],link:[]};
  F.filter(f=>isUrl(f.v)).forEach(f=>{if(seen.has(f.v))return;seen.add(f.v);M[kind(f.p,f.v)].push({u:f.v,l:label(f.p)})});
  const thumb=M.image.find(x=>/cover|thumb|poster|preview/i.test(x.l))||M.image[0];
  const rest=[],long=[];const done=new Set();
  F.forEach(f=>{if(isUrl(f.v)||typeof f.v==='boolean'&&false||done.has(f.p))return;done.add(f.p);const s=String(f.v);if(f===tf||f===df||f===af)return;if(s.length>300||s.includes('\n'))long.push([label(f.p),s]);else if(s.trim())rest.push([label(f.p),s])});
  return {title,desc:df?String(df.v).trim():'',author:af?String(af.v):'',avatar:av?av.v:'',stats,metas,tags,M,thumb,rest:rest.slice(0,60),long:long.slice(0,4)};
}
function view(it){
  if(it===null||typeof it!=='object')return `<article class="res"><div class="body"><p class="desc open">${esc(it)}</p></div></article>`;
  const a=analyze(it),M=a.M,v0=M.video[0],hasMedia=v0||M.audio[0]||M.image[0];
  let h='<article class="res">';
  if(v0)h+=`<video class="media" controls playsinline preload="metadata" ${a.thumb?`poster="${esc(a.thumb.u)}"`:''} src="${esc(v0.u)}" data-alt="${esc(JSON.stringify(M.video.slice(1).map(x=>x.u)))}"></video>`;
  else if(M.image.length===1||(M.image.length&&M.image.length<2))h+=`<img class="media" src="${esc(M.image[0].u)}" loading="lazy" alt="">`;
  h+='<div class="body">';
  if(a.title)h+=`<h3>${esc(a.title)}</h3>`;
  if(a.author||a.avatar)h+=`<div class="auth">${a.avatar?`<img src="${esc(a.avatar)}" alt="" loading="lazy">`:''}<span>${esc(a.author)}</span></div>`;
  const chips=a.stats.map(s=>`<span class="chip">${s[0]} ${esc(s[2])} <small>${s[1]}</small></span>`).concat(a.metas.map(m=>`<span class="chip m">${m[0]} ${esc(m[1])}</span>`),a.tags.map(t=>`<span class="chip m">${esc(t)}</span>`));
  if(chips.length)h+=`<div class="chips">${chips.join('')}</div>`;
  if(M.audio[0]&&!v0)h+=`<audio controls preload="none" src="${esc(M.audio[0].u)}"></audio>`;
  if(a.desc)h+=`<p class="desc" onclick="this.classList.toggle('open')">${esc(a.desc)}</p>`;
  if(M.image.length>=2){const g=(v0?M.image.filter(x=>x!==a.thumb):M.image);if(g.length)h+=`<div class="gal">${g.slice(0,12).map(x=>`<a href="${esc(x.u)}" target="_blank" rel="noopener"><img src="${esc(x.u)}" loading="lazy" alt=""></a>`).join('')}</div>`}
  const acts=[];
  M.video.forEach(x=>acts.push([x.u,'🎬 '+x.l]));M.audio.forEach(x=>acts.push([x.u,'🎵 '+x.l]));
  if(M.image.length===1&&!v0)acts.push([M.image[0].u,'🖼 Gambar']);
  M.link.slice(0,6).forEach(x=>acts.push([x.u,'🔗 '+x.l]));
  if(M.image.length>=2)M.image.slice(0,3).forEach(x=>acts.push([x.u,'🖼 '+x.l]));
  if(acts.length)h+='<div class="acts">'+acts.slice(0,10).map(([u,l])=>`<a class="btn" href="${esc(u)}" target="_blank" rel="noopener" download>⬇ ${esc(l)}</a>`).join('')+`<button class="btn s" type="button" data-copy="${esc(acts[0][0])}">Salin link</button></div>`;
  a.long.forEach(([l,t])=>{h+=`<details ${hasMedia||a.title&&a.long.length>1?'':'open'}><summary>${esc(l)}</summary><pre>${esc(t)}</pre></details>`});
  if(a.rest.length)h+=`<details><summary>Semua info (${a.rest.length})</summary><table>${a.rest.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table></details>`;
  return h+'</div></article>';
}
function findList(o){
  if(Array.isArray(o))return o;
  if(o&&typeof o==='object'){for(const k in o){const v=o[k];if(Array.isArray(v)&&v.length&&typeof v[0]==='object')return v}
    for(const k in o){const r=o[k]&&typeof o[k]==='object'?findList(o[k]):null;if(r)return r}}
  return null;
}
function show(d,mode){
  const pv=x=>x!==undefined&&x!==null;
  const root=pv(d.result)?d.result:pv(d.data)?d.data:d;
  let h='';
  const list=mode==='search'?findList(root):null;
  if(list&&list.length)h=list.slice(0,40).map(view).join('');
  else h=view(root);
  h+=`<details class="res" style="padding:12px 14px"><summary>Data mentah (JSON)</summary><pre>${esc(JSON.stringify(d,null,2))}</pre></details>`;
  $('out').innerHTML=h;
  hydrate($('out'));
}
function hydrate(r){r.querySelectorAll('video[data-alt]').forEach(v=>{let alts=[];try{alts=JSON.parse(v.dataset.alt)}catch{}v.addEventListener('error',()=>{const n=alts.shift();if(n){v.src=n;v.load()}else v.insertAdjacentHTML('afterend','<p class="warn">Video tidak bisa diputar di sini. Pakai tombol Download atau Buka link.</p>')})})}
async function api(kind,ep,q,extra=''){
  const r=await fetch(`/api/dl?kind=${kind}&ep=${encodeURIComponent(ep)}&q=${encodeURIComponent(q)}${extra}`);
  const t=await r.text();let d;try{d=JSON.parse(t)}catch{d={raw:t}}
  if(!r.ok||d.error||d.status===false)throw new Error(d.error||d.message||('Error '+r.status));
  return d;
}
function loading(){$('out').className=$('out').className;$('out').innerHTML='<div class="sk"></div><div class="sk" style="height:90px"></div>'}
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),1600)}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const b=e.target.closest('[data-copy]');if(b&&navigator.clipboard){navigator.clipboard.writeText(b.dataset.copy).then(()=>toast('Link disalin'))}});

// Terapkan config admin: sembunyikan fitur nonaktif + tampilkan pengumuman
function applyConfig(kind,pick){
  fetch('/api/config').then(r=>r.json()).then(c=>{
    if(c.announcement){const n=document.createElement('div');n.className='notice';n.textContent=c.announcement;document.querySelector('.panel').before(n)}
    (c.off||[]).forEach(id=>{const [k,ep]=id.split(':');if(k!==kind)return;const b=document.querySelector('.pc[data-ep="'+ep+'"]');if(!b)return;const on=b.classList.contains('on');b.remove();if(on){const f=document.querySelector('.pc');if(f)pick(f.dataset.ep)}});
  }).catch(()=>{});
}
