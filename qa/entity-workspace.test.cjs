const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('Control Room inline JavaScript parses',()=>{
 const main=html.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];
 assert.ok(main);new Function(main);
});
test('school roster belongs to opened school and excludes archived athletes',()=>{
 const src=html.slice(html.indexOf('function renderProgrammeEditor(m){'),html.indexOf('async function saveTrainingDay()',html.indexOf('function renderProgrammeEditor(m){')));
 assert.ok(src.includes("a.cohort_id===cohort.id&&a.access_status!=='archived'"));
 assert.ok(src.includes("cohort?.id&&isSchoolCohort(cohort)"));
 assert.ok(src.includes('schoolAthletes.map(a=>'));
 assert.ok(src.includes('data-open-athlete='));
 assert.ok(src.includes('data-feedback-athlete='));
 assert.ok(src.includes('data-edit-athlete='));
 assert.ok(src.includes('schoolRosterHtml'));
});
test('workspace quick actions use existing read/write flows without altering database permissions',()=>{
 assert.ok(html.includes('data-workspace-current'));
 assert.ok(html.includes("state.selectedWeekId=null;state.workspaceTab='programme';render();return;"));
 assert.ok(html.includes('data-workspace-tab="feedback"'));
 assert.ok(html.includes('data-workspace-tab="access"'));
 assert.ok(html.includes('data-edit-cohort='));
 assert.ok(html.includes('data-edit-athlete='));
 assert.ok(html.includes('data-substitutions='));
 assert.ok(html.includes('data-workspace-tab="athletes"'));
 assert.ok(html.includes('aria-label="Workspace sections"'));
});
test('mobile workspace actions remain accessible without horizontal page expansion',()=>{
 assert.ok(html.includes('@media(max-width:520px)'));
 assert.ok(html.includes('.v3-hero .v3-actions{width:100%;display:grid;'));
 assert.ok(html.includes('.v3-subnav{flex-wrap:nowrap;overflow-x:auto;'));
});
