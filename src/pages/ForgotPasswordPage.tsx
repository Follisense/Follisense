import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import AuthShell, { T, fraunces, instrument, inputStyle, primaryBtn } from '@/components/AuthShell';

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
    <AuthShell tagline="Reset your password and pick up where you left off.">
      {!submitted ? (
        <div>
          <h1 style={{ fontFamily: fraunces, fontWeight: 600, fontSize: 26, color: T.text, letterSpacing: '-.01em', textAlign: 'center', margin: '0 0 8px' }}>Reset your password</h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.5, color: T.muted, textAlign: 'center', margin: '0 0 28px' }}>Enter your email and we'll send a reset link.</p>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = T.brand)}
              onBlur={e => (e.currentTarget.style.borderColor = T.border)}
            />
            {error && <p style={{ fontFamily: instrument, fontSize: 13, color: '#A6472F', margin: '10px 2px 0' }}>{error}</p>}
            <button
              type="submit"
              disabled={email.trim().length === 0 || loading}
              style={{ ...primaryBtn, marginTop: 16, opacity: email.trim().length > 0 && !loading ? 1 : 0.5, cursor: email.trim().length > 0 && !loading ? 'pointer' : 'not-allowed' }}
            >
              {loading ? 'Sending…' : <>Send reset link <span>→</span></>}
            </button>
          </form>

          <button
            onClick={() => navigate('/login')}
            style={{ marginTop: 20, background: 'none', border: 'none', width: '100%', textAlign: 'center', fontFamily: instrument, fontSize: 13.5, fontWeight: 600, color: T.muted, cursor: 'pointer' }}
          >
            Back to log in
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: T.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.brand }}>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ width: 34, height: 34 }}>
                <circle cx="24" cy="24" r="19" strokeWidth="2.2" />
                <path d="M16 24 l6 6 12 -13" />
              </svg>
            </div>
          </div>
          <h1 style={{ fontFamily: fraunces, fontWeight: 600, fontSize: 26, color: T.text, letterSpacing: '-.01em', margin: '0 0 10px' }}>Check your inbox</h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, color: T.muted, margin: '0 auto 28px', maxWidth: 300 }}>
            If that email is registered, a reset link is on its way. Open it to set a new password.
          </p>
          <button onClick={() => navigate('/login')} style={primaryBtn}>Back to log in <span>&rarr;</span></button>
        </div>
      )}
    </AuthShell>
  );
};

export default ForgotPasswordPage;