// Real browser, synthetic records only. No credentials, hosted data or writes.
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const source=fs.readFileSync('index.html','utf8');
const slice=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const functions=slice('function prescriptionEditor(block){','const QW_ALIASES=')+slice('function blockEditor(block){','function dayEditor(')+slice('async function saveWorkoutBlock(){','function substitutionForm(')+slice('let blockDemoReview=null;','async function save(table,');
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${source.match(/<style>([\s\S]*?)<\/style>/)[1]}</style><dialog id="modal"><form id="modalForm" method="dialog"></form></dialog><script src="/qa/workout-validation.js"></script><script src="/workout-demo-review.js"></script><script>
const writes=[],alerts=[];window.alert=msg=>alerts.push(msg);window.confirm=()=>true;
const state={exercises:[{code:'BR',name:'Bridge',active:true,video_url:'https://youtu.be/bridgevid01'},{code:'SQ',name:'Squat',active:true,video_url:'https://youtu.be/squatvideo1'}],trainingDays:[],sessionBlocks:[{id:'B',title:'Strength',content:{items:['Bridge — 2 x 8'],video_links:[{item_index:0,exerciseCode:'BR',exercise:'Bridge'}]}}]};
const byId=(list,id)=>list.find(x=>x.id===id),liveWeekForTrainingDay=()=>null,load=async()=>{},esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sb={from:()=>({update:value=>({eq:async()=>{writes.push(value);return {error:null};}})})};
${functions}
blockEditor(state.sessionBlocks[0]);document.querySelector('#saveWorkoutBlock').addEventListener('click',saveWorkoutBlock);
</script>`;
(async()=>{
 const server=http.createServer((req,res)=>{const path=req.url.split('?')[0];res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/html');res.end(path==='/'?fixture:fs.readFileSync('.'+path));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try {browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:JSON.parse(process.env.CHROMIUM_ARGS||'[]')});for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#blockItems').fill('Squat — 2 x 8');
  await page.locator('#saveWorkoutBlock').click();assert.equal(await page.evaluate(()=>writes.length),0);
  await page.getByRole('listbox').selectOption(['SQ']);await page.getByRole('checkbox').check();
  assert.equal(await page.getByRole('link',{name:'Watch Squat'}).getAttribute('href'),'https://youtu.be/squatvideo1');
  assert.equal(await page.evaluate(()=>document.querySelector('#modal').scrollWidth<=document.querySelector('#modal').clientWidth+1),true,'modal fits width');
  await page.locator('#saveWorkoutBlock').click();
  const payload=await page.evaluate(()=>writes[0]);assert.equal(payload.content.video_links[0].exerciseCode,'SQ');assert.equal(payload.content.video_links[0].reviewed_item,'Squat — 2 x 8');assert.deepEqual(errors,[]);
  console.log(width+'px: actual editor blocks unreviewed save, previews chosen demo, fits viewport and saves exact reviewed binding');await page.close();
 }}finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
