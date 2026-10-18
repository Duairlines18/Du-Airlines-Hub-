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
test('a more specific movement is not mistaken for its shorter parent name',()=>{
 const ex=[{code:'A',name:'Dead Bug',active:true,video_url:'https://www.youtube.com/watch?v=example'},{code:'B',name:'Dead Bug Heel Tap',active:true,video_url:'https://www.youtube.com/watch?v=example2'}];
 assert.equal(check([{content:{items:['Dead Bug Heel Tap — 2 × 6'],video_links:[{item_index:0,exercise:'Dead Bug Heel Tap'}]}}],ex).length,0);
});
