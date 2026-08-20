// src/data/productSelection.test.ts
//
// P1-10 regression test: check-in and triage data must NEVER reach product
// selection.
//
// This is a standing rule, not a one-off fix. The commitment is that what
// FolliSense shows someone in the shop is never chosen from what they reported
// about their scalp. Breaking it would turn product suggestions into implied
// treatment advice, which is the line this product does not cross — and it
// would break it silently, because the products would still look plausible.
//
// The test works by reading the source of the selection code and asserting it
// has no path to symptom data. That is deliberate: a behavioural test would
// only catch a rule that is already wired up, whereas this fails the moment
// someone adds the import, which is the point at which it is cheap to fix.
//
// If this test fails, do not weaken it. Either the import is a mistake, or the
// rule has changed and that change needs to be a deliberate decision with the
// clinical co-founder, not a side effect.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

// Everything that decides which products a user is shown.
const SELECTION_SOURCES = [
  'src/data/useGeneratedProducts.ts',
];

// Modules that carry symptom, score or triage meaning. None of these may be
// imported by product selection.
const FORBIDDEN_IMPORTS = [
  'symptomScoring',
  'checkInRules',
  'triageLogic',        // old name, in case a stale import survives
  'computeCheckInStatus',
  'computeHistoricalRisk',
  'scoreSymptom',
  'scoreToRisk',
  'buildNumericPayload',
  'buildPatternPayload',
];

// Identifiers that would mean symptom data has arrived some other way — read
// from the database directly, or passed in as a prop.
const FORBIDDEN_REFERENCES = [
  "from('checkins')",
  'from("checkins")',
  'CheckInData',
  'triage_result',
  'total_score',
  'risk_level',
  'pattern_flag',
  'currentCheckIn',
  'checkInHistory',
];

describe('product selection never sees check-in data', () => {
  SELECTION_SOURCES.forEach(path => {
    const source = read(path);

    FORBIDDEN_IMPORTS.forEach(name => {
      it(`${path} does not import ${name}`, () => {
        // Matches an import of the module or the symbol, not an incidental
        // mention inside a comment.
        const importPattern = new RegExp(`import[^;]*${name}[^;]*;`, 's');
        expect(source).not.toMatch(importPattern);
      });
    });

    FORBIDDEN_REFERENCES.forEach(ref => {
      it(`${path} does not reference ${ref}`, () => {
        expect(source).not.toContain(ref);
      });
    });

    it(`${path} does not query the checkins table`, () => {
      expect(source).not.toMatch(/\.from\(\s*['"`]checkins['"`]\s*\)/);
    });

    it(`${path} does not query checkin_photos`, () => {
      expect(source).not.toMatch(/\.from\(\s*['"`]checkin_photos['"`]\s*\)/);
    });
  });
});

// ─── The input surface ────────────────────────────────────────────────────
// useGeneratedProducts takes (onboardingData, count). Onboarding answers are
// routine and preference facts — hair type, styles, goals — not symptoms.
// This asserts the signature has not quietly grown a second data source.

describe('the selection hook input', () => {
  const source = read('src/data/useGeneratedProducts.ts');

  it('takes onboardingData and a count, nothing else', () => {
    const signature = source.match(
      /export const useGeneratedProducts\s*=\s*\(([^)]*)\)/s,
    )?.[1] ?? '';

    expect(signature).toContain('onboardingData');
    expect(signature).toContain('count');

    // No third parameter carrying check-ins, scores or risk.
    expect(signature.toLowerCase()).not.toContain('checkin');
    expect(signature.toLowerCase()).not.toContain('symptom');
    expect(signature.toLowerCase()).not.toContain('risk');
    expect(signature.toLowerCase()).not.toContain('score');
    expect(signature.toLowerCase()).not.toContain('triage');
  });

  it('does not read symptom state from context', () => {
    // useApp() would give it currentCheckIn and checkInHistory. It should not
    // be reaching for those at all.
    expect(source).not.toContain('useApp');
  });
});

// ─── The product shape ────────────────────────────────────────────────────
// A product must not carry a field that ties it to a symptom or a condition.
// `concern` is allowed: those are user goals ("Growth", "Dryness"), which come
// from onboarding, not from a check-in.

describe('the product shape', () => {
  const source = read('src/data/useGeneratedProducts.ts');

  const FORBIDDEN_FIELDS = [
    'condition',
    'diagnosis',
    'treats',
    'symptom',
    'riskLevel',
    'triage',
  ];

  FORBIDDEN_FIELDS.forEach(field => {
    it(`GeneratedProduct has no "${field}" field`, () => {
      const interfaceBody = source.match(
        /export interface GeneratedProduct\s*\{([^}]*)\}/s,
      )?.[1] ?? '';
      expect(interfaceBody.toLowerCase()).not.toContain(`${field}:`);
    });
  });
});