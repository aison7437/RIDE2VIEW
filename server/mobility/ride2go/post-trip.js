const {randomUUID}=require('node:crypto');
function createRide2GoFeedback({db,audit=()=>{}}){
 const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
 function requireCustomer(actor){if(!actor)fail(401,'Sign in to continue');if(actor.role!=='customer')fail(403,'Only the trip customer can leave feedback');}
 function read(actor,id){
  requireCustomer(actor);
  const trip=db.prepare('SELECT id,customer_id,status FROM ride2go_trips WHERE id=?').get(id);
  if(!trip)fail(404,'Trip not found');
  if(trip.customer_id!==actor.id)fail(403,'Trip belongs to another customer');
  const feedback=db.prepare('SELECT trip_id,rating,comment,created_at FROM ride2go_feedback WHERE trip_id=?').get(id);
  return {tripId:id,completed:trip.status==='COMPLETED',feedback:feedback||null};
 }
 function submit(actor,id,data={}){
  requireCustomer(actor);
  if(!Number.isInteger(data.rating)||data.rating<1||data.rating>5)fail(400,'Rating must be between 1 and 5');
  if(data.comment!==undefined&&typeof data.comment!=='string')fail(400,'Feedback must be text');
  const comment=(data.comment||'').trim();
  if(comment.length>1000)fail(400,'Feedback cannot exceed 1,000 characters');
  db.exec('BEGIN IMMEDIATE');
  try{
   const trip=db.prepare('SELECT id,customer_id,status FROM ride2go_trips WHERE id=?').get(id);
   if(!trip)fail(404,'Trip not found');
   if(trip.customer_id!==actor.id)fail(403,'Trip belongs to another customer');
   if(trip.status!=='COMPLETED')fail(409,'Only completed trips can be rated');
   const prior=db.prepare('SELECT trip_id,rating,comment,created_at FROM ride2go_feedback WHERE trip_id=?').get(id);
   if(prior){
    if(prior.rating!==data.rating||prior.comment!==comment)fail(409,'Feedback was already submitted');
    db.exec('COMMIT');return {...prior,duplicate:true};
   }
   const created=new Date().toISOString();
   db.prepare('INSERT INTO ride2go_feedback(trip_id,customer_id,rating,comment,created_at) VALUES(?,?,?,?,?)').run(id,actor.id,data.rating,comment,created);
   audit(actor,'ride2go.feedback_created',id,{rating:data.rating});
   db.exec('COMMIT');return {trip_id:id,rating:data.rating,comment,created_at:created};
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 return {read,submit};
}
module.exports={createRide2GoFeedback};
