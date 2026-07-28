import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import AuthShell, { T, fraunces, instrument, inputStyle, primaryBtn } from '@/components/AuthShell';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { setReady(true); setChecking(false); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setReady(true); setChecking(false); }
    });
    const t = setTimeout(() => setChecking(false), 3000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('should be different') || msg.includes('same')) {
        setError('New password must be different from your old one.');
      } else if (msg.includes('expired') || msg.includes('invalid') || msg.includes('token')) {
        setError('This reset link has expired. Request a new one.');
      } else if (msg.includes('at least') || msg.includes('6 characters') || msg.includes('weak')) {
        setError('Password must be at least 6 characters.');
      } else {
        setError(error.message || 'Could not update your password. Please try again.');
      }
      return;
    }
    await supabase.auth.signOut();
    setLoading(false);
    setDone(true);
  };

  if (checking) {
    return (
      <AuthShell tagline="Set a new password and get back to tracking.">
        <p style={{ fontFamily: instrument, fontSize: 14.5, color: T.muted, textAlign: 'center' }}>Verifying your link&hellip;</p>
      </AuthShell>
    );
  }

  if (!ready && !done) {
    return (
      <AuthShell tagline="Set a new password and get back to tracking.">
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: fraunces, fontWeight: 600, fontSize: 26, color: T.text, letterSpacing: '-.01em', margin: '0 0 10px' }}>Link expired</h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, color: T.muted, margin: '0 auto 28px', maxWidth: 300 }}>This reset link is invalid or has expired. Request a new one from the login screen.</p>
          <button onClick={() => navigate('/forgot-password')} style={primaryBtn}>Request new link <span>&rarr;</span></button>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell tagline="Set a new password and get back to tracking.">
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: T.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.brand }}>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ width: 34, height: 34 }}>
                <circle cx="24" cy="24" r="19" strokeWidth="2.2" />
                <path d="M16 24 l6 6 12 -13" />
              </svg>
            </div>
          </div>
          <h1 style={{ fontFamily: fraunces, fontWeight: 600, fontSize: 26, color: T.text, letterSpacing: '-.01em', margin: '0 0 10px' }}>Password updated</h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, color: T.muted, margin: '0 auto 28px', maxWidth: 300 }}>You can now log in with your new password.</p>
          <button onClick={() => navigate('/login')} style={primaryBtn}>Back to log in <span>&rarr;</span></button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell tagline="Set a new password and get back to tracking.">
      <h1 style={{ fontFamily: fraunces, fontWeight: 600, fontSize: 26, color: T.text, letterSpacing: '-.01em', textAlign: 'center', margin: '0 0 8px' }}>Set a new password</h1>
      <p style={{ fontSize: 14.5, lineHeight: 1.5, color: T.muted, textAlign: 'center', margin: '0 0 28px' }}>Choose a new password for your account.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (at least 6 characters)" autoFocus
          style={{ ...inputStyle, marginBottom: 12 }}
          onFocus={e => (e.currentTarget.style.borderColor = T.brand)}
          onBlur={e => (e.currentTarget.style.borderColor = T.border)}
        />
        <input
          type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password"
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = T.brand)}
          onBlur={e => (e.currentTarget.style.borderColor = T.border)}
        />
        {error && <p style={{ fontFamily: instrument, fontSize: 13, color: '#A6472F', margin: '10px 2px 0' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ ...primaryBtn, marginTop: 16, opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Updating…' : <>Update password <span>&rarr;</span></>}
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordPage;