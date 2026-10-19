import Link from 'next/link';
const items = [{href:'/',label:'Ride2View'},{href:'/ride2go',label:'Ride2Go'},{href:'/rideplate',label:'Ride Plate'},{href:'/deliveries',label:'Deliveries'},{href:'/customer',label:'Profile'}];
export default function ServiceNav(){return <nav className="service-nav" aria-label="Ride2View services">{items.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>}
