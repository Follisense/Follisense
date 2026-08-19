import { useState, useEffect, useRef, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, TrendingUp, ImageIcon, ChevronRight, Layers,
  Plus, AlertCircle, X, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useApp } from '@/contexts/AppContext';
import { analyseImage } from '@/lib/visionClient';
import { signPhotoUrls } from '@/services/photoUrlService';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:         '#0B0E0C',
  surface:    '#101512',
  ink:        '#EAF0E9',
  gold:       '#6E9E82',
  goldDeep:   '#4E7A63',
  gold10:     'rgba(110,158,130,0.10)',
  goldBorder: 'rgba(110,158,130,0.22)',
  mid:        'rgba(255,255,255,0.08)',
  muted:      'rgba(234,240,233,0.38)',
  warm:       'rgba(234,240,233,0.60)',
  white:      '#101A14',
  red:        '#E07060',
  red10:      'rgba(220,112,96,0.12)',
};

// Storage bucket for progress photos,must match your Supabase bucket name exactly
const UPLOAD_BUCKET = 'Checkin-photos';

const cardStyle: React.CSSProperties = {
  background: '#101A14', border: `1px solid rgba(110,158,130,0.12)`,
  borderRadius: 18, boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
};

interface CheckIn {
  id: string; user_id: string; type: string;
  symptoms: Record<string, any>;
  triage_result: 'green' | 'amber' | 'red' | null;
  triage_reasoning: string | null; notes: string | null;
  is_baseline: boolean; created_at: string;
  photos?: CheckInPhoto[];
}
interface CheckInPhoto {
  id: string; checkin_id: string; photo_url: string; region_tag: string; created_at: string;
}

// ─── PHOTO VALIDATION (Vision = gatekeeper only, no analysis) ────────────────
// Vision's ONLY job here is answering "is this a real photo of a scalp/hair?"
// It never scores, observes, or recommends. Photos are for the user's own
// visual tracking; all health data comes from symptom check-ins.
//
// NOTE: this is still the ORIGINAL substring-matching validator. The equivalent
// in ScalpBaselineCapture.tsx was rewritten (word-boundary matching, hair-presence
// gate, downscale before the call). This one has the same leaks and the same
// slowness. Left untouched on purpose,say the word and it gets the same treatment.
interface PhotoValidation {
  isScalp: boolean;
  validationReason: string;
}


const validateScalpImage = async (base64: string): Promise<PhotoValidation> => {
  try {
    const { labels, text: detectedText, safeSearch: safe } = await analyseImage(base64);
    console.log('[Vision] Labels:', labels);
    // ── Safe search,same threshold as ScalpBaselineCapture ──────────────
    
    if (safe.adult === 'VERY_LIKELY' || safe.violence === 'VERY_LIKELY') {
      return { isScalp: false, validationReason: 'Image flagged. Please use a different photo.' };
    }

    // ── Person/hair signal,same list as ScalpBaselineCapture ────────────
    const hasPersonSignal = ['hair', 'scalp', 'skin', 'head', 'person', 'human', 'face',
      'forehead', 'neck', 'hairline', 'hairstyle', 'afro', 'braid', 'loc', 'curl',
      'beauty', 'close-up', 'macro', 'portrait', 'nape'].some(k => labels.some(l => l.includes(k)));

    // ── Reject text/document images ───────────────────────────────────────
    
    const wordCount    = detectedText.trim().split(' ').filter((w: string) => w.length > 0).length;
    if (wordCount > 8 && !hasPersonSignal) {
      return { isScalp: false, validationReason: 'This looks like a text or document image. Please upload a real photo of your scalp or hairline.' };
    }

    // ── Reject animated/illustrated content ──────────────────────────────
    const fakeWords = ['cartoon', 'animation', 'animated', 'illustration', 'drawing',
      'clipart', 'skull', 'skeleton', 'diagram', '3d render', 'comic', 'manga', 'anime',
      'artwork', 'painting', 'fictional character', 'screenshot', 'font', 'software',
      'web page', 'website', 'graphic design', 'logo', 'icon'];
    if (fakeWords.some(k => labels.some(l => l.includes(k))) && !hasPersonSignal) {
      return { isScalp: false, validationReason: "This does not look like a real photo. Please upload a close-up of your scalp or hairline." };
    }

    // ── Reject clearly unrelated objects ─────────────────────────────────
    const junkWords = ['food', 'meal', 'dish', 'cuisine', 'car', 'vehicle', 'landscape',
      'plant', 'flower', 'tree', 'sky', 'furniture', 'shoe', 'map', 'animal', 'pet',
      'cat', 'dog', 'bird', 'electronics', 'gadget'];
    const hasJunk = junkWords.some(k => labels.some(l => l.includes(k)));
    if (hasJunk && !hasPersonSignal) {
      const found = labels.find(l => junkWords.some(k => l.includes(k))) || 'unrelated content';
      return { isScalp: false, validationReason: `This appears to show ${found}. Please upload a photo of your scalp or hairline.` };
    }

    return { isScalp: true, validationReason: 'scalp or hair area confirmed' };

  } catch (err) {
    // Fail open: validation being down should never block someone's tracking
    console.warn('[Vision] Error,failing open:', err);
    return { isScalp: true, validationReason: 'Validation unavailable,photo saved without checks' };
  }
};

