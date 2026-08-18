// src/components/CookieConsent.tsx
//
// analytics.ts sets opt_out_capturing_by_default, so PostHog records NOTHING
// until grantAnalyticsConsent() runs. This banner is what runs it. Without it
// every track() call in the app is a silent no-op.
//
// Consent is stored locally, not in the database, because it has to be readable
// before a user exists. When the consents table lands (P1-1), the analytics
// purpose should move there and this becomes the UI for it.
//
// Mount once, near the root:
//
//   import CookieConsent from '@/components/CookieConsent';
//   ...
//   <CookieConsent />
//
// It renders nothing once a choice has been made.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { grantAnalyticsConsent, revokeAnalyticsConsent } from '@/lib/analytics';

const STORAGE_KEY = 'follisense-analytics-consent';

type Choice = 'granted' | 'declined';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  ink:    '#23201A',
  muted:  '#6B6F66',
  line:   '#E3E7DE',
  green:  '#2E4A39',
  paper:  '#FFFFFF',
};

/** Read once on load so a returning user's earlier choice is honoured. */
export const restoreAnalyticsConsent = () => {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'granted') grantAnalyticsConsent();
  } catch { /* private mode, no storage */ }
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'granted') grantAnalyticsConsent();
      // Only ask if they have not answered before.
      if (!saved) setVisible(true);
    } catch {
      // No storage available: do not ask, and do not track.
    }
  }, []);

  const choose = (choice: Choice) => {
    try { localStorage.setItem(STORAGE_KEY, choice); } catch { /* ignore */ }
    if (choice === 'granted') grantAnalyticsConsent();
    else revokeAnalyticsConsent();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          role="dialog"
          aria-label="Analytics consent"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
            display: 'flex', justifyContent: 'center',
            padding: '0 12px 12px',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            pointerEvents: 'auto',
            width: '100%', maxWidth: 520,
            background: C.paper,
            border: `1.5px solid ${C.line}`,
            borderRadius: 20,
            padding: '20px 22px',
            boxShadow: '0 8px 40px rgba(20,28,22,0.18)',
            fontFamily: dm,
          }}>
            <p style={{ fontFamily: playfair, fontSize: 17, fontWeight: 500, color: C.ink, margin: '0 0 8px' }}>
              Help us improve FolliSense
            </p>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: '0 0 16px' }}>
              We would like to record which parts of the app get used, so we can make
              the ones that matter better. It is counts and page names only. Your
              check-in answers and your photos are never sent.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => choose('declined')}
                style={{
                  flex: 1, height: 46, borderRadius: 14,
                  border: `1.5px solid ${C.line}`, background: 'transparent',
                  fontFamily: dm, fontSize: 13, fontWeight: 500, color: C.ink,
                  cursor: 'pointer',
                }}
              >
                No thanks
              </button>
              <button
                onClick={() => choose('granted')}
                style={{
                  flex: 1, height: 46, borderRadius: 14, border: 'none',
                  background: C.green, color: '#F5F7F2',
                  fontFamily: dm, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Allow
              </button>
            </div>

            <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, margin: '12px 0 0' }}>
              Either way the app works exactly the same. You can change this any time
              in your profile settings.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;