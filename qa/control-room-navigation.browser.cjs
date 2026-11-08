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
  feedback:[
    {id:'feedback-one',athlete_id:'athlete-private',cohort_id:'cohort-private',week_number:4,feedback_type:'athlete_weekly',created_at:'2026-11-08T13:00:00Z',reviewed_at:null,status:'no_change',payload:{note:'Training felt good',pain:'None'}}
  ]
};
const stub=`<script>
window.supabase={createClient:()=>({
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
    .replace('<script src="qa/workout-validation.js"></script>','');
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
   await page.locator('[data-roster-filter="active"]').click();
   await page.getByRole('heading',{name:'Athletes'}).waitFor();
   assert.equal(await page.locator('#athleteList .v3-person').count(),2);
   await page.locator('[data-athlete-filter="private"]').click();
   assert.equal(await page.locator('#athleteList .v3-person').count(),1);
   await page.locator('[data-feedback-athlete="athlete-private"]').click();
   await page.getByRole('heading',{name:'Athlete Feedback'}).waitFor();
   assert.equal(await page.locator('.feedback-person[open]').count(),1);
   assert.equal(await page.locator('.feedback-record').count(),1);
   await page.locator('[data-feedback-clear]').click();
   await page.locator('#nav [data-page="cohorts"]').click();
   await page.getByRole('heading',{name:'Schools'}).waitFor();
   assert.ok((await page.locator('#main').innerText()).includes("St George's College"));
   assert.ok(!(await page.locator('#main').innerText()).includes('Takunda Mutizwa'));
   await page.locator('#nav [data-page="cohort-programmes"]').click();
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
