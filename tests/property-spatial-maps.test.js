const test=require('node:test');
const assert=require('node:assert/strict');
const {validateListing}=require('../server/validation');

const sample={title:'Example Nairobi flat',price:45000,location:{city:'Nairobi'},property:{bedrooms:2}};
test('property map pins are optional, never inferred from city alone',()=>{
 const x=validateListing(sample);
 assert.equal(x.location.latitude,null);
 assert.equal(x.location.longitude,null);
});
test('only paired, finite, valid coordinates are accepted',()=>{
 for(const location of [
  {city:'Nairobi',latitude:-1.2},
  {city:'Nairobi',longitude:36.8},
  {city:'Nairobi',latitude:92,longitude:36.8},
  {city:'Nairobi',latitude:1,longitude:181},
  {city:'Nairobi',latitude:'NaN',longitude:36.8}
 ])assert.throws(()=>validateListing({...sample,location}),/coordinates/i);
 const v=validateListing({...sample,location:{city:'Nairobi',latitude:-1.29,longitude:36.8}});
 assert.equal(v.location.latitude,-1.29);
 assert.equal(v.location.longitude,36.8);
 assert.equal(v.location.source,'agent-supplied');
});
