const PILOT_POLICY=Object.freeze({label:'Viewing package pilot v1',baseKES:{general:650,women:750,students:450,vip:2000},interPropertyKESPerKm:7,returnPercent:50,waitingKESPerTwoMinutes:0,waitingGraceMinutes:0,maxStops:3,maxParticipants:4,cancellation:'Full refund or credit before trip start; operations recovery after start',routeMode:'Operations-reviewed estimates; no live navigation',taxMode:'Fiscal integration pending; no VAT invoice issued'});
function fail(message){throw Object.assign(new Error(message),{status:400});}
function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)fail(`${label} must be an integer between ${min} and ${max}`);return value;}
function validatePolicy(p){if(!p||typeof p!=='object'||Array.isArray(p))fail('Pricing policy required');const baseKES={};for(const tier of Object.keys(PILOT_POLICY.baseKES))baseKES[tier]=integer(p.baseKES?.[tier],1,100000,'Tier fare');return {...PILOT_POLICY,label:typeof p.label==='string'&&p.label.trim()&&p.label.length<=100?p.label.trim():PILOT_POLICY.label,baseKES,interPropertyKESPerKm:integer(p.interPropertyKESPerKm,0,1000,'Distance rate'),returnPercent:integer(p.returnPercent,0,100,'Return percentage'),waitingKESPerTwoMinutes:integer(p.waitingKESPerTwoMinutes,0,1000,'Waiting rate'),waitingGraceMinutes:integer(p.waitingGraceMinutes,0,120,'Waiting grace')};}
function price(policy,plan,route){
 const base=policy.baseKES[plan.tier];if(!base)fail('Invalid ride tier');
 if(!route||!Array.isArray(route.legs)||route.legs.length!==plan.stops.length-1)fail('One reviewed transfer leg is required between each property');
 if(route.legs.some(l=>!l||typeof l!=='object'||Array.isArray(l)))fail('Valid transfer legs required');
 const legs=route.legs.map(l=>({distanceMetres:integer(l.distanceMetres,0,500000,'Transfer distance'),minutes:integer(l.minutes,1,600,'Transfer minutes')}));
 const waitingMinutes=integer(route.waitingMinutes??0,0,480,'Estimated waiting minutes');
 const evidence=typeof route.evidenceRef==='string'?route.evidenceRef.trim():'';if(!evidence||evidence.length>512)fail('Reviewed route evidence is required');
 // Integer minor units, ceiling once at billing; expose the rounding difference.
 const distanceMinor=Math.ceil(legs.reduce((s,l)=>s+l.distanceMetres,0)*policy.interPropertyKESPerKm/10);
 const returnMinor=plan.returnJourney?base*policy.returnPercent:0;
 const waitingMinor=Math.ceil(Math.max(0,waitingMinutes-policy.waitingGraceMinutes)/2)*policy.waitingKESPerTwoMinutes*100;
 const subtotalMinor=base*100+distanceMinor+returnMinor+waitingMinor,totalKES=Math.ceil(subtotalMinor/100);
 return {currency:'KES',baseKES:base,distanceMinor,returnMinor,waitingMinor,roundingMinor:totalKES*100-subtotalMinor,totalKES,route:{legs,waitingMinutes,evidenceRef:evidence},policy};
}
module.exports={PILOT_POLICY,validatePolicy,price};
