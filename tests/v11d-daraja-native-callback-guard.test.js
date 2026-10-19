const test=require('node:test');
const assert=require('node:assert/strict');
const {createHmac}=require('node:crypto');
const {createApp}=require('../server/app');
const {createMpesaAdapter}=require('../server/payments/providers/mpesa-adapter');

test('native Daraja STK callbacks are rejected rather than mistaken for verified payment success',async(t)=>{
 const secret='test-only-daraja-boundary';
 const app=createApp({dbPath:':memory:',paymentProviders:{mpesa:createMpesaAdapter({webhookSecret:secret})},startProviderCallbackRuntime:false,startPaymentInitiationRuntime:false,startSideEffectRuntime:false});
 t.after(async()=>app.close());
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const raw=JSON.stringify({Body:{stkCallback:{MerchantRequestID:'test',CheckoutRequestID:'test',ResultCode:0,ResultDesc:'Success',CallbackMetadata:{Item:[{Name:'Amount',Value:650},{Name:'MpesaReceiptNumber',Value:'TEST123'}]}}}});
 const signature=createHmac('sha256',secret).update(raw).digest('hex');
 const response=await fetch('http://127.0.0.1:'+app.server.address().port+'/api/provider-callbacks/mpesa',{method:'POST',headers:{'content-type':'application/json','x-provider-signature':signature},body:raw});
 assert.equal(response.status,400);
 assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM provider_callback_inbox').get().n,0);
 assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM provider_payment_events').get().n,0);
});
