function createMarketplaceRoutes({marketplace}){
 return function route({path,method,user,body,send}){
  if(path==='/api/marketplace/earnings'&&method==='GET'){send(200,{earnings:marketplace.earnings(user)});return true;}
  if(path==='/api/admin/marketplace/earnings'&&method==='POST'){send(201,marketplace.earn(user,body));return true;}
  let m=path.match(/^\/api\/admin\/marketplace\/earnings\/([^/]+)\/payout$/);if(m&&method==='POST'){send(200,marketplace.payout(user,m[1],body));return true;}
  if(path==='/api/subscriptions/plans'&&method==='GET'){send(200,{plans:marketplace.plans()});return true;}
  if(path==='/api/admin/subscriptions/plans'&&method==='POST'){send(201,marketplace.createPlan(user,body));return true;}
  if(path==='/api/subscriptions'&&method==='GET'){send(200,{subscriptions:marketplace.subscriptions(user)});return true;}
  if(path==='/api/subscriptions'&&method==='POST'){send(201,marketplace.subscribe(user,body));return true;}
  m=path.match(/^\/api\/admin\/subscriptions\/([^/]+)\/activate$/);if(m&&method==='POST'){send(200,marketplace.activate(user,m[1],body));return true;}
  return false;
 };
}
module.exports={createMarketplaceRoutes};
