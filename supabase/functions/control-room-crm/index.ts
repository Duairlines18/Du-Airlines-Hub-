// Du Airlines Control Room CRM — read-only, admin-only Airtable proxy.
// Never store an Airtable token, a service-role key, or private coaching notes in the public site.
// This function must be deployed with verify_jwt=true after AIRTABLE_TOKEN is set securely.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const AIRTABLE_BASE='appw9nNcbuqFdiRTT';
const ATHLETES_TABLE='tblTIoYy1fVywtv3E';
const ACCOUNTS_TABLE='tblDKvlLZ1d4iD5nS';
// Explicitly verified organizational links. No fuzzy school-name matching.
const SCHOOL_ACCOUNT_IDS:Record<string,string>={
  'a827b9b0-bb2b-4429-abaa-98aa32b90e11':'recHo7TzaQTgXRxCi'
};
const allowedOrigins=new Set(['https://duairlines18.github.io']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idRecord=/^rec[a-zA-Z0-9]{14}$/;

function respond(body:Record<string,unknown>,status=200,origin=''){
  const headers:Record<string,string>={
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store, private',
    'Vary':'Origin'
  };
  if(allowedOrigins.has(origin)){
    headers['Access-Control-Allow-Origin']=origin;
    headers['Access-Control-Allow-Headers']='authorization, apikey, content-type, x-client-info';
    headers['Access-Control-Allow-Methods']='POST, OPTIONS';
  }
  return new Response(JSON.stringify(body),{status,headers});
}
function trimText(value:unknown,limit=1500){
  return typeof value==='string'?value.slice(0,limit):'';
}
function choiceName(value:unknown){
  return typeof value==='string'?value:
    value&&typeof value==='object'&&'name' in value?trimText((value as {name:unknown}).name,100):'';
}
function parseAirtableRecord(value:unknown){
  if(!value||typeof value!=='object')return null;
  const obj=value as {id?:unknown,fields?:unknown};
  if(typeof obj.id!=='string'||!idRecord.test(obj.id)||!obj.fields||typeof obj.fields!=='object')return null;
  return {id:obj.id,fields:obj.fields as Record<string,unknown>};
}
async function airtableRequest(path:string,token:string){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    return await fetch('https://api.airtable.com/v0/'+path,{
      method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
      signal:controller.signal
    });
  }finally{clearTimeout(timeout);}
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin')||'';
  if(origin&&!allowedOrigins.has(origin))return respond({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')return respond({ok:true},200,origin);
  if(req.method!=='POST')return respond({error:'Method not allowed'},405,origin);

  const bearer=req.headers.get('authorization')||'';
  if(!/^Bearer\s+\S+$/i.test(bearer))return respond({error:'Authentication required'},401,origin);
  const token=bearer.replace(/^Bearer\s+/i,'');
  const url=Deno.env.get('SUPABASE_URL');
  const publicKey=Deno.env.get('SUPABASE_ANON_KEY');
  if(!url||!publicKey)return respond({error:'Service temporarily unavailable'},503,origin);
  const sb=createClient(url,publicKey,{global:{headers:{Authorization:bearer}}});
  const {data:{user},error:userError}=await sb.auth.getUser(token);
  if(userError||!user)return respond({error:'Authentication required'},401,origin);
  const {data:admin,error:adminError}=await sb.from('admin_profiles').select('user_id').eq('user_id',user.id).maybeSingle();
  if(adminError||!admin)return respond({error:'Not authorized'},403,origin);

  let payload:unknown;
  try{payload=await req.json()}catch{return respond({error:'Invalid request'},400,origin)}
  if(!payload||typeof payload!=='object')return respond({error:'Invalid request'},400,origin);
  const {type,id}=payload as {type?:unknown,id?:unknown};
  if((type!=='athlete'&&type!=='school')||typeof id!=='string'||!uuid.test(id))return respond({error:'Invalid request'},400,origin);

  const pat=Deno.env.get('AIRTABLE_TOKEN');
  if(!pat)return respond({error:'CRM connection is not configured'},503,origin);

  try{
    if(type==='athlete'){
      const {data:athlete,error}=await sb.from('athletes').select('id').eq('id',id).maybeSingle();
      if(error||!athlete)return respond({error:'Athlete not found'},404,origin);
      // UUID has already been validated; use a strict ID match, never a name match.
      const formula=encodeURIComponent("{Supabase Athlete ID}='"+id+"'");
      const qs='filterByFormula='+formula+'&maxRecords=2';
      const response=await airtableRequest(AIRTABLE_BASE+'/'+ATHLETES_TABLE+'?'+qs,pat);
      if(!response.ok)return respond({error:'CRM temporarily unavailable'},503,origin);
      const data=await response.json() as {records?:unknown[]};
      const rows=(data.records||[]).map(parseAirtableRecord).filter(Boolean) as {id:string,fields:Record<string,unknown>}[];
      if(rows.length>1)return respond({error:'Multiple CRM records need reconciliation'},409,origin);
      if(!rows.length)return respond({linked:false,kind:'athlete'},200,origin);
      const r=rows[0],f=r.fields;
      if(f['Supabase Athlete ID']!==id)return respond({error:'CRM identity mismatch'},409,origin);
      return respond({linked:true,kind:'athlete',recordId:r.id,
        athlete:trimText(f['Athlete'],120),programme:trimText(f['Programme'],160),
        crmWeek:typeof f['Current Week']==='number'?f['Current Week']:null,
        deliveryStatus:choiceName(f['Delivery Status']),
        syncHealth:choiceName(f['Sync Health']),
        lastSync:trimText(f['Last Supabase Sync'],50),
        continuity:trimText(f['Continuity Notes'],2200),
        nextDecision:trimText(f['Next Programming Decision'],1500),
        // Explicitly indicate that these are CRM notes, not authoritative live programme delivery.
        source:'Airtable coaching continuity'
      },200,origin);
    }

    const {data:school,error:schoolError}=await sb.from('cohorts').select('id,organization_id').eq('id',id).maybeSingle();
    if(schoolError||!school?.organization_id)return respond({error:'School not found'},404,origin);
    const accountId=SCHOOL_ACCOUNT_IDS[school.organization_id];
    if(!accountId)return respond({linked:false,kind:'school'},200,origin);
    const response=await airtableRequest(AIRTABLE_BASE+'/'+ACCOUNTS_TABLE+'/'+accountId,pat);
    if(!response.ok)return respond({error:'CRM temporarily unavailable'},503,origin);
    const record=parseAirtableRecord(await response.json());
    if(!record||record.id!==accountId)return respond({error:'CRM link invalid'},409,origin);
    const f=record.fields;
    return respond({linked:true,kind:'school',recordId:record.id,
      account:trimText(f['Organization Name'],160),
      stage:trimText(f['Current Stage'],200),
      status:choiceName(f['Status']),
      nextAction:trimText(f['Next Action'],1000),
      followUp:trimText(f['Next Follow-up Date'],40),
      summary:trimText(f['Notes'],1800),
      source:'Airtable school relationship'
    },200,origin);
  }catch{
    return respond({error:'CRM temporarily unavailable'},503,origin);
  }
});
