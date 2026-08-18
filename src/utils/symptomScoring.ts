// src/utils/symptomScoring.ts
// Converts text answers to numeric scores (0–3) for data analysis and triage

export interface SymptomScores {
  itch:          number; // 0–3
  tenderness:    number; // 0–3
  irritation:    number; // 0–3
  hairline:      number; // 0–3
  flaking:       number; // 0–2
  shedding:      number; // 0–3
  hairFeel:      number; // 0–3
  hairBreakage:  number; // 0–3
  hairAppearance:number; // 0–3
  hairConcern:   number; // 0–3
  total:         number;
}

// ─── Score maps ───────────────────────────────────────────────────────────────

export const SYMPTOM_SCORE_MAP: Record<string, Record<string, number>> = {
  itch: {
    'None': 0, 'Mild': 1, 'Moderate': 2, 'Severe': 3,
    // Onboarding severity labels
    'None — No itching': 0,
  },
  tenderness: {
    'None': 0, 'No': 0,
    'A little': 1, 'Mild': 1,
    'Yes, noticeably': 2, 'Moderate': 2,
    'Yes, painful': 3, 'Severe': 3,
  },
  irritation: {
    'None': 0,
    'A few bumps': 1, 'Minor razor bumps': 1, 'Mild': 1,
    'Moderate': 2, 'Moderate — several areas': 2, 'Ingrown hairs': 2,
    'Significant': 3, 'Significant — widespread': 3, 'Folliculitis — clusters of bumps': 3, 'Severe': 3,
  },
  hairline: {
    'No change': 0,
    'Looks a bit different': 1, 'Looks a bit thinner': 1, 'Slight recession at temples': 1, 'Slight recession': 1, 'Mild': 1,
    'Noticeable change': 2, 'Noticeable thinning': 2, 'Moderate': 2,
    "I'm concerned": 3, 'Severe': 3,
  },
  flaking: {
    'None': 0,
    'Some flaking': 1, 'Mild': 1,
    'Heavy flaking': 2, 'Moderate': 2, 'Severe': 2,
  },
  shedding: {
    'Normal': 0,
    'More than usual': 1, 'Mild': 1,
    'Significantly more': 2, 'Moderate': 2,
    'Alarming amount': 3, 'Severe': 3,
  },
  hairFeel: {
    'Soft and moisturised as usual': 0, 'Feels normal': 0, 'None': 0,
    'A bit dry': 1, 'A bit dry or tight': 1, 'Mild': 1,
    'Very dry or brittle': 2, 'Very dry, flaky, or oily': 2, 'Moderate': 2,
    'Different texture than usual': 3, 'Different than usual': 3, 'Severe': 3,
  },
  hairBreakage: {
    'No breakage': 0, 'None': 0,
    'A little, mostly at the ends': 1, 'A little, at the ends or edges': 1, 'Mild': 1,
    'Moderate, breaking along the length': 2, 'Moderate, noticeable thinning': 2, 'Moderate': 2,
    'Significant, breaking at the root or in patches': 3, 'Significant, patches or widespread': 3, 'Severe': 3,
  },
  hairAppearance: {
    'Looks healthy, no changes': 0, 'None': 0,
    'A bit dull or lacklustre': 1, 'Mild': 1,
    'Noticeably thinner or less volume': 2, 'Moderate': 2,
    'Significant change in appearance or density': 3, 'Severe': 3,
  },
  hairConcern: {
    'No, hair feels normal': 0, 'None': 0,
    'A little more than usual': 1, 'Mild': 1,
    'Yes, noticeably more': 2, 'Moderate': 2,
    "Yes, I'm concerned": 3, 'Severe': 3,
  },
  // Onboarding-specific keys
  bumps: {
    'None': 0, 'Mild': 1, 'Moderate': 2, 'Severe': 3,
  },
  dryness: {
    'None': 0, 'Mild': 1, 'Moderate': 2, 'Severe': 3,
  },
  edgeLoss: {
    'None': 0, 'Mild': 1, 'Moderate': 2, 'Severe': 3,
  },
  hairlineChange: {
    'None': 0, 'Mild': 1, 'Moderate': 2, 'Severe': 3,
  },
  thinning: {
    'None': 0, 'Mild': 1, 'Moderate': 2, 'Severe': 3,
  },
  scalpIssues: {
    'None': 0, 'Mild': 1, 'Moderate': 2, 'Severe': 3,
  },
  razorBumps: {
    'None': 0, 'Mild': 1, 'Moderate': 2, 'Severe': 3,
  },
  barberIrritation: {
    'None': 0, 'Mild': 1, 'Moderate': 2, 'Severe': 3,
  },
  buildup: {
    'None': 0, 'Mild': 1, 'Moderate': 2, 'Severe': 3,
  },
  breakage: {
    'None': 0, 'Mild': 1, 'Moderate': 2, 'Severe': 3,
  },
    // Part width and crown density. Scored separately from the composite and
  // surfaced only in the clinician summary.
  // Old camelCase keys kept alongside the new ones so check-ins already in the
  // database still score. Remove once no rows use them.
  centerPartWidening: {
    'No change': 0, 'Slightly wider': 1, 'Noticeably wider': 2, 'Much wider': 3,
  },
  crownThinning: {
    'No change': 0, 'Slightly thinner': 1, 'Noticeably thinner': 2, 'See-through at the crown': 3,
  },
  part_width_change: {
  
    'No change': 0, 'Slightly wider': 1, 'Noticeably wider': 2, 'Much wider': 3,
  },
   crown_density_change: {
    'No change': 0, 'Slightly thinner': 1, 'Noticeably thinner': 2, 'See-through at the crown': 3,
  },
};