const fileToBase64 = (file: File): Promise<{ base64: string; mediaType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, base64] = result.split(',');
      const mediaType = header.match(/data:(.*);/)?.[1] || 'image/jpeg';
      resolve({ base64, mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─── PHOTO UPLOADER SHEET ─────────────────────────────────────────────────────
// Flow: choose → validating → (invalid | confirm) → saved.
// The confirm step shows the photo and a save button,nothing else. No
// observations, no scores, no recommendations. The photo IS the record.
type UploadStep = 'choose' | 'validating' | 'invalid' | 'confirm' | 'error';

const PhotoUploadSheet = ({ onClose, onPhotoSaved, attachLabel }: {
  onClose: () => void;
  onPhotoSaved: (dataUrl: string) => void;
  attachLabel?: string | null;
}) => {
  const [step, setStep]             = useState<UploadStep>('choose');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const cameraRef                   = useRef<HTMLInputElement>(null);
  const galleryRef                  = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setStep('validating');
    try {
      const { base64, mediaType } = await fileToBase64(file);
      setBase64Data(`data:${mediaType};base64,${base64}`);
      const result = await validateScalpImage(base64);
      if (!result.isScalp) { setInvalidReason(result.validationReason); setStep('invalid'); return; }
      setStep('confirm');
    } catch { setStep('error'); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleRetry = () => { setStep('choose'); setPreviewUrl(null); setInvalidReason(null); setBase64Data(null); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ background: '#101A14', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 520, margin: '0 auto', padding: '20px 20px 40px', fontFamily: dm, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.mid, margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontFamily: playfair, fontSize: 18, fontWeight: 500, color: C.ink, margin: 0 }}>
            {step === 'choose' && (attachLabel ? `Add photo · ${attachLabel}` : 'Add progress photo')}
            {step === 'validating' && 'Checking image…'}
            {step === 'invalid' && 'Not a scalp image'}
            {step === 'confirm' && 'Ready to save'}
            {step === 'error' && 'Something went wrong'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color={C.muted} strokeWidth={1.8} />
          </button>
        </div>

        {step === 'choose' && (
          <div>
            <div style={{ background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: '12px 14px', marginBottom: 20, display: 'flex', gap: 8 }}>
              <Camera size={14} color={C.goldDeep} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontFamily: dm, fontSize: 12, color: C.goldDeep, margin: 0, lineHeight: 1.6 }}>
                {attachLabel
                  ? 'This photo will be attached to the selected check-in, so you can compare it against later ones.'
                  : 'We quickly check the photo shows your scalp or hair, then save it to your timeline. Same angle and lighting each time makes comparisons much easier.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Take photo', sub: 'Use camera', Icon: Camera, ref: cameraRef },
                { label: 'From gallery', sub: 'Choose existing', Icon: ImageIcon, ref: galleryRef },
              ].map((btn, i) => (
                <button key={i} onClick={() => btn.ref.current?.click()}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(110,158,130,0.12)', borderRadius: 18, cursor: 'pointer' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.gold10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <btn.Icon size={20} color={C.goldDeep} strokeWidth={1.5} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, margin: 0 }}>{btn.label}</p>
                    <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{btn.sub}</p>
                  </div>
                </button>
              ))}
            </div>
            <input ref={cameraRef}  type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handleInputChange} />
            <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInputChange} />
          </div>
        )}

        {step === 'validating' && (
          <div>
            {previewUrl && (
              <div style={{ borderRadius: 16, overflow: 'hidden', height: 200, marginBottom: 20 }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${C.mid}`, borderTopColor: C.gold }} />
              <p style={{ fontFamily: dm, fontSize: 14, color: C.ink, fontWeight: 500, margin: 0 }}>
                Checking this is a scalp image…
              </p>
              <p style={{ fontFamily: dm, fontSize: 12, color: C.muted, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                We verify every photo before it goes into your timeline.
              </p>
            </div>
          </div>
        )}

        {step === 'invalid' && (
          <div>
            {previewUrl && (
              <div style={{ borderRadius: 16, overflow: 'hidden', height: 180, marginBottom: 16, filter: 'brightness(0.65)' }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ background: C.red10, border: `1px solid rgba(176,80,64,0.25)`, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                <AlertCircle size={15} color={C.red} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.red, margin: 0 }}>Image not accepted</p>
              </div>
              <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: '0 0 0 23px', lineHeight: 1.6 }}>
                {invalidReason || 'Please upload a close-up of your scalp, hairline, or hair parting.'}
              </p>
            </div>
            <button onClick={handleRetry} style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', background: C.ink, color: '#101A14', fontFamily: dm, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Try a different photo
            </button>
          </div>
        )}

        {step === 'confirm' && previewUrl && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', height: 240, marginBottom: 16 }}>
              <img src={previewUrl} alt="Scalp" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <p style={{ fontFamily: dm, fontSize: 12, color: C.muted, margin: '0 0 16px', lineHeight: 1.6 }}>
              This goes into your timeline as-is,your own eyes, over time, are the tracker. Health data comes from your symptom check-ins.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleRetry} style={{ flex: 1, height: 46, borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)', fontFamily: dm, fontSize: 13, fontWeight: 500, color: 'rgba(245,239,230,0.45)', cursor: 'pointer' }}>Retake</button>
              <button onClick={() => { onPhotoSaved(base64Data || previewUrl); onClose(); }}
                style={{ flex: 2, height: 46, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #23392C, #101A14)', color: '#F5EFE6', fontFamily: dm, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Save to progress
              </button>
            </div>
          </motion.div>
        )}

        {step === 'error' && (
          <div>
            <div style={{ background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 8 }}>
              <AlertCircle size={15} color={C.goldDeep} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontFamily: dm, fontSize: 12, color: C.goldDeep, margin: 0, lineHeight: 1.6 }}>
                The photo check is temporarily unavailable. You can still save the photo.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleRetry} style={{ flex: 1, height: 46, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', fontFamily: dm, fontSize: 13, color: 'rgba(245,239,230,0.45)', cursor: 'pointer' }}>Try again</button>
              {previewUrl && (
                <button onClick={() => { onPhotoSaved(base64Data || previewUrl); onClose(); }}
                  style={{ flex: 2, height: 46, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #23392C, #101A14)', color: '#F5EFE6', fontFamily: dm, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Save anyway
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── WHAT THE USER LOGGED ─────────────────────────────────────────────────────
// This page no longer renders a derived score, a severity band, or a trend
// verdict. It shows the user her own entries, counted.
//
// The scoring pipeline (symptomScoring.ts) is untouched and still writes
// total_score at save time. That data is intact for the clinician summary;
// it simply does not surface in the patient view any more.
//
// Rules:
// 1. Meta keys (itch_score, total_score, risk_level…) are never symptoms.
// 2. A symptom "counts as reported" when its stored value is a string that is
//    not one of the explicit no-symptom answers below.
// 3. A check-in with symptom fields but every answer at no-symptom still
//    counts in the denominator,that is what makes "4 of 6" honest.
// 4. Photo-only entries (symptoms: {}) carry no symptom data and are excluded
//    from the denominator entirely.
const isMetaKey = (k: string) =>
  k.endsWith('_score') || k === 'total_score' || k === 'risk_level' ||
  k === 'pattern_flag' || k === 'ccca_flag';

// Every answer that means "nothing to report", taken from the 0-value entries
// in symptomScoring.ts. The old getTopSymptoms only knew about three of these,
// so answers like 'No breakage' were being counted as reported symptoms.
const NOT_REPORTED = new Set([
  'None', 'No', 'No change', 'Normal',
  'Feels normal', 'Soft and moisturised as usual',
  'No breakage', 'Looks healthy, no changes', 'No, hair feels normal',
]);

const SYMPTOM_LABELS: Record<string, string> = {
  itch:           'Itch',
  tenderness:     'Tenderness',
  hairline:       'Hairline change',
  flaking:        'Flaking',
  shedding:       'Shedding',
  irritation:     'Irritation',
  hairFeel:       'Hair feel',
  hairBreakage:   'Breakage',
  hairAppearance: 'Appearance',
  hairConcern:    'Hair concern',
  bumps:          'Bumps',
  dryness:        'Dryness',
};

const labelFor = (key: string) =>
  SYMPTOM_LABELS[key] ||
  key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();

// Does this check-in contain answered symptom fields at all?
const hasSymptomData = (symptoms: Record<string, any> | null | undefined): boolean => {
  if (!symptoms) return false;
  return Object.entries(symptoms).some(([k, v]) => !isMetaKey(k) && typeof v === 'string' && v.length > 0);
};

// Which symptoms did the user actually report in this check-in?
const reportedSymptoms = (symptoms: Record<string, any> | null | undefined): string[] => {
  if (!symptoms) return [];
  return Object.entries(symptoms)
    .filter(([k, v]) => !isMetaKey(k) && typeof v === 'string' && v.length > 0 && !NOT_REPORTED.has(v))
    .map(([k]) => k);
};

// A photo-only entry carries no health data. Deleting its last photo deletes
// the whole row,there is nothing left worth keeping.
const isPhotoOnly = (c: CheckIn) =>
  (c.type === 'visual' || c.type === 'progress_photo') && !c.is_baseline;

const formatDate      = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const formatShortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// How many recent check-ins the frequency card and the grid look at.
const WINDOW = 6;
// Below this many symptom check-ins the charts stay hidden and the user is
// asked to keep logging. One or two entries cannot show a pattern, and
// "itch 1 of 1" reads as broken.
const MIN_CHECKINS_FOR_CHART = 3;

// ─── FREQUENCY BARS ───────────────────────────────────────────────────────────
// "Itch · 4 of 6". A count of the user's own answers, with the denominator
// always visible. No weighting, no derived value.
const FrequencyBars = ({ rows, total }: {
  rows: { key: string; count: number }[];
  total: number;
}) => (
  <div>
    {rows.map((r, i) => (
      <div key={r.key} style={{ marginBottom: i < rows.length - 1 ? 13 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ fontFamily: dm, fontSize: 13, color: C.ink }}>{labelFor(r.key)}</span>
          <span style={{ fontFamily: dm, fontSize: 11, color: C.warm }}>{r.count} of {total}</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.round((r.count / Math.max(total, 1)) * 100)}%`, height: '100%', background: C.gold, borderRadius: 3 }} />
        </div>
      </div>
    ))}
  </div>
);

