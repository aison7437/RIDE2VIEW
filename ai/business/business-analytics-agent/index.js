async function execute(task={}){
 const s=task.input?.snapshot;
 if(!s)return {status:'UNAVAILABLE',data:{authority:'RECOMMENDATION_ONLY'},source:[],requires_confirmation:false,error:{code:'SERVER_SNAPSHOT_REQUIRED'}};
 const v=s.counts,percent=(n,d)=>d?Number((100*n/d).toFixed(2)):null;
 return {schema_version:'1.0',agent:'business-analytics-agent',status:'SUCCESS',data:{authority:'RECOMMENDATION_ONLY',period:s.period,generatedAt:s.generatedAt,counts:v,conversion:{requestToAccepted:{numerator:v.accepted,denominator:v.viewings,percent:percent(v.accepted,v.viewings)},requestToCompleted:{numerator:v.completed,denominator:v.viewings,percent:percent(v.completed,v.viewings)},searchToSelection:{numerator:v.selected_searches,denominator:v.searches,percent:percent(v.selected_searches,v.searches)}},finance:s.finance,performance:s.performance,tracking:s.tracking,limitations:s.limitations},confidence:null,source:['server-analytics-snapshot-v1'],timestamp:s.generatedAt,requires_confirmation:false};
}
module.exports={execute};
