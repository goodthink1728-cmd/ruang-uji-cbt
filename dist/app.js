import {sample,questions,validate,pack,unpack,encode,tokenHash} from "./core.js?v=1.1";
const $=q=>document.querySelector(q),view=$("#view"),modal=$("#modal"),body=$("#modalBody");
const safe=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem("ru."+k))??d}catch{return d}};
const save=(k,v)=>localStorage.setItem("ru."+k,JSON.stringify(v));
let school=read("school","");
let configs=read("configs",[]),session=read("active",null),history=read("history",[]),page="beranda",stream,scanTimer,scanGeneration=0;
let studentData=read("student_profile",{name:"",email:"",class:""});
let scannedConfig=null;
const names={beranda:"Beranda",konfigurasi:"Konfigurasi",riwayat:"Riwayat"};
const isStudent = !!window.NativeShell || new URLSearchParams(location.search).get("mode") === "student" || location.hash === "#siswa";
const paths={link:'<path d="m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 -1)"/>',qr:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zm11 0h3v3h4v4h-7z"/>',file:'<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 13h8m-8 4h6"/>',book:'<path d="M3 5q5-2 9 1 5-3 9-1v14q-5-2-9 1-5-3-9-1zM12 6v14"/>',check:'<path d="m4 12 5 5L20 6"/>'};
const icon=(id,color="")=>'<span class="icon '+color+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[id]+'</svg></span>';
const button=(action,label,css="mini")=>'<button data-act="'+action+'" class="'+css+'">'+label+'</button>';
function network(){$("#network").textContent=navigator.onLine?"Terhubung":"Luring";$(".live").style.color=navigator.onLine?"":"#aa7711"}
network();window.ononline=window.onoffline=network;
$("#date").textContent=new Intl.DateTimeFormat("id-ID",{dateStyle:"full"}).format(new Date());
function stopScan(){scanGeneration++;clearTimeout(scanTimer);stream?.getTracks().forEach(t=>t.stop());stream=null}
function close(){stopScan();modal.close()}
$("#close").onclick=close;modal.onclose=stopScan;
function popup(title,html){stopScan();body.innerHTML='<h2>'+safe(title)+'</h2>'+html+'<p class="error" role="alert"></p>';if(!modal.open)modal.showModal()}
function form(title,fields,submit,callback){popup(title,'<form>'+fields+'<button class="primary">'+submit+'</button></form>');body.querySelector("form").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await callback(new FormData(e.target))}catch(err){body.querySelector(".error").textContent=err.message}finally{b.disabled=false}}}
const field=(label,name,type="text",extra="")=>'<label>'+label+'<input required name="'+name+'" type="'+type+'" '+extra+'></label>';

const studentOverview=()=>`
<div class="student-container">
  <div class="student-logo-wrap">
    <img src="icon.png" alt="CBT Exambro Plus" class="student-hero-logo">
  </div>
  <div class="student-header-card">
    <div class="kicker">LEMBAR MASUK UJIAN PESERTA${school?' · '+safe(school):''}</div>
    <h2>Data Peserta Ujian</h2>
    <p>Silakan isi data diri Anda dan pindai Kode QR dari pengawas untuk memulai ujian.</p>
  </div>
  <form id="studentLoginForm" class="student-form-card">
    <div class="form-group">
      <label for="std_name">Nama Lengkap Siswa</label>
      <input type="text" id="std_name" name="name" required placeholder="Masukkan nama lengkap Anda" value="${safe(studentData.name||'')}" autocomplete="name">
    </div>
    <div class="form-group">
      <label for="std_email">Alamat Email Siswa</label>
      <input type="email" id="std_email" name="email" required placeholder="contoh: siswa@sekolah.sch.id" value="${safe(studentData.email||'')}" autocomplete="email">
    </div>
    <div class="form-group">
      <label for="std_class">Kelas / Rombel</label>
      <input type="text" id="std_class" name="class" required placeholder="Contoh: XII MIPA 1 / IX-A" value="${safe(studentData.class||'')}">
    </div>
    <div class="form-group qr-section">
      <label>Kode Ujian (QR Code Pengawas)</label>
      <div id="qrStatusBox" class="qr-status-box ${scannedConfig?'qr-ready':''}">
        ${scannedConfig?
          '<div class="qr-badge">✅ Terdeteksi</div><div class="qr-info"><b>'+safe(scannedConfig.name)+'</b><small>'+scannedConfig.minutes+' Menit · '+(scannedConfig.group?safe(scannedConfig.group):'Semua Kelas')+'</small></div>':
          '<div class="qr-info"><small>Belum ada kode ujian. Tekan tombol di bawah untuk memindai QR pengawas.</small></div>'}
      </div>
      <button type="button" class="scan-button-primary" data-act="scan">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zm11 0h3v3h4v4h-7z"/><path d="M7 7h.01M17 7h.01M7 17h.01"/></svg>
        <span>${scannedConfig?"📷 Pindai Ulang QR Code":"📷 Pindai QR Code Pengawas"}</span>
      </button>
    </div>
    <p id="studentFormError" class="error" role="alert" style="margin:0"></p>
    <button type="submit" class="submit-exam-btn">
      <span>Masuk Ruang Ujian</span>
      <span class="arr">➔</span>
    </button>
  </form>
</div>
`;

