const {expiry,pdf}=require('./supply.cjs');
const {createOnboardingAuthority,REQUIRED}=require('../../server/mobility/onboarding/authority');
const profileData={legalName:'Synthetic Driver',phone:'+254700000000',plate:'TEST-001',make:'Test',model:'Fixture',licenceNumber:'SYNTHETIC-LICENCE',capacity:4,gender:'male'};
async function approveDriver(call,driver,admin,gender='male'){
 await call('/driver/profile','PUT',{...profileData,plate:'TEST-'+driver.id.slice(0,8),gender,revision:0},driver.cookie);
 const ids=[];for(const kind of REQUIRED)ids.push((await call('/mobility/documents','POST',{kind,name:kind+'-fixture.pdf',mime:'application/pdf',data:pdf,expiresAt:expiry()},driver.cookie,201)).data.id);
 const pending=(await call('/mobility/checks/driver/submit','POST',{documentIds:ids,adultConfirmed:true},driver.cookie)).data;
 await call('/admin/mobility-reviews/'+driver.id+'/driver','POST',{revision:pending.revision,decision:'APPROVED',reason:'Synthetic adult driver and vehicle evidence reviewed',adultVerified:true,expiresAt:new Date(Date.now()+180*86400000).toISOString()},admin);
 await call('/driver/availability','PUT',{online:true},driver.cookie);
 return ids;
}
function seedDriver(db,id,gender='male'){
 const a=createOnboardingAuthority({db}),actor={id,role:'driver'};a.profile(actor,{...profileData,plate:'TEST-'+id,gender,revision:0});const docs=REQUIRED.map(kind=>a.document(actor,{kind,name:kind+'-fixture.pdf',mime:'application/pdf',data:pdf,expiresAt:expiry()}).id);const pending=a.submit(actor,'driver',{documentIds:docs,adultConfirmed:true});a.review({id:null,role:'admin'},id,'driver',{revision:pending.revision,decision:'APPROVED',reason:'Synthetic adult driver test review',adultVerified:true,expiresAt:new Date(Date.now()+180*86400000).toISOString()});a.availability(actor,{online:true});return docs;
}
module.exports={approveDriver,seedDriver,profileData};
