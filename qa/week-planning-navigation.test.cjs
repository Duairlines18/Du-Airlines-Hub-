const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261108232737_admin_prepare_future_week_drafts.sql'),'utf8');
const js=source.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];
test('Control Room JavaScript still compiles',()=>{assert.ok(js);new Function(js);});
test('week publishing opens a review and writing modal instead of an immediate confirm',()=>{
 for(const fragment of ['function openWeekPlanning(weekId)','Week ${week.week_number} · Plan & Publish','data-week-plan-field=','weekly_objective','running_focus','strength_focus','event_focus','data-save-week-plan=','data-commit-publish-week=','data-close-modal'])
   assert.ok(source.includes(fragment),fragment);
 assert.ok(source.includes("if(publishWeek){openWeekPlanning(publishWeek.dataset.publishWeek);return;}"));
 assert.ok(source.includes('This is an older week. Publishing it could move the current programme backward'));
 assert.ok(source.includes("if(isPublishedWeek(week)){alert('This week is already published."));
 assert.ok(source.includes("sb.rpc('admin_publish_programme_week'"));
 assert.ok(source.includes("isSchoolAthlete(d.account)&&d.cohort?.organization_id"));
 assert.ok(source.includes("return {type:'cohort',id:d.cohort.id,label:d.cohort.name+' (school programme)'"));
 assert.ok(!source.includes("Publish Week ${week.week_number} to ${audience}?\\n\\n"));
});
test('future 1 2 or 4 draft weeks use non-destructive admin-only RPC',()=>{
 for(const fragment of ['futureDraftCount','<option value="1">1 week</option>','<option value="2">2 weeks</option>','<option value="4">4 weeks</option>','admin_prepare_future_week_drafts','data-confirm-future-drafts=','data-prepare-drafts='])
  assert.ok(source.includes(fragment),fragment);
 assert.ok(sql.includes('SECURITY INVOKER'));
 assert.ok(sql.includes('admin_profiles'));
 assert.ok(sql.includes('FOR UPDATE'));
 assert.ok(sql.includes('IF v_exists=1 THEN'));
 assert.ok(sql.includes("VALUES(p_programme_id,v_num,'Future training week',''"));
 assert.ok(sql.includes("'draft','needs_verification',NULL,NULL"));
 assert.ok(!sql.includes('UPDATE public.athletes'));
 assert.ok(!sql.includes('UPDATE public.cohorts'));
 assert.ok(!sql.includes('UPDATE public.programme_weeks'));
});
test('search-by-name copy picker requires deliberate selection and preserves preview',()=>{
 assert.ok(source.includes('id="copyDestinationSearch"'));
 assert.ok(source.includes('data-choose-copy-destination='));
 assert.ok(source.includes("crossCopySearchResults(sourceId,e.target.value)"));
 assert.ok(source.includes('document.getElementById(\'copyToProgramme\').value=chooseCopy.dataset.chooseCopyDestination'));
 assert.ok(source.includes('data-preview-cross-copy='));
 assert.ok(source.includes('data-confirm-cross-copy='));
 assert.ok(source.includes('Destination changed. Preview the copy again before saving.'));
 assert.ok(!source.includes('>Duplicate to another week</button>'));
});
test('navigation back includes context and selected week, no changes to athlete access',()=>{
 assert.ok(source.includes('function navigateBack()'));
 assert.ok(source.includes('navigationTrail'));
 assert.ok(source.includes('selectedWeekId:state.selectedWeekId'));
 assert.ok(source.includes('programmeContext:state.programmeContext'));
 assert.ok(source.includes('data-go-back'));
 assert.ok(source.includes('data-close-modal'));
});
