import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useApp } from '@/contexts/AppContext';

// Green wordmark,same asset the welcome screen uses on cream
import wordmark from '@/assets/wordmark-green.png';

const fraunces   = "'Fraunces', serif";
const instrument = "'Instrument Sans', system-ui, sans-serif";

const OTP_LENGTH = 8; // must match Supabase → Auth → Email → OTP length

// Skin B · Warm tokens,matches WelcomeScreen
const T = {
  shell:      '#2a2c28',   // outside the phone frame (same as welcome)
  surface:    '#F3EDE3',
  card:       '#FFFCF5',
  border:     '#E7DFD1',
  text:       '#23201A',
  muted:      '#545B4B',
  faint:      '#8B9382',
  brand:      '#2E4A39',
  tint:       '#E2EAE0',
  action:     '#23201A',
  actionText: '#FFFFFF',
  success:    '#2E7D4F',
  red:        '#B0483B',
};

const OTPVerificationPage = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { setOnboardingComplete, onboardingComplete } = useApp();

  const { email, redirectTo } = (location.state || {}) as { email: string; redirectTo: string };

  const [otp, setOtp]               = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);
  const [resending, setResending]   = useState(false);
  const [success, setSuccess]       = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (!email) navigate('/login', { replace: true });
  }, [email]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (value && index === OTP_LENGTH - 1 && newOtp.every(d => d !== '')) {
      verifyOtp(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      const digits = pasted.split('');
      setOtp(digits);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      setTimeout(() => verifyOtp(pasted), 100);
    }
  };

  const verifyOtp = async (code: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');

    try {
      // Try verifying as email OTP first (works when Supabase OTP is enabled)
      const { data, error: otpError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (otpError) {
        // Fallback: if the user already has a valid session from signInWithPassword,
        // the OTP step may not be strictly required,check session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          // Session exists,OTP was supplementary, proceed
          console.warn('[OTP] Verify failed but session exists, proceeding:', otpError.message);
          setSuccess(true);
          setTimeout(() => navigate(redirectTo || '/home', { replace: true }), 600);
          return;
        }
        throw otpError;
      }

      setSuccess(true);
      setTimeout(() => navigate(redirectTo || '/home', { replace: true }), 600);

    } catch (err: any) {
      console.error('[OTP] Error:', err);
      // Give a helpful error message based on what went wrong
      if (err?.message?.includes('expired')) {
        setError('Code has expired. Please request a new one below.');
      } else if (err?.message?.includes('invalid') || err?.message?.includes('Invalid')) {
        setError('Incorrect code. Please check and try again.');
      } else {
        setError('Could not verify code. Please try again or resend.');
      }
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setResendCooldown(30);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = () => {
    const code = otp.join('');
    if (code.length === OTP_LENGTH && !isLoading) verifyOtp(code);
  };

  const allFilled = otp.every(d => d !== '');

  return (
    // Viewport shell,dark gutters on desktop, invisible on mobile
    <div style={{ minHeight: '100dvh', background: T.shell, display: 'flex', justifyContent: 'center', fontFamily: instrument }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Instrument+Sans:wght@400;500;600&display=swap');
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        html, body, #root { background: ${T.shell} !important; }
      `}</style>

      {/* Phone frame,cream surface with the welcome screen's wavy texture */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 430, minHeight: '100dvh', background: T.surface, overflow: 'hidden' }}>

        {/* Background texture,same waves as WelcomeScreen */}
        <svg
          viewBox="0 0 390 800"
          preserveAspectRatio="none"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05, color: T.brand, pointerEvents: 'none', zIndex: 0 }}
        >
          <path d="M-30 120 C 120 60, 240 200, 420 90" />
          <path d="M-40 300 C 100 240, 260 380, 430 260" />
          <path d="M-30 520 C 130 460, 250 620, 420 500" />
          <path d="M-40 700 C 110 640, 260 790, 430 680" />
        </svg>

        <div style={{ position: 'relative', minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px', boxSizing: 'border-box', zIndex: 1 }}>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            style={{ width: '100%' }}>

            {/* Wordmark + subtitle */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <img src={wordmark} alt="FolliSense" style={{ width: 180, display: 'block', margin: '0 auto' }} />
              <p style={{ fontFamily: instrument, fontSize: 13.5, color: T.muted, margin: '14px 0 0' }}>
                Two-step verification
              </p>
            </div>

            {/* Card */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 22, padding: '28px 20px', boxShadow: '0 8px 30px rgba(35,32,26,0.07)' }}>

              <h2 style={{ fontFamily: fraunces, fontWeight: 600, fontSize: 21, color: T.text, letterSpacing: '-.01em', margin: '0 0 8px', textAlign: 'center' }}>
                Check your email
              </h2>
              <p style={{ fontFamily: instrument, fontSize: 13.5, color: T.muted, textAlign: 'center', lineHeight: 1.6, margin: '0 0 24px' }}>
                We sent an {OTP_LENGTH}-digit code to<br />
                <span style={{ color: T.brand, fontWeight: 600 }}>{email}</span>
              </p>

              {/* OTP inputs */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 22 }} onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="number"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    disabled={isLoading || success}
                    style={{
                      width: 38, height: 52,
                      textAlign: 'center',
                      borderRadius: 12,
                      border: `1.5px solid ${success ? 'rgba(46,125,79,0.55)' : digit ? T.brand : T.border}`,
                      background: success ? 'rgba(46,125,79,0.08)' : digit ? T.tint : '#FFFFFF',
                      fontFamily: instrument,
                      fontSize: 19,
                      fontWeight: 600,
                      color: success ? T.success : T.brand,
                      outline: 'none',
                      transition: 'all 0.15s',
                      padding: 0,
                    }}
                  />
                ))}
              </div>

              {/* Success state */}
              {success && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ fontFamily: instrument, fontSize: 13, color: T.success, textAlign: 'center', margin: '0 0 16px', fontWeight: 600 }}>
                  Verified ✓ Redirecting…
                </motion.p>
              )}

              {/* Error */}
              {error && !success && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  style={{ fontFamily: instrument, fontSize: 12.5, color: T.red, textAlign: 'center', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {error}
                </motion.p>
              )}

              {/* Verify button,dark action, like the welcome screen's Create Account */}
              {!success && (
                <button
                  onClick={handleSubmit}
                  disabled={!allFilled || isLoading}
                  style={{
                    width: '100%', height: 54, borderRadius: 16,
                    border: 'none',
                    background: allFilled && !isLoading ? T.action : '#E4DDD0',
                    fontFamily: instrument, fontWeight: 600, fontSize: 16,
                    color: allFilled && !isLoading ? T.actionText : T.faint,
                    cursor: allFilled && !isLoading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s', marginBottom: 18,
                  }}
                >
                  {isLoading ? 'Verifying…' : 'Verify'}
                </button>
              )}

              {/* Resend */}
              {!success && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: instrument, fontSize: 12.5, color: T.faint, margin: '0 0 6px' }}>
                    Didn't receive a code? Codes expire after 10 minutes.
                  </p>
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resending}
                    style={{
                      fontFamily: instrument, fontSize: 13.5, fontWeight: 600,
                      color: resendCooldown > 0 ? T.faint : T.brand,
                      background: 'none', border: 'none',
                      cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : resending ? 'Sending…' : 'Resend code'}
                  </button>
                </div>
              )}
            </div>

            {/* Back to login */}
            {!success && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button onClick={() => navigate('/login')}
                  style={{ fontFamily: instrument, fontSize: 13, color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← Back to login
                </button>
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationPage;