import { defineSchema } from "convex/server";

// ---------------------------------------------------------------
// P1-7 — one health-data store.
//
// Convex holds NO tables. Chat is live-session only: message
// content, session titles and user identity are not persisted
// here. All user data lives in Supabase, where the delete-account
// path can reach it.
//
// Do not add a table to this file without a data-protection
// review. If it needs storing, it goes in Supabase.
// ---------------------------------------------------------------

export default defineSchema({});
