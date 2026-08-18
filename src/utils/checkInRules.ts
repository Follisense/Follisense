import type { CheckInData } from '@/contexts/AppContext';

type RiskLevel = 'green' | 'amber' | 'red';

const NONE_VALUES = ['None', 'No', 'No change', 'Normal', 'No concerns', 'No breakage', 'Looks healthy, no changes', 'Soft and moisturised as usual', 'Feels normal', 'No, hair feels normal'];
const MILD_VALUES = ['Mild', 'A little', 'Some flaking', 'Slight concern', 'A bit dry', 'A bit dry or tight', 'A little more than usual', 'A little more breakage or dryness than usual', 'A little, mostly at the ends', 'A little, at the ends or edges', 'More than usual', 'Looks a bit thinner', 'Looks a bit different', 'Slight recession at temples', 'A bit dull or lacklustre', 'Minor razor bumps', 'A few bumps'];
const MODERATE_VALUES = ['Moderate', 'Yes, noticeably', 'Noticeable change', 'Noticeable thinning', 'Significantly more', 'Noticeably dry, brittle, or breaking more than usual', 'Moderate, breaking along the length', 'Moderate, noticeable thinning', 'Noticeably thinner or less volume', 'Very dry or brittle', 'Very dry, flaky, or oily', 'Moderate — several areas', 'Ingrown hairs', 'Heavy flaking'];
const SEVERE_VALUES = ['Severe', 'Yes, painful', 'Very concerned', "I'm concerned", 'Alarming amount', "Concerned about my hair's condition", 'Significant', 'Significant — widespread', 'Folliculitis', 'Significant, breaking at the root or in patches', 'Significant change in appearance or density', "Yes, I'm concerned", 'Different texture than usual', 'Different than usual'];

const SYMPTOM_KEYS: (keyof CheckInData)[] = ['itch', 'tenderness', 'hairline', 'flaking', 'shedding', 'bumps', 'dryness', 'hairBreakage', 'hairAppearance', 'hairConcern'];

const getSeverityLevel = (value: string | undefined): number => {
  if (!value || NONE_VALUES.includes(value)) return 0;
  if (MILD_VALUES.includes(value)) return 1;
  if (MODERATE_VALUES.includes(value)) return 2;
  if (SEVERE_VALUES.includes(value)) return 3;
  return 1; // default to mild for unknown values
};

const isSymptomPresent = (value: string | undefined): boolean => {
  return !!value && !NONE_VALUES.includes(value);
};

/**
 * Historical triage: compares current check-in against history.
 *
 * GREEN: No symptoms, single mild symptom first time, or resolved symptoms.
 * AMBER: Any tenderness, first-time moderate symptom, mild persisting 2+ check-ins,
 *        2+ simultaneous mild symptoms.
 * RED:   Any severe symptom, 3+ moderate symptoms simultaneously,
 *        significant hairline change + tenderness (both moderate+),
 *        symptom persisting 3+ check-ins without improvement,
 *        worsening trend from amber.
 */
