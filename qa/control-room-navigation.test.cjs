const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const mainScript=html.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];
test('Control Room inline JavaScript parses',()=>{assert.ok(mainScript);new Function(mainScript)});
test('school classification relies on actual organization link, not names',()=>{
  const s=html.slice(html.indexOf('const isSchoolCohort='),html.indexOf('const feedbackNeedsReview='));
  const sandbox={cohortFor:id=>({organization_id:id==='school'?'org-1':null}),isParentManaged:a=>!!a?.parent_user_id,isPrivateAthlete:a=>!!a?.athlete_user_id};
  vm.runInNewContext(s+';globalThis.exported={isSchoolCohort,isSchoolAthlete,athleteKind}',sandbox);
  const {isSchoolCohort,isSchoolAthlete,athleteKind}=sandbox.exported;
  assert.equal(isSchoolCohort({name:'St George’s',organization_id:'org-1'}),true);
  assert.equal(isSchoolCohort({name:'Takunda Mutizwa — Individual Private Athlete',organization_id:null}),false);
  assert.equal(isSchoolAthlete({cohort_id:'school',programme_id:null}),true);
  assert.equal(isSchoolAthlete({cohort_id:'school',programme_id:'direct-1'}),false);
  assert.equal(athleteKind({cohort_id:'private',athlete_user_id:'user-1'}),'Private Athlete');
  assert.equal(athleteKind({cohort_id:'school'}),'School Athlete');
  assert.equal(athleteKind({cohort_id:'private',parent_user_id:'parent-1'}),'Parent-managed');
});
test('overview active athlete metric navigates to active filtered roster',()=>{
  assert.ok(html.includes('data-roster-filter="active"'));
  assert.ok(html.includes("state.athleteView=rosterNav.dataset.rosterFilter||'all'"));
  assert.ok(html.includes("state.page='athletes'"));
  assert.ok(html.includes('data-athlete-filter='));
});
test('school page only shows organization-linked cohorts, programme groups are separate',()=>{
  assert.ok(html.includes("const rows=state.cohorts.filter(c=>isSchoolCohort(c)&&c.status!=='archived')"));
  assert.ok(html.includes("const rows=state.cohorts.filter(c=>!isSchoolCohort(c)&&c.status!=='archived')"));
  assert.ok(html.includes("if(state.page==='cohort-programmes')return renderProgrammeGroups(m)"));
  assert.ok(html.includes("isSchool?'Open School':'Open Programme'"));
});
test('athlete row links to their own feedback and grouped feedback scopes by actual ID',()=>{
  assert.ok(html.includes('data-feedback-athlete='));
  assert.ok(html.includes("state.feedbackFocus='athlete:'+athleteFeedback.dataset.feedbackAthlete"));
  assert.ok(html.includes('f.athlete_id?\'athlete:\'+f.athlete_id'));
  assert.ok(html.includes('rows.filter(f=>feedbackOwnerKey(f)===state.feedbackFocus)'));
  assert.ok(html.includes('g.items.map(feedbackRow)'));
});
test('feedback review controls and internal notes survive grouping',()=>{
  assert.ok(html.includes('data-review='));
  assert.ok(html.includes('data-save-feedback-note='));
  assert.ok(html.includes("Private Coach Command note. Not sent to the athlete or parent."));
  assert.ok(html.includes("update({reviewed_at:new Date().toISOString()})"));
  assert.ok(html.includes("update({admin_reply:note||null})"));
});
test('mobile responsive and accessible interactions',()=>{
  assert.ok(html.includes('@media(max-width:520px)'));
  assert.ok(html.includes('feedback-person-summary'));
  assert.ok(html.includes('aria-pressed='));
  assert.ok(html.includes('aria-label="Athlete filters"'));
});
