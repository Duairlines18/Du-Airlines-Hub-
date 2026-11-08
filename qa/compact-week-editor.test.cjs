const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const code=html.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];
test('UI JavaScript compiles and preserves existing programme editor',()=>{
 assert.ok(code);new Function(code);assert.ok(html.includes('function renderProgrammeEditor(m){'));
});
test('selected week renders days closed with summaries and independent expandable blocks',()=>{
 assert.ok(html.includes('<details class="v3-day v3-day-collapse" data-programme-day='));
 assert.ok(html.includes('<summary class="v3-day-summary">'));
 assert.ok(html.includes('<details class="v3-block v3-block-collapse">'));
 assert.ok(html.includes('<summary class="v3-block-summary">'));
 assert.ok(html.includes('pres.length+items.length'));
 assert.ok(html.includes('blocksForDay(day.id).length'));
 assert.ok(html.includes('data-day-visibility="expand"'));
 assert.ok(html.includes('data-day-visibility="collapse"'));
});
test('prescription / day / block actions and videos remain accessible',()=>{
 for(const action of ['data-quick-write=','data-preview-day=','data-edit-day=','data-add-block=','data-add-exercise=','data-edit-block=','data-remove-prescription=']){
  assert.ok(html.includes(action),action);
 }
 assert.ok(html.includes('prettyPrescription(p)'));
 assert.ok(html.includes('Video attached ✓'));
});
test('copy remains within source programme, with no new cross-athlete copy claim or overwrite',()=>{
 assert.ok(html.includes('title="Duplicate within this programme only"'));
 assert.ok(!html.includes('>Duplicate to another week</button>'));
 assert.ok(html.includes("sb.rpc('admin_copy_programme_week'"));
 assert.ok(html.includes('The copied week will stay Draft / hidden'));
 assert.ok(html.includes('data-publish-week='));
});
test('action toolbar is before expanding week content, not hidden at bottom',()=>{
 const start=html.indexOf('const programmeHtml=week?');
 const end=html.indexOf("const tab=state.workspaceTab",start);
 const section=html.slice(start,end);
 assert.ok(!section.includes('data-copy-week='));
 assert.ok(section.indexOf('data-publish-week=')<section.indexOf('${wholeWeek'));
});
