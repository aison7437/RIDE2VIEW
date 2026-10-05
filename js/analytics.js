(() => {
 'use strict';let generation=0;
 const words=s=>String(s).replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ').toLowerCase();
 async function refresh(user){
  if(user&&window.R2V.getUser()?.id!==user.id)return;
  const gen=++generation,{node,api,perform,button,status}=window.R2V;
  let root=document.getElementById('app-analytics');if(!root){root=node('section');root.id='app-analytics';root.setAttribute('aria-label','Business analytics');document.getElementById('app-workspace').append(root);}
  root.replaceChildren();root.hidden=user?.role!=='admin';if(root.hidden)return;
  const today=new Date(Date.now()+3*3600000).toISOString().slice(0,10),month=new Date(Date.parse(today+'T00:00:00Z')-29*86400000).toISOString().slice(0,10);
  root.append(node('h2','Business analytics and friction'),node('p','Dates use Nairobi time. Activity is grouped by creation date and evaluated at report generation; ledger entries use their posting dates.'));
  const form=node('form');for(const [name,text,value] of [['from','From',month],['to','Through',today]]){const label=node('label',text),field=node('input');field.type='date';field.name=name;field.value=value;field.max=today;field.required=true;label.append(field);form.append(label);}
  const submit=node('button','Generate operations report');submit.type='submit';form.append(submit);const output=node('div');root.append(form,output);
  let pendingKey=null,signature=null,viewRevision=0;
  function table(parent,rows,columns){if(!rows.length){parent.append(node('p','No records in this period.'));return;}const wrap=node('div');wrap.style.overflowX='auto';const t=node('table');t.style.width='100%';const head=node('tr');for(const [,title] of columns)head.append(node('th',title));t.append(head);for(const row of rows){const tr=node('tr');for(const [key] of columns)tr.append(node('td',row[key]==null?'—':typeof row[key]==='number'?row[key].toLocaleString():String(row[key])));t.append(tr);}wrap.append(t);parent.append(wrap);}
  function render(run){
   if(gen!==generation||window.R2V.getUser()?.id!==user.id)return;
   const view=++viewRevision;output.replaceChildren();const business=run.nodes.find(n=>n.agent==='business-analytics-agent')?.output,friction=run.nodes.find(n=>n.agent==='friction-hunter-agent')?.output;
   if(!business){output.append(node('p','Report did not complete. Inspect the saved assessment.'));return;}
   form.elements.from.value=business.period.from;form.elements.to.value=business.period.to;
   output.append(node('h3',`${business.period.from} through ${business.period.to}`),node('p',`Snapshot generated ${new Date(business.generatedAt).toLocaleString('en-KE',{timeZone:'Africa/Nairobi'})} Nairobi time. Refresh by generating a new report.`));
   const evidencePanel=node('section');evidencePanel.setAttribute('aria-label','Source records');
   let evidenceRequest=0;
   async function inspect(category,offset=0){const request=++evidenceRequest;const evidence=await api('/admin/analytics/evidence','POST',{category,from:business.period.from,to:business.period.to,offset});if(gen!==generation||view!==viewRevision||request!==evidenceRequest)return;
    evidencePanel.replaceChildren(node('h3',evidence.label),node('p',`${evidence.total} matching current records. Showing ${evidence.records.length} from offset ${offset}. These may differ from the saved snapshot.`));
    const keys=[...new Set(evidence.records.flatMap(Object.keys))];table(evidencePanel,evidence.records,keys.map(k=>[k,words(k)]));
    if(offset)evidencePanel.append(button('Previous records',()=>inspect(category,Math.max(0,offset-50))));if(offset+50<evidence.total)evidencePanel.append(button('Next records',()=>inspect(category,offset+50)));evidencePanel.scrollIntoView({block:'nearest'});
   }
   const metrics=[['viewings','Viewing requests'],['accepted','Accepted at least once'],['completed','Completed property viewings'],['cancelled','Cancelled viewings'],['completed_transport','Completed transport bookings'],['cancelled_transport','Cancelled transport bookings']];
   for(const [key,label] of metrics)output.append(node('p',`${label}: ${business.counts[key]}`),button('Inspect '+label.toLowerCase(),()=>inspect(key)));
   output.append(node('h3','Conversion'));
   for(const [key,r] of Object.entries(business.conversion))output.append(node('p',`${words(key)}: ${r.percent===null?'Not enough records':r.percent+'%'} (${r.numerator}/${r.denominator})`));
   output.append(node('h3','Recorded money movements'),node('p','Collections are not company revenue. Ledger directions and currencies remain separate.'));
   table(output,business.finance.ledger,[['currency','Currency'],['direction','Direction'],['event_type','Event'],['amount','Amount'],['entries','Entries']]);output.append(button('Inspect ledger entries',()=>inspect('ledger')));
   output.append(node('h3','Recorded earnings allocations'));table(output,business.finance.allocations,[['currency','Currency'],['platformAllocation','Platform allocation'],['beneficiaryAllocation','Beneficiary allocation'],['records','Records']]);output.append(button('Inspect earnings allocations',()=>inspect('earnings')));
   for(const [key,label,category] of [['outstanding','Outstanding payout allocations','outstanding'],['pendingRefunds','Pending customer refunds','refunds']]){output.append(node('h3',label));table(output,business.finance[key],[['currency','Currency'],['amount','Amount'],['records','Records']]);output.append(button('Inspect '+label.toLowerCase(),()=>inspect(category)));}
   output.append(node('h3','Agent performance — up to 50 accounts'));table(output,business.performance.agents,[['name','Agent'],['requests','Requests'],['accepted','Accepted'],['completed','Completed']]);
   output.append(node('h3','Driver performance — up to 50 accounts'));table(output,business.performance.drivers,[['name','Driver'],['assignedRecords','Assigned records'],['completed','Completed']]);
   output.append(node('h3','Findings to investigate'));
   if(!friction?.findings.length)output.append(node('p','No records match the current review rules. This does not establish that every workflow is healthy.'));
   for(const f of friction?.findings||[]){const card=node('article',null,'app-card');card.append(node('h4',`${f.title}: ${f.count} · ${f.severity}`),node('p',f.suggestedAction),button('Inspect '+f.title.toLowerCase(),()=>inspect(f.category)));output.append(card);}
   output.append(node('p',`Search measurement began ${business.tracking.startedAt}. ${business.tracking.scope}`));
   const notes=node('details');notes.append(node('summary','Definitions and limitations'));for(const l of [...business.limitations,...(friction?.limitations.slice(0,2)||[])])notes.append(node('p',l));output.append(notes,evidencePanel);
  }
  form.addEventListener('submit',e=>{e.preventDefault();perform(async()=>{const range=Object.fromEntries(new FormData(form)),next=JSON.stringify(range);if(signature!==next||!pendingKey){signature=next;pendingKey=crypto.randomUUID();}const run=await api('/agents/workflows','POST',{workflow:'operations-intelligence',...range,idempotencyKey:pendingKey});pendingKey=null;render(run);status('Operations snapshot saved. Findings require review; no operational changes were made.');},submit);});
  const history=await api('/agents/workflows');if(gen!==generation)return;const last=history.workflows.find(x=>x.workflow==='operations-intelligence');if(last)render(last);else output.append(node('p','Generate a report to inspect recorded activity and operational bottlenecks.'));
 }
 window.R2VAnalytics={refresh};
})();
