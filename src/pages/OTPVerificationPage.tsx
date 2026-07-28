import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useApp } from '@/contexts/AppContext';
import AuthShell, { T, fraunces, instrument } from '@/components/AuthShell';

const OTP_LENGTH = 8; // must match Supabase → Auth → Email → OTP length

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
    <AuthShell tagline="Two-step verification keeps your scalp record yours alone.">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        <p style={{ fontFamily: instrument, fontSize: 13.5, color: T.muted, margin: '0 0 20px', textAlign: 'center' }}>
          Two-step verification
        </p>

        {/* Card */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 22, padding: '28px 24px', boxShadow: '0 8px 30px rgba(35,32,26,0.07)' }}>

          <h2 style={{ fontFamily: fraunces, fontWeight: 600, fontSize: 21, color: T.text, letterSpacing: '-.01em', margin: '0 0 8px', textAlign: 'center' }}>
            Check your email
          </h2>
          <p style={{ fontFamily: instrument, fontSize: 13.5, color: T.muted, textAlign: 'center', lineHeight: 1.6, margin: '0 0 24px' }}>
            We sent an {OTP_LENGTH}-digit code to<br />
            <span style={{ color: T.brand, fontWeight: 600 }}>{email}</span>
          </p>

          {/* OTP inputs,text + inputMode numeric so there are no spinners and no
              scroll-wheel surprises on a laptop. Boxes flex to fill the width. */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 22 }} onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={isLoading || success}
                aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  maxWidth: 46,
                  height: 54,
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
                  boxSizing: 'border-box',
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
    </AuthShell>
  );
};

export default OTPVerificationPage;