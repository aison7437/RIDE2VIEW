const {randomUUID}=require('node:crypto');
function createAgentVisibilityAuthority({db,audit=()=>{}}){
 const now=()=>new Date().toISOString();
 const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
 const requireRole=(user,...roles)=>{if(!user)fail(401,'Sign in to continue');if(!roles.includes(user.role))fail(403,'Forbidden for this role');};
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
 const plans=()=>db.prepare('SELECT code,name,price_kes,duration_days,listing_limit,featured_slots FROM agent_visibility_plans WHERE active=1 ORDER BY price_kes').all();
 const getActive=agentId=>db.prepare("SELECT * FROM agent_visibility_subscriptions WHERE agent_id=? AND status='ACTIVE' AND ends_at>? ORDER BY ends_at DESC LIMIT 1").get(agentId,now());
 function expire(){db.prepare("UPDATE agent_visibility_subscriptions SET status='EXPIRED',updated_at=? WHERE status='ACTIVE' AND ends_at<=?").run(now(),now());}
 function mine(user){requireRole(user,'agent');expire();return {plans:plans(),subscriptions:db.prepare('SELECT * FROM agent_visibility_subscriptions WHERE agent_id=? ORDER BY created_at DESC').all(user.id),featured:db.prepare('SELECT f.listing_id FROM agent_featured_listings f JOIN agent_visibility_subscriptions s ON s.id=f.subscription_id WHERE f.agent_id=? AND s.status=\'ACTIVE\' AND s.ends_at>?').all(user.id,now()).map(x=>x.listing_id)};}
 function subscribe(user,{planCode}={}){
  requireRole(user,'agent');const plan=db.prepare('SELECT * FROM agent_visibility_plans WHERE code=? AND active=1').get(planCode);
  if(!plan)fail(404,'Plan not found');return tx(()=>{
   expire();
   if(getActive(user.id))fail(409,'An active agent subscription already exists');
   const pending=db.prepare("SELECT * FROM agent_visibility_subscriptions WHERE agent_id=? AND status='PENDING' ORDER BY created_at DESC LIMIT 1").get(user.id);
   if(pending){if(pending.plan_code===plan.code)return {...pending,duplicate:true};fail(409,'Resolve the pending subscription first');}
   const id=randomUUID(),t=now();
   if(plan.price_kes===0){
    const end=new Date(Date.parse(t)+plan.duration_days*86400000).toISOString();
    db.prepare('INSERT INTO agent_visibility_subscriptions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,user.id,plan.code,'ACTIVE',t,end,null,0,plan.listing_limit,plan.featured_slots,t,t);
   }else{
    db.prepare('INSERT INTO agent_visibility_subscriptions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,user.id,plan.code,'PENDING',null,null,null,plan.price_kes,plan.listing_limit,plan.featured_slots,t,t);
   }
   audit(user,'agent_visibility.requested',id,{planCode:plan.code});return db.prepare('SELECT * FROM agent_visibility_subscriptions WHERE id=?').get(id);
  });
 }
 function activate(user,id,{reference}={}){
  requireRole(user,'admin');if(typeof reference!=='string'||!/^[-a-zA-Z0-9_.:]{6,120}$/.test(reference))fail(400,'Verified external payment reference required');
  return tx(()=>{
   expire();const row=db.prepare('SELECT * FROM agent_visibility_subscriptions WHERE id=?').get(id);
   if(!row)fail(404,'Subscription not found');
   if(row.status==='ACTIVE'){if(row.payment_reference===reference)return {...row,duplicate:true};fail(409,'Subscription already active');}
   if(row.status!=='PENDING')fail(409,'Subscription is not pending');
   if(getActive(row.agent_id))fail(409,'Agent has an active plan');
   if(db.prepare('SELECT 1 FROM payment_references WHERE reference=?').get(reference)||db.prepare('SELECT 1 FROM agent_visibility_subscriptions WHERE payment_reference=?').get(reference))fail(409,'Payment reference already used');
   const t=now(),plan=db.prepare('SELECT duration_days FROM agent_visibility_plans WHERE code=?').get(row.plan_code);
   const end=new Date(Date.parse(t)+plan.duration_days*86400000).toISOString();
   db.prepare('INSERT INTO payment_references(reference,kind,entity_id,amount,currency,created_at) VALUES(?,?,?,?,?,?)').run(reference,'agent_visibility',id,row.amount_kes,'KES',t);
   db.prepare("UPDATE agent_visibility_subscriptions SET status='ACTIVE',starts_at=?,ends_at=?,payment_reference=?,updated_at=? WHERE id=? AND status='PENDING'").run(t,end,reference,t,id);
   audit(user,'agent_visibility.activated',id,{reference});return db.prepare('SELECT * FROM agent_visibility_subscriptions WHERE id=?').get(id);
  });
 }
 function cancel(user,id){
  requireRole(user,'agent','admin');return tx(()=>{
   const row=db.prepare('SELECT * FROM agent_visibility_subscriptions WHERE id=?').get(id);
   if(!row)fail(404,'Subscription not found');if(user.role!=='admin'&&row.agent_id!==user.id)fail(403,'Subscription belongs to another agent');
   if(row.status==='CANCELLED')return {...row,duplicate:true};
   if(!['PENDING','ACTIVE'].includes(row.status))fail(409,'Subscription cannot be cancelled');
   db.prepare("UPDATE agent_visibility_subscriptions SET status='CANCELLED',updated_at=? WHERE id=?").run(now(),id);
   db.prepare('DELETE FROM agent_featured_listings WHERE subscription_id=?').run(id);
   audit(user,'agent_visibility.cancelled',id);return {success:true,status:'CANCELLED'};
  });
 }
 function feature(user,listingId,enabled){
  requireRole(user,'agent');return tx(()=>{
   expire();const listing=db.prepare('SELECT owner_id FROM listings WHERE id=?').get(listingId);
   if(!listing)fail(404,'Property not found');if(listing.owner_id!==user.id)fail(403,'Property belongs to another agent');
   if(!enabled){db.prepare('DELETE FROM agent_featured_listings WHERE agent_id=? AND listing_id=?').run(user.id,listingId);return {success:true,featured:false};}
   const active=getActive(user.id);
   if(!active||active.featured_slots===0)fail(409,'Active Premium subscription required');
   const existing=db.prepare('SELECT subscription_id FROM agent_featured_listings WHERE agent_id=? AND listing_id=?').get(user.id,listingId);
   if(existing?.subscription_id===active.id)return {success:true,featured:true,duplicate:true};
   const count=db.prepare('SELECT COUNT(*) AS n FROM agent_featured_listings WHERE subscription_id=?').get(active.id).n;
   if(count>=active.featured_slots)fail(409,'Featured slot limit reached');
   db.prepare('INSERT INTO agent_featured_listings(agent_id,listing_id,subscription_id,created_at) VALUES(?,?,?,?) ON CONFLICT(agent_id,listing_id) DO UPDATE SET subscription_id=excluded.subscription_id,created_at=excluded.created_at').run(user.id,listingId,active.id,now());
   audit(user,'agent_visibility.featured',listingId,{subscriptionId:active.id});return {success:true,featured:true};
  });
 }
 function decorate(publicListings){
  const featured=new Set(db.prepare("SELECT f.listing_id FROM agent_featured_listings f JOIN agent_visibility_subscriptions s ON s.id=f.subscription_id WHERE s.status='ACTIVE' AND s.ends_at>? AND s.featured_slots>0").all(now()).map(x=>x.listing_id));
  return publicListings.map(x=>({...x,sponsored:featured.has(x.id)})).sort((a,b)=>Number(b.sponsored)-Number(a.sponsored));
 }
 function capacity(user){
  requireRole(user,'agent');const active=getActive(user.id);return {listingLimit:active?.listing_limit??3,plan:active?.plan_code??'BASIC'};
 }
 return {plans,mine,subscribe,activate,cancel,feature,decorate,capacity};
}
module.exports={createAgentVisibilityAuthority};
