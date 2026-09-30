const lifestyle = require('../../../user/lifestyle-agent');
const propertyIntelligence = require('../../../property/property-intelligence-agent');
const mobilityIntelligence = require('../../../mobility/mobility-intelligence-agent');
const transactionIntelligence = require('../../../transaction/transaction-intelligence-agent');
const trustSafetyIntelligence = require('../../../trust-safety/trust-safety-intelligence-agent');
const logisticsIntelligence = require('../../../logistics/logistics-intelligence-agent');
function unavailable(name){return {name,async execute(task){return {schema_version:'1.0',task_id:task.task_id,journey_id:task.journey_id,agent:name,status:'UNAVAILABLE',data:{},confidence:null,source:[],timestamp:new Date().toISOString(),warnings:['Agent not implemented'],requires_confirmation:false,error:{code:'NOT_IMPLEMENTED'}};},async healthCheck(){return {status:'UNAVAILABLE'};}};}
function createRegistry(overrides={}){
  const lifestyleAdapter={name:'lifestyle-agent',async execute(task,context){const result=await lifestyle.runLifestyleAgent(task.input||{},context||{});return {schema_version:'1.0',task_id:task.task_id,journey_id:task.journey_id,agent:'lifestyle-agent',status:result?.success===false?'FAILED':'SUCCESS',data:result,confidence:null,source:['lifestyle-agent'],timestamp:new Date().toISOString(),warnings:[],requires_confirmation:false,error:result?.success===false?{code:'LIFESTYLE_FAILED'}:null};},async healthCheck(){return {status:'OK'};}};
  const base={
    'lifestyle-agent':lifestyleAdapter,
    'property-agent':propertyIntelligence,
    'mobility-agent':mobilityIntelligence,
    'transaction-agent':transactionIntelligence,
    'scheduling-agent':unavailable('scheduling-agent'),
    'trust-safety-agent':trustSafetyIntelligence,
    'logistics-agent':logisticsIntelligence,
    'rideplate-agent':unavailable('rideplate-agent'),
    'support-agent':unavailable('support-agent')
  };
  return {...base,...overrides};
}
module.exports={createRegistry};
