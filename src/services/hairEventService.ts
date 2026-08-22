// src/services/hairEventService.ts
//
// P3-5 — hair events.
//
// Things that happened to her hair, with dates. Installs, takedowns, colour,
// trims, heat.
//
// The rule this file exists to protect: events are facts with dates, never
// causes. Nothing here returns "this caused that", and nothing should be added
// that does. The timeline puts events next to check-ins and lets her draw her
// own conclusion. The software never draws the arrow.
//
// Cadence lives in the hair_event_types table, not in a branch in a component.
// Adding an event type is a database row, not a code change.

import { supabase } from '@/lib/supabaseClient';

export interface HairEventType {
  key:             string;
  label:           string;
  typical_days:    number | null;
  is_period_start: boolean;
  closed_by:       string | null;
  sort_order:      number;
}

export interface HairEvent {
  id:            string;
  user_id:       string;
  event_type:    string;
  occurred_on:   string;   // yyyy-mm-dd
  note:          string | null;
  closes_event:  string | null;
  created_at:    string;
}

/** The lookup. Cached per session — it changes about once a year. */
let typeCache: HairEventType[] | null = null;

export const getEventTypes = async (): Promise<HairEventType[]> => {
  if (typeCache) return typeCache;
  const { data, error } = await supabase
    .from('hair_event_types')
    .select('*')
    .order('sort_order');
  if (error) { console.error('[hairEvents] types failed:', error); return []; }
  typeCache = (data || []) as HairEventType[];
  return typeCache;
};

export const getEvents = async (limit = 100): Promise<HairEvent[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('hair_events')
    .select('*')
    .eq('user_id', session.user.id)
    .order('occurred_on', { ascending: false })
    .limit(limit);

  if (error) { console.error('[hairEvents] read failed:', error); return []; }
  return (data || []) as HairEvent[];
};

export const addEvent = async (input: {
  event_type:   string;
  occurred_on:  string;
  note?:        string | null;
  closes_event?: string | null;
}): Promise<HairEvent | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await supabase
      .from('hair_events')
      .insert({
        user_id:      session.user.id,
        event_type:   input.event_type,
        occurred_on:  input.occurred_on,
        note:         input.note?.trim() || null,
        closes_event: input.closes_event ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as HairEvent;
  } catch (e) {
    console.error('[hairEvents] add failed:', e);
    return null;
  }
};

export const deleteEvent = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('hair_events').delete().eq('id', id);
  if (error) { console.error('[hairEvents] delete failed:', error); return false; }
  return true;
};

/**
 * The open style period, if there is one: an install with no takedown after it.
 * Used to offer "took it out" as the obvious next event rather than making her
 * pick from the full list.
 */
export const getOpenPeriod = async (): Promise<HairEvent | null> => {
  const events = await getEvents();
  const types  = await getEventTypes();
  const starts = new Set(types.filter(t => t.is_period_start).map(t => t.key));

  // Events come back newest first, so the first period start with no matching
  // close after it is the open one.
  const closedIds = new Set(events.map(e => e.closes_event).filter(Boolean));
  return events.find(e => starts.has(e.event_type) && !closedIds.has(e.id)) ?? null;
};

/**
 * How long since the last event of this type, in days. Null when it has never
 * happened.
 *
 * This is a COUNT, not a judgement. It says "42 days since your last retwist".
 * It does not say that is too long, because what is too long depends on the
 * person and the app is not in a position to know.
 */
export const daysSince = (events: HairEvent[], eventType: string): number | null => {
  const last = events.find(e => e.event_type === eventType);
  if (!last) return null;
  const then = new Date(last.occurred_on).getTime();
  return Math.floor((Date.now() - then) / 86400000);
};