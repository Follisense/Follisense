import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Droplets, Sun, Moon, Sparkles, Lightbulb, ShoppingBag, ExternalLink, X, CalendarDays, Check, ChevronRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabaseClient';
import ProductSearch from '@/components/ProductSearch';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

// ─── DARK THEME,green accent ────────────────────────────────────────────────
const C = {
  bg:         '#0A0908',
  surface:    '#16120D',
  card:       '#1C1814',
  cardBorder: 'rgba(143,178,158,0.14)',
  ink:        '#F5EFE6',
  sub:        'rgba(245,239,230,0.45)',
  warm:       'rgba(245,239,230,0.68)',
  gold:       '#8FB29E',      // primary accent,green
  goldDeep:   '#6FA283',
  gold10:     'rgba(143,178,158,0.10)',
  goldBorder: 'rgba(143,178,158,0.28)',
  mid:        'rgba(245,239,230,0.08)',
  midBorder:  'rgba(245,239,230,0.10)',
  red:        '#C47070',
};

// ─── LIGHT THEME,for the style/takedown bottom sheet ───────────────────────
const L = {
  bg:      '#FFFFFF',
  ink:     '#23201A',
  muted:   '#8A8F86',
  warm:    '#6B6F66',
  green:   '#2E4A39',
  green10: 'rgba(46,74,57,0.10)',
  border:  '#E3E7DE',
  red:     '#B05040',
};

const styleOptions = [
  'Braids', 'Locs', 'Twists', 'Twist out', 'Wig', 'Weave', 'Silk press', 'Blow out', 'Cornrows', 'Other',
];

const weekOptions = [2, 4, 6, 8, 10];

const hairTypeLabels: Record<string, string> = {
  '3b': '3b curls', '3c': '3c curls', '4a': '4a coils', '4b': '4b coils', '4c': '4c coils', 'unsure': 'your hair type',
};

const parseCycleLengthToDays = (raw: string): number => {
  if (!raw) return 28;
  const n = raw.match(/\d+/g);
  if (!n) return 28;
  if (n.length >= 2) return Math.round(((parseInt(n[0]) + parseInt(n[1])) / 2) * 7);
  return parseInt(n[0]) * 7;
};

interface PhaseProduct {
  id?: string;        // DB row id (absent only for optimistic rows before insert resolves)
  name: string;
  frequency: string;
}

const emptyPhases = (): Record<string, PhaseProduct[]> => ({
  'Wash Day': [], 'Days 1-3': [], 'Mid-cycle': [], 'Pre-wash': [],
});

const openJumia = (productName: string) => {
  const url = `https://www.jumia.co.ke/catalog/?q=${encodeURIComponent(productName)}`;
  window.open(url, '_blank', 'noopener noreferrer');
};

