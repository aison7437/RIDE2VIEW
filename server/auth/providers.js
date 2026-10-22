'use strict';

const EMAIL_FROM_RE = /^(?:[^<>\r\n]+\s*<)?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+(?:>)?$/;

async function readJson(response) {
  const length = Number(response.headers?.get('content-length') || 0);
  if (length > 256000) throw new Error('VERIFICATION_PROVIDER_RESPONSE_TOO_LARGE');
  const raw = await response.text();
  if (raw.length > 256000) throw new Error('VERIFICATION_PROVIDER_RESPONSE_TOO_LARGE');
  try { return JSON.parse(raw); } catch { throw new Error('VERIFICATION_PROVIDER_INVALID_RESPONSE'); }
}

function createAfricasTalkingSms({ username, apiKey, senderId, fetchFn = fetch } = {}) {
  if (!username || !apiKey) return null;
  return {
    async send({ destination, text, idempotencyKey }) {
      const form = new URLSearchParams({ username, to: destination, message: text });
      if (senderId) form.set('from', senderId);
      const response = await fetchFn('https://api.africastalking.com/version1/messaging', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000),
        headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idempotencyKey },
        body: form.toString()
      });
      const data = await readJson(response);
      const recipients = data.SMSMessageData?.Recipients;
      if (!response.ok || !Array.isArray(recipients) || recipients.length !== 1 || Number(recipients[0].statusCode) !== 101) {
        throw new Error('SMS_PROVIDER_REJECTED');
      }
      return { provider: 'africas_talking', messageId: String(recipients[0].messageId || idempotencyKey) };
    }
  };
}

function createResendEmail({ apiKey, from, fetchFn = fetch } = {}) {
  if (!apiKey || !from || !EMAIL_FROM_RE.test(from)) return null;
  return {
    async send({ destination, text, idempotencyKey }) {
      const code = text.match(/\b(\d{6})\b/)?.[1];
      if (!code) throw new Error('INVALID_VERIFICATION_MESSAGE');
      const response = await fetchFn('https://api.resend.com/emails', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ from, to: [destination], subject: 'Your Ride2View verification code', text, html: `<p>Your Ride2View verification code is:</p><p><strong>${code}</strong></p><p>It expires in five minutes. If you did not request this code, ignore this email.</p>` })
      });
      const data = await readJson(response);
      if (!response.ok || typeof data.id !== 'string' || !data.id) throw new Error('EMAIL_PROVIDER_REJECTED');
      return { provider: 'resend', messageId: data.id };
    }
  };
}

function fromEnvironment(env = process.env, fetchFn = fetch) {
  if (Boolean(env.AT_USERNAME) !== Boolean(env.AT_API_KEY)) throw new Error('Africa\'s Talking requires both AT_USERNAME and AT_API_KEY');
  if (env.AT_SENDER_ID && !env.AT_API_KEY) throw new Error('AT_SENDER_ID requires an Africa\'s Talking API key');
  if (Boolean(env.RESEND_API_KEY) !== Boolean(env.R2V_AUTH_EMAIL_FROM)) throw new Error('Resend requires both RESEND_API_KEY and R2V_AUTH_EMAIL_FROM');
  if (env.R2V_AUTH_EMAIL_FROM && !EMAIL_FROM_RE.test(env.R2V_AUTH_EMAIL_FROM)) throw new Error('R2V_AUTH_EMAIL_FROM must be a valid email sender');
  if (env.R2V_AUTH_OTP_SECRET && env.R2V_AUTH_OTP_SECRET.length < 32) throw new Error('R2V_AUTH_OTP_SECRET must contain at least 32 characters');
  const sms = createAfricasTalkingSms({ username: env.AT_USERNAME, apiKey: env.AT_API_KEY, senderId: env.AT_SENDER_ID, fetchFn });
  const email = createResendEmail({ apiKey: env.RESEND_API_KEY, from: env.R2V_AUTH_EMAIL_FROM, fetchFn });
  return {
    channels: { phone: Boolean(sms), email: Boolean(email) },
    async send({ channel, destination, text, idempotencyKey }) {
      const provider = channel === 'sms' ? sms : channel === 'email' ? email : null;
      if (!provider) throw new Error('VERIFICATION_PROVIDER_NOT_CONFIGURED');
      return provider.send({ destination, text, idempotencyKey });
    }
  };
}

module.exports = { createAfricasTalkingSms, createResendEmail, fromEnvironment };
