const {randomUUID}=require('node:crypto');
const {sources,transport,viewing}=require('./sources');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function requireAdmin(a){if(!a)fail(401,'Sign in to continue');if(a.role!=='admin')fail(403,'Administrator access required');}
const day=86400000;
function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)fail(400,'Use a valid YYYY-MM-DD date');return value;}
function period(input={},clock=Date.now()){
 const today=new Date(clock+3*3600000).toISOString().slice(0,10);
 const to=date(input.to??today),from=date(input.from??new Date(Date.parse(to+'T00:00:00Z')-29*day).toISOString().slice(0,10));
 if(from>to||to>today||Date.parse(to)-Date.parse(from)>365*day)fail(400,'Choose an ordered date range of at most 366 days, ending no later than today');
 return {from,to,timezone:'Africa/Nairobi',start:new Date(Date.parse(from+'T00:00:00Z')-3*3600000).toISOString(),end:new Date(Date.parse(to+'T00:00:00Z')+day-3*3600000).toISOString()};
}
function createAnalytics({db}){
 function select(sql,params){const used={};for(const [,key] of sql.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g))used[key]=params[key];return db.prepare(sql).all(used);}
 function filter(key){if(typeof key!=='string'||!Object.hasOwn(sources,key))fail(400,'Unknown evidence category');const s=sources[key];return `FROM (${s.sql}) src WHERE event_at>=:start AND event_at<:end AND (${s.where})`;}
 function params(p,time){return {...p,now:new Date(time).toISOString(),dayAgo:new Date(time-day).toISOString(),halfHourAgo:new Date(time-30*60000).toISOString()};}
 function snapshot(actor,input={}){
  requireAdmin(actor);const time=Date.now(),p=period(input,time),args=params(p,time);
  db.exec('BEGIN');try{
   const counts={},labels={};for(const [key,s] of Object.entries(sources)){counts[key]=select('SELECT count(*) n '+filter(key),args)[0].n;labels[key]=s.label;}
   const ledger=select('SELECT currency,direction,event_type,sum(amount) amount,count(*) entries '+filter('ledger')+' GROUP BY currency,direction,event_type ORDER BY currency,direction,event_type',args);
   const allocations=select("SELECT currency,sum(platform_amount) platformAllocation,sum(beneficiary_amount) beneficiaryAllocation,count(*) records "+filter('earnings')+" AND status!='DISPUTED' GROUP BY currency ORDER BY currency",args);
   const outstanding=select('SELECT currency,sum(amount) amount,count(*) records '+filter('outstanding')+' GROUP BY currency ORDER BY currency',args);
   const pendingRefunds=select('SELECT currency,sum(amount) amount,count(*) records '+filter('refunds')+' GROUP BY currency ORDER BY currency',args);
   const agents=select(`SELECT src.agent_id id,u.name,count(*) requests,sum(CASE WHEN booking_id IS NOT NULL THEN 1 ELSE 0 END) accepted,sum(CASE WHEN booking_status='completed' THEN 1 ELSE 0 END) completed FROM (${viewing}) src JOIN users u ON u.id=src.agent_id WHERE event_at>=:start AND event_at<:end GROUP BY src.agent_id,u.name ORDER BY requests DESC,src.agent_id LIMIT 50`,args);
   const drivers=select(`SELECT src.driver_id id,u.name,count(*) assignedRecords,sum(CASE WHEN status IN ('completed','COMPLETED') THEN 1 ELSE 0 END) completed FROM (${transport}) src JOIN users u ON u.id=src.driver_id WHERE event_at>=:start AND event_at<:end GROUP BY src.driver_id,u.name ORDER BY completed DESC,src.driver_id LIMIT 50`,args);
   const startedAt=db.prepare('SELECT started_at FROM analytics_collection_metadata WHERE id=1').get().started_at;
   const result={period:p,generatedAt:args.now,counts,labels,finance:{ledger,allocations,outstanding,pendingRefunds},performance:{agents,drivers,limit:50},tracking:{startedAt,scope:'Signed-in customer searches and explicit selections only; selections accepted for 24 hours after search.',historicalCoverage: p.start<startedAt?'PARTIAL':'SINCE_COLLECTION_START'},limitations:[
    'Activity and performance are cohorts created in the selected period, evaluated at report generation. They are not historical end-of-period states.',
    'Viewing conversion counts property requests; transport counts each multi-property package once. Driver counts are assigned records, not acceptance rates or driving scores.',
    'Ledger entries are recorded money movements, not recognized revenue, profit or independently confirmed bank balances. Currencies are kept separate; missing historical ledger entries are not reconstructed.',
    'Platform allocations and outstanding payouts are earnings records created in the period. They are not additional cash receipts and are not added to ledger totals.',
    'Pending refunds cover viewing, Ride2Go, property-service and commerce cohorts. Subscription cancellations and disputed allocations are separate.',
    'Only measured signed-in searches enter search conversion. No selection can mean later action, another channel, telemetry failure or abandonment. It does not establish a cause.',
    'Performance shows up to 50 accounts. Evidence pages show current source records; they may change after this snapshot.'
   ]};db.exec('COMMIT');return result;
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 function evidence(actor,input){requireAdmin(actor);const p=period(input),offset=input.offset??0;if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)fail(400,'Invalid evidence offset');const category=input.category;const sql=filter(category),args=params(p,Date.now());return {category,label:sources[category].label,period:p,total:select('SELECT count(*) n '+sql,args)[0].n,offset,limit:50,records:select('SELECT * '+sql+' ORDER BY event_at,id LIMIT 50 OFFSET :offset',{...args,offset}),observedAt:new Date().toISOString()};}
 function recordSearch(actor,recommendations){if(actor?.role!=='customer')return null;const ids=[...new Set(recommendations.map(x=>x.id).filter(x=>typeof x==='string'))].slice(0,100),id=randomUUID();db.prepare('INSERT INTO discovery_search_events VALUES(?,?,?,?,?)').run(id,actor.id,JSON.stringify(ids),ids.length,new Date().toISOString());return id;}
 function selection(actor,input){if(!actor)fail(401,'Sign in to continue');if(actor.role!=='customer')fail(403,'Customer access required');if(typeof input.searchId!=='string'||typeof input.listingId!=='string'||input.searchId.length>128||input.listingId.length>128)fail(400,'Search and property references required');const s=db.prepare('SELECT * FROM discovery_search_events WHERE id=? AND customer_id=?').get(input.searchId,actor.id);if(!s)fail(404,'Search not found');if(!JSON.parse(s.listing_ids).includes(input.listingId))fail(409,'Property was not returned by this search');const existing=db.prepare('SELECT 1 FROM discovery_selection_events WHERE search_id=? AND listing_id=?').get(s.id,input.listingId);if(existing)return {recorded:true,duplicate:true};if(Date.parse(s.created_at)+day<Date.now())fail(409,'Search measurement window expired');db.prepare('INSERT OR IGNORE INTO discovery_selection_events VALUES(?,?,?)').run(s.id,input.listingId,new Date().toISOString());return {recorded:true};}
 function routes({path,method,user,body,send}){
  if(path==='/api/admin/analytics/evidence'&&method==='POST'){send(200,evidence(user,body));return true;}
  if(path==='/api/analytics/selection'&&method==='POST'){send(200,selection(user,body));return true;}
  return false;
 }
 return {snapshot,evidence,recordSearch,selection,routes,period};
}
module.exports={createAnalytics,period};
