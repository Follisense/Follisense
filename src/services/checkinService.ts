import { supabase } from '@/lib/supabaseClient';
import { buildNumericPayload, scoreSymptom } from '@/utils/symptomScoring';

// These must match the checkins_type_check constraint in Supabase
export type CheckinType = 'mid_cycle' | 'wash_day' | 'quick_log';

export async function createCheckinSession(
  userId: string,
  type: CheckinType
): Promise<string | null> {
  const { data, error } = await supabase
    .from('checkins')
    .insert({
      user_id:     userId,
      type,
      symptoms:    {},
      is_baseline: false,
    })
    .select('id')
    .single();

  if (error) console.error('[checkin] insert failed:', error);
  else        console.log('[checkin] session created:', data?.id, 'type:', type);
  return data?.id ?? null;
}

export async function updateCheckinSession(
  id: string,
  patch: {
    symptoms?:         Record<string, any>;
    triage_result?:    string;
    triage_reasoning?: string;
    notes?:            string;
  }
): Promise<void> {
  let fullPatch: Record<string, any> = { ...patch };

  // ── Auto-score: whenever symptoms are being saved, compute the numeric
  //    score columns from the string answers and write them in the SAME
  //    update. This is what was missing — the score columns were never
  //    written, so they sat at their DB defaults of 0 forever. ──
  if (patch.symptoms && Object.keys(patch.symptoms).length > 0) {
    // Only the string-valued entries are scoreable answers
    const answers: Record<string, string> = {};
    for (const [k, v] of Object.entries(patch.symptoms)) {
      if (typeof v === 'string') answers[k] = v;
    }

    const numeric = buildNumericPayload(answers);

    fullPatch = {
      ...fullPatch,
      ...numeric,
      // These two have columns in the table but aren't part of
      // buildNumericPayload's fixed ten — score them directly.
      bumps_score:   scoreSymptom('bumps',   answers.bumps),
      dryness_score: scoreSymptom('dryness', answers.dryness),
            // Scored separately from the composite; columns exist for both
      part_width_change_score:    scoreSymptom('part_width_change',    answers.part_width_change),
      crown_density_change_score: scoreSymptom('crown_density_change', answers.crown_density_change),
    };

    console.log('[checkin] scored:', numeric.total_score, '→', numeric.risk_level);
  }

  const { error } = await supabase
    .from('checkins')
    .update(fullPatch)
    .eq('id', id);

  if (error) console.error('[checkin] update failed:', error);
  else        console.log('[checkin] updated:', id);
}