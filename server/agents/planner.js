const {active,assertDriver,busy}=require('../mobility/onboarding/eligibility');
const {remoteConflict}=require('../property-services/calendar');
const catalog=Object.freeze([
 {id:'operations-intelligence',label:'Business analytics and friction review',roles:['admin']},
 {id:'property-advice',label:'Property fit and viewing options',roles:['customer'],field:'listingId',optional:true},
 {id:'agent-assistant',label:'Property and lead assistant',roles:['agent']},
 {id:'driver-coach',label:'Driver readiness and earnings',roles:['driver']},
 {id:'booking-review',label:'Viewing payment and recovery review',roles:['customer','admin'],field:'bookingId'},
 {id:'commerce-advice',label:'Compare available catalog items',roles:['customer'],field:'category'},
 {id:'shipment-advice',label:'Shipment capacity review',roles:['customer'],field:'shipmentId'},
 {id:'opportunities',label:'Property opportunities matching your profile',roles:['customer']},
 {id:'experiences',label:'Experiences (provider not connected)',roles:['customer']}
]);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function createPlanner({db,supply,expansion,analytics}) {
 function authorize(actor,request) {
  if(!actor)fail(401,'Sign in to continue');
  const definition=catalog.find(x=>x.id===request.workflow);
  if(!definition||!definition.roles.includes(actor.role))fail(403,'Workflow not available for this account');
  if(request.workflow==='booking-review'){
   const b=db.prepare('SELECT customer_id FROM bookings WHERE id=?').get(request.bookingId);
   if(!b||actor.role!=='admin'&&b.customer_id!==actor.id)fail(404,'Booking not found');
  }
  if(request.workflow==='shipment-advice'&&!db.prepare('SELECT id FROM logistics_shipments WHERE id=? AND customer_id=?').get(request.shipmentId,actor.id))fail(404,'Shipment not found');
  return definition;
 }
 function normalize(actor,body) {
  const definition=catalog.find(x=>x.id===body.workflow);
  if(!definition)fail(400,'Unknown workflow');
  const request={workflow:definition.id};
  const allowed=new Set(['workflow','idempotencyKey',...(definition.field?[definition.field]:[]),...(definition.id==='operations-intelligence'?['from','to']:[])]);
  if(Object.keys(body).some(k=>!allowed.has(k)))fail(400,'Unexpected workflow input; evidence is loaded from your records');
  if(definition.field){const v=body[definition.field];if(v!==undefined&&typeof v!=='string')fail(400,'Invalid workflow reference');if(!definition.optional&&!v?.trim())fail(400,`${definition.field} is required`);if(v?.length>128)fail(400,'Workflow reference is too long');if(v?.trim())request[definition.field]=v.trim();}
  if(definition.id==='operations-intelligence'){const p=analytics.period(body);request.from=p.from;request.to=p.to;}
  authorize(actor,request);return request;
 }
 function plan(actor,request) {
  authorize(actor,request);
  const now=new Date().toISOString(),nodes=[];
  const add=(agent,input,dependencies=[])=>{nodes.push({node_id:agent,type:'advice',responsible_agent:agent,input,dependencies,timeout:5000});};
  const preferences=()=>JSON.parse(db.prepare('SELECT preferences FROM customer_profiles WHERE user_id=?').get(actor.id)?.preferences||'{}');
  const published=()=>supply.listPublic().slice(0,100);
  if(request.workflow==='operations-intelligence'){const snapshot=analytics.snapshot(actor,request);add('business-analytics-agent',{snapshot});add('friction-hunter-agent',{snapshot});}
  if(request.workflow==='property-advice') {
   const prefs=preferences();let properties=request.listingId?supply.listPublic().filter(p=>p.id===request.listingId):published();
   if(request.listingId){properties=properties.filter(p=>p.id===request.listingId);if(!properties.length)fail(404,'Published property not found');}
   const input={properties,propertyOpportunities:properties,location:{city:prefs.city},budget:prefs.budget,bedrooms:prefs.bedrooms,userGoal:'property'};
   add('lifestyle-agent',input);add('property-agent',input,['lifestyle-agent']);add('lead-qualification-agent',{preferences:prefs,properties},['property-agent']);
   if(request.listingId){
    const owner=db.prepare('SELECT owner_id FROM listings WHERE id=?').get(request.listingId).owner_id;
    const slots=supply.slots(request.listingId,actor).filter(s=>!remoteConflict(db,owner,request.listingId,s.start_at,s.end_at)&&!db.prepare(`SELECT 1 FROM viewing_requests v JOIN listings l ON l.id=v.listing_id JOIN property_slots s ON s.id=v.slot_id WHERE l.owner_id=? AND v.status IN ('REQUESTED','ACCEPTED') AND s.start_at<? AND s.end_at>?`).get(owner,s.end_at,s.start_at));
    add('scheduling-agent',{options:slots.slice(0,30).map(s=>({resourceId:s.id,start:s.start_at,end:s.end_at,hardConstraintsSatisfied:true,availabilityConfirmed:true,travelBufferMinutes:0,requiredTravelMinutes:0,preference:0,travelEfficiency:0,waitingEfficiency:0,resourceUtilization:0,costEfficiency:0,bufferAdequacy:0,resilience:0}))},['lead-qualification-agent']);
   }
  }
  if(request.workflow==='agent-assistant') {
   const properties=db.prepare('SELECT * FROM listings WHERE owner_id=? ORDER BY id LIMIT 100').all(actor.id).map(p=>({id:p.id,published:supply.visible(p),photoCount:db.prepare("SELECT count(*) n FROM property_media WHERE listing_id=? AND kind='photo'").get(p.id).n,futureSlots:db.prepare('SELECT count(*) n FROM property_slots WHERE listing_id=? AND enabled=1 AND start_at>?').get(p.id,now).n}));
   const leads=db.prepare('SELECT p.request_id AS requestId,p.stage FROM property_leads p JOIN viewing_requests v ON v.id=p.request_id JOIN listings l ON l.id=v.listing_id WHERE l.owner_id=? ORDER BY p.updated_at DESC LIMIT 100').all(actor.id);
   add('agent-assistant',{properties,leads});
  }
  if(request.workflow==='driver-coach') {
   const profile=db.prepare('SELECT online FROM driver_profiles WHERE user_id=?').get(actor.id);
   const earnings=db.prepare("SELECT COALESCE(sum(beneficiary_amount),0) recorded,COALESCE(sum(CASE WHEN status='PAID' THEN beneficiary_amount ELSE 0 END),0) paid FROM marketplace_earnings WHERE beneficiary_id=? AND beneficiary_role='driver'").get(actor.id);
   const completedTrips=db.prepare("SELECT (SELECT count(*) FROM bookings b WHERE driver_id=? AND status='completed' AND NOT EXISTS(SELECT 1 FROM journey_stops s JOIN viewing_journeys j ON j.id=s.journey_id WHERE s.booking_id=b.id AND j.master_booking_id<>b.id))+(SELECT count(*) FROM ride2go_trips WHERE driver_id=? AND status='COMPLETED') n").get(actor.id,actor.id).n;
   const openOffers=db.prepare("SELECT (SELECT count(*) FROM dispatch_assignments WHERE driver_id=? AND status='OFFERED' AND lease_expires_at>?)+(SELECT count(*) FROM ride2go_assignments WHERE driver_id=? AND status='OFFERED' AND lease_expires_at>?) n").get(actor.id,now,actor.id,now).n;
   const expiringChecks=db.prepare("SELECT kind,expires_at AS expiresAt FROM mobility_checks WHERE subject_id=? AND status='APPROVED' AND expires_at>? AND expires_at<=?").all(actor.id,now,new Date(Date.now()+30*86400000).toISOString());
   add('driver-coach-agent',{verified:active(db,actor.id,'driver')&&Boolean(db.prepare('SELECT verified FROM users WHERE id=?').get(actor.id)?.verified),online:Boolean(profile?.online),earnings:{...earnings,currency:'KES'},completedTrips,openOffers,expiringChecks});
  }
  if(request.workflow==='booking-review') {
   const b=db.prepare('SELECT b.*,p.status payment_status,p.amount payment_amount FROM bookings b JOIN payments p ON p.booking_id=b.id WHERE b.id=?').get(request.bookingId);
   if(!b)fail(404,'Booking payment not found');
   add('transaction-agent',{recordedPayment:{bookingId:b.id,amount:b.payment_amount,status:b.payment_status,currency:'KES'}});
   const signals=[];if(b.amount!==b.payment_amount)signals.push({type:'PAYMENT_ANOMALY',severity:'MEDIUM',source:'booking-payment-status',timestamp:now});
   add('trust-safety-agent',{signals});
   if(b.status==='cancelled'||b.payment_status==='pending')add('support-agent',{incidentType:b.status==='cancelled'?'CUSTOMER_CANCELLED':b.payment_status==='pending'?'PAYMENT_PENDING':'UNKNOWN',affectedEntity:b.id});
   if(actor.role==='admin') {
    // Dispatch still revalidates current eligibility. No GPS/ETA is invented for idle drivers.
    const candidates=[];
    const packageRow=db.prepare('SELECT j.plan FROM viewing_journeys j JOIN journey_stops s ON s.journey_id=j.id WHERE s.booking_id=?').get(b.id);
    const passengers=packageRow?JSON.parse(packageRow.plan).participants.length:1;
    for(const d of db.prepare('SELECT user_id FROM driver_profiles WHERE online=1').all()) {
     try {const p=assertDriver(db,d.user_id,b.tier,passengers,{atTime:b.scheduled_at});if(busy(db,d.user_id))continue;
      candidates.push({id:d.user_id,online:true,verified:true,gender:p.gender,vehicle:{available:true,capacity:p.capacity},location:null});
     }catch(e){if(e.status!==409)throw e;}
    }
    add('mobility-agent',{segment:b.tier,passengers,candidates});
   }
  }
  if(request.workflow==='commerce-advice') {
   const options=expansion.catalog().filter(x=>x.category===request.category).slice(0,100).map(x=>({merchantId:x.merchant_id,basket:[{sku:x.sku,qty:1,title:x.title}],authoritativeTotal:x.unit_price,inventoryConfirmed:true,priceConfirmed:true,basketCompleteness:1,merchantReliability:0,fulfillmentAvailability:0}));
   add('rideplate-agent',{options});
  }
  if(request.workflow==='shipment-advice') {const s=db.prepare('SELECT shipment_class,weight_kg FROM logistics_shipments WHERE id=?').get(request.shipmentId);add('logistics-agent',{shipmentClass:s.shipment_class,weightKg:s.weight_kg});}
  if(request.workflow==='opportunities') {
   const p=preferences();const candidates=published().filter(x=>p.budget&&p.city&&p.goal&&x.price<=p.budget&&x.location?.city?.toLowerCase()===p.city.toLowerCase()&&(x.transactionType==='sale'?'buy':'rent')===p.goal&&(p.bedrooms==null||x.property?.bedrooms===p.bedrooms)).map(x=>({id:x.id,title:x.title,domain:'PROPERTY',availabilityConfirmed:true,hardConstraintsSatisfied:true,estimatedCost:x.price,intentFit:1,contextFit:1,timingFit:0,budgetFit:1,trust:0,availability:1,crossServiceValue:0}));
   add('opportunity-agent',{budget:p.budget,candidates});
  }
  if(request.workflow==='experiences')add('experiences-agent',{experiences:[]});
  return nodes;
 }
 return {catalog,authorize,normalize,plan};
}
module.exports={createPlanner};
