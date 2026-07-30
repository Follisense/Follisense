import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface RecommendedProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  priceKsh: number;
  rating: number;
  badge: string;
  badgeColor: string;
  imageUrl: string;
  jumiaUrl: string;
  amazonUrl: string;
  benefits: string;
  description: string;
  concerns: string[];
  tags: string[];
  usagePhase: string[];
  strengthLevel: string;
  recommendationReason: string;
  recommendationPriority: number;
  triggeredBy: string;
}

// Onboarding stores the goal chip text the user tapped ("Grow my edges").
// product_catalog tags products with short concern words ("Growth"). Without a
// translation between the two, overlaps() matches nothing and the shop is empty
// for every user who completes onboarding.
//
// The mapped terms are ADDED to the user's own wording rather than replacing it,
// so this keeps working whichever vocabulary the catalogue actually uses.
const CONCERN_MAP: Record<string, string[]> = {
  // Female goal chips
  'grow my edges':        ['Growth', 'Thinning'],
  'less breakage':        ['Breakage'],
  'less shedding':        ['Breakage', 'Thinning'],
  'calm itch':            ['Itching', 'Flaking'],
  'length':               ['Growth', 'Breakage'],
  'just staying on top':  [],
  // Male concern options
  'hairline recession':        ['Thinning', 'Growth'],
  'thinning at the crown':     ['Thinning', 'Growth'],
  'razor bumps or ingrowns':   ['Irritation', 'Itching'],
  'itching or flaking':        ['Itching', 'Flaking'],
  'scalp irritation':          ['Itching', 'Flaking'],
  'i just want to stay on top of things': [],
  'not sure':                  [],
};

const expandConcerns = (raw: string[]): string[] => {
  const out = new Set<string>();
  raw.forEach(c => {
    const key = c.trim().toLowerCase();
    if (key in CONCERN_MAP) {
      CONCERN_MAP[key].forEach(m => out.add(m));
      // A chip that maps to an empty array means "no strong preference",
      // so we deliberately do not add the raw text either.
      if (CONCERN_MAP[key].length === 0) return;
    }
    out.add(c.trim());
  });
  return Array.from(out);
};

export const useRecommendationEngine = (
  userId?: string,
  topConcerns: string[] = [],
  hairTexture: string = '',
  budget: string = 'medium',
  skippedIds: Set<string> = new Set(),
  interactionBoost: Record<string, number> = {},
  routineLastUpdated?: number,
) => {
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeredRules, setTriggeredRules] = useState<string[]>([]);
  const [source, setSource] = useState<'routine' | 'onboarding' | 'top_rated'>('top_rated');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const baseSelect = () => supabase
        .from('product_catalog')
        .select('*')
        .order('rating', { ascending: false })
        .limit(60);

      const map = (rows: any[]): RecommendedProduct[] => rows
        .filter(p => !skippedIds.has(p.id))
        .map(p => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          priceKsh: p.price_ksh,
          rating: p.rating ?? 0,
          badge: p.badge || '',
          badgeColor: p.badge_color || '#D4A866',
          imageUrl: p.image_url || '',
          jumiaUrl: p.jumia_url || '',
          amazonUrl: p.amazon_url || '',
          benefits: p.benefits || '',
          description: p.description || '',
          concerns: p.concerns || [],
          tags: p.tags || [],
          usagePhase: p.usage_phase || [],
          strengthLevel: p.strength_level || '',
          recommendationReason:
            p.recommendation_reason || 'Highly rated for natural hair.',
          recommendationPriority:
            (interactionBoost[p.id] || 0) + (p.rating ?? 0),
          triggeredBy: topConcerns[0] || 'top_rated',
        }))
        .sort((a, b) => b.recommendationPriority - a.recommendationPriority);

      try {
        const expanded = expandConcerns(topConcerns);

        // Personalised attempt first
        if (expanded.length > 0) {
          const { data, error: dbError } = await baseSelect().overlaps('concerns', expanded);
          if (dbError) throw dbError;

          const products = map(data || []);
          if (products.length > 0) {
            setRecommendations(products);
            setTriggeredRules(topConcerns);
            setSource('onboarding');
            return;
          }
          // Fell through: the user's concerns matched nothing in the catalogue.
          // An empty shop is worse than an unpersonalised one, so drop through
          // to top-rated rather than showing nothing.
          console.warn('[Recommendations] no catalogue match for concerns:', expanded);
        }

        const { data, error: dbError } = await baseSelect();
        if (dbError) throw dbError;

        setRecommendations(map(data || []));
        setTriggeredRules([]);
        setSource('top_rated');
      } catch (err: any) {
        console.error('Recommendation engine error:', err);
        setError('Unable to load recommendations. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, routineLastUpdated, JSON.stringify(topConcerns), hairTexture]);

  return { recommendations, loading, error, triggeredRules, source };
};