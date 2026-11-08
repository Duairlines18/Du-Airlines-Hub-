const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function extract(from,to){const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a);return html.slice(a,b);}
const logic=extract('const feedbackNeedsReview=',"const directProgrammeAthlete=")+
 extract('const feedbackLabel=',"function nav()");
const context={};
vm.runInNewContext(logic+';globalThis.out={feedbackNeedsReview,feedbackLabel}',context);
const {feedbackNeedsReview,feedbackLabel}=context.out;
test('every unreviewed submission is in queue regardless of triage',()=>{
 for(const status of ['no_change','reviewed','adjustment_flagged','waiting'])
  assert.equal(feedbackNeedsReview({status,reviewed_at:null}),true,status);
});
test('only explicit human review removes an item from queue',()=>{
 for(const status of ['no_change','reviewed','adjustment_flagged'])
  assert.equal(feedbackNeedsReview({status,reviewed_at:'2026-11-08T18:00:00Z'}),false,status);
});
test('queue labels distinguish automatic triage from actual coach review',()=>{
 assert.match(feedbackLabel({status:'reviewed',reviewed_at:null}),/Needs review/);
 assert.match(feedbackLabel({status:'no_change',reviewed_at:null}),/No change.*Needs review/);
 assert.match(feedbackLabel({status:'adjustment_flagged',reviewed_at:null}),/Adjustment flagged.*Needs review/);
 assert.equal(feedbackLabel({status:'reviewed',reviewed_at:'2026-11-08T18:00:00Z'}),'Coach reviewed');
});
test('pending queue and high priority attention work together without altering status',()=>{
 assert.ok(html.includes('state.feedback.filter(feedbackNeedsReview)'));
 assert.ok(html.includes('priority:seriousFeedback(f)?0:3'));
 assert.ok(html.includes("data-review"));
});
