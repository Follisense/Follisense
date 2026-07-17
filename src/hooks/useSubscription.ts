import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const FREE_CHAT_LIMIT = 5;

function getCurrentKey(userId?: string): string {
  const d = new Date();
  // Scope key to user so a new account starts fresh
  const scope = userId ?? 'anon';
  return `folli_chats_${scope}_${d.getFullYear()}_${d.getMonth()}`;
}

function purgeStaleKeys(userId?: string): void {
  try {
    const keep = getCurrentKey(userId);
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k !== keep && k.startsWith('folli_chats_')) {
        toDelete.push(k);
      }
    }
    toDelete.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('purgeStaleKeys error', e);
  }
}

function readCount(userId?: string): number {
  try {
    const n = parseInt(localStorage.getItem(getCurrentKey(userId)) ?? '0', 10);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  } catch {
    return 0;
  }
}

interface UseSubscriptionOptions {
  authLoading?: boolean; // pass true while your auth context is still resolving
}

export const useSubscription = (
  userId: string | undefined,
  { authLoading = false }: UseSubscriptionOptions = {}
) => {
  const [isPro, setIsPro] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [subLoading, setSubLoading] = useState(true);

  // Re-read count whenever userId changes (new login = fresh key)
  useEffect(() => {
    setChatCount(readCount(userId));
    purgeStaleKeys(userId);
  }, [userId]);

  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve before checking sub

    if (!userId) {
      // Unauthenticated user — no subscription, use anon localStorage count
      setIsPro(false);
      setSubLoading(false);
      return;
    }

    let cancelled = false;
    setSubLoading(true);

    async function checkSub() {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('status, expires_at')
          .eq('user_id', userId)
          .maybeSingle();

        if (cancelled) return;

        if (error && error.code !== 'PGRST116') {
          console.warn('[useSubscription] error:', error.message);
        }

        const active =
          data?.status === 'active' &&
          !!data?.expires_at &&
          new Date(data.expires_at) > new Date();

        setIsPro(!!active);
      } catch (err) {
        console.warn('[useSubscription] network error:', err);
        setIsPro(false);
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    }

    checkSub();
    return () => { cancelled = true; };
  }, [userId, authLoading]);

  // Only block if we're sure: auth resolved, sub check done, not pro, limit hit
  const loading = authLoading || subLoading;
  const chatLimitReached = !loading && !isPro && chatCount >= FREE_CHAT_LIMIT;
  const chatsRemaining = isPro
    ? Infinity
    : Math.max(0, FREE_CHAT_LIMIT - chatCount);

  const incrementChatCount = () => {
    if (isPro) return;
    const next = chatCount + 1;
    setChatCount(next);
    try {
      localStorage.setItem(getCurrentKey(userId), String(next));
    } catch (e) {
      console.warn('incrementChatCount storage error', e);
    }
  };

  return {
    isPro,
    loading,
    chatLimitReached,
    chatsRemaining,
    incrementChatCount,
    FREE_CHAT_LIMIT,
  };
};