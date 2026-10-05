(() => {
 'use strict';
 let generation=0;
 const labels={'lifestyle-agent':'Lifestyle','property-agent':'Property recommendations','lead-qualification-agent':'Preference fit','scheduling-agent':'Viewing options','agent-assistant':'Agent assistant','driver-coach-agent':'Driver coach','transaction-agent':'Payment record','trust-safety-agent':'Risk signals','support-agent':'Recovery guidance','mobility-agent':'Driver recommendations','rideplate-agent':'Catalog comparison','logistics-agent':'Shipment capacity','opportunity-agent':'Opportunities','experiences-agent':'Experiences'};
 const words=s=>String(s).replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ').toLowerCase();
 async function refresh(user) {
  if(user&&window.R2V.getUser()?.id!==user.id)return;
  const revision=++generation,{api,node,button,perform,status}=window.R2V;
  let root=document.getElementById('app-agents');
  if(!root){root=node('section');root.id='app-agents';root.setAttribute('aria-label','Personal assistants');document.getElementById('app-workspace').append(root);}
  root.replaceChildren();root.hidden=!user;if(!user)return;
  root.append(node('h2','Your assistants'),node('p','Loading your assessments…'));
  const [capabilities,history,choices]=await Promise.all([api('/agents/capabilities'),api('/agents/workflows'),api('/agents/choices')]);
  if(revision!==generation||window.R2V.getUser()?.id!==user.id)return;
  root.replaceChildren(node('h2','Your assistants'),node('p','Get guidance from your current records. Reviewing an assessment does not book, pay or send messages. Assessments expire after 15 minutes.'));
  const form=node('form'),select=node('select'),options=node('div'),submit=node('button','Run assessment');submit.type='submit';select.name='workflow';select.setAttribute('aria-label','Choose assistant');
  for(const w of capabilities.workflows){const o=node('option',w.label);o.value=w.id;select.append(o);}
  let choiceRevision=0,key=null,payloadSignature=null;
  async function choose(){
   const choice=++choiceRevision,w=capabilities.workflows.find(x=>x.id===select.value);options.replaceChildren();submit.disabled=true;
   if(!w)return;
   if(w.field){let entries=[];
    if(w.field==='listingId')entries=(await api('/listings')).listings.map(p=>[p.id,p.title]);
    if(w.field==='bookingId')entries=(await api('/bookings')).bookings.map(b=>[b.id,`${b.listing.title} · ${new Date(b.scheduled_at).toLocaleString()} · ${b.status}`]);
    if(w.field==='category')entries=[...new Set((await api('/rideplate/catalog')).items.map(x=>x.category))].map(x=>[x,x]);
    if(w.field==='shipmentId')entries=choices.shipments.map(x=>[x.id,`${words(x.shipment_class)} · ${words(x.status)} · ${x.id.slice(0,8)}`]);
    if(revision!==generation||choice!==choiceRevision)return;
    const label=node('label',w.field==='listingId'?'Property':w.field==='bookingId'?'Viewing':w.field==='category'?'Product category':'Shipment'),field=node('select');field.name=w.field;
    if(w.optional){const o=node('option','All published properties (up to 100)');o.value='';field.append(o);}
    for(const [value,text] of entries){const o=node('option',text);o.value=value;field.append(o);}label.append(field);options.append(label);
    if(!entries.length&&!w.optional){options.append(node('p','No eligible records are available yet.'));return;}
   }
   submit.disabled=false;
  }
  select.addEventListener('change',()=>perform(choose));
  form.append(select,options,submit);root.append(form,button('Refresh assessments',()=>refresh(user)));
  form.addEventListener('submit',e=>{e.preventDefault();perform(async()=>{
   const payload=Object.fromEntries(new FormData(form));if(payload.listingId==='')delete payload.listingId;
   const signature=JSON.stringify(payload);if(signature!==payloadSignature||!key){key=crypto.randomUUID();payloadSignature=signature;}
   await api('/agents/workflows','POST',{...payload,idempotencyKey:key});key=null;status('Assessment saved. Review the findings below.');await refresh(user);
  },submit);});
  function renderValue(parent,value,depth=0){
   if(value==null||depth>4)return;
   if(Array.isArray(value)){for(const entry of value.slice(0,100)){const item=node('div',null,'app-card');renderValue(item,entry,depth+1);parent.append(item);}if(!value.length)parent.append(node('p','None recorded.'));return;}
   if(typeof value==='object'){for(const [k,v] of Object.entries(value)){if(['authority','provenance','score_components','ranking_factors','scoring_factors','verification_checks'].includes(k))continue;if(v&&typeof v==='object'){const detail=node('details');detail.append(node('summary',words(k)));renderValue(detail,v,depth+1);parent.append(detail);}else if(v!=null)parent.append(node('p',`${words(k)}: ${String(v)}`));}return;}
   parent.append(node('p',String(value)));
  }
  for(const run of history.workflows){
   const card=node('details');card.dataset.workflowId=run.id;card.open=true;
   card.append(node('summary',`${capabilities.workflows.find(x=>x.id===run.workflow)?.label||run.workflow} · ${words(run.status)}`),node('p',`Saved ${new Date(run.createdAt).toLocaleString()}`));
   for(const result of run.nodes){const detail=node('details');detail.append(node('summary',`${labels[result.agent]||result.agent} · ${words(result.status)}`));renderValue(detail,result.output);if(result.failure)detail.append(node('p',`Unavailable: ${words(result.failure.code)}`));if(result.source?.length)detail.append(node('p','Evidence: '+result.source.join(', ')));card.append(detail);}
   for(const limitation of run.limitations)card.append(node('p',limitation));
   if(['COMPLETED','REVIEW_REQUIRED','PARTIAL'].includes(run.status))for(const [decision,title] of [['REVIEWED','Mark reviewed'],['DISMISSED','Dismiss']])card.append(button(title,async()=>{await api('/agents/workflows/'+run.id+'/review','POST',{version:run.version,decision});await refresh(user);}));
   if(['RECOVERABLE','PENDING'].includes(run.status))card.append(button('Resume assessment',async()=>{await api('/agents/workflows/'+run.id+'/resume','POST',{});await refresh(user);}));
   root.append(card);
  }
  if(!history.workflows.length)root.append(node('p','No saved assessments yet.'));
  await choose();
 }
 window.R2VAgents={refresh};
})();
