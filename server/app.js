const http = require('node:http');
const { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { openStore } = require('./store');
const { validateListing } = require('./validation');
const { searchProperties } = require('../ai/Core/journey-orchestrator/search-adapter');
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
  if (bootEmail && bootPassword && !db.prepare('SELECT id FROM users WHERE email=?').get(bootEmail.toLowerCase())) {
    if (bootPassword.length<12) throw new Error('Administrator password must contain at least 12 characters');
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(randomUUID(),bootEmail.toLowerCase(),'Administrator',passwordHash(bootPassword),'admin');
  }
  function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result=fn(); db.exec('COMMIT'); return result; } catch(e) {db.exec('ROLLBACK'); throw e;} }
  function audit(user,action,id,details={}) {db.prepare('INSERT INTO audit(actor_id,action,entity_id,details,created_at) VALUES(?,?,?,?,?)').run(user?.id || null,action,id,JSON.stringify(details),new Date().toISOString());}
  function notify(id,message) {db.prepare('INSERT INTO notifications VALUES(?,?,?,?)').run(randomUUID(),id,message,new Date().toISOString());}
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
        const id=randomUUID();const paymentId=randomUUID();transaction(()=>{db.prepare('INSERT INTO bookings VALUES(?,?,?,?,?,?,?,NULL,?)').run(id,user.id,listing.id,tier,TIERS[tier],'requested',date.toISOString(),new Date().toISOString());db.prepare('INSERT INTO payments VALUES(?,?,?,\'pending\',NULL,NULL,NULL)').run(paymentId,id,TIERS[tier]);audit(user,'booking.requested',id);notify(user.id,'Viewing requested. Payment verification is pending.');});return send(201,{id,status:'requested',amount:TIERS[tier],paymentId,paymentStatus:'pending'});
      }
      if(path==='/api/bookings' && method==='GET') {
        requireRole(user,'customer','admin','driver');const condition=user.role==='admin'?'1=1':user.role==='driver'?'b.driver_id=?':'b.customer_id=?';const query=`SELECT b.*,p.id AS payment_id,p.status AS payment_status,p.reference AS payment_reference,l.payload AS listing FROM bookings b JOIN payments p ON p.booking_id=b.id JOIN listings l ON l.id=b.listing_id WHERE ${condition} ORDER BY b.created_at DESC`;
        const rows=user.role==='admin'?db.prepare(query).all():db.prepare(query).all(user.id);return send(200,{bookings:rows.map(r=>({...r,listing:JSON.parse(r.listing)}))});
      }
      const verifyMatch=path.match(/^\/api\/payments\/([^/]+)\/verify$/);
      if(verifyMatch && method==='POST') {
        requireRole(user,'admin');const payment=db.prepare('SELECT * FROM payments WHERE id=?').get(verifyMatch[1]);if(!payment)fail(404,'Payment not found');
        const reference=String(body.reference||'').trim();if(!/^[A-Za-z0-9_-]{6,80}$/.test(reference))fail(400,'A valid transaction reference is required');if(body.amount!==payment.amount)fail(400,'Verified amount must exactly match the booking charge');
        if(payment.status==='paid'){if(payment.reference===reference)return send(200,{success:true,duplicate:true});fail(409,'Payment was already verified with another reference');}
        const b=bookingFor(payment.booking_id,user);if(b.status!=='requested')fail(409,'Booking cannot receive payment in its current state');
        if(db.prepare('SELECT id FROM payments WHERE reference=?').get(reference))fail(409,'Transaction reference has already been used');
        transaction(()=>{db.prepare('UPDATE payments SET status=\'paid\',reference=?,verified_by=?,verified_at=? WHERE id=?').run(reference,user.id,new Date().toISOString(),payment.id);db.prepare('UPDATE bookings SET status=\'confirmed\' WHERE id=?').run(b.id);audit(user,'payment.manually_verified',payment.id,{reference,amount:payment.amount});notify(b.customer_id,'Payment verified. Viewing confirmed; driver assignment pending.');});return send(200,{success:true,status:'confirmed',verification:'manual'});
      }
      const actionMatch=path.match(/^\/api\/bookings\/([^/]+)\/(assign|complete|cancel)$/);
      if(actionMatch && method==='POST') {
        requireRole(user,'admin','customer','driver');const b=bookingFor(actionMatch[1],user);const action=actionMatch[2];
        if(action==='assign') {
          requireRole(user,'admin');if(b.status!=='confirmed')fail(409,'Payment must be verified before assignment');
          const driver=db.prepare('SELECT * FROM users WHERE id=? AND role=\'driver\' AND verified=1').get(body.driverId);if(!driver)fail(400,'Choose an approved driver');
          transaction(()=>{db.prepare('UPDATE bookings SET driver_id=?,status=\'assigned\' WHERE id=?').run(driver.id,b.id);audit(user,'driver.assigned',b.id,{driverId:driver.id});notify(driver.id,'A viewing trip has been assigned to you.');notify(b.customer_id,'Driver assigned to your viewing.');});return send(200,{status:'assigned'});
        }
        if(action==='complete') {
          requireRole(user,'admin','driver');if(b.status!=='assigned')fail(409,'Only assigned viewings can be completed');
          transaction(()=>{db.prepare('UPDATE bookings SET status=\'completed\' WHERE id=?').run(b.id);audit(user,'viewing.completed',b.id);notify(b.customer_id,'Your viewing is completed.');});return send(200,{status:'completed'});
        }
        if(user.role==='driver')fail(403,'Drivers cannot cancel customer bookings');if(['completed','cancelled'].includes(b.status))fail(409,'Booking cannot be cancelled');
        transaction(()=>{db.prepare('UPDATE bookings SET status=\'cancelled\' WHERE id=?').run(b.id);db.prepare('UPDATE payments SET status=CASE WHEN status=\'paid\' THEN \'refund_pending\' ELSE \'cancelled\' END WHERE booking_id=?').run(b.id);audit(user,'booking.cancelled',b.id);notify(b.customer_id,'Booking cancelled. Any paid amount is marked for refund review.');});return send(200,{status:'cancelled'});
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
