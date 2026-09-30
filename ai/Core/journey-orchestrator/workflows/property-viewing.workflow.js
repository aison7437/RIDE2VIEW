function buildPropertyViewingWorkflow(input={}){
  const common={criticality:'critical',timeout:5000,retry_policy:{max_attempts:1}};
  return {name:'property-viewing',nodes:[
    {...common,node_id:'intent',type:'intent',responsible_agent:'lifestyle-agent',input:{...input}},
    {...common,node_id:'property-search',type:'property_search',responsible_agent:'property-agent',dependencies:['intent'],input:{...input}},
    {...common,node_id:'availability',type:'availability_verification',responsible_agent:'property-agent',dependencies:['property-search'],input:{operation:'verify_availability'}},
    {...common,node_id:'booking',type:'viewing_booking',responsible_agent:'scheduling-agent',dependencies:['availability'],input:{operation:'book_viewing'}},
    {...common,node_id:'payment',type:'payment_verification',responsible_agent:'transaction-agent',dependencies:['booking'],input:{operation:'verify_payment'}},
    {...common,node_id:'driver',type:'driver_assignment',responsible_agent:'mobility-agent',dependencies:['payment'],input:{operation:'assign_driver'}},
    {...common,node_id:'complete',type:'viewing_completion',responsible_agent:'mobility-agent',dependencies:['driver'],input:{operation:'complete_viewing'}}
  ]};
}
module.exports={buildPropertyViewingWorkflow};