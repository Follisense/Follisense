import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, ExternalLink, CheckCircle2, ChevronRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabaseClient';
// GUARD: quiz stems are illustrations only, never the user's own photo.
//
// Showing someone their own scalp beside "which of these is traction alopecia"
// makes the app appear to answer that question about them. That is a diagnosis
// however the copy is worded, and it is the line this product does not cross.
//
// If a future version wants personalised practice, the answer is a clinician
// looking at the photo, not a quiz.
// ─── CONDITION IMAGES ───
import imgTraction     from '@/assets/conditions/tractionalopecia-knowit.webp';
import imgFphl         from '@/assets/conditions/hairthinning-knowit.webp';
import imgMphl         from '@/assets/conditions/mphl-knowit.webp';
import imgFfa          from '@/assets/conditions/fffa-knowit.webp';
import imgSebDerm      from '@/assets/conditions/seborrheicdermatitis-knowit.webp';
import imgFolliculitis from '@/assets/conditions/sorenessfrombraids-knowit.webp';
import imgChemical     from '@/assets/conditions/chemicalirritation-knowit.webp';
import imgTension      from '@/assets/conditions/sorenessfrombraids-knowit.webp';

const conditionImageMap: Record<string, string> = {
  'traction-alopecia':          imgTraction,
  'fphl':                       imgFphl,
  'mphl':                       imgMphl,
  'frontal-fibrosing-alopecia': imgFfa,
  'seborrheic-dermatitis':      imgSebDerm,
  'folliculitis':               imgFolliculitis,
  'chemical-damage':            imgChemical,
  'tension-soreness':           imgTension,
};

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:         '#F8F8F8',
  ink:        '#1C1C1C',
  gold:       '#4E7A63',
  goldDeep:   '#2E4A39',
  gold10:     'rgba(46,74,57,0.10)',
  goldBorder: 'rgba(46,74,57,0.28)',
  mid:        '#E8DED1',
  muted:      '#999999',
  warm:       '#666666',
  white:      '#FAF8F5',
  green:      '#4A7C6F',
  green10:    'rgba(74,124,111,0.10)',
  greenBorder:'rgba(74,124,111,0.28)',
  clay:       '#B8724F',
  red:        '#B05040',
  red10:      'rgba(176,80,64,0.10)',
};

// ─── SYMPTOM OPTIONS ──────────────────────────────────────────────────────────
const symptomOptions = [
  { id: 'itching',            label: 'Itching',                       description: 'Persistent or recurring itch anywhere on the scalp',                              icon: '🔥' },
  { id: 'flaking',            label: 'Flaking or buildup',            description: 'White or yellowish flakes, oily or dry residue on scalp',                        icon: '🫧' },
  { id: 'redness',            label: 'Redness or irritation',         description: 'Pink, red, or inflamed patches on the scalp',                                    icon: '🔴' },
  { id: 'bumps',              label: 'Bumps (folliculitis)',           description: 'Small pimple-like bumps at hair follicles',                                      icon: '⚡' },
  { id: 'hairline-thinning',  label: 'Thinning at hairline or edges', description: 'Hair loss concentrated around temples, edges, or where styles grip',             icon: '📍' },
  { id: 'hairline-recession', label: 'Hairline moving backward',      description: 'Gradual, even recession of the frontal hairline',                                 icon: '↗️' },
  { id: 'crown-thinning',     label: 'Thinning at the crown',         description: 'Hair becoming sparse or see-through at the top of the head',                     icon: '🎯' },
  { id: 'widening-part',      label: 'Widening part line',            description: 'Your part line is becoming wider or more visible over time',                      icon: '📏' },
  { id: 'tenderness',         label: 'Tenderness or soreness',        description: 'Pain or sensitivity when touching the scalp',                                     icon: '💢' },
  { id: 'nothing',            label: 'Nothing concerning',            description: 'Just exploring,no current issues',                                              icon: '✅' },
];

// ─── MATCH LOGIC ─────────────────────────────────────────────────────────────
interface ConditionMatch {
  conditionId: string; name: string; likelihood: 'possible' | 'likely';
  message: string;
  causes: string[];
  mayNotice: string[];
  nextStep: string;
  severity: 'mild' | 'moderate' | 'severe';
}

