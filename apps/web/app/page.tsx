'use client';
import { useEffect, useState } from 'react';
type Account = { name: string; role: string };
type Recommendation = { id?: string; title?: string; price?: number; location?: { city?: string } };
export default function Home() {
  const [account, setAccount] = useState<Account | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Recommendation[]>([]);
  const [message, setMessage] = useState('Search approved property listings.');
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).then(setAccount).catch(() => {}); }, []);
  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true);
    try {
      const response = await fetch('/api/search', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: query }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search unavailable');
      setResults(data.recommendations || []); setMessage(data.summary || 'Search completed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Search failed'); }
    finally { setLoading(false); }
  }
  return <main>
    <header><strong>Ride2View</strong><span>{account ? `${account.name} · ${account.role}` : 'Explore properties'}</span></header>
    <section className="hero"><p>DISCOVER · VERIFY · VIEW</p><h1>Find your next place.</h1><p>One connected journey from property discovery to viewing.</p>
      <form onSubmit={search}><label htmlFor="property-search">What are you looking for?</label><div className="search"><input id="property-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Two-bedroom apartment in Kilimani" required /><button disabled={loading}>{loading ? 'Searching…' : 'Search'}</button></div></form>
      <p role="status" aria-live="polite">{message}</p>
    </section>
    <section><h2>Property matches</h2>{results.length ? <ul>{results.map((item, index) => <li key={item.id || index}><strong>{item.title || 'Property'}</strong><span>{item.location?.city || 'Location on request'} · {typeof item.price === 'number' ? `KES ${item.price.toLocaleString()}` : 'Contact agent'}</span></li>)}</ul> : <p>Matching properties will appear here after a search.</p>}</section>
    <footer>V11 frontend foundation · Existing backend remains authoritative for accounts, bookings and payments.</footer>
  </main>;
}