// ─── CHECK-IN GRID ────────────────────────────────────────────────────────────
// Rows are symptoms, columns are check-ins oldest to newest. A filled dot means
// the user reported it that day. This is the piece that carries change over
// time now that the score line is gone.
const CheckInGrid = ({ keys, columns }: {
  keys: string[];
  columns: { date: string; reported: Set<string> }[];
}) => (
  <div style={{ display: 'grid', gridTemplateColumns: `84px repeat(${columns.length}, minmax(0,1fr))`, gap: '0 4px', alignItems: 'center' }}>
    <div />
    {columns.map((col, i) => (
      <div key={`h-${i}`} style={{ fontFamily: dm, fontSize: 10, color: C.muted, textAlign: 'center' }}>{col.date}</div>
    ))}
    {keys.map(key => (
      <Fragment key={key}>
        <div style={{ fontFamily: dm, fontSize: 12, color: C.ink, padding: '9px 0' }}>{labelFor(key)}</div>
        {columns.map((col, i) => (
          <div key={`${key}-${i}`} style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              title={`${labelFor(key)} · ${col.date} · ${col.reported.has(key) ? 'reported' : 'not reported'}`}
              style={{ width: 11, height: 11, borderRadius: '50%', background: col.reported.has(key) ? C.gold : 'rgba(255,255,255,0.09)' }}
            />
          </div>
        ))}
      </Fragment>
    ))}
  </div>
);

