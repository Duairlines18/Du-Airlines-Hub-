const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261108230100_admin_cross_programme_week_draft_copy.sql'),'utf8');
const js=html.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];
test('workspace JS compiles; compact editor and top publishing preserved',()=>{
 assert.ok(js);new Function(js);
 const start=html.indexOf('const programmeHtml=week?');
 const end=html.indexOf("const tab=state.workspaceTab",start);
 const p=html.slice(start,end);
 for(const id of ['data-publish-week=','data-cross-copy-week=','data-copy-week=','data-add-day='])
  assert.ok(p.includes(id));
 for(const id of ['data-publish-week=','data-cross-copy-week=','data-copy-week='])
  assert.ok(p.indexOf(id)<p.indexOf('${wholeWeek'));
 assert.ok(html.includes('details.v3-day-collapse'));
});
test('copy to another athlete requires destination picker, preview and confirmation',()=>{
 for(const text of ['function crossCopyChoices(','function crossCopyPreview(','function startCrossProgrammeCopy(','function previewCrossProgrammeCopy(','function confirmCrossProgrammeCopy(','data-preview-cross-copy=','data-confirm-cross-copy=','data-target-week='])
  assert.ok(html.includes(text),text);
 assert.ok(html.includes("sb.rpc('admin_copy_training_week_to_target'"));
 assert.ok(html.includes('UNPUBLISHED draft'));
});
test('shared destination and preexisting training are excluded by UI before mutation',()=>{
 assert.ok(html.includes("owners.length!==1||linkedCohorts.length"));
 assert.ok(html.includes("cohort.status!=='live'||!isSchoolCohort(cohort)"));
 assert.ok(html.includes("existing.status!=='draft'||existing.published_at||existing.verification_status==='verified'||daysForWeek(existing.id).length"));
 assert.ok(html.includes('Destination week already has content or is published'));
});
test('admin-only, RLS respecting database function, no public execute',()=>{
 assert.ok(sql.includes('SECURITY INVOKER'));
 assert.ok(sql.includes('admin_profiles'));
 assert.ok(sql.includes('auth.uid()'));
 assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.admin_copy_training_week_to_target(uuid,text,uuid,integer) FROM PUBLIC'));
 assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.admin_copy_training_week_to_target(uuid,text,uuid,integer) TO authenticated'));
 assert.ok(!sql.includes('SECURITY DEFINER'));
});
test('SQL only copies to unpopulated unverified draft with atomic programme lock',()=>{
 for(const text of ['FOR UPDATE;','v_target_existing>0','v_target_status<>\'draft\'','v_target_published IS NOT NULL','v_target_verification=\'verified\'','status=\'draft\'','verification_status=\'needs_verification\'','published_at=NULL','IF v_written_days<>v_source_days'])
   assert.ok(sql.includes(text),text);
 assert.ok(sql.includes('Source contains an unmatched exercise code'));
 assert.ok(sql.includes('programme_tiers'));
});
test('copied content retains exercises, prescriptions and dosage but not private notes',()=>{
 assert.ok(sql.includes('v_new_day,block_type,title,sort_order,NULL,content,NULL,NULL,NULL'));
 assert.ok(sql.includes('athlete_education=NULL'));
 assert.ok(sql.includes('NULL,\'draft\',\'needs_verification\',NULL,NULL'));
 assert.ok(sql.includes('v_target_week,v_day.day_key,v_day.title,v_day.intensity'));
 assert.ok(!sql.includes('DELETE FROM'));
});
