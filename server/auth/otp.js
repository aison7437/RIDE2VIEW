'use strict';
const {createHmac,randomInt,timingSafeEqual}=require('node:crypto');
const PHONE_RE=/^\+254[17]\d{8}$/;
function normalizeKenyanPhone(input){
  if(typeof input!=='string')throw new TypeError('Phone number must be text');
  const digits=input.replace(/[\s()-]/g,'');
  const normalized=/^0[17]\d{8}$/.test(digits)?'+254'+digits.slice(1):
    /^254[17]\d{8}$/.test(digits)?'+'+digits:digits;
  if(!PHONE_RE.test(normalized))throw new Error('Enter a valid Kenyan mobile number');
  return normalized;
}
function generateOtp(){return String(randomInt(0,1000000)).padStart(6,'0');}
function otpDigest(secret,phone,challengeId,code){
  if(typeof secret!=='string'||secret.length<32)throw new Error('OTP signing secret must be at least 32 characters');
  return createHmac('sha256',secret).update(JSON.stringify([phone,challengeId,code])).digest('hex');
}
function compareOtpDigest(expected,actual){
  if(!/^[0-9a-f]{64}$/.test(expected)||!/^[0-9a-f]{64}$/.test(actual))return false;
  return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(actual,'hex'));
}
module.exports={normalizeKenyanPhone,generateOtp,otpDigest,compareOtpDigest};
