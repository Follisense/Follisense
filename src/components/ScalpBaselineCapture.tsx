import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ImageIcon, AlertCircle, Check, Sparkles } from 'lucide-react';
import { saveBaselinePhotos } from '@/services/photoUploadService';
import { analyseImage } from '@/lib/visionClient';

import scalpFrontFemale from '@/assets/scalp-front-female.jpeg';
import scalpSideFemale  from '@/assets/scalp-side-female.jpeg';
import scalpBackFemale  from '@/assets/scalp-back-female.jpeg';
import scalpTopFemale   from '@/assets/scalp-top-female.jpeg';
import scalpFrontMale   from '@/assets/ref-male-front.jpg';
import scalpSideMaleB   from '@/assets/scalp-side-male-b.jpeg';
import scalpBackMale    from '@/assets/scalp-back-male.png';
import scalpTopMale     from '@/assets/scalp-top-male.png';



// Vision only needs enough pixels to label the image. Sending a full-res phone
// photo (3-8MB, larger again once base64'd) was the whole reason validation felt
// slow. We downscale to this before the call. The ORIGINAL full-res dataUrl is
// still what gets previewed and saved,this copy is for Vision only.
const VISION_MAX_EDGE = 1024;
const VISION_QUALITY  = 0.8;
const VISION_TIMEOUT  = 12000; // ms, stops the spinner hanging on a stalled call

// ─── IMAGE DOWNSCALE ──────────────────────────────────────────────────────────
const compressForVision = (dataUrl: string): Promise<string> =>
  new Promise(resolve => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, VISION_MAX_EDGE / Math.max(img.width, img.height));
          // Already small enough, don't waste a re-encode
          if (scale === 1) { resolve(dataUrl.split(',')[1]); return; }
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(dataUrl.split(',')[1]); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', VISION_QUALITY).split(',')[1]);
        } catch {
          resolve(dataUrl.split(',')[1]);
        }
      };
      img.onerror = () => resolve(dataUrl.split(',')[1]);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl.split(',')[1]);
    }
  });

