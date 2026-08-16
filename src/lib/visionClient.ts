// src/lib/visionClient.ts
//
// Single place the app talks to Google Vision from. The key is no longer in the
// bundle; the call goes through the validate-scalp-photo edge function, which
// requires a signed-in user.
//
// Both ScalpBaselineCapture.tsx and HistoryPage.tsx use this. Their label rules
// stay where they are and stay different; only the fetch moves.

import { supabase } from '@/lib/supabaseClient';

export interface VisionResult {
  labels: string[];
  text: string;
  safeSearch: Record<string, string>;
}

/** Longest edge sent to Vision. Smaller is faster and cheaper, and Vision does
 *  not need full resolution to label a scalp. */
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.85;

/**
 * Downscale a File or data URL to a base64 JPEG string (no data: prefix).
 * ScalpBaselineCapture already does this inline via compressForVision;
 * HistoryPage does not and still ships full-resolution phone photos.
 */
export const toDownscaledBase64 = async (input: File | string): Promise<string> => {
  const src = typeof input === 'string' ? input : URL.createObjectURL(input);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('could not read image'));
      i.src = src;
    });

    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1];
  } finally {
    if (typeof input !== 'string') URL.revokeObjectURL(src);
  }
};

/**
 * Ask Vision about an image, via the edge function.
 * Throws on failure. Callers decide whether to fail open.
 *
 * The function is deployed with --no-verify-jwt, because Supabase's platform
 * JWT gate rejects the CORS preflight (an OPTIONS request carries no
 * Authorization header by design) before any code runs. Auth is not weaker for
 * it: the function calls supabase.auth.getUser() itself and returns 401 without
 * a real user. That check needs the user's token, so we attach it explicitly
 * rather than relying on invoke to do it.
 */
export const analyseImage = async (base64: string): Promise<VisionResult> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    // Surfaces as a clear message instead of an opaque 401 from the function.
    throw new Error('not signed in, cannot validate photo');
  }

  const { data, error } = await supabase.functions.invoke('validate-scalp-photo', {
    body: { base64 },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  if (!data || data.error) throw new Error(data?.error || 'validation failed');

  return {
    labels: data.labels || [],
    text: data.text || '',
    safeSearch: data.safeSearch || {},
  };
};