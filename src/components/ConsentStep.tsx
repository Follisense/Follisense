// src/components/ConsentStep.tsx
//
// Two modes, one set of copy:
//
//   mode="signup"    a step in the signup flow. The full wording is ALWAYS
//                    visible and optional purposes start UNTICKED. Consent to
//                    text you cannot see is not consent, so nothing collapses
//                    here.
//   mode="settings"  compact rows with a toggle. The wording is collapsed
//                    behind a chevron because the user has already read and
//                    agreed to it; it is there to re-read, not to decide from.
//
// core_record is shown but cannot be turned off, and the copy says why: the app
// has nothing to do without it, and the way out is deleting the account.
//
// Saying no to research_panel must change nothing about how the app works.
// That is a product commitment, not just copy.

import { useState, useEffect } from 'react';
import { Check, Lock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CONSENT_COPY,
  recordSignupConsents,
  getActiveConsents,
  setConsent,
  type ConsentPurpose,
} from '@/services/consentService';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

// Dark surface values, matching HistoryPage and ProfilePage.
const C = {
  ink:    '#EAF0E9',
  muted:  'rgba(234,240,233,0.65)',
  faint:  'rgba(234,240,233,0.42)',
  line:   'rgba(110,158,130,0.16)',
  green:  '#6E9E82',
  soft:   'rgba(110,158,130,0.10)',
  card:   '#101A14',
  onGreen:'#101A14',
};

interface Props {
  mode: 'signup' | 'settings';
  onComplete?: () => void;
}

const Toggle = ({ on, disabled }: { on: boolean; disabled?: boolean }) => (
  // display matters: a <span> is inline, so width and height were being
  // ignored and the track collapsed to text height.
  <span style={{
    display: 'inline-block',
    width: 46, height: 26, borderRadius: 100, flexShrink: 0,
    background: on ? C.green : 'rgba(234,240,233,0.10)',
    border: `1.5px solid ${on ? C.green : 'rgba(234,240,233,0.30)'}`,
    boxSizing: 'border-box',
    position: 'relative', transition: 'background 0.18s, border-color 0.18s',
  }}>
    <span style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'absolute', top: 1.5, left: on ? 21 : 1.5,
      width: 20, height: 20, borderRadius: '50%',
      background: on ? C.onGreen : 'rgba(234,240,233,0.85)',
      transition: 'left 0.18s, background 0.18s',
    }}>
      {disabled && <Lock size={9} color={C.green} strokeWidth={2.8} />}
    </span>
  </span>
);

const ConsentStep = ({ mode, onComplete }: Props) => {
  const [selected, setSelected] = useState<Set<ConsentPurpose>>(new Set());
  const [expanded, setExpanded] = useState<Set<ConsentPurpose>>(new Set());
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(mode === 'settings');

  useEffect(() => {
    if (mode !== 'settings') return;
    getActiveConsents().then(active => {
      setSelected(new Set(active));
      setLoading(false);
    });
  }, [mode]);

  const toggle = async (purpose: ConsentPurpose, required: boolean) => {
    if (required) return;

    const next = new Set(selected);
    const granting = !next.has(purpose);
    granting ? next.add(purpose) : next.delete(purpose);
    setSelected(next);

    // Settings writes immediately: a change the user makes and then navigates
    // away from should already be recorded.
    if (mode === 'settings') {
      const ok = await setConsent(purpose, granting);
      if (!ok) {
        setSelected(prev => {
          const revert = new Set(prev);
          granting ? revert.delete(purpose) : revert.add(purpose);
          return revert;
        });
      }
    }
  };

  const toggleExpand = (purpose: ConsentPurpose) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(purpose) ? next.delete(purpose) : next.add(purpose);
      return next;
    });
  };

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    await recordSignupConsents([...selected]);
    setSaving(false);
    onComplete?.();
  };

  if (loading) {
    return <p style={{ fontFamily: dm, fontSize: 13, color: C.muted }}>Loading…</p>;
  }

  // ── SETTINGS: compact rows, wording collapsed ─────────────────────────
  if (mode === 'settings') {
    return (
      <div style={{ fontFamily: dm }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          What you've agreed to
        </p>

        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, overflow: 'hidden' }}>
          {CONSENT_COPY.map((item, i) => {
            const on   = item.required || selected.has(item.purpose);
            const open = expanded.has(item.purpose);
            return (
              <div key={item.purpose} style={{ borderTop: i === 0 ? 'none' : `1px solid ${C.line}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.purpose)}
                    style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  >
                                     <span style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.ink }}>
                      {item.title}
                    </span>
                    <ChevronDown
                      size={14}
                      color={C.faint}
                      style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggle(item.purpose, item.required)}
                    disabled={item.required}
                    aria-pressed={on}
                    aria-label={item.title}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: item.required ? 'default' : 'pointer', flexShrink: 0 }}
                  >
                    <Toggle on={on} disabled={item.required} />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{ overflow: 'hidden' }}
                    >
                                   <p style={{ fontFamily: dm, fontSize: 11.5, color: C.muted, lineHeight: 1.7, margin: 0, padding: '0 16px 16px' }}>
                        {item.body}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.6, margin: '10px 0 0' }}>
          Changes save as you make them. To withdraw the first one, delete your
          account from the bottom of this page.
        </p>
      </div>
    );
  }

  // ── SIGNUP: full wording, nothing hidden ──────────────────────────────
  return (
    <div style={{ fontFamily: dm, maxWidth: 560, margin: '0 auto' }}>
      <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.ink, margin: '0 0 8px', lineHeight: 1.25 }}>
        What you're agreeing to
      </h2>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: '0 0 24px' }}>
        Each of these is separate. Only the first is needed for the app to work.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {CONSENT_COPY.map(item => {
          const on = item.required || selected.has(item.purpose);
          return (
            <button
              key={item.purpose}
              type="button"
              onClick={() => toggle(item.purpose, item.required)}
              disabled={item.required}
              aria-pressed={on}
              style={{
                width: '100%', textAlign: 'left', padding: '16px 18px',
                borderRadius: 16,
                border: on ? `2px solid ${C.green}` : `1.5px solid ${C.line}`,
                background: on ? C.soft : C.card,
                cursor: item.required ? 'default' : 'pointer',
                display: 'flex', gap: 13, alignItems: 'flex-start',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
                border: `2px solid ${on ? C.green : C.line}`,
                background: on ? C.green : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.required
                  ? <Lock size={11} color={C.onGreen} strokeWidth={2.4} />
                  : on && <Check size={13} color={C.onGreen} strokeWidth={3} />}
              </span>

              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                  {item.title}
                  {item.required && (
                    <span style={{ fontSize: 11, fontWeight: 500, color: C.faint, marginLeft: 8 }}>
                      required
                    </span>
                  )}
                </span>
                <span style={{ display: 'block', fontSize: 12.5, color: C.muted, lineHeight: 1.65 }}>
                  {item.body}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={saving}
        style={{
          width: '100%', height: 52, borderRadius: 16, border: 'none',
          background: saving ? C.line : C.green,
          color: saving ? C.muted : C.onGreen,
          fontFamily: dm, fontSize: 14, fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving…' : 'Agree and continue'}
      </button>
      <p style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.6, margin: '12px 0 0' }}>
        You can change any of the optional ones later in your profile, and you
        can delete your account and everything in it at any time.
      </p>
    </div>
  );
};

export default ConsentStep;