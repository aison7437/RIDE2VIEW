const lifestyle = require('../../../user/lifestyle-agent');
const propertyIntelligence = require('../../../property/property-intelligence-agent');
const mobilityIntelligence = require('../../../mobility/mobility-intelligence-agent');
const transactionIntelligence = require('../../../transaction/transaction-intelligence-agent');
const trustSafetyIntelligence = require('../../../trust-safety/trust-safety-intelligence-agent');
const logisticsIntelligence = require('../../../logistics/logistics-intelligence-agent');
const rideplateCommerceIntelligence = require('../../../commerce/rideplate-commerce-intelligence-agent');
const schedulingIntelligence = require('../../../scheduling/scheduling-intelligence-agent');
const supportRecovery = require('../../../support/support-recovery-agent');
const opportunityIntelligence = require('../../../opportunity/opportunity-intelligence-agent');
const experiencesIntelligence = require('../../../experiences/experiences-intelligence-agent');
function unavailable(name){return {name,async execute(task){return {schema_version:'1.0',task_id:task.task_id,journey_id:task.journey_id,agent:name,status:'UNAVAILABLE',data:{},confidence:null,source:[],timestamp:new Date().toISOString(),warnings:['Agent not implemented'],requires_confirmation:false,error:{code:'NOT_IMPLEMENTED'}};},async healthCheck(){return {status:'UNAVAILABLE'};}};}
function createRegistry(overrides={}){
  const base={
    'memory-learning-agent':require('../../../core/memory-learning-agent'),
    'ai-critic-agent':require('../../../core/ai-critic-agent'),
    'data-quality-agent':require('../../../core/data-quality-agent'),
    'business-analytics-agent':require('../../../business/business-analytics-agent'),
    'friction-hunter-agent':require('../../../business/friction-hunter-agent'),
    'agent-assistant':require('../../../property/agent-assistant'),
    'lead-qualification-agent':require('../../../user/lead-qualification-agent'),
    'driver-coach-agent':require('../../../driver/driver-coach-agent'),
    'lifestyle-agent':lifestyle,
    'property-agent':propertyIntelligence,
    'mobility-agent':mobilityIntelligence,
    'transaction-agent':transactionIntelligence,
    'scheduling-agent':schedulingIntelligence,
    'trust-safety-agent':trustSafetyIntelligence,
    'logistics-agent':logisticsIntelligence,
    'rideplate-agent':rideplateCommerceIntelligence,
    'support-agent':supportRecovery,
    'opportunity-agent':opportunityIntelligence,
    'experiences-agent':experiencesIntelligence
  };
  return {...base,...overrides};
}
module.exports={createRegistry};
