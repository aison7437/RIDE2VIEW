export type PropertySummary = {
  id: string;
  title: string;
  location: string;
  monthlyRent?: number;
  currency?: string;
};

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function fetchProperties(signal?: AbortSignal): Promise<PropertySummary[]> {
  if (!baseUrl) {
    throw new Error('API endpoint not configured. Set EXPO_PUBLIC_API_BASE_URL to the audited Ride2View API host.');
  }
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/properties`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Property lookup failed (${response.status})`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) {
    throw new Error('Unexpected API response; reconcile mobile client with the OpenAPI contract.');
  }
  return payload.data as PropertySummary[];
}