// ─── Score a single symptom ───────────────────────────────────────────────────
export const scoreSymptom = (key: string, value: string | undefined): number => {
  if (!value) return 0;
  const map = SYMPTOM_SCORE_MAP[key];
  if (!map) return 0;
  return map[value] ?? 0;
};

// ─── Score all symptoms ───────────────────────────────────────────────────────
export const scoreSymptoms = (answers: Record<string, string>): SymptomScores => {
  const itch            = scoreSymptom('itch',            answers.itch);
  const tenderness      = scoreSymptom('tenderness',      answers.tenderness);
  const irritation      = scoreSymptom('irritation',      answers.irritation);
  const hairline        = scoreSymptom('hairline',        answers.hairline);
  const flaking         = scoreSymptom('flaking',         answers.flaking);
  const shedding        = scoreSymptom('shedding',        answers.shedding);
  const hairFeel        = scoreSymptom('hairFeel',        answers.hairFeel);
  const hairBreakage    = scoreSymptom('hairBreakage',    answers.hairBreakage);
  const hairAppearance  = scoreSymptom('hairAppearance',  answers.hairAppearance);
  const hairConcern     = scoreSymptom('hairConcern',     answers.hairConcern);

  const total = itch + tenderness + irritation + hairline + flaking + shedding + hairFeel + hairBreakage + hairAppearance + hairConcern;

  return { itch, tenderness, irritation, hairline, flaking, shedding, hairFeel, hairBreakage, hairAppearance, hairConcern, total };
};

// ─── Score → Risk (composite — NOT based on single symptom severity) ──────────
// Total possible: 29
// Green:  0–5   (mild scattered symptoms)
// Amber:  6–13  (multiple moderate, or a few severe)
// Red:   14+    (widespread moderate/severe)
export const scoreToRisk = (total: number): 'green' | 'amber' | 'red' => {
  if (total >= 14) return 'red';
  if (total >= 6)  return 'amber';
  return 'green';
};

// ─── Severe-symptom safety floor ─────────────────────────────────────────────
// The composite score can hide a single severe symptom — e.g. "Alarming amount"
// of shedding scores only 3, which alone reads green. These symptoms are serious
// enough that they should never be dismissed as green.
//
// Rule: if shedding OR itch is at its WORST level (score 3), the result is
// floored at amber. The composite still decides red on its own — a severe
// symptom guarantees *at least* amber, it does not force red.
const RISK_RANK: Record<'green' | 'amber' | 'red', number> = { green: 0, amber: 1, red: 2 };

export const scoreToRiskWithFlags = (
  scores: SymptomScores
): 'green' | 'amber' | 'red' => {
  const composite = scoreToRisk(scores.total);

  // Severe shedding or severe itch → floor at amber
  const hasSevereFlag = scores.shedding >= 3 || scores.itch >= 3;
  if (!hasSevereFlag) return composite;

  // Take whichever is worse: the composite result, or amber
  return RISK_RANK[composite] >= RISK_RANK['amber'] ? composite : 'amber';
};

