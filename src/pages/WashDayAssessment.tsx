import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Camera } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { scoreSymptoms, scoreToRisk, buildNumericPayload, buildCCCAPayload } from '@/utils/symptomScoring';
import { supabase } from '@/lib/supabaseClient';
import { updateCheckinSession } from '@/services/checkinService';
import ProductSearch from '@/components/ProductSearch';

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
  const [newProductText, setNewProductText] = useState('');
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

  if (currentStep === scalpSection.length && !showHairIntro && !isPhotoStep) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[430px] mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <button onClick={() => setCurrentStep(currentStep - 1)} className="p-2 -ml-2">
              <ArrowLeft size={22} className="text-foreground" strokeWidth={1.8} />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1 w-5 rounded-full transition-colors duration-300 ${i <= currentStep ? 'bg-primary' : 'bg-border'}`} />
              ))}
            </div>
            <button onClick={() => setShowConfirm(true)} className="p-2 -mr-2">
              <X size={22} className="text-foreground" strokeWidth={1.8} />
            </button>
          </div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pt-4">
            <h2 className="text-xl font-semibold mb-2">And your hair?</h2>
            <p className="text-muted-foreground text-sm mb-8">Your hair can tell us a lot about what's happening at the scalp</p>
            <button onClick={() => setShowHairIntro(true)} className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-semibold text-base btn-press">Continue</button>
          </motion.div>
          <AnimatePresence>
            {showConfirm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center px-6">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-card">
                  <h3 className="font-semibold text-lg mb-2">Are you sure?</h3>
                  <p className="text-sm text-muted-foreground mb-6">Your progress won't be saved.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowConfirm(false)} className="flex-1 h-12 rounded-xl border border-border font-medium text-sm btn-press">Continue</button>
                    <button onClick={() => navigate('/home')} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium text-sm btn-press">Leave</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          <button onClick={() => {
            if (currentStep > 0) {
              if (currentStep === scalpSection.length && showHairIntro) setShowHairIntro(false);
              else setCurrentStep(currentStep - 1);
            } else setShowConfirm(true);
          }} className="p-2 -ml-2">
            <ArrowLeft size={22} className="text-foreground" strokeWidth={1.8} />
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 w-5 rounded-full transition-colors duration-300 ${i <= currentStep ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
          <button onClick={() => setShowConfirm(true)} className="p-2 -mr-2">
            <X size={22} className="text-foreground" strokeWidth={1.8} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {acknowledgment ? (
            <motion.div key="ack" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-16 text-center">
              <p className="text-lg font-medium text-foreground">{acknowledgment}</p>
            </motion.div>
          ) : !isPhotoStep && currentQ ? (
            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="pt-4">
              <p className="text-label mb-2">{getContextLabel()}</p>
              <p className="text-sm text-muted-foreground mb-1">{getContextSubtext()}</p>
              <h2 className="text-xl font-semibold mb-6">{getQuestion(currentQ)}</h2>
              <div className="space-y-3">
                {getOptions(currentQ).map((opt, optIdx) => (
                  <button key={opt.label} onClick={() => selectAnswer(opt.label, optIdx)} className={`selection-card w-full text-left ${answers[currentQ.key] === opt.label ? 'selected' : ''}`}>
                    <p className="font-medium text-foreground">{opt.label}</p>
                    {opt.desc && <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>}
                  </button>
                ))}
              </div>

              {isProductFollowUp && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                  <label className="text-sm font-medium text-foreground mb-3 block">What new products did you use?</label>
                  <ProductSearch category="hair" selectedProducts={newProductsList} onProductsChange={setNewProductsList} />
                  <button onClick={handleProductContinue} className="w-full h-12 mt-4 bg-primary text-primary-foreground rounded-xl font-semibold text-sm btn-press">Continue</button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="photo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="pt-4">
              <h2 className="text-xl font-semibold mb-2">Want to add photos?</h2>
              <p className="text-muted-foreground text-sm mb-1">Tracking visually helps you spot gradual changes.</p>
              <p className="text-xs text-muted-foreground mb-6">Photos stay on your device only.</p>

              {!photoSaved ? (
                <div className="space-y-3 mb-8">
                  {photoAreas.map(area => {
                    const baseline = getBaselineForArea(area.baselineLabel);
                    return (
                      <div key={area.id}>
                        <button onClick={() => setPhotoSaved(true)} className="selection-card w-full flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                            <Camera size={22} className="text-muted-foreground" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-foreground">{area.label}</p>
                            {baseline && <p className="text-xs text-primary mt-0.5">Compare with your baseline from {baseline.date}</p>}
                          </div>
                        </button>
                        {baseline && (
                          <div className="flex items-center gap-3 mt-2 ml-1 px-3 py-2 rounded-xl bg-accent">
                            <div className="w-10 h-10 rounded-lg bg-border flex items-center justify-center flex-shrink-0">
                              <Camera size={14} className="text-muted-foreground" strokeWidth={1.5} />
                            </div>
                            <p className="text-xs text-muted-foreground">Baseline, {baseline.date}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card-elevated p-5 mb-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-3">
                    <Camera size={22} className="text-primary" />
                  </div>
                  <p className="font-medium text-foreground">Photo saved</p>
                  <p className="text-sm text-muted-foreground">Stored on your device only</p>
                </div>
              )}

              {research.consented && photoSaved && (
                <div className="flex items-center justify-between rounded-2xl bg-accent p-4 mb-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Include in research programme</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Anonymised only. You can change this anytime in settings.</p>
                  </div>
                  <button onClick={() => setIncludeInResearch(!includeInResearch)} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ml-3 ${includeInResearch ? 'bg-primary' : 'bg-border'}`}>
                    <div className={`w-5 h-5 rounded-full bg-card shadow-sm absolute top-0.5 transition-transform ${includeInResearch ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-semibold text-base btn-press mb-3"
                style={{ opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? 'Saving…' : 'See my results'}
              </button>
              <button onClick={handleSubmit} disabled={isSaving} className="w-full text-center text-sm text-muted-foreground py-2">
                Skip
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center px-6">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-card">
              <h3 className="font-semibold text-lg mb-2">Are you sure?</h3>
              <p className="text-sm text-muted-foreground mb-6">Your progress won't be saved.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 h-12 rounded-xl border border-border font-medium text-sm btn-press">Continue</button>
                <button onClick={() => navigate('/home')} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium text-sm btn-press">Leave</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WashDayAssessment;