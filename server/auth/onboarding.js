'use strict';

const { randomBytes, randomUUID, timingSafeEqual } = require('node:crypto');
const { normalizeKenyanPhone, generateOtp, otpDigest, compareOtpDigest } = require('./otp');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = new Set(['customer', 'agent', 'driver']);
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function createAuthOnboarding({ db, audit, otpSecret, verificationProvider, passwordHash, digest, setSession, now = Date.now }) {
  const configured = { phone: Boolean(verificationProvider?.channels?.phone), email: Boolean(verificationProvider?.channels?.email) };
  const hasOtpSecret = typeof otpSecret === 'string' && otpSecret.length >= 32;
  const enabled = Boolean(hasOtpSecret && (configured.phone || configured.email));
  const channels = { phone: enabled && configured.phone, email: enabled && configured.email };
  const stamp = () => new Date(now()).toISOString();
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const cleanEmail = value => {
    if (typeof value !== 'string') fail(400, 'A valid email is required');
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !EMAIL_RE.test(email)) fail(400, 'A valid email is required');
    return email;
  };
  const validName = value => {
    if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 100) fail(400, 'Name must contain 2–100 characters');
    return value.trim();
  };
  const validRole = value => {
    const role = value || 'customer';
    if (!ALLOWED_ROLES.has(role)) fail(400, 'Invalid account role');
    return role;
  };
  const contact = (kind, address) => db.prepare('SELECT user_id FROM auth_contacts WHERE kind=? AND address=?').get(kind, address);
  const addContact = (userId, kind, address, at) => {
    const result = db.prepare('INSERT INTO auth_contacts(user_id,kind,address,verified_at,created_at) VALUES(?,?,?,?,?) ON CONFLICT(kind,address) DO UPDATE SET verified_at=excluded.verified_at WHERE auth_contacts.user_id=excluded.user_id').run(userId, kind, address, at, at);
    if (result.changes !== 1) fail(409, 'That email or phone is already linked to another account');
    return result;
  };
  const touch = (userId, action, id, details) => audit?.({ id: userId }, action, id, details);
  function issueSession(user, res) {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires<?').run(now());
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), user.id, now() + 86400000);
    setSession(res, token);
    const isPlaceholder = user.email?.endsWith('@phone.ride2view.invalid');
    const phone = user.phone || db.prepare("SELECT address FROM auth_contacts WHERE user_id=? AND kind='phone' AND verified_at IS NOT NULL LIMIT 1").get(user.id)?.address || null;
    return { id: user.id, name: user.name, email: isPlaceholder ? null : user.email, phone, role: user.role, verified: user.verified };
  }
  function createAccount({ name, role, email, password, phone, channel, at }) {
    const id = randomUUID();
    const internalEmail = email || `phone-${id}@phone.ride2view.invalid`;
    const hiddenPassword = password || passwordHash(randomBytes(48).toString('base64url'));
    db.prepare('INSERT INTO users(id,email,name,password,role,verified) VALUES(?,?,?,?,?,?)')
      .run(id, internalEmail, name, hiddenPassword, role, role === 'customer' ? 1 : 0);
    if (channel === 'email') addContact(id, 'email', email, at);
    if (channel === 'phone') addContact(id, 'phone', phone, at);
    if (email && channel === 'phone') db.prepare("INSERT INTO auth_contacts(user_id,kind,address,verified_at,created_at) VALUES(?,'email',?,NULL,?)").run(id, email, at);
    touch(id, 'account.created', id, { role, verifiedChannel: channel });
    return db.prepare('SELECT id,email,name,role,verified FROM users WHERE id=?').get(id);
  }
  function ensureEnabled(channel) { if (!enabled || !channels[channel]) fail(503, 'This verification method is not configured'); }
  function rateDestination(kind, address) {
    const prefix = kind.startsWith('phone') ? 'phone' : 'email';
    const recent = db.prepare("SELECT COUNT(*) AS count FROM auth_verification_challenges WHERE kind LIKE ? AND destination=? AND created_at>?")
      .get(prefix + '%', address, new Date(now() - 60 * 60 * 1000).toISOString()).count;
    if (recent >= 3) fail(429, 'Too many verification codes requested. Try again later.');
    const previous = db.prepare("SELECT created_at FROM auth_verification_challenges WHERE kind LIKE ? AND destination=? AND created_at>? ORDER BY created_at DESC LIMIT 1")
      .get(prefix + '%', address, new Date(now() - RESEND_WINDOW_MS).toISOString());
    if (previous) fail(429, 'Wait one minute before requesting another code');
  }
  async function startChallenge({ kind, destination, userId = null, draft = {} }) {
    const channel = kind.startsWith('phone') ? 'phone' : 'email';
    ensureEnabled(channel);
    rateDestination(kind, destination);
    const challengeId = randomUUID();
    const code = generateOtp();
    const expiresAt = new Date(now() + OTP_TTL_MS).toISOString();
    const createdAt = stamp();
    db.prepare("UPDATE auth_verification_challenges SET status='EXPIRED',code_digest='',draft='{}',updated_at=? WHERE status='PENDING' AND expires_at<=?").run(createdAt, createdAt);
    db.prepare("DELETE FROM auth_verification_challenges WHERE created_at<? AND status<>'PENDING'").run(new Date(now() - 86400000).toISOString());
    db.prepare(`INSERT INTO auth_verification_challenges
      (id,kind,destination,user_id,draft,code_digest,expires_at,attempts,status,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,0,'PENDING',?,?)`)
      .run(challengeId, kind, destination, userId, JSON.stringify(draft), otpDigest(otpSecret, destination, challengeId, code), expiresAt, createdAt, createdAt);
    const verificationChannel = kind.startsWith('phone') ? 'sms' : 'email';
    try {
      await verificationProvider.send({ channel: verificationChannel, destination, text: `Your Ride2View verification code is ${code}. It expires in five minutes.`, idempotencyKey: `auth-verification:${challengeId}` });
    } catch {
      db.prepare("UPDATE auth_verification_challenges SET status='DELIVERY_FAILED',code_digest='',draft='{}',updated_at=? WHERE id=? AND status='PENDING'").run(stamp(), challengeId);
      fail(503, 'Verification message could not be delivered. Try again shortly.');
    }
    touch(userId, 'auth.verification_requested', challengeId, { kind, channel: verificationChannel });
    return { challengeId, expiresAt, channel: verificationChannel };
  }
  function startEmail(body) {
    const email = cleanEmail(body.email);
    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    const linked = contact('email', email);
    const userId = existing?.id || linked?.user_id || null;
    if (userId) return startChallenge({ kind: 'email', destination: email, userId });
    const name = validName(body.name);
    const role = validRole(body.role);
    if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256) fail(400, 'Password must contain 12–256 characters');
    return startChallenge({ kind: 'email', destination: email, draft: { name, role, password: passwordHash(body.password) } });
  }
  function startPhone(body) {
    const phone = normalizeKenyanPhone(body.phone);
    const name = body.name ? validName(body.name) : null;
    const role = validRole(body.role);
    const linked = contact('phone', phone);
    return startChallenge({ kind: 'phone', destination: phone, userId: linked?.user_id || null, draft: linked ? {} : { name: name || 'Ride2View customer', role } });
  }
  function startRecovery(body) {
    const email = cleanEmail(body.email);
    if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256) fail(400, 'New password must contain 12–256 characters');
    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    const linked = contact('email', email);
    const userId = existing?.id || linked?.user_id || null;
    return startChallenge({ kind: 'email_recovery', destination: email, userId, draft: { password: passwordHash(body.password) } });
  }
  function startLink(user, body, kind) {
    if (!user) fail(401, 'Sign in to continue');
    ensureEnabled(kind);
    if (kind === 'phone') {
      const phone = normalizeKenyanPhone(body.phone);
      const prior = contact('phone', phone);
      if (prior && prior.user_id !== user.id) fail(409, 'That phone number is linked to another account');
      return startChallenge({ kind: 'phone_link', destination: phone, userId: user.id });
    }
    const email = cleanEmail(body.email);
    if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256) fail(400, 'Password must contain 12–256 characters');
    const prior = db.prepare('SELECT id FROM users WHERE email=? AND id<>?').get(email, user.id);
    const linked = contact('email', email);
    if (prior || (linked && linked.user_id !== user.id)) fail(409, 'That email is linked to another account');
    return startChallenge({ kind: 'email_link', destination: email, userId: user.id, draft: { password: passwordHash(body.password) } });
  }
  function verify({ challengeId, code, res }) {
    if (typeof challengeId !== 'string' || challengeId.length > 64 || typeof code !== 'string' || !/^\d{6}$/.test(code)) fail(400, 'Challenge and six-digit code are required');
    const challenge = db.prepare('SELECT * FROM auth_verification_challenges WHERE id=?').get(challengeId);
    if (!challenge || challenge.status !== 'PENDING') fail(400, 'Code is invalid or expired');
    if (Date.parse(challenge.expires_at) <= now() || challenge.attempts >= MAX_ATTEMPTS) {
      db.prepare("UPDATE auth_verification_challenges SET status='EXPIRED',code_digest='',draft='{}',updated_at=? WHERE id=?").run(stamp(), challengeId);
      fail(400, 'Code is invalid or expired');
    }
    db.prepare('UPDATE auth_verification_challenges SET attempts=attempts+1,updated_at=? WHERE id=? AND status=\'PENDING\'').run(stamp(), challengeId);
    const supplied = otpDigest(otpSecret, challenge.destination, challenge.id, code);
    if (!compareOtpDigest(challenge.code_digest, supplied)) {
      const attempts = challenge.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) db.prepare("UPDATE auth_verification_challenges SET status='LOCKED',code_digest='',draft='{}',updated_at=? WHERE id=?").run(stamp(), challengeId);
      fail(400, 'Code is invalid or expired');
    }
    let user, noRecoveryAccount = false;
    const at = stamp();
    db.exec('BEGIN IMMEDIATE');
    try {
      const current = db.prepare("SELECT * FROM auth_verification_challenges WHERE id=? AND status='PENDING'").get(challengeId);
      if (!current || Date.parse(current.expires_at) <= now() || current.attempts > MAX_ATTEMPTS) fail(409, 'Code is invalid or expired');
      const draft = JSON.parse(current.draft || '{}');
      const isPhone = current.kind.startsWith('phone');
      if (current.kind === 'email_recovery') {
        user = current.user_id ? db.prepare('SELECT id,email,name,role,verified FROM users WHERE id=?').get(current.user_id) : null;
        if (!user) {
          db.prepare("UPDATE auth_verification_challenges SET status='CANCELLED',code_digest='',draft='{}',updated_at=? WHERE id=?").run(at, challengeId);
          noRecoveryAccount = true;
        } else {
          db.prepare('UPDATE users SET password=? WHERE id=?').run(draft.password, user.id);
          addContact(user.id, 'email', current.destination, at);
          db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
        }
      } else if (current.kind.endsWith('_link')) {
        user = db.prepare('SELECT id,email,name,role,verified FROM users WHERE id=?').get(current.user_id);
        if (!user) fail(409, 'Account is unavailable');
        if (isPhone) addContact(user.id, 'phone', current.destination, at);
        else {
          const placeholder = user.email?.endsWith('@phone.ride2view.invalid');
          const email = current.destination;
          db.prepare('UPDATE users SET email=?,password=? WHERE id=?').run(email, draft.password, user.id);
          addContact(user.id, 'email', email, at);
          user = { ...user, email };
          if (placeholder) db.prepare('DELETE FROM auth_contacts WHERE user_id=? AND kind=\'email\' AND address<>?').run(user.id, email);
        }
      } else if (current.user_id) {
        user = db.prepare('SELECT id,email,name,role,verified FROM users WHERE id=?').get(current.user_id);
        if (!user) fail(409, 'Account is unavailable');
        addContact(user.id, isPhone ? 'phone' : 'email', current.destination, at);
      } else {
        const name = draft.name || 'Ride2View customer';
        const role = draft.role || 'customer';
        user = createAccount({ name, role, email: isPhone ? null : current.destination, password: isPhone ? null : draft.password, phone: isPhone ? current.destination : null, channel: isPhone ? 'phone' : 'email', at });
        if (isPhone && draft.email) db.prepare("INSERT INTO auth_contacts(user_id,kind,address,verified_at,created_at) VALUES(?,'email',?,NULL,?)").run(user.id, draft.email, at);
      }
      db.prepare("UPDATE auth_verification_challenges SET status='VERIFIED',code_digest='',draft='{}',updated_at=? WHERE id=? AND status='PENDING'").run(at, challengeId);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      if (error.status) throw error;
      if (String(error.message).includes('UNIQUE')) fail(409, 'That email or phone is already linked to an account');
      throw error;
    }
    if (noRecoveryAccount) fail(400, 'Code is invalid or expired');
    touch(user.id, 'auth.contact_verified', challengeId, { channel: challenge.kind.startsWith('phone') ? 'sms' : 'email' });
    return issueSession({ ...user, phone: challenge.kind.startsWith('phone') ? challenge.destination : undefined }, res);
  }
  async function routes({ path, method, user, body, send, res }) {
    if (path === '/api/auth/email/challenges' && method === 'POST') { send(202, await startEmail(body)); return true; }
    if (path === '/api/auth/email/recovery/challenges' && method === 'POST') { send(202, await startRecovery(body)); return true; }
    if (path === '/api/auth/phone/challenges' && method === 'POST') { send(202, await startPhone(body)); return true; }
    if (path === '/api/auth/email/link/challenges' && method === 'POST') { send(202, await startLink(user, body, 'email')); return true; }
    if (path === '/api/auth/phone/link/challenges' && method === 'POST') { send(202, await startLink(user, body, 'phone')); return true; }
    if (path === '/api/auth/challenges/verify' && method === 'POST') { send(200, verify({ ...body, res })); return true; }
    return false;
  }
  return { enabled, channels, routes };
}

module.exports = { createAuthOnboarding };
