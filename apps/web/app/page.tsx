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
  const [activeCategory, setActiveCategory] = useState('All');
  const [saved, setSaved] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState('Home');
  const [detail, setDetail] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [service, setService] = useState('Ride2View');
  const categories = [
    ['All','⌂'],['For Rent','⌂'],['For Sale','⚿'],['New Builds','✧'],['Short Stay','▣'],['Commercial','▦']
  ];
  const samples = [
    {id:'demo-1',title:'Luxury 2-Bed Penthouse',place:'Kilimani, Nairobi',price:'KES 180K/mo',kind:'For Rent',image:'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85',tag:'PREMIUM',beds:2,baths:2},
    {id:'demo-2',title:'Cliffside Villa',place:'Karen, Nairobi',price:'KES 450K/mo',kind:'For Rent',image:'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=85',tag:'NEW',beds:5,baths:4},
    {id:'demo-3',title:'Modern 2-Bed Apartment',place:'Westlands, Nairobi',price:'KES 85K/mo',kind:'For Rent',image:'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85',tag:'HOT DEAL',beds:2,baths:2},
    {id:'demo-4',title:'Westlands Studio Loft',place:'Westlands, Nairobi',price:'KES 55K/mo',kind:'Short Stay',image:'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85',tag:'FOR RENT',beds:1,baths:1},
    {id:'demo-5',title:'4-Bed Townhouse',place:'Lavington, Nairobi',price:'KES 48M',kind:'For Sale',image:'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=85',tag:'FOR SALE',beds:4,baths:4},
    {id:'demo-6',title:'Runda Family Villa',place:'Runda, Nairobi',price:'KES 350K/mo',kind:'For Rent',image:'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=85',tag:'FEATURED',beds:5,baths:5},
    {id:'demo-7',title:'Riverside New Build',place:'Riverside, Nairobi',price:'KES 140K/mo',kind:'New Builds',image:'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85',tag:'NEW',beds:3,baths:2}
  ];
  const visibleSamples = samples.filter(item=>activeCategory==='All'||item.kind===activeCategory).slice(0,showAll?undefined:5);
  const selectedDemo = samples.find(item=>item.id===detail);
  function toggleSaved(id:string){setSaved(previous=>previous.includes(id)?previous.filter(item=>item!==id):[...previous,id]);}
  function goTo(section:string){
    setActiveSection(section);
    if(section==='Explore'){setActiveCategory('All');document.getElementById('featured')?.scrollIntoView({behavior:'smooth'});}
    else if(section==='Wishlist'){document.getElementById('featured')?.scrollIntoView({behavior:'smooth'});}
    else if(section==='Home'){window.scrollTo({top:0,behavior:'smooth'});}
    else {setDetail(null);}
  }
  function beginSearch(event:React.FormEvent<HTMLFormElement>){setDemoMode(false);void search(event);}
  const displayCards = demoMode ? visibleSamples : results.filter(item => activeCategory==='All'||activeCategory==='For Rent');
  return <main className="market">
    <div className="market-notice"><strong>INTERACTIVE DESIGN PREVIEW</strong> · Example properties and illustrative images · No live inventory, payments, or confirmed bookings</div>
    <section className="market-hero" aria-label="Ride2View search">
      <div className="market-overlay"/>
      <header className="market-header">
        <a href="/" className="market-logo"><span className="market-logo-icon">⌂</span><span>Ride<span className="market-logo-highlight">2</span>View <em>Pro</em><small>PROPERTIES · RIDES · LIFESTYLE</small></span></a>
        <div className="market-header-actions"><span className="market-city">Nairobi, Kenya</span><button type="button" aria-label="Open wishlist" onClick={()=>goTo('Wishlist')}>♡ {saved.length||''}</button><button type="button" aria-label="Open profile" onClick={()=>goTo('Profile')}>♙</button></div>
      </header>
      <div className="market-hero-content"><p className="market-kicker">PROPERTY JOURNEYS, REIMAGINED</p><h1>Find Your Next<br/>Home, Easily.</h1><p>Explore properties, book viewings,<br/>arrange transport and more.</p></div>
      <form className="market-search" onSubmit={beginSearch}><label className="sr-only" htmlFor="market-query">Search homes, rides, shops, services</label><span aria-hidden="true">⌕</span><input id="market-query" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search homes, rides, shops, services..." required/><button type="submit" disabled={loading}>{loading?'Searching…':'Search ↗'}</button></form>
    </section>
    <div className="market-content">
      <div className="service-panels">
        <button className="service-panel service-ride" type="button" onClick={()=>setService('Ride2Go')}><span className="service-chip">🚘 RIDE2GO</span><strong>Ride2Go</strong><small>4 tiers · Instant pickup</small><span className="service-pill">General & Elite</span><span className="service-arrow">↗</span></button>
        <button className="service-panel service-view" type="button" onClick={()=>setService('Ride2View')}><span className="service-chip">🏡 RIDE2VIEW</span><strong>Ride2View</strong><small>Tour homes in style</small><span className="service-pill">Safe & Campus</span><span className="service-arrow">↗</span></button>
      </div>
      {service!=='Ride2View'&&<div className="market-feedback" role="status">Ride2Go selected. <a href="/ride2go">Open the existing Ride2Go service ↗</a></div>}
      <section id="featured" className="market-section">
        <div className="market-section-heading"><h2>Featured Listings</h2><button type="button" onClick={()=>setShowAll(v=>!v)}>{showAll?'Show less':'See all'} →</button></div>
        <div className="market-filterbar" role="group" aria-label="Property type">{categories.map(([name])=><button type="button" className={activeCategory===name?'active':''} onClick={()=>setActiveCategory(name)} key={name}>{name}</button>)}</div>
        {!demoMode&&<div className="market-feedback" role="status">{message} <button type="button" onClick={()=>setDemoMode(true)}>Return to sample preview</button></div>}
        {activeSection==='Wishlist'&&<div className="market-feedback">Showing saved example properties only.</div>}
        {demoMode?<div className="market-grid">{visibleSamples.filter(item=>activeSection!=='Wishlist'||saved.includes(item.id)).map(item=><article className="market-property" key={item.id}><button type="button" className="market-image-button" onClick={()=>setDetail(item.id)} aria-label={'Open '+item.title}><img src={item.image} alt={'Illustrative home image for '+item.title} loading="lazy"/><span className="market-property-tag">{item.tag}</span></button><button type="button" className={'market-heart '+(saved.includes(item.id)?'saved':'')} aria-label={saved.includes(item.id)?'Remove from wishlist':'Save property'} aria-pressed={saved.includes(item.id)} onClick={()=>toggleSaved(item.id)}>{saved.includes(item.id)?'♥':'♡'}</button><button className="market-property-body" type="button" onClick={()=>setDetail(item.id)}><strong>{item.title}</strong><span>📍 {item.place}</span><b>{item.price}</b><small>★ Illustrative listing · {item.beds} beds · {item.baths} baths</small></button></article>)}</div>
        :<div className="market-grid">{displayCards.map((item,index)=><article className="market-property" key={item.id||index}><div className="market-live-image"><span>LISTING FROM SEARCH</span></div><div className="market-property-body"><strong>{item.title||'Property'}</strong><span>{item.location?.city||'Location on request'}</span><b>{typeof item.price==='number'?currency(item.price):'Contact agent'}</b>{account?.role==='customer'&&item.id&&<button type="button" onClick={()=>chooseProperty(item.id!)}>View available slots →</button>}</div></article>)}</div>}
        {demoMode&&visibleSamples.filter(item=>activeSection!=='Wishlist'||saved.includes(item.id)).length===0&&<p className="market-feedback">No matching sample properties. Try another category or save a property first.</p>}
        {!demoMode&&results.length===0&&<p className="market-feedback">No properties returned. Search again or return to the sample preview.</p>}
      </section>
      <section className="market-section"><div className="market-section-heading"><h2>Browse by Type</h2></div><div className="market-category-grid">{[['🏘️','Houses & Apts for Rent','For Rent'],['🔑','Houses & Apts for Sale','For Sale'],['🌍','Land & Plots for Sale','For Sale'],['📅','Short Let Property','Short Stay'],['✨','New Builds','New Builds'],['🏢','Commercial Property','Commercial'],['🎉','Event Centres','Commercial'],['🌲','Land for Rent','For Rent'],['🛒','Shop','Shop']].map(([icon,label,type])=><button key={label} type="button" onClick={()=>{if(type==='Shop'){setService('Shop');return;}setActiveCategory(type);setActiveSection('Explore');document.getElementById('featured')?.scrollIntoView({behavior:'smooth'});}}><span>{icon}</span><strong>{label}</strong><small>{type==='Shop'?'Marketplace coming later':'Explore category'}</small></button>)}</div>{service==='Shop'&&<div className="market-feedback">Shop selected. This storefront is not activated in this preview.</div>}</section>
      <section className="market-section"><div className="market-section-heading"><h2>Suggested for You</h2><button type="button" onClick={()=>{setActiveCategory('All');setShowAll(true);document.getElementById('featured')?.scrollIntoView({behavior:'smooth'});}}>Refresh ↻</button></div><div className="market-grid">{samples.slice(2,7).map(item=><article key={'suggested-'+item.id} className="market-property"><button type="button" className="market-image-button" onClick={()=>setDetail(item.id)}><img loading="lazy" src={item.image} alt={'Illustrative home image for '+item.title}/></button><button type="button" className={'market-heart '+(saved.includes(item.id)?'saved':'')} onClick={()=>toggleSaved(item.id)} aria-label={'Toggle saved status for '+item.title}>{saved.includes(item.id)?'♥':'♡'}</button><button type="button" className="market-property-body" onClick={()=>setDetail(item.id)}><strong>{item.title}</strong><span>📍 {item.place}</span><b>{item.price}</b><small>★ Sample · {item.beds} beds · {item.baths} baths</small></button></article>)}</div></section>
      {selectedProperty&&<section className="market-booking" id="viewing"><h2>Request a property viewing</h2><p role="status">{requestMessage}</p>{account?.role==='customer'&&slots.length>0&&<form className="viewing-form" onSubmit={requestViewing}><label htmlFor="viewing-slot">Available time</label><select id="viewing-slot" value={slotId} onChange={event=>{setSlotId(event.target.value);setRequestKey(crypto.randomUUID());}} required><option value="">Select time</option>{slots.map(slot=><option key={slot.id} value={slot.id}>{new Date(slot.start_at).toLocaleString()}</option>)}</select><label htmlFor="ride-tier">Ride tier</label><select id="ride-tier" value={tier} onChange={event=>{setTier(event.target.value);setRequestKey(crypto.randomUUID());}}><option value="general">General</option><option value="students">Students</option><option value="women">Women-only</option><option value="vip">VIP</option></select><button type="submit" disabled={!slotId||requestBusy}>{requestBusy?'Submitting…':'Request viewing'}</button></form>}</section>}
      {activeSection==='Inbox'&&<div className="market-feedback" role="status">Inbox preview: live messaging has not been connected. No messages have been fabricated.</div>}
      {activeSection==='Profile'&&<div className="market-feedback" role="status">{account?account.name+' · '+account.role:'Sign-in is managed by the Ride2View backend; no preview account is created.'}</div>}
    </div>
    {selectedDemo&&<div className="market-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setDetail(null)}}><section role="dialog" aria-modal="true" aria-label={selectedDemo.title} className="market-modal"><button className="market-modal-close" type="button" onClick={()=>setDetail(null)}>✕ <span className="sr-only">Close</span></button><img src={selectedDemo.image} alt="Illustrative sample property"/><div><span className="market-property-tag">SAMPLE · NOT LIVE</span><h2>{selectedDemo.title}</h2><p>{selectedDemo.place} · {selectedDemo.beds} bedrooms · {selectedDemo.baths} bathrooms</p><strong>{selectedDemo.price}</strong><p>This listing is a visual demonstration. Availability and pricing are not verified. Live bookings require an approved property and authenticated account.</p><button type="button" onClick={()=>{toggleSaved(selectedDemo.id);}}>{saved.includes(selectedDemo.id)?'♥ Saved to wishlist':'♡ Save to wishlist'}</button><button type="button" onClick={()=>setDetail(null)}>Continue exploring</button></div></section></div>}
    <nav className="market-bottom-nav" aria-label="Marketplace navigation">{[['⌂','Home'],['⌕','Explore'],['♡','Wishlist'],['▤','Inbox'],['♙','Profile']].map(([icon,label])=><button type="button" key={label} className={activeSection===label?'active':''} onClick={()=>goTo(label)}><span>{icon}</span><small>{label}</small>{label==='Wishlist'&&saved.length>0&&<i>{saved.length}</i>}</button>)}</nav>
  </main>;
}
