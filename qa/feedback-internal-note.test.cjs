const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
test('feedback note is escaped and explicitly internal',()=>{
  for(const snippet of ['Internal coaching note','Not sent to the athlete or parent','data-feedback-note maxlength="1500"',"esc(f.admin_reply||'')"])assert.ok(source.includes(snippet),snippet);
});
test('internal note updates selected feedback only, confirms readback, and does not mark reviewed',()=>{
  const start=source.indexOf("const noteSave=e.target.closest('[data-save-feedback-note]')");
  const end=source.indexOf("const rv=e.target.closest('[data-review]')",start);
  assert.ok(start>=0&&end>start);
  const handler=source.slice(start,end);
  for(const snippet of ["update({admin_reply:note||null})",".eq('id',id).select('id,admin_reply').single()","if(data?.id!==id)"])assert.ok(handler.includes(snippet),snippet);
  assert.ok(!handler.includes('reviewed_at'));
});
test('human review remains a separate existing action',()=>{
 assert.ok(source.includes("update({reviewed_at:new Date().toISOString()})"));
 assert.ok(source.includes(".eq('id',id).is('reviewed_at',null).select('id,reviewed_at').maybeSingle()"));
});
