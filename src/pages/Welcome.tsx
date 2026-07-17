// WelcomeScreen.tsx
// Replicates follisense-flow-test.html (Skin B - Warm), minus the splash
// (the app's own splash screen runs before this component):
//   1. Carousel - 3 swipeable value cards with dots + next button + Skip
//      First visit only. Force it anytime by adding ?intro to the URL.
//   2. Auth     - wordmark, tagline, Create Account / Log In
// Constrained to a phone-width frame (430px) with dark gutters on desktop.

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import wordmark from '@/assets/wordmark-green.png';

const fraunces   = "'Fraunces', serif";
const instrument = "'Instrument Sans', system-ui, sans-serif";

// Skin B - Warm tokens (from the mockup)
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

const CARDS = [
  {
    title: "Know what's normal.",
    body: 'A guided scalp check, designed with clinicians. Understand what you see at every parting.',
    illo: (
      <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: 96, height: 96 }}>
        <path d="M20 62 C 20 34, 76 34, 76 62" />
        <path d="M48 30 V 62" strokeDasharray="1 7" />
        <circle cx="48" cy="44" r="13" strokeWidth="2.4" />
        <path d="M57 53 L 68 64" />
      </svg>
    ),
  },
  {
    title: 'See change over time.',
    body: 'A private photo timeline shows what has changed since last check. Evidence, not guesswork.',
    illo: (
      <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: 96, height: 96 }}>
        <rect x="14" y="40" width="18" height="22" rx="4" />
        <rect x="39" y="34" width="18" height="28" rx="4" />
        <rect x="64" y="26" width="18" height="36" rx="4" />
        <path d="M18 20 C 40 10, 62 12, 80 18" />
        <path d="M80 18 l-6 -1 m6 1 l-2 5" />
      </svg>
    ),
  },
  {
    title: 'Care that fits your routine.',
    body: 'Recommendations matched to your scalp and your rhythm. Wash day included.',
    illo: (
      <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: 96, height: 96 }}>
        <path d="M48 18 C 38 30, 32 38, 32 48 a16 16 0 0 0 32 0 C 64 38, 58 30, 48 18 Z" />
        <path d="M42 50 l5 5 9 -9" />
        <circle cx="74" cy="26" r="10" />
        <path d="M74 21 v5 l4 3" />
      </svg>
    ),
  },
];

type Screen = 'carousel' | 'auth';

export default function WelcomeScreen() {
  const navigate = useNavigate();
  // First visit: carousel -> auth. Returning users: straight to auth.
  // Demo override: open the app with ?intro in the URL (e.g. localhost:8080/?intro
  // or yourdomain.com/?intro) to force the carousel regardless of the flag.
  const [screen, setScreen] = useState<Screen>(() => {
    const forceIntro = new URLSearchParams(window.location.search).has('intro');
    if (forceIntro) return 'carousel';
    return localStorage.getItem('fs_seen_intro') ? 'auth' : 'carousel';
  });
  const [card, setCard] = useState(0);
  const touchX = useRef<number | null>(null);

  // Once they reach auth (via Skip or the last card), remember it
  useEffect(() => {
    if (screen === 'auth') localStorage.setItem('fs_seen_intro', '1');
  }, [screen]);

  const nextCard = () => {
    if (card < CARDS.length - 1) setCard(card + 1);
    else setScreen('auth');
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -40) nextCard();
    if (dx > 40 && card > 0) setCard(card - 1);
    touchX.current = null;
  };

  const screenStyle = (on: boolean): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    padding: '54px 26px 30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    opacity: on ? 1 : 0,
    pointerEvents: on ? 'auto' : 'none',
    transition: 'opacity .45s ease',
    zIndex: 1,
  });

  const btnBase: React.CSSProperties = {
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
  };

  return (
    // Viewport shell - dark gutters on desktop, invisible on mobile
    <div
      style={{
        minHeight: '100dvh',
        background: '#2a2c28',
        display: 'flex',
        justifyContent: 'center',
        fontFamily: instrument,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Instrument+Sans:wght@400;500;600&display=swap');
      `}</style>

      {/* Phone frame - surface color and texture live here */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 430,
          minHeight: '100dvh',
          background: T.surface,
          overflow: 'hidden',
        }}
      >
        {/* Background texture */}
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

        {/* 1 - VALUE CAROUSEL */}
        <div
          style={{ ...screenStyle(screen === 'carousel'), justifyContent: 'flex-start' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            onClick={() => setScreen('auth')}
            style={{ position: 'absolute', top: 22, right: 24, fontSize: 13.5, fontWeight: 600, color: T.muted, cursor: 'pointer', padding: '6px 10px', background: 'none', border: 'none', fontFamily: instrument }}
          >
            Skip
          </button>

          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center' }}>
            {CARDS.map((c, i) => (
              <div
                key={c.title}
                style={{
                  width: '100%',
                  display: i === card ? 'flex' : 'none',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 168,
                    height: 168,
                    borderRadius: '50%',
                    background: T.tint,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: T.brand,
                    marginBottom: 34,
                    boxShadow: '0 2px 10px rgba(35,32,26,.06)',
                  }}
                >
                  {c.illo}
                </div>
                <h2 style={{ fontFamily: fraunces, fontWeight: 600, fontSize: 27, color: T.text, letterSpacing: '-.01em', margin: 0 }}>
                  {c.title}
                </h2>
                <p style={{ marginTop: 12, fontSize: 15.5, lineHeight: 1.55, color: T.muted, maxWidth: 280 }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 6 }}>
            <div style={{ display: 'flex', gap: 7 }}>
              {CARDS.map((_, i) => (
                <i
                  key={i}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: i === card ? T.brand : T.border, display: 'block' }}
                />
              ))}
            </div>
            <button
              onClick={nextCard}
              style={{ width: 52, height: 52, borderRadius: '50%', background: T.action, color: T.actionText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none' }}
            >
              →
            </button>
          </div>
        </div>

        {/* 2 - AUTH */}
        <div style={{ ...screenStyle(screen === 'auth'), justifyContent: 'center' }}>
          <img src={wordmark} alt="FolliSense" style={{ width: 190, marginBottom: 14 }} />
          <div style={{ fontSize: 15, color: T.muted, marginBottom: 38 }}>
            Healthy hair starts with knowing.
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => navigate('/signup')}
              style={{ ...btnBase, background: T.action, color: T.actionText }}
            >
              Create Account <span>→</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{ ...btnBase, background: T.card, color: T.text, border: `1px solid ${T.border}` }}
            >
              Log In <span>→</span>
            </button>
          </div>

          <div style={{ marginTop: 18, fontSize: 11.5, color: T.faint, textAlign: 'center' }}>
            By continuing, you agree to our{' '}
            <span onClick={() => navigate('/terms')} style={{ color: T.muted, textDecoration: 'underline', cursor: 'pointer' }}>Terms</span> and{' '}
            <span onClick={() => navigate('/privacy')} style={{ color: T.muted, textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>.
          </div>
        </div>
      </div>
    </div>
  );
}