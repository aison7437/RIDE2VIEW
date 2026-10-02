const test=require('node:test');const assert=require('node:assert/strict');
const {JourneyOrchestrator}=require('../ai/Core/journey-orchestrator');
const {validateGraph}=require('../ai/Core/journey-orchestrator/graph/journey-graph');
function ok(name,data={}){return {name,async execute(task){return {schema_version:'1.0',task_id:task.task_id,journey_id:task.journey_id,agent:name,status:'SUCCESS',data,confidence:1,source:[name],timestamp:new Date().toISOString(),warnings:[],requires_confirmation:false,error:null};}};}
function fail(name,code='FAILED'){return {name,async execute(task){return {schema_version:'1.0',task_id:task.task_id,journey_id:task.journey_id,agent:name,status:'FAILED',data:{},confidence:null,source:[name],timestamp:new Date().toISOString(),warnings:[],requires_confirmation:false,error:{code}};}};}
test('graph rejects cycles',()=>{assert.throws(()=>validateGraph({nodes:[{node_id:'a',dependencies:['b']},{node_id:'b',dependencies:['a']}]}),/cycle/);});
test('property viewing journey completes with authoritative adapters',async()=>{
 const adapters={'lifestyle-agent':ok('lifestyle-agent'),'property-agent':ok('property-agent'),'scheduling-agent':ok('scheduling-agent'),'transaction-agent':ok('transaction-agent'),'mobility-agent':ok('mobility-agent')};
 const o=new JourneyOrchestrator({adapters});const j=await o.run({message:'Find a 2 bedroom in Nairobi'});
 assert.equal(j.completed,true);assert(j.nodes.every(n=>n.status==='SUCCESS'));assert.equal(j.debug.root_failure,null);
});
test('critical failure blocks contaminated downstream nodes and preserves provenance',async()=>{
 const adapters={'lifestyle-agent':ok('lifestyle-agent'),'property-agent':fail('property-agent','LISTING_UNAVAILABLE'),'scheduling-agent':ok('scheduling-agent'),'transaction-agent':ok('transaction-agent'),'mobility-agent':ok('mobility-agent')};
 const o=new JourneyOrchestrator({adapters});const j=await o.run({message:'Find a property'});
 assert.equal(j.nodes.find(n=>n.node_id==='property-search').status,'FAILED');
 assert.equal(j.nodes.find(n=>n.node_id==='availability').status,'BLOCKED');
 assert.equal(j.nodes.find(n=>n.node_id==='payment').status,'BLOCKED');
 assert.equal(j.debug.root_failure.failure.code,'LISTING_UNAVAILABLE');
});
test('property discovery workflow stops before transactional nodes',async()=>{
 const adapters={'lifestyle-agent':ok('lifestyle-agent'),'property-agent':ok('property-agent',{properties:[{id:'P1'}]})};
 const o=new JourneyOrchestrator({adapters});const j=await o.run({workflow:'property-discovery',message:'Find a property'});
 assert.equal(j.completed,true);
 assert.deepEqual(j.nodes.map(n=>n.node_id),['intent','property-search']);
 assert.equal(j.nodes.some(n=>['booking','payment','driver','complete'].includes(n.node_id)),false);
});

test('search adapter exposes Lifestyle Agent context while preserving read-only discovery',async()=>{
 const {searchProperties}=require('../ai/Core/journey-orchestrator/search-adapter');
 const properties=[{id:'P1',title:'Kilimani 2 bedroom',price:45000,location:{city:'Nairobi'},property:{bedrooms:2},available:true}];
 const result=await searchProperties({message:'Find a 2 bedroom property in Kilimani',budget:50000,location:{city:'Nairobi',country:'Kenya'},properties,propertyOpportunities:properties});
 assert.equal(result.success,true);
 assert.equal(result.lifestyleContext.authority,'RECOMMENDATION_ONLY');
 assert.equal(result.lifestyleContext.constraints.budget,50000);
 assert.equal(result.lifestyleContext.constraints.location.city,'Nairobi');
 assert(result.lifestyleContext.recommended_capabilities.some(x=>x.agent==='property-agent'));
 assert.equal(result.recommendations.length,1);
 assert.match(result.journeyId,/^JRN-/);
});
