import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import wordmarkGreen from '@/assets/wordmark-green.png';

const serif = "'Fraunces', serif";
const sans = "'Instrument Sans', sans-serif";
const C = {
  cream: '#F6F1E7',
  card: '#FFFFFF',
  green: '#4E7A63',
  greenSoft: '#E3EDE5',
  ink: '#20261E',
  muted: '#5E6B60',
  faint: '#7A8B7F',
  border: '#E7E0D2',
};

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed.length === 0 || loading) return;
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError('Could not send the link right now. Please try again.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ maxWidth: 430, width: '100%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 34 }}>
          <img src={wordmarkGreen} alt="FolliSense" style={{ height: 34, width: 'auto' }} />
        </div>

        {!submitted ? (
          <>
            <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, color: C.ink, textAlign: 'center', margin: '0 0 26px' }}>Reset your password</h1>
            <form onSubmit={handleSubmit}>
              <label style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: C.ink, display: 'block', marginBottom: 6 }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                style={{ width: '100%', height: 48, padding: '0 15px', borderRadius: 13, border: `2px solid ${C.green}`, background: C.card, color: C.ink, fontFamily: sans, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
              {error && <p style={{ fontFamily: sans, fontSize: 13, color: '#B0504A', margin: '10px 2px 0' }}>{error}</p>}
              <button
                type="submit"
                disabled={email.trim().length === 0 || loading}
                style={{ width: '100%', height: 52, marginTop: 16, borderRadius: 13, border: 'none', fontFamily: sans, fontSize: 15, fontWeight: 600, cursor: email.trim().length > 0 && !loading ? 'pointer' : 'not-allowed', background: email.trim().length > 0 && !loading ? C.green : '#C7CFC8', color: C.cream, transition: 'background 0.2s' }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <button
              onClick={() => navigate('/login')}
              style={{ marginTop: 22, background: 'none', border: 'none', width: '100%', textAlign: 'center', fontFamily: sans, fontSize: 13, color: C.faint, cursor: 'pointer' }}
            >
              Back to login
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={34} color={C.green} strokeWidth={1.6} />
              </div>
            </div>
            <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, color: C.ink, margin: '0 0 12px' }}>Check your inbox</h1>
            <p style={{ fontFamily: sans, fontSize: 14, color: C.muted, lineHeight: 1.55, margin: '0 0 26px' }}>
              If that email is registered, a reset link is on its way. Open it to set a new password.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{ width: '100%', height: 52, borderRadius: 13, border: 'none', background: C.green, color: C.cream, fontFamily: sans, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Back to login
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;