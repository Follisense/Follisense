import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type InteractionAction = 'saved' | 'skipped' | 'clicked' | 'viewed';

export const useProductInteractions = (userId?: string) => {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [interactionBoost, setInteractionBoost] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('product_interactions')
        .select('product_id, action')
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to load interactions:', error);
        return;
      }

      if (data) {
        const saved = new Set<string>();
        const skipped = new Set<string>();
        const boost: Record<string, number> = {};

        data.forEach(row => {
          if (row.action === 'saved') {
            saved.add(row.product_id);
          }
          if (row.action === 'skipped') {
            skipped.add(row.product_id);
          }
          if (row.action === 'clicked' || row.action === 'viewed') {
            boost[row.product_id] = (boost[row.product_id] || 0) + 1;
          }
        });

        setSavedIds(saved);
        setSkippedIds(skipped);
        setInteractionBoost(boost);
      }
    };

    load();
  }, [userId]);

  const recordInteraction = useCallback(
    async (
      productId: string,
      action: InteractionAction,
      triggeredBy?: string,
    ) => {
      if (!userId) return;

      // Optimistic UI update
      if (action === 'saved') {
        setSavedIds(prev => new Set(prev).add(productId));
        setSkippedIds(prev => {
          const s = new Set(prev);
          s.delete(productId);
          return s;
        });
      } else if (action === 'skipped') {
        setSavedIds(prev => {
          const s = new Set(prev);
          s.delete(productId);
          return s;
        });
        setSkippedIds(prev => new Set(prev).add(productId));
      } else if (action === 'clicked' || action === 'viewed') {
        setInteractionBoost(prev => ({
          ...prev,
          [productId]: (prev[productId] || 0) + 1,
        }));
      }

      const { error } = await supabase.from('product_interactions').insert({
        user_id: userId,
        product_id: productId,
        action,
        triggered_by: triggeredBy || null,
      });

      if (error) {
        console.error('Failed to record interaction:', error);
      }
    },
    [userId],
  );

  return { recordInteraction, savedIds, skippedIds, interactionBoost };
};