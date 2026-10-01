const {createHmac}=require('node:crypto');
function createMpesaAdapter({webhookSecret}={}){
 function verifySignature({rawBody,signature,safeEqual}){if(!webhookSecret||!signature)return false;const expected=createHmac('sha256',webhookSecret).update(rawBody).digest('hex');return safeEqual(expected,signature);}
 function parseEvent({rawBody}){const x=JSON.parse(rawBody);return {providerEventId:x.eventId,correlationId:x.correlationId,paymentKind:x.paymentKind,paymentId:x.paymentId,type:x.type,reference:x.reference,amount:x.amount,currency:x.currency||'KES'};}
 return {verifySignature,parseEvent};
}
module.exports={createMpesaAdapter};