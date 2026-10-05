async function execute(task={}) {
  const {preferences={},properties=[]}=task.input||{};
  const missing=['city','budget','goal'].filter(k=>preferences[k]===undefined||preferences[k]===null||preferences[k]==='');
  const assessments=properties.map(p=>{
    const reasons=[];
    if(preferences.city&&String(p.location?.city||'').toLowerCase()!==String(preferences.city).toLowerCase())reasons.push('CITY_MISMATCH');
    if(preferences.budget!=null&&Number(p.price)>preferences.budget)reasons.push('OVER_BUDGET');
    if(preferences.goal&&(p.transactionType==='sale'?'buy':'rent')!==preferences.goal)reasons.push('GOAL_MISMATCH');
    if(preferences.bedrooms!=null&&Number(p.property?.bedrooms)!==preferences.bedrooms)reasons.push('BEDROOM_MISMATCH');
    return {listingId:p.id,title:p.title,status:missing.length?'NEEDS_PROFILE':reasons.length?'NOT_MATCHED':'MATCHED',reasons};
  });
  return {schema_version:'1.0',agent:'lead-qualification-agent',status:'SUCCESS',data:{authority:'RECOMMENDATION_ONLY',summary:missing.length?'Complete your profile before assessing fit.':'Compared your stated preferences with published properties.',missing,assessments,limitations:['Preference fit is not credit approval, affordability certification or permission to book.']},confidence:null,source:['customer-stated-preferences','published-properties'],timestamp:new Date().toISOString(),requires_confirmation:false};
}
module.exports={execute};