const openGoogleShopping = (productName: string) => {
  const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(productName + ' Kenya')}`;
  window.open(url, '_blank', 'noopener noreferrer');
};

// ─── PHASE DISPLAY CONFIG,display-only labels, DB keys never change ────────
const phaseIconMap: Record<string, any> = {
  'Wash Day':  Droplets,
  'Days 1-3':  Sun,
  'Mid-cycle': Moon,
  'Pre-wash':  Sparkles,
};

const phaseDisplayTitle: Record<string, string> = {
  'Wash Day':  'Scalp Wash & Condition',
  'Days 1-3':  'Leave-in & Seal',
  'Mid-cycle': 'Between Washes',
  'Pre-wash':  'Pre-poo',
};

// One rotating tip per phase, shown a sentence at a time. First entry is
// personalized from the person's own profile; the rest are general practice.
const getPhaseTips = (phase: string, hairLabel: string, style: string, chemLabel: string | null): string[] => {
  switch (phase) {
    case 'Wash Day':
      return [
        `${hairLabel}${style ? ` in ${style}` : ''},wash day is your real access point to the scalp.`,
        'Scalp wash first, with fingertips, not nails.',
        'Condition your lengths and ends only, then leave-in right after.',
        'Seal last to lock in moisture,skip the scalp itself.',
      ];
    case 'Days 1-3':
      return [
        'The days right after washing are when moisture and tension do the most damage or the most good.',
        'Sleep on satin to protect your edges overnight.',
        'If it itches, press gently,resist the urge to scratch.',
      ];
    case 'Mid-cycle':
      return chemLabel
        ? [
            `With ${chemLabel.toLowerCase()}, buildup and dryness tend to show up here first.`,
            'A light mist and a tension check go a long way between washes.',
            'Soothe the itch before it becomes a bigger flare.',
          ]
        : [
            'This is the stretch people skip. Buildup and itch usually peak mid-cycle, not on wash day.',
            'A light mist and a tension check go a long way between washes.',
            'Soothe the itch before it becomes a bigger flare.',
          ];
    case 'Pre-wash':
      return [
        `A pre-poo buffers ${hairLabel.toLowerCase()} from shampoo strip, especially before a fresh install.`,
        'Apply 15–30 minutes before shampoo, focus on the driest ends.',
      ];
    default:
      return [];
  }
};

// ─── PRODUCT CHIP ─────────────────────────────────────────────────────────────
const ProductChip = ({
  product,
  onRemove,
  onShop,
}: {
  product: PhaseProduct;
  onRemove: () => void;
  onShop: () => void;
}) => {
  const [showShop, setShowShop] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(143,178,158,0.15)', border: `1.5px solid ${C.goldBorder}`,
        borderRadius: 100, padding: '7px 10px 7px 14px',
        fontFamily: dm, fontSize: 12, color: C.ink,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <span style={{ fontWeight: 600, color: '#F5EFE6', letterSpacing: '0.01em' }}>{product.name}</span>
        <span style={{ fontSize: 10, color: C.gold, fontWeight: 500 }}>{product.frequency}</span>

        <button
          onClick={() => setShowShop(s => !s)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
          title="Find this product"
        >
          <ShoppingBag size={11} color={C.gold} strokeWidth={2} />
        </button>

        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
          title="Remove"
        >
          <X size={11} color={C.sub} strokeWidth={2} />
        </button>
      </div>

      <AnimatePresence>
        {showShop && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: '110%', left: 0, zIndex: 20,
              background: C.card, border: `1px solid ${C.cardBorder}`,
              borderRadius: 14, padding: 8, minWidth: 180,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px 4px' }}>Find online</p>
            <button
              onClick={() => { openJumia(product.name); setShowShop(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,101,0,0.08)', border: 'none', cursor: 'pointer', marginBottom: 6 }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 6, background: '#FF6500', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 800, color: '#fff' }}>J</span>
              </div>
              <span style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.ink }}>Jumia Kenya</span>
              <ExternalLink size={10} color={C.sub} strokeWidth={2} style={{ marginLeft: 'auto' }} />
            </button>
            <button
              onClick={() => { openGoogleShopping(product.name); setShowShop(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(66,133,244,0.08)', border: 'none', cursor: 'pointer' }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 6, background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 800, color: '#fff' }}>G</span>
              </div>
              <span style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.ink }}>Google Shopping</span>
              <ExternalLink size={10} color={C.sub} strokeWidth={2} style={{ marginLeft: 'auto' }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── PHASE CARD ───────────────────────────────────────────────────────────────
const PhaseCard = ({
  phase,
  stepNumber,
  tip,
  products,
  isAdding,
  addingProducts,
  frequency,
  onStartAdd,
  onCancelAdd,
  onAddingProductsChange,
  onFrequencyChange,
  onConfirmAdd,
  onRemoveProduct,
}: {
  phase: string;
  stepNumber: number;
  tip: string;
  products: PhaseProduct[];
  isAdding: boolean;
  addingProducts: string[];
  frequency: string;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onAddingProductsChange: (p: string[]) => void;
  onFrequencyChange: (f: string) => void;
  onConfirmAdd: () => void;
  onRemoveProduct: (i: number) => void;
}) => {
  const Icon = phaseIconMap[phase] || Droplets;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 12,
        fontFamily: dm,
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.gold10, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.gold }}>{stepNumber}</span>
          </div>
          <Icon size={14} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: dm, fontSize: 14, fontWeight: 600, color: C.ink, flex: 1 }}>{phaseDisplayTitle[phase] || phase}</span>
          <span style={{ fontFamily: dm, fontSize: 11, color: C.sub }}>
            {products.length} product{products.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Single rotating tip sentence */}
        <div style={{ paddingLeft: 38, minHeight: 32 }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={tip}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35 }}
              style={{ fontFamily: dm, fontSize: 12, color: C.sub, lineHeight: 1.55, margin: 0 }}
            >
              {tip}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: C.midBorder }} />

      {/* Your products sub-section */}
      <div style={{ padding: '14px 16px 4px' }}>
        <p style={{ fontFamily: dm, fontSize: 9, fontWeight: 700, color: C.sub, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Your products</p>
      </div>

      {products.length > 0 && (
        <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {products.map((p, i) => (
            <ProductChip
              key={p.id ?? i}
              product={p}
              onRemove={() => onRemoveProduct(i)}
              onShop={() => openJumia(p.name)}
            />
          ))}
        </div>
      )}

      {isAdding ? (
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.midBorder}` }}>
          <ProductSearch
            category="scalp"
            selectedProducts={addingProducts}
            onProductsChange={onAddingProductsChange}
            darkMode={true}
          />
          {addingProducts.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {addingProducts.map(p => (
                  <div key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(143,178,158,0.15)', border: `1.5px solid ${C.goldBorder}`, borderRadius: 100, padding: '5px 12px' }}>
                    <span style={{ fontFamily: dm, fontSize: 11, fontWeight: 600, color: C.ink }}>{p}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.warm, margin: '0 0 8px' }}>
                How often during {phaseDisplayTitle[phase] || phase}?
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
                {['Every cycle', 'Most cycles', 'Sometimes', 'Just tried it'].map(f => (
                  <button
                    key={f}
                    onClick={() => onFrequencyChange(f)}
                    style={{
                      padding: '6px 14px', borderRadius: 100, fontFamily: dm, fontSize: 12, fontWeight: 500,
                      border: `1.5px solid ${frequency === f ? C.gold : C.midBorder}`,
                      background: frequency === f ? C.gold10 : 'transparent',
                      color: frequency === f ? C.gold : C.sub,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={onConfirmAdd}
                style={{
                  width: '100%', height: 44, borderRadius: 14, border: 'none',
                  background: `linear-gradient(135deg, #16261B 0%, #0E1610 100%)`,
                  color: C.gold, fontFamily: dm, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  boxShadow: `0 0 0 1px ${C.goldBorder}`,
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, rgba(143,178,158,0.35), transparent)` }} />
                Add {addingProducts.length} product{addingProducts.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}
          <button
            onClick={onCancelAdd}
            style={{ width: '100%', marginTop: 8, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm, fontSize: 12, color: C.sub }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={onStartAdd}
          style={{
            width: '100%', padding: '11px 0', borderTop: `1px solid ${C.midBorder}`,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.gold,
          }}
        >
          <Plus size={13} strokeWidth={2.5} /> Add product
        </button>
      )}
    </motion.div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const RoutineTracker = () => {
  const navigate = useNavigate();
  const { onboardingData, setOnboardingData, setRoutineLastUpdated } = useApp();

  const scalpProducts = onboardingData.scalpProducts?.filter(p => p !== 'None' && p !== "I don't use anything specific") || [];
  const hairProducts  = onboardingData.hairProducts?.filter(p => p !== 'None' && p !== "I don't use anything specific") || [];
  const betweenCare   = onboardingData.betweenWashCare?.filter(p => p !== 'Nothing - I leave it alone until wash day' && p !== 'Other') || [];

  const [phases, setPhases]   = useState<Record<string, PhaseProduct[]>>(emptyPhases());
  const [loading, setLoading] = useState(true);

  const [addingTo, setAddingTo]             = useState<string | null>(null);
  const [addingProducts, setAddingProducts] = useState<string[]>([]);
  const [frequency, setFrequency]           = useState('Every cycle');

  // Rotating tip index,shared across all phase cards, advances every few seconds.
  const [tipRotation, setTipRotation] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTipRotation(i => i + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // ── Style + takedown date state ──
  const [styleStartDate, setStyleStartDate] = useState<string | null>(null);
  const [styleDueDate, setStyleDueDate]     = useState<string | null>(null);
  const [showStyleSheet, setShowStyleSheet] = useState(false);
  const [savingStyle, setSavingStyle]       = useState(false);
  const [pendingStyle, setPendingStyle]     = useState<string | null>(null);
  const [pendingWeeks, setPendingWeeks]     = useState<number | null>(null);
  const [customStyle, setCustomStyle]       = useState('');
  const [tookOutDone, setTookOutDone]       = useState(false);

  useEffect(() => {
    const loadStyle = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const uid = session.user.id;
        const { data: p1 } = await supabase.from('profiles').select('current_style_start_date').eq('id', uid).maybeSingle();
        if (p1?.current_style_start_date) {
          setStyleStartDate(p1.current_style_start_date);
          const { data: cp } = await supabase.from('consumer_profiles').select('style_duration, style_due_date').eq('user_id', uid).maybeSingle();
          if (cp?.style_due_date) setStyleDueDate(cp.style_due_date);
          return;
        }
        const { data: p2 } = await supabase.from('consumer_profiles').select('current_style_start_date, style_due_date').eq('user_id', uid).maybeSingle();
        if (p2?.current_style_start_date) {
          setStyleStartDate(p2.current_style_start_date);
          if (p2.style_due_date) setStyleDueDate(p2.style_due_date);
        }
      } catch (e) { console.error('[RoutineTracker] style load failed:', e); }
    };
    loadStyle();
  }, []);

  const currentStyle = onboardingData.protectiveStyles?.[0] || 'Braids';
  const totalDays    = parseCycleLengthToDays(onboardingData.cycleLength);
  const styleStartMs = styleStartDate ? new Date(styleStartDate).getTime() : null;
  const dueDate = styleDueDate
    ? new Date(styleDueDate)
    : styleStartMs ? new Date(styleStartMs + totalDays * 86400000) : null;
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : null;
  const dueUrgent = daysUntilDue !== null && daysUntilDue <= 5;
  const dueColor = daysUntilDue !== null && daysUntilDue <= 0 ? C.red
    : dueUrgent ? '#E8C878'
    : C.gold;
  const dueStatusLabel =
    daysUntilDue === null ? 'Not set yet'
    : daysUntilDue < 0    ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue`
    : daysUntilDue === 0  ? 'Due today'
    : `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;

  const handleSaveTakedownDate = async (newDue: Date | null) => {
    setSavingStyle(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const iso = newDue ? format(newDue, 'yyyy-MM-dd') : null;
        await supabase.from('consumer_profiles').update({ style_due_date: iso }).eq('user_id', session.user.id);
        // Keep the open cycle's planned takedown in sync
        if (iso) {
          await supabase.from('style_cycles')
            .update({ planned_takedown: iso })
            .eq('user_id', session.user.id)
            .is('ended_at', null);
        }
        setStyleDueDate(iso);
      }
    } catch (e) { console.error('[RoutineTracker] save takedown date failed:', e); }
    finally { setSavingStyle(false); }
  };

  // ── Took it out: closes the open cycle in style_cycles, clears the due date ──
  const handleTookItOut = async () => {
    setSavingStyle(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('style_cycles')
          .update({ ended_at: today })
          .eq('user_id', session.user.id)
          .is('ended_at', null);
        await supabase.from('consumer_profiles')
          .update({ style_due_date: null })
          .eq('user_id', session.user.id);
      }
      setStyleDueDate(null);
      setTookOutDone(true);
    } catch (e) { console.error('[RoutineTracker] took-it-out failed:', e); }
    finally { setSavingStyle(false); }
  };

  const resolvedNextStyle = pendingStyle === 'Other' ? customStyle.trim() : pendingStyle;

  // ── New style: ends any open cycle, inserts a fresh style_cycles row with the
  //    chosen duration, and syncs consumer_profiles so the rest of the app follows ──
  const handleConfirmNextStyle = async () => {
    if (!resolvedNextStyle || !pendingWeeks) return;
    setSavingStyle(true);
    const today   = format(new Date(), 'yyyy-MM-dd');
    const dueIso  = format(new Date(Date.now() + pendingWeeks * 7 * 86400000), 'yyyy-MM-dd');
    try {
      setOnboardingData({
        ...onboardingData,
        protectiveStyles: [resolvedNextStyle, ...(onboardingData.protectiveStyles || []).filter(s => s !== resolvedNextStyle)],
        cycleLength: `${pendingWeeks} weeks`,
      });
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const uid = session.user.id;
        await supabase.from('style_cycles')
          .update({ ended_at: today })
          .eq('user_id', uid)
          .is('ended_at', null);
        await supabase.from('style_cycles').insert({
          user_id:          uid,
          style_name:       resolvedNextStyle,
          started_at:       today,
          expected_weeks:   pendingWeeks,
          planned_takedown: dueIso,
        });
        await supabase.from('consumer_profiles').update({
          current_styles:           [resolvedNextStyle],
          current_style_start_date: today,
          style_due_date:           dueIso,
          style_duration:           `${pendingWeeks} weeks`,
        }).eq('user_id', uid);
        await supabase.from('profiles').update({ current_style_start_date: today }).eq('id', uid);
      }
      setStyleStartDate(today);
      setStyleDueDate(dueIso);
      setPendingStyle(null);
      setPendingWeeks(null);
      setCustomStyle('');
      setTookOutDone(false);
      setShowStyleSheet(false);
    } catch (e) { console.error('[RoutineTracker] save next style failed:', e); }
    finally { setSavingStyle(false); }
  };

  const rowsToPhases = (rows: { id: string; phase: string; product_name: string; frequency: string }[]) => {
    const next = emptyPhases();
    for (const r of rows) {
      if (next[r.phase]) next[r.phase].push({ id: r.id, name: r.product_name, frequency: r.frequency });
    }
    return next;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) { setLoading(false); return; }
      const uid = session.user.id;

      const { data, error } = await supabase
        .from('routine_products')
        .select('id, phase, product_name, frequency')
        .eq('user_id', uid)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error('[RoutineTracker] load failed:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setPhases(rowsToPhases(data));
        setLoading(false);
        return;
      }

      const seed: { user_id: string; phase: string; product_name: string; frequency: string }[] = [
        ...scalpProducts.map(p => ({ user_id: uid, phase: 'Wash Day',  product_name: p, frequency: 'Every cycle' })),
        ...hairProducts.map(p  => ({ user_id: uid, phase: 'Wash Day',  product_name: p, frequency: 'Every cycle' })),
        ...hairProducts.slice(0, 2).map(p => ({ user_id: uid, phase: 'Days 1-3', product_name: p, frequency: 'Every cycle' })),
        ...betweenCare.map(p   => ({ user_id: uid, phase: 'Mid-cycle', product_name: p, frequency: 'Most cycles' })),
      ];

      if (seed.length === 0) { setLoading(false); return; }

      const { data: inserted, error: seedErr } = await supabase
        .from('routine_products')
        .insert(seed)
        .select('id, phase, product_name, frequency');

      if (cancelled) return;

      if (seedErr) {
        console.error('[RoutineTracker] seed failed:', seedErr);
      } else if (inserted) {
        setPhases(rowsToPhases(inserted));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirmAdd = async (phase: string) => {
    const toAdd = addingProducts;
    const freq  = frequency;
    setAddingTo(null);
    setAddingProducts([]);
    setFrequency('Every cycle');
    if (toAdd.length === 0) return;
    setRoutineLastUpdated(Date.now());

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setPhases(prev => ({ ...prev, [phase]: [...prev[phase], ...toAdd.map(p => ({ name: p, frequency: freq }))] }));
      return;
    }

    const rows = toAdd.map(p => ({ user_id: session.user.id, phase, product_name: p, frequency: freq }));
    const { data, error } = await supabase
      .from('routine_products')
      .insert(rows)
      .select('id, phase, product_name, frequency');

    if (error || !data) {
      console.error('[RoutineTracker] add failed:', error);
      setPhases(prev => ({ ...prev, [phase]: [...prev[phase], ...toAdd.map(p => ({ name: p, frequency: freq }))] }));
      return;
    }

    setPhases(prev => ({
      ...prev,
      [phase]: [...prev[phase], ...data.map(r => ({ id: r.id, name: r.product_name, frequency: r.frequency }))],
    }));
  };

  const handleRemoveProduct = async (phase: string, index: number) => {
    const target = phases[phase][index];
    setPhases(prev => ({ ...prev, [phase]: prev[phase].filter((_, i) => i !== index) }));
    setRoutineLastUpdated(Date.now());

    if (!target?.id) return;
    const { error } = await supabase.from('routine_products').delete().eq('id', target.id);
    if (error) console.error('[RoutineTracker] remove failed:', error);
  };

  const gaps: string[] = [];
  if (phases['Mid-cycle'].length === 0) {
    gaps.push("Most people don't use anything between washes. That's a gap worth watching: buildup and itch tend to peak mid-cycle.");
  }
  const hasScalpProductOnWashDay = phases['Wash Day'].some(p => scalpProducts.includes(p.name));
  if (!hasScalpProductOnWashDay && phases['Wash Day'].length > 0) {
    gaps.push("You're washing your hair but not treating your scalp separately. That's common: most products aren't designed for both.");
  }
  const midCycleOnlyOils = phases['Mid-cycle'].length > 0 && phases['Mid-cycle'].every(p => p.name.toLowerCase().includes('oil'));
  if (midCycleOnlyOils) {
    gaps.push("Oils work well for the hair shaft, but your scalp might benefit from something lighter between washes, especially under protective styles.");
  }

  const hairLabel = hairTypeLabels[onboardingData.hairType] ? `Type ${hairTypeLabels[onboardingData.hairType]}` : 'Your hair';
  const chemLabel = onboardingData.chemicalProcessing && !['No, fully natural', 'Never'].includes(onboardingData.chemicalProcessing) ? onboardingData.chemicalProcessing : null;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 100, fontFamily: dm }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600&display=swap'); * { box-sizing: border-box; }`}</style>

      {/* ── HERO ── */}
      <div style={{ background: `radial-gradient(ellipse 160% 120% at 50% -10%, rgba(143,178,158,0.10) 0%, transparent 55%), linear-gradient(180deg, #16120D 0%, #0A0908 100%)`, padding: '52px 20px 8px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(143,178,158,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, position: 'relative' }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={16} color={C.sub} strokeWidth={1.8} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: 'rgba(143,178,158,0.85)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>FolliSense</span>
          </div>
          <div style={{ width: 36 }} />
        </div>

       
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* ── Takedown-date card,simplified: label + calendar icon + due status only ── */}
        <motion.button
          onClick={() => { setPendingStyle(null); setPendingWeeks(null); setTookOutDone(false); setShowStyleSheet(true); }}
          initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none',
            background: `linear-gradient(135deg, #23392C 0%, #2E4A39 55%, #16261B 100%)`,
            borderRadius: 22, padding: '18px 20px', marginTop: -30, marginBottom: 20,
            position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: dueUrgent ? `0 8px 32px rgba(232,200,120,0.20), 0 0 0 1.5px rgba(232,200,120,0.45)` : `0 8px 28px rgba(0,0,0,0.35), 0 0 0 1px ${C.goldBorder}`,
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(143,178,158,0.5), transparent)' }} />
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(143,178,158,0.14)', border: `1.5px solid rgba(143,178,158,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarDays size={21} color={C.gold} strokeWidth={1.7} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: playfair, fontSize: 18, color: '#F5F7F2', margin: '0 0 3px', lineHeight: 1.2 }}>My style & takedown</p>
            <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 700, color: dueColor, margin: 0 }}>{dueStatusLabel}</p>
          </div>
          <ChevronRight size={18} color={C.gold} strokeWidth={2} style={{ flexShrink: 0 }} />
        </motion.button>

        {loading ? (
          <p style={{ fontFamily: dm, fontSize: 13, color: C.sub, textAlign: 'center', padding: '40px 0' }}>
            Loading your routine…
          </p>
        ) : (
        <>
        {/* ── Phase cards ── */}
        {Object.entries(phases).map(([phase, products], i) => {
          const tips = getPhaseTips(phase, hairLabel, currentStyle, chemLabel);
          const tip = tips.length > 0 ? tips[tipRotation % tips.length] : '';
          return (
            <PhaseCard
              key={phase}
              phase={phase}
              stepNumber={i + 1}
              tip={tip}
              products={products}
              isAdding={addingTo === phase}
              addingProducts={addingProducts}
              frequency={frequency}
              onStartAdd={() => { setAddingTo(phase); setAddingProducts([]); }}
              onCancelAdd={() => { setAddingTo(null); setAddingProducts([]); }}
              onAddingProductsChange={setAddingProducts}
              onFrequencyChange={setFrequency}
              onConfirmAdd={() => handleConfirmAdd(phase)}
              onRemoveProduct={(idx) => handleRemoveProduct(phase, idx)}
            />
          );
        })}

        {/* ── Gap identification ── */}
        {gaps.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Lightbulb size={14} color={C.gold} strokeWidth={1.8} />
              <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Things worth knowing</p>
            </div>
            {gaps.map((gap, i) => (
              <div key={i} style={{ background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10, display: 'flex', gap: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0, marginTop: 6 }} />
                <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: 0, lineHeight: 1.65 }}>{gap}</p>
              </div>
            ))}
          </motion.div>
        )}

        <p style={{ fontFamily: dm, fontSize: 10, color: C.sub, textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
          Tap 🛍 on any product chip to find it on Jumia KE or Google Shopping
        </p>
        </>
        )}
      </div>

      {/* ── Style & takedown bottom sheet,LIGHT theme, no calendar scroll ── */}
      <AnimatePresence>
        {showStyleSheet && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowStyleSheet(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              style={{ background: L.bg, borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 430, maxHeight: '92dvh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.25)' }}>

              <div style={{ padding: '14px 24px 0', flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, borderRadius: 100, background: L.border, margin: '0 auto 16px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h3 style={{ fontFamily: playfair, fontSize: 18, color: L.ink, margin: 0 }}>{currentStyle}</h3>
                  <button onClick={() => setShowStyleSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={19} color={L.muted} strokeWidth={1.8} />
                  </button>
                </div>
                <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 700, color: daysUntilDue !== null && daysUntilDue <= 0 ? L.red : L.green, margin: '0 0 12px' }}>
                  {tookOutDone ? 'Style taken out,set up your next one below' : dueStatusLabel}
                </p>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 24px 24px' }}>

                {/* ── Takedown date,white calendar, inline, no inner scroll ── */}
                <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: L.ink, margin: '0 0 4px' }}>Takedown date</p>
                <p style={{ fontFamily: dm, fontSize: 12, color: L.muted, lineHeight: 1.5, margin: '0 0 10px' }}>
                  {dueDate ? `Set to ${format(dueDate, 'PPP')}. Tap a new day to change it.` : "Tap the day you plan to take this style out,we'll remind you as it gets close."}
                </p>
                <style>{`
                  .routine-calendar-light { background: #FFFFFF; }
                  .routine-calendar-light, .routine-calendar-light * { color: ${L.ink}; }
                  .routine-calendar-light button:hover:not([disabled]) { background: rgba(46,74,57,0.08) !important; }
                  .routine-calendar-light [aria-selected="true"],
                  .routine-calendar-light .rdp-day_selected { background: ${L.green} !important; color: #FFFFFF !important; font-weight: 700; }
                  .routine-calendar-light .rdp-day_today:not([aria-selected="true"]) { border: 1.5px solid ${L.green} !important; }
                  .routine-calendar-light .rdp-day_outside { opacity: 0.35 !important; }
                `}</style>
                <div className="routine-calendar-light" style={{ display: 'flex', justifyContent: 'center', background: '#FFFFFF', borderRadius: 16, border: `1.5px solid ${L.border}`, marginBottom: 8 }}>
                  <CalendarPicker mode="single" selected={dueDate ?? undefined} onSelect={d => d && handleSaveTakedownDate(d)} initialFocus className={cn('p-3 pointer-events-auto')} />
                </div>

                {/* ── Took it out ── */}
                <button
                  onClick={handleTookItOut}
                  disabled={savingStyle || tookOutDone}
                  style={{
                    width: '100%', height: 48, borderRadius: 14, marginBottom: 24,
                    background: tookOutDone ? L.green10 : 'transparent',
                    border: `1.5px solid ${tookOutDone ? L.green : L.border}`,
                    color: tookOutDone ? L.green : L.ink,
                    fontFamily: dm, fontSize: 13, fontWeight: 600,
                    cursor: savingStyle || tookOutDone ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {tookOutDone && <Check size={13} strokeWidth={2.5} />}
                  {tookOutDone ? 'Style taken out' : 'I took this style out'}
                </button>

                {/* ── New style ── */}
                <div style={{ height: 1, background: L.border, margin: '0 0 20px' }} />
                <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: L.ink, margin: '0 0 4px' }}>Starting a new style?</p>
                <p style={{ fontFamily: dm, fontSize: 12, color: L.muted, lineHeight: 1.5, margin: '0 0 12px' }}>
                  Pick what's going in and how long you plan to keep it. This starts a fresh cycle from today.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: pendingStyle === 'Other' ? 12 : 16 }}>
                  {styleOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => setPendingStyle(s)}
                      style={{
                        padding: '8px 16px', borderRadius: 100, fontFamily: dm, fontSize: 12, fontWeight: 500,
                        border: `1.5px solid ${pendingStyle === s ? L.green : L.border}`,
                        background: pendingStyle === s ? L.green10 : 'transparent',
                        color: pendingStyle === s ? L.green : L.warm,
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {pendingStyle === s && <Check size={11} strokeWidth={2.5} />}
                      {s}
                    </button>
                  ))}
                </div>

                {pendingStyle === 'Other' && (
                  <input
                    type="text"
                    value={customStyle}
                    onChange={e => setCustomStyle(e.target.value)}
                    placeholder="Name your style, e.g. Fulani braids"
                    autoFocus
                    style={{
                      width: '100%', height: 44, padding: '0 14px', marginBottom: 16,
                      borderRadius: 12, border: `1.5px solid ${L.border}`,
                      background: '#F4F6F1', color: L.ink,
                      fontFamily: dm, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                )}

                {resolvedNextStyle && (
                  <>
                    <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: L.ink, margin: '0 0 8px' }}>
                      How long will {resolvedNextStyle} stay in?
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {weekOptions.map(w => (
                        <button
                          key={w}
                          onClick={() => setPendingWeeks(w)}
                          style={{
                            padding: '8px 16px', borderRadius: 100, fontFamily: dm, fontSize: 12, fontWeight: 500,
                            border: `1.5px solid ${pendingWeeks === w ? L.green : L.border}`,
                            background: pendingWeeks === w ? L.green10 : 'transparent',
                            color: pendingWeeks === w ? L.green : L.warm,
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {w} weeks
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {resolvedNextStyle && pendingWeeks && (
                  <button
                    onClick={handleConfirmNextStyle}
                    disabled={savingStyle}
                    style={{
                      width: '100%', height: 50, borderRadius: 14, border: 'none',
                      background: L.green, color: '#FFFFFF',
                      fontFamily: dm, fontSize: 13, fontWeight: 600,
                      cursor: savingStyle ? 'not-allowed' : 'pointer', opacity: savingStyle ? 0.6 : 1,
                    }}
                  >
                    Start {resolvedNextStyle} · {pendingWeeks} weeks from today
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoutineTracker;