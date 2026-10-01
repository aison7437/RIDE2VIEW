const {createHmac}=require('node:crypto');
function createMpesaAdapter({webhookSecret,initiate}={}){
 function verifySignature({rawBody,signature,safeEqual}){if(!webhookSecret||!signature)return false;const expected=createHmac('sha256',webhookSecret).update(rawBody).digest('hex');return safeEqual(expected,signature);}
 function parseEvent({rawBody}){const x=JSON.parse(rawBody);return {providerEventId:x.eventId,correlationId:x.correlationId,paymentKind:x.paymentKind,paymentId:x.paymentId,type:x.type,reference:x.reference,amount:x.amount,currency:x.currency||'KES'};}
 function initiatePayment(request){if(typeof initiate!=='function')throw Object.assign(new Error('MPESA_INITIATION_NOT_CONFIGURED'),{code:'MPESA_INITIATION_NOT_CONFIGURED'});return initiate(request);}
 return {verifySignature,parseEvent,initiatePayment};
}
module.exports={createMpesaAdapter};