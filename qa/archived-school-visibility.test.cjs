const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('Control Room JS still compiles',()=>{
 const js=source.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];
 assert.ok(js);new Function(js);
});
test('archived school is hidden from active school listing, not removed from data',()=>{
 const start=source.indexOf('function renderCohorts(m){'),end=source.indexOf('function renderProgrammeGroups(m){',start);
 const part=source.slice(start,end);
 assert.ok(part.includes("state.cohorts.filter(c=>isSchoolCohort(c)&&c.status!=='archived')"));
 assert.ok(part.includes("state.cohorts.filter(c=>isSchoolCohort(c)&&c.status==='archived')"));
 assert.ok(part.includes('Archived Schools ('));
 assert.ok(part.includes('cohortRows(archived,true)'));
 assert.ok(part.includes('<details class="card"'));
});
test('archived school is excluded from global search and unrelated programme groups',()=>{
 const start=source.indexOf('function globalSearchRows(query){'),end=source.indexOf('function renderGlobalSearch()',start);
 assert.ok(source.slice(start,end).includes("state.cohorts.filter(c=>c.status!=='archived').forEach(c=>"));
 const groups=source.slice(source.indexOf('function renderProgrammeGroups(m){'),source.indexOf('function programmeOptions(',source.indexOf('function renderProgrammeGroups(m){')));
 assert.ok(groups.includes("!isSchoolCohort(c)&&c.status!=='archived'"));
});
test('school settings retain status edit and archive restoration pathway',()=>{
 assert.ok(source.includes("['draft','scheduled','live','completed','paused','archived'].map("));
 assert.ok(source.includes('data-edit-cohort='));
 assert.ok(source.includes("if(e.target.id==='saveCohort')"));
});
test('existing athlete and school opening actions remain',()=>{
 assert.ok(source.includes('data-open-athlete='));
 assert.ok(source.includes('data-open-cohort='));
 assert.ok(source.includes('data-workspace-tab="feedback"'));
 assert.ok(source.includes('data-workspace-tab="access"'));
});
