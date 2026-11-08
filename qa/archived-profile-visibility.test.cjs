const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
test('archive keeps profiles out of overview action queue without changing underlying rows',()=>{
 const start=source.indexOf('const operationalAttention=()=>'),end=source.indexOf('const exerciseMatch=',start);
 assert.ok(start>=0&&end>start);
 const segment=source.slice(start,end);
 assert.ok(segment.includes("state.athletes.filter(a=>a.access_status!=='archived').forEach(a=>"));
 assert.ok(!segment.includes("state.athletes.forEach(a=>"));
});
test('archive does not show in global search, active metrics or athlete roster',()=>{
 const search=source.slice(source.indexOf('function globalSearchRows(query){'),source.indexOf('function renderGlobalSearch()',source.indexOf('function globalSearchRows(query){')));
 assert.ok(search.includes("state.athletes.filter(a=>a.access_status!=='archived').forEach(a=>"));
 assert.ok(source.includes("const rows=state.athletes.filter(a=>a.access_status!=='archived'&&("));
 assert.ok(source.includes("const activeAthletes=state.athletes.filter(a=>activeAccount(a)).length"));
});
test('archive fix leaves feedback, school membership and training delivery operations intact',()=>{
 const script=source.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];
 assert.ok(script);new Function(script);
 assert.ok(source.includes("const feedbackNeedsReview=f=>!f.reviewed_at;"));
 assert.ok(source.includes("const isSchoolCohort=c=>!!c?.organization_id;"));
 assert.ok(source.includes("data-open-athlete="));
});
