import type { Metadata } from 'next';
import './style.css';
import ServiceNav from './components/ServiceNav';
export const metadata: Metadata = { title: 'Ride2View', description: 'Discover and arrange property viewings.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="app-nav"><ServiceNav /></div>{children}</body></html>;
}
