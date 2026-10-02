const { JourneyOrchestrator } = require('./index');

function toLegacySearchResponse(journey) {
  const node=journey.nodes.find(item=>item.node_id==='property-search');
  const intentNode=journey.nodes.find(item=>item.node_id==='intent');
  if(!node || node.status!=='SUCCESS') {
    return {
      success:false,
      recommendations:[],
      summary:'Property discovery could not be completed.',
      journeyId:journey.journey_id,
      lifestyleContext:intentNode?.status==='SUCCESS'?intentNode.output:null
    };
  }
  const properties=Array.isArray(node.output?.properties)?node.output.properties:[];
  return {
    success:true,
    recommendations:properties,
    summary:properties.length
      ? `Found ${properties.length} matching propert${properties.length===1?'y':'ies'}.`
      : 'No matching properties found.',
    journeyId:journey.journey_id,
    lifestyleContext:intentNode?.status==='SUCCESS'?intentNode.output:null
  };
}

async function searchProperties(input={},options={}) {
  const orchestrator=new JourneyOrchestrator(options);
  const journey=await orchestrator.run({...input,workflow:'property-discovery'});
  return toLegacySearchResponse(journey);
}

module.exports={searchProperties,toLegacySearchResponse};
