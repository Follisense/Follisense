// ─── src/services/photoUploadService.ts ──────────────────────────────────────
// Handles uploading scalp photos to Supabase Storage (Checkin-photos bucket)
// and saving the resulting URLs to the checkin_photos table.

import { supabase } from '@/lib/supabaseClient';

const BUCKET = 'Checkin-photos';

// checkin_photos.region_tag has a CHECK constraint:
// only 'hairline' | 'crown' | 'nape' | 'general' are allowed.
const REGION_MAP: Record<string, string> = {
  'Front hairline': 'hairline',
  'Side view':      'general',
  'Top of head':    'crown',
  'Back and nape':  'nape',
};
const toRegionTag = (area: string): string => REGION_MAP[area] ?? 'general';

export interface PhotoToUpload {
  dataUrl: string;   // base64 dataUrl from camera/gallery
  area: string;      // e.g. 'Front hairline', 'Top of head'
}

// ─── Convert dataUrl to File blob ────────────────────────────────────────────
const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new File([array], filename, { type: mime });
};

// ─── Upload a single photo to Supabase Storage ────────────────────────────────
export const uploadPhoto = async (
  dataUrl: string,
  userId: string,
  area: string,
): Promise<string | null> => {
  try {
    const timestamp = Date.now();
    const safeArea  = toRegionTag(area);
    const filename  = `${userId}/${safeArea}_${timestamp}.jpg`;
    const file      = dataUrlToFile(dataUrl, filename);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, file, { upsert: false, contentType: file.type });

    if (error) { console.error('Storage upload error:', error); return null; }

        // The bucket is private, so getPublicUrl returns a /object/public/ URL that
    // Supabase answers with 400. Store the object path instead and sign it at
    // render time via photoUrlService. This is why photos have never displayed.
        return filename;

  } catch (err) {
    console.error('uploadPhoto error:', err);
    return null;
  }
};

// ─── Upload multiple photos and save to checkin_photos table ─────────────────
export const uploadCheckinPhotos = async (
  photos: PhotoToUpload[],
  checkinId: string,
  userId: string,
): Promise<{ success: boolean; uploaded: number; errors: number }> => {
  let uploaded = 0;
  let errors   = 0;

  for (const photo of photos) {
    const url = await uploadPhoto(photo.dataUrl, userId, photo.area);

    if (!url) { errors++; continue; }

    const { error } = await supabase
      .from('checkin_photos')
      .insert({
        checkin_id:  checkinId,
        photo_url:   url,
        region_tag:  toRegionTag(photo.area),
      });

    if (error) {
      console.error('checkin_photos insert error:', error);
      errors++;
    } else {
      uploaded++;
    }
  }

  return { success: errors === 0, uploaded, errors };
};

// ─── Create a checkin record and upload its photos ────────────────────────────
// NOTE: checkins.type has a CHECK constraint — allowed values are:
// 'mid_cycle' | 'wash_day' | 'quick_log' | 'scheduled' | 'symptoms' | 'visual'.
// Photo-only entries (baselines, progress photos) use 'visual'.
export const createCheckinWithPhotos = async ({
  userId,
  type,
  symptoms,
  triageResult,
  triageReasoning,
  notes,
  isBaseline,
  photos,
}: {
  userId: string;
  type: 'mid_cycle' | 'wash_day' | 'quick_log' | 'scheduled' | 'symptoms' | 'visual';
  symptoms: Record<string, string>;
  triageResult?: 'green' | 'amber' | 'red';
  triageReasoning?: string;
  notes?: string;
  isBaseline?: boolean;
  photos: PhotoToUpload[];
}): Promise<{ success: boolean; checkinId?: string; error?: string }> => {
  try {
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .insert({
        user_id:          userId,
        type,
        symptoms,
        triage_result:    triageResult    || null,
        triage_reasoning: triageReasoning || null,
        notes:            notes           || null,
        is_baseline:      isBaseline      || false,
      })
      .select('id')
      .single();

    if (checkinError || !checkin) {
      console.error('Checkin insert error:', checkinError);
      return { success: false, error: checkinError?.message || 'Failed to save check-in' };
    }

    if (photos.length > 0) {
      await uploadCheckinPhotos(photos, checkin.id, userId);
    }

    return { success: true, checkinId: checkin.id };

  } catch (err: any) {
    console.error('createCheckinWithPhotos error:', err);
    return { success: false, error: err?.message || 'Something went wrong' };
  }
};

// ─── Baseline: persist onboarding baseline photos to the database ────────────
// Called once at the end of ScalpBaselineCapture. Fire-and-forget safe:
// failures are logged, never block onboarding.
export const saveBaselinePhotos = async (
  photos: PhotoToUpload[],
): Promise<void> => {
  try {
    if (photos.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { console.warn('[baseline] no session — skipping DB save'); return; }

    const result = await createCheckinWithPhotos({
      userId:     session.user.id,
      type:       'visual',
      symptoms:   {},
      notes:      'Baseline photos from onboarding',
      isBaseline: true,
      photos,
    });

    if (result.success) console.log('[baseline] saved to DB:', result.checkinId);
    else                console.error('[baseline] DB save failed:', result.error);
  } catch (err) {
    console.error('[baseline] unexpected error:', err);
  }
};