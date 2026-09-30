const tiers=require('../configs/ride-tiers.config');
function eligible(c,r,now=Date.now()){
 const reasons=[]; if(!c||c.online!==true)reasons.push('DRIVER_OFFLINE'); if(c.verified!==true)reasons.push('DRIVER_UNVERIFIED'); if(c.suspended===true)reasons.push('DRIVER_SUSPENDED');
 if(!c.vehicle||c.vehicle.available!==true)reasons.push('VEHICLE_UNAVAILABLE'); if(c.vehicle&&Number(c.vehicle.capacity||0)<Number(r.passengers||1))reasons.push('CAPACITY');
 const seen=Date.parse(c.location?.timestamp||''); if(!Number.isFinite(seen)||now-seen>require('../configs/matching.config').locationFreshnessMs)reasons.push('STALE_LOCATION');
 const rule=tiers[r.segment]||tiers.general; if(rule.hard?.femaleDriver===true && c.gender!=='female')reasons.push('SEGMENT_INELIGIBLE');
 return {ok:reasons.length===0,reasons};}
module.exports={eligible};