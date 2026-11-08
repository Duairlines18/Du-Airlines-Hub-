const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=html.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];
test('daily operations source compiles and dashboard navigation remains available',()=>{
  assert.ok(source);new Function(source);
  assert.ok(html.includes('data-roster-filter="active"'));
  assert.ok(html.includes('data-attention-jump'));
  assert.ok(html.includes('data-running-jump'));
  assert.ok(html.includes('id="runningProgrammes"'));
  assert.ok(html.includes('id="needsAttention"'));
});
test('weekly command board groups private athletes and real schools without double listing school athletes',()=>{
  assert.ok(html.includes("activeAccount(a)&&!isSchoolAthlete(a)"));
  assert.ok(html.includes("c.status==='live'&&isSchoolCohort(c)"));
  assert.ok(html.includes('weeklyCommandRows()'));
  assert.ok(html.includes("state.overviewShowAll?weekly:weekly.filter(x=>x.next.key!=='published')"));
  assert.ok(html.includes('Next Week\'s Plans'));
  assert.ok(html.includes('Show all'));
});
test('publication status differentiates draft, published, missing and incomplete',()=>{
  assert.ok(html.includes('function weeklyPlanStatus(programmeId,number){'));
  assert.ok(html.includes("label:'Draft ready to publish'"));
  assert.ok(html.includes("label:'Published'"));
  assert.ok(html.includes("'Incomplete draft'"));
  assert.ok(html.includes("label:'Not built'"));
  assert.ok(html.includes('isPublishedWeek(ready.week)'));
  assert.ok(html.includes('ready.issues.length'));
});
test('feedback appears once per person with safe single-submission reviews',()=>{
  assert.ok(html.includes('function feedbackReviewGroups(){'));
  assert.ok(html.includes('const key=feedbackOwnerKey(f);'));
  assert.ok(html.includes('data-feedback-focus='));
  assert.ok(html.includes('data-review='));
  assert.ok(html.includes('Mark latest feedback'));
  assert.ok(html.includes('update({reviewed_at:new Date().toISOString()})'));
  assert.ok(html.includes(".is('reviewed_at',null).select('id,reviewed_at').maybeSingle()"));
});
test('school current-week display and advanced controls retained',()=>{
  assert.ok(html.includes("const athleteDisplayWeek=a=>isSchoolAthlete(a)?Number(cohortFor(a.cohort_id)?.current_week||athleteCurrentWeek(a)):athleteCurrentWeek(a);"));
  assert.ok(html.includes('const currentWeek=athleteDisplayWeek(a),programmeId=athleteProgrammeId(a)'));
  assert.ok(html.includes('data-workspace-current'));
  assert.ok(html.includes('data-substitutions='));
  assert.ok(html.includes("const pages=['dashboard','athletes','cohorts','programmes','feedback','system'];"));
});
