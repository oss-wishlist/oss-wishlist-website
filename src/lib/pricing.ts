// Pricing utility - uses service content collections as single source of truth
// Import and query services collection when needed

export type ProjectSize = 'small' | 'medium' | 'large';

// Helper to get price from a service's pricing object
export function getPriceForService(
  serviceKey: string, 
  size: ProjectSize,
  servicesCollection: Array<{ slug?: string; data: { title: string; pricing?: { small?: number | null; medium?: number | null; large?: number | null } } }>
): number | null {
  // Match by title OR slug to handle issue bodies that store service IDs/slugs
  const service = servicesCollection.find(
    (s) => s.data.title === serviceKey || s.slug === serviceKey
  );
  if (!service?.data.pricing) return null;
  
  const value = service.data.pricing[size];
  return typeof value === 'number' ? value : null;
}

export function formatPrice(value: number | null, includeUSD: boolean = true): string {
  if (value === null) return 'Varies';
  // USD formatting
  const formattedValue = `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return includeUSD ? `${formattedValue} USD` : formattedValue;
}
