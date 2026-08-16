import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type InteractionAction = 'saved' | 'skipped' | 'clicked' | 'viewed';

export const useProductInteractions = (userId?: string) => {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [interactionBoost, setInteractionBoost] = useState<Record<string, number>>({});
  const [lastError, setLastError] = useState<string | null>(null);

  // Mirrors of the three pieces of state, so an optimistic update can be
  // snapshotted and restored without reading stale values out of a closure.
  const savedRef = useRef<Set<string>>(new Set());
  const skippedRef = useRef<Set<string>>(new Set());
  const boostRef = useRef<Record<string, number>>({});

  const applySaved = (next: Set<string>) => { savedRef.current = next; setSavedIds(next); };
  const applySkipped = (next: Set<string>) => { skippedRef.current = next; setSkippedIds(next); };
  const applyBoost = (next: Record<string, number>) => { boostRef.current = next; setInteractionBoost(next); };

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

        applySaved(saved);
        applySkipped(skipped);
        applyBoost(boost);
      }
    };

    load();
  }, [userId]);

  // Lets a screen that deletes rows directly (WishlistPage) tell the hook,
  // so a bookmark icon elsewhere does not stay filled for an unsaved product.
  const markUnsaved = useCallback((productId: string) => {
    const next = new Set(savedRef.current);
    next.delete(productId);
    applySaved(next);
  }, []);

  const recordInteraction = useCallback(
    async (
      productId: string,
      action: InteractionAction,
      triggeredBy?: string,
    ): Promise<boolean> => {
      if (!userId) return false;

      setLastError(null);

      // Snapshot before the optimistic update so a failed insert can be undone.
      const prevSaved = savedRef.current;
      const prevSkipped = skippedRef.current;
      const prevBoost = boostRef.current;

      if (action === 'saved') {
        const nextSaved = new Set(prevSaved);
        nextSaved.add(productId);
        const nextSkipped = new Set(prevSkipped);
        nextSkipped.delete(productId);
        applySaved(nextSaved);
        applySkipped(nextSkipped);
      } else if (action === 'skipped') {
        const nextSaved = new Set(prevSaved);
        nextSaved.delete(productId);
        const nextSkipped = new Set(prevSkipped);
        nextSkipped.add(productId);
        applySaved(nextSaved);
        applySkipped(nextSkipped);
      } else if (action === 'clicked' || action === 'viewed') {
        applyBoost({
          ...prevBoost,
          [productId]: (prevBoost[productId] || 0) + 1,
        });
      }

      const { error } = await supabase.from('product_interactions').insert({
        user_id: userId,
        product_id: productId,
        action,
        triggered_by: triggeredBy || null,
      });

      if (error) {
        console.error('Failed to record interaction:', error);

        // Put the UI back where it was. Without this a failed save leaves the
        // bookmark filled and the user believing it worked.
        applySaved(prevSaved);
        applySkipped(prevSkipped);
        applyBoost(prevBoost);

        setLastError(
          action === 'saved'
            ? 'That product could not be saved. Check your connection and try again.'
            : 'That did not go through. Check your connection and try again.',
        );
        return false;
      }

      return true;
    },
    [userId],
  );

  const clearError = useCallback(() => setLastError(null), []);

  return {
    recordInteraction,
    savedIds,
    skippedIds,
    interactionBoost,
    markUnsaved,
    lastError,
    clearError,
  };
};