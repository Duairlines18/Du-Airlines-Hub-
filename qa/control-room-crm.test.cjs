const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'../supabase/functions/control-room-crm/index.ts'),'utf8');
test('existing Control Room inline JS still compiles',()=>{
 const main=html.split('<script src="qa/workout-validation.js"></script>\n<script>')[1]?.split('</script>')[0];
 assert.ok(main);new Function(main);
});
test('read-only CRM is shown only in athlete and real-school workspaces',()=>{
 assert.ok(html.includes("d.ctx.type==='athlete'?crmBriefMarkup('athlete',account?.id)"));
 assert.ok(html.includes("d.ctx.type==='cohort'&&isSchoolCohort(cohort)?crmBriefMarkup('school',cohort?.id)"));
 assert.ok(html.includes('data-load-crm='));
 assert.ok(html.includes("sb.functions.invoke('control-room-crm',{body:{type,id}})"));
 assert.ok(html.includes("CRM could not be loaded. Check its secure server connection"));
 assert.ok(html.includes("Supabase above remains the source of truth"));
});
test('browser source never includes Airtable PAT or direct API calls',()=>{
 assert.ok(!html.includes('AIRTABLE_TOKEN'));
 assert.ok(!html.includes('api.airtable.com'));
 assert.ok(!html.includes('service_role'));
});
test('CRM server requires verified user and explicit admin row before accessing token',()=>{
 const user=server.indexOf("sb.auth.getUser(token)");
 const admin=server.indexOf("sb.from('admin_profiles')");
 const pat=server.indexOf("Deno.env.get('AIRTABLE_TOKEN')");
 assert.ok(user>=0&&admin>user&&pat>admin);
 assert.ok(server.includes("if(adminError||!admin)return respond({error:'Not authorized'},403"));
 assert.ok(server.includes("const {data:athlete,error}=await sb.from('athletes')"));
 assert.ok(server.includes("const {data:school,error:schoolError}=await sb.from('cohorts')"));
 assert.ok(!server.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!server.includes('Deno.env.get(\'AIRTABLE_TOKEN\')??'));
});
test('lookup only matches exact Supabase IDs and verified school account mapping',()=>{
 assert.ok(server.includes("filterByFormula="));
 assert.ok(server.includes("maxRecords=2"));
 assert.ok(server.includes("f['Supabase Athlete ID']!==id"));
 assert.ok(server.includes("SCHOOL_ACCOUNT_IDS[school.organization_id]"));
 assert.ok(!server.includes('name.toLowerCase()'));
 assert.ok(server.includes("if(rows.length>1)return respond({error:'Multiple CRM records need reconciliation'},409"));
});
test('CRM responses are private, origin-limited and field whitelisted',()=>{
 assert.ok(server.includes("Cache-Control':'no-store, private"));
 assert.ok(server.includes("allowedOrigins=new Set(['https://duairlines18.github.io'])"));
 assert.ok(server.includes("if(origin&&!allowedOrigins.has(origin))"));
 assert.ok(server.includes("if(req.method!=='POST')"));
 assert.ok(server.includes("if((type!=='athlete'&&type!=='school')"));
 assert.ok(server.includes('trimText(f[\'Continuity Notes\']'));
 assert.ok(!server.includes('return respond({linked:true,fields:'));
});
