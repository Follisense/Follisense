import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Camera } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { scoreSymptoms, buildNumericPayload, buildCCCAPayload } from '@/utils/symptomScoring';
import { supabase } from '@/lib/supabaseClient';
import ProductSearch from '@/components/ProductSearch';

// Ported from Tailwind/shadcn tokens to the same inline-style system as
// MidCycleCheckIn, so both halves of the check-in look like one app. Layout
// comes from layout.css (.fs-flow / .fs-form-shell / .fs-flow-sheet), which
// replaces the hardcoded max-w-[430px] phone frame this file used to carry.
// No logic changed.

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:         '#EDEFE7',
  ink:        '#23201A',
  gold:       '#4E7A63',
  goldDeep:   '#2E4A39',
  gold10:     'rgba(46,74,57,0.10)',
  goldBorder: 'rgba(46,74,57,0.22)',
  mid:        '#E3E7DE',
  muted:      '#8A8F86',
  white:      '#FBFCF8',
};

const washDayUsedAcks = new Set<string>();

const getAcknowledgment = (optionIndex: number, totalOptions: number): string => {
  const pools: Record<string, string[]> = {
    none: ["That's great", "Good to hear", "Lovely", "Nice"],
    mild: [
      "Okay, we've noted that. Nothing to worry about for now",
      "Thanks for sharing. We'll keep that in mind",
      "Got it. That's pretty common but worth tracking",
      "Noted. We'll see how that looks over your next few check-ins",
      "Mild is usually manageable. Let's track how it goes",
    ],
    moderate: [
      "Thanks for being honest about that. That's exactly the kind of thing we want to track for you",
      "Okay, that's really helpful to know. We'll pay attention to that",
      "We appreciate you sharing that. Let's watch how it develops",
      "That's worth keeping an eye on. We'll check in on this next time",
      "Thanks for flagging that. Knowing your starting point helps us help you better",
      "Moderate symptoms are exactly why tools like this exist. We'll track it closely",
    ],
    severe: [
      "I'm sorry you're dealing with that. Let's make sure we address it",
      "That sounds really uncomfortable. You're in the right place",
      "Thank you for telling us. We're going to take that seriously",
      "We hear you. That's not something you should have to just live with",
      "That's significant and we're glad you're not ignoring it",
    ],
  };

  let key = 'mild';
  if (optionIndex === 0) key = 'none';
  else if (optionIndex >= totalOptions - 1) key = 'severe';
  else if (optionIndex >= 2) key = 'moderate';

  const pool = pools[key];
  const unused = pool.filter(m => !washDayUsedAcks.has(m));
  const available = unused.length > 0 ? unused : pool;
  const pick = available[Math.floor(Math.random() * available.length)];
  washDayUsedAcks.add(pick);
  return pick;
};

interface StepDef {
  key: string;
  q: string;
  qMale?: string;
  qRegular?: string;
  qMaleRegular?: string;
  options: { label: string; desc: string }[];
  maleOptions?: { label: string; desc: string }[];
}

