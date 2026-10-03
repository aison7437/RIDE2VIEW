function remoteConflict(db,agentId,listingId,start,end,exclude='') {
 return db.prepare(`SELECT id FROM property_service_cases WHERE kind='remote' AND id<>? AND (agent_id=? OR listing_id=?) AND status IN ('QUOTED','PAYABLE','CONFIRMED','IN_PROGRESS') AND json_extract(data,'$.startAt')<? AND json_extract(data,'$.endAt')>? AND (status IN ('CONFIRMED','IN_PROGRESS') OR json_extract(data,'$.expiresAt')>?) LIMIT 1`).get(exclude,agentId,listingId,end,start,new Date().toISOString());
}
module.exports={remoteConflict};
