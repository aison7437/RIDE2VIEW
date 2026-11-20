'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Workspace = { key: string; label: string; path: string; operationalStatus: string };
type Application = { key: string; status: string; selfServiceEnabled: boolean };
type Identity = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  access?: {
    defaultWorkspace: string | null;
    workspaces: Workspace[];
    applications: Application[];
    multiRoleEnabled: boolean;
  };
};

type ViewState = 'checking' | 'signed-out' | 'ready' | 'error';
type SignInMethod = 'phone' | 'email';

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json().catch(() => null);
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function responseError(body: Record<string, unknown>, fallback: string): Error {
  return new Error(typeof body.error === 'string' && body.error.length <= 250 ? body.error : fallback);
}

export default function AccountGateway() {
  const [view, setView] = useState<ViewState>('checking');
  const [account, setAccount] = useState<Identity | null>(null);
  const [method, setMethod] = useState<SignInMethod>('phone');
  const [emailRegistration, setEmailRegistration] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refreshAccount() {
    const response = await fetch('/api/auth/me', {credentials:'same-origin',cache:'no-store'});
    if (response.status === 401) {
      setAccount(null);
      setView('signed-out');
      return;
    }
    if (!response.ok) throw new Error('The account service is unavailable. Check the API connection for this deployment.');
    const data = await responseBody(response) as Partial<Identity>;
    if (typeof data.id !== 'string' || typeof data.role !== 'string') throw new Error('The identity response is incomplete.');
    setAccount(data as Identity);
    setView('ready');
  }

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', {credentials:'same-origin',cache:'no-store'})
      .then(async response => {
        if (response.status === 401) return {state:'signed-out' as ViewState, data:null};
        if (!response.ok) throw new Error('The account service is unavailable on this deployment.');
        const data = await responseBody(response);
        if (typeof data.id !== 'string' || typeof data.role !== 'string') throw new Error('Unexpected account response.');
        return {state:'ready' as ViewState, data:data as Identity};
      })
      .then(result => {if(active){setView(result.state);setAccount(result.data);}})
      .catch(error => {if(active){setView('error');setMessage(error instanceof Error ? error.message : 'Unable to check account.');}});
    return () => {active = false;};
  }, []);

  async function requestPhoneCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);setMessage('');
    try {
      const response = await fetch('/api/auth/phone/challenges', {
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({phone,name:name.trim()||undefined,role:'customer'})
      });
      const body = await responseBody(response);
      if (!response.ok) throw responseError(body, 'Unable to send verification code.');
      if (typeof body.challengeId !== 'string') throw new Error('Verification service returned an incomplete challenge.');
      setChallengeId(body.challengeId);
      setMessage('A six-digit verification code was requested. Enter the code sent to your phone.');
    } catch(error){setMessage(error instanceof Error ? error.message : 'Verification failed.');}
    finally{setBusy(false);}
  }

  async function verifyPhone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !challengeId) return;
    setBusy(true);setMessage('');
    try {
      const response = await fetch('/api/auth/challenges/verify', {
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({challengeId,code})
      });
      const body = await responseBody(response);
      if (!response.ok) throw responseError(body, 'The code could not be verified.');
      setCode('');setChallengeId('');
      await refreshAccount();
    } catch(error){setMessage(error instanceof Error ? error.message : 'Could not sign in.');}
    finally{setBusy(false);}
  }

  async function registerEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);setMessage('');
    try {
      const response = await fetch('/api/auth/email/challenges', {
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,name,password,role:'customer'})
      });
      const body = await responseBody(response);
      if (!response.ok) throw responseError(body, 'Unable to start email registration.');
      if (typeof body.challengeId !== 'string') throw new Error('Verification service returned an incomplete challenge.');
      setChallengeId(body.challengeId);
      setPassword('');
      setMessage('Enter the six-digit verification code sent to your email address.');
    } catch(error){setMessage(error instanceof Error ? error.message : 'Registration failed.');}
    finally{setBusy(false);}
  }

  async function loginEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);setMessage('');
    try {
      const response = await fetch('/api/auth/login', {
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      const body = await responseBody(response);
      if (!response.ok) throw responseError(body, 'Sign-in failed.');
      setPassword('');
      await refreshAccount();
    } catch(error){setMessage(error instanceof Error ? error.message : 'Unable to sign in.');}
    finally{setBusy(false);}
  }

  async function logout() {
    if (busy) return;
    setBusy(true);setMessage('');
    try {
      const response = await fetch('/api/auth/logout', {
        method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'
      });
      if (!response.ok) throw responseError(await responseBody(response), 'Unable to sign out.');
      setAccount(null);setView('signed-out');setChallengeId('');
    } catch(error){setMessage(error instanceof Error ? error.message : 'Sign-out failed.');}
    finally{setBusy(false);}
  }

  return <main className="identity-page">
    <div className="identity-shell">
      <section className="identity-intro">
        <Link href="/" className="identity-brand">Ride<span>2</span>View <b>PRO</b></Link>
        <p className="identity-kicker">ONE ACCOUNT · THE ENTIRE JOURNEY</p>
        <h1>One sign-in. Your Ride2View world.</h1>
        <p>Find a home, manage viewings or access an approved professional workspace. Your permissions are verified by the backend.</p>
        <div className="identity-intro-foot">PROPERTY · MOBILITY · TRUST</div>
      </section>
      <section className="identity-form-card" aria-label="Ride2View account">
        {view === 'checking' && <p role="status">Checking your session…</p>}
        {view === 'error' && <div><h2>Account service unavailable</h2><p role="alert">{message}</p><p>Sign-in requires the Ride2View backend to be reachable on this website.</p><button type="button" className="identity-primary" onClick={()=>window.location.reload()}>Retry</button></div>}
        {view === 'signed-out' && <>
          <h2>Welcome to Ride2View</h2>
          <p>Sign in securely or register as a new customer with your phone.</p>
          <div className="identity-tabs" role="group" aria-label="Sign-in method">
            <button type="button" aria-pressed={method==='phone'} className={method==='phone'?'selected':''} onClick={()=>{setMethod('phone');setChallengeId('');setMessage('');}}>Phone + OTP</button>
            <button type="button" aria-pressed={method==='email'} className={method==='email'?'selected':''} onClick={()=>{setMethod('email');setChallengeId('');setMessage('');}}>Email + password</button>
          </div>
          {method==='phone' && !challengeId && <form onSubmit={requestPhoneCode} className="identity-fields">
            <label htmlFor="identity-phone">Kenyan phone number</label>
            <input id="identity-phone" type="tel" autoComplete="tel" required placeholder="+254 712 345 678" value={phone} onChange={event=>setPhone(event.target.value)}/>
            <label htmlFor="identity-name">Your name (new customers only)</label>
            <input id="identity-name" autoComplete="name" maxLength={100} placeholder="Full name" value={name} onChange={event=>setName(event.target.value)}/>
            <button disabled={busy} type="submit" className="identity-primary">{busy?'Sending…':'Send verification code'}</button>
            <p className="identity-footnote">Existing customers sign in; new phone users register as customers. Professional privileges require separate approval.</p>
          </form>}
          {Boolean(challengeId) && <form onSubmit={verifyPhone} className="identity-fields">
            <label htmlFor="identity-code">Six-digit verification code</label>
            <input id="identity-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="123456" value={code} onChange={event=>setCode(event.target.value)}/>
            <button disabled={busy} type="submit" className="identity-primary">{busy?'Verifying…':'Verify & sign in'}</button>
            <button type="button" className="identity-secondary" onClick={()=>{setChallengeId('');setCode('');setMessage('');}}>Start again</button>
          </form>}
          {method==='email' && !challengeId && <>
            <button type="button" className="identity-secondary" onClick={()=>{setEmailRegistration(!emailRegistration);setMessage('');}}>{emailRegistration?'Already registered? Sign in':'New here? Create an email account'}</button>
            <form onSubmit={emailRegistration?registerEmail:loginEmail} className="identity-fields">
            {emailRegistration && <>
              <label htmlFor="identity-email-name">Full name</label>
              <input id="identity-email-name" autoComplete="name" minLength={2} maxLength={100} required value={name} onChange={event=>setName(event.target.value)}/>
            </>}
            <label htmlFor="identity-email">Email address</label>
            <input id="identity-email" autoComplete="username" type="email" required placeholder="you@example.com" value={email} onChange={event=>setEmail(event.target.value)}/>
            <label htmlFor="identity-password">Password</label>
            <input id="identity-password" type="password" autoComplete={emailRegistration?'new-password':'current-password'} minLength={emailRegistration?12:undefined} required value={password} onChange={event=>setPassword(event.target.value)}/>
            <button disabled={busy} type="submit" className="identity-primary">{busy?'Please wait…':emailRegistration?'Send email verification code':'Sign in to your account'}</button>
            <p className="identity-footnote">{emailRegistration?'Email verification is required before creating your customer account.':'Sign in using an existing verified email account.'}</p>
          </form></>}
          {message && <p role="status" className="identity-message">{message}</p>}
        </>}
        {view==='ready' && account && <>
          <div className="identity-member-head"><div className="identity-avatar" aria-hidden="true">{account.name?.trim().slice(0,1).toUpperCase()||'R'}</div><div><h2>Welcome, {account.name}</h2><p>{account.email||account.phone||'Ride2View member'} · {account.role}</p></div></div>
          <h3>Your authorized workspace</h3>
          {!account.access && <p role="status">Workspace information requires an updated Ride2View backend.</p>}
          {account.access?.workspaces.map(item=><Link key={item.key} href={item.path} className="identity-workspace">
            <span><strong>{item.label}</strong><small>{item.operationalStatus==='REQUIRES_DOMAIN_ELIGIBILITY_CHECK'?'Professional eligibility checked in the workspace':item.operationalStatus==='IDENTITY_VERIFIED'?'Identity verified':'Identity verification pending'}</small></span>
            <span aria-hidden="true">→</span>
          </Link>)}
          {account.access?.multiRoleEnabled===false && <p className="identity-footnote">Additional workspace memberships are not yet enabled. Your existing role and security checks remain unchanged.</p>}
          {account.access?.applications && account.access.applications.length>0 && <div className="identity-applications">
            <h3>Professional access</h3>
            <p>Driver, agent and pharmacy access require separate verification. Self-service role activation is not yet available.</p>
            <div>{account.access.applications.map(item=><span key={item.key}>{item.key} · not enabled</span>)}</div>
          </div>}
          <button type="button" className="identity-secondary" disabled={busy} onClick={logout}>{busy?'Signing out…':'Sign out'}</button>
          {message && <p role="alert" className="identity-message">{message}</p>}
        </>}
      </section>
    </div>
  </main>;
}