// ─── LABEL MATCHING ───────────────────────────────────────────────────────────
// Vision labels are matched on WORD boundaries, never as substrings.
// Substring matching was the core bug: 'back' matched "Background", 'ear'
// matched "Beard" and "Eyewear", 'eye' matched almost any animal photo.
// Optional trailing s/es is allowed so "ears" and "braids" still match.
const hasLabel = (labels: string[], keyword: string): boolean => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^a-z])${escaped}(s|es)?($|[^a-z])`);
  return labels.some(l => re.test(l));
};
const countLabels = (labels: string[], keys: string[]): number =>
  keys.filter(k => hasLabel(labels, k)).length;
const anyLabel = (labels: string[], keys: string[]): boolean =>
  keys.some(k => hasLabel(labels, k));

// ─── SIGNAL SETS ──────────────────────────────────────────────────────────────
// HAIR_SIGNALS: real evidence there is hair or a scalp in the frame.
// This is the gate that stops walls, carpets, plates of food and pets.
// Deliberately excludes 'skin', 'texture', 'pattern', 'macro', 'close-up',
// which fire on almost any close-up photograph of anything.
const HAIR_SIGNALS = [
  'hair', 'scalp', 'hairstyle', 'hairline', 'hairdresser', 'hair care',
  'hair coloring', 'hair colouring', 'hair extension', 'hairpiece',
  'black hair', 'brown hair', 'blond hair', 'long hair', 'short hair',
  'wavy hair', 'curly hair', 'textured hair', 'hair texture', 'layered hair',
  'lace wig', 'wig', 'weave', 'afro', 'braid', 'cornrow', 'loc', 'dreadlock',
  'twist out', 'curl', 'coil', 'ringlet', 'kink', 'jheri curl', 'bun',
  'ponytail', 'updo', 'bang', 'fringe', 'fade', 'buzz cut', 'crew cut',
  'undercut', 'shaved head', 'bald', 'nape', 'crown', 'forehead',
  'sideburn', 'beard', 'facial hair', 'eyelash', 'eyebrow',
];

// PERSON_SIGNALS: a human is present, even if hair is not the subject.
// Used ONLY to tell "right person, wrong angle" from "unrelated photo".
const PERSON_SIGNALS = [
  ...HAIR_SIGNALS,
  'head', 'person', 'human', 'face', 'neck', 'ear', 'cheek', 'chin', 'jaw',
  'temple', 'lip', 'mouth', 'selfie', 'portrait', 'shoulder', 'iris',
  'human body', 'human head', 'human face', 'moustache', 'mustache',
];

const FAKE_WORDS = [
  'cartoon', 'animation', 'illustration', 'drawing', 'sketch', 'clipart',
  'skull', 'diagram', '3d render', 'render', 'comic', 'manga', 'anime',
  'screenshot', 'web page', 'website', 'graphic design', 'logo', 'poster',
  'font', 'text', 'document', 'paper', 'brand', 'advertising', 'emoticon',
];

const HARD_JUNK = [
  'food', 'meal', 'cuisine', 'dish', 'recipe', 'ingredient', 'tableware',
  'plate', 'drink', 'landscape', 'plant', 'flower', 'leaf', 'tree', 'grass',
  'sky', 'cloud', 'building', 'architecture', 'furniture', 'wall', 'floor',
  'wood', 'carpet', 'textile', 'animal', 'cat', 'dog', 'felidae', 'canidae',
  'whisker', 'snout', 'bird', 'fish', 'car', 'vehicle', 'wheel', 'tire',
  'shoe', 'footwear', 'gadget', 'mobile phone', 'computer', 'keyboard',
];

// ─── ANGLE CONFIGS ────────────────────────────────────────────────────────────
// strongSignals → angle-specific anatomy. One match is enough to pass.
// weakSignals   → suggestive but generic. Only count when a hair signal is also
//                 present, so "texture" or "pattern" alone can never pass a step.
// wrongSignals  → evidence of the opposite angle. threshold+ matches overrides.
interface StepAngleConfig {
  strongSignals:       string[];
  weakSignals:         string[];
  wrongAngleSignals:   string[];
  wrongAngleThreshold: number;
  angleHint:           string;
}

const angleConfigs: Record<string, StepAngleConfig> = {
  'Front hairline': {
    // A tight crop of just the hairline and edges often returns no face labels
    // at all,Vision gives back hair, hairstyle, black hair, skin, eyelash.
    // The old config demanded face anatomy and rejected those, which is why
    // this step felt strict. Forward-facing features moved into weakSignals
    // (they still require a hair signal to count), and 'profile' dropped from
    // the wrong list so the threshold could go to 1 as a counterweight: any
    // explicit back-of-head label now rejects the front step outright.
    strongSignals:       ['forehead', 'hairline', 'face', 'human face', 'selfie',
                          'portrait', 'head shot', 'bang', 'fringe', 'eyebrow',
                          'eyelash', 'moustache', 'mustache'],
    weakSignals:         ['head', 'human head', 'jaw', 'chin', 'cheek', 'lip',
                          'mouth', 'nose', 'eye', 'iris', 'skin', 'beauty',
                          'temple', 'beard', 'facial hair', 'lace wig', 'wig',
                          'close-up'],
    wrongAngleSignals:   ['nape', 'occiput', 'back of head'],
    wrongAngleThreshold: 1,
    angleHint:           'Face the camera directly so your hairline and forehead are clearly visible.',
  },

  'Side view': {
    // Ear, temple and jaw are the reliable side-profile signals. Forehead,
    // nose and mouth are visible from the side too, so they are never penalised.
    strongSignals:       ['ear', 'temple', 'profile', 'sideburn', 'cheekbone'],
    weakSignals:         ['jaw', 'cheek', 'chin', 'neck', 'beard', 'facial hair'],
    wrongAngleSignals:   ['nape', 'occiput', 'back of head'],
    wrongAngleThreshold: 2,
    angleHint:           'Turn your head to the side until your ear and temple are clearly visible.',
  },

  'Top of head': {
    // Top-down shots: Vision returns scalp/crown or recognises the style.
    strongSignals:       ['scalp', 'crown', 'hair texture', 'textured hair',
                          'afro', 'braid', 'cornrow', 'loc', 'dreadlock', 'coil',
                          'kink', 'jheri curl', 'black hair', 'brown hair',
                          'curly hair', 'hairstyle', 'part'],
    // These only count alongside a hair signal. On their own they matched
    // carpets, walls and food.
    weakSignals:         ['texture', 'pattern', 'macro', 'close-up', 'hair'],
    wrongAngleSignals:   ['face', 'eye', 'nose', 'mouth', 'forehead', 'portrait', 'selfie'],
    wrongAngleThreshold: 2,
    angleHint:           "Tilt your head forward and point the camera straight down at your crown. Your face shouldn't be in the shot.",
  },

  'Back and nape': {
    // 'back' removed as a bare token: it matched "Background" on nearly
    // every photo, which made this step pass unconditionally.
    strongSignals:       ['nape', 'occiput', 'back of head', 'neck', 'bun',
                          'ponytail', 'updo', 'braid', 'loc', 'dreadlock',
                          'cornrow', 'shoulder'],
    weakSignals:         ['black hair', 'brown hair', 'long hair', 'short hair',
                          'hairstyle', 'hair'],
    wrongAngleSignals:   ['face', 'eye', 'nose', 'mouth', 'forehead', 'portrait', 'selfie', 'chin'],
    wrongAngleThreshold: 2,
    angleHint:           "Show the back of your head and nape. Use a mirror or ask someone to help, your face shouldn't be visible.",
  },
};

// ─── OBSERVATION GENERATOR ────────────────────────────────────────────────────
const generateObservation = (labels: string[], stepTitle: string): string | null => {
  if (anyLabel(labels, ['afro']))
    return 'Natural texture captured, great baseline for tracking density and moisture over time.';
  if (anyLabel(labels, ['braid', 'cornrow']))
    return "Braided style visible, we'll track tension patterns and hairline health around your style.";
  if (anyLabel(labels, ['loc', 'dreadlock']))
    return 'Locs captured, useful for monitoring scalp visibility and buildup over time.';
  if (anyLabel(labels, ['curl', 'coil']))
    return "Curl pattern visible, we'll use this to track changes in definition and moisture retention.";
  if (anyLabel(labels, ['hairline']) && stepTitle === 'Front hairline')
    return 'Hairline captured, this is your reference point for tracking any changes going forward.';
  if (stepTitle === 'Top of head')
    return 'Crown area captured, useful for monitoring any changes in density at the top.';
  if (stepTitle === 'Back and nape')
    return "Nape area captured, we'll use this to track edge health and any tension-related changes.";
  if (stepTitle === 'Side view')
    return 'Temple area captured, good reference for tracking hairline changes at the sides.';
  return 'Photo saved as your baseline reference for this area.';
};

// ─── VALIDATION ───────────────────────────────────────────────────────────────
interface ValidationResult {
  valid:        boolean;
  reason?:      string;
  labels?:      string[];
  observation?: string;
}

const validateScalpPhoto = async (base64: string, stepTitle: string, gender: string = 'woman'): Promise<ValidationResult> => {
  try {
    // The edge function call has no abort signal, so the timeout is a race.
    const { labels, safeSearch: safe } = await Promise.race([
      analyseImage(base64),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('vision timeout')), VISION_TIMEOUT)
      ),
    ]);
    console.log('[Vision] Labels:', labels);

    const hasHairSignal   = anyLabel(labels, HAIR_SIGNALS);
    const hasPersonSignal = anyLabel(labels, PERSON_SIGNALS);

    // ── 1. Safety ─────────────────────────────────────────────────────────
   if (safe.adult === 'VERY_LIKELY' || safe.violence === 'VERY_LIKELY') {
      return { valid: false, reason: 'This image was flagged. Please use a different photo.' };
    }

    // ── 2. Junk and fake content ──────────────────────────────────────────
    // Checked BEFORE the person gate. Previously these were gated behind
    // !hasPersonSignal, and the person list was so loose that they never ran.
    if (!hasHairSignal && anyLabel(labels, FAKE_WORDS)) {
      return { valid: false, reason: "This doesn't look like a real photo. Please upload a close-up of your scalp or hair." };
    }
    if (!hasHairSignal && anyLabel(labels, HARD_JUNK)) {
      const found = labels.find(l => HARD_JUNK.some(k => hasLabel([l], k))) || 'something unrelated';
      return { valid: false, reason: `This photo appears to show ${found}. Please upload a photo of your scalp or hair.` };
    }

    // ── 3. Hard gate: is there hair or a person here at all? ───────────────
    // This is the check that was missing entirely. Without it, any photo that
    // dodged the junk list walked straight into the angle check.
    if (!hasHairSignal && !hasPersonSignal) {
      return { valid: false, reason: "We couldn't find hair or a scalp in this photo. Please upload a close-up of your scalp or hairline." };
    }

    // ── 4. Angle check ────────────────────────────────────────────────────
    const config = angleConfigs[stepTitle];
    if (config) {
      // Men's short hair (fades, buzz cuts, shaved crowns) rarely triggers the
      // texture/style labels the top-down and back steps look for, so Vision
      // returns generic labels instead. Broaden the WEAK list only, so these
      // still require a hair signal to count, and loosen the wrong-angle bar.
      const isMale = gender === 'man';
      const maleLenientStep = isMale && (stepTitle === 'Top of head' || stepTitle === 'Back and nape');
      const weakSignals = maleLenientStep
        ? [...config.weakSignals, 'buzz cut', 'crew cut', 'fade', 'undercut',
           'shaved head', 'bald', 'head', 'hairline', 'scalp', 'hairstyle']
        : config.weakSignals;
      const wrongThreshold = maleLenientStep ? config.wrongAngleThreshold + 1 : config.wrongAngleThreshold;

      const hasStrong  = anyLabel(labels, config.strongSignals);
      const hasWeak    = anyLabel(labels, weakSignals);
      const hasRight   = hasStrong || (hasWeak && hasHairSignal);
      const wrongCount = countLabels(labels, config.wrongAngleSignals);

      if (!hasRight) {
        return { valid: false, reason: config.angleHint };
      }
      // Strong evidence of the opposite angle overrides a right-angle match
      if (wrongCount >= wrongThreshold) {
        return { valid: false, reason: config.angleHint };
      }
    }

    // ── 5. All good ───────────────────────────────────────────────────────
    const observation = generateObservation(labels, stepTitle);
    return { valid: true, labels, observation: observation || undefined };

  } catch (err) {
    console.warn('[Vision] Validation skipped:', err);
    return { valid: true }; // always fail open if the API is down or times out
  }
};

// ─── STEPS ────────────────────────────────────────────────────────────────────
interface ScalpStep {
  title:          string;
  instruction:    string;
  referenceImage: string;
}

const getScalpSteps = (gender: string): ScalpStep[] => {
  const isMale = gender === 'man';
  if (isMale) return [
    { title: 'Front hairline', instruction: 'Face the camera directly. Pull hair back to show your hairline and temples clearly.', referenceImage: scalpFrontMale },
    { title: 'Side view',      instruction: 'Turn to one side. Show your temple and the hairline around your ear.',                referenceImage: scalpSideMaleB },
    { title: 'Top of head',    instruction: 'Tilt your head forward. Hold phone above pointing down at your crown.',              referenceImage: scalpTopMale   },
    { title: 'Back and nape',  instruction: 'Show the back of your head and nape. Use a mirror or ask someone to help.',          referenceImage: scalpBackMale  },
  ];
  return [
    { title: 'Front hairline', instruction: 'Face the camera directly. Pull hair back to show your hairline and temples clearly.', referenceImage: scalpFrontFemale },
    { title: 'Side view',      instruction: 'Turn to one side. Show your temple and the hairline around your ear.',                referenceImage: scalpSideFemale  },
    { title: 'Top of head',    instruction: 'Tilt your head forward. Hold phone above pointing down at your crown.',              referenceImage: scalpTopFemale   },
    { title: 'Back and nape',  instruction: 'Show the back of your head and nape. Use a mirror or ask someone to help.',          referenceImage: scalpBackFemale  },
  ];
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const sage   = '#2E4A39'; // forest green, matches app-wide palette
const border = '#E3E7DE';
const itemBg = '#EDEFE7';
const ink    = '#2d2d2d';
const muted  = '#9e9e9e';
const red    = '#B05040';
const red10  = 'rgba(176,80,64,0.08)';
const gold   = '#2E4A39';
const gold10 = 'rgba(46,74,57,0.08)';

// ─── COMPONENT ────────────────────────────────────────────────────────────────
interface Props {
  onComplete: (photos: { area: string; dataUrl: string }[]) => void;
  onBack:     () => void;
  gender?:    string;
}

type PhotoStep = 'capture' | 'validating' | 'invalid' | 'confirmed';

const ScalpBaselineCapture = ({ onComplete, onBack, gender = 'woman' }: Props) => {
  const scalpSteps = getScalpSteps(gender);
  const [currentStep, setCurrentStep]       = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<{ area: string; dataUrl: string }[]>([]);
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null);
  const [photoStep, setPhotoStep]           = useState<PhotoStep>('capture');
  const [invalidReason, setInvalidReason]   = useState<string>('');
  const [observation, setObservation]       = useState<string | null>(null);
  const [attempts, setAttempts]             = useState(0);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const step = scalpSteps[currentStep];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      setPhotoStep('validating');
      setObservation(null);
      // Downscaled copy for Vision only,the full-res dataUrl above is what
      // gets shown and saved.
      const base64 = await compressForVision(dataUrl);
      const result = await validateScalpPhoto(base64, step.title, gender);
      if (!result.valid) {
        setAttempts(a => a + 1);
        setInvalidReason(result.reason || 'Please upload a close-up of your scalp or hairline.');
        setPhotoStep('invalid');
      } else {
        setObservation(result.observation || null);
        setPhotoStep('confirmed');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUsePhoto = () => {
    if (!previewUrl) return;
    const newPhotos = [...capturedPhotos, { area: step.title, dataUrl: previewUrl }];
    setCapturedPhotos(newPhotos);
    setPreviewUrl(null);
    setPhotoStep('capture');
    setObservation(null);
    setInvalidReason('');
    setAttempts(0);
    if (currentStep < scalpSteps.length - 1) setCurrentStep(currentStep + 1);
    else {
      saveBaselinePhotos(newPhotos); // persist to DB, fire-and-forget, never blocks onboarding
      onComplete(newPhotos);
    }
  };

  const handleRetry = () => {
    setPreviewUrl(null);
    setPhotoStep('capture');
    setInvalidReason('');
    setObservation(null);
  };

  const handleSkip = () => {
    if (currentStep < scalpSteps.length - 1) setCurrentStep(currentStep + 1);
    else {
      saveBaselinePhotos(capturedPhotos); // persist whatever was captured
      onComplete(capturedPhotos);
    }
  };

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: muted, marginBottom: 4 }}>
        Step {currentStep + 1} of {scalpSteps.length}
      </p>

      {/* Thumbnail strip */}
      {capturedPhotos.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {capturedPhotos.map((p, i) => (
            <div key={i} style={{ position: 'relative', width: 40, height: 40, borderRadius: 8, overflow: 'hidden', border: `2px solid ${sage}` }}>
              <img src={p.dataUrl} alt={p.area} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={8} color="#fff" strokeWidth={3} />
              </div>
            </div>
          ))}
          {Array.from({ length: scalpSteps.length - capturedPhotos.length }).map((_, i) => (
            <div key={`empty-${i}`} style={{ width: 40, height: 40, borderRadius: 8, border: `1.5px dashed ${border}`, background: itemBg }} />
          ))}
        </div>
      )}

      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 4, color: ink }}>{step.title}</h2>
      <p style={{ fontSize: '0.875rem', color: muted, marginBottom: 16, lineHeight: 1.6 }}>
        {currentStep === 3 ? "Show the back of your head and nape. This one's tricky on your own." : step.instruction}
      </p>

      <AnimatePresence mode="wait">

        {/* ── Capture ── */}
        {photoStep === 'capture' && (
          <motion.div key="capture" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${border}`, marginBottom: 16, background: itemBg }}>
              <img src={step.referenceImage} alt={`Reference: ${step.title}`}
                style={{ width: '100%', height: 240, objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ width: '100%', height: 56, borderRadius: 12, background: sage, color: '#fff', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <Camera size={18} strokeWidth={1.8} /> Take photo
                <input ref={cameraRef} type="file" accept="image/*" capture="user" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
              <label style={{ width: '100%', height: 56, borderRadius: 12, border: `1.5px solid ${border}`, background: itemBg, fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: ink }}>
                <ImageIcon size={18} strokeWidth={1.8} /> Choose from gallery
                <input ref={galleryRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            </div>
            {currentStep === 3 && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button onClick={handleSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sage, fontWeight: 600, fontSize: '0.875rem' }}>
                  Skip this one for now
                </button>
                <p style={{ fontSize: '0.75rem', color: muted, marginTop: 6, lineHeight: 1.5 }}>
                  You can add it later or ask someone to help next time you're at the salon.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Validating ── */}
        {photoStep === 'validating' && (
          <motion.div key="validating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {previewUrl && (
              <div style={{ borderRadius: 12, overflow: 'hidden', height: 200, marginBottom: 16 }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${border}`, borderTopColor: sage }} />
              <p style={{ fontSize: '0.875rem', color: ink, fontWeight: 500 }}>Checking your photo…</p>
              <p style={{ fontSize: '0.75rem', color: muted, textAlign: 'center', lineHeight: 1.5 }}>
                Verifying this is the right angle for {step.title.toLowerCase()}.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Invalid ── */}
        {photoStep === 'invalid' && (
          <motion.div key="invalid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {previewUrl && (
              <div style={{ borderRadius: 12, overflow: 'hidden', height: 180, marginBottom: 14, filter: 'brightness(0.65)' }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ background: red10, border: `1px solid rgba(176,80,64,0.25)`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                <AlertCircle size={15} color={red} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: red, margin: 0 }}>Let's try that again</p>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 0 23px', lineHeight: 1.6 }}>{invalidReason}</p>
            </div>
            <button onClick={handleRetry}
              style={{ width: '100%', height: 56, borderRadius: 12, border: 'none', background: ink, color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
              Try a different photo
            </button>
            {attempts >= 2 && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <button onClick={handleUsePhoto}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: sage, fontWeight: 600, fontSize: '0.875rem' }}>
                  Use this photo anyway
                </button>
                <p style={{ fontSize: '0.75rem', color: muted, marginTop: 6, lineHeight: 1.5 }}>
                  Sure it's the right area? Our check isn't perfect, you can keep this photo and continue.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Confirmed ── */}
        {photoStep === 'confirmed' && (
          <motion.div key="confirmed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {previewUrl && (
              <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 14, position: 'relative' }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', top: 10, right: 10, background: sage, borderRadius: 100, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Check size={11} color="#fff" strokeWidth={2.5} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>Verified</span>
                </div>
              </div>
            )}

            {observation && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{ background: gold10, border: `1px solid rgba(184,137,62,0.2)`, borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                  <Sparkles size={13} color={gold} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: gold, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Observation</p>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#555', margin: 0, lineHeight: 1.6 }}>{observation}</p>
              </motion.div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleUsePhoto}
                style={{ width: '100%', height: 56, borderRadius: 12, border: 'none', background: sage, color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                Use this photo
              </button>
              <button onClick={handleRetry}
                style={{ width: '100%', height: 56, borderRadius: 12, border: `1.5px solid ${border}`, background: itemBg, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', color: ink }}>
                Retake
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default ScalpBaselineCapture;