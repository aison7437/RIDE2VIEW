const {assertCustomer}=require('../mobility/onboarding/eligibility');
const {randomUUID}=require('node:crypto');
const now=()=>new Date().toISOString();
function fail(message){throw Object.assign(new Error(message),{code:'BOOKING_NOT_PAYABLE',status:409});}
function packageForBooking(db,id){if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='journey_stops'").get())return null;return db.prepare('SELECT j.* FROM viewing_journeys j JOIN journey_stops s ON s.journey_id=j.id WHERE s.booking_id=?').get(id)||null;}
function stops(db,id){return db.prepare('SELECT s.*,v.status request_status,v.listing_id,v.slot_id FROM journey_stops s JOIN viewing_requests v ON v.id=s.request_id WHERE s.journey_id=? ORDER BY s.position').all(id);}
function assertPublished(db,listingId){const row=db.prepare('SELECT l.approved,l.available,l.owner_id,u.role FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id=?').get(listingId);if(!row?.approved||!row.available)fail('A package property is unavailable');const checks=[['marketing',listingId],['ownership',listingId],['publication',listingId]];if(row.role!=='admin')checks.push(['identity',row.owner_id],['agency',row.owner_id]);for(const [kind,id]of checks){const c=db.prepare('SELECT status,expires_at FROM supply_checks WHERE kind=? AND target_id=?').get(kind,id);if(c?.status!=='APPROVED'||!c.expires_at||c.expires_at<=now())fail('Package property verification expired or was revoked');}}
function confirmPackageInsideTransaction(db,bookingId,actor){
 const j=packageForBooking(db,bookingId);if(!j)return false;
 if(j.master_booking_id!==bookingId||j.status!=='PAYABLE')fail('Pay the active package master booking');
 const plan=JSON.parse(j.plan);assertCustomer(db,j.customer_id,plan.tier,plan.participants.length,db.prepare('SELECT start_at FROM property_slots WHERE id=?').get(plan.stops[0].slotId)?.start_at);const time=now(),rows=stops(db,j.id);
 for(const s of rows){assertPublished(db,s.listing_id);const r=db.prepare('SELECT r.* FROM reservations r JOIN booking_reservations br ON br.reservation_id=r.id WHERE br.booking_id=?').get(s.booking_id);const b=db.prepare('SELECT status FROM bookings WHERE id=?').get(s.booking_id);
 if(s.request_status!=='ACCEPTED'||b?.status!=='requested'||r?.status!=='HOLD_CREATED'||!r.hold_expires_at||r.hold_expires_at<=time)fail('All package holds must be valid before payment');
 }
 for(const s of rows){const r=db.prepare('SELECT reservation_id FROM booking_reservations WHERE booking_id=?').get(s.booking_id);db.prepare("UPDATE reservations SET status='CONFIRMED',hold_expires_at=NULL,version=version+1,updated_at=? WHERE id=?").run(time,r.reservation_id);db.prepare('INSERT INTO reservation_events VALUES(?,?,?,?,?)').run(randomUUID(),r.reservation_id,'CONFIRMED','package:'+j.id,time);
 if(s.booking_id!==bookingId){db.prepare("UPDATE bookings SET status='confirmed' WHERE id=?").run(s.booking_id);db.prepare("UPDATE payments SET status='paid',reference=?,verified_by=?,verified_at=? WHERE booking_id=?").run('PACKAGE_'+s.booking_id,actor?.id||null,time,s.booking_id);}}
 db.prepare("UPDATE viewing_journeys SET status='CONFIRMED',version=version+1,updated_at=? WHERE id=?").run(time,j.id);return true;
}
function assertPackageDispatch(db,bookingId){const j=packageForBooking(db,bookingId);if(!j)return;if(j.master_booking_id!==bookingId||j.status!=='CONFIRMED')fail('Dispatch the confirmed package master booking');for(const s of stops(db,j.id)){assertPublished(db,s.listing_id);const r=db.prepare('SELECT r.status FROM reservations r JOIN booking_reservations br ON br.reservation_id=r.id WHERE br.booking_id=?').get(s.booking_id);if(r?.status!=='CONFIRMED')fail('All package reservations must be confirmed');}}
function assignPackageInsideTransaction(db,bookingId,driverId){const j=packageForBooking(db,bookingId);if(!j)return;for(const s of stops(db,j.id))db.prepare("UPDATE bookings SET driver_id=?,status='assigned' WHERE id=?").run(driverId,s.booking_id);db.prepare("UPDATE viewing_journeys SET status='ASSIGNED',version=version+1,updated_at=? WHERE id=?").run(now(),j.id);}
function transitionPackageInsideTransaction(db,bookingId,to){const j=packageForBooking(db,bookingId);if(!j)return;
 if(to==='TRIP_STARTED'){if(j.status!=='ASSIGNED')fail('Package cannot start');db.prepare("UPDATE viewing_journeys SET status='IN_PROGRESS',version=version+1,updated_at=? WHERE id=?").run(now(),j.id);}
 if(to==='TRIP_COMPLETED'){if(j.status!=='IN_PROGRESS'||stops(db,j.id).some(s=>s.status!=='COMPLETED'))fail('Complete every package stop before finishing transport');for(const s of stops(db,j.id))db.prepare("UPDATE bookings SET status='completed' WHERE id=?").run(s.booking_id);db.prepare("UPDATE viewing_journeys SET status='COMPLETED',version=version+1,updated_at=? WHERE id=?").run(now(),j.id);}
}
module.exports={packageForBooking,stops,confirmPackageInsideTransaction,assertPackageDispatch,assignPackageInsideTransaction,transitionPackageInsideTransaction};