const scalpSteps: StepDef[] = [
  {
    key: 'itch',
    q: "How's the itching been this cycle?",
    qMale: "How's your scalp been feeling? Any itching?",
    options: [
      { label: 'None', desc: 'No itching at all' },
      { label: 'Mild', desc: 'Occasional, not bothersome' },
      { label: 'Moderate', desc: 'Regular itching, somewhat bothersome' },
      { label: 'Severe', desc: 'Constant or very uncomfortable' },
    ],
  },
  {
    key: 'tenderness',
    q: 'Any scalp soreness or tenderness?',
    options: [
      { label: 'No', desc: 'No tenderness' },
      { label: 'A little', desc: 'Mild sensitivity in some areas' },
      { label: 'Yes, noticeably', desc: 'Sore to touch in several areas' },
      { label: 'Yes, painful', desc: 'Painful even without touching' },
    ],
  },
  {
    key: 'flaking',
    q: 'Noticed any flaking or buildup?',
    options: [
      { label: 'None', desc: 'Scalp looks clear' },
      { label: 'Some flaking', desc: 'Light flakes, some buildup' },
      { label: 'Heavy flaking', desc: 'Visible flaking, significant buildup' },
    ],
  },
  {
    key: 'irritation',
    q: 'Any bumps, razor bumps, or irritation?',
    qMale: 'Any razor bumps, ingrown hairs, or irritation?',
    options: [
      { label: 'None', desc: 'Scalp looks clear' },
      { label: 'A few bumps', desc: 'Minor irritation in one area' },
      { label: 'Moderate', desc: 'Multiple bumps or inflamed areas' },
      { label: 'Significant', desc: 'Widespread bumps, painful or infected-looking' },
    ],
    maleOptions: [
      { label: 'None', desc: 'No bumps or irritation' },
      { label: 'Minor razor bumps', desc: 'A few bumps at hairline or nape' },
      { label: 'Ingrown hairs', desc: 'Painful ingrowns, possibly inflamed' },
      { label: 'Folliculitis', desc: 'Clusters of bumps, pus-filled or spreading' },
    ],
  },
  {
    key: 'hairline',
    q: 'How are your edges and temples looking?',
    qMale: 'Noticed any changes at your hairline or temples?',
    qRegular: 'Noticed any changes around your hairline, temples, or parting?',
    qMaleRegular: 'Any changes around your hairline, temples, or crown?',
    options: [
      { label: 'No change', desc: 'Edges look the same as usual' },
      { label: 'Looks a bit thinner', desc: 'Slight difference, not sure' },
      { label: 'Noticeable thinning', desc: 'Visible thinning or recession' },
      { label: "I'm concerned", desc: 'Significant change, worried' },
    ],
    maleOptions: [
      { label: 'No change', desc: 'Hairline looks the same' },
      { label: 'Slight recession', desc: 'Temples seem a bit higher than before' },
      { label: 'Noticeable thinning', desc: 'Visible thinning at hairline or crown' },
      { label: "I'm concerned", desc: 'Significant change, want to address it' },
    ],
  },
  {
    key: 'shedding',
    q: 'How much hair came out at wash time?',
    qMale: 'Noticed any unusual shedding or thinning?',
    qRegular: 'How much shedding have you noticed recently, in the shower, on your pillow, or while styling?',
    qMaleRegular: 'Any unusual shedding, in the shower, on your pillow, or after a cut?',
    options: [
      { label: 'Normal', desc: "About what I'd expect" },
      { label: 'More than usual', desc: 'A bit more than usual' },
      { label: 'Significantly more', desc: 'Noticeably more than normal' },
      { label: 'Alarming amount', desc: "Far more than I've ever seen" },
    ],
  },
];

// ─── CCCA cluster steps (shown to women + prefer-not-to-say only) ─────────────
// Center part widening + crown thinning are the early signature of CCCA, a
// scarring (permanent) alopecia disproportionately affecting Black women.
// Captured here as ordinary scalp-section steps; scored separately, kept out of
// the composite total_score. Gated out for men (no part line; crown is already
// covered by the hairline/Norwood path).
const cccaStepDefs: StepDef[] = [
  {
    key: 'centerPartWidening',
    q: 'How does your part line look compared to before?',
    qRegular: 'How does your part line look compared to a few months ago?',
    options: [
      { label: 'No change', desc: 'Same as usual' },
      { label: 'Slightly wider', desc: 'A little wider, hard to be sure' },
      { label: 'Noticeably wider', desc: 'Clearly wider than before' },
      { label: 'Much wider', desc: 'Scalp clearly visible along the part' },
    ],
  },
  {
    key: 'crownThinning',
    q: 'How does the crown (top-centre) of your scalp look?',
    qRegular: 'How does the crown look compared to a few months ago?',
    options: [
      { label: 'No change', desc: 'Same density as usual' },
      { label: 'Slightly thinner', desc: 'A little less full' },
      { label: 'Noticeably thinner', desc: 'Visibly thinner or sparser' },
      { label: 'See-through at the crown', desc: 'Scalp clearly shows through' },
    ],
  },
];

