// supabase/functions/validate-scalp-photo/index.ts
//
// Holds the Google Vision key server-side. The browser sends an image and gets
// back Vision's raw labels, detected text and safe-search verdict. It never
// sees the key.
//
// JWT verification is ON (the default), so an anonymous caller gets 401 and
// cannot use this as a free Vision proxy.
//
// Deploy:
//   supabase secrets set GOOGLE_VISION_KEY=<the NEW key>
//   supabase functions deploy validate-scalp-photo
//
// Note: this does NOT decide whether an image is a scalp. That logic stays in
// the client, unchanged, because ScalpBaselineCapture and HistoryPage
// deliberately apply different rules. Consolidating them here is a later job.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// Roughly 6MB of base64. Anything larger is a client that forgot to downscale.
const MAX_BASE64_CHARS = 8_000_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  // ── Auth: a real signed-in user, not just a valid anon key ──────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing authorization header' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: 'not authenticated' }, 401);

  // ── Input ───────────────────────────────────────────────────────────────
  let base64: string;
  try {
    const body = await req.json();
    base64 = body?.base64;
  } catch {
    return json({ error: 'invalid json body' }, 400);
  }

  if (typeof base64 !== 'string' || base64.length === 0) {
    return json({ error: 'base64 image required' }, 400);
  }
  if (base64.length > MAX_BASE64_CHARS) {
    return json({ error: 'image too large, downscale before sending' }, 413);
  }
  // Accept a bare base64 string or a full data URL.
  const content = base64.includes(',') ? base64.split(',').pop()! : base64;

  const key = Deno.env.get('GOOGLE_VISION_KEY');
  if (!key) {
    console.error('[validate-scalp-photo] GOOGLE_VISION_KEY not set');
    return json({ error: 'validation unavailable' }, 503);
  }

  // ── Vision ──────────────────────────────────────────────────────────────
  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 20 },
              { type: 'TEXT_DETECTION', maxResults: 1 },
              { type: 'SAFE_SEARCH_DETECTION' },
            ],
          }],
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error('[validate-scalp-photo] vision error', res.status, detail);
      return json({ error: 'vision request failed' }, 502);
    }

    const data = await res.json();
    const result = data?.responses?.[0];
    if (!result) return json({ error: 'empty vision response' }, 502);

    // Only the three things the clients actually read. Nothing is logged.
    return json({
      labels: (result.labelAnnotations || []).map((l: { description: string }) =>
        l.description.toLowerCase()
      ),
      text: result.textAnnotations?.[0]?.description || '',
      safeSearch: result.safeSearchAnnotation || {},
    });
  } catch (e) {
    console.error('[validate-scalp-photo] unexpected error:', e);
    return json({ error: 'validation unavailable' }, 503);
  }
});