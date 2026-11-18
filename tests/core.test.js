import test from "node:test";
import assert from "node:assert/strict";
import {sample,validate,pack,unpack,questions} from "../dist/core.js";
test("Konfigurasi HTTPS dan rentang waktu",()=>{
 assert.equal(validate({name:" X ",url:"https://example.org",minutes:1}).name,"X");
 for(const url of ["http://example.org","javascript:void(0)","https://user@sekolah.id"]) assert.throws(()=>validate({name:"X",url,minutes:5}));
 assert.throws(()=>validate({...sample,minutes:481}));
 for(const q of questions)assert.ok(q[1][q[2]]);
});
test("File CBT pulang-pergi dan penolakan kata sandi salah",async()=>{
 const file=await pack(sample,"rahasia-ujian");
 assert.deepEqual(await unpack(file,"rahasia-ujian"),sample);
 await assert.rejects(unpack(file,"salah"));
});
