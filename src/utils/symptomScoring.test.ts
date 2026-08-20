// src/utils/symptomScoring.test.ts
//
// Table-driven tests for the scoring layer. These exist because scoring is the
// one place in the app where a silent change alters what a clinician reads, and
// nothing else would catch it.
//
// Run with:  npx vitest run
// (If vitest is not installed: npm i -D vitest, then add "test": "vitest" to
// package.json scripts.)
//
// NOTE: the composite denominator is still unsettled — flaking_score caps at 2
// while everything else caps at 3, the old display assumed a total of 21, and
// scoreToRisk documents 29. These tests assert the CURRENT behaviour so that a
// change to it fails loudly and has to be deliberate. They are not an
// endorsement of the current numbers.

import { describe, it, expect } from 'vitest';
import {
  scoreSymptom,
  scoreSymptoms,
  scoreToRisk,
  buildNumericPayload,
  buildPatternPayload,
  scorePattern,
  evaluatePattern,
} from './symptomScoring';

// ─── scoreSymptom: the answer-to-number map ───────────────────────────────

describe('scoreSymptom', () => {
  const cases: [string, string, number][] = [
    // key, answer, expected
    ['itch',        'None',                 0],
    ['itch',        'Mild',                 1],
    ['itch',        'Moderate',             2],
    ['itch',        'Severe',               3],

    ['tenderness',  'None',                 0],
    ['tenderness',  'A little',             1],
    ['tenderness',  'Yes, noticeably',      2],
    ['tenderness',  'Yes, painful',         3],

    // flaking is the odd one out: it tops out at 2, not 3.
    ['flaking',     'None',                 0],
    ['flaking',     'Some flaking',         1],
    ['flaking',     'Heavy flaking',        2],

    ['hairline',    'No change',            0],
    ['shedding',    'Normal',               0],
    ['hairFeel',    'Feels normal',         0],
    ['hairBreakage','No breakage',          0],
  ];

  cases.forEach(([key, answer, expected]) => {
    it(`${key} "${answer}" scores ${expected}`, () => {
      expect(scoreSymptom(key, answer)).toBe(expected);
    });
  });

  it('returns 0 for an unknown answer rather than throwing', () => {
    expect(scoreSymptom('itch', 'something nobody wrote')).toBe(0);
  });

  it('returns 0 for an unknown key', () => {
    expect(scoreSymptom('notARealSymptom', 'Severe')).toBe(0);
  });

  it('returns 0 for undefined, which is what a skipped question gives', () => {
    expect(scoreSymptom('itch', undefined as unknown as string)).toBe(0);
  });
});

// ─── scoreToRisk: the thresholds ──────────────────────────────────────────
// These are the numbers that decide whether someone is told to see a
// professional. If a threshold moves, this fails, which is the point.

