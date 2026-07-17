// ─── AFFILIATE LINK UTILITY ───────────────────────────────────────────────────
// Replace YOUR_AFFILIATE_CODE with your actual Jumia KE affiliate ID
// Sign up at: https://affiliate.jumia.co.ke
// Format: https://www.jumia.co.ke/catalog/?q=QUERY&aff=YOURCODE&utm_source=affiliate

const JUMIA_AFFILIATE_CODE = 'YOUR_AFFILIATE_CODE'; // 🔑 replace this
const KILIMALL_AFFILIATE_CODE = 'YOUR_KILIMALL_CODE'; // 🔑 replace this (optional)

/**
 * Builds a Jumia Kenya affiliate search URL for a product query.
 * If the affiliate code is not set, falls back to a plain Jumia search.
 */
export const jumiaLink = (productName: string, brand?: string): string => {
  const query = encodeURIComponent(`${brand ? brand + ' ' : ''}${productName}`);
  const base  = `https://www.jumia.co.ke/catalog/?q=${query}`;
  if (JUMIA_AFFILIATE_CODE && JUMIA_AFFILIATE_CODE !== 'YOUR_AFFILIATE_CODE') {
    return `${base}&aff=${JUMIA_AFFILIATE_CODE}&utm_source=follisense&utm_medium=affiliate`;
  }
  return base;
};

/**
 * Builds a Kilimall Kenya affiliate search URL.
 */
export const kilimallLink = (productName: string): string => {
  const query = encodeURIComponent(productName);
  const base  = `https://www.kilimall.co.ke/search?q=${query}`;
  if (KILIMALL_AFFILIATE_CODE && KILIMALL_AFFILIATE_CODE !== 'YOUR_KILIMALL_CODE') {
    return `${base}&ref=${KILIMALL_AFFILIATE_CODE}`;
  }
  return base;
};

/**
 * Google Shopping fallback — useful for products that may not be on Jumia.
 */
export const googleShoppingLink = (productName: string, brand?: string): string => {
  const query = encodeURIComponent(`${brand ? brand + ' ' : ''}${productName} Kenya`);
  return `https://www.google.com/search?tbm=shop&q=${query}`;
};

/**
 * Opens the best available link for a product:
 * Tries Jumia first. Use googleShoppingLink as fallback if the product is niche.
 */
export const openProductLink = (productName: string, brand?: string, useGoogleFallback = false) => {
  const url = useGoogleFallback
    ? googleShoppingLink(productName, brand)
    : jumiaLink(productName, brand);
  window.open(url, '_blank', 'noopener noreferrer');
};