export const computeCheckInStatus = (
  current: CheckInData,
  history: CheckInData[]
): RiskLevel => {
  const currentSymptoms: Record<string, number> = {};
  let activeSymptomCount   = 0;
  let moderateSymptomCount = 0;

  for (const key of SYMPTOM_KEYS) {
    const val   = current[key] as string | undefined;
    const level = getSeverityLevel(val);
    currentSymptoms[key] = level;
    if (level > 0) activeSymptomCount++;
    if (level >= 2) moderateSymptomCount++;
  }

  // ── RED triggers ──────────────────────────────────────────────────────────

  // Any single severe symptom → red
  if (Object.values(currentSymptoms).some(l => l >= 3)) return 'red';

  // 3+ MODERATE symptoms simultaneously → red (was 3+ any symptoms — too aggressive)
  if (moderateSymptomCount >= 3) return 'red';

  // Significant hairline change AND significant tenderness (both must be moderate+) → red
  if (currentSymptoms.hairline >= 2 && currentSymptoms.tenderness >= 2) return 'red';

  // Persistence and worsening checks
  for (const key of SYMPTOM_KEYS) {
    const currentLevel = currentSymptoms[key];
    if (currentLevel === 0) continue;

    let persistenceCount = 1;
    for (const prev of history) {
      if (isSymptomPresent(prev[key] as string | undefined)) persistenceCount++;
      else break;
    }

    // Symptom persisting 3+ check-ins with no improvement → red
    if (persistenceCount >= 3) {
      const lastLevel = history.length > 0
        ? getSeverityLevel(history[0][key] as string | undefined)
        : 0;
      if (currentLevel >= lastLevel) return 'red';
    }

    // Was moderate+, got worse → red
    if (history.length > 0) {
      const lastLevel = getSeverityLevel(history[0][key] as string | undefined);
      if (lastLevel >= 2 && currentLevel > lastLevel) return 'red';
      // Worsening trend over 2+ check-ins → red
      if (lastLevel >= 1 && currentLevel > lastLevel && persistenceCount >= 2) return 'red';
    }
  }

  // ── AMBER triggers ────────────────────────────────────────────────────────

  for (const key of SYMPTOM_KEYS) {
    const currentLevel = currentSymptoms[key];
    if (currentLevel === 0) continue;

    // Any tenderness (even mild) → amber
    if (key === 'tenderness' && currentLevel >= 1) return 'amber';

    // Any moderate symptom → amber
    if (currentLevel >= 2) return 'amber';

    // Mild symptom persisting from last check-in → amber
    if (currentLevel === 1 && history.length > 0) {
      const prevPresent = isSymptomPresent(history[0][key] as string | undefined);
      if (prevPresent) return 'amber';
    }
  }

  // 2+ mild symptoms at once → amber (was not in original, catches multi-mild cases)
  if (activeSymptomCount >= 2) return 'amber';

  // ── GREEN ─────────────────────────────────────────────────────────────────
  return 'green';
};

/**
 * Generate specific triage guidance based on risk level and symptom patterns.
 */
export const getTriageGuidance = (
  risk: RiskLevel,
  current: CheckInData,
  history: CheckInData[]
): { heading: string; message: string }[] => {
  const guidance: { heading: string; message: string }[] = [];

  if (risk === 'amber') {
    for (const key of SYMPTOM_KEYS) {
      if (!isSymptomPresent(current[key] as string | undefined)) continue;

      const level     = getSeverityLevel(current[key] as string | undefined);
      const prevCount = history.filter(h => isSymptomPresent(h[key] as string | undefined)).length;
      const label     = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');

      if (prevCount >= 1) {
        guidance.push({
          heading: label,
          message: `Your ${key} has been present across ${prevCount + 1} check-ins. We recommend self-care and will reassess at your next check-in.`,
        });
      } else if (level >= 2) {
        guidance.push({
          heading: label,
          message: `This is the first time we're seeing moderate ${key}. Keep an eye on it and check in again if it worsens.`,
        });
      }
    }
  }

  if (risk === 'red') {
    // Add specific symptom context for red
    for (const key of SYMPTOM_KEYS) {
      const level = getSeverityLevel(current[key] as string | undefined);
      if (level < 2) continue;

      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      const prevCount = history.filter(h => isSymptomPresent(h[key] as string | undefined)).length;

      if (level >= 3) {
        guidance.push({
          heading: label,
          message: `You reported severe ${key}. This warrants professional assessment rather than self-care alone.`,
        });
      } else if (prevCount >= 2) {
        guidance.push({
          heading: `Persistent ${label}`,
          message: `${label} has been present across ${prevCount + 1} consecutive check-ins without improvement. A professional can help identify the cause.`,
        });
      }
    }

    if (guidance.length === 0) {
      guidance.push({
        heading: 'Professional review recommended',
        message: 'Based on your symptom patterns, we recommend consulting a trichologist or dermatologist. Your clinical summary has been generated automatically.',
      });
    }
  }

  return guidance;
};