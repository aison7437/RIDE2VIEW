const http = require('node:http');
const { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { openStore } = require('./store');
const { validateListing } = require('./validation');
const { searchProperties } = require('../ai/Core/journey-orchestrator/search-adapter');
const { createPaymentAuthority } = require('./payments');
const { createDispatchAuthority } = require('./mobility/dispatch');
const { createSafetyAuthority } = require('./safety');
const { createReservationAuthority } = require('./scheduling/reservations');
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
  let paymentAuthority,dispatchAuthority,safetyAuthority,reservationAuthority;
  if (bootEmail && bootPassword && !db.prepare('SELECT id FROM users WHERE email=?').get(bootEmail.toLowerCase())) {
    if (bootPassword.length<12) throw new Error('Administrator password must contain at least 12 characters');
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(randomUUID(),bootEmail.toLowerCase(),'Administrator',passwordHash(bootPassword),'admin');
  }
  function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result=fn(); db.exec('COMMIT'); return result; } catch(e) {db.exec('ROLLBACK'); throw e;} }
  function audit(user,action,id,details={}) {db.prepare('INSERT INTO audit(actor_id,action,entity_id,details,created_at) VALUES(?,?,?,?,?)').run(user?.id || null,action,id,JSON.stringify(details),new Date().toISOString());}
  function notify(id,message) {db.prepare('INSERT INTO notifications VALUES(?,?,?,?)').run(randomUUID(),id,message,new Date().toISOString());}
  paymentAuthority=createPaymentAuthority({db,audit,notify});
  dispatchAuthority=createDispatchAuthority({db,audit,notify});
  safetyAuthority=createSafetyAuthority({db,audit});
  reservationAuthority=createReservationAuthority({db,audit});
  function fail(status,message) {const e=new Error(message);e.status=status;throw e;}
  function requireRole(user,...roles) { if(!user) fail(401,'Sign in to continue'); if(!roles.includes(user.role)) fail(403,'This action is not permitted for this account'); }
  function getUser(req) {const token=req.headers.cookie?.match(/(?:^|;\s*)r2v_session=([^;]+)/)?.[1];if(!token)return null;return db.prepare('SELECT u.id,u.name,u.email,u.role,u.verified FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?').get(digest(token),Date.now()) || null;}
  function bookingFor(id,user) {const b=db.prepare('SELECT b.*,l.payload AS listing FROM bookings b JOIN listings l ON l.id=b.listing_id WHERE b.id=?').get(id);if(!b)fail(404,'Booking not found');if(user.role!=='admin' && b.customer_id!==user.id && b.driver_id!==user.id)fail(403,'Booking belongs to another account');return b;}
  async function readBody(req) {let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>65536)fail(413,'Request is too large');chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString() || '{}');}catch{fail(400,'Invalid JSON body');}}
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
      if(path==='/api/health' && method==='GET') return send(200,{status:'ok',database:db.prepare('SELECT 1 AS ready').get().ready===1});
      if(path==='/api/config' && method==='GET')return send(200,{tiers:TIERS,paymentMode:'manual_verification',externalPaymentsConnected:false});
      if(!path.startsWith('/api/')) {
        const allowed={'/':'index.html','/index.html':'index.html','/js/app.js':'js/app.js','/js/preview.js':'js/preview.js','/css/style.css':'css/style.css','/css/app.css':'css/app.css'};
        if(method!=='GET' && method!=='HEAD')fail(405,'Method not allowed');
        if(!allowed[path])fail(404,'Page not found');
        const mime=path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':'text/html';
        res.writeHead(200,{'Content-Type':mime+'; charset=utf-8'});return res.end(method==='HEAD'?'':readFileSync(join(root,allowed[path])));
      }
      const user=getUser(req);
      const body=method==='GET'?{}:await readBody(req);
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
        const mine=url.searchParams.get('mine')==='true';if(mine)requireRole(user,'agent','admin');
        const rows=mine?(user.role==='admin'?db.prepare('SELECT * FROM listings').all():db.prepare('SELECT * FROM listings WHERE owner_id=?').all(user.id)):db.prepare('SELECT * FROM listings WHERE approved=1 AND available=1').all();
        return send(200,{listings:rows.map(r=>({...JSON.parse(r.payload),id:r.id,approved:Boolean(r.approved),available:Boolean(r.available)}))});
      }
      if(path==='/api/listings' && method==='POST') {
        requireRole(user,'agent','admin');if(!user.verified)fail(403,'Agent approval is required');let listing;try{listing=validateListing(body);}catch(e){fail(400,e.message);}
        listing.id=randomUUID();db.prepare('INSERT INTO listings VALUES(?,?,?,?,1)').run(listing.id,user.id,JSON.stringify(listing),0);audit(user,'listing.created',listing.id);return send(201,{...listing,approved:false});
      }
      const listingMatch=path.match(/^\/api\/listings\/([^/]+)$/);
      if(listingMatch && method==='PATCH') {
        requireRole(user,'agent','admin');const row=db.prepare('SELECT * FROM listings WHERE id=?').get(listingMatch[1]);if(!row)fail(404,'Listing not found');if(user.role!=='admin' && row.owner_id!==user.id)fail(403,'Listing belongs to another agent');
        if(body.available!==undefined && typeof body.available!=='boolean')fail(400,'Availability must be a boolean');
        if(body.approved!==undefined && (user.role!=='admin'||typeof body.approved!=='boolean'))fail(403,'Only administrators approve listings');
        let payload=JSON.parse(row.payload);if(body.title!==undefined || body.price!==undefined || body.property || body.location || body.timing){try{payload={...validateListing({...payload,...body}),id:row.id};}catch(e){fail(400,e.message);}}
        const edited=JSON.stringify(payload)!==row.payload;const approved=user.role==='admin'?(body.approved===undefined?row.approved:Number(body.approved)):(edited?0:row.approved);
        transaction(()=>{db.prepare('UPDATE listings SET payload=?,approved=?,available=? WHERE id=?').run(JSON.stringify(payload),approved,body.available===undefined?row.available:Number(body.available),row.id);audit(user,'listing.updated',row.id,{approved});});return send(200,{...payload,approved:Boolean(approved)});
      }
      if(path==='/api/search' && method==='POST') {
        const message=String(body.message||'').trim();if(!message || message.length>2000)fail(400,'Search message is required (maximum 2000 characters)');
        if(body.budget!=null && (!Number.isFinite(Number(body.budget)) || Number(body.budget)<=0))fail(400,'Budget must be positive');
        const listings=db.prepare('SELECT * FROM listings WHERE approved=1 AND available=1').all().map(r=>({...JSON.parse(r.payload),id:r.id}));
        const result=await searchProperties({message,searchText:message,userGoal:'property',location:{city:String(body.city||'Nairobi'),country:'Kenya'},budget:body.budget==null?undefined:Number(body.budget),availableTime:body.availableTime,properties:listings,propertyOpportunities:listings});
        return send(200,result);
      }
      if(path==='/api/bookings' && method==='POST') {
        requireRole(user,'customer');const listing=db.prepare('SELECT * FROM listings WHERE id=? AND approved=1 AND available=1').get(body.listingId);if(!listing)fail(409,'Listing is unavailable or not approved');
        const tier=body.tier||'general';if(!Object.hasOwn(TIERS,tier))fail(400,'Invalid ride tier');const date=new Date(body.scheduledAt);if(!Number.isFinite(date.getTime())||date.getTime()<=Date.now())fail(400,'Choose a future viewing time');
        const id=randomUUID();const paymentId=randomUUID();const duration=Number(JSON.parse(listing.payload)?.timing?.duration)||60;const start=date.toISOString(),end=new Date(date.getTime()+duration*60000).toISOString();let reservation;try{reservation=reservationAuthority.createHold({customerId:user.id,resourceId:listing.id,resourceType:'property',start,end,idempotencyKey:'booking:'+id,dependencies:['PAYMENT_CONFIRMED'],actor:user});}catch(e){if(e.code==='RESERVATION_CONFLICT')fail(409,'The property already has a viewing during this time');throw e;}try{transaction(()=>{db.prepare('INSERT INTO bookings VALUES(?,?,?,?,?,?,?,NULL,?)').run(id,user.id,listing.id,tier,TIERS[tier],'requested',start,new Date().toISOString());db.prepare('INSERT INTO payments VALUES(?,?,?,\'pending\',NULL,NULL,NULL)').run(paymentId,id,TIERS[tier]);db.prepare('INSERT INTO booking_reservations(booking_id,reservation_id,created_at) VALUES(?,?,?)').run(id,reservation.id,new Date().toISOString());audit(user,'booking.requested',id,{reservationId:reservation.id});notify(user.id,'Viewing requested. Payment verification is pending.');});}catch(e){try{reservationAuthority.transition({reservationId:reservation.id,to:'CANCELLED',actor:user});}catch{}throw e;}return send(201,{id,status:'requested',amount:TIERS[tier],paymentId,paymentStatus:'pending',reservationId:reservation.id,reservationStatus:reservation.status});
      }
      if(path==='/api/bookings' && method==='GET') {
        requireRole(user,'customer','admin','driver');const condition=user.role==='admin'?'1=1':user.role==='driver'?"EXISTS(SELECT 1 FROM dispatch_assignments da WHERE da.booking_id=b.id AND da.driver_id=? AND da.status IN ('OFFERED','ACCEPTED','ASSIGNED','DRIVER_EN_ROUTE','ARRIVED','TRIP_STARTED','TRIP_COMPLETED'))":'b.customer_id=?';const driverAssignmentFilter=user?.role==='driver'?' AND da.driver_id=?':'';const query=`SELECT b.*,p.id AS payment_id,p.status AS payment_status,p.reference AS payment_reference,l.payload AS listing,(SELECT da.id FROM dispatch_assignments da WHERE da.booking_id=b.id${driverAssignmentFilter} AND da.status IN ('OFFERED','ACCEPTED','ASSIGNED','DRIVER_EN_ROUTE','ARRIVED','TRIP_STARTED','TRIP_COMPLETED') ORDER BY da.created_at DESC LIMIT 1) AS assignment_id,(SELECT da.status FROM dispatch_assignments da WHERE da.booking_id=b.id${driverAssignmentFilter} ORDER BY da.created_at DESC LIMIT 1) AS assignment_status FROM bookings b JOIN payments p ON p.booking_id=b.id JOIN listings l ON l.id=b.listing_id WHERE ${condition} ORDER BY b.created_at DESC`;
        const rows=user.role==='driver'?db.prepare(query).all(user.id,user.id,user.id):user.role==='admin'?db.prepare(query).all():db.prepare(query).all(user.id);return send(200,{bookings:rows.map(r=>({...r,listing:JSON.parse(r.listing)}))});
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
        catch(e){const statuses={ASSIGNMENT_NOT_FOUND:404,NOT_ASSIGNMENT_DRIVER:403,INVALID_TRANSITION:409};fail(statuses[e.code]||409,e.code||'Dispatch response failed');}
      }
      const actionMatch=path.match(/^\/api\/bookings\/([^/]+)\/(assign|complete|cancel)$/);
      if(actionMatch && method==='POST') {
        requireRole(user,'admin','customer','driver');const b=bookingFor(actionMatch[1],user);const action=actionMatch[2];
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
            const statuses={BOOKING_NOT_FOUND:404,DRIVER_INELIGIBLE:400,PAYMENT_OR_BOOKING_NOT_CONFIRMED:409,RESERVATION_NOT_CONFIRMED:409,ASSIGNMENT_CONFLICT:409,IDEMPOTENCY_KEY_REQUIRED:400};
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
              if(current.status===state)continue;
              current=dispatchAuthority.transition({assignmentId:assignment.id,to:state,actor:user});
            }
            audit(user,'viewing.completed',b.id,{assignmentId:assignment.id});notify(b.customer_id,'Your viewing is completed.');
            return send(200,{status:'completed',assignmentId:assignment.id});
          } catch(e){fail(409,e.code||'Viewing completion failed');}
        }
        if(user.role==='driver')fail(403,'Drivers cannot cancel customer bookings');if(['completed','cancelled'].includes(b.status))fail(409,'Booking cannot be cancelled');
        const payment=db.prepare('SELECT * FROM payments WHERE booking_id=?').get(b.id);const link=db.prepare('SELECT reservation_id FROM booking_reservations WHERE booking_id=?').get(b.id);try{dispatchAuthority.cancelForBooking({bookingId:b.id,actor:user});if(link){const reservation=reservationAuthority.get(link.reservation_id);if(reservation&&!['CANCELLED','HOLD_EXPIRED','COMPLETED','NO_SHOW'].includes(reservation.status))reservationAuthority.transition({reservationId:reservation.id,to:'CANCELLED',actor:user});}if(payment?.status==='paid')paymentAuthority.markRefundPending({bookingId:b.id,actor:user});else if(payment?.status==='pending')paymentAuthority.cancelPending({bookingId:b.id,actor:user});db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(b.id);audit(user,'booking.cancelled',b.id,{reservationId:link?.reservation_id||null});notify(b.customer_id,payment?.status==='paid'?'Booking cancelled. Paid amount is marked for refund review.':'Booking cancelled.');return send(200,{status:'cancelled',paymentStatus:payment?.status==='paid'?'refund_pending':'cancelled'});}catch(e){fail(409,e.code||'Booking cancellation failed');}
      }
      if(path==='/api/admin/users' && method==='GET') {requireRole(user,'admin');return send(200,{users:db.prepare('SELECT id,email,name,role,verified FROM users ORDER BY name').all()});}
      const approveMatch=path.match(/^\/api\/admin\/users\/([^/]+)\/approve$/);
      if(approveMatch && method==='POST') {requireRole(user,'admin');const target=db.prepare('SELECT id,role FROM users WHERE id=?').get(approveMatch[1]);if(!target||!['driver','agent'].includes(target.role))fail(400,'Only driver and agent accounts require approval');transaction(()=>{db.prepare('UPDATE users SET verified=1 WHERE id=?').run(target.id);audit(user,'account.approved',target.id);notify(target.id,'Your account has been approved.');});return send(200,{success:true});}
      if(path==='/api/admin/audit' && method==='GET') {requireRole(user,'admin');return send(200,{events:db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all()});}
      if(path==='/api/notifications' && method==='GET') {requireRole(user,'admin','customer','driver','agent');return send(200,{notifications:db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(user.id)});}
      fail(404,'Endpoint not found');
    } catch(error) {
      const status=error.status || 500;if(status===500)console.error('Request failed:',error.message);
      if(!res.headersSent)send(status,{error:status===500?'Internal server error':error.message});else res.end();
    }
  });
  return {server,db,close:async()=>{if(server.listening)await new Promise(resolve=>server.close(resolve));db.close();}};
}
module.exports={createApp,TIERS};
