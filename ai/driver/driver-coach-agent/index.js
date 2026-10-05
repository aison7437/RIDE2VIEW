async function execute(task={}) {
  const i=task.input||{},actions=[];
  if(!i.verified)actions.push({action:'COMPLETE_DRIVER_REVIEW',reason:'Current driver eligibility is not confirmed.'});
  if(i.verified&&!i.online)actions.push({action:'REVIEW_ONLINE_AVAILABILITY',reason:'Your account is offline. Go online only when ready to accept work.'});
  for(const check of i.expiringChecks||[])actions.push({action:'RENEW_DOCUMENT_REVIEW',reason:`${check.kind} review expires at ${check.expiresAt}.`});
  if(i.openOffers)actions.push({action:'REVIEW_OPEN_OFFERS',reason:`${i.openOffers} unexpired offer(s) await your decision. Review while safely parked.`});
  return {schema_version:'1.0',agent:'driver-coach-agent',status:'SUCCESS',data:{authority:'RECOMMENDATION_ONLY',summary:`${i.completedTrips||0} recorded completed trips.`,actions,earnings:i.earnings||{recorded:0,paid:0,currency:'KES'},limitations:['Earnings reflect recorded marketplace entries, not projected income or bank balances.','Battery telemetry, charging availability and driving-behaviour measurements are not connected. No battery range or driving-safety score is inferred.']},confidence:null,source:['own-driver-eligibility','own-trip-history','own-recorded-earnings'],timestamp:new Date().toISOString(),requires_confirmation:actions.length>0};
}
module.exports={execute};
