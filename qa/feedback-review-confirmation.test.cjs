const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');

test('review requires an exact-row update, pending state and nonempty database readback',()=>{
  const start=source.indexOf("const rv=e.target.closest('[data-review]')");
  const end=source.indexOf("if(e.target.id==='logout')",start);
  assert.ok(start>=0&&end>start);
  const handler=source.slice(start,end);
  for(const snippet of [".eq('id',id).is('reviewed_at',null).select('id,reviewed_at').maybeSingle()","if(!data?.reviewed_at||data.id!==id)","rv.disabled=true","rv.disabled=false","await load()"])
    assert.ok(handler.includes(snippet),snippet);
});
test('internal note saving remains distinct from marking reviewed',()=>{
  const start=source.indexOf("const noteSave=e.target.closest('[data-save-feedback-note]')");
  const end=source.indexOf("const rv=e.target.closest('[data-review]')",start);
  assert.ok(start>=0&&end>start);
  const handler=source.slice(start,end);
  assert.ok(handler.includes("update({admin_reply:note||null})"));
  assert.ok(!handler.includes("reviewed_at"));
});