describe('scoreToRisk', () => {
  it('0 is green', () => {
    expect(scoreToRisk(0)).toBe('green');
  });

  it('a low total stays green', () => {
    expect(scoreToRisk(2)).toBe('green');
  });

  it('a mid total is amber', () => {
    expect(scoreToRisk(8)).toBe('amber');
  });

  it('a high total is red', () => {
    expect(scoreToRisk(20)).toBe('red');
  });

  it('never returns anything outside green, amber, red', () => {
    for (let n = 0; n <= 30; n++) {
      expect(['green', 'amber', 'red']).toContain(scoreToRisk(n));
    }
  });

  it('is monotonic — a higher total is never a lower risk', () => {
    const order = { green: 0, amber: 1, red: 2 } as const;
    let previous = 0;
    for (let n = 0; n <= 30; n++) {
      const current = order[scoreToRisk(n) as keyof typeof order];
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });
});

// ─── scoreSymptoms: the composite ─────────────────────────────────────────

describe('scoreSymptoms', () => {
  it('an all-clear check-in totals 0 and reads green', () => {
    const result = scoreSymptoms({
      itch: 'None',
      tenderness: 'None',
      flaking: 'None',
      shedding: 'Normal',
      hairline: 'No change',
    });
    expect(result.total).toBe(0);
    expect(scoreToRisk(result.total)).toBe('green');
  });

  it('sums the parts', () => {
    const result = scoreSymptoms({
      itch: 'Moderate',        // 2
      tenderness: 'A little',  // 1
      flaking: 'Some flaking', // 1
    });
    expect(result.total).toBe(4);
  });

  it('treats a missing answer as 0 rather than failing', () => {
    const result = scoreSymptoms({ itch: 'Mild' });
    expect(result.total).toBe(1);
  });

  it('ignores keys it does not know about', () => {
    const result = scoreSymptoms({
      itch: 'Mild',
      somethingElse: 'Severe',
    } as Record<string, string>);
    expect(result.total).toBe(1);
  });
});

// ─── buildNumericPayload: what reaches the database columns ───────────────

describe('buildNumericPayload', () => {
  it('includes bumps_score and dryness_score', () => {
    // These were missing for months, so both columns could only ever be 0.
    const payload = buildNumericPayload({
      bumps: 'A few bumps',
      dryness: 'Very dry',
    });
    expect(payload).toHaveProperty('bumps_score');
    expect(payload).toHaveProperty('dryness_score');
  });

  it('carries a risk_level', () => {
    const payload = buildNumericPayload({ itch: 'Severe' });
    expect(['green', 'amber', 'red']).toContain(payload.risk_level);
  });

  it('produces 0s and green for an empty check-in', () => {
    const payload = buildNumericPayload({});
    expect(payload.total_score).toBe(0);
    expect(payload.risk_level).toBe('green');
  });
});

// ─── Pattern scoring: kept OUT of the composite ───────────────────────────
// The whole point of this cluster is that it cannot inflate the general score.

describe('pattern scoring', () => {
  it('part width and crown density do NOT affect the composite total', () => {
    const withPattern = scoreSymptoms({
      itch: 'Mild',
      part_width_change: 'Much wider',
      crown_density_change: 'See-through at the crown',
    });
    const withoutPattern = scoreSymptoms({ itch: 'Mild' });
    expect(withPattern.total).toBe(withoutPattern.total);
  });

  it('scores the new key names', () => {
    const scores = scorePattern({
      part_width_change: 'Noticeably wider',
      crown_density_change: 'Slightly thinner',
    });
    expect(scores.partWidthChange).toBe(2);
    expect(scores.crownDensityChange).toBe(1);
  });

  it('falls back to the old camelCase keys for rows written before the rename', () => {
    const scores = scorePattern({
      centerPartWidening: 'Noticeably wider',
      crownThinning: 'Slightly thinner',
    });
    expect(scores.partWidthChange).toBe(2);
    expect(scores.crownDensityChange).toBe(1);
  });

  it('returns 0/0/none when the questions were not asked (e.g. men)', () => {
    const payload = buildPatternPayload({ itch: 'Severe' });
    expect(payload.part_width_change_score).toBe(0);
    expect(payload.crown_density_change_score).toBe(0);
    expect(payload.pattern_flag).toBe('none');
  });

  it('flags none when nothing has changed', () => {
    expect(evaluatePattern({ partWidthChange: 0, crownDensityChange: 0 })).toBe('none');
  });

  it('flags watch when one side is mild', () => {
    expect(evaluatePattern({ partWidthChange: 1, crownDensityChange: 1 })).toBe('watch');
  });

  it('flags red only when BOTH are 2 or more', () => {
    expect(evaluatePattern({ partWidthChange: 2, crownDensityChange: 2 })).toBe('red');
    expect(evaluatePattern({ partWidthChange: 3, crownDensityChange: 1 })).not.toBe('red');
    expect(evaluatePattern({ partWidthChange: 1, crownDensityChange: 3 })).not.toBe('red');
  });
});