// Convenience: score raw answers straight to a flag-aware risk level.
export const answersToRisk = (
  answers: Record<string, string>
): 'green' | 'amber' | 'red' => {
  return scoreToRiskWithFlags(scoreSymptoms(answers));
};

// ─── Build numeric payload for Supabase ──────────────────────────────────────
export const buildNumericPayload = (answers: Record<string, string>) => {
  const scores = scoreSymptoms(answers);
  return {
    itch_score:             scores.itch,
    tenderness_score:       scores.tenderness,
    irritation_score:       scores.irritation,
    hairline_score:         scores.hairline,
    flaking_score:          scores.flaking,
    shedding_score:         scores.shedding,
    hair_feel_score:        scores.hairFeel,
    hair_breakage_score:    scores.hairBreakage,
    hair_appearance_score:  scores.hairAppearance,
    hair_concern_score:     scores.hairConcern,
    // These two columns exist on the table but were never in this payload, so
    // they could not be anything but 0. Scored from answers directly because
    // scoreSymptoms() only covers its fixed key set.
    bumps_score:            scoreSymptom('bumps',   answers.bumps),
    dryness_score:          scoreSymptom('dryness', answers.dryness),
    total_score:            scores.total,
    // risk_level now respects the severe-symptom floor
    risk_level:             scoreToRiskWithFlags(scores),
  };
};

// ─── Score label for display ─────────────────────────────────────────────────
export const scoreLabel = (n: number): string => {
  if (n === 0) return '0 — None';
  if (n === 1) return '1 — Mild';
  if (n === 2) return '2 — Moderate';
  return '3 — Severe';
};

// ─── Part width and crown density (kept OUT of total_score) ──────────────────
// These two answers are scored and stored separately from the composite so they
// cannot inflate the general score, and so they stay a clean, auditable signal
// for the clinician summary. They are never surfaced to the user.
//
// scoreSymptoms() above is untouched: it only reads its fixed key set, so these
// two answers ride along in `answers` without ever affecting `total`.

export interface PatternScores {
  partWidthChange:    number; // 0–3
  crownDensityChange: number; // 0–3
}

export type PatternFlag = 'none' | 'watch' | 'red';

// Reads the new key, falling back to the old one for rows written before the
// rename.
const readPattern = (answers: Record<string, string>, newKey: string, oldKey: string) =>
  scoreSymptom(newKey, answers[newKey] ?? answers[oldKey]);

export const scorePattern = (answers: Record<string, string>): PatternScores => ({
  partWidthChange:    readPattern(answers, 'part_width_change',    'centerPartWidening'),
  crownDensityChange: readPattern(answers, 'crown_density_change', 'crownThinning'),
});

// ⚠ PROVISIONAL THRESHOLD — pending clinical sign-off before the RED branch is
// allowed to escalate a user. Scoring and storing is safe to ship now; the RED
// override that surfaces "see a dermatologist" is gated separately (see the
// check-in handlers). The costly error is a false negative, but over-firing
// erodes trust. This grid is the thing to confirm:
//
//   crown ↓ / part →   No change   Slightly   Noticeably   Much
//   No change          none        none       watch        watch
//   Slightly           none        watch      watch        watch
//   Noticeably         watch       watch      RED          RED
//   See-through        watch       watch      RED          RED
export const evaluatePattern = (s: PatternScores): PatternFlag => {
  const part  = s.partWidthChange;
  const crown = s.crownDensityChange;
  if (part >= 2 && crown >= 2) return 'red';
  if ((part >= 1 && crown >= 1) || part >= 2 || crown >= 2) return 'watch';
  return 'none';
};

// Numeric + flag payload to spread into the symptoms jsonb on each check-in.
// For users not asked these questions (e.g. men), answers lack the keys, so
// this returns 0 / 0 / 'none' — harmless, and keeps the jsonb shape uniform.
export const buildPatternPayload = (answers: Record<string, string>) => {
  const scores = scorePattern(answers);
  return {
    part_width_change_score:    scores.partWidthChange,
    crown_density_change_score: scores.crownDensityChange,
    pattern_flag:               evaluatePattern(scores),
  };
};