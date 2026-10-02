const {createHmac}=require('node:crypto');
function createMpesaAdapter({webhookSecret,initiate,lookup}={}){
 function verifySignature({rawBody,signature,safeEqual}){if(!webhookSecret||!signature)return false;const expected=createHmac('sha256',webhookSecret).update(rawBody).digest('hex');return safeEqual(expected,signature);}
 function parseEvent({rawBody}){const x=JSON.parse(rawBody);return {providerEventId:x.eventId,correlationId:x.correlationId,paymentKind:x.paymentKind,paymentId:x.paymentId,type:x.type,reference:x.reference,amount:x.amount,currency:x.currency||'KES'};}
 function initiatePayment(request){if(typeof initiate!=='function')throw Object.assign(new Error('MPESA_INITIATION_NOT_CONFIGURED'),{code:'MPESA_INITIATION_NOT_CONFIGURED'});if(!request?.idempotencyKey||request.idempotencyKey!==request.correlationId)throw Object.assign(new Error('PROVIDER_IDEMPOTENCY_KEY_REQUIRED'),{code:'PROVIDER_IDEMPOTENCY_KEY_REQUIRED'});return initiate(request);}
 function lookupPayment(request){if(typeof lookup!=='function')return null;return lookup(request);}
 const capabilities=Object.freeze({initiation:typeof initiate==='function',callbackVerification:typeof webhookSecret==='string'&&webhookSecret.length>0,lookup:typeof lookup==='function'});
 return {verifySignature,parseEvent,initiatePayment,lookupPayment,capabilities};
}
module.exports={createMpesaAdapter};
