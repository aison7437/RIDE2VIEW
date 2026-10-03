function error(message,code='DRIVER_INELIGIBLE'){throw Object.assign(new Error(message),{code,status:409});}
function active(db,id,kind,atTime=new Date().toISOString()){
 const limit=atTime>new Date().toISOString()?atTime:new Date().toISOString();
 const check=db.prepare('SELECT * FROM mobility_checks WHERE subject_id=? AND kind=?').get(id,kind);
 if(check?.status!=='APPROVED'||!check.expires_at||check.expires_at<=limit)return false;
 if(kind==='driver'||kind==='women_driver'){
  const profile=db.prepare('SELECT revision FROM driver_profiles WHERE user_id=?').get(id);
  if(!profile||check.profile_revision!==profile.revision)return false;
 }
 const ids=JSON.parse(check.evidence);
 return ids.length>0&&ids.every(docId=>{const doc=db.prepare('SELECT owner_id,expires_at FROM mobility_documents WHERE id=?').get(docId);return doc?.owner_id===id&&doc.expires_at>limit;});
}
function assertCustomer(db,id,tier,passengers=1,atTime){
 if(['women','students'].includes(tier)){
  if(passengers!==1)error('Protected-tier pilot requires one verified adult rider','RIDER_INELIGIBLE');
  if(!active(db,id,tier==='women'?'women_rider':'student',atTime))error('Current rider eligibility review required','RIDER_INELIGIBLE');
 }
}
function assertDriver(db,id,tier='general',passengers=1,{requireOnline=true,atTime}={}){
 const user=db.prepare("SELECT verified FROM users WHERE id=? AND role='driver'").get(id);
 const row=db.prepare('SELECT * FROM driver_profiles WHERE user_id=?').get(id);
 if(!user?.verified||!row||!active(db,id,'driver',atTime)||requireOnline&&!row.online)error('Driver must have current reviewed documents and be online');
 const profile=JSON.parse(row.payload);
 if(profile.capacity<passengers)error('Vehicle capacity is insufficient');
 if(tier==='women'&&(profile.gender!=='female'||!active(db,id,'women_driver',atTime)))error('Verified female driver required for Women-Only');
 return profile;
}
function busy(db,id,{bookingId='',tripId=''}={}){
 const row=db.prepare('SELECT payload FROM driver_profiles WHERE user_id=?').get(id);
 const plate=row?JSON.parse(row.payload).plate:null;
 const drivers=plate?db.prepare("SELECT user_id FROM driver_profiles WHERE json_extract(payload,'$.plate')=?").all(plate).map(r=>r.user_id):[id];
 return drivers.some(driverId=>Boolean(db.prepare("SELECT 1 FROM dispatch_assignments WHERE driver_id=? AND booking_id<>? AND status IN ('OFFERED','ACCEPTED','ASSIGNED','DRIVER_EN_ROUTE','ARRIVED','TRIP_STARTED') AND (lease_expires_at IS NULL OR lease_expires_at>?)").get(driverId,bookingId,new Date().toISOString())||db.prepare("SELECT 1 FROM ride2go_assignments WHERE driver_id=? AND trip_id<>? AND status IN ('OFFERED','ASSIGNED','ARRIVED','IN_PROGRESS') AND (lease_expires_at IS NULL OR lease_expires_at>?)").get(driverId,tripId,new Date().toISOString())));
}
function assertViewing(db,booking,driverId,options){
 const j=db.prepare('SELECT j.plan FROM viewing_journeys j JOIN journey_stops s ON s.journey_id=j.id WHERE s.booking_id=?').get(booking.id);
 const passengers=j?JSON.parse(j.plan).participants.length:1;
 assertCustomer(db,booking.customer_id,booking.tier,passengers,booking.scheduled_at);
 assertDriver(db,driverId,booking.tier,passengers,{...options,atTime:booking.scheduled_at});
}
module.exports={active,assertCustomer,assertDriver,assertViewing,busy};