const hairHealthSteps: StepDef[] = [
  {
    key: 'hairFeel',
    q: "How's your hair feeling?",
    qMale: "How's your scalp and hair feeling overall?",
    options: [
      { label: 'Soft and moisturised as usual', desc: '' },
      { label: 'A bit dry', desc: '' },
      { label: 'Very dry or brittle', desc: '' },
      { label: 'Different texture than usual', desc: 'Feels rough, straw-like, or limp' },
    ],
    maleOptions: [
      { label: 'Feels normal', desc: '' },
      { label: 'A bit dry or tight', desc: '' },
      { label: 'Very dry, flaky, or oily', desc: '' },
      { label: 'Different than usual', desc: 'Something feels off' },
    ],
  },
  {
    key: 'hairBreakage',
    q: 'Any breakage?',
    qMale: 'Any breakage or thinning?',
    options: [
      { label: 'No breakage', desc: '' },
      { label: 'A little, mostly at the ends', desc: '' },
      { label: 'Moderate, breaking along the length', desc: '' },
      { label: 'Significant, breaking at the root or in patches', desc: '' },
    ],
    maleOptions: [
      { label: 'No breakage', desc: '' },
      { label: 'A little, at the ends or edges', desc: '' },
      { label: 'Moderate, noticeable thinning', desc: '' },
      { label: 'Significant, patches or widespread', desc: '' },
    ],
  },
  {
    key: 'hairAppearance',
    q: 'How does your hair look overall?',
    options: [
      { label: 'Looks healthy, no changes', desc: '' },
      { label: 'A bit dull or lacklustre', desc: '' },
      { label: 'Noticeably thinner or less volume', desc: '' },
      { label: 'Significant change in appearance or density', desc: '' },
    ],
  },
];

const productStep: StepDef = {
  key: 'newProducts',
  q: 'Any new products since last time?',
  options: [
    { label: 'No, same routine', desc: 'No changes to your product lineup' },
    { label: 'Yes, I tried something new', desc: 'You introduced a new product' },
  ],
};

const photoAreasFemale = [
  { id: 'hairline', label: 'Temples / edges', baselineLabel: 'Hairline, temples and edges' },
  { id: 'crown', label: 'Crown / vertex', baselineLabel: 'Crown and vertex' },
  { id: 'hair-condition', label: 'Hair condition, mid-lengths and ends', baselineLabel: 'Hair condition, mid-lengths and ends' },
];

const photoAreasMale = [
  { id: 'hairline', label: 'Hairline / temples', baselineLabel: 'Hairline, temples and edges' },
  { id: 'crown', label: 'Crown / top', baselineLabel: 'Crown and vertex' },
  { id: 'nape', label: 'Nape / back of neck', baselineLabel: 'Nape, clipper line' },
  { id: 'areas-of-concern', label: 'Any areas of concern', baselineLabel: 'Areas of concern' },
];

// ─── Shared bits ──────────────────────────────────────────────────────────────

const TopBar = ({ totalSteps, currentStep, onBack, onClose }: {
  totalSteps: number; currentStep: number; onBack: () => void; onClose: () => void;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
    <button onClick={onBack} aria-label="Back"
      style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: `1.5px solid ${C.mid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <ArrowLeft size={16} color={C.ink} strokeWidth={1.8} />
    </button>
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} style={{ width: 18, height: 4, borderRadius: 4, background: i <= currentStep ? C.gold : C.mid, transition: 'background 0.25s' }} />
      ))}
    </div>
    <button onClick={onClose} aria-label="Close check-in"
      style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: `1.5px solid ${C.mid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <X size={16} color={C.muted} strokeWidth={1.8} />
    </button>
  </div>
);

const BrandRow = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
    <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>FolliSense</span>
  </div>
);

const OptionButton = ({ label, desc, selected, onClick }: {
  label: string; desc?: string; selected: boolean; onClick: () => void;
}) => (
  <button onClick={onClick}
    style={{ width: '100%', textAlign: 'left', padding: '15px 18px', borderRadius: 16, border: selected ? `2px solid ${C.gold}` : `1.5px solid ${C.mid}`, background: selected ? C.gold10 : C.white, cursor: 'pointer', boxShadow: selected ? `0 4px 16px rgba(46,74,57,0.14)` : '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.15s' }}>
    <div style={{ display: 'flex', alignItems: desc ? 'flex-start' : 'center', gap: 12 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: desc ? 2 : 0, border: `2px solid ${selected ? C.gold : C.mid}`, background: selected ? C.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
        {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.white }} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: dm, fontSize: 14, fontWeight: selected ? 600 : 400, color: selected ? C.goldDeep : C.ink, margin: 0 }}>{label}</p>
        {desc && <p style={{ fontFamily: dm, fontSize: 12, color: C.muted, margin: '3px 0 0', lineHeight: 1.45 }}>{desc}</p>}
      </div>
    </div>
  </button>
);

