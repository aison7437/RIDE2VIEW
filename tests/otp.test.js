const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeKenyanPhone,generateOtp,otpDigest,compareOtpDigest}=require('../server/auth/otp');
test('Kenyan mobile numbers normalize consistently',()=>{
 for(const input of ['0712 345 678','254712345678','+254712345678'])assert.equal(normalizeKenyanPhone(input),'+254712345678');
 assert.equal(normalizeKenyanPhone('0112345678'),'+254112345678');
 for(const invalid of ['+254212345678','+25471234567','+255712345678','0712345678 ext 3',''])assert.throws(()=>normalizeKenyanPhone(invalid));
});
test('OTP codes are six numeric digits',()=>{
 for(let i=0;i<20;i++)assert.match(generateOtp(),/^\d{6}$/);
});
test('OTP digests bind phone and challenge and compare safely',()=>{
 const secret='this-is-a-long-random-test-secret-for-otp-signing';
 const a=otpDigest(secret,'+254712345678','challenge-1','123456');
 assert(compareOtpDigest(a,a));
 assert(!compareOtpDigest(a,otpDigest(secret,'+254712345678','challenge-2','123456')));
 assert(!compareOtpDigest(a,otpDigest(secret,'+254712345679','challenge-1','123456')));
 assert(!compareOtpDigest(a,otpDigest(secret,'+254712345678','challenge-1','654321')));
 assert(!compareOtpDigest('invalid',a));
 assert.throws(()=>otpDigest('short','+254712345678','challenge-1','123456'));
});
