const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const fixtures={
  athletes:[
    {id:'athlete-private',full_name:'Takunda Mutizwa',display_name:'Takunda',cohort_id:'cohort-private',programme_id:'programme-private',athlete_user_id:'user-private',access_status:'active',onboarding_complete:true,current_week:5},
    {id:'athlete-school',full_name:'School Athlete QA',display_name:'School Athlete',cohort_id:'cohort-school',programme_id:null,access_status:'active',current_week:1}
  ],
  cohorts:[
    {id:'cohort-private',name:'Takunda Mutizwa — Individual Private Athlete',organization_id:null,programme_id:'programme-private',current_week:5,status:'live'},
    {id:'cohort-school',name:"St George's College",organization_id:'school-org',programme_id:'programme-school',current_week:1,status:'live'}
  ],
  programmes:[
    {id:'programme-private',name:'Private Foundation',duration_weeks:5},
    {id:'programme-school',name:'School Performance',duration_weeks:4}
  ],
  exercises:[{id:'exercise-a',code:'a-march',name:'A-March',active:true,video_url:'https://example.com/a-march.mp4'}],
  programme_weeks:[
    {id:'week-private-4',programme_id:'programme-private',week_number:4,status:'draft',verification_status:'needs_verification',published_at:null,phase:'Future Work',weekly_objective:'Plan the next focus'},
    {id:'week-private-5',programme_id:'programme-private',week_number:5,status:'live',verification_status:'verified',published_at:'2026-11-01T00:00:00Z',phase:'Movement Foundation'}
  ],
  training_days:[
    {id:'day-private-mon',programme_week_id:'week-private-5',day_key:'MONDAY',title:'Acceleration Mechanics',sort_order:1,intensity:'Easy'},
    {id:'day-private-tue',programme_week_id:'week-private-5',day_key:'TUESDAY',title:'Strength Foundations',sort_order:2}
  ],
  session_blocks:[
    {id:'block-private-warm',training_day_id:'day-private-mon',title:'Warm Up',sort_order:1,block_type:'activation',content:{prescriptions:[{exerciseCode:'a-march',dosage:'2 x 20 m',rest:'Walk back'}]}},
    {id:'block-private-strength',training_day_id:'day-private-tue',title:'Strength',sort_order:1,block_type:'strength',content:{items:['Split Squat — 2 x 6 each side']}}
  ],
  feedback:[
    {id:'feedback-one',athlete_id:'athlete-private',cohort_id:'cohort-private',week_number:4,feedback_type:'athlete_weekly',created_at:'2026-11-08T13:00:00Z',reviewed_at:null,status:'no_change',payload:{note:'Training felt good',pain:'None'}}
  ]
};
const stub=`<script>
window.supabase={createClient:()=>({
 functions:{invoke:async(slug,options)=>({error:null,data:options.body.type==='athlete'?
 {linked:true,kind:'athlete',recordId:'recNX9lsjD4zFX8OP',programme:'Synthetic Programme',crmWeek:5,deliveryStatus:'LIVE',nextDecision:'Synthetic coach decision for QA only'}:
 {linked:true,kind:'school',recordId:'recHo7TzaQTgXRxCi',account:'Synthetic School Account',nextAction:'Synthetic follow-up for QA only'}})},
 auth:{getSession:async()=>({data:{session:{user:{id:'qa-admin'}}}}),
 getUser:async()=>({data:{user:{id:'qa-admin'}},error:null}),
 onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
 from(table){
  const q={select(){return q},eq(){return q},order(){return q},
    maybeSingle:async()=>({data:{user_id:'qa-admin',display_name:'QA Admin'},error:null}),
    then(resolve,reject){return Promise.resolve({data:(window.__qaFixtures[table]||[]),error:null}).then(resolve,reject)}
  };
  return q;
 }
})};
window.__qaFixtures=${JSON.stringify(fixtures)};
</script>`;
function pageSource(){
  return fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')
    .replace('<script src="access-codes.js"></script>','')
    .replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',stub)
    .replace('<script src="qa/workout-validation.js"></script>','<script>function workoutDeliveryIssues(){return [];}</script>');
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.setContent(pageSource(),{waitUntil:'load'});
   await page.getByRole('heading',{name:'Control Room'}).waitFor();
   await page.getByRole('heading',{name:"Next Week's Plans"}).waitFor();
   assert.equal(await page.locator('#runningProgrammes .week-command-row').count(),2,'one line for private programme and one school');
   assert.equal(await page.locator('#needsAttention .week-command-row').count(),1,'feedback grouped by person');
   assert.ok((await page.locator('#runningProgrammes').innerText()).includes('Next W'));
   assert.ok((await page.locator('#runningProgrammes').innerText()).includes('Not built'));
   await page.locator('[data-overview-toggle-plans]').click();
   assert.equal(await page.locator('#runningProgrammes .week-command-row').count(),2);
   await page.locator('#needsAttention [data-feedback-focus]').click();
   await page.getByRole('heading',{name:'Athlete Feedback'}).waitFor();
   await page.locator('#nav [data-page="dashboard"]').click();
   await page.getByRole('heading',{name:'Control Room'}).waitFor();
   await page.locator('[data-roster-filter="active"]').click();
   await page.getByRole('heading',{name:'Athletes'}).waitFor();
   assert.equal(await page.locator('#athleteList .v3-person').count(),2);
   await page.locator('[data-athlete-filter="private"]').click();
   assert.equal(await page.locator('#athleteList .v3-person').count(),1);
   await page.locator('[data-open-athlete="athlete-private"]').click();
   await page.getByRole('heading',{name:'Takunda Mutizwa'}).waitFor();
   assert.equal(await page.locator('details.v3-day-collapse').count(),2,'two compact days');
   assert.equal(await page.locator('details.v3-day-collapse[open]').count(),0,'days default collapsed');
   await page.locator('details.v3-day-collapse').first().locator('summary.v3-day-summary').click();
   assert.equal(await page.locator('details.v3-day-collapse[open]').count(),1);
   assert.equal(await page.locator('details.v3-block-collapse[open]').count(),0,'blocks default collapsed');
   await page.locator('details.v3-block-collapse').first().locator('summary.v3-block-summary').click();
   assert.equal(await page.locator('details.v3-block-collapse[open]').count(),1);
   assert.ok((await page.locator('details.v3-block-collapse').first().innerText()).includes('A-March'));
   assert.equal(await page.locator('details.v3-block-collapse').first().locator('[data-remove-prescription]').count(),1,'prescription editing preserved');
   await page.locator('[data-day-visibility="collapse"]').click();
   assert.equal(await page.locator('details.v3-day-collapse[open]').count(),0);
   await page.locator('[data-day-visibility="expand"]').click();
   assert.equal(await page.locator('details.v3-day-collapse[open]').count(),2);
   assert.equal(await page.locator('details.v3-block-collapse[open]').count(),2);
   assert.equal(await page.locator('[data-copy-week]').count(),0,'obsolete same-programme prompt is removed');
   await page.locator('[data-select-week="week-private-4"]').click();
   await page.locator('[data-publish-week="week-private-4"]').click();
   await page.getByRole('heading',{name:'Week 4 · Plan & Publish'}).waitFor();
   assert.equal(await page.locator('[data-week-plan-field]').count(),5,'weekly objective and coaching focus fields');
   assert.equal(await page.locator('[data-save-week-plan]').count(),1,'draft notes can be saved separately');
   assert.equal(await page.locator('[data-commit-publish-week]').count(),1,'publish requires an explicit separate action');
   await page.locator('[data-close-modal]').click();
   await page.locator('[data-select-week="week-private-5"]').click();
   await page.locator('[data-publish-week="week-private-5"]').click();
   await page.getByRole('heading',{name:'Week 5 · Plan & Publish'}).waitFor();
   assert.equal(await page.locator('[data-commit-publish-week]').count(),0,'already published week cannot be republished');
   await page.locator('[data-close-modal]').click();
   await page.locator('[data-prepare-drafts="programme-private"]').click();
   await page.getByRole('heading',{name:'Prepare future weeks'}).waitFor();
   await page.locator('#futureDraftCount').selectOption('4');
   assert.equal(await page.locator('#futureDraftCount').inputValue(),'4','four future drafts can be planned');
   await page.locator('[data-close-modal]').click();
   await page.locator('[data-cross-copy-week="week-private-5"]').click();
   await page.locator('#copyDestinationSearch').fill('st george');
   await page.locator('[data-choose-copy-destination="school:cohort-school"]').click();
   assert.equal(await page.locator('#copyToProgramme').inputValue(),'school:cohort-school');
   await page.locator('#copyToWeek').fill('1');
   await page.locator('[data-preview-cross-copy="week-private-5"]').click();
   await page.getByText('Copy preview: St George\'s College · Week 1').waitFor();
   assert.ok((await page.locator('#copyProgrammePreview').innerText()).includes('2 days · 2 blocks'));
   assert.ok((await page.locator('#copyProgrammePreview').innerText()).includes('1 video links'));
   assert.equal(await page.locator('[data-confirm-cross-copy]').count(),1,'preview offers a draft-only save');
   await page.locator('#copyToWeek').fill('7');
   await page.locator('[data-preview-cross-copy="week-private-5"]').click();
   assert.ok((await page.locator('#copyProgrammePreview [role="alert"]').innerText()).includes('Choose an eligible destination'));
   assert.equal(await page.locator('[data-confirm-cross-copy]').count(),0,'invalid destination week cannot be saved');
   await page.locator('#modal').evaluate(el=>el.close());
   await page.locator('[data-load-crm="athlete:athlete-private"]').click();
   await page.getByText('Synthetic coach decision for QA only').waitFor();
   await page.locator('#nav [data-page="athletes"]').click();
   await page.getByRole('heading',{name:'Athletes'}).waitFor();
   await page.locator('[data-go-back]').first().click();
   await page.getByRole('heading',{name:'Takunda Mutizwa'}).waitFor();
   await page.locator('#nav [data-page="athletes"]').click();
   await page.getByRole('heading',{name:'Athletes'}).waitFor();
   await page.locator('[data-feedback-athlete="athlete-private"]').click();
   await page.getByRole('heading',{name:'Athlete Feedback'}).waitFor();
   assert.equal(await page.locator('.feedback-person[open]').count(),1);
   assert.equal(await page.locator('.feedback-record').count(),1);
   await page.locator('[data-feedback-clear]').click();
   await page.locator('#nav [data-page="cohorts"]').click();
   await page.getByRole('heading',{name:'Schools'}).waitFor();
   assert.ok((await page.locator('#main').innerText()).includes("St George's College"));
   assert.ok(!(await page.locator('#main').innerText()).includes('Takunda Mutizwa'));
   await page.locator('#main [data-open-cohort="cohort-school"]').click();
   await page.getByRole('heading',{name:"St George's College"}).waitFor();
   await page.locator('[data-load-crm="school:cohort-school"]').click();
   await page.getByText('Synthetic follow-up for QA only').waitFor();
   await page.locator('[data-workspace-tab="athletes"]').click();
   assert.equal(await page.locator('[data-open-athlete="athlete-school"]').count(),1);
   await page.locator('[data-open-athlete="athlete-school"]').click();
   await page.getByRole('heading',{name:'School Athlete QA'}).waitFor();
   await page.locator('[data-workspace-tab="feedback"]').first().click();
   assert.ok((await page.locator('#main').innerText()).includes('School Athlete QA Feedback'));
   await page.locator('[data-workspace-current]').click();
   assert.equal(await page.locator('[data-workspace-tab="programme"].active').count(),1);
   await page.locator('#nav [data-page="cohorts"]').click();
   await page.locator('#main [data-page="cohort-programmes"]').click();
   await page.getByRole('heading',{name:'Programme Groups'}).waitFor();
   assert.ok((await page.locator('#main').innerText()).includes('Takunda Mutizwa'));
   assert.ok(!(await page.locator('#main').innerText()).includes("St George's College"));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<8,'unexpected page-wide horizontal overflow at '+width+': '+overflow);
   assert.deepEqual(errors,[],'JavaScript runtime errors at '+width);
   await page.close();
   process.stdout.write('Control Room navigation browser QA PASS at '+width+'px\\n');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
