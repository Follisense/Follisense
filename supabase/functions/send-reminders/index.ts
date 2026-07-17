// supabase/functions/send-reminders/index.ts
// Persistent push reminders for FolliSense.
//
// Runs once a day on a cron (see setup notes). For every user with a saved
// FCM token it decides — from their REAL style data in consumer_profiles —
// whether today is a mid-cycle day, a wash-day heads-up day, or Sunday
// (weekly summary), and sends the push through Firebase. Because the message
// goes through FCM, the service worker shows it even when the browser is
// fully closed. This replaces the in-page setTimeout reminders as the source
// of truth for delivery.
//
// Conditions are date-exact (day == midpoint, day == due-2, weekday == Sunday),
// so a single daily run can never double-send.

import { createClient } from "npm:@supabase/supabase-js@2";

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET      = Deno.env.get("CRON_SECRET") ?? "";
// Full JSON of the Firebase service account (Project settings → Service accounts)
const FIREBASE_SA      = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") ?? "{}");

const APP_URL = Deno.env.get("APP_URL") ?? "https://follisense.com";
const ICON    = `${APP_URL}/follisense-icon-green.png`;
const BADGE   = `${APP_URL}/follisense-badge.png`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── FCM HTTP v1 auth: mint an OAuth token from the service account ──────────
const b64url = (data: Uint8Array | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const getAccessToken = async (): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: FIREBASE_SA.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  // Import the PEM private key
  const pem = (FIREBASE_SA.private_key as string)
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${payload}`),
  ));
  const jwt = `${header}.${payload}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`OAuth failed: ${JSON.stringify(json)}`);
  return json.access_token;
};

// ─── Send one push; prune dead tokens ─────────────────────────────────────────
const sendPush = async (
  accessToken: string, token: string, userId: string,
  title: string, body: string, url: string,
): Promise<boolean> => {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_SA.project_id}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: { url },
          webpush: {
            notification: { icon: ICON, badge: BADGE },
            fcm_options: { link: `${APP_URL}${url}` },
          },
        },
      }),
    },
  );
  if (res.ok) return true;

  const err = await res.text();
  console.error(`[FCM] send failed for ${userId}:`, res.status, err);
  // Token no longer valid → remove it so we stop trying
  if (res.status === 404 || err.includes("UNREGISTERED") || err.includes("INVALID_ARGUMENT")) {
    await supabase.from("push_tokens").delete().eq("user_id", userId).eq("token", token);
    console.log(`[FCM] pruned dead token for ${userId}`);
  }
  return false;
};

// ─── Cycle helpers (mirrors the app's parseCycleLengthToDays) ─────────────────
const parseCycleDays = (raw: string | null): number => {
  if (!raw) return 28;
  const n = raw.match(/\d+/g);
  if (!n) return 28;
  if (n.length >= 2) return Math.round(((parseInt(n[0]) + parseInt(n[1])) / 2) * 7);
  return parseInt(n[0]) * 7;
};

const daysBetween = (fromIso: string, to: Date) =>
  Math.floor((to.getTime() - new Date(fromIso).getTime()) / 86400000);

// ─── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Simple shared-secret gate so only the cron can trigger sends
  if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  // "Today" in Nairobi (UTC+3) so day-of-week and day counts match the user's day
  const now      = new Date(Date.now() + 3 * 3600 * 1000);
  const isSunday = now.getUTCDay() === 0;

  const { data: tokens, error: tokErr } = await supabase
    .from("push_tokens")
    .select("user_id, token");
  if (tokErr) return new Response(JSON.stringify({ error: tokErr.message }), { status: 500 });
  if (!tokens?.length) return new Response(JSON.stringify({ sent: 0, note: "no tokens" }), { status: 200 });

  const userIds = tokens.map(t => t.user_id);
  const { data: profiles } = await supabase
    .from("consumer_profiles")
    .select("user_id, current_style_start_date, style_duration, style_due_date")
    .in("user_id", userIds);
  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

  const accessToken = await getAccessToken();
  let sent = 0;

  for (const t of tokens) {
    const p = profileMap.get(t.user_id);

    // Weekly summary — every Sunday, everyone with a token
    if (isSunday) {
      if (await sendPush(accessToken, t.token, t.user_id,
        "FolliSense · Your week",
        "Your record grew this week. Take a look at where things stand.",
        "/history")) sent++;
      continue; // one notification per user per day, max
    }

    if (!p?.current_style_start_date) continue;

    const cycleDays = parseCycleDays(p.style_duration);
    const day       = daysBetween(p.current_style_start_date, now);
    if (day < 0 || day > cycleDays + 7) continue; // stale/future style data — stay quiet

    const dueDay = p.style_due_date
      ? daysBetween(p.current_style_start_date, new Date(p.style_due_date))
      : cycleDays;

    // Mid-cycle check-in — exactly the halfway day
    if (day === Math.floor(cycleDays / 2)) {
      if (await sendPush(accessToken, t.token, t.user_id,
        "FolliSense · Check-in",
        "Halfway through your style. How's your scalp doing under there? Takes a minute.",
        "/scalp-check")) sent++;
      continue;
    }

    // Wash-day heads-up — exactly 2 days before due
    if (day === dueDay - 2) {
      if (await sendPush(accessToken, t.token, t.user_id,
        "FolliSense · Wash day soon",
        "Wash day is in 2 days. It's the best day for a clear scalp photo.",
        "/routine-tracker")) sent++;
    }
  }

  console.log(`[send-reminders] done — ${sent} pushes sent to ${tokens.length} tokens`);
  return new Response(JSON.stringify({ sent, tokens: tokens.length }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});