// src/utils/maleTriageLogic.ts
import type { CheckInData } from '@/contexts/AppContext';

type RiskLevel = 'green' | 'amber' | 'red';

const NONE_VALUES = ['None', 'No', 'No change', 'Normal', 'No concerns'];

export const getSeverityLevel = (value: string | undefined): number => {
  if (!value || NONE_VALUES.includes(value)) return 0;
  if (value === 'Mild') return 1;
  if (value === 'Moderate') return 2;
  if (value === 'Severe') return 3;
  // Legacy string values
  if (['A little', 'A few bumps', 'Minor razor bumps', 'Slight recession at temples'].includes(value)) return 1;
  if (['Moderate', 'Ingrown hairs', 'Noticeably thinner', 'Heavy flaking'].includes(value)) return 2;
  if (['Severe', 'Significant', 'Folliculitis'].includes(value)) return 3;
  return 1;
};

export const computeMaleTriageRisk = (
  current: CheckInData,
  history: CheckInData[],
  currentNorwood: string,
  baselineNorwood: string
): RiskLevel => {
  const keys = ['itch', 'tenderness', 'hairline', 'flaking', 'shedding', 'bumps', 'dryness',
                'hairlineChange', 'thinning', 'scalpIssues', 'razorBumps', 'barberIrritation',
                'buildup', 'breakage'];

  let severeCount   = 0;
  let moderateCount = 0;
  let mildCount     = 0;

  for (const key of keys) {
    const val = (current as any)[key] as string | undefined;
    const level = getSeverityLevel(val);
    if (level >= 3) severeCount++;
    else if (level >= 2) moderateCount++;
    else if (level >= 1) mildCount++;
  }

  // Norwood progression
  const norwoodProgressed = currentNorwood && baselineNorwood && currentNorwood !== baselineNorwood;
  const norwoodStage = parseInt(currentNorwood?.replace(/\D/g, '') || '0');

  // RED triggers
  if (severeCount >= 1) return 'red';
  if (moderateCount >= 3) return 'red';
  if (moderateCount >= 2 && norwoodStage >= 4) return 'red';
  if (norwoodProgressed && moderateCount >= 1) return 'red';
  const hairlineLevel = getSeverityLevel((current as any).hairlineChange || current.hairline);
  const thinningLevel = getSeverityLevel((current as any).thinning || current.hairline);
  if (hairlineLevel >= 2 && thinningLevel >= 2) return 'red';

  // AMBER triggers
  if (moderateCount >= 1) return 'amber';
  if (mildCount >= 2) return 'amber';
  if (norwoodStage >= 3 && mildCount >= 1) return 'amber';
  if (getSeverityLevel((current as any).razorBumps) >= 1) return 'amber';
  if (getSeverityLevel(current.tenderness) >= 1) return 'amber';

  // Persistence from history
  if (history.length > 0) {
    for (const key of keys) {
      const currentVal = (current as any)[key] as string | undefined;
      const prevVal    = (history[0] as any)[key] as string | undefined;
      if (getSeverityLevel(currentVal) >= 1 && getSeverityLevel(prevVal) >= 1) return 'amber';
    }
  }

  return 'green';
};

export const getMaleTriageMessage = (
  risk: RiskLevel,
  flaggedCount: number,
  severeCount: number
): string => {
  if (risk === 'green') return "Based on what you've shared, no concerning changes detected. Keep tracking.";
  if (risk === 'amber') return "You've reported some changes worth monitoring. We'll flag if this progresses.";
  if (severeCount > 0)  return "You've reported some severe symptoms that warrant professional attention.";
  return "Your symptoms suggest a pattern worth discussing with a professional.";
};

