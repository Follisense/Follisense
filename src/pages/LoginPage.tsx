import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import { identifyOnLogin, trackLoggedIn } from '@/lib/events';
import wordmark from '@/assets/wordmark-cream.webp';

const mont = "'Montserrat', sans-serif";

const G = {
  shell:       '#0A0908',
  bgTop:       '#253B2D',
  bgMid:       '#1B2E22',
  bgBottom:    '#12211A',
  ink:         '#F5EFE6',
  sub:         'rgba(245,239,230,0.55)',
  muted:       'rgba(245,239,230,0.34)',
  sage:        '#A9C7B4',
  gold:        '#C9A96A',
  line:        'rgba(201,169,106,0.35)',
  cardBg:      'rgba(255,255,255,0.05)',
  cardBorder:  'rgba(245,239,230,0.10)',
  inputBg:     'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(245,239,230,0.13)',
  cream:       '#EDE0C4',
  creamDeep:   '#E4D2AC',
  onCream:     '#1C2B22',
  red:         '#ffb3a7',
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { setUserName, setOnboardingData, onboardingData, onboardingComplete, setOnboardingComplete } = useApp();
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');
  const SHOW_APPLE = false;
  const REQUIRE_OTP = false;
  const canSubmit = email.trim().length > 0 && password.length >= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isLoading) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, gender')
        .eq('id', data.user.id)
        .single();

      // Identify before any event, so this login and everything after it belongs
      // to the person rather than to an anonymous browser.
      identifyOnLogin(data.user.id);
      trackLoggedIn('email');

          // Identify before any event, so this login and everything after it belongs
      // to the person rather than to an anonymous browser.
      identifyOnLogin(data.user.id);
      trackLoggedIn('email');
      // Identify before any event, so this login and everything after it belongs
      // to the person rather than to an anonymous browser.
      identifyOnLogin(data.user.id);
      trackLoggedIn('email');

     const name = profile?.first_name || email.split('@')[0];
      setUserName(name);
      if (profile?.gender) {
        setOnboardingData({ ...onboardingData, gender: profile.gender });
      }

      const { data: consumerProfile } = await supabase
        .from('consumer_profiles')
        .select('user_id, hair_texture')
        .eq('user_id', data.user.id)
        .single();

      const hasCompletedOnboarding = onboardingComplete || !!consumerProfile?.hair_texture;
      if (hasCompletedOnboarding && !onboardingComplete) setOnboardingComplete(true);

      const redirectTo = hasCompletedOnboarding ? '/home' : '/onboarding';

      if (REQUIRE_OTP) {
        await supabase.auth.signOut();
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: false },
        });
        if (otpError) throw otpError;
        navigate('/verify-otp', { state: { email: email.trim(), redirectTo }, replace: true });
        return;
      }
      navigate(redirectTo, { replace: true });

    } catch (err: any) {
      console.error('Login error:', err);
      if (err?.message?.toLowerCase().includes('invalid')) {
        setErrorMsg('Incorrect email or password. Please try again.');
      } else {
        setErrorMsg(err?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (oauthLoading) return;
    setOauthLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Google login error:', err);
      setErrorMsg(err?.message || 'Could not start Google sign-in. Please try again.');
      setOauthLoading(false);
    }
  };

  const inputStyle = (hasError = false): React.CSSProperties => ({
    width: '100%',
    height: 52,
    padding: '0 16px 0 46px',
    borderRadius: 14,
    border: `1.5px solid ${hasError ? 'rgba(220,80,60,0.5)' : G.inputBorder}`,
    background: G.inputBg,
    fontFamily: mont,
    fontSize: 14,
    color: G.ink,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  });

  const inputIconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 15,
    top: '50%',
    transform: 'translateY(-50%)',
    color: G.muted,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <div
      className="fs-auth-shell"
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: `radial-gradient(ellipse 90% 50% at 50% -8%, rgba(201,169,106,0.10) 0%, transparent 55%), linear-gradient(170deg, ${G.bgTop} 0%, ${G.bgMid} 48%, ${G.bgBottom} 100%)`,
        fontFamily: mont,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
        input::placeholder { color: rgba(245,239,230,0.30); font-family: 'Montserrat', sans-serif; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #1B2E22 inset !important; -webkit-text-fill-color: #F5EFE6 !important; }
        html, body, #root { background: ${G.bgMid} !important; }

        .fs-auth-shell { display: flex; flex-direction: column; }
        .fs-auth-brand { display: none; }
        .fs-auth-panel { flex: 1; display: flex; align-items: center; justify-content: center; padding: 36px 22px; min-height: 100dvh; box-sizing: border-box; }
        .fs-auth-card { width: 100%; max-width: 420px; }

        /* Laptop and up: split into brand column + form column */
        @media (min-width: 900px) {
          .fs-auth-shell { flex-direction: row; }
          .fs-auth-brand {
            display: flex; flex: 1; flex-direction: column;
            align-items: center; justify-content: center;
            padding: 40px; position: relative; overflow: hidden;
            border-right: 1px solid rgba(201,169,106,0.18);
          }
          .fs-auth-panel { flex: 1; min-height: 100dvh; }
          .fs-auth-card { max-width: 440px; }
          .fs-auth-mobilebrand { display: none; }
        }
      `}</style>

      {/* Decorative gold curves — full page, subtle */}
      <svg viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="1"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12, color: G.gold, pointerEvents: 'none' }}>
        <path d="M-30 90 C 190 260, 120 500, -20 680" />
        <path d="M-50 60 C 210 240, 140 520, -10 730" />
        <path d="M1460 480 C 1240 640, 1320 800, 1470 880" />
        <path d="M1480 440 C 1230 620, 1310 840, 1450 950" />
      </svg>

      {/* Brand column — laptop only */}
      <div className="fs-auth-brand">
        <img src={wordmark} alt="FolliSense" style={{ width: 260, marginBottom: 20 }} />
        <p style={{ fontFamily: mont, fontSize: 15, color: G.sage, letterSpacing: '0.08em', textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
          Understand. Nurture. Grow.
        </p>
        <p style={{ fontFamily: mont, fontSize: 13.5, color: G.muted, textAlign: 'center', maxWidth: 320, marginTop: 14, lineHeight: 1.7 }}>
          Your scalp has a story. FolliSense helps you read it, one check-in at a time.
        </p>
      </div>

      {/* Form column */}
      <div className="fs-auth-panel">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="fs-auth-card">

          {/* Wordmark + tagline — hidden on laptop (shown in brand column instead) */}
          <div className="fs-auth-mobilebrand" style={{ textAlign: 'center', marginBottom: 26 }}>
            <img src={wordmark} alt="FolliSense" style={{ width: 210, display: 'block', margin: '0 auto' }} />
            <p style={{ fontFamily: mont, fontSize: 13, color: G.sage, letterSpacing: '0.06em', margin: '12px 0 0' }}>
              Understand. Nurture. Grow.
            </p>
            <div style={{ height: 1, background: G.line, margin: '18px auto 0', maxWidth: 230 }} />
            <p style={{ fontFamily: mont, fontSize: 12.5, color: G.muted, margin: '14px 0 0' }}>
              Your scalp health journey continues
            </p>
          </div>

          <div style={{ background: G.cardBg, border: `1px solid ${G.cardBorder}`, borderRadius: 24, padding: '28px 24px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 20px 50px rgba(0,0,0,0.30)' }}>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: mont, fontSize: 20, fontWeight: 600, color: G.ink, margin: 0, letterSpacing: '0.01em' }}>Welcome back</h2>
              <p style={{ fontFamily: mont, fontSize: 12.5, color: G.sub, margin: '6px 0 0' }}>Sign in to continue your journey</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14, position: 'relative' }}>
                <span style={inputIconStyle}><Mail size={16} /></span>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                  placeholder="Email address"
                  disabled={isLoading}
                  style={inputStyle()}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 8, position: 'relative' }}>
                <span style={inputIconStyle}><Lock size={16} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrorMsg(''); }}
                  placeholder="Password"
                  disabled={isLoading}
                  style={{ ...inputStyle(!!errorMsg), paddingRight: 48 }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: G.sub, display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                <button type="button" onClick={() => navigate('/forgot-password')}
                  style={{ fontFamily: mont, fontSize: 12, color: G.sage, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>
                  Forgot password?
                </button>
              </div>

              {errorMsg && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  style={{ fontFamily: mont, fontSize: 12, color: G.red, margin: '8px 0 0', lineHeight: 1.5 }}>
                  {errorMsg}
                </motion.p>
              )}

              <button type="submit" disabled={!canSubmit || isLoading}
                style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', background: canSubmit && !isLoading ? `linear-gradient(135deg, ${G.cream} 0%, ${G.creamDeep} 100%)` : 'rgba(255,255,255,0.06)', fontFamily: mont, fontWeight: 700, fontSize: 14.5, color: canSubmit && !isLoading ? G.onCream : G.muted, cursor: canSubmit && !isLoading ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                {isLoading ? 'Logging in…' : 'Log in'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(245,239,230,0.09)' }} />
              <span style={{ fontFamily: mont, fontSize: 12, color: G.muted }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(245,239,230,0.09)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleGoogleLogin} disabled={oauthLoading}
                style={{ width: '100%', height: 48, borderRadius: 14, border: `1px solid ${G.inputBorder}`, background: G.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: oauthLoading ? 'wait' : 'pointer', fontFamily: mont, fontSize: 13, fontWeight: 500, color: G.ink, transition: 'all 0.15s', opacity: oauthLoading ? 0.6 : 1 }}>
                <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {oauthLoading ? 'Opening Google…' : 'Continue with Google'}
              </button>

              {SHOW_APPLE && (
                <button onClick={() => toast({ title: 'Coming soon' })}
                  style={{ width: '100%', height: 48, borderRadius: 14, border: `1px solid ${G.inputBorder}`, background: G.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', fontFamily: mont, fontSize: 13, fontWeight: 500, color: G.ink, transition: 'all 0.15s' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill={G.ink}><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Continue with Apple
                </button>
              )}
            </div>

            <p style={{ fontFamily: mont, fontSize: 13, color: G.sub, margin: '18px 0 0', textAlign: 'center' }}>
              New to FolliSense?{' '}
              <button onClick={() => navigate('/signup')} style={{ fontFamily: mont, color: G.ink, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                Sign up
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;