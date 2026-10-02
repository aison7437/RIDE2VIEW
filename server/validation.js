const { createOpportunity } = require('../ai/user/lifestyle-agent/models/opportunity-schema');
function validateListing(data) {
  if (!data || typeof data !== 'object') throw new Error('Listing is required');
  const price = Number(data.price);
  const bedrooms = Number(data.property?.bedrooms ?? data.bedrooms);
  const duration = data.timing?.duration == null ? null : Number(data.timing.duration);
  const transactionType=data.transactionType||'rent';
  if(!['rent','sale'].includes(transactionType))throw new Error('Transaction type must be rent or sale');
  if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 160) throw new Error('Title is required (maximum 160 characters)');
  if (!Number.isSafeInteger(price) || price <= 0) throw new Error('Price must be a positive whole KES amount');
  if (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 30) throw new Error('Bedrooms must be between 0 and 30');
  if (!data.location?.city || typeof data.location.city !== 'string' || data.location.city.length > 100) throw new Error('City is required');
  if (duration !== null && (!Number.isFinite(duration) || duration <= 0 || duration > 1440)) throw new Error('Duration must be 1–1440 minutes');
  const result = createOpportunity({ type:'property', category:'property', title:data.title.trim(), description:String(data.description || '').slice(0,2000), price, currency:'KES', pricePeriod:transactionType==='rent'?'month':'purchase', location:{city:data.location.city.trim(),country:'Kenya'}, property:{bedrooms,area:data.property?.area || null}, timing:{duration}, source:'ride2view-listings' });
  return {...result,transactionType, relevanceLegacy:'high', tags: Array.isArray(data.tags) ? data.tags.filter(x=>typeof x==='string').slice(0,20) : []};
}
module.exports = { validateListing };
