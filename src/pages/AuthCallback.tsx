// AuthCallback.tsx
// Landing page for OAuth redirects (Google, and Apple later).
// Supabase redirects here after a successful OAuth sign-in. This page:
//   1. Waits for the session to be established
//   2. Ensures a `profiles` row exists (Google users skip your signup flow)
//   3. Runs the same onboarding check as LoginPage
//   4. Routes to /home or /onboarding
//
// Register the route:  <Route path="/auth/callback" element={<AuthCallback />} />

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUserName, setOnboardingData, onboardingData, onboardingComplete, setOnboardingComplete } = useApp();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const finishLogin = async (userId: string, email: string | undefined, metadata: any) => {
      try {
        // 1. Fetch profile,may not exist for first-time Google users
        let { data: profile } = await supabase
          .from('profiles')
          .select('first_name, gender')
          .eq('id', userId)
          .single();

        // 2. First-time OAuth user: create a profile row from Google metadata
        if (!profile) {
          const googleName: string | undefined =
            metadata?.full_name || metadata?.name;
          const firstName =
            googleName?.split(' ')[0] || email?.split('@')[0] || 'there';

          // NOTE: adjust columns to match your profiles schema.
          // If you have a DB trigger that auto-creates profiles on signup,
          // this upsert is a harmless no-op safety net.
          await supabase
         .from('profiles')
         .upsert({ id: userId, first_name: firstName, role: 'consumer' }, { onConflict: 'id' });
          profile = { first_name: firstName, gender: null };
        }

        const name = profile?.first_name || email?.split('@')[0] || 'there';
        setUserName(name);
        if (profile?.gender) {
          setOnboardingData({ ...onboardingData, gender: profile.gender });
        }

        // 3. Onboarding check,same logic as LoginPage
        const { data: consumerProfile } = await supabase
          .from('consumer_profiles')
          .select('user_id, hair_texture')
          .eq('user_id', userId)
          .single();

        const hasCompletedOnboarding =
          onboardingComplete || !!consumerProfile?.hair_texture;
        if (hasCompletedOnboarding && !onboardingComplete) setOnboardingComplete(true);

        navigate(hasCompletedOnboarding ? '/home' : '/onboarding', { replace: true });
      } catch (err) {
        console.error('AuthCallback error:', err);
        navigate('/login', { replace: true });
      }
    };

    // The session may not be ready the instant this page mounts —
    // supabase-js parses the redirect params asynchronously.
    // Check for an existing session first, otherwise wait for SIGNED_IN.
    let unsub: (() => void) | undefined;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        finishLogin(session.user.id, session.user.email, session.user.user_metadata);
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (event === 'SIGNED_IN' && newSession?.user) {
          unsub?.();
          finishLogin(newSession.user.id, newSession.user.email, newSession.user.user_metadata);
        }
      });
      unsub = () => listener.subscription.unsubscribe();

      // Safety timeout: if nothing arrives in 8s, bail back to login
      setTimeout(async () => {
        const { data: { session: retry } } = await supabase.auth.getSession();
        if (!retry) {
          unsub?.();
          navigate('/login', { replace: true });
        }
      }, 8000);
    })();

    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0A0908',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <img src="/follisense-icon.png" alt="" style={{ width: 40, height: 40, opacity: 0.9 }} />
      <p style={{ color: 'rgba(245,239,230,0.5)', fontSize: 13, margin: 0 }}>
        Signing you in…
      </p>
    </div>
  );
};

export default AuthCallback;