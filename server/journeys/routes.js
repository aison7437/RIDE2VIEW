function createJourneyRoutes({journeys}){return ({path,method,user,body,send})=>{
 if(path==='/api/customer/details'&&['GET','PUT'].includes(method)){send(200,journeys.details(user,method==='PUT'?body:undefined));return true;}
 if(path==='/api/customer/credits'&&method==='GET'){send(200,journeys.wallet(user));return true;}
 if(path==='/api/journeys/pricing'&&['GET','POST'].includes(method)){send(method==='POST'?201:200,journeys.policy(user,method==='POST'?body:undefined));return true;}
 if(path==='/api/journeys'&&['GET','POST'].includes(method)){const r=method==='POST'?journeys.create(user,body):{journeys:journeys.list(user)};send(method==='POST'&&!r.duplicate?201:200,r);return true;}
 let m=path.match(/^\/api\/journeys\/([^/]+)$/);if(m&&method==='GET'){send(200,journeys.get(user,m[1]));return true;}
 m=path.match(/^\/api\/journeys\/([^/]+)\/(quote|accept|cancel|reschedule|start|finish|refund)$/);if(m&&method==='POST'){const [id,action]=m.slice(1);const result=['start','finish'].includes(action)?journeys.transport(user,id,action):journeys[action==='refund'?'settleRefund':action](user,id,body);send(200,result);return true;}
 m=path.match(/^\/api\/journeys\/([^/]+)\/stops\/(\d+)\/(confirm|complete)$/);if(m&&method==='POST'){send(200,journeys[m[3]==='confirm'?'agentConfirm':'stopComplete'](user,m[1],Number(m[2]),body));return true;}
 return false;
};}
module.exports={createJourneyRoutes};
