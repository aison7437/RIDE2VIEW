const rules=[
 ['stalled_requests','MEDIUM','Review agent availability and the pending viewing request.'],
 ['expired_holds','HIGH','Inspect payment and reservation evidence before expiring or rebooking the hold.'],
 ['expired_requests','MEDIUM','Review why requests expired and whether customers need a new available slot.'],
 ['dispatch_failures','HIGH','Inspect the offer and current trip state before considering reassignment.'],
 ['awaiting_driver','HIGH','Review eligible driver supply for paid viewings without a live assignment.'],
 ['support','HIGH','Triage unresolved cases; prioritize recorded high-severity incidents.'],
 ['refunds','HIGH','Reconcile actual refund evidence; do not repeat a transfer based on this report.'],
 ['provider_review','HIGH','Use the existing reconciliation workflow to establish the provider outcome.'],
 ['cancelled_transport','MEDIUM','Inspect cancellation records; no cancellation cause is inferred.'],
 ['no_selection','LOW','Investigate search relevance and selection usability. This is not proof of abandonment.']
];
async function execute(task={}){
 const s=task.input?.snapshot;if(!s)return {status:'UNAVAILABLE',data:{authority:'RECOMMENDATION_ONLY'},source:[],requires_confirmation:false,error:{code:'SERVER_SNAPSHOT_REQUIRED'}};
 const findings=rules.filter(([key])=>s.counts[key]>0).map(([key,severity,action])=>({category:key,severity,title:s.labels[key],count:s.counts[key],evidence:{category:key,from:s.period.from,to:s.period.to},suggestedAction:action})).sort((a,b)=>({HIGH:3,MEDIUM:2,LOW:1}[b.severity]-{HIGH:3,MEDIUM:2,LOW:1}[a.severity])||b.count-a.count||a.category.localeCompare(b.category));
 return {schema_version:'1.0',agent:'friction-hunter-agent',status:'SUCCESS',data:{authority:'RECOMMENDATION_ONLY',period:s.period,generatedAt:s.generatedAt,findings,thresholds:{pendingRequestHours:24,paidWithoutDriverMinutes:30,staleSupportHours:24,noSelectionHours:24},limitations:['Rules identify records to investigate, not proven causes or automated remediation.','Findings can overlap; do not sum counts as unique affected customers.',...s.limitations]},confidence:null,source:['server-analytics-snapshot-v1','friction-review-rules-v1'],timestamp:s.generatedAt,requires_confirmation:findings.length>0};
}
module.exports={execute};
