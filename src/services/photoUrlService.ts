// src/services/photoUrlService.ts
//
// The Checkin-photos bucket is PRIVATE, which is correct: the privacy policy
// says photos are accessible only to the account that owns them, and a public
// bucket would make every scalp photo readable by anyone holding the URL.
//
// getPublicUrl() therefore never worked. It returns a /object/public/ URL that
// Supabase answers with 400 on a private bucket, which Chrome then reports as
// ERR_BLOCKED_BY_ORB because a JSON error body arrived where an image was
// expected. Photos have never rendered.
//
// The fix is signed URLs, generated at render time and short-lived.
//
// Storage rows hold one of two things:
//   - a bare object path (what new uploads should store), or
//   - a full /object/public/ URL (every row written before this fix).
// pathFromStored() normalises both, so nothing needs migrating.

import { supabase } from '@/lib/supabaseClient';

export const PHOTO_BUCKET = 'Checkin-photos';

/** How long a signed URL lasts. Long enough to browse, short enough that a
 *  leaked URL stops working. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Accepts a bare path or a legacy full public URL; returns the object path. */
export const pathFromStored = (stored: string): string => {
  const marker = `/object/public/${PHOTO_BUCKET}/`;
  const i = stored.indexOf(marker);
  if (i !== -1) return decodeURIComponent(stored.slice(i + marker.length));

  // Also handle a signed URL being passed back in by mistake.
  const signedMarker = `/object/sign/${PHOTO_BUCKET}/`;
  const j = stored.indexOf(signedMarker);
  if (j !== -1) return decodeURIComponent(stored.slice(j + signedMarker.length).split('?')[0]);

  return stored.replace(/^\/+/, '');
};

/**
 * Sign a batch of stored values in one request.
 * Returns a map keyed by the ORIGINAL stored value, so callers can look up
 * without having to normalise themselves.
 *
 * A failure to sign one photo does not fail the batch: that entry is simply
 * absent from the map and the caller renders its empty state.
 */
export const signPhotoUrls = async (
  stored: string[],
): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  if (stored.length === 0) return out;

  // Deduplicate, and keep a path → original mapping for the return.
  const byPath = new Map<string, string[]>();
  stored.forEach(s => {
    const p = pathFromStored(s);
    byPath.set(p, [...(byPath.get(p) || []), s]);
  });

  try {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls([...byPath.keys()], SIGNED_URL_TTL_SECONDS);

    if (error) throw error;

    (data || []).forEach(entry => {
      if (!entry.signedUrl || entry.error) return;
      // Supabase returns the path it signed; map it back to every original.
      const originals = byPath.get(entry.path ?? '') || [];
      originals.forEach(o => { out[o] = entry.signedUrl!; });
    });
  } catch (e) {
    console.error('[photoUrl] signing failed:', e);
  }

  return out;
};

/** Single-photo convenience. Returns null rather than throwing. */
export const signPhotoUrl = async (stored: string): Promise<string | null> => {
  const map = await signPhotoUrls([stored]);
  return map[stored] ?? null;
};