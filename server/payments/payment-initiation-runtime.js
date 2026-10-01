const {randomUUID}=require('node:crypto');

function createPaymentInitiationRuntime({authority,intervalMs=5000,batchSize=20,workerId=randomUUID(),setIntervalFn=setInterval,clearIntervalFn=clearInterval}){
  let timer=null,running=false,stopped=true;
  function drain(){
    if(running||stopped)return [];
    running=true;
    const results=[];
    try{
      for(let i=0;i<batchSize;i++){
        try{
          const result=authority.processNext({workerId});
          if(!result)break;
          results.push({ok:true,result});
        }catch(error){
          results.push({ok:false,error});
        }
      }
      return results;
    }finally{running=false;}
  }
  function start(){
    if(!stopped)return;
    stopped=false;
    drain();
    timer=setIntervalFn(drain,intervalMs);
    timer?.unref?.();
  }
  function stop(){
    stopped=true;
    if(timer){clearIntervalFn(timer);timer=null;}
  }
  return {start,stop,drain,get running(){return running;},get workerId(){return workerId;}};
}

module.exports={createPaymentInitiationRuntime};