const overview=()=>'<section class="hero"><article><div class="kicker">RUANG PESERTA'+(school?' · '+safe(school):'')+'</div><h2>Siap untuk ujian?</h2><p>Masuk ke ruang ujian sekolah atau coba simulasi terlebih dahulu.</p>'+button("demo","▷ &nbsp; Coba simulasi","light")+'</article><img class="art" src="art.svg" alt=""></section><div class="sectionhead"><h2>Akses cepat</h2></div><div class="grid">'+[["url","link","Masukkan URL","Gunakan tautan ujian",""],["scan","qr","Pindai QR","Pindai kode pengawas","blue"],["file","file","Buka file CBT","Impor konfigurasi","orange"]].map(([a,i,t,s,c])=>'<button class="tile" data-act="'+a+'">'+icon(i,c)+'<span><b>'+t+'</b><small>'+s+'</small></span><span class="arr">↗</span></button>').join("")+'</div><div class="cols"><div class="panel"><h2>Ujian tersedia</h2>'+examRow(sample,"demo")+configs.slice(0,2).map((c,i)=>examRow(c,"run-"+i)).join("")+'</div><div class="panel"><h2>Kesiapan perangkat</h2>'+statusRow("Penyimpanan lokal","Aktif")+statusRow("Layar penuh",document.fullscreenEnabled?"Tersedia":"Opsional")+statusRow("Pemantauan fokus","Saat ujian")+'</div></div>';
function statusRow(a,b){return '<div class="pair listrow"><span>'+a+'</span><span class="tag">'+b+'</span></div>'}
function examRow(c,a){return '<div class="listrow">'+icon("book","blue")+'<div><b>'+safe(c.name)+'</b><small>'+c.minutes+' menit · '+(c.group?safe(c.group)+' · ':'')+(c.date?safe(c.date)+' · ':'')+(c.demo?"5 soal latihan":"Tautan sekolah")+'</small></div><span class="arr">'+button(a,"Mulai →")+'</span></div>'}
function configPage(){return '<div class="panel"><div class="pair"><div><h2>Konfigurasi ujian</h2><p>Siapkan tautan dan durasi, lalu bagikan kepada peserta.</p></div>'+'<div class="row">'+button("school","Identitas sekolah")+button("new","+ Buat konfigurasi","primary")+'</div>'+'</div>'+(!configs.length?'<p class="item">Belum ada konfigurasi tersimpan di perangkat ini.</p>':configs.map((c,i)=>'<div class="item"><div><b>'+safe(c.name)+'</b><small>'+c.minutes+' menit</small></div><div class="arr row">'+button("run-"+i,"Mulai")+button("edit-"+i,"Ubah")+button("qr-"+i,"Kode QR")+button("out-"+i,"Ekspor .cbt")+button("del-"+i,"Hapus")+'</div></div>').join(""))+'</div>'}
function historyPage(){return '<div class="panel"><h2>Riwayat perangkat ini</h2>'+(history.length?history.map(r=>'<div class="listrow">'+icon("check")+'<div><b>'+safe(r.name)+'</b><small>'+safe(r.person)+' · '+new Date(r.end).toLocaleString("id-ID")+'</small><small>'+safe(r.result)+' · Keluar fokus '+r.events+' kali</small></div></div>').join(""):'<p>Sesi yang selesai akan muncul di sini.</p>')+'</div>'}
function native(action,data={}){window.NativeShell?.postMessage(JSON.stringify({action,...data}))}
function draw(){
  if(isStudent && page==="konfigurasi") page="beranda";
  native("session",{active:!!session});
  const prodTitle=$(".product");if(prodTitle)prodTitle.textContent=isStudent?"Kios Siswa":"Exam Browser";
  document.title=(session?"Sesi ujian":isStudent?"Ruang Ujian Siswa":names[page])+" · RuangUji";
  $("#pageName").textContent=session?"Sesi ujian":isStudent?"Ruang Siswa":names[page];
  $("#heading").textContent=session?"Ruang ujian":isStudent?"Aplikasi Ujian Siswa":page==="beranda"?"Beranda ujian":names[page];
  const crumb=$(".crumb");if(crumb)crumb.style.display=isStudent?"none":"";
  const headingEl=$(".heading");if(headingEl)headingEl.style.display=isStudent&&!session?"none":"";
  $("#nav").innerHTML=session||isStudent?"":Object.entries(names).map(([k,v])=>button("tab-"+k,v,k===page?"active":"")).join("");
  view.innerHTML=session?examView():isStudent?studentOverview():page==="beranda"?overview():page==="konfigurasi"?configPage():historyPage();
  if(session)tick();
}
function editor(i){const c=configs[i]||{name:"",url:"",minutes:60};form("Konfigurasi ujian",field("Nama ujian","name","text",'maxlength="100" value="'+safe(c.name)+'"')+field("URL ujian","url","url",'placeholder="https://…" value="'+safe(c.url)+'"')+field("Durasi (menit)","min","number",'min="1" max="480" value="'+c.minutes+'"')+'<label>Kelas (opsional)<input name="group" maxlength="60" value="'+safe(c.group||"")+'"></label><label>Tanggal agenda (opsional)<input type="date" name="date" value="'+safe(c.date||"")+'"></label><label>Token baru (opsional)<input type="password" name="token" minlength="6" autocomplete="new-password"></label>',"Simpan",async f=>{const config=validate({name:f.get("name"),url:f.get("url"),minutes:+f.get("min"),group:f.get("group"),date:f.get("date"),token:f.get("token")?await tokenHash(f.get("token")):(c.token||"")});if(i===undefined)configs.unshift(config);else configs[i]=config;save("configs",configs);close();draw()})}
function start(config,customData=null){
  const c=validate(config);
  if(customData){
    session={...c,id:crypto.randomUUID(),person:customData.name,email:customData.email,group:customData.class||c.group,deadline:Date.now()+c.minutes*60000,events:0,index:0,answers:{}};
    save("active",session);
    document.documentElement.requestFullscreen?.().catch(()=>{});
    draw();
    return;
  }
  form(c.name,'<p>'+c.minutes+' menit · '+(c.group?safe(c.group)+' · ':'')+(c.date?safe(c.date)+' · ':'')+(c.demo?"5 soal pilihan ganda":"Ujian pada situs sekolah")+'</p><p>Perpindahan dari halaman ini dicatat di perangkat.</p>'+field("Nama peserta","name","text",'maxlength="80" autocomplete="name"')+(c.token?field("Token dari pengawas","token","password"):""),"Mulai ujian",async f=>{
    if(c.token && await tokenHash(f.get("token"),c.token.split(":")[0])!==c.token)throw Error("Token ujian salah.");
    const person=f.get("name").trim();if(!person)throw Error("Isi nama peserta.");
    session={...c,id:crypto.randomUUID(),person,deadline:Date.now()+c.minutes*60000,events:0,index:0,answers:{}};
    save("active",session);close();document.documentElement.requestFullscreen?.().catch(()=>{});draw();
  });
}
function examView(){
  const s=session,q=questions[s.index];
  return '<div class="panel exam"><div class="pair"><div><b>'+safe(s.name)+'</b><small>'+safe(s.person)+' · '+safe(s.group||"")+'</small></div><span class="timer" id="timer"></span></div><hr>'+
  (s.demo?'<small>Soal '+(s.index+1)+' dari '+questions.length+'</small><h2>'+q[0]+'</h2>'+q[1].map((a,i)=>'<label class="choice"><input type="radio" name="answer" value="'+i+'" '+(s.answers[s.index]===i?"checked":"")+'>'+safe(a)+'</label>').join("")+'<div class="row">'+(s.index?button("prev","← Sebelumnya"):"")+(s.index<questions.length-1?button("next","Berikutnya →","primary"):"")+'</div>':'<iframe title="Ujian sekolah" sandbox="allow-scripts allow-forms allow-same-origin" src="'+safe(s.url)+'"></iframe>')+
  (window.NativeShell?button("pin","Sematkan layar Android"):"")+'<div class="sectionhead"><small class="focus" id="events">Keluar fokus '+s.events+' kali</small>'+button("finish","Akhiri sesi","secondary")+'</div></div>';
}
function finish(auto){
  const s=session;if(!s)return;
  const result=s.demo?"Skor latihan "+questions.filter((q,i)=>s.answers[i]===q[2]).length+"/"+questions.length:"Sesi ujian selesai";
  if(!history.some(r=>r.id===s.id))history.unshift({id:s.id,name:s.name,person:s.person,end:Date.now(),result:(auto?"Waktu habis · ":"")+result,events:s.events});
  save("history",history);session=null;save("active",null);close();
  if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  page=isStudent?"beranda":"riwayat";draw();
  popup(auto?"Waktu ujian habis":"Sesi selesai","<p>"+safe(result)+"</p>");
}
function tick(){if(!session)return;const n=Math.ceil((session.deadline-Date.now())/1000);if(n<=0)return finish(true);const clock=$("#timer");if(clock)clock.textContent=[Math.floor(n/60),n%60].map(v=>String(v).padStart(2,"0")).join(":")}
setInterval(tick,500);document.addEventListener("visibilitychange",()=>{if(!session)return;if(document.hidden){session.events++;save("active",session);$("#events").textContent="Keluar fokus "+session.events+" kali"}else tick()});
view.onchange=e=>{if(session&&e.target.name==="answer"){session.answers[session.index]=Number(e.target.value);save("active",session)}};
function qr(c){const u=new URL(location.href);u.hash="ujian="+encode(new TextEncoder().encode(JSON.stringify(c)));const value=u.origin==="https://appassets.androidplatform.net"?"ruanguji:"+u.hash.slice(7):u.href;popup("Kode QR ujian",'<p>'+safe(c.name)+' · '+c.minutes+' menit</p><canvas aria-label="Kode QR ujian"></canvas><p>Pindai dari menu Pindai QR.</p>'+button("print","Cetak / simpan PDF"));const code=new QRCode(-1,1);try{code.addData(value);code.make()}catch{body.querySelector(".error").textContent="Tautan terlalu panjang untuk QR. Gunakan ekspor file.";return}const n=code.getModuleCount(),canvas=body.querySelector("canvas");canvas.width=canvas.height=(n+8)*6;canvas.style.width="290px";const ctx=canvas.getContext("2d");ctx.fillStyle="white";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#10293e";for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(code.isDark(y,x))ctx.fillRect((x+4)*6,(y+4)*6,6,6)}
function parseQR(raw){let payload;if(raw.startsWith("ruanguji:"))payload=raw.slice(9);else{const u=new URL(raw);if(u.hash.startsWith("#ujian="))payload=u.hash.slice(7);else return validate({name:"Ujian dari QR",url:raw,minutes:60})}return validate(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload),c=>c.charCodeAt(0)))))}
window.ruangScanResult=raw=>{
  try{
    scannedConfig=parseQR(raw);
    close();
    if(isStudent){
      saveStudentInputs();
      draw();
      const err=$("#studentFormError");if(err)err.textContent="";
    } else {
      if(!session)start(scannedConfig);
    }
  }catch{
    popup("QR tidak dikenali","<p>Gunakan kode konfigurasi RuangUji atau URL HTTPS valid.</p>");
  }
};
async function scan(){
  saveStudentInputs();
  if(window.NativeShell){native("scan");return}
  popup("Pindai kode QR","<video autoplay playsinline muted></video><p>Arahkan kamera ke kode pengawas.</p>");
  const generation=scanGeneration;
  try{
    if(!window.BarcodeDetector||!navigator.mediaDevices)throw Error("Pemindai kamera tidak tersedia di browser ini. Masukkan URL manual pada kolom yang tersedia.");
    const detector=new BarcodeDetector({formats:["qr_code"]});
    const camera=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    if(generation!==scanGeneration){camera.getTracks().forEach(t=>t.stop());return}
    stream=camera;const video=body.querySelector("video");video.srcObject=camera;await video.play();
    async function poll(){if(generation!==scanGeneration)return;let found=[];try{found=await detector.detect(video)}catch{}if(generation!==scanGeneration)return;if(found.length)window.ruangScanResult(found[0].rawValue);else scanTimer=setTimeout(poll,250)}
    poll();
  }catch(e){if(generation===scanGeneration){stopScan();body.querySelector(".error").textContent=e.message}}
}
function encrypted(c){form("Ekspor file CBT",field("Kata sandi file (minimal 8 karakter)","pass","password",'minlength="8"'),"Unduh file",async f=>{const packed=await pack(c,f.get("pass"));const json=JSON.stringify(packed);if(window.NativeShell){native("save",{data:json})}else{const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="ujian.cbt";a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}close()})}
$("#file").onchange=async e=>{const file=e.target.files[0];e.target.value="";if(!file)return;try{if(file.size>65536)throw Error("File terlalu besar.");const blob=JSON.parse(await file.text());form("Buka konfigurasi CBT",field("Kata sandi dari pengawas","pass","password"),"Buka ujian",async f=>start(await unpack(blob,f.get("pass"))))}catch{popup("File tidak valid","<p>Pilih file .cbt hasil ekspor RuangUji.</p>")}};

