(function(global){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function feedbackLabel(f){
 const done=Boolean(f.reviewed_at);
 if(f.status==='adjustment_flagged')return 'Adjustment flagged'+(done?' · Reviewed':'');
 if(done)return 'Reviewed';
 if(f.status==='reviewed')return 'Needs review';
 if(f.status==='no_change')return 'No change';
 return f.status==='waiting'?'Waiting for review':'Needs review';
}
function mount({root,client,subjectType,subjectId,label}){
 let stopped=false,loading=false,cursor=null;const seen=new Set(),doc=root.ownerDocument;
 const el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;};
 const live=()=>!stopped&&root.isConnected;
 const button=(text,fn)=>{const b=el('button',text,'btn ghost');b.type='button';b.addEventListener('click',fn);return b;};
 root.classList.add('du-delivery-history');
 const status=el('div',undefined,'muted'),list=el('div',undefined,'v3-list'),footer=el('div');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 root.replaceChildren(el('h3','History · '+label),el('p','Captured programme and assignment changes. These records do not confirm that an athlete opened a workout.','muted'),status,list,footer);
 const fail=(message,retry)=>{status.replaceChildren(el('p',message),button('Retry',retry));};
 const rpc=async extra=>{const response=await client.rpc('admin_delivery_history',{p_subject_type:subjectType,p_subject_id:subjectId,p_limit:20,...extra});if(response.error)throw response.error;const data=response.data;if(!data||!Array.isArray(data.events)||typeof data.has_more!=='boolean')throw Error('Invalid history response');return data;};
 const sourceTitle=e=>({programme_weeks:'Programme week changed',session_blocks:'Workout blocks changed',athletes:'Athlete assignment or adjustments changed',cohorts:'School assignment changed',athlete_overrides:'Individual workout adjustment',cohort_overrides:'School workout adjustment'}[e.source_table]||'Programme record changed');
 const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'Date unavailable':d.toLocaleString();};
 const safeVideo=value=>{try{const u=new URL(value);return u.protocol==='https:'&&(['youtube.com','www.youtube.com','youtu.be','www.youtu.be'].includes(u.hostname))?u.href:null;}catch{return null;}};
 function contentView(host,content,library){
  const c=content||{};const byCode=new Map((library||[]).map(x=>[x.code,x.name]));
  if(c.instruction)host.append(el('p',c.instruction));
  const rows=Array.isArray(c.prescriptions)?c.prescriptions:[];
  for(const p of rows){const line=p.instruction||[byCode.get(p.exerciseCode)||p.exerciseCode,p.dosage,p.rest?'Rest '+p.rest:'',p.equipment?'Equipment: '+p.equipment:'',p.alternativeExerciseCode?'Alternative: '+(byCode.get(p.alternativeExerciseCode)||p.alternativeExerciseCode):'',p.cues,p.substitutionNote].filter(Boolean).join(' · ');if(line)host.append(el('p',line));}
  if(!rows.length&&Array.isArray(c.items))for(const row of c.items)host.append(el('p',typeof row==='string'?row:'Instruction unavailable'));
  for(const key of ['focus','why','watch','requirement'])if(typeof c[key]==='string'&&c[key])host.append(el('p',key[0].toUpperCase()+key.slice(1)+': '+c[key],'muted'));
  if(Array.isArray(c.video_links))for(const video of c.video_links){const url=safeVideo(video.video_url);if(!url)continue;const a=el('a','Demo · '+(video.exercise||'Movement'),'linkbtn');a.href=url;a.target='_blank';a.rel='noopener noreferrer';host.append(a);}
 }
 function snapshotView(snapshot,title){
  const host=el('section',undefined,'card');host.append(el('h4',title));
  if(!snapshot){host.append(el('p','No earlier captured record.','muted'));return host;}
  if(Object.hasOwn(snapshot,'state')){
   const s=snapshot.state;if(!s){host.append(el('p','Record removed.'));return host;}
   const fields={id:'Record reference',athlete_type:'Athlete type',programme_id:'Programme reference',cohort_id:'School/cohort reference',programme_week_id:'Programme week reference',athlete_id:'Athlete reference',training_day_id:'Training day reference',session_block_id:'Workout block reference',organization_id:'School/organisation reference',parent_user_id:'Parent account reference',athlete_user_id:'Athlete account reference',current_week:'Week',current_phase:'Phase',access_status:'Access',access_reason:'Access reason',paid:'Paid',payment_status:'Payment status',status:'School status',tier:'Tier',form_tier:'Athlete tier',programme_start_date:'Programme start',start_date:'Start date',end_date:'End date',expected_sessions_per_week:'Sessions per week',coach_note:'Coach note',admin_note:'Admin note',active:'Adjustment enabled',name:'School name'};
   for(const [key,caption] of Object.entries(fields))if(Object.hasOwn(s,key))host.append(el('p',caption+': '+(s[key]===null?'Not set':typeof s[key]==='boolean'?(s[key]?'Yes':'No'):s[key])));
   if(Array.isArray(s.exercise_substitutions)){if(!s.exercise_substitutions.length)host.append(el('p','No exercise swaps.'));for(const swap of s.exercise_substitutions)host.append(el('p','Exercise swap: '+swap.fromExerciseCode+' → '+swap.toExerciseCode+(swap.note?' · '+swap.note:'')));}
   if(s.override_content)contentView(host,s.override_content,[]);
   if(Array.isArray(snapshot.week_context))for(const context of snapshot.week_context){const d=el('details');d.append(el('summary',(context.programme?.name||'Programme')+' · Week '+(context.week?.week_number||'—')+' · '+(context.tier_name||(!context.week?.tier_id?'Standard tier':'Tier '+context.week.tier_id))),snapshotView(context,'Saved programme content'));host.append(d);}
   return host;
  }
  host.append(el('p',(snapshot.programme?.name||'Programme')+' · Week '+(snapshot.week?.week_number||'—')));
  if(snapshot.week?.tier_id)host.append(el('p','Tier: '+(snapshot.tier_name||snapshot.week.tier_id),'muted'));
  if(snapshot.week?.status)host.append(el('p','State: '+snapshot.week.status,'muted'));
  for(const day of snapshot.days||[]){host.append(el('h4',day.title||day.day_key||'Training day'));for(const block of day.blocks||[]){host.append(el('strong',block.title||'Workout block'));contentView(host,block.content,snapshot.exercise_library);if(block.athlete_note)host.append(el('p',block.athlete_note));}}
  return host;
 }
 function addEvent(event){
  if(!UUID.test(event.event_id)||seen.has(event.event_id))return;seen.add(event.event_id);
  const detail=el('details',undefined,'card'),head=el('summary',sourceTitle(event)+' · '+date(event.recorded_at));
  const body=el('div');let busy=false,loaded=false;
  detail.append(head,el('p',event.actor_role==='service_role'?'Service operation · no verified individual attribution':event.actor_role==='authenticated'&&UUID.test(event.actor_user_id||'')?'Authenticated account operation':'Database operation · individual not recorded','muted'),body);list.append(detail);
  async function loadDetails(){
   if(busy||loaded||!live())return;busy=true;body.replaceChildren(el('p','Loading change…','muted'));
   try{const data=await rpc({p_event_id:event.event_id});if(!live())return;const row=data.events[0];if(data.events.length!==1||row.event_id!==event.event_id)throw Error('Mismatched history detail');body.replaceChildren(snapshotView(row.before_snapshot,'Before'),snapshotView(row.after_snapshot,'After'));loaded=true;}
   catch{if(live())body.replaceChildren(el('p','Change details could not load. Nothing was changed.'),button('Retry details',loadDetails));}
   finally{busy=false;}
  }
  detail.addEventListener('toggle',()=>{if(detail.open)loadDetails();});
 }
 async function loadPage(before=null){
  if(loading||!live())return;loading=true;status.replaceChildren(el('p','Loading history…'));footer.querySelectorAll('button').forEach(x=>x.disabled=true);
  try{
   const data=await rpc(before?{p_before_sequence:before}:{});if(!live())return;
   for(const event of data.events)addEvent(event);status.replaceChildren();
   if(!seen.size)status.append(el('p','No captured history for '+label+' yet. Records begin when history is enabled.','muted'));
   footer.replaceChildren();cursor=data.next_before_sequence;
   if(data.has_more){if(typeof cursor!=='string'||!/^\d+$/.test(cursor))throw Error('Invalid cursor');const more=button('Load earlier changes',()=>loadPage(cursor));more.dataset.historyMore='';footer.append(more);}
  }catch(error){if(live()){const missing=['PGRST202','42883'].includes(error?.code);fail(missing?'History is not enabled yet. Existing programme records are unchanged.':'History could not load. Nothing was changed.',()=>loadPage(before));}}
  finally{loading=false;if(live())footer.querySelectorAll('button').forEach(x=>x.disabled=false);}
 }
 if(!['athlete','cohort'].includes(subjectType)||!UUID.test(subjectId)){status.textContent='Choose an athlete or school to view history.';}
 else loadPage();
 return {destroy(){stopped=true;}};
}
const api={mount,feedbackLabel};if(typeof module==='object'&&module.exports)module.exports=api;global.DuDeliveryHistory=api;
})(typeof window==='object'?window:globalThis);
