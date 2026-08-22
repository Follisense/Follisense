// src/pages/TimelinePage.tsx
//
// P3-6 — the timeline.
//
// Everything with a date, newest first, grouped by month.
//
// What this deliberately does NOT do: pair items, highlight coincidences,
// reorder to put a product next to a symptom, or say anything about cause.
// Two things happening in the same week is not evidence, and a layout that
// implies it is doing the same work as a claim.
//
// Route: /timeline

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, ClipboardCheck, Scissors, Plus, Minus } from 'lucide-react';
import { getTimeline, groupByMonth, type TimelineItem, type TimelineKind } from '@/services/timelineService';
import { signPhotoUrls } from '@/services/photoUrlService';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:      '#0A0908',
  card:    '#101A14',
  ink:     '#EAF0E9',
  muted:   'rgba(234,240,233,0.65)',
  faint:   'rgba(234,240,233,0.42)',
  line:    'rgba(110,158,130,0.16)',
  green:   '#6E9E82',
  gold:    '#D4A866',
};

const ICONS: Record<TimelineKind, typeof Camera> = {
  check_in:        ClipboardCheck,
  photo:           Camera,
  event:           Scissors,
  product_started: Plus,
  product_ended:   Minus,
};

// Colour distinguishes kind, nothing more. No colour here means good or bad.
const COLOURS: Record<TimelineKind, string> = {
  check_in:        C.green,
  photo:           C.gold,
  event:           C.green,
  product_started: C.muted,
  product_ended:   C.muted,
};

const TimelinePage = () => {
  const navigate = useNavigate();
  const [items, setItems]     = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = await getTimeline();
      // Private bucket: thumbnails need signing like everywhere else.
      const urls = raw.map(i => i.photoUrl).filter(Boolean) as string[];
      const signed = urls.length ? await signPhotoUrls(urls) : {};
      setItems(raw.map(i => ({
        ...i,
        photoUrl: i.photoUrl ? signed[i.photoUrl] ?? i.photoUrl : null,
      })));
      setLoading(false);
    })();
  }, []);

  const groups = groupByMonth(items);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: dm }}>
      <div className="fs-shell" style={{ padding: '44px 20px 90px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <button onClick={() => navigate(-1)} aria-label="Back"
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={16} color={C.muted} strokeWidth={1.8} />
          </button>
          <div>
            <h1 style={{ fontFamily: playfair, fontSize: 24, fontWeight: 500, color: C.ink, margin: 0, lineHeight: 1.2 }}>
              Your timeline
            </h1>
            <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>
              Everything you have logged, in order
            </p>
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: C.muted }}>Loading…</p>
        ) : items.length === 0 ? (
          <div style={{ padding: '28px 20px', borderRadius: 18, background: C.card, border: `1px solid ${C.line}` }}>
            <p style={{ fontSize: 14, color: C.ink, margin: '0 0 6px' }}>Nothing here yet</p>
            <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.7, margin: 0 }}>
              Your check-ins, photos and anything you log about your hair will
              appear here as you go.
            </p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.key} style={{ marginBottom: 30 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 14px' }}>
                {group.label}
              </p>

              <div style={{ position: 'relative', paddingLeft: 30 }}>
                {/* The spine. Purely visual continuity — it does not connect
                    one item to another in any meaningful sense. */}
                <div style={{ position: 'absolute', left: 11, top: 6, bottom: 6, width: 1, background: C.line }} />

                {group.items.map((item, i) => {
                  const Icon = ICONS[item.kind];
                  const colour = COLOURS[item.kind];
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      style={{ position: 'relative', marginBottom: 14 }}
                    >
                      <div style={{
                        position: 'absolute', left: -30, top: 2,
                        width: 23, height: 23, borderRadius: '50%',
                        background: C.bg, border: `1.5px solid ${C.line}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={11} color={colour} strokeWidth={1.9} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13.5, color: C.ink, margin: 0, lineHeight: 1.45 }}>
                            {item.title}
                          </p>
                          {item.detail && (
                            <p style={{ fontSize: 11.5, color: C.muted, margin: '2px 0 0' }}>
                              {item.detail}
                            </p>
                          )}
                          <p style={{ fontSize: 11, color: C.faint, margin: '3px 0 0' }}>
                            {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>

                        {item.photoUrl && (
                          <img
                            src={item.photoUrl}
                            alt=""
                            style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover', border: `1px solid ${C.line}`, flexShrink: 0 }}
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TimelinePage;