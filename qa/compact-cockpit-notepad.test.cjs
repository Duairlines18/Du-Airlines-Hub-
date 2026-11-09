const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const js=s.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];
test('compact cockpit preserves source integrity and no extra route',()=>{
 assert.ok(js);new Function(js);
 for(const v of ['Your Coaching Week','cockpit-work-area','cockpit-scroll-list','Showing ${shownPlans.length} of ${weekly.length}','Showing ${shownFeedback.length} of ${pending.length}'])
  assert.ok(s.includes(v),v);
 assert.ok(s.includes('needPlan.slice(0,4)'));
 assert.ok(s.includes('pending.slice(0,3)'));
 assert.ok(s.includes('state.overviewShowAll?weekly:needPlan.slice(0,4)'));
 assert.ok(s.includes('state.overviewAllFeedback?pending:pending.slice(0,3)'));
});
test('priority rows retain direct athlete school and feedback actions',()=>{
 for(const token of ['data-open-athlete=','data-open-cohort=','data-review=','data-feedback-focus=','data-overview-toggle-plans','data-overview-toggle-feedback'])
  assert.ok(s.includes(token),token);
});
test('workout notepad reuses guarded parser, match preview and atomic save',()=>{
 for(const token of ['Workout Notepad','Write naturally, or paste from ChatGPT','Review Exercises & Videos','Save Draft Workout','qwParseText(raw)','holder.dataset.rawText=raw','qwAllowReplace',"sb.rpc('admin_replace_training_day_blocks'","if(liveWeekForTrainingDay(qwDay))"])
  assert.ok(s.includes(token),token);
 assert.ok(s.includes('Check the linked video for each exercise before publishing.'));
 assert.ok(s.includes("if(unresolved.length){alert('Match every exercise before saving.')"));
});
test('existing week planning and publishing preserved',()=>{
 for(const token of ['data-write-next-week','data-publish-week','data-paste-week-workout','data-cross-copy-week','admin_prepare_future_week_drafts',"sb.rpc('admin_publish_programme_week'"])
  assert.ok(s.includes(token),token);
});
