'use client';
import { useEffect, useState } from 'react';
type Account = { name: string; role: string };
type Recommendation = { id?: string; title?: string; price?: number; location?: { city?: string } };
type ViewingSlot = { id: string; start_at: string; end_at?: string };
export default function Home() {
  const [account, setAccount] = useState<Account | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Recommendation[]>([]);
  const [message, setMessage] = useState('Search approved property listings.');
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [slots, setSlots] = useState<ViewingSlot[]>([]);
  const [slotId, setSlotId] = useState('');
  const [tier, setTier] = useState('general');
  const [requestKey, setRequestKey] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  useEffect(() => { fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).then(setAccount).catch(() => {}); }, []);
  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setSelectedProperty(null); setSlots([]); setSlotId(''); setRequestMessage('');
    try {
      const response = await fetch('/api/search', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: query }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search unavailable');
      setResults(data.recommendations || []); setMessage(data.summary || 'Search completed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Search failed'); }
    finally { setLoading(false); }
  }
  async function chooseProperty(id:string){
    setSelectedProperty(id);setSlots([]);setSlotId('');setRequestKey(crypto.randomUUID());setRequestMessage('Loading available viewing slots…');
    try{
      const response=await fetch('/api/properties/'+encodeURIComponent(id)+'/slots',{credentials:'same-origin',cache:'no-store'});
      const body=await response.json();
      if(!response.ok)throw new Error(typeof body.error==='string'?body.error:'Unable to load slots');
      setSlots(Array.isArray(body.slots)?body.slots:[]);
      setRequestMessage('Choose an available slot and ride tier. Your customer profile must match the property.');
    }catch(error){setRequestMessage(error instanceof Error?error.message:'Unable to load slots');}
  }
  async function requestViewing(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(account?.role!=='customer'||!selectedProperty||!slotId||!requestKey)return;
    setRequestBusy(true);setRequestMessage('');
    try{
      const response=await fetch('/api/viewing-requests',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({listingId:selectedProperty,slotId,tier,idempotencyKey:requestKey})});
      const body=await response.json();
      if(!response.ok)throw new Error(typeof body.error==='string'?body.error:'Unable to request viewing');
      setRequestMessage('Viewing request submitted. Await agent acceptance; no payment has been confirmed.');
      setSlots([]);setSlotId('');
    }catch(error){setRequestMessage(error instanceof Error?error.message:'Unable to request viewing');}
    finally{setRequestBusy(false);}
  }
  return <main>
    <header><strong>Ride2View</strong><span>{account ? `${account.name} · ${account.role}` : 'Explore properties'}</span></header>
    <section className="hero"><p>DISCOVER · VERIFY · VIEW</p><h1>Find your next place.</h1><p>One connected journey from property discovery to viewing.</p>
      <form onSubmit={search}><label htmlFor="property-search">What are you looking for?</label><div className="search"><input id="property-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Two-bedroom apartment in Kilimani" required /><button disabled={loading}>{loading ? 'Searching…' : 'Search'}</button></div></form>
      <p role="status" aria-live="polite">{message}</p>
    </section>
    <section><h2>Property matches</h2>{results.length ? <ul>{results.map((item, index) => <li key={item.id || index}><strong>{item.title || 'Property'}</strong><span>{item.location?.city || 'Location on request'} · {typeof item.price === 'number' ? `KES ${item.price.toLocaleString()}` : 'Contact agent'}</span>{account?.role==='customer'&&item.id&&<button type="button" onClick={()=>chooseProperty(item.id!)}>View available slots</button>}</li>)}</ul> : <p>Matching properties will appear here after a search.</p>}</section>
    {selectedProperty&&<section><h2>Request a property viewing</h2>
      <p role="status" aria-live="polite">{requestMessage}</p>
      {account?.role==='customer'&&slots.length>0&&<form onSubmit={requestViewing}>
        <label htmlFor="viewing-slot">Available time</label>
        <select id="viewing-slot" value={slotId} onChange={event=>{setSlotId(event.target.value);setRequestKey(crypto.randomUUID());}} required>
          <option value="">Select a viewing time</option>
          {slots.map(slot=><option key={slot.id} value={slot.id}>{new Date(slot.start_at).toLocaleString()}</option>)}
        </select>
        <label htmlFor="ride-tier">Ride tier</label>
        <select id="ride-tier" value={tier} onChange={event=>{setTier(event.target.value);setRequestKey(crypto.randomUUID());}}>
          <option value="general">General</option><option value="students">Students</option><option value="women">Women-only</option><option value="vip">VIP</option>
        </select>
        <button type="submit" disabled={!slotId||requestBusy}>{requestBusy?'Submitting…':'Request viewing'}</button>
      </form>}
      {account?.role==='customer'&&slots.length===0&&<p>No selectable slots currently shown.</p>}
    </section>}
    <footer>V11 frontend foundation · Existing backend remains authoritative for accounts, bookings and payments.</footer>
  </main>;
}