// ─── PHOTO CARD ───────────────────────────────────────────────────────────────
// Only ever rendered for entries that HAVE photos. Removing the last photo of a
// photo-only entry removes this card entirely (see handleDeletePhoto).
// No severity badge and no triage_reasoning text,a photo card shows the photo
// and when it was taken.
const PhotoCard = ({ checkin, onDeletePhoto }: {
  checkin: CheckIn;
  onDeletePhoto: (photo: CheckInPhoto) => void;
}) => {
  const photos = checkin.photos || [];
  const [idx, setIdx] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const current = photos[Math.min(idx, Math.max(photos.length - 1, 0))];
  const photoOnly = isPhotoOnly(checkin);

  const handleDeleteTap = () => {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 2500); return; }
    setConfirmDelete(false);
    if (current) { onDeletePhoto(current); setIdx(0); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...cardStyle, overflow: 'hidden', borderRadius: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 190, position: 'relative', background: `url(${current?.photo_url}) center/cover` }}>
        {checkin.is_baseline && <div style={{ position: 'absolute', top: 12, left: 12, background: C.gold, borderRadius: 20, padding: '3px 10px', fontFamily: dm, fontSize: 10, fontWeight: 700, color: '#101A14' }}>Baseline</div>}

        {/* Two-tap confirm. For a photo-only entry this removes the whole card. */}
        {current?.photo_url && (
          <button onClick={handleDeleteTap}
            style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 5, background: confirmDelete ? 'rgba(176,80,64,0.9)' : 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 100, padding: '5px 10px', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'background 0.15s' }}>
            <Trash2 size={11} color="#fff" strokeWidth={2} />
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: '#fff' }}>{confirmDelete ? 'Tap to confirm' : 'Remove'}</span>
          </button>
        )}

        {photos.length > 1 && (
          <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 6, background: 'rgba(255,255,255,0.88)', borderRadius: 20, padding: '4px 8px', backdropFilter: 'blur(6px)', border: `1px solid ${C.mid}` }}>
            {photos.map((p, i) => (
              <button key={i} onClick={() => { setIdx(i); setConfirmDelete(false); }} style={{ fontFamily: dm, fontSize: 10, fontWeight: 600, color: idx === i ? C.goldDeep : C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '1px 6px' }}>
                {p.region_tag || `Photo ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 16px' }}>
        <p style={{ fontFamily: playfair, fontSize: 14, fontWeight: 500, color: C.ink, margin: 0 }}>{formatDate(checkin.created_at)}</p>
        <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
          {photoOnly ? 'progress photo' : checkin.type} · {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </p>
      </div>
    </motion.div>
  );
};

// Read-only card for onboarding baseline photos that only exist in local context
// (i.e. they never made it into checkin_photos). No remove button,there is no
// database row to delete.
const LocalBaselineCard = ({ photo, date }: { photo: { area: string; dataUrl: string }; date: string | null }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    style={{ ...cardStyle, overflow: 'hidden', borderRadius: 20 }}>
    <div style={{ height: 190, position: 'relative' }}>
      <img src={photo.dataUrl} alt={photo.area} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <div style={{ position: 'absolute', top: 12, left: 12, background: C.gold, borderRadius: 20, padding: '3px 10px', fontFamily: dm, fontSize: 10, fontWeight: 700, color: '#101A14' }}>Baseline</div>
    </div>
    <div style={{ padding: '12px 16px' }}>
      <p style={{ fontFamily: playfair, fontSize: 14, fontWeight: 500, color: C.ink, margin: 0 }}>{photo.area}</p>
      <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{date ? formatDate(date) : 'From onboarding'}</p>
    </div>
  </motion.div>
);

const MetricCard = ({ label, value }: { label: string; value: string | number }) => (
  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(110,158,130,0.10)', borderRadius: 16, padding: '12px 14px' }}>
    <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: 0 }}>{label}</p>
    <p style={{ fontFamily: dm, fontSize: 20, fontWeight: 700, color: C.ink, margin: '3px 0 0' }}>{value}</p>
  </div>
);

const EmptyState = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(110,158,130,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>{icon}</div>
    <p style={{ fontFamily: playfair, fontSize: 17, color: C.ink, marginBottom: 8 }}>{title}</p>
    <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{desc}</p>
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
type Tab = 'photos' | 'health';

const HistoryPage = () => {
  const { baselinePhotos, baselineDate } = useApp();
  const [tab, setTab]               = useState<Tab>('photos');
  const [checkins, setCheckins]     = useState<CheckIn[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA]     = useState(0);
  const [compareB, setCompareB]     = useState(1);
  const [showUploader, setShowUploader] = useState(false);
  // When set, the uploader attaches the photo to this existing check-in instead of creating a new one
  const [attachTarget, setAttachTarget] = useState<{ checkinId: string; label: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setError('Not logged in'); setLoading(false); return; }
      const { data: checkinsData, error: checkinsError } = await supabase
        .from('checkins').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (checkinsError) throw checkinsError;
      if (!checkinsData || checkinsData.length === 0) { setCheckins([]); setLoading(false); return; }
      const checkinIds = checkinsData.map(c => c.id);
      const { data: photosData } = await supabase
        .from('checkin_photos').select('*').in('checkin_id', checkinIds).order('created_at', { ascending: true });
      // The bucket is private, so stored values must be signed before they can
      // render. One request covers every photo on the page.
      const signed = await signPhotoUrls((photosData || []).map(p => p.photo_url));

      const photosMap: Record<string, CheckInPhoto[]> = {};
      (photosData || []).forEach(p => {
        if (!photosMap[p.checkin_id]) photosMap[p.checkin_id] = [];
        photosMap[p.checkin_id].push({ ...p, photo_url: signed[p.photo_url] ?? p.photo_url });
      });
      setCheckins(checkinsData.map(c => ({ ...c, photos: photosMap[c.id] || [] })));
    } catch (err: any) {
      setError(err?.message || 'Could not load your history.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Save photo: upload to storage, then attach to existing check-in OR create a new progress entry ──
  // No local savedPhotos mirror any more,fetchData is the single source of truth,
  // so a photo can never appear twice or survive its own deletion.
  const handlePhotoSaved = async (dataUrl: string) => {
    const target = attachTarget;
    setAttachTarget(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;

      const blob = await (await fetch(dataUrl)).blob();
      const path = `${uid}/progress-${Date.now()}.jpg`;

      const { error: upErr } = await supabase.storage
        .from(UPLOAD_BUCKET)
        .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
      if (upErr) throw upErr;

      // Store the object path; signed at render time. getPublicUrl is
      // meaningless on a private bucket.
      const photoUrl = path;

      let checkinId = target?.checkinId;

      // No target → create a standalone progress_photo entry.
      // NOTE: symptoms stays {} and triage_result stays null on purpose —
      // photo entries carry no symptom data and are excluded from the counts.
      if (!checkinId) {
        const { data: ci, error: ciErr } = await supabase.from('checkins').insert({
          user_id:       uid,
          type:          'visual',
          symptoms:      {},
          triage_result: null,
          is_baseline:   false,
          notes:         null,
        }).select('id').single();
        if (ciErr || !ci) throw ciErr || new Error('Check-in insert failed');
        checkinId = ci.id;
      }

      const { error: phErr } = await supabase.from('checkin_photos').insert({
        checkin_id: checkinId,
        user_id:    uid,
        photo_url:  photoUrl,
        region_tag: 'general',
      });
      if (phErr) throw phErr;

      fetchData();
    } catch (e) {
      console.error('[History] photo persist failed:', e);
      setError('That photo could not be saved. Please try again.');
    }
  };

  // ── Delete a photo ──
  // Photo row + storage file always go. If the parent was a photo-only entry and
  // this was its last photo, the check-in row goes too,otherwise you are left
  // with an empty ghost card. Symptom check-ins keep their row and their data;
  // they simply stop appearing in the photos tab.
  const handleDeletePhoto = async (photo: CheckInPhoto) => {
    const parent    = checkins.find(c => c.id === photo.checkin_id);
    const remaining = (parent?.photos || []).filter(p => p.id !== photo.id);
    const dropParent = !!parent && isPhotoOnly(parent) && remaining.length === 0;

    // Optimistic UI
    setCheckins(prev => dropParent
      ? prev.filter(c => c.id !== photo.checkin_id)
      : prev.map(c => c.id === photo.checkin_id ? { ...c, photos: remaining } : c));

    try {
      const { error: delErr } = await supabase.from('checkin_photos').delete().eq('id', photo.id);
      if (delErr) throw delErr;

      // Best-effort storage cleanup,derive path from the public URL
      const marker = `/object/public/${UPLOAD_BUCKET}/`;
      const i = photo.photo_url.indexOf(marker);
      if (i !== -1) {
        const path = decodeURIComponent(photo.photo_url.slice(i + marker.length));
        await supabase.storage.from(UPLOAD_BUCKET).remove([path]);
      }

      if (dropParent) {
        const { error: ciErr } = await supabase.from('checkins').delete().eq('id', photo.checkin_id);
        if (ciErr) throw ciErr;
      }
    } catch (e) {
      console.error('[History] photo delete failed:', e);
      fetchData(); // restore truth from server if the delete failed
    }
  };

  const openAttachUploader = (checkinId: string, label: string) => {
    setAttachTarget({ checkinId, label });
    setShowUploader(true);
  };

  // ── Health tab data: SYMPTOM check-ins only, newest first ──
  // Photo-only entries and malformed rows are excluded from every count.
  const symptomCheckins = checkins
    .filter(c => hasSymptomData(c.symptoms))
    .map(c => ({ ...c, reported: reportedSymptoms(c.symptoms) }));

  // The window both charts describe. Oldest → newest for the grid.
  const windowNewestFirst = symptomCheckins.slice(0, WINDOW);
  const windowOldestFirst = [...windowNewestFirst].reverse();
  const windowTotal       = windowNewestFirst.length;

  // Frequency across the window. Sorted most reported first.
  const frequencyRows = (() => {
    const counts: Record<string, number> = {};
    windowNewestFirst.forEach(c => c.reported.forEach(k => { counts[k] = (counts[k] || 0) + 1; }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }));
  })();

  // Grid rows: the symptoms that actually appear in the window, capped so the
  // grid stays readable on a phone.
  const gridKeys    = frequencyRows.slice(0, 5).map(r => r.key);
  const gridColumns = windowOldestFirst.map(c => ({
    date: formatShortDate(c.created_at),
    reported: new Set(c.reported),
  }));

  const checkinsWithPhotos = checkins.filter(c => (c.photos?.length || 0) > 0);

  // Onboarding baseline photos only render from local context when they never
  // made it into checkin_photos,otherwise the same photo would show twice.
  const baselineInDb    = checkins.some(c => c.is_baseline && (c.photos?.length || 0) > 0);
  const localBaselines  = baselineInDb
    ? []
    : baselinePhotos.filter((p): p is typeof p & { dataUrl: string } => !!p.dataUrl);
  const totalPhotoCount = checkinsWithPhotos.reduce((n, c) => n + (c.photos?.length || 0), 0) + localBaselines.length;

  const firstCheckinMonth = symptomCheckins.length > 0
    ? new Date(symptomCheckins[symptomCheckins.length - 1].created_at).toLocaleDateString('en-GB', { month: 'short' })
    : '—';

  const enoughForCharts = symptomCheckins.length >= MIN_CHECKINS_FOR_CHART;
  const remainingToChart = Math.max(MIN_CHECKINS_FOR_CHART - symptomCheckins.length, 0);

  // Responsive rules live here because inline styles cannot carry media queries.
  const responsiveCss = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
    @keyframes spin { to { transform: rotate(360deg) } }
    .fs-shell { max-width: 1080px; margin: 0 auto; width: 100%; }
    .fs-hero { padding: 52px 20px 24px; }
    .fs-body { padding: 20px 20px 0; }
    .fs-metrics { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; }
    .fs-photo-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 14px; }
    .fs-health { display: grid; grid-template-columns: minmax(0,1fr); gap: 16px; align-items: start; max-width: 760px; }
    .fs-tabs { display: flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.07); border-radius: 14px; }
    @media (min-width: 700px) {
      .fs-photo-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
    }
    @media (min-width: 900px) {
      .fs-hero { padding: 44px 24px 20px; }
      .fs-body { padding: 20px 24px 0; }
      .fs-tabs { max-width: 380px; }
    }
    @media (min-width: 1000px) {
      .fs-photo-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
    }
  `;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0908', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{responsiveCss}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${C.mid}`, borderTopColor: C.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontFamily: dm, fontSize: 13, color: C.muted }}>Loading your history…</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0A0908', paddingBottom: 100, fontFamily: dm }}>
      <style>{responsiveCss}</style>

      {/* Hero,flat black, no gradient */}
      <div className="fs-hero" style={{ background: '#0A0908' }}>
        <div className="fs-shell">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold }} />
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: 'rgba(110,158,130,0.9)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>FolliSense</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
            <h1 style={{ fontFamily: playfair, fontSize: 26, fontWeight: 500, color: '#F5EFE6', margin: 0, lineHeight: 1.2 }}>Progress</h1>
            <div className="fs-tabs" style={{ flex: '1 1 260px' }}>
              {([{ id: 'photos' as Tab, label: 'Hair Photos', Icon: Camera }, { id: 'health' as Tab, label: 'Scalp Health', Icon: TrendingUp }]).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 10, fontFamily: dm, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: tab === t.id ? C.gold : 'transparent', color: tab === t.id ? '#101A14' : 'rgba(255,255,255,0.4)', boxShadow: tab === t.id ? `0 2px 10px rgba(110,158,130,0.4)` : 'none' }}>
                  <t.Icon size={13} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary metrics,counts only, no average score */}
          {(symptomCheckins.length > 0 || totalPhotoCount > 0) && (
            <div className="fs-metrics">
              <MetricCard label="Check-ins" value={symptomCheckins.length} />
              <MetricCard label="Photos" value={totalPhotoCount} />
              <MetricCard label="Since" value={firstCheckinMonth} />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="fs-body">
        <div className="fs-shell">
          {error && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px', borderRadius: 14, background: 'rgba(176,80,64,0.08)', border: '1px solid rgba(176,80,64,0.2)', marginBottom: 16 }}>
              <AlertCircle size={16} color="#B05040" />
              <p style={{ fontFamily: dm, fontSize: 13, color: '#B05040', margin: 0 }}>{error}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {tab === 'photos' && (
              <motion.div key="photos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {checkinsWithPhotos.length === 0 && localBaselines.length === 0 ? (
                  <>
                    <EmptyState icon={<Camera size={28} color={C.goldDeep} />} title="No photos yet" desc="Add your first progress photo, or complete a check-in with photos, to start tracking visually." />
                    <button onClick={() => { setAttachTarget(null); setShowUploader(true); }}
                      style={{ width: '100%', maxWidth: 320, margin: '0 auto', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, border: `1.5px dashed ${C.goldBorder}`, background: 'rgba(110,158,130,0.08)', fontFamily: dm, color: C.gold, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                      <Plus size={16} /> Add progress photo
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                      <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                        All photos · newest first
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {checkinsWithPhotos.length >= 2 && (
                          <button onClick={() => setCompareMode(m => !m)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: dm, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${C.mid}`, cursor: 'pointer', background: compareMode ? C.gold10 : C.surface, color: compareMode ? C.goldDeep : C.muted }}>
                            <Layers size={12} /> {compareMode ? 'Exit compare' : 'Compare'}
                          </button>
                        )}
                        <button onClick={() => { setAttachTarget(null); setShowUploader(true); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: dm, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${C.goldBorder}`, cursor: 'pointer', background: 'rgba(110,158,130,0.08)', color: C.gold }}>
                          <Plus size={12} /> Add photo
                        </button>
                      </div>
                    </div>

                    {compareMode && checkinsWithPhotos.length >= 2 && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        style={{ ...cardStyle, padding: 16, marginBottom: 16, borderRadius: 20, background: '#101A14' }}>
                        <p style={{ fontFamily: playfair, fontSize: 14, fontWeight: 500, color: C.ink, marginBottom: 12 }}>Side-by-side</p>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                          {[{ val: compareA, set: setCompareA, label: 'Earlier' }, { val: compareB, set: setCompareB, label: 'Later' }].map((s, idx) => (
                            <div key={idx} style={{ flex: 1 }}>
                              <p style={{ fontFamily: dm, fontSize: 10, color: C.muted, marginBottom: 4 }}>{s.label}</p>
                              <select value={s.val} onChange={e => s.set(Number(e.target.value))} style={{ width: '100%', fontFamily: dm, fontSize: 12, padding: '7px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: '#F5EFE6', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}>
                                {checkinsWithPhotos.map((c, i) => <option key={i} value={i}>{formatDate(c.created_at)}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {[compareA, compareB].map((idx, col) => {
                            const entry = checkinsWithPhotos[idx];
                            const photo = entry?.photos?.[0];
                            return (
                              <div key={col}>
                                <div style={{ height: 200, borderRadius: 14, background: photo?.photo_url ? `url(${photo.photo_url}) center/cover` : `linear-gradient(160deg, ${C.gold10}, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${C.mid}` }}>
                                  {!photo?.photo_url && <ImageIcon size={18} color={C.gold} opacity={0.5} />}
                                </div>
                                <p style={{ fontFamily: dm, fontSize: 10, color: C.muted, marginTop: 6, textAlign: 'center' }}>{entry ? formatDate(entry.created_at) : ''}</p>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* One unified grid. Only entries that actually have photos. */}
                    <div className="fs-photo-grid">
                      {checkinsWithPhotos.map(c => (
                        <PhotoCard key={c.id} checkin={c} onDeletePhoto={handleDeletePhoto} />
                      ))}
                      {localBaselines.map((p, i) => (
                        <LocalBaselineCard key={`local-${i}`} photo={p} date={baselineDate} />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {tab === 'health' && (
              <motion.div key="health" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {symptomCheckins.length === 0 ? (
                  <EmptyState icon={<TrendingUp size={28} color={C.goldDeep} />} title="Nothing logged yet" desc="Complete your first scalp check-in and what you log will start showing up here." />
                ) : (
                  <>
                    {!enoughForCharts && (
                      <div style={{ ...cardStyle, borderRadius: 18, padding: '18px 18px 16px', marginBottom: 16, maxWidth: 760 }}>
                        <p style={{ fontFamily: playfair, fontSize: 15, fontWeight: 500, color: C.ink, margin: 0 }}>Keep logging</p>
                        <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: '6px 0 14px', lineHeight: 1.6 }}>
                          You have {symptomCheckins.length} check-in{symptomCheckins.length !== 1 ? 's' : ''} so far.
                          Log {remainingToChart} more and your patterns will appear here.
                        </p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {Array.from({ length: MIN_CHECKINS_FOR_CHART }).map((_, i) => (
                            <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < symptomCheckins.length ? C.gold : 'rgba(255,255,255,0.07)' }} />
                          ))}
                        </div>
                      </div>
                    )}

                    {enoughForCharts && (
                      <div className="fs-health" style={{ marginBottom: 16 }}>
                        <div style={{ background: '#101A14', border: '1px solid rgba(110,158,130,0.12)', borderRadius: 18, padding: '16px 16px 14px' }}>
                          <p style={{ fontFamily: playfair, fontSize: 15, fontWeight: 500, color: C.ink, margin: 0 }}>What you've logged</p>
                          <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '2px 0 16px' }}>
                            Across your last {windowTotal} check-in{windowTotal !== 1 ? 's' : ''}
                          </p>
                          {frequencyRows.length > 0 ? (
                            <FrequencyBars rows={frequencyRows} total={windowTotal} />
                          ) : (
                            <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: 0, lineHeight: 1.6 }}>
                              You have not reported any symptoms in this period.
                            </p>
                          )}
                        </div>

                        {gridKeys.length > 0 && (
                          <div style={{ background: '#101A14', border: '1px solid rgba(110,158,130,0.12)', borderRadius: 18, padding: 16 }}>
                            <p style={{ fontFamily: playfair, fontSize: 15, fontWeight: 500, color: C.ink, margin: 0 }}>Check-in by check-in</p>
                            <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '2px 0 14px' }}>
                              A filled dot means you reported it that day
                            </p>
                            <CheckInGrid keys={gridKeys} columns={gridColumns} />
                          </div>
                        )}
                      </div>
                    )}

                    <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Check-in log</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 760 }}>
                      {symptomCheckins.map((c, i) => (
                        <motion.div key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                          style={{ background: '#101A14', border: '1px solid rgba(110,158,130,0.10)', borderRadius: 16, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.gold10, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontFamily: dm, fontSize: 14, fontWeight: 600, color: C.gold }}>{c.reported.length}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: playfair, fontSize: 14, fontWeight: 500, color: C.ink, margin: 0 }}>{formatDate(c.created_at)}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: dm, fontSize: 11, color: C.warm }}>
                                {c.reported.length === 0
                                  ? 'nothing reported'
                                  : `${c.reported.length} thing${c.reported.length !== 1 ? 's' : ''} logged`}
                              </span>
                              <span style={{ fontFamily: dm, fontSize: 10, color: C.muted }}>· {c.is_baseline ? 'baseline' : c.type}</span>
                              {(c.photos?.length || 0) > 0 && (
                                <span style={{ fontFamily: dm, fontSize: 10, color: C.muted }}>· {c.photos?.length} photo{(c.photos?.length || 0) !== 1 ? 's' : ''}</span>
                              )}
                            </div>
                          </div>
                          {/* Attaching a photo to an existing check-in lives here now,
                              the photos tab no longer renders photo-less cards. */}
                          <button onClick={() => openAttachUploader(c.id, formatShortDate(c.created_at))}
                            title="Add a photo to this check-in"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(110,158,130,0.10)', border: `1px solid ${C.goldBorder}`, borderRadius: 100, padding: '5px 10px', cursor: 'pointer', flexShrink: 0 }}>
                            <Camera size={11} color={C.gold} strokeWidth={2} />
                            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.gold }}>Photo</span>
                          </button>
                          <ChevronRight size={14} color={C.mid} />
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showUploader && (
          <PhotoUploadSheet
            onClose={() => { setShowUploader(false); setAttachTarget(null); }}
            onPhotoSaved={handlePhotoSaved}
            attachLabel={attachTarget?.label ?? null}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistoryPage;