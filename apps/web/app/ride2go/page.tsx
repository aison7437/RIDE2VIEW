'use client';
import {useEffect,useState} from 'react';
type Trip = {id?:string;status?:string;version?:number;plan?:{pickup?:string;destination?:string;tier?:string;scheduledAt?:string};quote?:{amountKES?:number}};
export default function Ride2Go(){
 const [trips,setTrips]=useState<Trip[]>([]),[state,setState]=useState('loading'),[error,setError]=useState('');
 useEffect(()=>{let alive=true;fetch('/api/ride2go/trips',{credentials:'same-origin',cache:'no-store'}).then(async r=>{if(r.status===401){if(alive)setState('signed-out');return;}if(!r.ok)throw Error('Ride2Go API is not available. Connect the backend to manage trips.');const data=await r.json();if(alive){setTrips(Array.isArray(data.trips)?data.trips:[]);setState('ready');}}).catch(e=>{if(alive){setError(e instanceof Error?e.message:'Unable to load trips');setState('error');}});return()=>{alive=false}},[]);
 return <main><section className="hero"><p>RIDE2GO · CITY MOBILITY</p><h1>Your ride, your way.</h1><p>Request a standalone taxi trip with reviewed pricing and verified driver assignment.</p><p>Fare quotes require an operational route review. No live GPS, instant fare or confirmed driver is claimed here.</p></section>
 <section><h2>Book a Ride2Go trip</h2><p>Trip requests and fare acceptance are currently available through the existing authenticated Ride2View customer workspace. This new Next.js experience is being connected in stages; it will not submit an unverified or incomplete booking.</p><p role="status">{state==='signed-out'?'Sign in through the existing Ride2View account interface to manage trips.':state==='error'?error:'Trip history below reflects the backend when connected.'}</p></section>
 <section><h2>Your Ride2Go trips</h2>{state==='loading'?<p>Checking your trips…</p>:trips.length?<ul>{trips.map((trip,index)=><li key={trip.id||index}><strong>{trip.plan?.pickup||'Pickup'} → {trip.plan?.destination||'Destination'}</strong><span>{trip.status||'Status unavailable'} · {trip.plan?.tier||'General'}</span></li>)}</ul>:<p>{state==='ready'?'No trips recorded yet.':'Trip history is not available yet.'}</p>}</section>
 </main>;
}
