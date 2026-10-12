function createRide2GoFeedbackRoutes({feedback}){
 return ({path,method,user,body,send})=>{
  const match=path.match(/^\/api\/ride2go\/trips\/([^/]+)\/feedback$/);
  if(!match)return false;
  if(method==='GET'){send(200,feedback.read(user,match[1]));return true;}
  if(method==='POST'){const r=feedback.submit(user,match[1],body);send(r.duplicate?200:201,r);return true;}
  return false;
 };
}
module.exports={createRide2GoFeedbackRoutes};
