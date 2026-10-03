const now=()=>new Date().toISOString();
function fail(status,message){throw Object.assign(new Error(message),{status});}
function role(a,...roles){if(!a)fail(401,'Sign in to continue');if(!roles.includes(a.role))fail(403,'This account cannot perform this action');}
function text(v,label,max=200){if(typeof v!=='string'||!v.trim()||v.length>max)fail(400,label+' is required');return v.trim();}
function transaction(db,fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
function phone(v){if(typeof v!=='string'||!/^\+[1-9]\d{7,14}$/.test(v))fail(400,'Use an international phone number beginning with +');return v;}
module.exports={now,fail,role,text,transaction,phone};
