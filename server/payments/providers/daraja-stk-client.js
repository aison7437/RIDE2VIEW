const {Buffer}=require('node:buffer');

function error(code){return Object.assign(new Error(code),{code});}
function createDarajaStkClient({consumerKey,consumerSecret,shortcode,passkey,callbackUrl,environment='sandbox',fetchFn=globalThis.fetch,clock=()=>new Date()}={}){
 if(!['sandbox','production'].includes(environment))throw error('DARAJA_ENVIRONMENT_INVALID');
 if(typeof fetchFn!=='function')throw error('DARAJA_FETCH_REQUIRED');
 const host=environment==='sandbox'?'https://sandbox.safaricom.co.ke':'https://api.safaricom.co.ke';
 const configured=[consumerKey,consumerSecret,shortcode,passkey,callbackUrl].every(v=>typeof v==='string'&&v.trim().length>0);
 if(configured){let url;try{url=new URL(callbackUrl);}catch{throw error('DARAJA_CALLBACK_URL_INVALID');}if(url.protocol!=='https:')throw error('DARAJA_CALLBACK_URL_HTTPS_REQUIRED');}
 async function json(url,options){
  const response=await fetchFn(url,options);
  if(!response||typeof response.ok!=='boolean'||typeof response.json!=='function')throw error('DARAJA_TRANSPORT_INVALID');
  if(!response.ok)throw error('DARAJA_HTTP_ERROR');
  let body;try{body=await response.json();}catch{throw error('DARAJA_RESPONSE_INVALID');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw error('DARAJA_RESPONSE_INVALID');
  return body;
 }
 async function token(){
  if(!configured)throw error('DARAJA_CREDENTIALS_REQUIRED');
  const basic=Buffer.from(consumerKey+':'+consumerSecret).toString('base64');
  const result=await json(host+'/oauth/v1/generate?grant_type=client_credentials',{method:'GET',headers:{Authorization:'Basic '+basic}});
  if(typeof result.access_token!=='string'||!result.access_token)throw error('DARAJA_TOKEN_INVALID');
  return result.access_token;
 }
 function timestamp(){const d=clock();if(!(d instanceof Date)||!Number.isFinite(d.getTime()))throw error('DARAJA_CLOCK_INVALID');return d.getUTCFullYear().toString()+String(d.getUTCMonth()+1).padStart(2,'0')+String(d.getUTCDate()).padStart(2,'0')+String(d.getUTCHours()).padStart(2,'0')+String(d.getUTCMinutes()).padStart(2,'0')+String(d.getUTCSeconds()).padStart(2,'0');}
 async function initiatePayment({amount,customerContact,correlationId,idempotencyKey}={}){
  if(!configured)throw error('DARAJA_CREDENTIALS_REQUIRED');
  if(!correlationId||idempotencyKey!==correlationId)throw error('DARAJA_CORRELATION_REQUIRED');
  if(!Number.isSafeInteger(amount)||amount<=0)throw error('DARAJA_AMOUNT_INVALID');
  if(!/^2547\d{8}$/.test(String(customerContact||''))&&!/^2541\d{8}$/.test(String(customerContact||'')))throw error('DARAJA_PHONE_INVALID');
  const t=timestamp(),password=Buffer.from(shortcode+passkey+t).toString('base64'),accessToken=await token();
  const body={BusinessShortCode:shortcode,Password:password,Timestamp:t,TransactionType:'CustomerPayBillOnline',Amount:amount,PartyA:customerContact,PartyB:shortcode,PhoneNumber:customerContact,CallBackURL:callbackUrl,AccountReference:correlationId,TransactionDesc:'Ride2View payment'};
  const result=await json(host+'/mpesa/stkpush/v1/processrequest',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(result.ResponseCode!=='0'||typeof result.CheckoutRequestID!=='string'||!result.CheckoutRequestID||typeof result.MerchantRequestID!=='string'||!result.MerchantRequestID)throw error('DARAJA_STK_NOT_ACCEPTED');
  return {providerRequestId:result.CheckoutRequestID,merchantRequestId:result.MerchantRequestID,correlationId};
 }
 async function queryStk({checkoutRequestId}={}){
  if(!configured)throw error('DARAJA_CREDENTIALS_REQUIRED');
  if(typeof checkoutRequestId!=='string'||!checkoutRequestId.trim())throw error('DARAJA_CHECKOUT_ID_REQUIRED');
  const t=timestamp(),accessToken=await token();
  return json(host+'/mpesa/stkpushquery/v1/query',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({BusinessShortCode:shortcode,Password:Buffer.from(shortcode+passkey+t).toString('base64'),Timestamp:t,CheckoutRequestID:checkoutRequestId})});
 }
 return {initiatePayment,queryStk,configured,environment};
}
module.exports={createDarajaStkClient};
