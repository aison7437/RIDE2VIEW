function createSupplyRoutes({supply,cancellationCoordinator}) {
  return function route({path,method,user,body,send,res}) {
    if(path==='/api/agent/dashboard'&&method==='GET'){send(200,supply.dashboard(user));return true;}
    if(path==='/api/agent/profile'&&method==='PUT'){send(200,supply.saveProfile(user,body));return true;}
    if(path==='/api/supply/documents'&&method==='POST'){send(201,supply.document(user,body));return true;}
    let match=path.match(/^\/api\/supply\/documents\/([^/]+)$/);
    if(match&&method==='GET'){const d=supply.readDocument(user,match[1]);res.writeHead(200,{'Content-Type':d.mime,'Content-Disposition':'attachment; filename="document.'+(d.mime==='application/pdf'?'pdf':d.mime==='image/png'?'png':'jpg')+'"','Content-Security-Policy':"sandbox; default-src 'none'"});res.end(Buffer.from(d.content));return true;}
    match=path.match(/^\/api\/supply\/checks\/(identity|agency|marketing|ownership|publication)\/([^/]+)\/submit$/);
    if(match&&method==='POST'){send(200,supply.submit(user,match[1],match[2],body));return true;}
    if(path==='/api/admin/supply-reviews'&&method==='GET'){send(200,{reviews:supply.queue(user)});return true;}
    match=path.match(/^\/api\/admin\/supply-reviews\/(identity|agency|marketing|ownership|publication)\/([^/]+)$/);
    if(match&&method==='POST'){send(200,supply.review(user,match[1],match[2],body));return true;}
    match=path.match(/^\/api\/properties\/([^/]+)\/(media|slots)$/);
    if(match&&method==='GET'&&match[2]==='slots'){send(200,{slots:supply.slots(match[1],user)});return true;}
    if(match&&method==='POST'){send(201,match[2]==='media'?supply.addMedia(user,match[1],body):supply.addSlot(user,match[1],body));return true;}
    match=path.match(/^\/api\/properties\/([^/]+)\/(media|slots)\/([^/]+)$/);
    if(match&&method==='DELETE'){send(200,match[2]==='media'?supply.removeMedia(user,match[1],match[3]):supply.disableSlot(user,match[1],match[3]));return true;}
    if(path==='/api/viewing-requests'&&method==='GET'){send(200,{viewings:supply.requests(user)});return true;}
    if(path==='/api/viewing-requests'&&method==='POST'){const result=supply.requestViewing(user,body);send(result.duplicate?200:201,result);return true;}
    match=path.match(/^\/api\/viewing-requests\/([^/]+)\/(accept|decline|reschedule|cancel|outcome)$/);
    if(match&&method==='POST'){
      const [id,action]=match.slice(1);let result;
      if(action==='accept')result=supply.acceptViewing(user,id);
      if(action==='decline')result=supply.declineViewing(user,id,body);
      if(action==='reschedule')result=supply.rescheduleViewing(user,id,body);
      if(action==='outcome')result=supply.outcome(user,id,body);
      if(action==='cancel'){
        const v=supply.getRequest(id,user);
        try{result=v.booking_id?cancellationCoordinator.cancel({bookingId:v.booking_id,actor:user}):supply.cancelPending(user,id,body);}catch(error){if(error.code==='BOOKING_NOT_CANCELLABLE')error.status=409;throw error;}
        // Read-through synchronizes request status with the coordinator's durable booking state.
        supply.requests(user);
      }
      send(200,result);return true;
    }
    if(path==='/api/agent/leads'&&method==='GET'){send(200,{leads:supply.leads(user)});return true;}
    match=path.match(/^\/api\/viewing-requests\/([^/]+)\/review$/);
    if(match&&method==='POST'){send(201,supply.reviewAgent(user,match[1],body));return true;}
    if(path==='/api/agent/commissions'&&method==='GET'){send(200,{commissions:supply.commissions(user)});return true;}
    match=path.match(/^\/api\/admin\/commissions\/requests\/([^/]+)$/);
    if(match&&method==='POST'){send(201,supply.recordCommission(user,match[1],body));return true;}
    match=path.match(/^\/api\/admin\/commissions\/([^/]+)$/);
    if(match&&method==='PATCH'){send(200,supply.updateCommission(user,match[1],body));return true;}
    match=path.match(/^\/api\/agent\/leads\/([^/]+)$/);
    if(match&&method==='PATCH'){send(200,supply.updateLead(user,match[1],body));return true;}
    if(path==='/api/customer/profile'&&['GET','PUT'].includes(method)){const p=supply.profile(user,method==='PUT'?body:undefined);send(200,{...p,preferences:JSON.parse(p.preferences)});return true;}
    if(path==='/api/customer/saved-properties'&&method==='GET'){send(200,{properties:supply.saved(user)});return true;}
    match=path.match(/^\/api\/customer\/saved-properties\/([^/]+)$/);
    if(match&&['PUT','DELETE'].includes(method)){send(200,supply.saveProperty(user,match[1],method==='PUT'));return true;}
    return false;
  };
}
module.exports={createSupplyRoutes};
