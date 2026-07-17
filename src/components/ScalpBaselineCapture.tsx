import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ImageIcon, AlertCircle, Check, Sparkles } from 'lucide-react';
import { saveBaselinePhotos } from '@/services/photoUploadService';

import scalpFrontFemale from '@/assets/scalp-front-female.jpeg';
import scalpSideFemale  from '@/assets/scalp-side-female.jpeg';
import scalpBackFemale  from '@/assets/scalp-back-female.jpeg';
import scalpTopFemale   from '@/assets/scalp-top-female.jpeg';
import scalpFrontMale   from '@/assets/ref-male-front.jpg';
import scalpSideMaleB   from '@/assets/scalp-side-male-b.jpeg';
import scalpBackMale    from '@/assets/scalp-back-male.png';
import scalpTopMale     from '@/assets/scalp-top-male.png';

const GOOGLE_VISION_KEY = import.meta.env.VITE_GOOGLE_VISION_KEY as string;

// ─── ANGLE CONFIGS ────────────────────────────────────────────────────────────
// Middle-ground rules:
//   PASS  → photo has at least one right-angle signal for this step
//   REJECT (angle) → photo has a right-angle signal BUT also has wrongAngleThreshold+
//                    wrong-angle signals (clear evidence of the wrong angle)
//   REJECT (no signal) → no right-angle signal AND a person is otherwise detected
//                        (generic hair shot submitted to wrong step)
//
// Generic labels like "hair", "skin", "person", "head" are intentionally excluded
// from rightAngleSignals,they must come from angle-specific anatomy/texture labels
// so random hair photos can't accidentally pass the wrong step.
interface StepAngleConfig {
  rightAngleSignals:   string[];   // step-specific; at least one must match
  wrongAngleSignals:   string[];   // if threshold+ match alongside a right signal → reject
  wrongAngleThreshold: number;
  angleHint:           string;
}

const angleConfigs: Record<string, StepAngleConfig> = {
  'Front hairline': {
    // Forward-facing anatomy
    rightAngleSignals:   ['forehead', 'hairline', 'face', 'portrait', 'nose',
                          'eye', 'brow', 'cheek', 'chin', 'mouth', 'selfie', 'front'],
    // Back/side-only signals that contradict a front view
    wrongAngleSignals:   ['nape', 'occiput', 'profile', 'back of head'],
    wrongAngleThreshold: 2, // rare to get 2+ of these unless it's genuinely a back shot
    angleHint:           'Face the camera directly so your hairline and forehead are clearly visible.',
  },

  'Side view': {
    // Side-profile anatomy,ear/temple/jaw/cheek are the reliable signals.
    // Forehead, nose, and mouth all appear naturally in a side profile (you can
    // see them from the side) so we never penalise them. The only wrong-angle
    // evidence for a side shot is truly back-of-head signals, which are caught
    // by the rightAngleSignals requirement,no ear/temple means no pass.
    rightAngleSignals:   ['ear', 'temple', 'profile', 'jaw', 'cheek',
                          'sideburn', 'sideburns', 'side'],
    wrongAngleSignals:   ['nape', 'occiput', 'back of head'],
    wrongAngleThreshold: 2, // only block if it looks like a back shot, not a front shot
    angleHint:           'Turn your head to the side until your ear and temple are clearly visible.',
  },

  'Top of head': {
    // Top-down shots: Vision returns texture/scalp/crown or recognises the style
    rightAngleSignals:   ['scalp', 'crown', 'texture', 'macro', 'pattern',
                          'hair texture', 'black hair', 'brown hair', 'coil',
                          'afro', 'braid', 'loc', 'dreadlock', 'cornrow', 'kink',
                          'close-up'],
    // Full-face signals → they haven't tilted forward
    wrongAngleSignals:   ['face', 'eye', 'nose', 'mouth', 'forehead', 'portrait', 'selfie'],
    wrongAngleThreshold: 2, // 2 face features together = clearly not top-down
    angleHint:           "Tilt your head forward and point the camera straight down at your crown. Your face shouldn't be in the shot.",
  },

  'Back and nape': {
    // Back-of-head anatomy or styles typically seen from behind
    rightAngleSignals:   ['neck', 'nape', 'back', 'occiput', 'shoulder',
                          'bun', 'ponytail', 'updo', 'braid', 'loc',
                          'dreadlock', 'black hair', 'brown hair'],
    // Forward-face signals → they're looking at the camera
    wrongAngleSignals:   ['face', 'eye', 'nose', 'mouth', 'forehead', 'portrait', 'selfie', 'chin'],
    wrongAngleThreshold: 2,
    angleHint:           "Show the back of your head and nape. Use a mirror or ask someone to help,your face shouldn't be visible.",
  },
};

