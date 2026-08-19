// src/services/consentService.ts
//
// Reads and writes public.consents.
//
// Two rules the table enforces and this file respects:
//
//   1. Withdrawal is a timestamp, never a delete. The history of what someone
//      agreed to, and when, is the point of the table.
//   2. consent_text_shown stores the EXACT wording the user saw. Consent to
//      text you cannot reproduce is not provable consent. If you change the
//      copy, bump POLICY_VERSION so old rows stay attached to old wording.

import { supabase } from '@/lib/supabaseClient';

export type ConsentPurpose =
  | 'core_record'
  | 'product_recommendations'
  | 'research_panel'
  | 'third_party_export';

/** Bump this whenever any consent copy below changes. */
export const POLICY_VERSION = '2026-08-19';

export interface ConsentCopy {
  purpose:  ConsentPurpose;
  title:    string;
  body:     string;
  required: boolean;
}

// The exact wording shown to the user. This array IS the record — the `body`
// string is what gets written to consent_text_shown.
export const CONSENT_COPY: ConsentCopy[] = [
  {
    purpose: 'core_record',
    title: 'Keep my scalp and hair record',
    body:
      'FolliSense stores the check-ins and photos I add, so I can look back at ' +
      'how my scalp and hair have changed over time. This is what the app is for, ' +
      'so it cannot be turned off while I have an account. I can delete my ' +
      'account and everything in it at any time.',
    required: true,
  },
  {
    purpose: 'product_recommendations',
    title: 'Suggest products for my routine',
    body:
      'FolliSense can suggest products based on my hair type, my styles and the ' +
      'routine I have set up. Suggestions are never based on my symptoms or my ' +
      'check-in answers. Some product links earn FolliSense a small commission.',
    required: false,
  },
  {
    purpose: 'research_panel',
    title: 'Include my data in research',
    body:
      'FolliSense can include my check-ins and photos, with my name and contact ' +
      'details removed, in research into scalp and hair health for textured hair. ' +
      'Saying no changes nothing about how the app works for me.',
    required: false,
  },
  {
    purpose: 'third_party_export',
    title: 'Let me share my record with a professional',
    body:
      'When I choose to, FolliSense can prepare a summary of my record for a ' +
      'clinician or stylist I want to show it to. Nothing is shared unless I ' +
      'start it myself.',
    required: false,
  },
];

const copyFor = (purpose: ConsentPurpose) =>
  CONSENT_COPY.find(c => c.purpose === purpose)!;

/** Purposes this user currently has live consent for. */
export const getActiveConsents = async (): Promise<ConsentPurpose[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('consents')
    .select('purpose')
    .eq('user_id', session.user.id)
    .is('withdrawn_at', null);

  if (error) { console.error('[consent] read failed:', error); return []; }
  return (data || []).map(r => r.purpose as ConsentPurpose);
};

/**
 * Grant one purpose. Idempotent: a live row already existing is not an error,
 * because the partial unique index on (user_id, purpose) where withdrawn_at is
 * null is what makes "granted twice" impossible rather than something to guard
 * against in the client.
 */
export const grantConsent = async (
  purpose: ConsentPurpose,
  method: 'checkbox' | 'toggle' | 'signup_flow' = 'checkbox',
): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { error } = await supabase.from('consents').insert({
      user_id:            session.user.id,
      purpose,
      policy_version:     POLICY_VERSION,
      consent_text_shown: copyFor(purpose).body,
      method,
    });

    // 23505 = the partial unique index. Already granted; nothing to do.
    if (error && error.code !== '23505') throw error;
    return true;
  } catch (e) {
    console.error('[consent] grant failed:', purpose, e);
    return false;
  }
};

/** Withdraw one purpose. Stamps withdrawn_at; the row stays as history. */
export const withdrawConsent = async (purpose: ConsentPurpose): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    if (copyFor(purpose).required) {
      // core_record cannot be withdrawn while the account exists. The way out
      // is account deletion, which removes everything.
      console.warn('[consent] refusing to withdraw a required purpose:', purpose);
      return false;
    }

    const { error } = await supabase
      .from('consents')
      .update({ withdrawn_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .eq('purpose', purpose)
      .is('withdrawn_at', null);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[consent] withdraw failed:', purpose, e);
    return false;
  }
};

/** Set a purpose to a given state. What a settings toggle calls. */
export const setConsent = async (purpose: ConsentPurpose, granted: boolean) =>
  granted ? grantConsent(purpose, 'toggle') : withdrawConsent(purpose);

/**
 * Record the whole set at signup. `optional` is the purposes the user ticked;
 * core_record is always granted because the account cannot exist without it.
 */
export const recordSignupConsents = async (optional: ConsentPurpose[]): Promise<void> => {
  await grantConsent('core_record', 'signup_flow');
  for (const p of optional) {
    if (p !== 'core_record') await grantConsent(p, 'signup_flow');
  }
};