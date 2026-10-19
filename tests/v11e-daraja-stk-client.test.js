const test=require('node:test');
const assert=require('node:assert/strict');
const {createDarajaStkClient}=require('../server/payments/providers/daraja-stk-client');
const config={consumerKey:'test-key',consumerSecret:'test-secret',shortcode:'174379',passkey:'test-passkey',callbackUrl:'https://example.test/mpesa/callback',clock:()=>new Date('2026-10-19T12:34:56Z')};
test('Daraja STK client exchanges OAuth token and initiates request with correlated reference',async()=>{
 const calls=[];
 const fetchFn=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>calls.length===1?{access_token:'test-token'}:{ResponseCode:'0',CheckoutRequestID:'checkout-123',MerchantRequestID:'merchant-456'}};};
 const client=createDarajaStkClient({...config,fetchFn});
 const result=await client.initiatePayment({amount:650,customerContact:'254712345678',correlationId:'corr-test',idempotencyKey:'corr-test'});
 assert.deepEqual(result,{providerRequestId:'checkout-123',merchantRequestId:'merchant-456',correlationId:'corr-test'});
 assert.equal(calls.length,2);
 assert.match(calls[0].url,/sandbox\.safaricom\.co\.ke\/oauth/);
 assert.equal(calls[1].options.headers.Authorization,'Bearer test-token');
 const body=JSON.parse(calls[1].options.body);
 assert.equal(body.AccountReference,'corr-test');
 assert.equal(body.Amount,650);
 assert.equal(body.Timestamp,'20261019123456');
 assert.equal(body.CallBackURL,config.callbackUrl);
 assert.equal(body.Password,Buffer.from('174379test-passkey20261019123456').toString('base64'));
});
test('Daraja STK client rejects missing credentials and unsafe request inputs before network',async()=>{
 let calls=0;const fetchFn=async()=>{calls++;throw Error('unexpected network');};
 const client=createDarajaStkClient({...config,fetchFn});
 await assert.rejects(client.initiatePayment({amount:0,customerContact:'254712345678',correlationId:'a',idempotencyKey:'a'}),{code:'DARAJA_AMOUNT_INVALID'});
 await assert.rejects(client.initiatePayment({amount:650,customerContact:'0712345678',correlationId:'a',idempotencyKey:'a'}),{code:'DARAJA_PHONE_INVALID'});
 await assert.rejects(client.initiatePayment({amount:650,customerContact:'254712345678',correlationId:'a',idempotencyKey:'b'}),{code:'DARAJA_CORRELATION_REQUIRED'});
 assert.equal(calls,0);
 assert.throws(()=>createDarajaStkClient({...config,callbackUrl:'http://example.test/callback'}),{code:'DARAJA_CALLBACK_URL_HTTPS_REQUIRED'});
 await assert.rejects(createDarajaStkClient({fetchFn}).initiatePayment({}),{code:'DARAJA_CREDENTIALS_REQUIRED'});
});
test('Daraja STK query uses checkout ID and does not treat query response as authoritative settlement',async()=>{
 const calls=[];const fetchFn=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>calls.length%2?{access_token:'test-token'}:{ResponseCode:'0',ResultCode:'0',CheckoutRequestID:'checkout-123'}};};
 const client=createDarajaStkClient({...config,fetchFn});
 const result=await client.queryStk({checkoutRequestId:'checkout-123'});
 assert.equal(result.ResultCode,'0');
 assert.match(calls[1].url,/stkpushquery\/v1\/query/);
 assert.equal(JSON.parse(calls[1].options.body).CheckoutRequestID,'checkout-123');
});
