// src/services/timelineService.ts
//
// P3-6 — the timeline.
//
// A read-time union of everything that has a date: check-ins, photos, hair
// events, and products entering or leaving the routine. Nothing is written
// twice. There is no timeline table, and there should not be one — a stored
// copy would drift from its sources the first time a row was edited.
//
// THE RULE THIS FILE EXISTS TO HOLD: events are facts with dates, never causes.
// The timeline puts "started using X" next to "flaking eased" and stops there.
// It never says one caused the other, never sorts to imply it, never
// highlights a pair. She draws the arrow; the software does not.
//
// If a future version wants attribution, that is a separate surface with its
// own honest framing, not a quiet change to how this list is ordered.

import { supabase } from '@/lib/supabaseClient';

export type TimelineKind =
  | 'check_in'
  | 'photo'
  | 'event'
  | 'product_started'
  | 'product_ended';

export interface TimelineItem {
  id:        string;
  kind:      TimelineKind;
  /** yyyy-mm-dd. Everything is normalised to a date so the sort is stable. */
  date:      string;
  title:     string;
  detail:    string | null;
  /** For photos, so the list can show a thumbnail. */
  photoUrl?: string | null;
}

const toDate = (iso: string) => iso.slice(0, 10);

const NOT_REPORTED = new Set([
  'None', 'No', 'No change', 'Normal',
  'Feels normal', 'Soft and moisturised as usual',
  'No breakage', 'Looks healthy, no changes', 'No, hair feels normal',
]);

const isMetaKey = (k: string) =>
  k.endsWith('_score') || k === 'total_score' || k === 'risk_level' ||
  k === 'pattern_flag' || k === 'ccca_flag';

/** How many symptoms she reported in a check-in. A count, not a verdict. */
const reportedCount = (symptoms: Record<string, any> | null) => {
  if (!symptoms) return 0;
  return Object.entries(symptoms).filter(
    ([k, v]) => !isMetaKey(k) && typeof v === 'string' && v.length > 0 && !NOT_REPORTED.has(v),
  ).length;
};

export const getTimeline = async (): Promise<TimelineItem[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const uid = session.user.id;

  // One round trip. Four queries in parallel rather than four awaits in a row.
  const [checkinsRes, eventsRes, productsRes, typesRes] = await Promise.all([
    supabase.from('checkins')
      .select('id, created_at, type, is_baseline, symptoms')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),
    supabase.from('hair_events')
      .select('id, occurred_on, event_type, note')
      .eq('user_id', uid)
      .order('occurred_on', { ascending: false }),
    supabase.from('routine_products')
      .select('id, product_name, phase, started_on, ended_on, ended_reason')
      .eq('user_id', uid),
    supabase.from('hair_event_types').select('key, label'),
  ]);

  const checkins = checkinsRes.data || [];
  const events   = eventsRes.data   || [];
  const products = productsRes.data || [];
  const typeMap  = Object.fromEntries((typesRes.data || []).map(t => [t.key, t.label]));

  // Photos hang off check-ins, so they need the ids first.
  const checkinIds = checkins.map(c => c.id);
  const { data: photos } = checkinIds.length
    ? await supabase.from('checkin_photos')
        .select('id, checkin_id, region_tag, created_at, photo_url')
        .in('checkin_id', checkinIds)
    : { data: [] as any[] };

  const items: TimelineItem[] = [];

  // ── Check-ins ──
  checkins.forEach(c => {
    // Photo-only rows are represented by their photos, not twice.
    if (c.type === 'visual' && reportedCount(c.symptoms) === 0) return;

    const n = reportedCount(c.symptoms);
    items.push({
      id:     `checkin-${c.id}`,
      kind:   'check_in',
      date:   toDate(c.created_at),
      title:  c.is_baseline ? 'Baseline check-in' : 'Check-in',
      detail: n === 0 ? 'Nothing reported' : `${n} thing${n === 1 ? '' : 's'} logged`,
    });
  });

  // ── Photos ──
  (photos || []).forEach(p => {
    items.push({
      id:       `photo-${p.id}`,
      kind:     'photo',
      date:     toDate(p.created_at),
      title:    'Photo added',
      detail:   p.region_tag || null,
      photoUrl: p.photo_url,
    });
  });

  // ── Hair events ──
  events.forEach(e => {
    items.push({
      id:     `event-${e.id}`,
      kind:   'event',
      date:   e.occurred_on,
      title:  typeMap[e.event_type] || e.event_type,
      detail: e.note || null,
    });
  });

  // ── Products, as two moments rather than one span ──
  // A product entering the routine and leaving it are different days and
  // belong at different points in the list.
  products.forEach(p => {
    if (p.started_on) {
      items.push({
        id:     `prod-start-${p.id}`,
        kind:   'product_started',
        date:   p.started_on,
        title:  `Started using ${p.product_name}`,
        detail: p.phase || null,
      });
    }
    if (p.ended_on) {
      items.push({
        id:     `prod-end-${p.id}`,
        kind:   'product_ended',
        date:   p.ended_on,
        title:  `Stopped using ${p.product_name}`,
        // ended_reason is deliberately NOT rendered as an explanation of
        // anything else on the timeline. It is why she stopped, nothing more.
        detail: p.ended_reason ? p.ended_reason.replace(/_/g, ' ') : null,
      });
    }
  });

  // Newest first. Plain chronology — no grouping by relatedness, no pairing,
  // nothing that would suggest one item explains another.
  return items.sort((a, b) => b.date.localeCompare(a.date));
};

/** Group by month for rendering. Keys are 'yyyy-mm', in the same order. */
export const groupByMonth = (items: TimelineItem[]) => {
  const groups: { key: string; label: string; items: TimelineItem[] }[] = [];
  items.forEach(item => {
    const key = item.date.slice(0, 7);
    let group = groups.find(g => g.key === key);
    if (!group) {
      group = {
        key,
        label: new Date(`${key}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
  });
  return groups;
};