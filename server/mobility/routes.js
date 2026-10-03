function createMobilityRoutes({onboarding,rides}){return ({path,method,user,body,send,res})=>{
 if(path==='/api/mobility/dashboard'&&method==='GET'){send(200,onboarding.dashboard(user));return true;}
 if(path==='/api/driver/profile'&&['GET','PUT'].includes(method)){send(200,onboarding.profile(user,method==='PUT'?body:undefined));return true;}
 if(path==='/api/driver/availability'&&method==='PUT'){send(200,onboarding.availability(user,body));return true;}
 if(path==='/api/mobility/documents'&&method==='POST'){send(201,onboarding.document(user,body));return true;}
 let m=path.match(/^\/api\/mobility\/documents\/([^/]+)$/);
 if(m&&method==='GET'){const d=onboarding.readDocument(user,m[1]);res.writeHead(200,{'Content-Type':d.mime,'Content-Disposition':'attachment; filename="evidence.'+(d.mime==='application/pdf'?'pdf':d.mime==='image/png'?'png':'jpg')+'"','Content-Security-Policy':"sandbox; default-src 'none'"});res.end(Buffer.from(d.content));return true;}
 m=path.match(/^\/api\/mobility\/checks\/(driver|women_driver|women_rider|student)\/submit$/);
 if(m&&method==='POST'){send(200,onboarding.submit(user,m[1],body));return true;}
 m=path.match(/^\/api\/admin\/mobility-reviews\/([^/]+)\/(driver|women_driver|women_rider|student)$/);
 if(m&&method==='POST'){send(200,onboarding.review(user,m[1],m[2],body));return true;}
 if(path==='/api/ride2go/pricing'&&['GET','POST'].includes(method)){send(method==='POST'?201:200,rides.policy(user,method==='POST'?body:undefined));return true;}
 if(path==='/api/ride2go/trips'&&['GET','POST'].includes(method)){const r=method==='POST'?rides.create(user,body):{trips:rides.list(user)};send(method==='POST'&&!r.duplicate?201:200,r);return true;}
 m=path.match(/^\/api\/ride2go\/trips\/([^/]+)$/);if(m&&method==='GET'){send(200,rides.get(user,m[1]));return true;}
 m=path.match(/^\/api\/ride2go\/trips\/([^/]+)\/(quote|accept|verify|offer|cancel|refund|resetCode|arrive|start|complete)$/);
 if(m&&method==='POST'){const [id,action]=m.slice(1);send(200,['arrive','start','complete'].includes(action)?rides.transition(user,id,action,body):rides[action](user,id,body));return true;}
 m=path.match(/^\/api\/ride2go\/assignments\/([^/]+)\/respond$/);if(m&&method==='POST'){send(200,rides.respond(user,m[1],body));return true;}
 return false;
};}
module.exports={createMobilityRoutes};
