const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const helper=source.slice(source.indexOf('function weeklyPlanStatus('),source.indexOf('function nav(){'));
test('weekly statuses use real publication state, never call a draft published',()=>{
 const weeks=new Map([
  [1,{id:'w1',week_number:1,published_at:'2026-11-01T00:00:00Z',verification_status:'verified',status:'live'}],
  [2,{id:'w2',week_number:2,status:'draft',published_at:null,verification_status:'needs_verification'}],
  [3,{id:'w3',week_number:3,status:'draft'}]
 ]);
 const sandbox={weekReadiness:(_,n)=>n===1?{week:weeks.get(1),issues:[],level:'live'}:n===2?{week:weeks.get(2),issues:[],level:'ready'}:n===3?{week:weeks.get(3),issues:['No workout blocks'],level:'incomplete'}:{week:null,issues:[],level:'missing'},
 isPublishedWeek:w=>!!(w?.published_at&&w.verification_status==='verified'&&w.status==='live'),
 state:{athletes:[],cohorts:[],feedback:[]},byId:()=>null,activeAccount:()=>false,isSchoolAthlete:()=>false,isSchoolCohort:()=>false,athleteCurrentWeek:()=>1,athleteProgrammeId:()=>null,feedbackNeedsReview:f=>!f.reviewed_at,feedbackOwnerKey:f=>f.athlete_id,feedbackWho:f=>f.name,seriousFeedback:f=>!!f.flagged,esc:v=>String(v)};
 vm.runInNewContext(helper+';globalThis.status=weeklyPlanStatus',sandbox);
 assert.equal(sandbox.status('p',1).key,'published');
 assert.equal(sandbox.status('p',2).key,'draft');
 assert.equal(sandbox.status('p',3).key,'incomplete');
 assert.equal(sandbox.status('p',4).key,'missing');
 assert.equal(sandbox.status(null,1).key,'unassigned');
});
test('one row per active individual and one per live school, excludes school athletes and paused',()=>{
 const sandbox={
   state:{athletes:[
    {id:'a1',full_name:'Private A',access_status:'active',current_week:4,programme_id:'p1'},
    {id:'a2',full_name:'School A',access_status:'active',cohort_id:'c1'},
    {id:'a3',full_name:'Paused A',access_status:'paused',programme_id:'p1'}
   ],cohorts:[{id:'c1',name:'School One',status:'live',organization_id:'org1',programme_id:'p2',current_week:2},{id:'c2',name:'Archived School',status:'archived',organization_id:'org2'}],feedback:[],programmes:[{id:'p1',duration_weeks:8},{id:'p2',duration_weeks:6}]},
   activeAccount:a=>a.access_status==='active',isSchoolAthlete:a=>a.cohort_id==='c1',isSchoolCohort:c=>!!c.organization_id,athleteCurrentWeek:a=>a.current_week,athleteProgrammeId:a=>a.programme_id,byId:(items,id)=>items.find(i=>i.id===id),weekReadiness:()=>({week:null,issues:[],level:'missing'}),isPublishedWeek:()=>false,feedbackNeedsReview:f=>!f.reviewed_at,feedbackOwnerKey:f=>f.athlete_id,feedbackWho:f=>f.name,seriousFeedback:f=>!!f.flagged,esc:v=>String(v)
 };
 vm.runInNewContext(helper+';globalThis.rows=weeklyCommandRows',sandbox);
 const rows=sandbox.rows();assert.equal(rows.length,2);assert.equal(rows.filter(x=>x.kind==='school').length,1);assert.equal(rows.filter(x=>x.kind==='athlete').length,1);
});
test('feedback history groups by stable owner and does not bulk-mark different submissions',()=>{
 const sandbox={state:{feedback:[{id:'f1',athlete_id:'a',created_at:'2026-11-08T12:00:00Z',flagged:true},{id:'f2',athlete_id:'a',created_at:'2026-11-07T12:00:00Z'},{id:'f3',athlete_id:'b',created_at:'2026-11-06T12:00:00Z'}]},feedbackNeedsReview:f=>!f.reviewed_at,feedbackOwnerKey:f=>f.athlete_id,feedbackWho:f=>'Owner '+f.athlete_id,seriousFeedback:f=>!!f.flagged,esc:v=>String(v)};
 vm.runInNewContext(helper+';globalThis.groups=feedbackReviewGroups;globalThis.row=overviewFeedbackRow',sandbox);
 const groups=sandbox.groups();assert.equal(groups.length,2);assert.equal(groups[0].items.length,2);assert.equal(groups[0].flagged,1);
 const html=sandbox.row(groups[0]);assert.ok(html.includes('data-review="f1"'));assert.ok(!html.includes('data-review="f2"'));
});
