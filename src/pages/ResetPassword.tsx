import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import wordmark from '@/assets/wordmark-green.png';

const fraunces   = "'Fraunces', serif";
const instrument = "'Instrument Sans', system-ui, sans-serif";

const T = {
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
};

const Texture = () => (
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
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 54,
  padding: '0 16px',
  borderRadius: 14,
  border: `1px solid ${T.border}`,
  background: T.card,
  color: T.text,
  fontFamily: instrument,
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  height: 56,
  width: '100%',
  borderRadius: 16,
  fontSize: 16.5,
  fontWeight: 600,
  fontFamily: instrument,
  cursor: 'pointer',
  border: 'none',
  background: T.action,
  color: T.actionText,
};

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

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', background: '#2a2c28', display: 'flex', justifyContent: 'center', fontFamily: instrument }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Instrument+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{ position: 'relative', width: '100%', maxWidth: 430, minHeight: '100dvh', background: T.surface, overflow: 'hidden' }}>
        <Texture />
        <div style={{ position: 'absolute', inset: 0, padding: '54px 26px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <img src={wordmark} alt="FolliSense" style={{ width: 180, marginBottom: 30 }} />
          <div style={{ width: '100%' }}>{children}</div>
        </div>
      </div>
    </div>
  );

  if (checking) {
    return shell(<p style={{ fontFamily: instrument, fontSize: 14.5, color: T.muted, textAlign: 'center' }}>Verifying your link&hellip;</p>);
  }

  if (!ready && !done) {
    return shell(
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: fraunces, fontWeight: 600, fontSize: 26, color: T.text, letterSpacing: '-.01em', margin: '0 0 10px' }}>Link expired</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: T.muted, margin: '0 0 28px', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>This reset link is invalid or has expired. Request a new one from the login screen.</p>
        <button onClick={() => navigate('/forgot-password')} style={primaryBtn}>Request new link <span>&rarr;</span></button>
      </div>
    );
  }

  if (done) {
    return shell(
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
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: T.muted, margin: '0 0 28px', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>You can now log in with your new password.</p>
        <button onClick={() => navigate('/login')} style={primaryBtn}>Back to log in <span>&rarr;</span></button>
      </div>
    );
  }

  return shell(
    <>
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
    </>
  );
};

export default ResetPasswordPage;