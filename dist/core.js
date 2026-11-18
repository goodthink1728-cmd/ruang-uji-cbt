export const sample = {name:"Simulasi literasi numerasi",minutes:10,url:"",demo:true};
export const questions = [
 ["Sebuah kelas berisi 32 siswa. Jika 75% hadir, berapa siswa yang hadir?",["8 siswa","16 siswa","24 siswa","28 siswa"],2],
 ["Harga buku Rp40.000 mendapat diskon 15%. Berapa harga akhirnya?",["Rp34.000","Rp35.000","Rp36.000","Rp38.000"],0],
 ["Empat nilai ulangan adalah 70, 80, 80, dan 90. Berapa rata-ratanya?",["75","78","80","85"],2],
 ["Pada peta berskala 1 : 50.000, jarak dua sekolah 4 cm. Berapa jarak sebenarnya?",["200 m","2 km","20 km","200 km"],1],
 ["Perpustakaan meminjamkan 120 buku pada Senin dan 150 pada Selasa. Berapa persen kenaikannya?",["20%","25%","30%","35%"],1]
];
export function validate(config){
 if(!config || typeof config.name!=="string" || !config.name.trim() || config.name.length>100) throw Error("Judul ujian harus berisi 1–100 karakter.");
 if(!Number.isInteger(config.minutes)||config.minutes<1||config.minutes>480) throw Error("Durasi harus 1–480 menit.");
 if(config.demo===true) return {...sample,minutes:config.minutes,name:config.name.trim()};
 let url;try{url=new URL(config.url)}catch{throw Error("Masukkan URL HTTPS yang lengkap.")}
 if(url.protocol!=="https:"||url.username||url.password||url.href.length>2048) throw Error("Gunakan URL HTTPS tanpa kredensial, maksimal 2.048 karakter.");
 const group=String(config.group||"").slice(0,60), date=String(config.date||"");
 if(date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error("Tanggal agenda tidak valid.");
 const token=config.token||"";
 if(token && !/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(token)) throw Error("Data token rusak.");
 return {name:config.name.trim(),minutes:config.minutes,url:url.href,demo:false,group,date,token};
}
const bytes=text=>new TextEncoder().encode(text);
export const encode=data=>btoa(String.fromCharCode(...new Uint8Array(data)));
const decode=text=>Uint8Array.from(atob(text),v=>v.charCodeAt(0));
async function key(password,salt){
 const material=await crypto.subtle.importKey("raw",bytes(password),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:310000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
export async function pack(config,password){
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(password,salt),bytes(JSON.stringify(validate(config))));
 return {format:"ruanguji-1",salt:encode(salt),iv:encode(iv),data:encode(data)};
}
export async function unpack(blob,password){
 if(blob.format!=="ruanguji-1")throw Error("Format konfigurasi tidak dikenali.");
 try{const iv=decode(blob.iv),salt=decode(blob.salt);const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv},await key(password,salt),decode(blob.data));return validate(JSON.parse(new TextDecoder().decode(clear)))}catch{throw Error("Kata sandi salah atau file rusak.")}
}

const hex=buffer=>Array.from(new Uint8Array(buffer),v=>v.toString(16).padStart(2,"0")).join("");
export async function tokenHash(value,salt=hex(crypto.getRandomValues(new Uint8Array(16)))){
 const input=await crypto.subtle.importKey("raw",bytes(value),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",iterations:310000,salt:bytes(salt)},input,256);
 return salt+":"+hex(bits);
}
