// Deterministic assistance based only on the owning agent's supplied records.
async function execute(task={}) {
  const {properties=[],leads=[]}=task.input||{};
  const actions=[];
  for(const p of properties) {
    if(!p.published)actions.push({listingId:p.id,action:'COMPLETE_PUBLICATION_REVIEW',reason:'Property is not currently published.'});
    if(!p.photoCount)actions.push({listingId:p.id,action:'ADD_PROPERTY_PHOTOS',reason:'No property photos recorded.'});
    if(!p.futureSlots)actions.push({listingId:p.id,action:'ADD_VIEWING_AVAILABILITY',reason:'No future enabled slots recorded.'});
  }
  for(const l of leads)if(['VIEWED','FOLLOW_UP','NEGOTIATING'].includes(l.stage))actions.push({requestId:l.requestId,action:'REVIEW_LEAD_FOLLOW_UP',reason:`Lead is ${l.stage.toLowerCase().replaceAll('_',' ')}. Use the authorized lead workflow.`});
  return {schema_version:'1.0',agent:'agent-assistant',status:'SUCCESS',data:{authority:'RECOMMENDATION_ONLY',summary:`Reviewed ${properties.length} properties and ${leads.length} leads.`,actions,limitations:['No customer contact is sent. Publication and lead changes require their existing review flows.']},confidence:null,source:['owned-property-records','owned-lead-stages'],timestamp:new Date().toISOString(),requires_confirmation:actions.length>0};
}
module.exports={execute};
