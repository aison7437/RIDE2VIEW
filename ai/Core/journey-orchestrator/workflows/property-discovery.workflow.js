function buildPropertyDiscoveryWorkflow(input={}) {
  const common={criticality:'critical',timeout:5000,retry_policy:{max_attempts:1}};
  return {
    name:'property-discovery',
    nodes:[
      {...common,node_id:'intent',type:'intent',responsible_agent:'lifestyle-agent',input:{...input}},
      {...common,node_id:'property-search',type:'property_search',responsible_agent:'property-agent',dependencies:['intent'],input:{...input}}
    ]
  };
}
module.exports={buildPropertyDiscoveryWorkflow};
