import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Identify the caller from their JWT — users can only delete THEMSELVES
    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Admin client — service role key, server-side only
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 3. Storage cleanup — files do NOT cascade. Remove the user's folders.
    for (const bucket of ['Checkin-photos', 'Scalp-images']) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
        if (files && files.length > 0) {
          await admin.storage.from(bucket).remove(files.map(f => `${user.id}/${f.name}`));
        }
      } catch (e) {
        console.error(`[delete-account] storage cleanup failed for ${bucket}:`, e);
        // Non-fatal: orphaned files are ugly but the account deletion proceeds
      }
    }

    // 4. Delete the auth user — every app table cascades from this one call
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('[delete-account] deleteUser failed:', deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[delete-account] unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});