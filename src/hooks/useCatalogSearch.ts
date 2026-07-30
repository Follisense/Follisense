import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RecommendedProduct } from '@/hooks/useRecommendationEngine';
import { filterCompliant } from '@/lib/compliance';

// results have the identical shape as recommendations.
const mapRow = (p: any): RecommendedProduct => ({
  id: p.id,
  name: p.name,
  brand: p.brand,
  category: p.category,
  concerns: p.concerns || [],
  benefits: p.benefits,
  description: p.description,
  priceKsh: p.price_ksh,
  rating: p.rating,
  tags: p.tags || [],
  usagePhase: p.usage_phase || [],
  strengthLevel: p.strength_level,
  badge: p.badge,
  badgeColor: p.badge_color,
  imageUrl: p.image_url,
  jumiaUrl: p.jumia_url,
  amazonUrl: p.amazon_url,
  recommendationReason: 'Matched to your search',
  recommendationPriority: 1,
  triggeredBy: 'search',
});

// PostgREST parses .or() as a comma-separated list, so a comma in the user's
// text splits the filter and the request 400s. Brackets do the same, and
// % and _ are ILIKE wildcards. Strip them rather than escape: for a search
// box, dropping the character gives better results than matching it literally.
const sanitise = (q: string) => q.replace(/[,()%_*\\]/g, ' ').replace(/\s+/g, ' ').trim();

export const useCatalogSearch = (query: string, skippedIds: Set<string> = new Set()) => {
  const [results, setResults] = useState<RecommendedProduct[]>([]);
  const [searching, setSearching] = useState(false);

  // Sets are compared by reference, so a new Set with the same size would not
  // retrigger the effect. Serialising the ids makes the dependency honest.
  const skippedKey = Array.from(skippedIds).sort().join(',');

  useEffect(() => {
    const q = sanitise(query);

    // Empty query → no search running; page shows recommendations instead.
    // A query that was only punctuation lands here too, which is correct.
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    // Debounce so we don't hit Supabase on every keystroke.
    const timer = setTimeout(async () => {
      // Search name, brand, and description with case-insensitive match.
      const like = `%${q}%`;

      const { data, error } = await supabase
        .from('product_catalog')
        .select('*')
        .or(`name.ilike.${like},brand.ilike.${like},description.ilike.${like},benefits.ilike.${like},category.ilike.${like}`)
        .order('rating', { ascending: false })
        .limit(50);

      if (cancelled) return;

      if (error) {
        console.error('[CatalogSearch] error:', error);
        setResults([]);
        setSearching(false);
        return;
      }

      const mapped = filterCompliant((data || []).map(mapRow))
        .filter(p => !skippedIds.has(p.id));

      setResults(mapped);
      setSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, skippedKey]);

  return { results, searching };
};