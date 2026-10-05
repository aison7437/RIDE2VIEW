async function execute(task={}) {
 const snapshot=task.input?.memoryState;
 if(!snapshot)return {status:'UNAVAILABLE',data:{authority:'RECOMMENDATION_ONLY'},source:[],error:{code:'MEMORY_SNAPSHOT_REQUIRED'}};
 return {schema_version:'1.0',agent:'memory-learning-agent',status:'SUCCESS',data:{authority:'RECOMMENDATION_ONLY',...snapshot,summary:snapshot.enabled?`${snapshot.exclusions.length} explicit property exclusions; ${snapshot.feedback.HELPFUL} helpful and ${snapshot.feedback.NOT_HELPFUL} not-helpful assessments recorded.`:'Memory is off. Enable it to save explicit feedback and property exclusions.',learningMethod:'Explicit exclusion rules and feedback counts; no model training or autonomous policy changes.'},confidence:null,source:['account-memory-v1'],timestamp:snapshot.generatedAt,requires_confirmation:false};
}
module.exports={execute};
