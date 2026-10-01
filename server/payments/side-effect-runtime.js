const {randomUUID}=require('node:crypto');
function createSideEffectRuntime({outbox,intervalMs=5000,batchSize=20,workerId=randomUUID(),setIntervalFn=setInterval,clearIntervalFn=clearInterval}){
 let timer=null,running=false,stopped=true;
 function drain(){if(running||stopped)return [];running=true;try{return outbox.processDue({workerId,limit:batchSize});}finally{running=false;}}
 function start(){if(!stopped)return;stopped=false;drain();timer=setIntervalFn(drain,intervalMs);timer?.unref?.();}
 function stop(){stopped=true;if(timer){clearIntervalFn(timer);timer=null;}}
 return {start,stop,drain,get running(){return running;},get workerId(){return workerId;}};
}
module.exports={createSideEffectRuntime};
