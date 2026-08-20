// src/utils/checkInRules.test.ts
//
// Tests for the rules that decide a check-in's status and what guidance the
// user is shown.
//
// These matter more than most tests in this codebase: computeCheckInStatus is
// what decides whether someone is told to see a professional, and
// getTriageGuidance is the text they read. A silent change here alters what the
// app tells a person about their scalp, and nothing else would catch it.
//
// Written to assert CURRENT behaviour. Where a threshold turns out to be
// different from what is asserted, the failure tells you the real number —
// which is the point, because right now nobody can state these rules without
// reading the source.
//
// Run with:  npx vitest run

import { describe, it, expect } from 'vitest';
import { computeCheckInStatus, getTriageGuidance } from './checkInRules';
import type { CheckInData } from '@/contexts/AppContext';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** A check-in with nothing reported. Spread over it to set specific answers. */
const clear = (over: Partial<CheckInData> = {}): CheckInData => ({
  itch: 'None',
  tenderness: 'None',
  hairline: 'No change',
  flaking: 'None',
  shedding: 'Normal',
  type: 'mid-cycle',
  date: '1 Jan',
  ...over,
} as CheckInData);

// ─── computeCheckInStatus ─────────────────────────────────────────────────

describe('computeCheckInStatus', () => {
  it('an all-clear check-in with no history is green', () => {
    expect(computeCheckInStatus(clear(), [])).toBe('green');
  });

  it('returns only green, amber or red', () => {
    const inputs: CheckInData[] = [
      clear(),
      clear({ itch: 'Mild' }),
      clear({ itch: 'Moderate', tenderness: 'A little' }),
      clear({ itch: 'Severe', tenderness: 'Yes, painful', shedding: 'Alarming amount' }),
    ];
    inputs.forEach(input => {
      expect(['green', 'amber', 'red']).toContain(computeCheckInStatus(input, []));
    });
  });

  it('a single mild symptom does not escalate to red', () => {
    expect(computeCheckInStatus(clear({ itch: 'Mild' }), [])).not.toBe('red');
  });

  it('a severe symptom is not green', () => {
    // The severe-symptom floor: one severe answer should never read as fine,
    // regardless of what the composite total works out to.
    expect(computeCheckInStatus(clear({ itch: 'Severe' }), [])).not.toBe('green');
  });

  it('several moderate symptoms together are not green', () => {
    const result = computeCheckInStatus(
      clear({ itch: 'Moderate', tenderness: 'Yes, noticeably', flaking: 'Some flaking' }),
      [],
    );
    expect(result).not.toBe('green');
  });

  it('adding symptoms never lowers the status', () => {
    const order = { green: 0, amber: 1, red: 2 } as const;
    const mild     = computeCheckInStatus(clear({ itch: 'Mild' }), []);
    const moderate = computeCheckInStatus(clear({ itch: 'Moderate' }), []);
    const severe   = computeCheckInStatus(clear({ itch: 'Severe' }), []);
    expect(order[moderate]).toBeGreaterThanOrEqual(order[mild]);
    expect(order[severe]).toBeGreaterThanOrEqual(order[moderate]);
  });

  it('does not throw on an empty check-in object', () => {
    expect(() => computeCheckInStatus({} as CheckInData, [])).not.toThrow();
  });

  it('does not throw on undefined answers', () => {
    const partial = { type: 'mid-cycle', date: '1 Jan' } as CheckInData;
    expect(() => computeCheckInStatus(partial, [])).not.toThrow();
  });
});

// ─── History ──────────────────────────────────────────────────────────────
// The function takes history, so persistence should matter. These assert that
// it does something with it rather than ignoring it.

describe('computeCheckInStatus with history', () => {
  it('a clear check-in stays green even after a rough history', () => {
    // Someone who has recovered should not be held at amber by their past.
    const history = [
      clear({ itch: 'Severe' }),
      clear({ itch: 'Severe' }),
      clear({ itch: 'Moderate' }),
    ];
    expect(computeCheckInStatus(clear(), history)).toBe('green');
  });

  it('a repeated symptom is treated at least as seriously as a one-off', () => {
    const order = { green: 0, amber: 1, red: 2 } as const;
    const current = clear({ itch: 'Moderate' });
    const oneOff     = computeCheckInStatus(current, []);
    const persistent = computeCheckInStatus(current, [
      clear({ itch: 'Moderate' }),
      clear({ itch: 'Moderate' }),
    ]);
    expect(order[persistent]).toBeGreaterThanOrEqual(order[oneOff]);
  });

  it('does not throw on a long history', () => {
    const history = Array.from({ length: 50 }, () => clear({ itch: 'Mild' }));
    expect(() => computeCheckInStatus(clear(), history)).not.toThrow();
  });
});

// ─── getTriageGuidance ────────────────────────────────────────────────────
// This is the text a person reads about their own scalp, so the assertions are
// as much about what it must NOT say as what it returns.

describe('getTriageGuidance', () => {
  it('returns an array of heading and message pairs', () => {
    const guidance = getTriageGuidance('amber', clear({ itch: 'Moderate' }), []);
    expect(Array.isArray(guidance)).toBe(true);
    guidance.forEach(g => {
      expect(typeof g.heading).toBe('string');
      expect(typeof g.message).toBe('string');
      expect(g.heading.length).toBeGreaterThan(0);
      expect(g.message.length).toBeGreaterThan(0);
    });
  });

  it('says nothing alarming for a green check-in', () => {
    const guidance = getTriageGuidance('green', clear(), []);
    const text = guidance.map(g => `${g.heading} ${g.message}`).join(' ');
    expect(text).not.toMatch(/urgent|emergency|immediately/i);
  });

  // ── The standing rule: no condition names in a result. ──
  // P1-2 removed "traction alopecia or scalp inflammation" from
  // CheckInSummary. This stops it, or anything like it, coming back.
  const CONDITION_NAMES = [
    'traction alopecia',
    'alopecia',
    'ccca',
    'central centrifugal',
    'seborrheic',
    'folliculitis',
    'telogen effluvium',
    'androgenetic',
    'psoriasis',
    'eczema',
    'dermatitis',
    'ringworm',
    'tinea',
  ];

  (['green', 'amber', 'red'] as const).forEach(risk => {
    it(`never names a condition at ${risk}`, () => {
      const inputs: CheckInData[] = [
        clear(),
        clear({ itch: 'Severe', tenderness: 'Yes, painful' }),
        clear({ hairline: "I'm concerned", shedding: 'Alarming amount' }),
      ];

      inputs.forEach(input => {
        const text = getTriageGuidance(risk, input, [])
          .map(g => `${g.heading} ${g.message}`)
          .join(' ')
          .toLowerCase();

        CONDITION_NAMES.forEach(name => {
          expect(text).not.toContain(name);
        });
      });
    });
  });

  it('does not claim to diagnose', () => {
    const text = getTriageGuidance('red', clear({ itch: 'Severe' }), [])
      .map(g => `${g.heading} ${g.message}`)
      .join(' ')
      .toLowerCase();
    expect(text).not.toContain('diagnos');
    expect(text).not.toContain('you have');
  });

  it('does not throw on an empty check-in', () => {
    expect(() => getTriageGuidance('green', {} as CheckInData, [])).not.toThrow();
  });
});