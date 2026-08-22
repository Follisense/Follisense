// src/components/HairEventPrompt.tsx
//
// P3-5 UI — logging what happened to her hair.
//
// WHERE THIS SITS AND WHY: on the results page, AFTER the check-in has saved.
// Not as a step inside the check-in flow.
//
// The reasoning is the same one that reshaped CaptureContext: anything between
// someone and finishing a task gets abandoned. Here the task is already done,
// the data is already saved, and ignoring this costs nothing. That makes it a
// genuine offer rather than another gate.
//
// It also keeps the standing rule intact — no branch on event type inside a
// check-in component. This reads the lookup table and renders whatever is in
// it; adding an event type stays a database row.
//
// Events are facts with dates. Nothing here says an event caused anything.
//
// Usage, at the bottom of CheckInSummary:
//
//   <HairEventPrompt />

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, X } from 'lucide-react';
import {
  getEventTypes,
  getOpenPeriod,
  addEvent,
  type HairEventType,
  type HairEvent,
} from '@/services/hairEventService';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  ink:     '#EAF0E9',
  muted:   'rgba(234,240,233,0.65)',
  faint:   'rgba(234,240,233,0.42)',
  line:    'rgba(110,158,130,0.16)',
  green:   '#6E9E82',
  greenDeep:'#4E7A63',
  card:    '#101A14',
  soft:    'rgba(110,158,130,0.10)',
  onGreen: '#101A14',
};

const today = () => new Date().toISOString().slice(0, 10);

const HairEventPrompt = () => {
  const [types, setTypes]       = useState<HairEventType[]>([]);
  const [open, setOpen]         = useState<HairEvent | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [chosen, setChosen]     = useState<string | null>(null);
  const [when, setWhen]         = useState(today());
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getEventTypes().then(setTypes);
    getOpenPeriod().then(setOpen);
  }, []);

  if (dismissed || types.length === 0) return null;

  // Once something is logged, this collapses to a confirmation rather than
  // inviting a second entry. Most check-ins have at most one event behind them.
  if (saved) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 16, background: C.soft, border: `1px solid ${C.line}`, fontFamily: dm, marginTop: 20 }}>
        <Check size={15} color={C.green} strokeWidth={2.4} />
        <span style={{ fontSize: 13, color: C.ink }}>Logged. It will show on your timeline.</span>
      </div>
    );
  }
  // The event that closes the open period, e.g. install → takedown.
  const openType  = open ? types.find(t => t.key === open.event_type) : null;
  const closeType = openType?.closed_by
    ? types.find(t => t.key === openType.closed_by) ?? null
    : null;

  const save = async (typeKey: string, closes?: string | null) => {
    if (saving) return;
    setSaving(true);
    const result = await addEvent({
      event_type: typeKey,
      occurred_on: when,
      note: note || null,
      closes_event: closes ?? null,
    });
    setSaving(false);
    if (result) setSaved(true);
  };

  // ── Collapsed: one line, easy to ignore ──────────────────────────────
  if (!expanded) {
    return (
      <div style={{ marginTop: 20, fontFamily: dm }}>
        {/* When a style is open, the likely next event is taking it out, so it
            gets its own one-tap button rather than being buried in the list. */}
        {open && closeType && (
          <button
            onClick={() => save(closeType.key, open.id)}
            disabled={saving}
            style={{
              width: '100%', marginBottom: 10, padding: '14px 16px',
              borderRadius: 16, border: `1.5px solid ${C.green}`,
              background: C.soft, cursor: 'pointer', textAlign: 'left',
              fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink,
            }}
          >
            {closeType.label}?
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 400, color: C.muted, marginTop: 2 }}>
              You logged a style on {new Date(open.occurred_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
            </span>
          </button>
        )}

        <button
          onClick={() => setExpanded(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px', borderRadius: 16,
            border: `1px solid ${C.line}`, background: C.card,
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <Plus size={15} color={C.green} strokeWidth={2} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.ink }}>
              Anything happen to your hair?
            </span>
            <span style={{ display: 'block', fontSize: 11.5, color: C.muted, marginTop: 2 }}>
              A wash, a trim, a new install. Optional.
            </span>
          </span>
        </button>
      </div>
    );
  }

  // ── Expanded: chips, a date, an optional note ────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginTop: 20, padding: '18px 16px', borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, fontFamily: dm }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <p style={{ fontFamily: playfair, fontSize: 16, fontWeight: 500, color: C.ink, margin: 0 }}>
          What happened?
        </p>
        <button onClick={() => setDismissed(true)} aria-label="Close"
          style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', flexShrink: 0 }}>
          <X size={15} color={C.faint} strokeWidth={2} />
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
        {types.map(t => {
          const on = chosen === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setChosen(t.key)}
              style={{
                padding: '9px 14px', borderRadius: 100,
                border: `1.5px solid ${on ? C.green : C.line}`,
                background: on ? C.green : 'transparent',
                color: on ? C.onGreen : C.ink,
                fontFamily: dm, fontSize: 12.5, fontWeight: on ? 600 : 500,
                cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {chosen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: 11.5, color: C.faint, margin: '0 0 6px' }}>When</p>
            <input
              type="date"
              value={when}
              max={today()}
              onChange={e => setWhen(e.target.value)}
              style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 12, border: `1.5px solid ${C.line}`, background: 'rgba(255,255,255,0.04)', color: C.ink, fontFamily: dm, fontSize: 13, marginBottom: 12 }}
            />

            <p style={{ fontSize: 11.5, color: C.faint, margin: '0 0 6px' }}>Anything to add (optional)</p>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Knotless, medium, at Vera's"
              maxLength={140}
              style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 12, border: `1.5px solid ${C.line}`, background: 'rgba(255,255,255,0.04)', color: C.ink, fontFamily: dm, fontSize: 13, marginBottom: 16 }}
            />

            <button
              onClick={() => save(chosen)}
              disabled={saving}
              style={{
                width: '100%', height: 48, borderRadius: 14, border: 'none',
                background: saving ? C.line : C.greenDeep,
                color: saving ? C.muted : '#F2F7F1',
                fontFamily: dm, fontSize: 13.5, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Log it'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default HairEventPrompt;