import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Shield, Mail, Lock, User } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import { trackSignedUp } from '@/lib/events';
import wordmark from '@/assets/wordmark-cream.png';

const mont = "'Montserrat', sans-serif";

const SHOW_APPLE = false;

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

const SignUpPage = () => {
  const navigate = useNavigate();
  const { setUserName, setOnboardingData, onboardingData } = useApp();

  const [firstName, setFirstName]       = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const isStrongPassword =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const canSubmit =
    firstName.trim().length > 0 &&
    isValidEmail &&
    isStrongPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setError('');
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) { setError(authError.message); return; }
      if (!authData.user) { setError('Account creation failed. Please try again.'); return; }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{ id: authData.user.id, role: 'consumer', first_name: firstName.trim() }]);
      if (profileError) { setError(profileError.message); return; }

          // No identify here: the session is torn down for OTP two lines below, so
      // the user id is not usable yet. Identification happens on the OTP page,
      // which is where a real session first exists.
      trackSignedUp('email');

      setUserName(firstName.trim());
      setOnboardingData({ ...onboardingData });

      await supabase.auth.signOut();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (otpError) { setError(otpError.message); return; }
      navigate('/verify-otp', { state: { email, redirectTo: '/onboarding' }, replace: true });
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (oauthLoading) return;
    setOauthLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Google signup error:', err);
      setError(err?.message || 'Could not start Google sign-up. Please try again.');
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

      {/* Decorative gold curves — full page */}
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

          {/* Wordmark + tagline — hidden on laptop */}
          <div className="fs-auth-mobilebrand" style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src={wordmark} alt="FolliSense" style={{ width: 190, display: 'block', margin: '0 auto' }} />
            <p style={{ fontFamily: mont, fontSize: 13, color: G.sage, letterSpacing: '0.06em', margin: '12px 0 0' }}>
              Understand. Nurture. Grow.
            </p>
            <div style={{ height: 1, background: G.line, margin: '16px auto 0', maxWidth: 230 }} />
          </div>

          <div style={{ background: G.cardBg, border: `1px solid ${G.cardBorder}`, borderRadius: 24, padding: '26px 24px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 20px 50px rgba(0,0,0,0.30)' }}>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: mont, fontSize: 20, fontWeight: 600, color: G.ink, margin: 0, letterSpacing: '0.01em' }}>Create your account</h2>
              <p style={{ fontFamily: mont, fontSize: 12.5, color: G.sub, margin: '6px 0 0' }}>Start your scalp health journey</p>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{ fontFamily: mont, fontSize: 12, color: G.red, margin: '0 0 14px', lineHeight: 1.5, textAlign: 'center' }}>
                {error}
              </motion.p>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14, position: 'relative' }}>
                <span style={inputIconStyle}><User size={16} /></span>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  disabled={loading}
                  style={inputStyle()}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 14, position: 'relative' }}>
                <span style={inputIconStyle}><Mail size={16} /></span>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="Email address"
                  disabled={loading}
                  style={inputStyle(email.length > 0 && !isValidEmail)}
                />
                {email.length > 0 && !isValidEmail && (
                  <p style={{ fontFamily: mont, fontSize: 11, color: G.red, margin: '6px 0 0' }}>Enter a valid email address</p>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
                  <span style={inputIconStyle}><Lock size={16} /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="8+ chars, uppercase, lowercase & number"
                    disabled={loading}
                    style={{ ...inputStyle(password.length > 0 && !isStrongPassword), paddingRight: 48 }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: G.sub, display: 'flex', alignItems: 'center' }}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {password.length > 0 && !isStrongPassword && (
                  <p style={{ fontFamily: mont, fontSize: 11, color: G.red, margin: '6px 0 0' }}>Must be 8+ chars with uppercase, lowercase and a number</p>
                )}
                {password.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {[
                      password.length >= 8,
                      /[A-Z]/.test(password),
                      /[a-z]/.test(password),
                      /[0-9]/.test(password),
                    ].map((met, i) => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: met ? G.sage : 'rgba(255,255,255,0.10)', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={!canSubmit || loading}
                style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', background: canSubmit && !loading ? `linear-gradient(135deg, ${G.cream} 0%, ${G.creamDeep} 100%)` : 'rgba(255,255,255,0.06)', fontFamily: mont, fontWeight: 700, fontSize: 14.5, color: canSubmit && !loading ? G.onCream : G.muted, cursor: canSubmit && !loading ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
                <Shield size={13} color={G.muted} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontFamily: mont, fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.6 }}>
                  Your health data is private and encrypted. We never share your information without your consent.
                </p>
              </div>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 14px' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(245,239,230,0.09)' }} />
              <span style={{ fontFamily: mont, fontSize: 12, color: G.muted }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(245,239,230,0.09)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" onClick={handleGoogleLogin} disabled={oauthLoading}
                style={{ width: '100%', height: 48, borderRadius: 14, border: `1px solid ${G.inputBorder}`, background: G.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: oauthLoading ? 'wait' : 'pointer', fontFamily: mont, fontSize: 13, fontWeight: 500, color: G.ink, transition: 'all 0.15s', opacity: oauthLoading ? 0.6 : 1 }}>
                <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {oauthLoading ? 'Opening Google…' : 'Continue with Google'}
              </button>

              {SHOW_APPLE && (
                <button type="button" onClick={() => toast({ title: 'Coming soon' })}
                  style={{ width: '100%', height: 48, borderRadius: 14, border: `1px solid ${G.inputBorder}`, background: G.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', fontFamily: mont, fontSize: 13, fontWeight: 500, color: G.ink, transition: 'all 0.15s' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill={G.ink}><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Continue with Apple
                </button>
              )}
            </div>

            <p style={{ fontFamily: mont, fontSize: 13, color: G.sub, margin: '18px 0 0', textAlign: 'center' }}>
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} style={{ fontFamily: mont, color: G.ink, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                Log in
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignUpPage;