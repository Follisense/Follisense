import type { ReactNode } from 'react';
import wordmarkGreen from '@/assets/wordmark-green.webp';

export const fraunces   = "'Fraunces', serif";
export const instrument = "'Instrument Sans', system-ui, sans-serif";

// Shared warm tokens for every auth page. Single source,change here, not per page.
export const T = {
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

export const inputStyle: React.CSSProperties = {
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

export const primaryBtn: React.CSSProperties = {
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

// Wave texture,cream side uses brand green at 5%, brand panel uses cream at 8%
const Texture = ({ color, opacity }: { color: string; opacity: number }) => (
  <svg
    viewBox="0 0 390 800"
    preserveAspectRatio="none"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.1"
    aria-hidden="true"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, color, pointerEvents: 'none', zIndex: 0 }}
  >
    <path d="M-30 120 C 120 60, 240 200, 420 90" />
    <path d="M-40 300 C 100 240, 260 380, 430 260" />
    <path d="M-30 520 C 130 460, 250 620, 420 500" />
    <path d="M-40 700 C 110 640, 260 790, 430 680" />
  </svg>
);

// Below 900px: unchanged,cream fills the screen, content capped at 430, green
// wordmark above the content. From 900px: two columns, brand panel on the left,
// form on the right. No dark shell gutters at any width any more.
const authCss = `
 
  html, body, #root { background: ${T.surface}; }
  .auth-root { min-height: 100dvh; display: grid; grid-template-columns: 1fr; background: ${T.surface}; }
  .auth-brand { display: none; }
  .auth-main {
    position: relative; overflow: hidden; background: ${T.surface};
    min-height: 100dvh; display: flex; align-items: center; justify-content: center;
    padding: 48px 24px; box-sizing: border-box;
  }
  .auth-inner { position: relative; z-index: 1; width: 100%; max-width: 430px; }
  .auth-wordmark { display: block; width: 180px; margin: 0 auto 28px; }
  @media (min-width: 900px) {
    .auth-root { grid-template-columns: 1fr 1.1fr; }
    .auth-brand {
      position: relative; overflow: hidden; background: ${T.brand};
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 16px; padding: 48px; text-align: center;
    }
    .auth-main { padding: 56px 48px; }
    .auth-inner { max-width: 440px; }
    .auth-wordmark { display: none; }
  }
`;

interface AuthShellProps {
  children: ReactNode;
  /** Line under the wordmark on the desktop brand panel. */
  tagline?: string;
}

const AuthShell = ({ children, tagline = 'Your scalp health, tracked around your routine.' }: AuthShellProps) => (
  <div className="auth-root" style={{ fontFamily: instrument }}>
    <style>{authCss}</style>

    {/* Desktop-only brand panel. If you have a cream wordmark asset, import it
        and swap the <p> below for an <img>,it's the only change needed. */}
    <div className="auth-brand">
      <Texture color={T.surface} opacity={0.08} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{ fontFamily: fraunces, fontWeight: 600, fontSize: 40, color: T.surface, letterSpacing: '-.02em', margin: 0 }}>
          FolliSense
        </p>
        <p style={{ fontFamily: instrument, fontSize: 15, color: 'rgba(243,237,227,0.72)', lineHeight: 1.6, margin: '12px auto 0', maxWidth: 280 }}>
          {tagline}
        </p>
      </div>
    </div>

    <div className="auth-main">
      <Texture color={T.brand} opacity={0.05} />
      <div className="auth-inner">
        <img className="auth-wordmark" src={wordmarkGreen} alt="FolliSense" />
        {children}
      </div>
    </div>
  </div>
);

export default AuthShell;