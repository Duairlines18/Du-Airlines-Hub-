(function(global){
'use strict';
function demoUrl(exercise){
 const raw=exercise.video_url||exercise.videoUrl||'';
 try {
  const url=new URL(raw),host=url.hostname.toLowerCase().replace(/^www\./,'');
  if(url.protocol!=='https:'||!['youtube.com','youtu.be','youtube-nocookie.com'].includes(host))return null;
  const id=host==='youtu.be'?url.pathname.slice(1).split('/')[0]:url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:shorts|embed|v)\/([^/]+)/)?.[1];
  return /^[A-Za-z0-9_-]{6,100}$/.test(id||'')?url.href:null;
 } catch {
  const id=exercise.video_id||exercise.videoId;
  return !raw&&/^[A-Za-z0-9_-]{6,100}$/.test(id||'')?'https://www.youtube.com/watch?v='+id:null;
 }
}
function resolve(link,library){
 const matches=library.filter(e=>e.active!==false&&(link.exerciseCode?e.code===link.exerciseCode:(e.name||e.title)===link.exercise));
 if(matches.length!==1||!demoUrl(matches[0]))throw new Error('Choose an available demo from the library.');
 return matches[0];
}
function prepare(original,next,reviews,library){
 const items=Array.isArray(next.items)?next.items:[],prior=Array.isArray(original.items)?original.items:[];
 const links=Array.isArray(original.video_links)?original.video_links:[],out=[];
 items.forEach((item,index)=>{
  const review=reviews[index],changed=item!==prior[index];
  const manual=changed||review?.touched===true;
  if(manual&&(!review?.confirmed||review.item!==item||!Array.isArray(review.codes)))
   throw new Error('Review the demos for line '+(index+1)+' before saving.');
  const saved=links.filter(link=>link.item_index===index);
  if(!manual&&saved.some(link=>Object.prototype.hasOwnProperty.call(link,'reviewed_item')&&link.reviewed_item!==item))
   throw new Error('Review the demos for line '+(index+1)+' before saving.');
  const choices=manual?[...new Set(review.codes)].map(code=>resolve({exerciseCode:code},library)):
    saved.filter(link=>link.no_demo!==true).map(link=>resolve(link,library));
  if((manual&&choices.length===0)||(!manual&&saved.some(link=>link.no_demo===true)))
   out.push({item_index:index,no_demo:true,reviewed_item:item});
  for(const exercise of choices)if(!out.some(link=>link.item_index===index&&link.exerciseCode===exercise.code))out.push({
   item_index:index,exercise:exercise.name||exercise.title,exerciseCode:exercise.code,
   video_url:demoUrl(exercise),reviewed_item:item
  });
 });
 return {...next,video_links:out};
}
function mount({root,itemsInput,original,library}){
 const document=root.ownerDocument,reviews={};
 const items=()=>itemsInput.value.split('\n').map(x=>x.trim()).filter(Boolean);
 const element=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 const render=()=>{
  root.replaceChildren(element('h3','Exercise demonstrations'),element('p','For each changed line, choose every demo it needs, watch the selection, then confirm. Leave the selection empty for running, rest or notes.'));
  items().forEach((item,index)=>{
   const saved=(original.video_links||[]).filter(link=>link.item_index===index);
   if(!reviews[index]||reviews[index].item!==item){
    const codes=[];if(item===original.items?.[index])for(const link of saved){try{codes.push(resolve(link,library).code);}catch{}}
    reviews[index]={item,codes,confirmed:false,touched:false};
   }
   const review=reviews[index],card=element('div');card.className='card';
   card.append(element('strong','Line '+(index+1)+': '+item));
   const label=element('label','Demonstrations (choose all that apply)'),select=element('select');
   select.multiple=true;select.size=Math.min(5,Math.max(2,library.length));select.style.width='100%';
   select.setAttribute('aria-label','Demonstrations for line '+(index+1));
   for(const ex of library.filter(ex=>ex.active!==false&&demoUrl(ex))){const option=element('option',ex.name||ex.title);option.value=ex.code;option.selected=review.codes.includes(ex.code);select.append(option);}
   label.append(select);card.append(label);
   const clear=element('button','No demo needed');clear.type='button';clear.className='btn ghost';
   clear.addEventListener('click',()=>{review.codes=[];review.touched=true;review.confirmed=false;render();});card.append(clear);
   const previews=element('div');previews.className='row';
   for(const code of review.codes){try{const ex=resolve({exerciseCode:code},library),a=element('a','Watch '+(ex.name||ex.title));a.href=demoUrl(ex);a.target='_blank';a.rel='noopener noreferrer';previews.append(a);}catch{}}
   card.append(previews);
   const confirmLabel=element('label'),checkbox=element('input');checkbox.type='checkbox';checkbox.style.width='auto';checkbox.checked=review.confirmed;
   confirmLabel.append(checkbox,document.createTextNode(' I checked this instruction and its demo selection (or no demo needed).'));card.append(confirmLabel);
   if(item!==original.items?.[index]||review.touched)card.append(element('p',review.confirmed?'Selection reviewed for this line.':'Review needed before saving.'));
   select.addEventListener('change',()=>{review.codes=[...select.selectedOptions].map(o=>o.value);review.touched=true;review.confirmed=false;render();});
   checkbox.addEventListener('change',()=>{review.confirmed=checkbox.checked;review.touched=true;render();});
   root.append(card);
  });
 };
 itemsInput.addEventListener('input',render);render();
 return {getContent:next=>prepare(original,next,reviews,library),destroy:()=>itemsInput.removeEventListener('input',render)};
}
const api={prepare,mount};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else global.WorkoutDemoReview=api;
})(typeof window!=='undefined'?window:globalThis);
