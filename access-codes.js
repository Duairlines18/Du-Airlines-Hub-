(function(root){
  'use strict';
  async function issueSchoolCode({repository,type,cohortId,personId,label,expiresAt,now=new Date()}){
    if(!['cohort','staff'].includes(type)||!cohortId||!personId||!String(label||'').trim())throw Error('Select a named athlete or coach and cohort.');
    const expiry=expiresAt?new Date(expiresAt):new Date(now.getTime()+7*86400000);
    if(!(expiry.getTime()>now.getTime()))throw Error('Expiry must be in the future.');
    if(!await repository.validatePerson(type,personId,cohortId))throw Error('Person is not active in the selected school cohort.');
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);
    const raw=Array.from(bytes,b=>alphabet[b&31]).join('');
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw.toLowerCase()));
    const code_hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const old=await repository.listPersonCodes(type,personId,cohortId);
    const row={code_type:type,cohort_id:cohortId,athlete_id:type==='cohort'?personId:null,staff_id:type==='staff'?personId:null,code_hash,status:'paused',label:String(label).trim(),expires_at:expiry.toISOString()};
    const inserted=await repository.insertPaused(row);
    const ids=old.map(x=>x.id);
    if(ids.length){await repository.pauseCodes(ids);await repository.revokeSessions(ids);}
    return {id:inserted.id,raw,status:'paused',expiresAt:row.expires_at};
  }
  const api={issueSchoolCode};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.DuSchoolAccessCodes=api;
})(typeof globalThis==='object'?globalThis:this);
