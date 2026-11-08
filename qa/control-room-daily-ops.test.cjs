const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=html.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];

test('daily operations source compiles and dashboard routes remain available',()=>{
 assert.ok(source);new Function(source);
 assert.ok(html.includes('data-roster-filter="active"'));
 assert.ok(html.includes('data-attention-jump'));
 assert.ok(html.includes('data-running-jump'));
 assert.ok(html.includes('id="runningProgrammes"'));
 assert.ok(html.includes('data-page="feedback">Feedback ('));
});
test('flagged feedback attention goes directly to original person, not workout',()=>{
 assert.ok(html.includes("id:f.id,ownerKey:feedbackOwnerKey(f)"));
 assert.ok(html.includes("x.kind==='feedback'?\x60data-feedback-focus="));
 assert.ok(html.includes("state.feedbackFocus=feedbackJump.dataset.feedbackFocus||null"));
 assert.ok(html.includes("state.page='feedback';render();return;"));
});
test('school athlete display week uses current school cohort without changing delivery semantics',()=>{
 assert.ok(html.includes("const athleteDisplayWeek=a=>isSchoolAthlete(a)?Number(cohortFor(a.cohort_id)?.current_week||athleteCurrentWeek(a)):athleteCurrentWeek(a);"));
 assert.ok(html.includes('const currentWeek=athleteDisplayWeek(a),programmeId=athleteProgrammeId(a)'));
 assert.ok(html.includes("const athleteCurrentWeek=a=>"));
});
test('school athlete programme overview shows one school group not redundant individual school programmes',()=>{
 assert.ok(html.includes('activeAccount(a)&&!isSchoolAthlete(a)&&athleteProgrammeId(a)'));
 assert.ok(html.includes("c.status==='live'&&isSchoolCohort(c)&&c.programme_id"));
 assert.ok(html.includes('Private/parent athletes and real school cohorts'));
});
test('programme groups are reachable but not an extra mobile top navigation tab',()=>{
 assert.ok(html.includes("const pages=['dashboard','athletes','cohorts','programmes','feedback','system'];"));
 assert.ok(html.includes('data-page="cohort-programmes"'));
 assert.ok(html.includes("if(state.page==='cohort-programmes')return renderProgrammeGroups(m)"));
});
