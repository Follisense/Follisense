import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:       '#0A0908',
  ink:      '#F5EFE6',
  gold:     '#8FB29E',
  warm:     'rgba(245,239,230,0.65)',
  muted:    'rgba(245,239,230,0.40)',
  goldBorder: 'rgba(143,178,158,0.28)',
};

const GoodbyePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Only reachable right after a deletion,direct visits get bounced home
  useEffect(() => {
    if (!location.state?.accountDeleted) navigate('/', { replace: true });
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: dm }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@500&display=swap');`}</style>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ maxWidth: 340, textAlign: 'center' }}
      >
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(143,178,158,0.12)', border: `1.5px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle2 size={28} color={C.gold} strokeWidth={1.5} />
        </div>
        <h1 style={{ fontFamily: playfair, fontSize: 24, fontWeight: 500, color: C.ink, margin: '0 0 12px', lineHeight: 1.3 }}>
          Your account has been deleted
        </h1>
        <p style={{ fontSize: 13, color: C.warm, lineHeight: 1.65, margin: '0 0 8px' }}>
          Your check-ins, photos, routine, and profile have all been permanently removed. Nothing was kept.
        </p>
        <p style={{ fontSize: 13, color: C.warm, lineHeight: 1.65, margin: '0 0 32px' }}>
          Thank you for letting FolliSense be part of your hair journey. Take care of that scalp. 🌿
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          style={{ height: 48, padding: '0 32px', borderRadius: 14, border: `1px solid ${C.goldBorder}`, background: 'linear-gradient(135deg, #16261B 0%, #0E1610 100%)', color: C.gold, fontFamily: dm, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Back to start
        </button>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 20 }}>
          Changed your mind? You're always welcome to sign up again.
        </p>
      </motion.div>
    </div>
  );
};

export default GoodbyePage;