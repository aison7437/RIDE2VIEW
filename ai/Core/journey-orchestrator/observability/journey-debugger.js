function buildJourneyDebugView(journey){
  const root=journey.nodes.find(n=>n.status==='FAILED');
  return {
    journey_id:journey.journey_id,
    nodes:journey.nodes.map(n=>({node_id:n.node_id,agent:n.responsible_agent,status:n.status,attempts:n.attempts,failure:n.failure||null})),
    root_failure:root?{node_id:root.node_id,agent:root.responsible_agent,failure:root.failure}:null
  };
}
module.exports={buildJourneyDebugView};