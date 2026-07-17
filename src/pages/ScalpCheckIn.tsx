import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';

const dm = "'DM Sans', sans-serif";

const C = {
  ink:   '#23201A',
  green: '#4E7A63',
  bg:    '#EDEFE7',
  mid:   'rgba(46,74,57,0.15)',
  muted: '#8A8F86',
};

// ─── STRAIGHT-TO-CHECK-IN ─────────────────────────────────────────────────────
// One tap on any check-in entry point goes DIRECTLY into the check-in.
// The route stays as /scalp-check so every existing entry point (hero banner,
// notifications, deep links) gets this behaviour without any other file changing.
//
// NOTE: this page no longer creates a checkins row. Rows used to be inserted
// here on mount, which left empty "corpse" check-ins every time someone
// abandoned the flow. The check-in row is now created ONCE, at submit time,
// inside MidCycleCheckIn / WashDayAssessment (their former "fallback" insert
// path is now the only path). Abandoning a check-in leaves no trace.
const ScalpCheckIn = () => {
  const navigate = useNavigate();
  const { onboardingData } = useApp();
  const isMale  = onboardingData.gender === 'man';
  const started = useRef(false); // guards React 18 StrictMode double-mount

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Clear any stale id from the old insert-on-start system so the flows
    // never try to update a row that shouldn't exist
    sessionStorage.removeItem('active-checkin-id');

    const destination = isMale || onboardingData.isWornOutOnly
      ? '/wash-day?mode=regular'
      : '/mid-cycle';

    navigate(destination, { replace: true });
  }, []);

  // Brief branded flash during redirect
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: dm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
        style={{ textAlign: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 34, height: 34, borderRadius: '50%', border: `3px solid ${C.mid}`, borderTopColor: C.green, margin: '0 auto 14px' }}
        />
        <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 500, color: C.ink, margin: 0 }}>Starting your check-in…</p>
        <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '4px 0 0' }}>Takes about a minute</p>
      </motion.div>
    </div>
  );
};

export default ScalpCheckIn;