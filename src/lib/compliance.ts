const BANNED_INGREDIENTS = [
  'minoxidil', 'rogaine',
  'finasteride', 'propecia',
  'ketoconazole', 'nizoral',
  'coal tar',
  'selenium sulfide',
  'pyrithione zinc', // OTC drug active
  'salicylic acid',  // borderline; drug when marketed for a condition
  'steroid', 'hydrocortisone', 'clobetasol',
  'corticosteroid',
];

// Disease / condition names — banned per S3 lexicon.
const BANNED_CONDITIONS = [
  'alopecia', 'androgenetic', 'traction alopecia', 'areata',
  'cicatricial', 'ccca', 'frontal fibrosing',
  'seborrheic dermatitis', 'seborrhoeic dermatitis', 'dermatitis',
  'psoriasis', 'folliculitis', 'tinea', 'ringworm',
  'lichen planopilaris',
];

// Treatment / diagnostic verbs and claim inflation — banned per S3.
const BANNED_PHRASES = [
  'fda-approved', 'fda approved',
  'clinically proven to treat', 'clinically proven to regrow',
  'treats hair loss', 'cures', 'medical-grade', 'medically proven',
  'diagnose', 'prescription',
];

// Everything we screen against, lowercased.
const ALL_BANNED = [
  ...BANNED_INGREDIENTS,
  ...BANNED_CONDITIONS,
  ...BANNED_PHRASES,
];

// Build one big searchable string from a product's text fields.
function productText(p: {
  name?: string;
  brand?: string;
  description?: string;
  benefits?: string;
  recommendationReason?: string;
  tags?: string[];
  concerns?: string[];
}): string {
  return [
    p.name, p.brand, p.description, p.benefits, p.recommendationReason,
    ...(p.tags || []),
    ...(p.concerns || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * Returns true if a product violates the harness (is a medicine, or
 * carries a disease name / treatment claim) and must NOT be
 * recommended or linked for purchase.
 */
export function isNonCompliant(p: Parameters<typeof productText>[0]): boolean {
  const text = productText(p);
  return ALL_BANNED.some(term => text.includes(term));
}

/**
 * Filter a list of products down to only compliant, cosmetic ones.
 * Use at the recommendation boundary so medicines never reach the UI
 * or the Jumia deep-link path.
 */
export function filterCompliant<T extends Parameters<typeof productText>[0]>(
  products: T[]
): T[] {
  return products.filter(p => !isNonCompliant(p));
}

/**
 * Dev helper: returns which banned terms a product matched, so you
 * can see WHY something was filtered. Handy while cleaning the catalog.
 */
export function complianceViolations(
  p: Parameters<typeof productText>[0]
): string[] {
  const text = productText(p);
  return ALL_BANNED.filter(term => text.includes(term));
}