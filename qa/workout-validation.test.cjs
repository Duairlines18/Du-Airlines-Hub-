const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.createContext(ctx);const path='qa/workout-validation.js';if(fs.existsSync(path))vm.runInContext(fs.readFileSync(path,'utf8'),ctx);
const check=(blocks,library)=>{assert.equal(typeof ctx.workoutDeliveryIssues,'function');return ctx.workoutDeliveryIssues(blocks,library)};
const library=[{code:'STR01',name:'Calf Raise',active:true,video_url:'https://www.youtube.com/watch?v=example'}];
test('publication check rejects missing demo and incomplete dose',()=>{
 const blocks=[{title:'Strength',content:{prescriptions:[{exerciseCode:'STR01',dosage:''}]}}];
 const errors=check(blocks,library.map(e=>({...e,video_url:''})));
 assert.ok(errors.some(e=>/dosage/i.test(e)));assert.ok(errors.some(e=>/demo/i.test(e)));
});
test('publication check rejects broken text mappings',()=>{
 const errors=check([{content:{items:['Calf Raise — 3 × 10'],video_links:[{item_index:2,exercise:'Calf Raise'}]}}],library);
 assert.ok(errors.some(e=>/row/i.test(e)));
});
test('publication check accepts ordinary run instructions without inventing exercise videos',()=>{
 assert.equal(check([{content:{items:['30-minute easy run only.']}}],library).length,0);
});
test('explicit instruction-only prescriptions are valid and empty instructions fail',()=>{
 assert.equal(check([{content:{prescriptions:[{instruction:'3 x 80m; rest 3 min'}]}}],library).length,0);
 assert.ok(check([{content:{prescriptions:[{instruction:''}]}}],library).length>0);
});
test('a more specific movement is not mistaken for its shorter parent name',()=>{
 const ex=[{code:'A',name:'Dead Bug',active:true,video_url:'https://www.youtube.com/watch?v=example'},{code:'B',name:'Dead Bug Heel Tap',active:true,video_url:'https://www.youtube.com/watch?v=example2'}];
 assert.equal(check([{content:{items:['Dead Bug Heel Tap — 2 × 6'],video_links:[{item_index:0,exercise:'Dead Bug Heel Tap'}]}}],ex).length,0);
});

test('rejects a stored URL that differs from the canonical exercise',()=>{
 const errors=check([{content:{items:['Calf Raise — 3 x 10'],video_links:[{item_index:0,exercise:'Calf Raise',video_url:'https://youtu.be/wrong'}]}}],library);
 assert.ok(errors.some(e=>/stale or incorrect demo URL/.test(e)));
});
test('rejects a demo for the wrong structured exercise code',()=>{
 const second={code:'STR02',name:'Soleus Hold',active:true,video_url:'https://youtu.be/soleus'};
 const errors=check([{content:{items:['Calf Raise — 3 x 10'],videoLinksAlignWithPrescriptions:true,prescriptions:[{exerciseCode:'STR02',dosage:'3 x 10'}],video_links:[{item_index:0,exercise:'Calf Raise',video_url:library[0].video_url}]}}],[...library,second]);
 assert.ok(errors.some(e=>/does not match prescribed exercise code/.test(e)));
});
test('accepts an exact canonical reviewed video URL',()=>{
 const errors=check([{content:{items:['Calf Raise — 3 x 10'],video_links:[{item_index:0,exercise:'Calf Raise',video_url:library[0].video_url}]}}],library);
 assert.equal(errors.length,0);
});
test('rejects duplicate active exercise names as ambiguous',()=>{
 const errors=check([{content:{items:['Calf Raise — 3 x 10'],video_links:[{item_index:0,exercise:'Calf Raise'}]}}],[...library,{...library[0],code:'STR99'}]);
 assert.ok(errors.some(e=>/ambiguous/.test(e)));
});

test('mixed-format legacy rows do not assume positional prescription alignment',()=>{
 const second={code:'STR02',name:'Soleus Hold',active:true,video_url:'https://youtu.be/soleus'};
 const errors=check([{content:{items:['Calf Raise — 3 x 10'],prescriptions:[{exerciseCode:'STR02',dosage:'3 x 10'}],video_links:[{item_index:0,exercise:'Calf Raise',video_url:library[0].video_url}]}}],[...library,second]);
 assert.ok(!errors.some(e=>/does not match prescribed exercise code/.test(e)));
});
