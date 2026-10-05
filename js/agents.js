(() => {
 'use strict';
 let generation=0;
 const labels={'security-intelligence-agent':'Security Intelligence','market-intelligence-agent':'Market Intelligence','sales-intelligence-agent':'Sales Intelligence','memory-learning-agent':'Memory and learning','ai-critic-agent':'AI Critic','data-quality-agent':'Data Quality','lifestyle-agent':'Lifestyle','property-agent':'Property recommendations','lead-qualification-agent':'Preference fit','scheduling-agent':'Viewing options','agent-assistant':'Agent assistant','driver-coach-agent':'Driver coach','transaction-agent':'Payment record','trust-safety-agent':'Risk signals','support-agent':'Recovery guidance','mobility-agent':'Driver recommendations','rideplate-agent':'Catalog comparison','logistics-agent':'Shipment capacity','opportunity-agent':'Opportunities','experiences-agent':'Experiences'};
 const words=s=>String(s).replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ').toLowerCase();
 async function refresh(user) {
  if(user&&window.R2V.getUser()?.id!==user.id)return;
  const revision=++generation,{api,node,button,perform,status}=window.R2V;
  let root=document.getElementById('app-agents');
  if(!root){root=node('section');root.id='app-agents';root.setAttribute('aria-label','Personal assistants');document.getElementById('app-workspace').append(root);}
  root.replaceChildren();root.hidden=!user;if(!user)return;
  root.append(node('h2','Your assistants'),node('p','Loading your assessments…'));
  const [capabilities,history,choices,memory]=await Promise.all([api('/agents/capabilities'),api('/agents/workflows'),api('/agents/choices'),api('/agents/memory')]);
  if(revision!==generation||window.R2V.getUser()?.id!==user.id)return;
  root.replaceChildren(node('h2','Your assistants'),node('p','Get guidance from your current records. Reviewing an assessment does not book, pay or send messages. Assessments expire after 15 minutes.'));
  const memoryPanel=node('details');memoryPanel.id='app-agent-memory';
  memoryPanel.append(node('summary','Assistant memory'),node('p',memory.enabled?'Memory is on. Your assistants reuse your explicit feedback.':'Memory is off. Feedback is saved only after you enable it.'),node('p','Property exclusions affect new property assessments. Feedback expires after 90 days. Pause keeps saved entries; Clear removes active memory and turns it off. Historical assessment snapshots remain in your history.'));
  memoryPanel.append(button(memory.enabled?'Pause memory':'Enable memory',async()=>{await api('/agents/memory/settings','POST',{version:memory.version,enabled:!memory.enabled});await refresh(user);}),button('Clear memory and turn off',async()=>{await api('/agents/memory/clear','POST',{version:memory.version});await refresh(user);}));
  for(const entry of memory.entries){const item=node('div',null,'app-card');item.dataset.memoryId=entry.id;item.append(node('p',`${words(entry.kind)}: ${entry.subjectId} · ${words(entry.value)} · ${entry.active?'active':'inactive'} · expires ${new Date(entry.expiresAt).toLocaleDateString()}`),node('p',`Source assessment: ${entry.sourceWorkflowId}, version ${entry.sourceVersion}`),button('Forget this entry',async()=>{await api('/agents/memory/entries/'+entry.id+'/forget','POST',{version:memory.version});await refresh(user);}));item.style.overflowWrap='anywhere';memoryPanel.append(item);}
  if(!memory.entries.length)memoryPanel.append(node('p','No memory entries saved.'));
  root.append(memoryPanel);
  const form=node('form'),select=node('select'),options=node('div'),submit=node('button','Run assessment');submit.type='submit';select.name='workflow';select.setAttribute('aria-label','Choose assistant');
  for(const w of capabilities.workflows){const o=node('option',w.label);o.value=w.id;select.append(o);}
  let choiceRevision=0,key=null,payloadSignature=null;
  async function choose(){
   const choice=++choiceRevision,w=capabilities.workflows.find(x=>x.id===select.value);options.replaceChildren();submit.disabled=true;
   if(!w)return;
   if(w.field){let entries=[];
    if(w.field==='targetWorkflowId')entries=history.workflows.filter(x=>x.workflow!=='ai-critic'&&['COMPLETED','REVIEW_REQUIRED','PARTIAL','REVIEWED','DISMISSED','EXPIRED','CORRUPT'].includes(x.status)).map(x=>[x.id,`${capabilities.workflows.find(w=>w.id===x.workflow)?.label||x.workflow} · ${new Date(x.createdAt).toLocaleString()} · ${words(x.status)}`]);
    if(w.field==='listingId')entries=(await api('/listings')).listings.map(p=>[p.id,p.title]);
    if(w.field==='bookingId')entries=(await api('/bookings')).bookings.map(b=>[b.id,`${b.listing.title} · ${new Date(b.scheduled_at).toLocaleString()} · ${b.status}`]);
    if(w.field==='category')entries=[...new Set((await api('/rideplate/catalog')).items.map(x=>x.category))].map(x=>[x,x]);
    if(w.field==='shipmentId')entries=choices.shipments.map(x=>[x.id,`${words(x.shipment_class)} · ${words(x.status)} · ${x.id.slice(0,8)}`]);
    if(revision!==generation||choice!==choiceRevision)return;
    const label=node('label',w.field==='targetWorkflowId'?'Assessment to review':w.field==='listingId'?'Property':w.field==='bookingId'?'Viewing':w.field==='category'?'Product category':'Shipment'),field=node('select');field.name=w.field;
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
   for(const finding of run.nodes.find(n=>n.agent==='data-quality-agent')?.output?.findings||[]){
    const evidence=node('div');let request=0;
    async function inspect(offset=0){const attempt=++request;const result=await api('/admin/quality/evidence','POST',{rule:finding.rule,offset});if(revision!==generation||attempt!==request)return;evidence.replaceChildren(node('h4',result.title),node('p',`${result.total} current records; showing ${result.records.length} from offset ${offset}. Source records may have changed since the assessment.`));for(const record of result.records){const row=node('p');row.textContent=Object.entries(record).map(([key,value])=>`${words(key)}: ${value??'unknown'}`).join(' · ');row.style.overflowWrap='anywhere';evidence.append(row);}if(offset)evidence.append(button('Previous quality records',()=>inspect(Math.max(0,offset-50))));if(offset+50<result.total)evidence.append(button('Next quality records',()=>inspect(offset+50)));}
    card.append(button('Inspect '+finding.title.toLowerCase(),()=>inspect()),evidence);
   }
   for(const result of run.nodes.filter(n=>['security-intelligence-agent','market-intelligence-agent','sales-intelligence-agent'].includes(n.agent))){
    const kind=result.agent.split('-')[0],categories=kind==='security'?['signals','sessions']:[null];
    for(const category of categories){const panel=node('div');let sequence=0;async function inspect(offset=0){const attempt=++sequence;const data=await api('/intelligence/'+kind+'/evidence','POST',{offset,...(category?{category}:{})});if(revision!==generation||attempt!==sequence)return;panel.replaceChildren(node('p',`${data.total} current source records. These may have changed since the saved assessment.`));for(const record of data.records){const row=node('p',Object.entries(record).map(([k,v])=>`${words(k)}: ${v??'unknown'}`).join(' · '));row.style.overflowWrap='anywhere';panel.append(row);}if(offset)panel.append(button('Previous source records',()=>inspect(Math.max(0,offset-50))));if(offset+50<data.total)panel.append(button('Next source records',()=>inspect(offset+50)));}card.append(button('Inspect '+kind+' '+(category||'source records'),()=>inspect()),panel);}
   }
   const source=run.nodes.find(n=>n.agent==='ai-critic-agent')?.output?.sourceAssessment;
   if(source){const sourcePanel=node('div');card.append(button('Inspect source assessment',async()=>{const original=await api('/agents/workflows/'+source.id);if(revision!==generation)return;sourcePanel.replaceChildren(node('p',`Current source version ${original.version}; reviewed version ${source.version}.`));for(const n of original.nodes){const detail=node('details');detail.append(node('summary',labels[n.agent]||n.agent));renderValue(detail,n.output);sourcePanel.append(detail);}}),sourcePanel);}
   if(run.memory)card.append(node('p',`Memory at assessment: ${run.memory.enabled?'on':'off'}; version ${run.memory.version}; ${run.memory.exclusions.length} property exclusions.`));
   if(memory.enabled&&!['memory-learning','ai-critic'].includes(run.workflow)&&['COMPLETED','REVIEW_REQUIRED','PARTIAL','REVIEWED','DISMISSED','EXPIRED'].includes(run.status)){
    for(const [value,title] of [['HELPFUL','Remember as helpful'],['NOT_HELPFUL','Remember as not helpful']])card.append(button(title,async()=>{await api('/agents/memory/entries','POST',{version:memory.version,kind:'FEEDBACK',sourceWorkflowId:run.id,value});await refresh(user);}));
    if(user.role==='customer'&&['property-advice','opportunities'].includes(run.workflow))for(const property of run.nodes.flatMap(n=>n.agent==='property-agent'?(n.output?.properties||[]):n.agent==='opportunity-agent'?(n.output?.opportunities||[]):[]))if(property?.id&&!memory.entries.some(e=>e.kind==='EXCLUDE_PROPERTY'&&e.subjectId===property.id&&e.active))card.append(button('Exclude from future advice: '+(property.title||property.id),async()=>{await api('/agents/memory/entries','POST',{version:memory.version,kind:'EXCLUDE_PROPERTY',sourceWorkflowId:run.id,listingId:property.id,value:'EXCLUDE'});await refresh(user);}));
   }
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