function saveStudentInputs(){
  const n=$("#std_name")?.value, em=$("#std_email")?.value, cl=$("#std_class")?.value;
  if(n!==undefined) studentData.name=n.trim();
  if(em!==undefined) studentData.email=em.trim();
  if(cl!==undefined) studentData.class=cl.trim();
  save("student_profile",studentData);
}

document.addEventListener("submit",async e=>{
  if(e.target.id==="studentLoginForm"){
    e.preventDefault();
    const errBox=$("#studentFormError");
    const name=$("#std_name").value.trim();
    const email=$("#std_email").value.trim();
    const cls=$("#std_class").value.trim();
    
    if(!name){errBox.textContent="Nama lengkap wajib diisi.";return}
    if(!email){errBox.textContent="Alamat email wajib diisi.";return}
    if(!cls){errBox.textContent="Kelas wajib diisi.";return}
    
    if(!scannedConfig){
      errBox.textContent="Silakan pindai Kode QR dari pengawas terlebih dahulu.";
      return;
    }
    const config=scannedConfig;
    if(config.token){
      form("Token Ujian",field("Masukkan token dari pengawas","token","password"),"Lanjut",async f=>{
        const tokenInput=f.get("token")?.trim();
        const hashed=await tokenHash(tokenInput,config.token.split(":")[0]);
        if(hashed!==config.token)throw Error("Token ujian salah. Minta token ke pengawas.");
        close();
        saveStudentInputs();
        start(config,{name,email,class:cls});
      });
      return;
    }
    errBox.textContent="";
    saveStudentInputs();
    start(config,{name,email,class:cls});
  }
});

