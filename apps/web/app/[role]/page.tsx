'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
type Role = 'customer' | 'driver' | 'agent' | 'admin';
type Account = { name?: string; role?: string };
type RecordValue = Record<string, unknown>;
const roles: Role[] = ['customer','driver','agent','admin'];
const configs: Record<Role,{title:string;endpoint:string;collection:string;empty:string}> = {
  customer:{title:'Your viewing bookings',endpoint:'/api/bookings',collection:'bookings',empty:'No viewing bookings yet.'},
  driver:{title:'Your assigned journeys',endpoint:'/api/bookings',collection:'bookings',empty:'No journeys assigned yet.'},
  agent:{title:'Your property listings',endpoint:'/api/listings?mine=true',collection:'listings',empty:'No property listings yet.'},
  admin:{title:'Registered accounts',endpoint:'/api/admin/users',collection:'users',empty:'No accounts returned.'},
};
function safeText(value:unknown):string {
  if(typeof value==='string')return value.slice(0,160);
  if(typeof value==='number')return String(value);
  return '';
}
function itemTitle(item:RecordValue,role:Role,index:number):string {
  if(role==='agent')return safeText(item.title)||safeText(item.name)||`Property ${index+1}`;
  if(role==='admin')return safeText(item.name)||`Account ${index+1}`;
  return `Journey ${index+1}`;
}
function itemDetail(item:RecordValue,role:Role):string {
  if(role==='admin')return safeText(item.role);
  return safeText(item.status)||safeText(item.payment_status)||'Status unavailable';
}
export default function RolePage() {
  const params=useParams<{role:string}>();
  const role=params.role as Role;
  const [account,setAccount]=useState<Account|null>(null);
  const [status,setStatus]=useState<'loading'|'signed-out'|'forbidden'|'ready'|'error'>('loading');
  const [records,setRecords]=useState<RecordValue[]>([]);
  const [dataStatus,setDataStatus]=useState<'loading'|'ready'|'error'>('loading');
  useEffect(()=>{
    if(!roles.includes(role))return;
    const controller=new AbortController();
    async function load(){
      setStatus('loading');setRecords([]);setDataStatus('loading');
      try{
        const response=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
        if(response.status===401){setStatus('signed-out');return;}
        if(!response.ok){setStatus('error');return;}
        const data:Account=await response.json();
        if(controller.signal.aborted)return;
        setAccount(data);
        if(data.role!==role){setStatus('forbidden');return;}
        setStatus('ready');
        const config=configs[role];
        const result=await fetch(config.endpoint,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
        if(!result.ok){setDataStatus('error');return;}
        const body=await result.json();
        if(controller.signal.aborted)return;
        const collection=body?.[config.collection];
        setRecords(Array.isArray(collection)?collection:[]);
        setDataStatus('ready');
      }catch{if(!controller.signal.aborted){setStatus(current=>current==='ready'?current:'error');setDataStatus('error');}}
    }
    load();
    return()=>controller.abort();
  },[role]);
  if(!roles.includes(role))return <main><h1>Dashboard not found</h1><a href="/">Return to Ride2View</a></main>;
  const config=configs[role];
  return <main><header><strong>Ride2View</strong><a href="/">Home</a></header>
    <section className="hero"><p>ROLE WORKSPACE</p><h1>{role[0].toUpperCase()+role.slice(1)} dashboard</h1>
      {status==='loading'&&<p role="status">Checking your account…</p>}
      {status==='signed-out'&&<p role="status">Sign in using the existing Ride2View account interface.</p>}
      {status==='forbidden'&&<p role="alert">Access denied. Your account does not have the required role.</p>}
      {status==='error'&&<p role="alert">Unable to verify access. Please try again later.</p>}
      {status==='ready'&&<p>Welcome, {account?.name||'Ride2View member'}.</p>}
    </section>
    {status==='ready'&&<section><h2>{config.title}</h2>
      {dataStatus==='loading'&&<p role="status">Loading current records…</p>}
      {dataStatus==='error'&&<p role="alert">Unable to load records. Please retry later.</p>}
      {dataStatus==='ready'&&(records.length?<ul>{records.map((item,index)=><li key={safeText(item.id)||index}><strong>{itemTitle(item,role,index)}</strong><span>{itemDetail(item,role)}</span></li>)}</ul>:<p>{config.empty}</p>)}
      <p>This workspace currently provides a read-only overview. Use the existing operational interface for actions and approvals.</p>
    </section>}
    <footer>Server API permissions remain authoritative. This page does not grant privileges or expose payment controls.</footer>
  </main>;
}
