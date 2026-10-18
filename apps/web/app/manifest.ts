import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ride2View',
    short_name: 'Ride2View',
    description: 'Property discovery and viewing journeys',
    start_url: '/',
    display: 'standalone',
    background_color: '#101615',
    theme_color: '#c4f000',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
