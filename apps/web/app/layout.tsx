import type { Metadata } from 'next';
import './style.css';
export const metadata: Metadata = { title: 'Ride2View', description: 'Discover and arrange property viewings.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
