// src/hooks/usePushNotifications.ts
import { useState, useEffect } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase';
import { supabase } from '@/lib/supabaseClient';
import { useApp } from '@/contexts/AppContext';

// ─── BRANDING ─────────────────────────────────────────────────────────────────
// Drop the new forest-green icon into /public with this exact name.
// Recommended: 192×192 PNG on transparent or cream (#F1EEE5) background.
// BADGE is the small monochrome status-bar mark (Android) — a simple white
// glyph on transparent works best; falls back to ICON if you skip it.
const ICON  = '/follisense-icon-green.png';
const BADGE = '/follisense-badge.png';
const BRAND = 'FolliSense';

export const usePushNotifications = () => {
  const { onboardingData } = useApp();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken]           = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(false);

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[FCM] Foreground message:', payload);
      const { title, body } = payload.notification || {};
      if (title) new Notification(title, { body: body || '', icon: ICON, badge: BADGE });
    });
    return unsubscribe;
  }, []);

  const requestPermission = async () => {
    setIsLoading(true);
    try {
      const fcmToken = await requestNotificationPermission();
      console.log('[Push] FCM Token received:', fcmToken ? fcmToken.slice(0, 30) : 'null');
      if (fcmToken) {
        setToken(fcmToken);
        setPermission('granted');
        await saveTokenToSupabase(fcmToken);
        scheduleAllReminders();
      } else {
        setPermission(Notification.permission);
      }
    } catch (err) {
      console.error('[Push] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save token if permission already granted on mount
  useEffect(() => {
    if (Notification.permission === 'granted') {
      requestNotificationPermission().then(async (fcmToken) => {
        if (fcmToken) {
          console.log('[Push] Auto-saving existing token:', fcmToken.slice(0, 30));
          setToken(fcmToken);
          setPermission('granted');
          await saveTokenToSupabase(fcmToken);
        }
      }).catch(err => console.error('[Push] Auto-save error:', err));
    }
  }, []);

  const saveTokenToSupabase = async (fcmToken: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase.from('push_tokens').upsert({
        user_id:    session.user.id,
        token:      fcmToken,
        platform:   'web',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('[Push] Error saving token:', err);
    }
  };

  const scheduleAllReminders = () => {
    const isMale       = onboardingData.gender === 'man';
    const styles       = onboardingData.protectiveStyles || [];
    const cycleLength  = onboardingData.cycleLength || '3-4 weeks';
    const style        = (styles[0] || 'your style').toLowerCase();

    // Parse cycle length to days
    const cycleDays = (() => {
      const nums = cycleLength.match(/\d+/g);
      if (!nums) return 28;
      if (nums.length >= 2) return Math.round(((parseInt(nums[0]) + parseInt(nums[1])) / 2) * 7);
      return parseInt(nums[0]) * 7;
    })();

    const DAY = 24 * 60 * 60 * 1000;

    // ── 1. Mid-cycle check-in (half cycle) — "we're listening" voice ─────────
    const midCycleDay = Math.floor(cycleDays / 2);
    setTimeout(() => fireNotification(
      `${BRAND} · Check-in`,
      isMale
        ? 'How has your scalp been? A quick check-in keeps your record honest. Takes a minute.'
        : `Halfway through your ${style}. How's your scalp doing under there? Quick check-in, about a minute.`,
      '/home'
    ), midCycleDay * DAY);

    // ── 2. Wash day heads-up (2 days before end of cycle) ───────────────────
    const washDayMs = Math.max((cycleDays - 2) * DAY, 1 * DAY);
    setTimeout(() => fireNotification(
      `${BRAND} · Wash day soon`,
      isMale
        ? 'Wash day is in 2 days. A clean scalp photo that day makes your record stronger.'
        : `Wash day for your ${style} is in 2 days. It's the best day for a clear scalp photo.`,
      '/routine-tracker'
    ), washDayMs);

    // ── 3. Tip every 2 days at ~9am — habits and routine only, no products ──
    const scheduleDailyTip = () => {
      const now       = new Date();
      const next9am   = new Date(now);
      next9am.setHours(9, 0, 0, 0);
      if (next9am <= now) next9am.setDate(next9am.getDate() + 2);
      const msUntil9am = next9am.getTime() - now.getTime();

      setTimeout(() => {
        const tips = [
          'A few minutes of scalp massage before washing boosts circulation. Your scalp will thank you.',
          'Under a style, your scalp still needs you. A light check every few days keeps you ahead of it.',
          "Flaking isn't always dandruff — buildup can look the same. Your check-ins help tell them apart.",
          'Hydration shows up on your scalp too. Water counts as hair care.',
          "A style should never hurt. If it's pulling, loosen it — your edges will thank you.",
          'Same angle, same light, same distance. Consistent photos are what make change visible.',
          'Your scalp is skin. It renews, it sheds, it responds to rest — track it like it matters.',
        ];
        const tip = tips[Math.floor(Math.random() * tips.length)];
        fireNotification(`${BRAND} · Worth knowing`, tip, '/learn');
        scheduleDailyTip(); // reschedule every 2 days
      }, msUntil9am);
    };
    scheduleDailyTip();

    // ── 4. Weekly summary (every Sunday at 10am) ─────────────────────────────
    const scheduleWeeklySummary = () => {
      const now      = new Date();
      const nextSun  = new Date(now);
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
      nextSun.setDate(now.getDate() + daysUntilSunday);
      nextSun.setHours(10, 0, 0, 0);
      const msUntilSunday = nextSun.getTime() - now.getTime();

      setTimeout(() => {
        fireNotification(
          `${BRAND} · Your week`,
          "Your record grew this week. Take a look at where things stand.",
          '/history'
        );
        scheduleWeeklySummary(); // reschedule for next week
      }, msUntilSunday);
    };
    scheduleWeeklySummary();

    console.log('[Push] All reminders scheduled:', {
      midCycleDay,
      washDayDay: cycleDays - 2,
      tip: 'every 2 days at 9am',
      weeklySummary: 'every Sunday 10am',
    });
  };

  return { permission, token, isLoading, requestPermission };
};

// ─── Fire a notification ──────────────────────────────────────────────────────
const fireNotification = (title: string, body: string, url: string) => {
  if (Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    icon:  ICON,
    badge: BADGE,
    tag:   title,
    data:  { url },
  });
  n.onclick = () => {
    window.focus();
    window.location.href = url;
    n.close();
  };
};

// ─── Send test notification (for demo) ───────────────────────────────────────
export const sendTestNotification = (type: 'checkin' | 'washday' | 'tip' | 'summary') => {
  const map = {
    checkin: { title: `${BRAND} · Check-in`,      body: 'How has your scalp been? A quick check-in keeps your record honest.',  url: '/home'            },
    washday: { title: `${BRAND} · Wash day soon`, body: "Wash day is in 2 days. It's the best day for a clear scalp photo.",    url: '/routine-tracker' },
    tip:     { title: `${BRAND} · Worth knowing`, body: 'A few minutes of scalp massage before washing boosts circulation.',    url: '/learn'           },
    summary: { title: `${BRAND} · Your week`,     body: 'Your record grew this week. Take a look at where things stand.',       url: '/history'         },
  };
  const { title, body, url } = map[type];
  fireNotification(title, body, url);
};