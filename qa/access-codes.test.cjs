const test=require('node:test'),assert=require('node:assert/strict');
const {issueSchoolCode}=require('../access-codes.js');
function fixture(){const rows=[],revoked=[];return {rows,revoked,repo:{validatePerson:async()=>true,insertPaused:async row=>{rows.push(row);return {id:'new-code'};},listPersonCodes:async()=>[{id:'old-code'}],pauseCodes:async ids=>revoked.push(['codes',ids]),revokeSessions:async ids=>revoked.push(['sessions',ids])}};}
test('secure generation stores hash only, is individually bound, and remains paused',async()=>{
 const f=fixture(),x=await issueSchoolCode({repository:f.repo,type:'cohort',cohortId:'school',personId:'athlete',label:'Test'});
 assert.match(x.raw,/^[a-f0-9]{64}$/);assert.match(f.rows[0].code_hash,/^[a-f0-9]{64}$/);assert.notEqual(x.raw,f.rows[0].code_hash);
 assert.equal(f.rows[0].athlete_id,'athlete');assert.equal(f.rows[0].status,'paused');assert.equal(JSON.stringify(f.rows).includes(x.raw),false);
 assert.deepEqual(f.revoked,[['codes',['old-code']],['sessions',['old-code']]]);
 const y=await issueSchoolCode({repository:fixture().repo,type:'staff',cohortId:'school',personId:'coach',label:'Test'});assert.notEqual(y.raw,x.raw);
});
test('invalid person binding fails before any insert',async()=>{const f=fixture();f.repo.validatePerson=async()=>false;await assert.rejects(issueSchoolCode({repository:f.repo,type:'cohort',cohortId:'school',personId:'wrong',label:'Test'}));assert.equal(f.rows.length,0);});
test('rotation failure never returns readable credential or activates new row',async()=>{const f=fixture();f.repo.revokeSessions=async()=>{throw Error('offline')};await assert.rejects(issueSchoolCode({repository:f.repo,type:'cohort',cohortId:'school',personId:'athlete',label:'Test'}));assert.equal(f.rows[0].status,'paused');});
