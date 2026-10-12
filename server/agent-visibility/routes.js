function createAgentVisibilityRoutes({visibility,supply}){
 return ({path,method,user,body,send})=>{
  if(path==='/api/agent-visibility/plans'&&method==='GET'){send(200,{plans:visibility.plans()});return true;}
  if(path==='/api/agent-visibility/mine'&&method==='GET'){send(200,visibility.mine(user));return true;}
  if(path==='/api/agent-visibility/subscriptions'&&method==='POST'){send(201,visibility.subscribe(user,body));return true;}
  let m=path.match(/^\/api\/agent-visibility\/subscriptions\/([^/]+)\/cancel$/);
  if(m&&method==='POST'){send(200,visibility.cancel(user,m[1]));return true;}
  m=path.match(/^\/api\/admin\/agent-visibility\/subscriptions\/([^/]+)\/activate$/);
  if(m&&method==='POST'){send(200,visibility.activate(user,m[1],body));return true;}
  m=path.match(/^\/api\/agent-visibility\/properties\/([^/]+)\/featured$/);
  if(m&&method==='PUT'){send(200,visibility.feature(user,m[1],body.featured===true));return true;}
  return false;
 };
}
module.exports={createAgentVisibilityRoutes};
