import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as core from '../dist/core.js';

// Run the application callbacks with an in-memory view and clock.
test('Simulasi: mulai, jawab, lanjutkan setelah muat ulang, selesai dan habis waktu',()=>{
 const data=new Map(),nodes=new Map();
 function node(key){if(!nodes.has(key))nodes.set(key,{style:{},showModal(){this.open=true},close(){this.open=false},querySelector:node});return nodes.get(key)}
 const globals={...core,crypto,Date,URL,Intl,navigator:{onLine:true},location:{hash:""},window:{},document:{querySelector:node,documentElement:{},addEventListener(){}},setInterval(){},clearTimeout(){},localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}};
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
 function boot(){const ctx=vm.createContext({...globals});vm.runInContext(source,ctx);return expression=>vm.runInContext(expression,ctx)}
 let run=boot();
 run('start(sample)');
 const form=node('form');
 const values=new FormData();values.set('name','Peserta uji');
 // Drive the actual submit handler with a FormData stand-in.
 return (async()=>{
 run('globalThis.FormData=class {constructor(form){return form}}');
 await form.onsubmit({preventDefault(){},target:values,submitter:{}});
 assert.equal(run('session.person'),'Peserta uji');
 for(let i=0;i<5;i++){
   node('#view').onchange({target:{name:'answer',value:core.questions[i][2]}});
   if(i<4)run('act("next")');
 }
 run=boot();assert.equal(run('session.index'),4);
 run('act("done")');
 assert.equal(run('history[0].result'),'Skor latihan 5/5');
 assert.equal(run('session'),null);
 const expired={...core.sample,id:'expired',index:0,events:0,person:'P',answers:{},deadline:Date.now()-1000};
 data.set('ru.active',JSON.stringify(expired));run=boot();
 assert.match(run('history[0].result'),/Waktu habis/);
 })();
});
