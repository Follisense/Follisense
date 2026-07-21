import { useState, useEffect } from 'react';
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
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: 430, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 34 }}>
          <img src={wordmarkGreen} alt="FolliSense" style={{ height: 34, width: 'auto' }} />
        </div>
        {children}
      </motion.div>
    </div>
  );

  if (checking) {
    return shell(<p style={{ fontFamily: sans, fontSize: 14, color: C.muted, textAlign: 'center' }}>Verifying your link…</p>);
  }

  if (!ready && !done) {
    return shell(
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, color: C.ink, margin: '0 0 12px' }}>Link expired</h1>
        <p style={{ fontFamily: sans, fontSize: 14, color: C.muted, lineHeight: 1.55, margin: '0 0 26px' }}>This reset link is invalid or has expired. Request a new one from the login screen.</p>
        <button onClick={() => navigate('/forgot-password')} style={{ width: '100%', height: 52, borderRadius: 13, border: 'none', background: C.green, color: C.cream, fontFamily: sans, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Request new link</button>
      </div>
    );
  }

  if (done) {
    return shell(
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={34} color={C.green} strokeWidth={1.6} />
          </div>
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, color: C.ink, margin: '0 0 12px' }}>Password updated</h1>
        <p style={{ fontFamily: sans, fontSize: 14, color: C.muted, lineHeight: 1.55, margin: '0 0 26px' }}>You can now log in with your new password.</p>
        <button onClick={() => navigate('/login')} style={{ width: '100%', height: 52, borderRadius: 13, border: 'none', background: C.green, color: C.cream, fontFamily: sans, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Back to login</button>
      </div>
    );
  }

  return shell(
    <>
      <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, color: C.ink, textAlign: 'center', margin: '0 0 26px' }}>Set a new password</h1>
      <form onSubmit={handleSubmit}>
        <label style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: C.ink, display: 'block', marginBottom: 6 }}>New password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoFocus
          style={{ width: '100%', height: 48, padding: '0 15px', borderRadius: 13, border: `2px solid ${C.green}`, background: C.card, color: C.ink, fontFamily: sans, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
        <label style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: C.ink, display: 'block', marginBottom: 6 }}>Confirm password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password"
          style={{ width: '100%', height: 48, padding: '0 15px', borderRadius: 13, border: `2px solid ${C.green}`, background: C.card, color: C.ink, fontFamily: sans, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        {error && <p style={{ fontFamily: sans, fontSize: 13, color: '#B0504A', margin: '10px 2px 0' }}>{error}</p>}
        <button type="submit" disabled={loading}
          style={{ width: '100%', height: 52, marginTop: 16, borderRadius: 13, border: 'none', fontFamily: sans, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#C7CFC8' : C.green, color: C.cream }}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </>
  );
};

export default ResetPasswordPage;