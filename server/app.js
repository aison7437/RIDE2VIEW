const {createQuality}=require('./quality/authority');
const {createAnalytics}=require('./analytics/authority');
const {createAgentWorkflows}=require('./agents/runtime');
const {createLedgerAuthority}=require('./payments/ledger/ledger-authority');
const {createMarketplaceAuthority}=require('./marketplace/authority');
const {createMarketplaceRoutes}=require('./marketplace/routes');
const {createGrowthAuthority}=require('./growth/authority');
const {createGrowthRoutes}=require('./growth/routes');
const {createMarketplaceExpansion}=require('./marketplace-expansion/authority');
const {createExpansionRoutes}=require('./marketplace-expansion/routes');
const {createOrderAuthority}=require('./commerce/orders');
const {createInventoryAuthority}=require('./commerce/inventory');
const {createFulfillmentAuthority}=require('./logistics/fulfillment');
const {createOperations}=require('./operations');
const {createPropertyServices}=require('./property-services/authority');
const {createPropertyServiceRoutes}=require('./property-services/routes');
const {createOnboardingAuthority}=require('./mobility/onboarding/authority');
const {createRideAuthority}=require('./mobility/ride2go/authority');
const {createMobilityRoutes}=require('./mobility/routes');
const {active:mobilityActive}=require('./mobility/onboarding/eligibility');
const {createJourneyAuthority}=require('./journeys/authority');
const {createJourneyRoutes}=require('./journeys/routes');
const {packageForBooking}=require('./journeys/hooks');
const http = require('node:http');
const { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { openStore } = require('./store');
const { CURRENT_SCHEMA_VERSION } = require('./migrations');
const { createSupplyAuthority } = require('./property/supply-authority');
const { createSupplyRoutes } = require('./property/routes');
const { searchProperties } = require('../ai/Core/journey-orchestrator/search-adapter');
const { createPaymentAuthority, createPaymentIntentAuthority, createProviderBoundary, createPaymentSideEffectOutbox, createSideEffectRuntime, createPaymentInitiationRuntime, createProviderCallbackRuntime } = require('./payments');
const { createDispatchAuthority } = require('./mobility/dispatch');
const { createSafetyAuthority } = require('./safety');
const { createReservationAuthority } = require('./scheduling/reservations');
const { createCancellationCoordinator } = require('./recovery/cancellation-coordinator');
const TIERS = Object.freeze({general:650, women:750, students:450, vip:2000});
const passwordHash = password => { const salt=randomBytes(16).toString('hex'); return salt+':'+scryptSync(password,salt,64).toString('hex'); };
function passwordMatches(password, stored) { const [salt,hash]=stored.split(':'); const a=scryptSync(password,salt,64); const b=Buffer.from(hash,'hex'); return a.length===b.length && timingSafeEqual(a,b); }
const digest = value => createHash('sha256').update(value).digest('hex');
function createApp(options={}) {
  const db=openStore(options.dbPath || process.env.DB_PATH || './data/ride2view.sqlite');
  const secure=options.secureCookies ?? process.env.COOKIE_SECURE==='true';
  const root=join(__dirname,'..');
  const bootEmail=options.adminEmail || process.env.ADMIN_EMAIL;
  const bootPassword=options.adminPassword || process.env.ADMIN_PASSWORD;
  let paymentAuthority,paymentIntentAuthority,providerBoundary,dispatchAuthority,safetyAuthority,reservationAuthority,sideEffectRuntime,paymentInitiationRuntime,providerCallbackRuntime;
  if (bootEmail && bootPassword && !db.prepare('SELECT id FROM users WHERE email=?').get(bootEmail.toLowerCase())) {
    if (bootPassword.length<12) throw new Error('Administrator password must contain at least 12 characters');
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(randomUUID(),bootEmail.toLowerCase(),'Administrator',passwordHash(bootPassword),'admin');
  }
  function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result=fn(); db.exec('COMMIT'); return result; } catch(e) {db.exec('ROLLBACK'); throw e;} }
  function audit(user,action,id,details={}) {db.prepare('INSERT INTO audit(actor_id,action,entity_id,details,created_at) VALUES(?,?,?,?,?)').run(user?.id || null,action,id,JSON.stringify(details),new Date().toISOString());}
  function notify(id,message) {db.prepare('INSERT INTO notifications VALUES(?,?,?,?)').run(randomUUID(),id,message,new Date().toISOString());}
  const sideEffects=createPaymentSideEffectOutbox({db,handlers:{
    BOOKING_PAYMENT_VERIFIED:payload=>notify(payload.customerId,'Payment verified. Viewing confirmed; driver assignment pending.'),
    COMMERCE_PAYMENT_VERIFIED:()=>{}
  }});
  paymentAuthority=createPaymentAuthority({db,audit,notify,sideEffects,ledger:createLedgerAuthority({db,audit})});
  const paymentProviders=Object.freeze({...options.paymentProviders});
  const providerList=Object.values(paymentProviders).filter(Boolean);
  const initiationPaymentsConnected=providerList.some(provider=>provider.capabilities?provider.capabilities.initiation===true:typeof provider.initiatePayment==='function');
  const callbackPaymentsConnected=providerList.some(provider=>provider.capabilities?provider.capabilities.callbackVerification===true:typeof provider.verifySignature==='function'&&typeof provider.parseEvent==='function');
  const paymentRecoveryConnected=providerList.some(provider=>provider.capabilities?provider.capabilities.lookup===true:typeof provider.lookupPayment==='function');
  const externalPaymentsConnected=initiationPaymentsConnected||callbackPaymentsConnected;
  paymentIntentAuthority=createPaymentIntentAuthority({db,providers:paymentProviders,audit});
  providerBoundary=createProviderBoundary({db,paymentAuthority,providers:paymentProviders,audit});
  providerCallbackRuntime=createProviderCallbackRuntime({boundary:providerBoundary,intervalMs:options.providerCallbackIntervalMs||5000,batchSize:options.providerCallbackBatchSize||20});
  if(callbackPaymentsConnected&&options.startProviderCallbackRuntime!==false)providerCallbackRuntime.start();
  paymentInitiationRuntime=createPaymentInitiationRuntime({authority:paymentIntentAuthority,intervalMs:options.paymentInitiationIntervalMs||5000,batchSize:options.paymentInitiationBatchSize||20});
  if(initiationPaymentsConnected&&options.startPaymentInitiationRuntime!==false)paymentInitiationRuntime.start();
  sideEffectRuntime=createSideEffectRuntime({outbox:sideEffects,intervalMs:options.sideEffectIntervalMs||5000,batchSize:options.sideEffectBatchSize||20});
  if(options.startSideEffectRuntime!==false)sideEffectRuntime.start();
  dispatchAuthority=createDispatchAuthority({db,audit,notify});
  safetyAuthority=createSafetyAuthority({db,audit});
  reservationAuthority=createReservationAuthority({db,audit});
  const cancellationCoordinator=createCancellationCoordinator({db,dispatchAuthority,reservationAuthority,paymentAuthority,audit,notify});
  const supply=createSupplyAuthority({db,audit,notify,tiers:TIERS});
  const journeys=createJourneyAuthority({db,supply,audit,notify,dispatch:dispatchAuthority});
  const journeyRoutes=createJourneyRoutes({journeys});
  const onboarding=createOnboardingAuthority({db,audit,notify});
  const rides=createRideAuthority({db,audit,notify});
  const mobilityRoutes=createMobilityRoutes({onboarding,rides});
  const services=createPropertyServices({db,supply,audit,notify});
  const propertyServiceRoutes=createPropertyServiceRoutes({services});
  const operations=createOperations({db,integrations:options.integrations||{},paymentAuthority,rides,services,journeys,dispatchAuthority,audit});
  const marketplace=createMarketplaceAuthority({db,audit});
  const marketplaceRoutes=createMarketplaceRoutes({marketplace});
  const growth=createGrowthAuthority({db,audit});
  const growthRoutes=createGrowthRoutes({growth});
  const commerceOrders=createOrderAuthority({db,audit});
  const commerceInventory=createInventoryAuthority({db,audit});
  const fulfillment=createFulfillmentAuthority({db,audit});
  const expansion=createMarketplaceExpansion({db,orders:commerceOrders,inventory:commerceInventory,fulfillment,marketplace,audit});
  const expansionRoutes=createExpansionRoutes({expansion});
  const analytics=createAnalytics({db});
  const quality=createQuality({db,supply});
  const agentWorkflows=createAgentWorkflows({db,supply,expansion,analytics,quality,audit});
  if(options.startOperationsRuntime!==false)operations.start();
  const supplyRoutes=createSupplyRoutes({supply,cancellationCoordinator,journeys});
  function fail(status,message) {const e=new Error(message);e.status=status;throw e;}
  function requireRole(user,...roles) { if(!user) fail(401,'Sign in to continue'); if(!roles.includes(user.role)) fail(403,'This action is not permitted for this account'); }
  function getUser(req) {const token=req.headers.cookie?.match(/(?:^|;\s*)r2v_session=([^;]+)/)?.[1];if(!token)return null;return db.prepare('SELECT u.id,u.name,u.email,u.role,u.verified FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?').get(digest(token),Date.now()) || null;}
  function bookingFor(id,user) {const b=db.prepare('SELECT b.*,l.payload AS listing FROM bookings b JOIN listings l ON l.id=b.listing_id WHERE b.id=?').get(id);if(!b)fail(404,'Booking not found');if(user.role!=='admin' && b.customer_id!==user.id && b.driver_id!==user.id)fail(403,'Booking belongs to another account');return b;}
  async function readBody(req) {let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>(['/api/supply/documents','/api/mobility/documents','/api/property-services/documents'].includes(req.url)?3000000:65536))fail(413,'Request is too large');chunks.push(c);}try{req.rawBody=Buffer.concat(chunks).toString() || '{}';return JSON.parse(req.rawBody);}catch{fail(400,'Invalid JSON body');}}
  const attempts=new Map();
  function rateLimit(req) {const key=req.socket.remoteAddress;const now=Date.now();let bucket=attempts.get(key);if(!bucket || bucket.until<now){bucket={count:0,until:now+60000};attempts.set(key,bucket);}if(++bucket.count>30)fail(429,'Too many sign-in attempts; try again in a minute');if(attempts.size>10000)for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);}
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Cache-Control','no-store');
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
    try {
      const url=new URL(req.url,'http://localhost');const path=url.pathname;const method=req.method;
      if(method!=='GET' && method!=='HEAD') {
        if(req.headers['sec-fetch-site']==='cross-site')fail(403,'Cross-site request denied');
        if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin);}catch{fail(403,'Invalid origin');}if(origin.host!==req.headers.host)fail(403,'Cross-site request denied');}
        if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Use application/json');
      }
      if(path==='/api/health/live' && method==='GET') return send(200,{status:'ok'});
      if((path==='/api/health'||path==='/api/health/ready') && method==='GET') {
        try {
          const database=db.prepare('SELECT 1 AS ready').get().ready===1;
          const schemaVersion=Number(db.prepare('SELECT COALESCE(MAX(version),0) AS version FROM schema_migrations').get().version);
          const ready=database&&schemaVersion===CURRENT_SCHEMA_VERSION;
          return send(ready?200:503,{status:ready?'ready':'not_ready',database,schemaVersion,expectedSchemaVersion:CURRENT_SCHEMA_VERSION});
        } catch(error) {
          return send(503,{status:'not_ready',database:false,schemaVersion:null,expectedSchemaVersion:CURRENT_SCHEMA_VERSION});
        }
      }
      if(path==='/api/config' && method==='GET')return send(200,{tiers:TIERS,paymentMode:initiationPaymentsConnected?'provider':'manual_verification',externalPaymentsConnected,initiationPaymentsConnected,callbackPaymentsConnected,paymentRecoveryConnected});
      if(!path.startsWith('/api/')) {
        const allowed={'/':'index.html','/index.html':'index.html','/js/app.js':'js/app.js','/js/agents.js':'js/agents.js','/js/analytics.js':'js/analytics.js','/js/operations.js':'js/operations.js','/js/property-services.js':'js/property-services.js','/js/mobility.js':'js/mobility.js','/js/journeys.js':'js/journeys.js','/js/marketplace.js':'js/marketplace.js','/js/supply.js':'js/supply.js','/js/preview.js':'js/preview.js','/css/style.css':'css/style.css','/css/app.css':'css/app.css'};
        if(method!=='GET' && method!=='HEAD')fail(405,'Method not allowed');
        if(!allowed[path])fail(404,'Page not found');
        const mime=path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':'text/html';
        res.writeHead(200,{'Content-Type':mime+'; charset=utf-8'});return res.end(method==='HEAD'?'':readFileSync(join(root,allowed[path])));
      }
      const user=getUser(req);
      const body=method==='GET'?{}:await readBody(req);
      if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'JSON object required');
      if(quality.routes({path,method,user,body,send}))return;
      if(analytics.routes({path,method,user,body,send}))return;
      if(await agentWorkflows.routes({path,method,user,body,send}))return;
      if(await operations.routes({path,method,user,body,send,res,req}))return;
      if(marketplaceRoutes({path,method,user,body,send,res}))return;
      if(growthRoutes({path,method,user,body,send,res}))return;
      if(expansionRoutes({path,method,user,body,send,res}))return;
      if(propertyServiceRoutes({path,method,user,body,send,res}))return;
      if(mobilityRoutes({path,method,user,body,send,res}))return;
      if(journeyRoutes({path,method,user,body,send,res}))return;
      if(supplyRoutes({path,method,user,body,send,res}))return;
      if(path==='/api/auth/register' && method==='POST') {
        rateLimit(req);const email=String(body.email||'').trim().toLowerCase();const name=String(body.name||'').trim();const role=body.role||'customer';
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)fail(400,'A valid email is required');
        if(name.length<2||name.length>100)fail(400,'Name must contain 2–100 characters');
        if(typeof body.password!=='string'||body.password.length<12||body.password.length>256)fail(400,'Password must contain 12–256 characters');
        if(!['customer','agent','driver'].includes(role))fail(400,'Invalid account role');
        if(db.prepare('SELECT id FROM users WHERE email=?').get(email))fail(409,'Email is already registered');
        const id=randomUUID();db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,email,name,passwordHash(body.password),role,role==='customer'?1:0);audit({id},'account.created',id,{role});return send(201,{id,role,requiresApproval:role!=='customer'});
      }
      if(path==='/api/auth/login' && method==='POST') {
        rateLimit(req);if(typeof body.password!=='string'||body.password.length>256)fail(400,'Invalid credentials');
        const account=db.prepare('SELECT * FROM users WHERE email=?').get(String(body.email||'').trim().toLowerCase());
        const dummy='00000000000000000000000000000000:'+ '00'.repeat(64);
        if(!passwordMatches(body.password,account?.password || dummy)||!account)fail(401,'Invalid credentials');
        const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),account.id,Date.now()+86400000);
        res.setHeader('Set-Cookie',`r2v_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secure?'; Secure':''}`);
        return send(200,{id:account.id,name:account.name,email:account.email,role:account.role,verified:account.verified});
      }
      if(path==='/api/auth/me' && method==='GET') {if(!user)fail(401,'Sign in to continue');return send(200,user);}
      if(path==='/api/auth/logout' && method==='POST') {const token=req.headers.cookie?.match(/(?:^|;\s*)r2v_session=([^;]+)/)?.[1];if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));res.setHeader('Set-Cookie','r2v_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{success:true});}
      if(path==='/api/listings' && method==='GET') {
        const mine=url.searchParams.get('mine')==='true';
        if(mine)return send(200,{listings:supply.dashboard(user).properties});
        return send(200,{listings:supply.listPublic()});
      }
      if(path==='/api/listings' && method==='POST')return send(201,supply.createListing(user,body));
      const listingMatch=path.match(/^\/api\/listings\/([^/]+)$/);
      if(listingMatch && method==='PATCH')return send(200,supply.editListing(user,listingMatch[1],body));
      if(path==='/api/search' && method==='POST') {
        const message=String(body.message||'').trim();if(!message || message.length>2000)fail(400,'Search message is required (maximum 2000 characters)');
        if(body.budget!=null && (!Number.isFinite(Number(body.budget)) || Number(body.budget)<=0))fail(400,'Budget must be positive');
        const listings=supply.listPublic();
        const result=await searchProperties({message,searchText:message,userGoal:'property',location:{city:String(body.city||'Nairobi'),country:'Kenya'},budget:body.budget==null?undefined:Number(body.budget),availableTime:body.availableTime,properties:listings,propertyOpportunities:listings});
        result.measurementId=result.success?analytics.recordSearch(user,result.recommendations||[]):null;
        return send(200,result);
      }
      if(path==='/api/bookings' && method==='POST') {
        requireRole(user,'customer');fail(409,'Choose a published availability slot and create a viewing request; agent acceptance creates the payable booking');
      }
      if(path==='/api/bookings' && method==='GET') {
        requireRole(user,'customer','admin','driver');const condition=user.role==='admin'?'1=1':user.role==='driver'?"EXISTS(SELECT 1 FROM dispatch_assignments da WHERE da.booking_id=b.id AND da.driver_id=? AND da.status IN ('OFFERED','ACCEPTED','ASSIGNED','DRIVER_EN_ROUTE','ARRIVED','TRIP_STARTED','TRIP_COMPLETED'))":'b.customer_id=?';const driverAssignmentFilter=user?.role==='driver'?' AND da.driver_id=?':'';const query=`SELECT b.*,p.id AS payment_id,p.status AS payment_status,p.reference AS payment_reference,l.payload AS listing,(SELECT da.id FROM dispatch_assignments da WHERE da.booking_id=b.id${driverAssignmentFilter} AND da.status IN ('OFFERED','ACCEPTED','ASSIGNED','DRIVER_EN_ROUTE','ARRIVED','TRIP_STARTED','TRIP_COMPLETED') ORDER BY da.created_at DESC LIMIT 1) AS assignment_id,(SELECT da.status FROM dispatch_assignments da WHERE da.booking_id=b.id${driverAssignmentFilter} ORDER BY da.created_at DESC LIMIT 1) AS assignment_status FROM bookings b JOIN payments p ON p.booking_id=b.id JOIN listings l ON l.id=b.listing_id WHERE (${condition}) AND NOT EXISTS(SELECT 1 FROM journey_stops js JOIN viewing_journeys j ON j.id=js.journey_id WHERE js.booking_id=b.id AND j.master_booking_id<>b.id) ORDER BY b.created_at DESC`;
        const rows=user.role==='driver'?db.prepare(query).all(user.id,user.id,user.id):user.role==='admin'?db.prepare(query).all():db.prepare(query).all(user.id);return send(200,{bookings:rows.map(r=>({...r,journey_id:packageForBooking(db,r.id)?.id||null,listing:JSON.parse(r.listing)}))});
      }
      const verifyMatch=path.match(/^\/api\/payments\/([^/]+)\/verify$/);
      if(verifyMatch && method==='POST') {
        requireRole(user,'admin');
        try {
          const result=paymentAuthority.verifyManual({paymentId:verifyMatch[1],reference:String(body.reference||'').trim(),amount:body.amount,actor:user});const link=db.prepare('SELECT reservation_id FROM booking_reservations WHERE booking_id=?').get(result.booking_id);if(!link)fail(409,'RESERVATION_LINK_NOT_FOUND');const reservation=reservationAuthority.confirmForBooking({reservationId:link.reservation_id,bookingId:result.booking_id,actor:user});
          return send(200,{success:true,status:'confirmed',verification:'manual',duplicate:Boolean(result.duplicate),reservationId:reservation.id,reservationStatus:reservation.status});
        } catch(e) {
          const statuses={PAYMENT_NOT_FOUND:404,PAYMENT_VERIFICATION_FORBIDDEN:403,INVALID_REFERENCE:400,AMOUNT_MISMATCH:400,PAYMENT_ALREADY_VERIFIED:409,REFERENCE_REPLAY:409,BOOKING_NOT_PAYABLE:409};
          fail(statuses[e.code]||409,e.code||'Payment verification failed');
        }
      }
      const dispatchActionMatch=path.match(/^\/api\/dispatch\/([^/]+)\/(accept|reject)$/);
      if(dispatchActionMatch && method==='POST'){
        requireRole(user,'driver');if(!user.verified)fail(403,'Driver approval is required');
        try{const assignment=dispatchActionMatch[2]==='accept'?dispatchAuthority.accept({assignmentId:dispatchActionMatch[1],driverId:user.id,actor:user}):dispatchAuthority.reject({assignmentId:dispatchActionMatch[1],driverId:user.id,actor:user});return send(200,{assignmentId:assignment.id,status:assignment.status,duplicate:Boolean(assignment.duplicate)});}
        catch(e){const statuses={ASSIGNMENT_NOT_FOUND:404,NOT_ASSIGNMENT_DRIVER:403,INVALID_TRANSITION:409,ASSIGNMENT_NO_LONGER_ELIGIBLE:409};fail(statuses[e.code]||409,e.code||'Dispatch response failed');}
      }
      const actionMatch=path.match(/^\/api\/bookings\/([^/]+)\/(assign|complete|cancel)$/);
      if(actionMatch && method==='POST') {
        requireRole(user,'admin','customer','driver');const b=bookingFor(actionMatch[1],user);const action=actionMatch[2];if(action!=='assign')journeys.guardBooking(b.id);
        if(action==='assign') {
          requireRole(user,'admin');
          const driver=db.prepare("SELECT id,verified FROM users WHERE id=? AND role='driver'").get(body.driverId);
          if(!driver||driver.verified!==1)fail(400,'Choose an approved driver');
          const safety=safetyAuthority.evaluate({operation:'dispatch',subject:{id:driver.id,verified:true},signals:[],actor:user,correlationId:b.id});
          if(!['ALLOW','ALLOW_WITH_MONITORING'].includes(safety.decision))fail(409,'Dispatch blocked by safety policy');
          try {
            const offered=dispatchAuthority.offer({bookingId:b.id,driverId:driver.id,idempotencyKey:String(body.idempotencyKey||('booking:'+b.id+':driver:'+driver.id)),actor:user});
            return send(200,{status:'offered',assignmentId:offered.id,safetyDecisionId:safety.id});
          } catch(e) {
            const statuses={BOOKING_NOT_FOUND:404,DRIVER_INELIGIBLE:409,PAYMENT_OR_BOOKING_NOT_CONFIRMED:409,RESERVATION_NOT_CONFIRMED:409,ASSIGNMENT_CONFLICT:409,IDEMPOTENCY_KEY_REQUIRED:400};
            fail(statuses[e.code]||409,e.code||'Dispatch offer failed');
          }
        }
        if(action==='complete') {
          requireRole(user,'admin','driver');
          const assignment=db.prepare("SELECT * FROM dispatch_assignments WHERE booking_id=? AND status IN ('ASSIGNED','DRIVER_EN_ROUTE','ARRIVED','TRIP_STARTED') ORDER BY created_at DESC LIMIT 1").get(b.id);
          if(!assignment)fail(409,'Only authority-assigned viewings can be completed');
          if(user.role==='driver'&&assignment.driver_id!==user.id)fail(403,'Booking belongs to another driver');
          try {
            let current=assignment;
            for(const state of ['DRIVER_EN_ROUTE','ARRIVED','TRIP_STARTED','TRIP_COMPLETED']){
              if(['ASSIGNED','DRIVER_EN_ROUTE','ARRIVED','TRIP_STARTED','TRIP_COMPLETED'].indexOf(current.status)>=['ASSIGNED','DRIVER_EN_ROUTE','ARRIVED','TRIP_STARTED','TRIP_COMPLETED'].indexOf(state))continue;
              current=dispatchAuthority.transition({assignmentId:assignment.id,to:state,actor:user});
            }
            audit(user,'viewing.completed',b.id,{assignmentId:assignment.id});notify(b.customer_id,'Your viewing is completed.');
            return send(200,{status:'completed',assignmentId:assignment.id});
          } catch(e){fail(409,e.code||'Viewing completion failed');}
        }
        if(user.role==='driver')fail(403,'Drivers cannot cancel customer bookings');if(b.status==='completed')fail(409,'Booking cannot be cancelled');
        try{const result=cancellationCoordinator.cancel({bookingId:b.id,actor:user});return send(200,result);}catch(e){fail(409,e.code||'Booking cancellation failed');}
      }
      if(path==='/api/admin/users' && method==='GET') {requireRole(user,'admin');return send(200,{users:db.prepare('SELECT id,email,name,role,verified FROM users ORDER BY name').all().map(u=>({...u,mobilityEligible:u.role==='driver'&&mobilityActive(db,u.id,'driver'),online:Boolean(db.prepare('SELECT online FROM driver_profiles WHERE user_id=?').get(u.id)?.online)}))});}
      const approveMatch=path.match(/^\/api\/admin\/users\/([^/]+)\/approve$/);
      if(approveMatch && method==='POST') {requireRole(user,'admin');const target=db.prepare('SELECT id,role FROM users WHERE id=?').get(approveMatch[1]);if(!target||!['driver','agent'].includes(target.role))fail(400,'Only driver and agent accounts require approval');if(target.role==='agent')fail(409,'Use agent identity and agency documentary reviews');fail(409,'Use driver profile, private documents and mobility review before dispatch');}
      const callbackRetryMatch=path.match(/^\/api\/admin\/payment-operations\/callbacks\/([^/]+)\/retry$/);
      if(callbackRetryMatch && method==='POST') {requireRole(user,'admin');const callbackId=callbackRetryMatch[1],caseId=String(body.caseId||'').trim(),evidenceRef=String(body.evidenceRef||'').trim(),now=new Date().toISOString();if(!caseId||!evidenceRef)fail(400,'caseId and evidenceRef are required');if(caseId.length>128)fail(400,'caseId is too long');if(evidenceRef.length>512)fail(400,'evidenceRef is too long');let row;transaction(()=>{row=db.prepare('SELECT * FROM provider_callback_inbox WHERE id=?').get(callbackId);if(!row)fail(404,'Provider callback not found');if(row.status!=='DEAD_LETTER')fail(409,'Only dead-letter callbacks are eligible for manual retry');const supportCase=db.prepare('SELECT * FROM support_cases WHERE id=?').get(caseId);if(!supportCase)fail(404,'Support case not found');if(!['OPEN','IN_PROGRESS'].includes(supportCase.status))fail(409,'Support case is not active');if(!supportCase.correlation_id&&!supportCase.affected_entity)fail(409,'Support case is not bound to this callback');if(supportCase.correlation_id&&supportCase.correlation_id!==row.correlation_id)fail(409,'Support case correlation does not match callback');if(supportCase.affected_entity&&supportCase.affected_entity!==callbackId&&supportCase.affected_entity!==row.payment_id)fail(409,'Support case does not cover this callback');const changed=db.prepare("UPDATE provider_callback_inbox SET status='FAILED',last_error=NULL,next_attempt_at=?,lease_owner=NULL,lease_expires_at=NULL,updated_at=? WHERE id=? AND status='DEAD_LETTER'").run(now,now,callbackId);if(changed.changes!==1)fail(409,'Provider callback state changed');db.prepare('INSERT INTO support_recovery_actions(id,case_id,domain,action,authority_entity_id,evidence_ref,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),caseId,'payments','PROVIDER_CALLBACK_RETRY',callbackId,evidenceRef,now);db.prepare('INSERT INTO support_case_events(id,case_id,event_type,evidence_ref,actor_id,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(),caseId,'PAYMENT_CALLBACK_RETRY_REQUESTED',evidenceRef,user.id,now);audit(user,'provider.callback_retry_requested',callbackId,{caseId,evidenceRef,provider:row.provider,providerEventId:row.provider_event_id,correlationId:row.correlation_id,previousStatus:row.status,previousAttempts:row.attempts});});return send(200,{success:true,id:callbackId,status:'FAILED',caseId,nextAttemptAt:now});}
      const initiationRetryMatch=path.match(/^\/api\/admin\/payment-operations\/initiations\/([^/]+)\/retry$/);
      if(initiationRetryMatch && method==='POST') {requireRole(user,'admin');const initiationId=initiationRetryMatch[1],caseId=String(body.caseId||'').trim(),evidenceRef=String(body.evidenceRef||'').trim(),now=new Date().toISOString();if(!caseId||!evidenceRef)fail(400,'caseId and evidenceRef are required');if(caseId.length>128)fail(400,'caseId is too long');if(evidenceRef.length>512)fail(400,'evidenceRef is too long');let row;transaction(()=>{row=db.prepare('SELECT o.*,i.correlation_id,i.payment_id,i.payment_kind FROM payment_initiation_outbox o JOIN payment_intents i ON i.id=o.payment_intent_id WHERE o.id=?').get(initiationId);if(!row)fail(404,'Payment initiation not found');if(!['DEAD_LETTER','RECOVERY_REQUIRED'].includes(row.status))fail(409,'Only dead-letter or recovery-required initiations are eligible for manual retry');if(row.status==='RECOVERY_REQUIRED'){if(row.last_error==='PROVIDER_ACCEPTANCE_REJECTED')fail(409,'Provider-rejected initiation cannot be released for automatic retry');const provider=paymentProviders[row.provider];const canLookup=provider&&(provider.capabilities?provider.capabilities.lookup===true:typeof provider.lookupPayment==='function');if(!canLookup)fail(409,'Provider acceptance recovery capability is not available');}const supportCase=db.prepare('SELECT * FROM support_cases WHERE id=?').get(caseId);if(!supportCase)fail(404,'Support case not found');if(!['OPEN','IN_PROGRESS'].includes(supportCase.status))fail(409,'Support case is not active');if(!supportCase.correlation_id&&!supportCase.affected_entity)fail(409,'Support case is not bound to this initiation');if(supportCase.correlation_id&&supportCase.correlation_id!==row.correlation_id)fail(409,'Support case correlation does not match initiation');if(supportCase.affected_entity&&supportCase.affected_entity!==initiationId&&supportCase.affected_entity!==row.payment_intent_id&&supportCase.affected_entity!==row.payment_id)fail(409,'Support case does not cover this initiation');const changed=row.status==='RECOVERY_REQUIRED'?db.prepare("UPDATE payment_initiation_outbox SET status='FAILED',last_error=NULL,next_attempt_at=?,lease_owner=NULL,lease_expires_at=NULL,updated_at=? WHERE id=? AND status='RECOVERY_REQUIRED'").run(now,now,initiationId):db.prepare("UPDATE payment_initiation_outbox SET status='FAILED',attempts=0,last_error=NULL,next_attempt_at=?,lease_owner=NULL,lease_expires_at=NULL,updated_at=? WHERE id=? AND status='DEAD_LETTER'").run(now,now,initiationId);if(changed.changes!==1)fail(409,'Payment initiation state changed');db.prepare('INSERT INTO support_recovery_actions(id,case_id,domain,action,authority_entity_id,evidence_ref,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),caseId,'payments','PAYMENT_INITIATION_RETRY',initiationId,evidenceRef,now);db.prepare('INSERT INTO support_case_events(id,case_id,event_type,evidence_ref,actor_id,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(),caseId,'PAYMENT_INITIATION_RETRY_REQUESTED',evidenceRef,user.id,now);audit(user,'payment.initiation_retry_requested',initiationId,{caseId,evidenceRef,provider:row.provider,correlationId:row.correlation_id,paymentIntentId:row.payment_intent_id,paymentId:row.payment_id,previousStatus:row.status,previousAttempts:row.attempts});});return send(200,{success:true,id:initiationId,status:'FAILED',caseId,nextAttemptAt:now});}
      if(path==='/api/admin/payment-operations' && method==='GET') {requireRole(user,'admin');const now=new Date().toISOString();const callbacks=db.prepare("SELECT id,provider,provider_event_id,correlation_id,payment_kind,payment_id,status,attempts,last_error,next_attempt_at,lease_owner,lease_expires_at,received_at,updated_at FROM provider_callback_inbox WHERE status IN ('FAILED','DEAD_LETTER') OR (status='PROCESSING' AND (lease_expires_at IS NULL OR lease_expires_at<=?)) ORDER BY updated_at DESC LIMIT 200").all(now);const counts=db.prepare("SELECT status,COUNT(*) AS count FROM provider_callback_inbox GROUP BY status").all();const operational=db.prepare("SELECT SUM(CASE WHEN status='DEAD_LETTER' THEN 1 ELSE 0 END) AS deadLetter,SUM(CASE WHEN status='FAILED' AND (next_attempt_at IS NULL OR next_attempt_at<=?) THEN 1 ELSE 0 END) AS failedDueNow,SUM(CASE WHEN status='FAILED' AND next_attempt_at>? THEN 1 ELSE 0 END) AS failedScheduled,SUM(CASE WHEN status='PROCESSING' AND (lease_expires_at IS NULL OR lease_expires_at<=?) THEN 1 ELSE 0 END) AS stuckProcessing FROM provider_callback_inbox").get(now,now,now);const initiation=db.prepare("SELECT o.id,o.payment_intent_id,o.provider,o.status,o.attempts,o.total_attempts,o.last_error,o.next_attempt_at,o.lease_owner,o.lease_expires_at,o.provider_rejection_code,o.provider_rejection_reason,o.provider_rejected_at,o.created_at,o.updated_at,i.correlation_id,i.payment_kind,i.payment_id FROM payment_initiation_outbox o JOIN payment_intents i ON i.id=o.payment_intent_id WHERE o.status IN ('FAILED','DEAD_LETTER','RECOVERY_REQUIRED') OR (o.status='PROCESSING' AND (o.lease_expires_at IS NULL OR o.lease_expires_at<=?)) ORDER BY o.updated_at DESC LIMIT 200").all(now);const initiationCounts=db.prepare("SELECT status,COUNT(*) AS count FROM payment_initiation_outbox GROUP BY status").all();const initiationOperational=db.prepare("SELECT SUM(CASE WHEN status='DEAD_LETTER' THEN 1 ELSE 0 END) AS deadLetter,SUM(CASE WHEN status='FAILED' AND (next_attempt_at IS NULL OR next_attempt_at<=?) THEN 1 ELSE 0 END) AS failedDueNow,SUM(CASE WHEN status='FAILED' AND next_attempt_at>? THEN 1 ELSE 0 END) AS failedScheduled,SUM(CASE WHEN status='PROCESSING' AND (lease_expires_at IS NULL OR lease_expires_at<=?) THEN 1 ELSE 0 END) AS stuckProcessing,SUM(CASE WHEN status='RECOVERY_REQUIRED' THEN 1 ELSE 0 END) AS recoveryRequired,SUM(CASE WHEN status='RECOVERY_REQUIRED' AND last_error='PROVIDER_ACCEPTANCE_REJECTED' THEN 1 ELSE 0 END) AS providerRejected FROM payment_initiation_outbox").get(now,now,now);const health={callbacks:Object.fromEntries(counts.map(x=>[x.status,x.count])),deadLetter:Number(operational.deadLetter||0),failedDueNow:Number(operational.failedDueNow||0),failedScheduled:Number(operational.failedScheduled||0),stuckProcessing:Number(operational.stuckProcessing||0),initiation:{statuses:Object.fromEntries(initiationCounts.map(x=>[x.status,x.count])),deadLetter:Number(initiationOperational.deadLetter||0),failedDueNow:Number(initiationOperational.failedDueNow||0),failedScheduled:Number(initiationOperational.failedScheduled||0),stuckProcessing:Number(initiationOperational.stuckProcessing||0),recoveryRequired:Number(initiationOperational.recoveryRequired||0),providerRejected:Number(initiationOperational.providerRejected||0)}};return send(200,{health,callbacks,initiation});}
      if(path==='/api/admin/audit' && method==='GET') {requireRole(user,'admin');return send(200,{events:db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all()});}
      if(path==='/api/notifications' && method==='GET') {requireRole(user,'admin','customer','driver','agent');return send(200,{notifications:db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(user.id)});}
      fail(404,'Endpoint not found');
    } catch(error) {
      const status=error.status || 500;if(status===500)console.error('Request failed:',error.message);
      if(!res.headersSent)send(status,{error:status===500?'Internal server error':error.message});else res.end();
    }
  });
  return {server,db,quality,analytics,agentWorkflows,operations,marketplace,growth,expansion,commerceOrders,commerceInventory,fulfillment,services,journeys,onboarding,rides,supply,paymentAuthority,paymentIntentAuthority,providerBoundary,paymentInitiationRuntime,providerCallbackRuntime,sideEffects,sideEffectRuntime,close:async()=>{await agentWorkflows.stop();await operations.stop();providerCallbackRuntime?.stop();paymentInitiationRuntime?.stop();sideEffectRuntime?.stop();if(server.listening)await new Promise(resolve=>server.close(resolve));db.close();}};
}
module.exports={createApp,TIERS};
