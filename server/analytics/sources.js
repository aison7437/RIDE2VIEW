// All SQL fragments below are server-owned. No request value becomes a SQL identifier.
const viewing=`SELECT v.id,v.created_at event_at,v.status,v.booking_id,b.status booking_status,l.owner_id agent_id,s.start_at FROM viewing_requests v JOIN listings l ON l.id=v.listing_id JOIN property_slots s ON s.id=v.slot_id LEFT JOIN bookings b ON b.id=v.booking_id`;
const master="NOT EXISTS(SELECT 1 FROM journey_stops s JOIN viewing_journeys j ON j.id=s.journey_id WHERE s.booking_id=b.id AND j.master_booking_id<>b.id)";
const transport=`SELECT b.id,b.created_at event_at,b.status,b.driver_id,'viewing' service FROM bookings b WHERE ${master} UNION ALL SELECT id,created_at,status,driver_id,'ride2go' FROM ride2go_trips`;
const sources={
 viewings:{sql:viewing,where:'1=1',label:'Viewing requests'},
 accepted:{sql:viewing,where:'booking_id IS NOT NULL',label:'Requests accepted at least once'},
 completed:{sql:viewing,where:"booking_status='completed'",label:'Completed viewings'},
 cancelled:{sql:viewing,where:"status='CANCELLED' OR booking_status='cancelled'",label:'Cancelled viewings'},
 declined:{sql:viewing,where:"status='DECLINED'",label:'Declined requests'},
 transport:{sql:transport,where:'1=1',label:'Transport bookings (package counted once)'},
 completed_transport:{sql:transport,where:"status IN ('completed','COMPLETED')",label:'Completed transport bookings'},
 cancelled_transport:{sql:transport,where:"status IN ('cancelled','CANCELLED')",label:'Cancelled transport bookings'},
 ledger:{sql:'SELECT id,created_at event_at,event_type,kind,amount,currency,direction FROM financial_ledger_events',where:'1=1',label:'Recorded ledger entries'},
 earnings:{sql:'SELECT id,created_at event_at,status,beneficiary_id,beneficiary_role,platform_amount,beneficiary_amount,currency FROM marketplace_earnings',where:"status!='VOID'",label:'Recorded earnings allocations'},
 outstanding:{sql:'SELECT id,created_at event_at,status,beneficiary_id,beneficiary_role,beneficiary_amount amount,currency FROM marketplace_earnings',where:"status IN ('EARNED','PAYOUT_PENDING')",label:'Outstanding payout allocations'},
 stalled_requests:{sql:viewing,where:"status='REQUESTED' AND (event_at<=:dayAgo OR start_at<=:now)",label:'Viewing requests awaiting an agent decision'},
 expired_holds:{sql:`SELECT b.id,b.created_at event_at,b.status,r.hold_expires_at deadline,p.status payment_status FROM bookings b JOIN payments p ON p.booking_id=b.id JOIN booking_reservations br ON br.booking_id=b.id JOIN reservations r ON r.id=br.reservation_id WHERE ${master}`,where:"payment_status='pending' AND deadline IS NOT NULL AND deadline<=:now AND status NOT IN ('completed','cancelled')",label:'Unpaid expired viewing holds'},
 expired_requests:{sql:viewing,where:"status='EXPIRED'",label:'Expired viewing requests'},
 dispatch_failures:{sql:"SELECT id,created_at event_at,status,booking_id target_id,'viewing' service FROM dispatch_assignments UNION ALL SELECT id,created_at,status,trip_id,'ride2go' FROM ride2go_assignments",where:"status IN ('REJECTED','EXPIRED','FAILED','NO_DRIVER_AVAILABLE','REASSIGNMENT_REQUIRED')",label:'Dispatch offers requiring review'},
 awaiting_driver:{sql:`SELECT b.id,b.created_at event_at,b.status,p.verified_at waiting_since FROM bookings b JOIN payments p ON p.booking_id=b.id WHERE ${master} AND p.status='paid' AND NOT EXISTS(SELECT 1 FROM dispatch_assignments d WHERE d.booking_id=b.id AND d.status IN ('OFFERED','ACCEPTED','ASSIGNED','DRIVER_EN_ROUTE','ARRIVED','TRIP_STARTED') AND (d.lease_expires_at IS NULL OR d.lease_expires_at>:now))`,where:"status='confirmed' AND waiting_since IS NOT NULL AND waiting_since<=:halfHourAgo",label:'Paid viewings awaiting driver assignment'},
 support:{sql:'SELECT id,created_at event_at,status,incident_type,severity,updated_at FROM support_cases',where:"status NOT IN ('RESOLVED','CANCELLED') AND (updated_at<=:dayAgo OR severity IN ('HIGH','CRITICAL'))",label:'Unresolved support cases needing attention'},
 refunds:{sql:`SELECT b.id,b.created_at event_at,p.status,p.amount,'KES' currency,'viewing' service FROM bookings b JOIN payments p ON p.booking_id=b.id WHERE ${master} UNION ALL SELECT t.id,t.created_at,p.status,p.amount,'KES','ride2go' FROM ride2go_trips t JOIN ride2go_payments p ON p.trip_id=t.id UNION ALL SELECT c.id,c.created_at,p.status,p.amount,'KES','property_service' FROM property_service_cases c JOIN property_service_payments p ON p.case_id=c.id UNION ALL SELECT c.id,c.created_at,p.status,p.amount,p.currency,'commerce' FROM commerce_orders c JOIN commerce_payments p ON p.order_id=c.id`,where:"status='refund_pending'",label:'Pending customer refunds'},
 provider_review:{sql:'SELECT id,created_at event_at,status,kind,attempts FROM integration_jobs',where:"status='REVIEW'",label:'Provider jobs awaiting reconciliation'},
 searches:{sql:'SELECT id,created_at event_at,result_count FROM discovery_search_events',where:'1=1',label:'Measured signed-in searches'},
 selected_searches:{sql:'SELECT s.id,s.created_at event_at,s.result_count FROM discovery_search_events s WHERE EXISTS(SELECT 1 FROM discovery_selection_events e WHERE e.search_id=s.id)',where:'1=1',label:'Measured searches with a recorded selection'},
 no_selection:{sql:'SELECT s.id,s.created_at event_at,s.result_count FROM discovery_search_events s WHERE NOT EXISTS(SELECT 1 FROM discovery_selection_events e WHERE e.search_id=s.id)',where:'event_at<=:dayAgo AND result_count>0',label:'Searches with results but no recorded selection within 24 hours'}
};
module.exports={sources,transport,viewing};
