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

      try {
        let query = supabase
          .from('product_catalog')
          .select('*')
          .order('rating', { ascending: false })
          .limit(60);

        // Narrow by concerns if the user has any
        if (topConcerns.length > 0) {
          query = query.overlaps('concerns', topConcerns);
          setSource('onboarding');
        } else {
          setSource('top_rated');
        }

        const { data, error: dbError } = await query;
        if (dbError) throw dbError;

        const products: RecommendedProduct[] = (data || [])
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

        setRecommendations(products);
        setTriggeredRules(topConcerns);
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