const PrimaryButton = ({ children, onClick, disabled, height = 52 }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; height?: number;
}) => (
  <button onClick={onClick} disabled={disabled}
    style={{ width: '100%', height, borderRadius: 16, border: 'none', background: disabled ? C.mid : C.goldDeep, color: disabled ? C.muted : '#f5f5f5', fontFamily: dm, fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', boxShadow: disabled ? 'none' : '0 4px 16px rgba(46,74,57,0.22)', transition: 'all 0.2s' }}>
    {children}
  </button>
);

const ConfirmSheet = ({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
      style={{ background: C.white, borderRadius: 28, padding: 28, maxWidth: 360, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.14)' }}>
      <h3 style={{ fontFamily: playfair, fontSize: 20, fontWeight: 500, color: C.ink, margin: '0 0 8px' }}>Are you sure?</h3>
      <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, margin: '0 0 24px', lineHeight: 1.5 }}>Your progress won't be saved.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onStay} style={{ flex: 1, height: 46, borderRadius: 14, border: `1.5px solid ${C.mid}`, background: 'transparent', fontFamily: dm, fontSize: 13, fontWeight: 500, color: C.ink, cursor: 'pointer' }}>Continue</button>
        <button onClick={onLeave} style={{ flex: 1, height: 46, borderRadius: 14, border: 'none', background: C.goldDeep, fontFamily: dm, fontSize: 13, fontWeight: 600, color: '#f5f5f5', cursor: 'pointer' }}>Leave</button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const WashDayAssessment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRegularCheckIn = searchParams.get('mode') === 'regular';
  const {
    onboardingData, setCurrentCheckIn, baselinePhotos,
    research, incrementResearchPhotos,
    // ── REMOVED: checkInCount, setCheckInCount ──
    // Count is now sourced from Supabase on HomePage mount, not incremented locally
  } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [newProductText] = useState('');
  const [newProductsList, setNewProductsList] = useState<string[]>([]);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showHairIntro, setShowHairIntro] = useState(false);
  const [acknowledgment, setAcknowledgment] = useState<string | null>(null);
  const [includeInResearch, setIncludeInResearch] = useState(research.consented);
  const [isSaving, setIsSaving] = useState(false);

  const isMale = onboardingData.gender === 'man';
  // CCCA questions go to women + prefer-not-to-say; empty for men keeps the
  // jsonb shape uniform (buildCCCAPayload returns 0/0/none when keys are absent).
  const cccaSteps: StepDef[] = isMale ? [] : cccaStepDefs;
  const scalpSection = [...scalpSteps, ...cccaSteps];
  const allSteps = [...scalpSection, ...hairHealthSteps, productStep];
  const photoAreas = isMale ? photoAreasMale : photoAreasFemale;
  const currentStyle = onboardingData.protectiveStyles[0] || (isMale ? 'your style' : 'Braids');

  const getContextLabel = (): string => {
    if (isRegularCheckIn) return 'Scalp check-in';
    if (isMale) {
      if (onboardingData.barberFrequency) return 'Barber check-in';
      if (onboardingData.locRetwistFrequency) return 'Loc check-in';
      return `${currentStyle}, scalp check`;
    }
    return `${currentStyle}, Day 28 of 28`;
  };

  const getContextSubtext = (): string => {
    if (isRegularCheckIn) return "Time for your scalp check-in, takes about 2 minutes";
    if (isMale) {
      if (onboardingData.barberFrequency) return "Quick check on how your scalp is doing since your last cut";
      return "Let's see how your scalp is doing";
    }
    return "Let's see how your scalp did this cycle";
  };

  const getQuestion = (step: StepDef): string => {
    if (isRegularCheckIn) {
      if (isMale && step.qMaleRegular) return step.qMaleRegular;
      if (step.qRegular) return step.qRegular;
    }
    if (isMale && step.qMale) return step.qMale;
    return step.q;
  };

  const getOptions = (step: StepDef) => {
    if (isMale && step.maleOptions) return step.maleOptions;
    return step.options;
  };

  const totalSteps = allSteps.length + 1;
  const isProductStep = currentStep === allSteps.length - 1;
  const isProductFollowUp = isProductStep && answers.newProducts === 'Yes, I tried something new';
  const isPhotoStep = currentStep === allSteps.length;
  const currentQ = allSteps[currentStep];

  const selectAnswer = (val: string, optIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentQ.key]: val }));
    if (currentQ.key === 'newProducts' && val === 'No, same routine') {
      setAcknowledgment(getAcknowledgment(0, 2));
    } else if (currentQ.key === 'newProducts' && val === 'Yes, I tried something new') {
      // Stay on step for product follow-up
    } else {
      setAcknowledgment(getAcknowledgment(optIndex, getOptions(currentQ).length));
    }
  };

  useEffect(() => {
    if (!acknowledgment) return;
    const timer = setTimeout(() => {
      const wasProduct = currentQ?.key === 'newProducts' && answers.newProducts === 'No, same routine';
      setAcknowledgment(null);
      if (wasProduct) {
        setCurrentStep(allSteps.length);
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [acknowledgment]);

  const handleProductContinue = () => setCurrentStep(allSteps.length);

  const handleSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);

    // Update local context for results page
    setCurrentCheckIn({
      itch:              answers.itch,
      tenderness:        answers.tenderness,
      hairline:          answers.hairline,
      flaking:           answers.flaking,
      shedding:          answers.shedding,
      hairFeel:          answers.hairFeel,
      hairBreakage:      answers.hairBreakage,
      hairAppearance:    answers.hairAppearance,
      newProducts:       answers.newProducts,
      newProductDetails: newProductsList.length > 0 ? newProductsList.join(', ') : newProductText || undefined,
      type: 'wash-day',
      date: new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    });

    if (photoSaved && includeInResearch && research.consented) incrementResearchPhotos();

    // ── Save to Supabase ──
    try {
      const checkinId = sessionStorage.getItem('active-checkin-id');
      console.log('[WashDay] active-checkin-id from sessionStorage:', checkinId);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[WashDay] session user:', session?.user?.id, '| sessionError:', sessionError);

      if (!session?.user) {
        console.error('[WashDay] No authenticated user,cannot save to Supabase');
        navigate('/results');
        return;
      }

      const scores = scoreSymptoms(answers);
      // Numeric payload → REAL table columns (this was the missing piece:
      // scores only lived inside the symptoms jsonb, never in the columns,
      // so every score column sat at its default of 0)
      const numeric = buildNumericPayload(answers);
      // CCCA cluster,scored + flagged separately, NOT folded into total_score.
      // Returns 0/0/none for men (keys absent), keeping the jsonb shape uniform.
      const ccca = buildCCCAPayload(answers);
      const symptomsPayload = {
        // Text answers
        itch:              answers.itch           ?? null,
        tenderness:        answers.tenderness     ?? null,
        flaking:           answers.flaking        ?? null,
        irritation:        answers.irritation     ?? null,
        hairline:          answers.hairline       ?? null,
        shedding:          answers.shedding       ?? null,
        hairFeel:          answers.hairFeel       ?? null,
        hairBreakage:      answers.hairBreakage   ?? null,
        hairAppearance:    answers.hairAppearance ?? null,
        newProducts:       answers.newProducts    ?? null,
        newProductDetails: newProductsList.length > 0 ? newProductsList.join(', ') : newProductText || null,
        // Numeric scores (0–3) for data analysis
        itch_score:             scores.itch,
        tenderness_score:       scores.tenderness,
        flaking_score:          scores.flaking,
        irritation_score:       scores.irritation,
        hairline_score:         scores.hairline,
        shedding_score:         scores.shedding,
        hair_feel_score:        scores.hairFeel,
        hair_breakage_score:    scores.hairBreakage,
        hair_appearance_score:  scores.hairAppearance,
        total_score:            scores.total,
        // risk_level respects the severe-symptom amber floor
        risk_level:             numeric.risk_level,
        // CCCA fields (center_part_widening_score, crown_thinning_score, ccca_flag)
        ...ccca,
      };

      // Top-level columns: numeric scores + the two CCCA score columns.
      // NOTE: ccca_flag stays jsonb-only,there's no ccca_flag column.
      const columnPayload = {
        ...numeric,
        center_part_widening_score: ccca.center_part_widening_score,
        crown_thinning_score:       ccca.crown_thinning_score,
      };

      if (checkinId) {
        // Update the row created in ScalpCheckIn
        const { error } = await supabase
          .from('checkins')
          .update({
            symptoms:      symptomsPayload,
            ...columnPayload,
            triage_result: numeric.risk_level,
            notes:         `Itch: ${answers.itch}, Tenderness: ${answers.tenderness}, Shedding: ${answers.shedding}`,
          })
          .eq('id', checkinId);

        if (error) {
          console.error('[WashDay] update failed:', error);
        } else {
          console.log('[WashDay] checkin updated with scores:', checkinId, '| total:', numeric.total_score, '→', numeric.risk_level);
        }
      } else {
        // Fallback: user navigated directly to /wash-day without going through ScalpCheckIn
        const { data, error } = await supabase
          .from('checkins')
          .insert({
            user_id:       session.user.id,
            type:          'scheduled',
            symptoms:      symptomsPayload,
            ...columnPayload,
            triage_result: numeric.risk_level,
            notes:         `Itch: ${answers.itch}, Tenderness: ${answers.tenderness}, Shedding: ${answers.shedding}`,
            is_baseline:   false,
          })
          .select('id')
          .single();

        if (error) {
          console.error('[WashDay] fallback insert failed:', error);
        } else {
          console.log('[WashDay] fallback insert succeeded:', data?.id, '| total:', numeric.total_score, '→', numeric.risk_level);
        }
      }

      sessionStorage.removeItem('active-checkin-id');
    } catch (err) {
      console.error('[WashDay] Unexpected Supabase error:', err);
    } finally {
      setIsSaving(false);
      navigate('/results');
    }
  };

  const getBaselineForArea = (baselineLabel: string) => baselinePhotos.find(p => p.area === baselineLabel);

  // ── Interstitial between the scalp section and the hair section ──
  if (currentStep === scalpSection.length && !showHairIntro && !isPhotoStep) {
    return (
      <>
        <style>{`html, body, #root { background: ${C.bg} !important; margin: 0; padding: 0; }`}</style>
        <div className="fs-flow">
          <div className="fs-form-shell">
            <div className="fs-flow-sheet">
              <TopBar
                totalSteps={totalSteps}
                currentStep={currentStep}
                onBack={() => setCurrentStep(currentStep - 1)}
                onClose={() => setShowConfirm(true)}
              />
              <BrandRow />
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.ink, margin: '0 0 12px', lineHeight: 1.25 }}>
                  And your hair?
                </h2>
                <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, margin: '0 0 28px', lineHeight: 1.5 }}>
                  Your hair can tell us a lot about what's happening at the scalp
                </p>
                <PrimaryButton onClick={() => setShowHairIntro(true)}>Continue</PrimaryButton>
              </motion.div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showConfirm && (
            <ConfirmSheet onStay={() => setShowConfirm(false)} onLeave={() => navigate('/home')} />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <style>{`html, body, #root { background: ${C.bg} !important; margin: 0; padding: 0; }`}</style>

      <div className="fs-flow">
        <div className="fs-form-shell">
          <div className="fs-flow-sheet">
            <TopBar
              totalSteps={totalSteps}
              currentStep={currentStep}
              onBack={() => {
                if (currentStep > 0) {
                  if (currentStep === scalpSection.length && showHairIntro) setShowHairIntro(false);
                  else setCurrentStep(currentStep - 1);
                } else setShowConfirm(true);
              }}
              onClose={() => setShowConfirm(true)}
            />
            <BrandRow />

            <AnimatePresence mode="wait">
              {acknowledgment ? (
                <motion.div key="ack" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  style={{ paddingTop: 48, paddingBottom: 48, textAlign: 'center' }}>
                  <p style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.ink, lineHeight: 1.3 }}>{acknowledgment}</p>
                </motion.div>
              ) : !isPhotoStep && currentQ ? (
                <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.goldDeep, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                    {getContextLabel()}
                  </p>
                  <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
                    {getContextSubtext()}
                  </p>
                  <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.ink, margin: '0 0 24px', lineHeight: 1.25 }}>
                    {getQuestion(currentQ)}
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {getOptions(currentQ).map((opt, optIdx) => (
                      <OptionButton
                        key={opt.label}
                        label={opt.label}
                        desc={opt.desc}
                        selected={answers[currentQ.key] === opt.label}
                        onClick={() => selectAnswer(opt.label, optIdx)}
                      />
                    ))}
                  </div>

                  {isProductFollowUp && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24 }}>
                      <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 12px' }}>
                        What new products did you use?
                      </p>
                      <ProductSearch category="hair" selectedProducts={newProductsList} onProductsChange={setNewProductsList} />
                      <div style={{ marginTop: 16 }}>
                        <PrimaryButton onClick={handleProductContinue} height={48}>Continue</PrimaryButton>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="photo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.ink, margin: '0 0 10px', lineHeight: 1.25 }}>
                    Want to add photos?
                  </h2>
                  <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, margin: '0 0 4px', lineHeight: 1.5 }}>
                    Tracking visually helps you spot gradual changes.
                  </p>
                  <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '0 0 24px' }}>
                    Photos stay on your device only.
                  </p>

                  {!photoSaved ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                      {photoAreas.map(area => {
                        const baseline = getBaselineForArea(area.baselineLabel);
                        return (
                          <div key={area.id}>
                            <button onClick={() => setPhotoSaved(true)}
                              style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 16, border: `1.5px solid ${C.mid}`, background: C.white, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14 }}>
                              <div style={{ width: 46, height: 46, borderRadius: 14, background: C.gold10, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Camera size={20} color={C.gold} strokeWidth={1.6} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: C.ink, margin: 0 }}>{area.label}</p>
                                {baseline && (
                                  <p style={{ fontFamily: dm, fontSize: 11, color: C.gold, margin: '3px 0 0' }}>
                                    Compare with your baseline from {baseline.date}
                                  </p>
                                )}
                              </div>
                            </button>
                            {baseline && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '9px 12px', borderRadius: 14, background: C.gold10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.mid, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <Camera size={14} color={C.muted} strokeWidth={1.6} />
                                </div>
                                <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: 0 }}>Baseline, {baseline.date}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ background: C.white, border: `1.5px solid ${C.mid}`, borderRadius: 20, padding: 24, marginBottom: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.gold10, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <Camera size={20} color={C.gold} strokeWidth={1.6} />
                      </div>
                      <p style={{ fontFamily: dm, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0 }}>Photo saved</p>
                      <p style={{ fontFamily: dm, fontSize: 12, color: C.muted, margin: '4px 0 0' }}>Stored on your device only</p>
                    </div>
                  )}

                  {research.consented && photoSaved && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 16, background: C.gold10, border: `1px solid ${C.goldBorder}`, padding: 16, marginBottom: 24 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, margin: 0 }}>Include in research programme</p>
                        <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '3px 0 0', lineHeight: 1.5 }}>
                          Anonymised only. You can change this anytime in settings.
                        </p>
                      </div>
                      <button onClick={() => setIncludeInResearch(!includeInResearch)}
                        aria-label="Include photos in research programme"
                        aria-pressed={includeInResearch}
                        style={{ width: 44, height: 24, borderRadius: 100, border: 'none', background: includeInResearch ? C.gold : C.mid, position: 'relative', flexShrink: 0, cursor: 'pointer', transition: 'background 0.18s' }}>
                        <span style={{ position: 'absolute', top: 2, left: includeInResearch ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: C.white, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.18s' }} />
                      </button>
                    </div>
                  )}

                  <PrimaryButton onClick={handleSubmit} disabled={isSaving}>
                    {isSaving ? 'Saving…' : 'See my results'}
                  </PrimaryButton>
                  <button onClick={handleSubmit} disabled={isSaving}
                    style={{ width: '100%', marginTop: 12, padding: '10px 0', background: 'none', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: dm, fontSize: 13, color: C.muted }}>
                    Skip
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <ConfirmSheet onStay={() => setShowConfirm(false)} onLeave={() => navigate('/home')} />
        )}
      </AnimatePresence>
    </>
  );
};

export default WashDayAssessment;