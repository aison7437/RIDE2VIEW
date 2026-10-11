function createDashboard({db,supply,journeys,onboarding,rides}) {
  const count = (sql,...args) => db.prepare(sql).get(...args).n;
  function get(actor) {
    if (!actor) throw Object.assign(new Error('Sign in to continue'),{status:401});
    if (!['customer','driver'].includes(actor.role)) throw Object.assign(new Error('Dashboard is for customers and drivers'),{status:403});
    const time = new Date().toISOString();
    const packages = journeys.list(actor);
    const rideTrips = rides.list(actor);
    const result = {role:actor.role,updatedAt:time,
      notifications:db.prepare('SELECT message,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 4').all(actor.id)};
    const activePackages = packages.filter(x => !['COMPLETED','CANCELLED','DECLINED','EXPIRED'].includes(x.status) &&
      (actor.role === 'customer' || !!db.prepare('SELECT 1 FROM bookings WHERE id=? AND driver_id=?').get(x.master_booking_id,actor.id)));
    result.journeys = activePackages.slice(0,4).map(x => ({id:x.id,status:x.status,tier:x.plan.tier,
      stops:x.stops.map(s => ({title:s.listing.title,startAt:s.startAt,status:s.status}))}));
    if (actor.role === 'customer') {
      const profile = JSON.parse(supply.profile(actor).preferences);
      const publicProperties = supply.listPublic();
      const matching = publicProperties.filter(x => (!profile.city || x.location.city.toLowerCase() === profile.city.toLowerCase()) &&
        (!profile.budget || x.price <= profile.budget) && (!profile.goal || (x.transactionType === 'sale' ? 'buy':'rent') === profile.goal));
      result.properties = matching.slice(0,3);
      result.propertyContext = profile.city ? 'Available properties matching your saved city, budget and goal' : 'Available verified properties';
      result.metrics = {savedProperties:count('SELECT COUNT(*) n FROM saved_properties WHERE customer_id=?',actor.id),
        activePackages:activePackages.length,credits:journeys.wallet(actor).balanceKES,
        checkouts:count('SELECT COUNT(*) n FROM commerce_checkouts WHERE customer_id=?',actor.id)};
      result.viewings = db.prepare(`SELECT v.id,v.status,p.start_at,l.payload FROM viewing_requests v
        JOIN property_slots p ON p.id=v.slot_id JOIN listings l ON l.id=v.listing_id
        WHERE v.customer_id=? AND p.start_at>=? AND v.status IN ('REQUESTED','ACCEPTED') ORDER BY p.start_at LIMIT 4`)
        .all(actor.id,time).map(x => ({id:x.id,status:x.status,startAt:x.start_at,title:JSON.parse(x.payload).title}));
      result.rides = rideTrips.filter(x => !['COMPLETED','CANCELLED','EXPIRED'].includes(x.status)).slice(0,3)
        .map(x => ({id:x.id,status:x.status,plan:x.plan}));
    } else {
      const readiness = onboarding.dashboard(actor);
      result.readiness = {online:!!readiness.profile.online,profile:readiness.profile.payload,
        checks:readiness.checks.map(x => ({kind:x.kind,status:x.status,eligible:x.currentlyEligible && (x.kind!=='driver' || !!actor.verified),expiresAt:x.expires_at})),
        documents:readiness.documents.map(x => ({kind:x.kind,expiresAt:x.expires_at}))};
      result.offers = db.prepare(`SELECT d.id,b.id booking_id,b.scheduled_at,b.tier,l.payload,d.lease_expires_at
        FROM dispatch_assignments d JOIN bookings b ON b.id=d.booking_id JOIN listings l ON l.id=b.listing_id
        WHERE d.driver_id=? AND d.status='OFFERED' AND d.lease_expires_at>? AND b.status='confirmed'
        AND NOT EXISTS(SELECT 1 FROM journey_stops s JOIN viewing_journeys j ON j.id=s.journey_id WHERE s.booking_id=b.id AND j.master_booking_id<>b.id)
        ORDER BY d.created_at DESC`).all(actor.id,time).map(x => ({id:x.id,kind:'viewing',title:JSON.parse(x.payload).title,
          tier:x.tier,scheduledAt:x.scheduled_at,expiresAt:x.lease_expires_at}));
      result.offers.push(...rideTrips.filter(x => x.assignment?.driver_id === actor.id && x.assignment.status === 'OFFERED' && x.assignment.lease_expires_at > time)
        .map(x => ({id:x.assignment.id,kind:'ride2go',title:x.plan.pickup+' → '+x.plan.destination,tier:x.plan.tier,
          scheduledAt:x.plan.scheduledAt,expiresAt:x.assignment.lease_expires_at})));
      result.rides = rideTrips.filter(x => ['ASSIGNED','ARRIVED','IN_PROGRESS'].includes(x.status) && x.driver_id === actor.id).slice(0,4)
        .map(x => ({id:x.id,status:x.status,plan:x.plan}));
      result.earnings = db.prepare(`SELECT currency,status,SUM(beneficiary_amount) amount,COUNT(*) entries FROM marketplace_earnings
        WHERE beneficiary_id=? AND beneficiary_role='driver' GROUP BY currency,status ORDER BY currency,status`).all(actor.id);
      result.metrics = {offers:result.offers.length,activePackages:activePackages.length,
        completedTrips:count(`SELECT COUNT(*) n FROM bookings b WHERE b.driver_id=? AND b.status='completed'
          AND NOT EXISTS(SELECT 1 FROM journey_stops s WHERE s.booking_id=b.id)`,actor.id) +
          count("SELECT COUNT(*) n FROM viewing_journeys j JOIN bookings b ON b.id=j.master_booking_id WHERE b.driver_id=? AND j.status='COMPLETED'",actor.id) +
          count("SELECT COUNT(*) n FROM ride2go_trips WHERE driver_id=? AND status='COMPLETED'",actor.id),
        earnedKES:result.earnings.filter(x => x.currency === 'KES' && ['EARNED','PAYOUT_PENDING','PAID'].includes(x.status)).reduce((sum,x) => sum+x.amount,0)};
    }
    return result;
  }
  return {get};
}
module.exports = {createDashboard};
