// supabase/functions/scalp-vision/index.ts
// Deploy: supabase functions deploy scalp-vision

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { base64, mediaType } = await req.json();

    if (!base64 || !mediaType) {
      return new Response(JSON.stringify({ error: 'Missing base64 or mediaType' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: `You are an extremely strict scalp image validator for a consumer hair health tracking app.

Your #1 priority is validation accuracy.
- ONLY accept images that clearly show human scalp skin, hair follicles, hair parting, hairline, crown, or nape area.
- Reject anything else: faces (even partial), selfies, hands, objects, animals, landscapes, blurry photos, screenshots.
- Do not be helpful or try to analyse invalid images. Strict rejection is mandatory.
- Never diagnose medical conditions.`,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Examine this image carefully. Respond with ONLY a valid JSON object — no extra text.

If NOT a scalp image:
{"isScalp":false,"confidence":"high","validationReason":"short clear reason"}

If it IS a valid scalp image:
{"isScalp":true,"confidence":"high"|"medium"|"low","validationReason":"reason","overallCondition":"healthy"|"mild_concern"|"moderate_concern"|"needs_attention","observations":["up to 4 observations"],"positives":["up to 2 positives"],"recommendations":["up to 3 recommendations"],"followUpScore":0-100}

Be very strict. Even a small part of a face = reject.`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', errText);
      return new Response(JSON.stringify({ error: `Anthropic API error: ${response.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const text = data.content?.find((b: any) => b.type === 'text')?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ isScalp: false, confidence: 'low', validationReason: 'Failed to parse AI response' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});