export const getMaleTriageReasoning = (
  risk: RiskLevel,
  responses: Record<string, string>,
  goals: string[],
  maleHasShortStyles: boolean,
  maleHasLongStyles: boolean
): string | null => {
  const flagged = Object.entries(responses)
    .filter(([, v]) => getSeverityLevel(v) > 0)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()} (${v.toLowerCase()})`);

  if (flagged.length === 0) return null;

  if (risk === 'green') {
    if (flagged.length === 1) return `You flagged one area as mild. On its own that's not a concern — we'll track it going forward.`;
    return null;
  }

  const names = flagged.join(', ');

  if (risk === 'amber') {
    if (maleHasShortStyles) return `You reported: ${names}. These are common after regular cuts. Let's see if they clear between visits.`;
    if (maleHasLongStyles)  return `You reported: ${names}. Worth monitoring over your next few check-ins.`;
    return `You reported: ${names}. Let's keep an eye on this.`;
  }

  if (risk === 'red') {
    return `You reported: ${names}. This pattern is why we're recommending a professional review.`;
  }

  return null;
};

export const getSeverityTransitionText = (responses: Record<string, string>): string => {
  const flagged = Object.values(responses).filter(v => getSeverityLevel(v) > 0);
  const severe  = Object.values(responses).filter(v => getSeverityLevel(v) >= 3);

  if (flagged.length === 0) return "Thank you. Your scalp is looking healthy.";
  if (severe.length > 0)    return "Thank you for sharing that. Let's take a look at what needs attention.";
  if (flagged.length >= 3)  return "Thanks for being thorough. Let's see what the picture looks like.";
  return "Thank you for sharing that. Let's take a look.";
};

export const computeSeverityDotSummary = (
  responses: Record<string, string>,
  keys: string[]
): { dots: number[]; summaryText: string; flaggedCount: number; severeCount: number } => {
  const dots        = keys.map(k => getSeverityLevel(responses[k]));
  const flaggedCount = dots.filter(d => d > 0).length;
  const severeCount  = dots.filter(d => d >= 3).length;
  const modCount     = dots.filter(d => d === 2).length;

  let summaryText = '';
  if (flaggedCount === 0)      summaryText = 'No symptoms flagged.';
  else if (severeCount > 0)    summaryText = `${flaggedCount} symptom${flaggedCount > 1 ? 's' : ''} flagged, including ${severeCount} severe.`;
  else if (modCount > 0)       summaryText = `${flaggedCount} symptom${flaggedCount > 1 ? 's' : ''} flagged, including ${modCount} moderate.`;
  else                         summaryText = `${flaggedCount} mild symptom${flaggedCount > 1 ? 's' : ''} flagged.`;

  return { dots, summaryText, flaggedCount, severeCount };
};

export const getInterimCareSteps = (
  risk: RiskLevel,
  responses: Record<string, string>,
  isMale: boolean
): string[] => {
  const steps: string[] = [];
  const hasRazorBumps    = getSeverityLevel(responses.razorBumps) > 0;
  const hasScalpIssues   = getSeverityLevel(responses.scalpIssues) > 0 || getSeverityLevel(responses.itch) > 0;
  const hasFlaking       = getSeverityLevel(responses.flaking) > 0;
  const hasThinning      = getSeverityLevel(responses.thinning) > 0 || getSeverityLevel(responses.hairlineChange) > 0;
  const hasBuildup       = getSeverityLevel(responses.buildup) > 0;

  if (risk === 'green') return steps;

  if (hasRazorBumps && isMale) {
    steps.push('Try switching to a single-blade razor or an electric clipper with a guard to reduce friction.');
    steps.push('Apply a gentle aftershave balm — avoid alcohol-based products on irritated skin.');
  }
  if (hasScalpIssues) {
    steps.push('Use a gentle, sulphate-free shampoo on wash day and avoid scratching with nails.');
  }
  if (hasFlaking) {
    steps.push('Try an anti-dandruff shampoo with ketoconazole (e.g. Nizoral) twice a week for two weeks and see if it improves.');
  }
  if (hasThinning && isMale) {
    steps.push('Take weekly photos of your hairline in good lighting to track any changes objectively.');
  }
  if (hasBuildup) {
    steps.push('Use a clarifying shampoo once a month to remove product and sebum buildup from the scalp.');
  }
  if (risk === 'red') {
    steps.push('Book an appointment with a trichologist or dermatologist — the sooner the better for the best outcome.');
  }

  return steps;
};