'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
type Role = 'customer' | 'driver' | 'agent' | 'admin';
type Account = { name?: string; role?: string };
const roles: Role[] = ['customer','driver','agent','admin'];
const descriptions: Record<Role,string> = {
  customer: 'Discover properties and manage your viewing journey.',
  driver: 'Review your assigned journeys and trip operations.',
  agent: 'Manage property listings and viewing requests.',
  admin: 'Review platform operations and authorized approvals.',
};
export default function RolePage() {
  const params = useParams<{role: string}>();
  const role = params.role as Role;
  const [account,setAccount] = useState<Account|null>(null);
  const [status,setStatus] = useState<'loading'|'signed-out'|'forbidden'|'ready'|'error'>('loading');
  useEffect(() => {
    if(!roles.includes(role)) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
        if(response.status===401){setStatus('signed-out');return;}
        if(!response.ok){setStatus('error');return;}
        const data: Account = await response.json();
        setAccount(data);
        setStatus(data.role===role?'ready':'forbidden');
      } catch(e) {if(!controller.signal.aborted)setStatus('error');}
    }
    load();
    return () => controller.abort();
  },[role]);
  if(!roles.includes(role)) return <main><h1>Dashboard not found</h1><a href="/">Return to Ride2View</a></main>;
  return <main><header><strong>Ride2View</strong><a href="/">Home</a></header>
    <section className="hero"><p>SECURE ROLE WORKSPACE</p><h1>{role[0].toUpperCase()+role.slice(1)} dashboard</h1>
    {status==='loading'&&<p role="status">Checking your account…</p>}
    {status==='signed-out'&&<p role="status">Sign in using the existing Ride2View account interface before accessing this dashboard.</p>}
    {status==='forbidden'&&<p role="alert">Access denied. Your account does not have the required role.</p>}
    {status==='error'&&<p role="alert">Unable to verify access. Please try again later.</p>}
    {status==='ready'&&<><p>Welcome, {account?.name || 'Ride2View member'}.</p><p>{descriptions[role]}</p><p>Workspace integration is in progress. Sensitive actions remain on the existing server-authorized interface.</p></>}
    </section><footer>Role verification is a navigation guard only. All privileged API operations must enforce permissions on the backend.</footer>
  </main>;
}
