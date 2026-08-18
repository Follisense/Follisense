import { defineSchema } from "convex/server";

// Chat is live-session only — no message content, session titles,
// or user identity is persisted here. All health data lives in
// Supabase (P1-7). Do not add tables to this file without a
// data-protection review.
export default defineSchema({});