const getMatches = (selected: string[], gender?: string): ConditionMatch[] => {
  const isMale    = gender === 'man';
  const isFemale  = gender === 'woman';
  const isNeutral = !isMale && !isFemale;
  const matches: ConditionMatch[] = [];

  if (selected.includes('hairline-thinning'))
    matches.push({
      conditionId: 'traction-alopecia', name: 'Thinning edges',
      likelihood: selected.includes('tenderness') ? 'likely' : 'possible',
      message: 'Hair loss at the temples and front hairline, often caused by repeated tension from hairstyles.',
      causes: ['Tight braids, weaves or ponytails', 'Repeated tension on the hairline', 'Heavy styles or extensions', 'Wearing styles for long periods'],
      mayNotice: ['Receding hairline', 'Thinner edges', 'Short, fragile hairs', 'Breakage and shedding'],
      nextStep: 'Early changes can improve with less tension and care.',
      severity: selected.includes('tenderness') ? 'moderate' : 'mild',
    });

  if (selected.includes('crown-thinning')) {
    if (isFemale || isNeutral)
      matches.push({
        conditionId: 'fphl', name: 'Widening part',
        likelihood: selected.includes('widening-part') ? 'likely' : 'possible',
        message: 'Gradual thinning at the crown and along the part line, common in women over time.',
        causes: ['Family history', 'Hormonal changes', 'Age-related follicle changes'],
        mayNotice: ['A wider part line', 'Less density at the crown', 'More scalp showing through', 'A thinner ponytail'],
        nextStep: 'A dermatologist or trichologist can assess this properly, and photos help track any change.',
        severity: 'mild',
      });
  }

  if (selected.includes('hairline-recession')) {
    if (isMale || isNeutral)
      matches.push({
        conditionId: 'mphl', name: 'Receding hairline',
        likelihood: selected.includes('crown-thinning') ? 'likely' : 'possible',
        message: 'Gradual recession at the temples and thinning at the crown, common in men over time.',
        causes: ['Family history', 'Hormonal factors', 'Age'],
        mayNotice: ['An M-shaped hairline', 'Thinning at the crown', 'Slower regrowth', 'Finer hairs at the temples'],
        nextStep: 'A dermatologist can assess the pattern, and tracking with photos shows how fast it is changing.',
        severity: 'moderate',
      });
    matches.push({
      conditionId: 'frontal-fibrosing-alopecia', name: 'Even hairline recession',
      likelihood: 'possible',
      message: 'A smooth, even band of recession along the front hairline that can develop gradually.',
      causes: ['Not fully understood', 'More common after menopause', 'Possible immune involvement'],
      mayNotice: ['A band of smooth, shiny skin', 'The hairline moving back evenly', 'Eyebrow thinning', 'Itch or tenderness along the hairline'],
      nextStep: 'Seeing a dermatologist early matters here,mention any eyebrow changes too.',
      severity: 'moderate',
    });
  }

  if (selected.includes('flaking'))
    matches.push({
      conditionId: 'seborrheic-dermatitis', name: 'Flaky, irritated scalp',
      likelihood: selected.includes('redness') ? 'likely' : 'possible',
      message: 'Flaking, redness and itchiness caused by excess oil and yeast on the scalp,common and manageable, not poor hygiene.',
      causes: ['Excess oil production', 'Yeast overgrowth', 'Stress or hormonal changes', 'Product build-up or infrequent washing'],
      mayNotice: ['Flakes or dandruff', 'Itching', 'Redness', 'Oily or greasy scalp'],
      nextStep: 'Consistent scalp cleansing helps reduce flakes and irritation. A pharmacist or dermatologist can guide you further.',
      severity: 'mild',
    });

  if (selected.includes('bumps'))
    matches.push({
      conditionId: 'folliculitis', name: 'Scalp bumps',
      likelihood: 'possible',
      message: 'Small bumps around hair follicles that can appear after tight styles, sweat or product build-up.',
      causes: ['Tight braids or cornrows', 'Sweat and trapped moisture', 'Product build-up', 'Bacteria or yeast'],
      mayNotice: ['Small bumps', 'Tenderness', 'Itching', 'Mild soreness'],
      nextStep: 'Early care can help prevent worsening irritation. If bumps spread or hurt, a clinician should look.',
      severity: selected.includes('tenderness') ? 'moderate' : 'mild',
    });

  if (selected.includes('redness') && !selected.includes('flaking') && !selected.includes('bumps'))
    matches.push({
      conditionId: 'chemical-damage', name: 'Scalp irritation',
      likelihood: 'possible',
      message: 'Redness or irritation that can follow a chemical treatment, heat styling, or a product that does not agree with your scalp.',
      causes: ['Recent relaxer or dye', 'Heat styling', 'A new or harsh product', 'Sensitive skin'],
      mayNotice: ['Redness near the hairline', 'Dryness or tightness', 'Stinging or itching', 'Flaking at the edges'],
      nextStep: 'Giving the area a break from chemicals and heat lets it settle. If it worsens, see a clinician.',
      severity: 'mild',
    });

  if (selected.includes('tenderness') && !selected.includes('hairline-thinning') && !selected.includes('crown-thinning') && !selected.includes('bumps'))
    matches.push({
      conditionId: 'tension-soreness', name: 'Tension soreness',
      likelihood: 'possible',
      message: "Scalp pain from styling tension. If your style feels tight, that's your scalp telling you something.",
      causes: ['A style installed too tightly', 'Heavy extensions', 'Tension held for long periods'],
      mayNotice: ['Soreness at braid roots', 'Small raised bumps at tension points', 'Headache-like scalp ache', 'Pain when moving the style'],
      nextStep: 'Loosening the tightest sections gives your scalp relief,pain after installation is a warning sign, not something to tough out.',
      severity: 'mild',
    });

  return matches;
};

