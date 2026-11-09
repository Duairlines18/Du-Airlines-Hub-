const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const script=html.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];
test('single-page coaching workspace compiles',()=>{assert.ok(script);new Function(script);});
test('one primary write-next-week action appears for all programme contexts',()=>{
 assert.ok(html.includes('function renderProgrammeEditor(m){'));
 assert.ok(html.includes('data-write-next-week'));
 assert.ok(html.includes('function writeNextWeek(){'));
 assert.ok(html.includes("p_count:1"));
 assert.ok(html.includes("p_after_week:next-1"));
 assert.ok(html.includes("if(existing){"));
 assert.ok(html.includes("selectProgrammeWeek(existing.id)"));
 assert.ok(html.includes("admin_prepare_future_week_drafts"));
 assert.ok(html.includes("state.selectedWeekId=created.id"));
});
test('one-page summary displays explicit upcoming publish/draft state',()=>{
 assert.ok(html.includes('function weeklyDeliveryOverview('));
 assert.ok(html.includes('Published weeks (current onward)'));
 assert.ok(html.includes('Saved drafts (current onward)'));
 assert.ok(html.includes('weekly-delivery-row'));
 assert.ok(html.includes('data-focus-programme-week='));
 assert.ok(html.includes('Copy Training Foundation'));
 assert.ok(html.includes('Plan 1 / 2 / 4 Weeks'));
 assert.ok(html.includes('Publish a week only after checking its sessions and videos'));
});
test('all editing and controlled publishing remains in the workspace',()=>{
 for(const marker of ['data-quick-write=','data-edit-day=','data-add-block=','data-add-exercise=','data-publish-week=','data-commit-publish-week=','data-cross-copy-week=','data-prepare-drafts='])
  assert.ok(html.includes(marker),marker);
 assert.ok(html.includes("sb.rpc('admin_publish_programme_week'"));
 assert.ok(html.includes("if(isPublishedWeek(week)){alert('This week is already published"));
 assert.ok(html.includes('This is an older week. Publishing it could move the current programme backward'));
});
test('advanced CRM content is expandable and same screen, not deleted',()=>{
 assert.ok(html.includes('<details class="weekly-advanced">'));
 assert.ok(html.includes("crmBriefMarkup('athlete',account?.id)"));
 assert.ok(html.includes("crmBriefMarkup('school',cohort?.id)"));
 assert.ok(html.includes('data-workspace-tab="feedback"'));
 assert.ok(html.includes('data-workspace-tab="athletes"'));
});

test('paste from ChatGPT uses an explicit day choice and safe exercise matching',()=>{
 for(const fragment of ['function openPasteWorkoutForWeek(weekId)','data-paste-week-workout=','data-paste-day=','Paste from ChatGPT or type your workout','Review Exercises & Videos','qwAllowReplace','holder.dataset.rawText=raw','Workout text changed. Review exercises and videos again'])
  assert.ok(html.includes(fragment),fragment);
 assert.ok(html.includes("if(existing&&!document.getElementById('qwAllowReplace')?.checked)"));
 assert.ok(html.includes("if(liveWeekForTrainingDay(qwDay))"));
 assert.ok(html.includes("sb.rpc('admin_replace_training_day_blocks'"));
 assert.ok(html.includes("if(unresolved.length){alert('Match every exercise before saving.')"));
});
test('copied Markdown formatting is normalized before exercise matching',()=>{
 for(const fragment of ["replace(/^#{1,6}\\s+/,'')","replace(/^[-*•]\\s+/,'')","replace(/^\\d+[.)]\\s+/,'')","replace(/\\*\\*/g,'')"])
  assert.ok(html.includes(fragment),fragment);
});
