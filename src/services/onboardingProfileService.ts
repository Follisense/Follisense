// src/services/onboardingProfileService.ts
//
// Writes the onboarding answers to the database.
//
// Until now they only ever lived in AppContext, which is localStorage on the
// user's own device. consumer_profiles had zero rows in production, which meant
// two things: no clinician could read a patient's hair type, style or cycle
// length, and RoutineTracker's .update() calls on consumer_profiles silently
// affected zero rows, so every takedown date and style duration a user set was
// discarded.
//
// WHERE TO CALL THIS: HomePage, on mount. NOT at the end of Onboarding.
//
// Calling it from the onboarding completion handler looked obvious and did not
// work: that handler sets the final answers into context and reads
// onboardingData in the same scope, so the value it passes is the one from
// before the update. Gender (set on an earlier step) wrote fine; hair type,
// styles and cycle length came through as null. By the time HomePage mounts,
// context is settled and complete.
//
//   import { syncOnboardingProfile } from '@/services/onboardingProfileService';
//   ...
//   useEffect(() => { syncOnboardingProfile(onboardingData); }, []);
//
// Safe to call on every mount: it only ever writes fields that have a value, so
// it fills gaps and never overwrites something with null. That also makes it
// the backfill for the users who onboarded before this existed.
//
// Requires a unique constraint on consumer_profiles.user_id for upsert:
//   alter table public.consumer_profiles
//     add constraint consumer_profiles_user_id_key unique (user_id);

import { supabase } from '@/lib/supabaseClient';
import type { OnboardingData } from '@/contexts/AppContext';

// "None of these" answers are dropped rather than stored as real values, so an
// empty selection reads as empty rather than as a choice the user made.
const NON_ANSWERS = new Set([
  'None',
  'Other',
  "I don't use anything specific",
  'Nothing - I leave it alone until wash day',
]);

const cleanArray = (v: string[] | undefined): string[] | null => {
  if (!v || v.length === 0) return null;
  const out = v.filter(x => x && !NON_ANSWERS.has(x));
  return out.length ? out : null;
};

const cleanText = (v: string | undefined): string | null => {
  const t = (v ?? '').trim();
  return t.length ? t : null;
};

export const syncOnboardingProfile = async (data: OnboardingData): Promise<boolean> => {
  try {
    if (!data) return false;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;
    const uid = session.user.id;

    // Only fields that actually have a value. Anything empty is left out of the
    // payload entirely, so an upsert can never blank a column that already
    // holds good data — which matters because RoutineTracker and ProfilePage
    // also write to this row.
    const candidate: Record<string, unknown> = {
      gender:                     cleanText(data.gender),
      hair_texture:               cleanText(data.hairType),
      current_styles:             cleanArray(data.protectiveStyles),
      protective_style_frequency: cleanText(data.protectiveStyleFrequency),
      style_duration:             cleanText(data.cycleLength),
      between_wash_care:          cleanArray(data.betweenWashCare),
      between_wash_other:         cleanText(data.otherBetweenWashCare),
      hair_goals:                 cleanArray(data.goals),
      chemical_processing:        cleanText(data.chemicalProcessing),
    };

    const payload = Object.fromEntries(
      Object.entries(candidate).filter(([, v]) => v !== null),
    );

    if (Object.keys(payload).length === 0) return false; // nothing worth writing

    const { error } = await supabase
      .from('consumer_profiles')
      .upsert(
        { user_id: uid, ...payload, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );

    if (error) throw error;

    // profiles.gender is read elsewhere in the app, so keep it in step.
    if (payload.gender) {
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ gender: payload.gender })
        .eq('id', uid);
      if (pErr) console.warn('[onboardingProfile] profiles.gender update failed:', pErr);
    }

    return true;
  } catch (e) {
    // Never block anything on this. The answers stay in AppContext either way,
    // so a failed write costs the clinician view, not the user's session.
    console.error('[onboardingProfile] sync failed:', e);
    return false;
  }
};
