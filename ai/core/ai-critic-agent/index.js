const object=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const list=x=>Array.isArray(x)?x.map(object):[];
async function execute(task={}){
 const s=task.input?.snapshot;if(!s)return {status:'UNAVAILABLE',data:{authority:'RECOMMENDATION_ONLY'},source:[],requires_confirmation:false,error:{code:'CRITIC_SNAPSHOT_REQUIRED'}};
 const findings=[];const add=(code,severity,node,reason,path='output')=>findings.push({code,severity,nodeId:node?.node_id||null,reason,evidence:{workflowId:s.id,version:s.version,journeyHash:s.hash,path:node?`nodes.${node.node_id}.${path}`:path}});
 if(s.malformed)add('MALFORMED_JOURNEY','HIGH',null,'The saved journey cannot be read as a valid node graph.','journey');
 const nodes=list(s.nodes);
 if(s.expired)add('STALE_ASSESSMENT','MEDIUM',null,'The original assessment has expired. Generate fresh advice before making a decision.','expires_at');
 for(const n of nodes){
  const o=object(n.output),i=object(n.input),successful=['SUCCESS','WAITING_CONFIRMATION'].includes(n.status);
  for(const [field,value] of Object.entries(o))if(Array.isArray(value)&&['properties','assessments','findings','basket'].includes(field)&&value.some(x=>!x||typeof x!=='object'||Array.isArray(x)))add('MALFORMED_RECORD','HIGH',n,'The saved output contains an invalid structured record.',`output.${field}`);
  if(typeof n.node_id!=='string'||typeof n.responsible_agent!=='string'||!Array.isArray(n.dependencies)||!['PENDING','READY','RUNNING','WAITING_CONFIRMATION','SUCCESS','PARTIAL','FAILED','BLOCKED','SKIPPED','CANCELLED'].includes(n.status))add('MALFORMED_NODE','HIGH',n,'The saved node does not satisfy the journey structure contract.');
  if(successful&&(!n.output||typeof n.output!=='object'||Array.isArray(n.output)))add('MALFORMED_OUTPUT','HIGH',n,'Successful advice lacks a structured output.');
  if(successful&&!(Array.isArray(n.provenance)?n.provenance:[]).some(x=>typeof x==='string'&&x.trim()))add('MISSING_PROVENANCE','MEDIUM',n,'Successful output has no recorded source label.','provenance');
  if(n.confidence!=null&&(typeof n.confidence!=='number'||!Number.isFinite(n.confidence)||n.confidence<0||n.confidence>1))add('INVALID_CONFIDENCE','HIGH',n,'Confidence is outside the numeric 0–1 contract.','confidence');
  if(o.authority&&o.authority!=='RECOMMENDATION_ONLY')add('AUTHORITY_OVERCLAIM','HIGH',n,'An advisory output asserts an unsupported execution authority.');
  if(n.status==='WAITING_CONFIRMATION'&&(n.failure||['FAILED','UNAVAILABLE','BLOCKED'].includes(n.result_status)))add('FAILED_OUTPUT_AWAITING_APPROVAL','HIGH',n,'Failed or unavailable output must not be treated as successful advice awaiting approval.','status');
  if(n.status==='SUCCESS'&&n.failure)add('SUCCESS_WITH_FAILURE','HIGH',n,'The node records success and a failure simultaneously.','status');
  if(n.responsible_agent==='business-analytics-agent'&&successful){
   const source=object(i.snapshot),counts=object(o.counts);
   if(!source.counts)add('MISSING_METRIC_SOURCE','HIGH',n,'The report has no saved metric snapshot to check.');
   else if(JSON.stringify(counts)!==JSON.stringify(source.counts))add('COUNTS_DIFFER_FROM_SOURCE','HIGH',n,'Reported counts differ from the saved source snapshot.','output.counts');
   const mapping={requestToAccepted:['accepted','viewings'],requestToCompleted:['completed','viewings'],searchToSelection:['selected_searches','searches']};
   for(const [key,[num,den]] of Object.entries(mapping)){const r=object(o.conversion?.[key]),numerator=counts[num],denominator=counts[den];const expected=denominator?Number((100*numerator/denominator).toFixed(2)):null;
    if(!Number.isSafeInteger(numerator)||!Number.isSafeInteger(denominator)||numerator<0||denominator<0||numerator>denominator||r.numerator!==numerator||r.denominator!==denominator||r.percent!==expected)add('INVALID_CONVERSION','HIGH',n,`The ${key} ratio does not reconcile to its counts.`,`output.conversion.${key}`);
   }
   if(source.finance&&JSON.stringify(o.finance)!==JSON.stringify(source.finance))add('FINANCE_DIFFERS_FROM_SOURCE','HIGH',n,'Reported financial groups differ from the saved source snapshot.','output.finance');
  }
  if(n.responsible_agent==='friction-hunter-agent'&&successful)for(const f of list(o.findings)){const count=i.snapshot?.counts?.[f.category];if(!Number.isSafeInteger(count)||count<=0||f.count!==count)add('UNSUPPORTED_FRICTION_COUNT','HIGH',n,'A finding does not reconcile to a positive saved source count.','output.findings');}
  if(n.responsible_agent==='lead-qualification-agent'&&successful)for(const a of list(o.assessments))if(a.status==='MATCHED'){
   const p=list(i.properties).find(p=>p.id===a.listingId),pref=object(i.preferences);
   if(!p||!pref.city||!pref.budget||!pref.goal||p.price>pref.budget||String(p.location?.city).toLowerCase()!==String(pref.city).toLowerCase()||(p.transactionType==='sale'?'buy':'rent')!==pref.goal||(pref.bedrooms!=null&&p.property?.bedrooms!==pref.bedrooms))add('UNSUPPORTED_PROPERTY_MATCH','HIGH',n,'A matched property contradicts or lacks the saved qualification inputs.','output.assessments');
  }
  if(n.responsible_agent==='scheduling-agent'&&successful){const option=list(i.options).find(x=>x.resourceId===o.resource_id&&x.start===o.recommended_start&&x.end===o.recommended_end);if(!option||option.availabilityConfirmed!==true||option.hardConstraintsSatisfied!==true)add('UNSUPPORTED_SLOT','HIGH',n,'The recommended slot lacks a matching confirmed input option.');}
  if(n.responsible_agent==='mobility-agent'&&o.recommended_candidate&&!list(i.candidates).some(c=>c.id===o.recommended_candidate.id))add('UNSUPPORTED_DRIVER','HIGH',n,'The recommended driver is absent from the supplied candidate set.');
  if(n.responsible_agent==='transaction-agent'&&i.recordedPayment&&successful&&(o.amount!==i.recordedPayment.amount||o.paymentStatus!==i.recordedPayment.status||o.currency!==i.recordedPayment.currency))add('PAYMENT_DIFFERS_FROM_SOURCE','HIGH',n,'The payment summary contradicts its recorded input.');
  if(n.responsible_agent==='rideplate-agent'&&successful&&!list(i.options).some(x=>x.merchantId===o.merchant_id&&x.authoritativeTotal===o.authoritative_total&&x.inventoryConfirmed&&x.priceConfirmed))add('UNSUPPORTED_COMMERCE_QUOTE','HIGH',n,'The commerce recommendation has no matching confirmed price and inventory input.');
 }
 for(const observation of list(s.currentChecks))findings.push({...observation,evidence:{workflowId:s.id,version:s.version,journeyHash:s.hash,nodeId:observation.nodeId,sourceId:observation.sourceId}});
 if(s.status==='COMPLETED'&&nodes.some(n=>!['SUCCESS','SKIPPED','CANCELLED'].includes(n.status)))add('INCOMPLETE_COMPLETION','HIGH',null,'The assessment is marked completed while a node is not complete.','status');
 findings.sort((a,b)=>(a.severity==='HIGH'?0:1)-(b.severity==='HIGH'?0:1)||a.code.localeCompare(b.code));
 return {schema_version:'1.0',agent:'ai-critic-agent',status:'SUCCESS',data:{authority:'RECOMMENDATION_ONLY',sourceAssessment:{id:s.id,version:s.version,hash:s.hash,createdAt:s.createdAt},generatedAt:s.generatedAt,checkedNodes:nodes.length,findings,verdict:findings.some(f=>f.severity==='HIGH')?'REVIEW_REQUIRED':findings.length?'STALE_OR_INCOMPLETE_EVIDENCE':'NO_ISSUE_DETECTED_BY_IMPLEMENTED_CHECKS',coverage:['Node state, source labels and confidence range','Saved analytics arithmetic and snapshot consistency','Saved property, slot, driver, payment and commerce input consistency','Selected current payment, property, preference, slot and stock checks'],limitations:['This is a deterministic consistency critic, not independent proof that every statement is true.','A source label or matching saved input is not external verification.','Heuristic confidence values are not calibrated probabilities.','The source hash identifies the reviewed content; it is not a digital signature.','Current-state changes can make old advice stale without making the original advice incorrect.','Natural-language reasoning, legal evidence, driving safety and provider or registry truth are not independently evaluated. No automatic corrections are applied.']},confidence:null,source:['saved-assessment','scoped-current-records','critic-rules-v1'],timestamp:s.generatedAt,requires_confirmation:findings.length>0};
}
module.exports={execute};