const severityColor = (s: string) =>
  s === 'severe' ? C.red : s === 'moderate' ? C.clay : C.green;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const KnowIt = () => {
  const navigate = useNavigate();
  const { addQuickLog, onboardingData } = useApp();

  const [step, setStep]           = useState<1 | 2>(1);
  const [selected, setSelected]   = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const isMale = onboardingData?.gender === 'man';

  const toggleSymptom = (id: string) => {
    if (id === 'nothing') { setSelected(['nothing']); return; }
    setSelected(prev => {
      const f = prev.filter(x => x !== 'nothing');
      return f.includes(id) ? f.filter(x => x !== id) : [...f, id];
    });
  };

  const matches         = getMatches(selected, onboardingData?.gender);
  const nothingSelected = selected.includes('nothing');
  const canProceed      = selected.length > 0;

  const handleSaveAndFinish = async () => {
    const symptomLabels   = selected.map(id => symptomOptions.find(o => o.id === id)?.label || id);
    const overallSeverity = matches.some(m => m.severity === 'severe') ? 'Severe'
      : matches.some(m => m.severity === 'moderate') ? 'Moderate' : 'Mild';

    addQuickLog({
      id:       `spot-${Date.now()}`,
      date:     new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      symptoms: symptomLabels,
      severity: nothingSelected ? 'None' : overallSeverity,
    });

    
  
    navigate('/home');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');
        html, body, #root { background: ${C.bg} !important; margin: 0; padding: 0; }
      `}</style>

      <div className="fs-flow">
  <div className="fs-form-shell"></div>
        {/* Peeking strip,same as MidCycle */}
        <div style={{ height: 16 }} />

        {/* Lifted white card */}
       <div style={{
  background: C.white,
  borderRadius: '28px 28px 0 0',
  boxShadow: '0 -6px 28px rgba(0,0,0,0.08)',
  minHeight: 'auto',
  width: '100%',
  maxWidth: 650,
  margin: '0 auto',
  padding: '28px 24px 80px',
  boxSizing: 'border-box',
}}>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <button
              onClick={() => step === 2 ? setStep(1) : setShowConfirm(true)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: `1.5px solid ${C.mid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} color={C.ink} strokeWidth={1.8} />
            </button>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2].map(i => (
                <div key={i} style={{ width: 28, height: 4, borderRadius: 4, background: i <= step ? C.gold : C.mid, transition: 'background 0.25s' }} />
              ))}
            </div>

            <button
              onClick={() => setShowConfirm(true)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: `1.5px solid ${C.mid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={16} color={C.muted} strokeWidth={1.8} />
            </button>
          </div>

          {/* Brand row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>FolliSense</span>
          </div>

          <AnimatePresence mode="wait">

            {/* ── STEP 1: Symptom selector ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.goldDeep, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                  Know It
                </p>
                <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.ink, margin: '0 0 6px', lineHeight: 1.25 }}>
                  What are you noticing?
                </h2>
                <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, margin: '0 0 24px', lineHeight: 1.5 }}>
                  Select everything that applies. We'll help you understand what it might mean.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {symptomOptions.map(opt => {
                    const sel = selected.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleSymptom(opt.id)}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '14px 16px',
                          borderRadius: 16,
                          border: sel ? `2px solid ${C.gold}` : `1.5px solid ${C.mid}`,
                          background: sel ? C.gold10 : C.white,
                          cursor: 'pointer',
                          boxShadow: sel ? `0 4px 16px rgba(46,74,57,0.16)` : '0 1px 4px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Radio indicator */}
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            border: `2px solid ${sel ? C.gold : C.mid}`,
                            background: sel ? C.gold : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}>
                            {sel && <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.white }} />}
                          </div>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{opt.icon}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: dm, fontSize: 14, fontWeight: sel ? 600 : 400, color: sel ? C.goldDeep : C.ink, margin: 0 }}>
                              {opt.label}
                            </p>
                            {opt.description && (
                              <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '2px 0 0', lineHeight: 1.4 }}>
                                {opt.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => canProceed && setStep(2)}
                  disabled={!canProceed}
                  style={{
                    width: '100%', height: 52, borderRadius: 16, border: 'none',
                    background: canProceed ? C.ink : C.mid,
                    color: canProceed ? '#f5f5f5' : C.muted,
                    fontFamily: dm, fontSize: 14, fontWeight: 600,
                    cursor: canProceed ? 'pointer' : 'not-allowed',
                    boxShadow: canProceed ? '0 4px 16px rgba(0,0,0,0.14)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  See what this might mean
                </button>
              </motion.div>
            )}

            {/* ── STEP 2: Results ── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.goldDeep, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                  Know It,Results
                </p>

                {nothingSelected ? (
                  <>
                    <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.ink, margin: '0 0 8px', lineHeight: 1.25 }}>
                      All looking good
                    </h2>
                    <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, lineHeight: 1.6, margin: '0 0 28px' }}>
                      No concerns flagged. Keep up your current routine and check in again at your next wash day.
                    </p>
                    <div style={{ background: C.green10, border: `1.5px solid ${C.greenBorder}`, borderRadius: 18, padding: '16px 18px', marginBottom: 24 }}>
                      <p style={{ fontFamily: dm, fontSize: 13, color: C.green, fontWeight: 600, margin: '0 0 4px' }}>✓ No concerns noted</p>
                      <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: 0, lineHeight: 1.5 }}>
                        Great,consistency is what protects your scalp long-term.
                      </p>
                    </div>
                  </>
                ) : matches.length === 0 ? (
                  <>
                    <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.ink, margin: '0 0 8px', lineHeight: 1.25 }}>
                      Worth keeping an eye on
                    </h2>
                    <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, lineHeight: 1.6, margin: '0 0 24px' }}>
                      We've noted your symptoms. They don't clearly match a specific pattern yet,continue tracking and we'll look for trends over time.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.ink, margin: '0 0 8px', lineHeight: 1.25 }}>
                      Here's what we're seeing
                    </h2>
                    <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, lineHeight: 1.6, margin: '0 0 20px' }}>
                      Based on what you selected,this is not a diagnosis, but it can help guide your next steps.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                      {matches.map(m => {
                        const img = conditionImageMap[m.conditionId];
                        return (
                          <div key={m.conditionId} style={{ background: C.white, border: `1.5px solid ${C.mid}`, borderRadius: 18, overflow: 'hidden' }}>
                            {/* Coloured top accent */}
                            <div style={{ height: 3, background: severityColor(m.severity) }} />

                            {/* Image on top,full width */}
                            {img && (
                              <div style={{ position: 'relative' }}>
                                <img
                                  src={img}
                                  alt={`Illustration of ${m.name}`}
                                  style={{ width: '100%', height: 190, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                                />
                                <span style={{
                                  position: 'absolute', bottom: 8, right: 10,
                                  fontFamily: dm, fontSize: 8, fontWeight: 700,
                                  letterSpacing: '0.08em', textTransform: 'uppercase',
                                  color: '#fff', background: 'rgba(0,0,0,0.45)',
                                  borderRadius: 100, padding: '3px 8px',
                                }}>
                                  Illustration
                                </span>
                              </div>
                            )}

                            {/* Text below */}
                            <div style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                                <p style={{ fontFamily: playfair, fontSize: 16, fontWeight: 500, color: C.ink, margin: 0 }}>{m.name}</p>
                                <span style={{
                                  fontFamily: dm, fontSize: 9, fontWeight: 700,
                                  color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase',
                                  background: severityColor(m.severity), borderRadius: 100, padding: '3px 8px',
                                  flexShrink: 0,
                                }}>
                                  {m.likelihood}
                                </span>
                              </div>
                              <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: '0 0 12px', lineHeight: 1.55 }}>{m.message}</p>

                              {/* Common causes */}
                              <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.goldDeep, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                                Common causes
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                                {m.causes.map((c, i) => (
                                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.gold, flexShrink: 0, marginTop: 6 }} />
                                    <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: 0, lineHeight: 1.5 }}>{c}</p>
                                  </div>
                                ))}
                              </div>

                              {/* You may notice */}
                              <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.goldDeep, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                                You may notice
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                                {m.mayNotice.map((n, i) => (
                                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.gold, flexShrink: 0, marginTop: 6 }} />
                                    <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: 0, lineHeight: 1.5 }}>{n}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Next step */}
                              <div style={{ background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: '10px 12px' }}>
                                <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.goldDeep, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                                  Next step
                                </p>
                                <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: 0, lineHeight: 1.5 }}>{m.nextStep}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Next steps */}
                    <div style={{ background: C.white, border: `1.5px solid ${C.mid}`, borderRadius: 18, padding: '14px 16px', marginBottom: 20 }}>
                      <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                        Next steps
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { label: 'Find a specialist', desc: 'Trichologists and dermatologists near you', path: '/find-specialist' },
                          { label: 'Do a full scalp check-in', desc: 'Track your symptoms in detail', path: '/wash-day' },
                        ].map(a => (
                          <button
                            key={a.label}
                            onClick={() => navigate(a.path)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '11px 12px', borderRadius: 12,
                              background: C.gold10, border: `1.5px solid ${C.goldBorder}`,
                              cursor: 'pointer', textAlign: 'left', width: '100%',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, margin: 0 }}>{a.label}</p>
                              <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '1px 0 0' }}>{a.desc}</p>
                            </div>
                            <ChevronRight size={14} color={C.goldDeep} strokeWidth={1.8} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <button
                  onClick={handleSaveAndFinish}
                  style={{
                    width: '100%', height: 52, borderRadius: 16, border: 'none',
                    background: C.ink, color: '#f5f5f5',
                    fontFamily: dm, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                  }}
                >
                  Save to my history
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Confirm exit modal ── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: C.white, borderRadius: 28, padding: 28, maxWidth: 360, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.14)' }}
            >
              <h3 style={{ fontFamily: playfair, fontSize: 20, fontWeight: 500, color: C.ink, margin: '0 0 8px' }}>Are you sure?</h3>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, margin: '0 0 24px', lineHeight: 1.5 }}>Your progress won't be saved.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowConfirm(false)} style={{ flex: 1, height: 46, borderRadius: 14, border: `1.5px solid ${C.mid}`, background: 'transparent', fontFamily: dm, fontSize: 13, fontWeight: 500, color: C.ink, cursor: 'pointer' }}>
                  Continue
                </button>
                <button onClick={() => navigate('/home')} style={{ flex: 1, height: 46, borderRadius: 14, border: 'none', background: C.ink, fontFamily: dm, fontSize: 13, fontWeight: 600, color: '#f5f5f5', cursor: 'pointer' }}>
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default KnowIt;