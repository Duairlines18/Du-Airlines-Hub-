const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
test('feedback review displays escaped internal coach note and states it is not delivered',()=>{
 assert.match(source,/Internal coaching note/);
 assert.match(source,/Not sent to the athlete or parent/);
 assert.match(source,/data-feedback-note maxlength="1500"/);
 assert.match(source,/\\${esc\\(f\\.admin_reply\\|\\|'')\\}/);
});
test('note save uses admin-scoped Supabase write with readback and no automatic reviewed status',()=>{
 const start=source.indexOf("const noteSave=e.target.closest('[data-save-feedback-note]')");
 const end=source.indexOf("const rv=e.target.closest('[data-review]')",start);
 assert.ok(start>=0&&end>start);
 const handler=source.slice(start,end);
 assert.match(handler,/update\\(\\{admin_reply:note\\|\\|null\\}\\)/);
 assert.match(handler,/\\.eq\\('id',id\\)\\.select\\('id,admin_reply'\\)\\.single\\(\\)/);
 assert.match(handler,/if\\(data\\?\\.id!==id\\)/);
 assert.doesNotMatch(handler,/reviewed_at/);
});
test('review operation remains separate and applies row-level RLS',()=>{
 assert.match(source,/sb\\.from\\('feedback'\\)\\.update\\(\\{reviewed_at:new Date\\(\\)\\.toISOString\\(\\)\\}\\)\\.eq\\('id',rv\\.dataset\\.review\\)/);
});
