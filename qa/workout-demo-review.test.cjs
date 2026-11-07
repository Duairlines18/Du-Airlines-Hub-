const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const exists=fs.existsSync('workout-demo-review.js');
const api=exists?require('../workout-demo-review.js'):{};
const library=[{code:'BR',name:'Bridge',active:true,video_url:'https://youtu.be/bridgevid01'},{code:'SQ',name:'Squat',active:true,video_url:'https://youtu.be/squatvideo1'}];
const original={items:['Bridge — 2 x 8'],video_links:[{item_index:0,exercise:'Bridge',exerciseCode:'BR',video_url:library[0].video_url}]};
const review=(item,codes)=>({0:{item,codes,confirmed:true,touched:true}});
test('demo review module is available',()=>assert.equal(typeof api.prepare,'function'));
if(exists){
 test('changed row without renewed review blocks saving',()=>assert.throws(()=>api.prepare(original,{...original,items:['Squat — 2 x 8']},{},library),/review.*line 1/i));
 test('same-code dose edit carries exact fresh instruction binding',()=>{const text='Bridge — 3 x 8',result=api.prepare(original,{...original,items:[text]},review(text,['BR']),library);assert.equal(result.video_links[0].exerciseCode,'BR');assert.equal(result.video_links[0].reviewed_item,text);});
 test('compound row retains every deliberately selected demo',()=>{const text='Bridge; Squat',result=api.prepare(original,{items:[text]},review(text,['BR','SQ']),library);assert.deepEqual(result.video_links.map(x=>x.exerciseCode),['BR','SQ']);});
 test('running row can explicitly confirm no demonstration',()=>{const text='Run 3 x 80m',result=api.prepare(original,{items:[text]},review(text,[]),library);assert.deepEqual(result.video_links,[{item_index:0,no_demo:true,reviewed_item:text}]);});
 test('stale confirmation cannot approve subsequently changed text',()=>assert.throws(()=>api.prepare(original,{items:['Squat']},review('Bridge',['BR']),library),/review.*line 1/i));
 test('unknown and inactive explicit choices never fall back to names',()=>{for(const code of ['MISSING','OFF'])assert.throws(()=>api.prepare(original,{items:['Bridge']},review('Bridge',[code]),[...library,{...library[0],code:'OFF',active:false}]),/available demo/i);});
 test('duplicate names do not affect exact code selection',()=>{const result=api.prepare(original,{items:['Bridge']},review('Bridge',['BR']),[{...library[0],code:'DUP'},...library]);assert.equal(result.video_links[0].exerciseCode,'BR');});
 test('unchanged reviewed code survives library rename and refreshes URL',()=>{const result=api.prepare(original,original,{},[{...library[0],name:'Glute Bridge',video_url:'https://youtu.be/newbridge01'}]);assert.equal(result.video_links[0].exercise,'Glute Bridge');assert.equal(result.video_links[0].video_url,'https://youtu.be/newbridge01');});
 test('same-name legacy ambiguity cannot silently pick first',()=>assert.throws(()=>api.prepare({...original,video_links:[{item_index:0,exercise:'Bridge'}]},original,{},[...library,{...library[0],code:'DUP'}]),/available demo/i));
 test('preparation preserves all non-demo fields and never mutates inputs',()=>{const next={...original,items:['Bridge — 3 x 8'],notes:{coach:'Literal'},prescriptions:[{exerciseCode:'BR',dosage:'3 × 8',rest:'65 sec'}]},reviews=review(next.items[0],['BR']),before=JSON.stringify({original,next,reviews,library});const out=api.prepare(original,next,reviews,library);assert.equal(JSON.stringify({original,next,reviews,library}),before);delete out.video_links;const expected={...next};delete expected.video_links;assert.deepEqual(out,expected);});
 test('unsafe or nonvideo canonical URLs are unavailable',()=>assert.throws(()=>api.prepare(original,{items:['Bridge']},review('Bridge',['BR']),[{...library[0],video_url:'javascript:alert(1)'}]),/available demo/i));
 test('reordering rows invalidates positional confirmations',()=>{const before={items:['Bridge','Squat'],video_links:[{item_index:0,exerciseCode:'BR'},{item_index:1,exerciseCode:'SQ'}]};assert.throws(()=>api.prepare(before,{items:['Squat','Bridge']},{},library),/review/i);});
 const mount=()=>{const dom=new JSDOM('<textarea id="items"></textarea><section id="review"></section>');const doc=dom.window.document;doc.querySelector('textarea').value=original.items[0];return {dom,doc,controller:api.mount({root:doc.querySelector('section'),itemsInput:doc.querySelector('textarea'),original,library})};};
 test('DOM review makes edited rows explicit and saves selected current demo',()=>{const {dom,doc,controller}=mount(),input=doc.querySelector('textarea');input.value='Squat — 2 x 8';input.dispatchEvent(new dom.window.Event('input'));assert.throws(()=>controller.getContent({items:[input.value]}),/review/i);const select=doc.querySelector('select');for(const option of select.options)option.selected=option.value==='SQ';select.dispatchEvent(new dom.window.Event('change'));const checkbox=doc.querySelector('input[type=checkbox]');checkbox.checked=true;checkbox.dispatchEvent(new dom.window.Event('change'));const result=controller.getContent({items:[input.value]});assert.equal(result.video_links[0].exerciseCode,'SQ');assert.equal(result.video_links[0].reviewed_item,input.value);});
 test('DOM selection changes reset previous confirmation',()=>{const {dom,doc}=mount(),checkbox=doc.querySelector('input[type=checkbox]');checkbox.checked=true;checkbox.dispatchEvent(new dom.window.Event('change'));doc.querySelector('select').dispatchEvent(new dom.window.Event('change'));assert.equal(doc.querySelector('input[type=checkbox]').checked,false);});
 test('DOM escapes instruction text and only creates safe video links',()=>{const {dom,doc}=mount();const input=doc.querySelector('textarea');input.value='<img src=x onerror=alert(1)>';input.dispatchEvent(new dom.window.Event('input'));assert.equal(doc.querySelector('img'),null);assert.match(doc.querySelector('section').textContent,/<img/);});
 test('destroy removes textarea listener',()=>{const {dom,doc,controller}=mount();controller.destroy();const before=doc.querySelector('section').textContent;doc.querySelector('textarea').value='Changed';doc.querySelector('textarea').dispatchEvent(new dom.window.Event('input'));assert.equal(doc.querySelector('section').textContent,before);});
}
if(exists){
 test('real draft editor save blocks an unreviewed edit and sends reviewed mapping after confirmation',async()=>{
  const dom=new JSDOM('<textarea id="blockItems"></textarea><section id="reviews"></section>'+['editBlockId','blockFocus','blockRequirement','blockWhy','blockWatch','blockTitle','blockAthleteNote'].map(id=>'<input id="'+id+'">').join('')+'<dialog id="modal"></dialog>',{runScripts:'outside-only'}),w=dom.window,d=w.document;
  const block={id:'B',training_day_id:'D',title:'Strength',content:JSON.parse(JSON.stringify(original))},writes=[],alerts=[];
  Object.assign(w,{state:{sessionBlocks:[block],trainingDays:[],exercises:library},byId:(list,id)=>list.find(x=>x.id===id),liveWeekForTrainingDay:()=>null,alert:msg=>alerts.push(msg),confirm:()=>true,load:async()=>{},sb:{from:()=>({update:value=>({eq:async()=>{writes.push(value);return {error:null};}})})}});
  d.querySelector('#editBlockId').value='B';d.querySelector('#blockTitle').value='Strength';d.querySelector('#blockItems').value='Squat — 2 x 8';d.querySelector('dialog').close=()=>{};
  w.blockDemoReview=api.mount({root:d.querySelector('section'),itemsInput:d.querySelector('textarea'),original:block.content,library});
  w.eval(fs.readFileSync('qa/workout-validation.js','utf8'));
  const source=fs.readFileSync('index.html','utf8');w.eval(source.slice(source.indexOf('async function saveWorkoutBlock(){'),source.indexOf('\nfunction substitutionForm(',source.indexOf('async function saveWorkoutBlock(){'))));
  await w.saveWorkoutBlock();assert.equal(writes.length,0);assert.match(alerts[0],/review/i);
  const select=d.querySelector('select');for(const option of select.options)option.selected=option.value==='SQ';select.dispatchEvent(new w.Event('change'));
  const checkbox=d.querySelector('input[type=checkbox]');checkbox.checked=true;checkbox.dispatchEvent(new w.Event('change'));
  await w.saveWorkoutBlock();assert.equal(writes.length,1);assert.equal(writes[0].content.video_links[0].exerciseCode,'SQ');assert.equal(writes[0].content.video_links[0].reviewed_item,'Squat — 2 x 8');
 });
}
if(exists){
 test('untouched stale instruction binding cannot be silently refreshed',()=>assert.throws(()=>api.prepare({...original,video_links:[{...original.video_links[0],reviewed_item:'Bridge — 1 x 8'}]},original,{},library),/review.*line 1/i));
 test('explicit no-demo review persists a bound suppression marker',()=>{const item='Rest after Bridge';const result=api.prepare(original,{items:[item]},review(item,[]),library);assert.deepEqual(result.video_links,[{item_index:0,no_demo:true,reviewed_item:item}]);});
}
if(exists)test('no-demo button clears selection and still requires confirmation',()=>{const dom=new JSDOM('<textarea>Bridge — 2 x 8</textarea><section></section>'),doc=dom.window.document;const controller=api.mount({root:doc.querySelector('section'),itemsInput:doc.querySelector('textarea'),original,library});const button=[...doc.querySelectorAll('button')].find(b=>b.textContent==='No demo needed');assert.ok(button);button.click();assert.equal(doc.querySelector('select').selectedOptions.length,0);assert.throws(()=>controller.getContent(original),/review/i);});
