const expiry=()=>new Date(Date.now()+365*86400000).toISOString();
const pdf=Buffer.from('%PDF-1.7\nSynthetic test evidence; not an identity or ownership record.\n%%EOF').toString('base64');
async function approveCheck(call,kind,id,cookie,admin){
  let ids=[];
  if(kind!=='publication')ids=[(await call('/supply/documents','POST',{kind,name:kind+'-fixture.pdf',mime:'application/pdf',data:pdf},cookie,201)).data.id];
  const c=(await call('/supply/checks/'+kind+'/'+id+'/submit','POST',{documentIds:ids},cookie)).data;
  await call('/admin/supply-reviews/'+kind+'/'+id,'POST',{decision:'APPROVED',reason:'Synthetic fixture reviewed for test',revision:c.revision,expiresAt:expiry()},admin);
  return ids[0];
}
async function approveAgent(call,agent,admin){
  await call('/agent/profile','PUT',{legalName:'Agent Test',phone:'+254700000000',agencyName:'Test Agency',registrationNumber:'TEST-001'},agent.cookie);
  for(const kind of ['identity','agency'])await approveCheck(call,kind,agent.id,agent.cookie,admin);
}
async function publishProperty(call,id,cookie,admin){for(const kind of ['marketing','ownership','publication'])await approveCheck(call,kind,id,cookie,admin);}
async function customerProfile(call,cookie){await call('/customer/profile','PUT',{city:'Nairobi',budget:50000,goal:'rent',bedrooms:2},cookie);}
async function createSlot(call,id,cookie,days=1){const startAt=new Date(Date.now()+days*86400000).toISOString(),endAt=new Date(Date.parse(startAt)+45*60000).toISOString();return (await call('/properties/'+id+'/slots','POST',{startAt,endAt},cookie,201)).data;}
module.exports={expiry,pdf,approveCheck,approveAgent,publishProperty,customerProfile,createSlot};