function act(action){
  const [a,idx]=action.split("-"),i=Number(idx);
  switch(a){
    case "pin":native("pin");break;
    case "tab":if(!isStudent){page=idx;draw();}break;
    case "school":if(!isStudent){form("Identitas sekolah",field("Nama sekolah","name","text",'maxlength="80" value="'+safe(school)+'"'),"Simpan",f=>{school=f.get("name").trim();save("school",school);close();draw()});}break;
    case "new":if(!isStudent)editor();break;
    case "edit":if(!isStudent)editor(i);break;
    case "del":if(!isStudent)popup("Hapus konfigurasi?",'<p>'+safe(configs[i].name)+'</p>'+button("remove-"+i,"Hapus"));break;
    case "remove":if(!isStudent){configs.splice(i,1);save("configs",configs);close();draw();}break;
    case "demo":if(!isStudent)start(sample);break;
    case "run":if(!isStudent)start(configs[i]);break;
    case "url":if(!isStudent)form("Masukkan URL ujian",field("Tautan sekolah","url","url",'placeholder="https://…"')+field("Durasi (menit)","min","number",'value="60" min="1" max="480"'),"Lanjut",f=>start({name:"Ujian sekolah",minutes:+f.get("min"),url:f.get("url")}));break;
    case "file":if(!isStudent)$("#file").click();break;
    case "scan":scan();break;
    case "out":if(!isStudent)encrypted(configs[i]);break;
    case "qr":if(!isStudent)qr(configs[i]);break;
    case "print":if(!isStudent){if(window.NativeShell)native("print");else window.print();}break;
    case "prev":case "next":session.index+=a==="next"?1:-1;save("active",session);draw();break;
    case "finish":
      popup("Akhiri sesi sekarang?",
        '<p>'+(session.demo?Object.keys(session.answers).length+" dari 5 soal telah dijawab.":"Pastikan jawaban sudah dikirim ke situs ujian sebelum mengakhiri sesi.")+'</p>'+
        (isStudent?'<label>PIN Pengawas untuk keluar:<input id="proctorPin" type="password" placeholder="PIN Pengawas (default: 123456)"></label>':'')+
        button("done","Ya, akhiri sesi","primary")
      );
      break;
    case "done":
      if(isStudent && session && !session.demo){
        const pin=$("#proctorPin")?.value?.trim();
        if(pin!=="123456" && pin!==(session.pin||"123456")){
          body.querySelector(".error").textContent="PIN Pengawas salah! Minta pengawas untuk membuka kunci.";
          return;
        }
      }
      finish(false);
      break;
  }
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(b)act(b.dataset.act)});
function route(){
  if(!session&&location.hash.startsWith("#ujian=")){
    try{
      const c=parseQR(location.href);
      window.history.replaceState(null,"",location.pathname+location.search);
      if(isStudent){
        scannedConfig=c;
        draw();
      }else{
        start(c);
      }
    }catch{
      popup("Tautan tidak valid","<p>Minta kode baru kepada pengawas.</p>");
    }
  }else if(!session&&names[location.hash.slice(1)]){
    if(!isStudent){page=location.hash.slice(1);draw();}
  }
}
$("#help").onclick=()=>popup(isStudent?"Panduan Peserta Ujian":"Panduan RuangUji",isStudent?"<p>1. Lengkapi formulir Nama, Email, dan Kelas.</p><p>2. Tekan tombol 'Pindai QR Code Pengawas' dan arahkan kamera ke kode QR guru.</p><p>3. Klik 'Masuk Ruang Ujian'.</p><p>4. Selama ujian, jangan keluar aplikasi karena layar terkunci.</p>":"<p>Pengawas menyiapkan tautan dan durasi melalui Konfigurasi. Bagikan QR kepada siswa.</p>");
draw();route();window.onhashchange=route;
