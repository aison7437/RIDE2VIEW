const {createJobs}=require('./jobs');
const {createCollections}=require('./collections');
const {createCommunications}=require('./communications');
const {createFinance}=require('./finance');
const {createTracking}=require('./tracking');
const {role,fail}=require('./common');
function createOperations({db,integrations={},paymentAuthority,rides,services,journeys,dispatchAuthority,audit}){
 const {gateway,callbackSecret,maps}=integrations;const capabilities=integrations.capabilities||{payments:true,refunds:true,messaging:true,fiscal:true};const enabled=j=>Boolean(gateway&&capabilities[j.kind==='payment.collect'?'payments':j.kind==='payment.refund'?'refunds':j.kind==='fiscal.submit'?'fiscal':'messaging']);let collections,communications,finance;
 const jobs=createJobs({db,gateway,audit,enabled,prepare:j=>j.kind==='payment.collect'?collections.prepare(j):j.kind.startsWith('message.')?communications.prepare(j):true,settle:(j,result)=>{if(j.kind==='payment.collect')collections.acknowledged(j,result);else if(j.kind.startsWith('message.'))communications.acknowledged(j,result);else if(j.kind==='fiscal.submit')finance.acknowledged(j,result);else if(j.kind==='payment.refund')finance.refundAcknowledged(j,result);else fail(400,'Unknown integration job kind');}});
 collections=createCollections({db,jobs,connected:Boolean(gateway&&capabilities.payments),callbackSecret,paymentAuthority,rides,services,audit});communications=createCommunications({db,jobs,connected:Boolean(gateway&&capabilities.messaging),audit});finance=createFinance({db,jobs,connected:Boolean(gateway&&capabilities.fiscal),refundsConnected:Boolean(gateway&&capabilities.refunds),rides,services,journeys,audit});const tracking=createTracking({db,maps,audit});let timer=null,running=null,stopped=false;
 function scan(){communications.scan();finance.sync();finance.applyRefunds();tracking.cleanup();collections.recoverPending();}
 function tick(){if(running||stopped)return running||Promise.resolve();running=(async()=>{scan();await jobs.drain();collections.recoverPending();finance.applyRefunds();})().finally(()=>{running=null;});return running;}
 function start(){if(timer)return;stopped=false;timer=setInterval(()=>{void tick().catch(()=>{});},5000);timer.unref();}
 async function stop(){stopped=true;clearInterval(timer);timer=null;await jobs.stop();if(running)await running;}
 async function routes({path,method,user,body,send,req}){
 if(path==='/api/operations/capabilities'&&method==='GET'){role(user,'customer','agent','driver','admin');send(200,{payments:Boolean(gateway&&callbackSecret&&capabilities.payments),refunds:Boolean(gateway&&capabilities.refunds),messaging:Boolean(gateway&&capabilities.messaging),fiscal:Boolean(gateway&&capabilities.fiscal),maps:Boolean(maps)});return true;}
 if(path==='/api/operations/payment-events'&&method==='POST'){send(200,collections.receive(req.rawBody,req.headers));return true;}
 if(path==='/api/operations/collections'&&['GET','POST'].includes(method)){send(method==='POST'?201:200,method==='POST'?collections.request(user,body):{collections:collections.list(user),payable:collections.payable(user)});return true;}
 let m=path.match(/^\/api\/operations\/collections\/([^/]+)\/refund$/);if(m&&method==='POST'){send(200,collections.unappliedRefund(user,m[1],body));return true;}
 if(path==='/api/operations/payment-events'&&method==='GET'){role(user,'admin');send(200,{events:db.prepare('SELECT id,collection_id,status,error,created_at FROM collection_events ORDER BY created_at DESC LIMIT 500').all()});return true;}
 m=path.match(/^\/api\/operations\/payment-events\/([^/]+)\/retry$/);if(m&&method==='POST'){send(200,collections.retry(user,m[1]));return true;}
 if(path==='/api/operations/communications'&&['GET','PUT'].includes(method)){send(200,method==='PUT'?communications.configure(user,body):communications.preferences(user));return true;}
 if(path==='/api/operations/communications/verify'&&method==='POST'){send(200,communications.verify(user,body));return true;}
 m=path.match(/^\/api\/operations\/refunds\/([^/]+)\/retry$/);if(m&&method==='POST'){send(200,finance.retryRefund(user,m[1],body.reason));return true;}
 if(path==='/api/operations/refunds'&&method==='GET'){send(200,finance.refunds(user));return true;}
 m=path.match(/^\/api\/operations\/refunds\/(booking|ride2go|service)\/([^/]+)$/);if(m&&method==='POST'){send(200,finance.refund(user,m[1],m[2],body));return true;}
 if(path==='/api/operations/receipts'&&method==='GET'){send(200,{receipts:finance.list(user)});return true;}
 m=path.match(/^\/api\/operations\/receipts\/([^/]+)$/);if(m&&method==='GET'){send(200,finance.get(user,m[1]));return true;}
 m=path.match(/^\/api\/operations\/receipts\/([^/]+)\/fiscal$/);if(m&&method==='POST'){send(200,finance.document(user,m[1],body));return true;}
 if(path==='/api/operations/reconciliations'&&method==='GET'){send(200,{records:finance.reconciliations(user)});return true;}
 m=path.match(/^\/api\/operations\/reconciliations\/([^/]+)$/);if(m&&method==='POST'){send(200,finance.reconcile(user,m[1],body));return true;}
 if(path==='/api/operations/fiscal-policy'&&['GET','POST'].includes(method)){send(200,finance.policy(user,method==='POST'?body:undefined));return true;}
 if(path==='/api/operations/jobs'&&method==='GET'){send(200,{jobs:jobs.review(user)});return true;}
 m=path.match(/^\/api\/operations\/jobs\/([^/]+)\/reconcile$/);if(m&&method==='POST'){const result=await jobs.reconcile(user,m[1],body.reason);send(200,{id:result.id,status:result.status});return true;}
 if(path==='/api/operations/geocode'&&method==='POST'){send(200,await tracking.geocode(user,body.address));return true;}
 if(path==='/api/operations/trips'&&method==='GET'){send(200,{trips:tracking.list(user)});return true;}
 m=path.match(/^\/api\/operations\/trips\/(booking|ride2go)\/([^/]+)(?:\/(route|location|eta|progress))?$/);if(m){const [,kind,id,action]=m;if(!action&&method==='GET'){send(200,tracking.read(user,kind,id));return true;}if(action==='route'&&method==='PUT'){send(200,tracking.route(user,kind,id,body));return true;}if(action==='location'&&method==='PUT'){send(200,tracking.position(user,kind,id,body));return true;}if(action==='location'&&method==='DELETE'){send(200,tracking.stopSharing(user,kind,id));return true;}if(action==='eta'&&method==='POST'){send(200,await tracking.eta(user,kind,id));return true;}if(action==='progress'&&method==='POST'){role(user,'driver');const t=tracking.read(user,kind,id);if(kind!=='booking'||t.driverId!==user.id||!['DRIVER_EN_ROUTE','ARRIVED','TRIP_STARTED'].includes(body.to))fail(409,'Use an allowed viewing driver transition');const assignment=db.prepare("SELECT id FROM dispatch_assignments WHERE booking_id=? AND driver_id=? AND status IN ('ASSIGNED','DRIVER_EN_ROUTE','ARRIVED') ORDER BY created_at DESC LIMIT 1").get(id,user.id);if(!assignment)fail(409,'Active viewing assignment required');dispatchAuthority.transition({assignmentId:assignment.id,to:body.to,actor:user});send(200,tracking.read(user,kind,id));return true;}}
 return false;
 }
 return {routes,jobs,collections,communications,finance,tracking,start,stop,tick,scan};
}
module.exports={createOperations};
