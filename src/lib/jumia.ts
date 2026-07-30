// Jumia Kenya deep-linking.
// Two modes:
//   1. jumiaSearchUrl()
//      Sends the user to Jumia's search results for the product.
//   2. jumiaProductUrl()  -for thhe affiliate feed, store the
//      exact product URL on the catalog row and this returns it,
//      appending your affiliate tracking tag.


const JUMIA_BASE = 'https://www.jumia.co.ke';

const AFFILIATE_TAG = import.meta.env.VITE_JUMIA_AFFILIATE_TAG || '';

// Append the affiliate tag to any Jumia URL
function withAffiliateTag(url: string): string {
  if (!AFFILIATE_TAG) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}utm_source=follisense&utm_medium=affiliate&aff=${encodeURIComponent(AFFILIATE_TAG)}`;
}

/**
 * Build a Jumia Kenya SEARCH deep link from a product name + brand.
 */
export function jumiaSearchUrl(name: string, brand?: string): string {
  const query = [brand, name].filter(Boolean).join(' ').trim();
  const url = `${JUMIA_BASE}/catalog/?q=${encodeURIComponent(query)}`;
  return withAffiliateTag(url);
}

/**
 * Returns the best available Jumia link for a product:
 *   - exact product URL if the catalog row has one (from affiliate feed)
 *   - otherwise a search deep link built from name + brand
 * Always carries your affiliate tag when one is configured.
 */
export function jumiaLinkFor(product: {
  name: string;
  brand?: string;
  jumiaUrl?: string;
}): string {
  if (product.jumiaUrl && product.jumiaUrl.trim()) {
    return withAffiliateTag(product.jumiaUrl.trim());
  }
  return jumiaSearchUrl(product.name, product.brand);
}