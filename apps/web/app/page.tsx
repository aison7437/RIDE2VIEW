'use client';
import { useEffect, useState } from 'react';
type Account = { name: string; role: string };
type Recommendation = { id?: string; title?: string; price?: number; location?: { city?: string } };
type ViewingSlot = { id: string; start_at: string; end_at?: string };
const currency = (amount: number) => 'KES ' + amount.toLocaleString();
export default function Home() {
  const [account, setAccount] = useState<Account | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Recommendation[]>([]);
  const [message, setMessage] = useState('Tell us what kind of home you are looking for.');
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
  async function chooseProperty(id: string) {
    setSelectedProperty(id); setSlots([]); setSlotId(''); setRequestKey(crypto.randomUUID()); setRequestMessage('Loading available viewing slots…');
    try {
      const response = await fetch('/api/properties/' + encodeURIComponent(id) + '/slots', { credentials: 'same-origin', cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Unable to load slots');
      setSlots(Array.isArray(body.slots) ? body.slots : []);
      setRequestMessage('Choose an available slot and ride tier. Your customer profile must match the property.');
    } catch (error) { setRequestMessage(error instanceof Error ? error.message : 'Unable to load slots'); }
  }
  async function requestViewing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (account?.role !== 'customer' || !selectedProperty || !slotId || !requestKey) return;
    setRequestBusy(true); setRequestMessage('');
    try {
      const response = await fetch('/api/viewing-requests', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: selectedProperty, slotId, tier, idempotencyKey: requestKey }) });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Unable to request viewing');
      setRequestMessage('Viewing request submitted. Await agent acceptance; no payment has been confirmed.');
      setSlots([]); setSlotId('');
    } catch (error) { setRequestMessage(error instanceof Error ? error.message : 'Unable to request viewing'); }
    finally { setRequestBusy(false); }
  }
  return <main className="site">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Ride2View home"><span className="brand-mark">R<span>2</span>V</span><span>Ride<span className="brand-accent">2</span>View<small>PROPERTY JOURNEYS</small></span></a>
      <div className="topbar-right"><span className="location-pill">Nairobi, Kenya</span><span className="account-pill">{account ? `${account.name} · ${account.role}` : 'Explore properties'}</span></div>
    </header>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot"/> A BETTER WAY TO FIND HOME</p>
        <h1 id="hero-title">Discover your <em>next chapter.</em></h1>
        <p className="hero-lead">Beautiful spaces, verified journeys. Find a home, schedule a viewing, and get there with confidence.</p>
        <div className="journey-tags"><span>Discover</span><span>Verify</span><span>Schedule</span><span>View</span></div>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="arch"><div className="building"><div className="window-grid"><i/><i/><i/><i/><i/><i/></div><div className="balcony"/></div></div><span className="art-caption">YOUR SPACE. YOUR PACE.</span></div>
      <form className="search-panel" onSubmit={search} aria-label="Property search">
        <label htmlFor="property-search">WHERE WOULD YOU LIKE TO LIVE?</label>
        <div className="search-row"><input id="property-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Try ‘Two-bedroom apartment in Kilimani’" required /><button disabled={loading} type="submit">{loading ? 'Searching…' : 'Explore homes'} <span aria-hidden="true">↗</span></button></div>
        <p className="search-status" role="status" aria-live="polite">{message}</p>
      </form>
    </section>
    <section className="matches" aria-labelledby="matches-heading"><div className="section-header"><div><p className="eyebrow dark">CURATED FOR YOUR JOURNEY</p><h2 id="matches-heading">Explore property matches</h2></div><span className="section-note">Real results appear after your search</span></div>
      {results.length ? <ul className="property-grid">{results.map((item,index)=><li className="property-card" key={item.id || index}><div className="property-art" aria-hidden="true"><span>RIDE2VIEW / PROPERTY</span></div><div className="property-detail"><p className="property-location">{item.location?.city || 'Location on request'}</p><h3>{item.title || 'Property'}</h3><p className="property-price">{typeof item.price === 'number' ? currency(item.price) : 'Contact agent for pricing'}</p>{account?.role==='customer' && item.id && <button className="outline-button" type="button" onClick={()=>chooseProperty(item.id!)}>View available slots ↗</button>}</div></li>)}</ul>
      : <div className="empty-state"><span className="empty-symbol" aria-hidden="true">⌂</span><h3>Your next place starts with a search.</h3><p>Tell us the location and kind of home you want. Matching listings will appear here.</p></div>}
    </section>
    {selectedProperty && <section className="viewing-panel" aria-labelledby="viewing-heading"><p className="eyebrow dark">THE NEXT STEP</p><h2 id="viewing-heading">Request a property viewing</h2><p role="status" aria-live="polite">{requestMessage}</p>
      {account?.role==='customer' && slots.length>0 && <form className="viewing-form" onSubmit={requestViewing}><label htmlFor="viewing-slot">Available time</label><select id="viewing-slot" value={slotId} onChange={event=>{setSlotId(event.target.value);setRequestKey(crypto.randomUUID());}} required><option value="">Select a viewing time</option>{slots.map(slot=><option key={slot.id} value={slot.id}>{new Date(slot.start_at).toLocaleString()}</option>)}</select><label htmlFor="ride-tier">Ride tier</label><select id="ride-tier" value={tier} onChange={event=>{setTier(event.target.value);setRequestKey(crypto.randomUUID());}}><option value="general">General</option><option value="students">Students</option><option value="women">Women-only</option><option value="vip">VIP</option></select><button type="submit" disabled={!slotId||requestBusy}>{requestBusy ? 'Submitting…' : 'Request viewing ↗'}</button></form>}
      {account?.role==='customer' && slots.length===0 && <p>No selectable slots currently shown.</p>}
    </section>}
    <section className="promise"><div><span>01 / DISCOVER</span><strong>Find the right space</strong><p>Search based on your needs.</p></div><div><span>02 / SCHEDULE</span><strong>Choose your viewing</strong><p>Request a convenient available slot.</p></div><div><span>03 / GO</span><strong>Arrive with confidence</strong><p>A connected property journey.</p></div></section>
    <footer className="footer"><strong>Ride<span>2</span>View</strong><p>Find a home. Book a viewing. Get there with confidence.</p><small>Preview interface · Availability, acceptance and payment are governed by the existing backend.</small></footer>
  </main>;
}
