// src/components/CaptureContext.tsx
//
// P3-1 — capture context, on one screen.
//
// Why it exists: two scalp photos are only comparable if the hair was in a
// similar state. Wet hair against dry hair looks like dramatic change and is
// nothing of the kind. Without this the app cannot honestly offer a comparison
// at all, which is the feature the product is built around.
//
// Why it looks like this: someone who opened the app to take a photo will not
// sit through four question screens. So it is ONE screen, three rows of pills,
// and every answer is prefilled from her last photo. The common case — same
// conditions as last time — is a single tap on "Same as last time".
//
// Deliberately dropped: the lighting question. It was the weakest of the four
// and the one people guess at, and a guessed answer is worse than none because
// matched comparison would treat it as real.
//
// Usage — between choosing an area and opening the camera:
//
//   const [context, setContext] = useState<CaptureContextValue | null>(null);
//   ...
//   {!context
//     ? <CaptureContext onDone={setContext} onBack={...} lastUsed={lastContext} />
//     : <Camera ... />}

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:      '#0A0908',
  card:    '#101A14',
  ink:     '#EAF0E9',
  muted:   'rgba(234,240,233,0.65)',
  faint:   'rgba(234,240,233,0.42)',
  line:    'rgba(110,158,130,0.16)',
  green:   '#6E9E82',
  greenDeep:'#4E7A63',
  soft:    'rgba(110,158,130,0.12)',
  onGreen: '#101A14',
};

export interface CaptureContextValue {
  hair_state:    'dry' | 'damp' | 'wet';
  hair_form:     'loose' | 'braided' | 'twisted' | 'locd' | 'stretched' | 'wig_or_weave' | 'cut_short';
  product_state: 'none' | 'light' | 'full';
}

const ROWS: {
  key: keyof CaptureContextValue;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: 'hair_state',
    label: 'Hair is',
    options: [
      { value: 'dry',  label: 'Dry' },
      { value: 'damp', label: 'Damp' },
      { value: 'wet',  label: 'Wet' },
    ],
  },
  {
    key: 'hair_form',
    label: 'Worn',
    options: [
      { value: 'loose',        label: 'Loose' },
      { value: 'braided',      label: 'Braided' },
      { value: 'twisted',      label: 'Twisted' },
      { value: 'locd',         label: 'Locs' },
      { value: 'stretched',    label: 'Stretched' },
      { value: 'wig_or_weave', label: 'Wig / weave' },
      { value: 'cut_short',    label: 'Cut short' },
    ],
  },
  {
    key: 'product_state',
    label: 'Product in it',
    options: [
      { value: 'none',  label: 'None' },
      { value: 'light', label: 'A little' },
      { value: 'full',  label: 'Fully styled' },
    ],
  },
];

const DEFAULTS: CaptureContextValue = {
  hair_state: 'dry',
  hair_form: 'loose',
  product_state: 'none',
};

const summarise = (v: CaptureContextValue) => {
  const find = (key: keyof CaptureContextValue) =>
    ROWS.find(r => r.key === key)!.options.find(o => o.value === v[key])?.label ?? '';
  const product = v.product_state === 'none' ? 'no product' : `${find('product_state').toLowerCase()} product`;
  return `${find('hair_state')}, ${find('hair_form').toLowerCase()}, ${product}`;
};

interface Props {
  onDone: (value: CaptureContextValue) => void;
  onBack?: () => void;
  /** Her answers from the last photo. Prefills the pills and enables the
   *  one-tap path. Null for a first-time user. */
  lastUsed?: CaptureContextValue | null;
}

const CaptureContext = ({ onDone, onBack, lastUsed }: Props) => {
  const [value, setValue] = useState<CaptureContextValue>(lastUsed ?? DEFAULTS);

  const set = (key: keyof CaptureContextValue, v: string) =>
    setValue(prev => ({ ...prev, [key]: v }) as CaptureContextValue);

  return (
    // Rendered as an overlay over HistoryPage, not as a page in a step flow,
    // so it centres itself rather than using .fs-flow's top offset.
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ fontFamily: dm }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={onBack} aria-label="Back"
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <ArrowLeft size={16} color={C.muted} strokeWidth={1.8} />
            </button>
          </div>

          <h2 style={{ fontFamily: playfair, fontSize: 21, fontWeight: 500, color: C.ink, margin: '0 0 6px', lineHeight: 1.25 }}>
                        Quick check before saving
          </h2>
          <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.65, margin: '0 0 22px' }}>
            So we only ever compare photos taken in the same conditions. Wet hair
            next to dry hair looks like a change that isn't really there.
          </p>

          {/* The one-tap path. Most people photograph in similar conditions
              each time, so this is the common case, not the exception. */}
          {lastUsed && (
            <button
              onClick={() => onDone(lastUsed)}
              style={{
                width: '100%', marginBottom: 22, padding: '15px 18px',
                borderRadius: 15, border: `1.5px solid ${C.green}`,
                background: C.soft, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ display: 'block', fontFamily: dm, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 3 }}>
                Same as last time
              </span>
              <span style={{ display: 'block', fontFamily: dm, fontSize: 12, color: C.muted }}>
                {summarise(lastUsed)}
              </span>
            </button>
          )}

          {lastUsed && (
            <p style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 14px' }}>
              Or change it
            </p>
          )}

          {/* Three rows of pills. Everything visible at once, nothing to scroll
              past on a phone, no transitions between questions. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 26 }}>
            {ROWS.map(row => (
              <div key={row.key}>
                <p style={{ fontSize: 11.5, color: C.faint, margin: '0 0 8px' }}>{row.label}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {row.options.map(opt => {
                    const on = value[row.key] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => set(row.key, opt.value)}
                        aria-pressed={on}
                        style={{
                          padding: '9px 15px', borderRadius: 100,
                          border: on ? `1.5px solid ${C.green}` : `1.5px solid ${C.line}`,
                          background: on ? C.green : C.card,
                          color: on ? C.onGreen : C.ink,
                          fontFamily: dm, fontSize: 13, fontWeight: on ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onDone(value)}
            style={{
              width: '100%', height: 52, borderRadius: 16, border: 'none',
              background: C.greenDeep, color: '#F2F7F1',
              fontFamily: dm, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Save the photo
          </button>

        </div>
      </div>
    </div>
  );
};

export default CaptureContext;