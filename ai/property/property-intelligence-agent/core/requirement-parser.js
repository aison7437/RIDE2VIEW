function normalizeAreas(text=''){const known=['kilimani','lavington','westlands','kileleshwa','karen','runda','gigiri','nyari','kitisuru','spring valley','rosslyn','ruaka','syokimau'];return known.filter(a=>new RegExp('\\b'+a.replace(' ','\\s+')+'\\b','i').test(text)).map(a=>a.replace(/\b\w/g,c=>c.toUpperCase()));}
function parseBudget(text){
  const explicit=text.match(/(?:maximum|max(?:imum)?|under|below|budget(?:\s+of)?|up\s+to)\s*(?:ksh|kes)?\s*([\d,]+)/i);
  const currency=text.match(/(?:ksh|kes)\s*([\d,]+)/i);
  const match=explicit||currency;
  return match?Number(match[1].replace(/,/g,'')):null;
}
function parseRequirements(input={}){const text=String(input.message||input.searchText||input.query||'');const bedroomMatch=text.match(/(\d+)\s*[- ]?bed(?:room)?s?/i);const hard={};for(const amenity of ['parking','gym'])if(new RegExp('\\b'+amenity+'\\b','i').test(text))hard[amenity]=true;return {transaction_type:/\b(?:buy|purchase)|for sale\b/i.test(text)?'BUY':'RENT',property_type:/apartment/i.test(text)?'APARTMENT':null,bedrooms:bedroomMatch?Number(bedroomMatch[1]):(input.bedrooms??null),budget:{currency:'KES',max:input.budget!=null?Number(input.budget):parseBudget(text)},preferred_areas:Array.isArray(input.preferred_areas)?input.preferred_areas:normalizeAreas(text),commute_destination:input.commute_destination||null,hard_requirements:{...hard,...(input.hard_requirements||{})},soft_preferences:input.soft_preferences||{},inferred_preferences:input.inferred_preferences||{},unknown_requirements:[]};}
module.exports={parseRequirements,parseBudget};