// ─── OBSERVATION GENERATOR ────────────────────────────────────────────────────
const generateObservation = (labels: string[], stepTitle: string): string | null => {
  const l = labels.join(' ');

  if (l.includes('afro') || l.includes('natural'))
    return 'Natural texture captured,great baseline for tracking density and moisture over time.';
  if (l.includes('braid') || l.includes('cornrow'))
    return "Braided style visible,we'll track tension patterns and hairline health around your style.";
  if (l.includes('loc') || l.includes('dreadlock'))
    return 'Locs captured,useful for monitoring scalp visibility and buildup over time.';
  if (l.includes('curl') || l.includes('coil'))
    return "Curl pattern visible,we'll use this to track changes in definition and moisture retention.";
  if (l.includes('hairline') && stepTitle === 'Front hairline')
    return 'Hairline captured,this is your reference point for tracking any changes going forward.';
  if (stepTitle === 'Top of head')
    return 'Crown area captured,useful for monitoring any changes in density at the top.';
  if (stepTitle === 'Back and nape')
    return "Nape area captured,we'll use this to track edge health and any tension-related changes.";
  if (stepTitle === 'Side view')
    return 'Temple area captured,good reference for tracking hairline changes at the sides.';

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
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [
              { type: 'LABEL_DETECTION',    maxResults: 20 },
              { type: 'TEXT_DETECTION',     maxResults: 1  },
              { type: 'SAFE_SEARCH_DETECTION'              },
            ],
          }],
        }),
      }
    );
    if (!res.ok) throw new Error(`Vision API error: ${res.status}`);
    const data   = await res.json();
    const result = data.responses?.[0];
    const labels: string[] = (result?.labelAnnotations || []).map((l: any) => l.description.toLowerCase());
    console.log('[Vision] Labels:', labels);

    // ── 1. Safety ─────────────────────────────────────────────────────────
    const safe = result?.safeSearchAnnotation || {};
    if (safe.adult === 'VERY_LIKELY' || safe.violence === 'VERY_LIKELY') {
      return { valid: false, reason: 'This image was flagged. Please use a different photo.' };
    }

    // ── 2. Basic person/hair presence ─────────────────────────────────────
    // Used only to distinguish "wrong step" from "completely unrelated photo"
    const personSignals = ['hair', 'scalp', 'skin', 'head', 'person', 'human', 'face',
      'forehead', 'neck', 'hairline', 'hairstyle', 'afro', 'braid', 'loc', 'curl',
      'beauty', 'close-up', 'macro', 'portrait', 'nape', 'ear', 'cheek', 'texture',
      'black hair', 'brown hair', 'coil', 'pattern', 'jaw', 'temple', 'eye', 'nose'];
    const hasPersonSignal = personSignals.some(k => labels.some(l => l.includes(k)));

    // Clearly non-photo / fake content
    const fakeWords = ['cartoon', 'animation', 'illustration', 'drawing', 'clipart',
      'skull', 'diagram', '3d render', 'comic', 'manga', 'anime', 'screenshot',
      'web page', 'website', 'graphic design', 'logo'];
    if (fakeWords.some(k => labels.some(l => l.includes(k))) && !hasPersonSignal) {
      return { valid: false, reason: "This doesn't look like a real photo. Please upload a close-up of your scalp or hair." };
    }

    // Completely unrelated subjects
    const hardJunk = ['food', 'meal', 'cuisine', 'landscape', 'plant', 'flower',
      'tree', 'sky', 'furniture', 'animal', 'cat', 'dog', 'bird', 'car', 'vehicle'];
    if (hardJunk.some(k => labels.some(l => l.includes(k))) && !hasPersonSignal) {
      const found = labels.find(l => hardJunk.some(k => l.includes(k))) || 'something unrelated';
      return { valid: false, reason: `This photo appears to show ${found}. Please upload a photo of your scalp or hair.` };
    }

    // ── 3. Angle check ────────────────────────────────────────────────────
    const config = angleConfigs[stepTitle];
    if (config) {
      // Men's short hair (fades, buzz cuts, thinning/shaved crowns) rarely triggers
      // the texture/curl/style labels the top-down and back steps look for, so Vision
      // returns generic labels like "hair", "skin", "head" instead. Without this the
      // male Top-of-head and Back steps reject every photo. Broaden what counts as a
      // valid signal for men on those two steps, and be a touch more forgiving on the
      // wrong-angle threshold.
      const isMale = gender === 'man';
      const maleLenientStep = isMale && (stepTitle === 'Top of head' || stepTitle === 'Back and nape');
      const rightSignals = maleLenientStep
        ? [...config.rightAngleSignals, 'hair', 'hairstyle', 'buzz cut', 'fade',
           'shaved', 'bald', 'head', 'skin', 'undercut', 'hairline', 'scalp']
        : config.rightAngleSignals;
      const wrongThreshold = maleLenientStep ? config.wrongAngleThreshold + 1 : config.wrongAngleThreshold;

      const hasRightAngle = rightSignals.some(k => labels.some(l => l.includes(k)));
      const wrongCount    = config.wrongAngleSignals.filter(k => labels.some(l => l.includes(k))).length;

      if (!hasRightAngle) {
        // They uploaded a hair photo but for the wrong step
        if (hasPersonSignal) {
          return { valid: false, reason: config.angleHint };
        }
        // No hair/person at all
        return { valid: false, reason: `We couldn't detect the right angle for this step. ${config.angleHint}` };
      }

      // Has a right-angle signal but strong wrong-angle evidence overrides it
      if (wrongCount >= wrongThreshold) {
        return { valid: false, reason: config.angleHint };
      }
    }

    // ── 4. All good ───────────────────────────────────────────────────────
    const observation = generateObservation(labels, stepTitle);
    return { valid: true, labels, observation: observation || undefined };

  } catch (err) {
    console.warn('[Vision] Validation skipped:', err);
    return { valid: true }; // always fail open if the API is down
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
const sage   = '#2E4A39'; // forest green,matches app-wide palette
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
      const base64  = dataUrl.split(',')[1];
      setPreviewUrl(dataUrl);
      setPhotoStep('validating');
      setObservation(null);
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
      saveBaselinePhotos(newPhotos); // persist to DB,fire-and-forget, never blocks onboarding
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
                  Sure it's the right area? Our check isn't perfect,you can keep this photo and continue.
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