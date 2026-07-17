import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Droplets, Sun, Utensils, AlertTriangle,
  Stethoscope, RefreshCw, Clock, Repeat, Sparkles,
  ShoppingBag, ExternalLink, ChevronDown, ChevronUp, Check,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:         '#0A0908',
  surface:    '#16120D',
  card:       '#1C1814',
  cardBorder: 'rgba(212,168,102,0.12)',
  ink:        '#F5EFE6',
  sub:        'rgba(245,239,230,0.45)',
  warm:       'rgba(245,239,230,0.68)',
  gold:       '#D4A866',
  goldDeep:   '#B8893E',
  gold10:     'rgba(212,168,102,0.10)',
  goldBorder: 'rgba(212,168,102,0.28)',
  mid:        'rgba(245,239,230,0.08)',
  green:      '#5A9A50',
  green10:    'rgba(90,154,80,0.10)',
  red:        '#B05040',
  red10:      'rgba(176,80,64,0.10)',
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface RoutineStep {
  step: string;
  detail: string;
  duration?: string;
  frequency?: string;
}

interface ProductRec {
  name: string;
  reason: string;
  searchQuery: string;
  category: string;
}

interface Routine {
  summary: string;
  wash_day: RoutineStep[];
  mid_cycle: RoutineStep[];
  daily: RoutineStep[];
  weekly_nutrition: { tip: string }[];
  avoid: { item: string }[];
  notes: string;
  products: ProductRec[];
}

// ─── LOCAL ROUTINE GENERATOR (unchanged logic) ────────────────────────────────
const generateMockRoutine = (data: any): Omit<Routine, 'products'> => {
  const isProtectiveStyle = data.protectiveStyleFrequency === 'Most of the time' || data.protectiveStyleFrequency === 'About half the time';
  const isMale = data.gender === 'man';
  const styles = data.protectiveStyles?.length > 0 ? data.protectiveStyles : ['braids'];

  return {
    summary: isProtectiveStyle
      ? `A ${data.cycleLength || '4-week'} cycle routine built around your ${styles[0] || 'protective style'}`
      : `A weekly scalp and hair care routine for your ${styles[0] || 'hair'}`,
    wash_day: [
      { step: 'Scalp cleanse', detail: isProtectiveStyle ? `Part your ${styles[0] || 'style'} gently and apply diluted sulphate-free shampoo directly to the scalp. Massage with fingertips, not nails.` : 'Use a gentle, sulphate-free shampoo. Focus on the scalp, not the lengths. Massage for 2 to 3 minutes to loosen buildup.', duration: '5 mins' },
      { step: 'Condition', detail: 'Apply conditioner to your lengths and ends only. Leave for 3 to 5 minutes. Detangle gently with a wide-tooth comb starting from the ends.', duration: '5 mins' },
      { step: 'Scalp check', detail: 'While your hair is parted for washing, look at your hairline, temples, and crown. Note any redness, bumps, flaking, or thinning.', duration: '2 mins' },
      { step: 'Complete your FolliSense check-in', detail: 'Log your wash day assessment while everything is fresh. Take comparison photos if you can.', duration: '3 mins' },
    ],
    mid_cycle: isProtectiveStyle ? [
      { step: 'Scalp refresh', detail: 'Use a lightweight scalp spray or diluted witch hazel to manage buildup between washes.', frequency: 'Every 5–7 days' },
      { step: 'Tension check', detail: `Feel around your hairline and where your ${styles[0] || 'style'} grips. If anything feels sore or tight, loosen or remove those sections.`, frequency: 'Every few days' },
      { step: 'Mid-cycle check-in', detail: 'Complete your FolliSense mid-cycle questions. Takes 1 minute.', frequency: 'Once mid-cycle' },
    ] : [
      { step: 'Scalp massage', detail: 'Gentle fingertip massage for 3–4 minutes to support circulation. No product needed.', frequency: '2–3 times per week' },
      { step: 'Moisture check', detail: "Feel your ends. If they're dry or rough, apply a small amount of leave-in conditioner or a light cream.", frequency: 'As needed' },
    ],
    daily: [
      { step: isMale ? 'Satin or silk pillowcase' : 'Satin protection', detail: isMale ? 'Sleep on a satin pillowcase to reduce friction on your hairline.' : 'Sleep with a satin bonnet or on a satin pillowcase to reduce friction on your edges and preserve your style.' },
      { step: 'Hydrate', detail: 'Aim for at least 2 litres of water. Your scalp is skin and it benefits from hydration like the rest of your body.' },
      { step: 'Hands off', detail: "Resist the urge to scratch, pick, or constantly touch your scalp. If it itches, press gently with a fingertip instead." },
    ],
    weekly_nutrition: [
      { tip: data.medicalConditions?.includes('Iron deficiency / anaemia') ? 'Your iron levels need attention. Include red meat, spinach, or lentils daily. Pair with vitamin C for better absorption.' : 'Include iron-rich foods regularly: red meat, spinach, lentils, fortified cereals. Iron carries oxygen to your hair follicles.' },
      { tip: "Make sure you're getting enough protein at every meal. Your hair is made of keratin, which is a protein. Low protein intake directly affects hair growth." },
      { tip: data.medicalConditions?.includes('Vitamin D deficiency') ? 'You mentioned low vitamin D. Consider supplementing 1000–2000 IU daily, especially if you have darker skin or limited sun exposure.' : 'Vitamin D supports hair follicle health. Sources: sunlight, oily fish, fortified foods. People with darker skin may benefit from supplementation.' },
    ],
    avoid: [
      { item: isProtectiveStyle ? `Avoid re-tightening your ${styles[0] || 'style'} if it loosens around the hairline. Loose edges are safer than tight ones.` : 'Avoid daily heat styling. Every heat pass weakens the protein bonds in your hair. If you use heat, always use a protectant and keep the temperature under 190°C.' },
      { item: 'Oils work well for the hair shaft, but your scalp might benefit from something lighter between washes, especially under protective styles.' },
      { item: data.chemicalProcessing !== 'No, fully natural' ? 'Avoid overlapping chemical treatments on previously processed sections. Focus new applications on new growth only.' : 'Avoid tight styles in the same position repeatedly. Alternate where tension falls to give follicles recovery time.' },
    ],
    notes: data.teTriggers?.length > 0 && !data.teTriggers?.includes('None of these')
      ? `You mentioned some recent life changes (${data.teTriggers.join(', ')}). Increased shedding in the next few months could be related to this and is often temporary.`
      : data.baselineHairline === 'Very concerned' || data.baselineHairline === 'Noticeable change'
        ? "You flagged hairline concerns at your baseline. If you don't see improvement after reducing tension for 2–3 cycles, book a consultation with a trichologist."
        : '',
  };
};

// ─── CLAUDE: Generate product recommendations ─────────────────────────────────
const fetchProductRecs = async (onboardingData: any): Promise<ProductRec[]> => {
  try {
    const styles   = onboardingData.protectiveStyles?.join(', ') || 'protective styles';
    const concerns = onboardingData.goals?.join(', ') || 'general scalp health';
    const isMale   = onboardingData.gender === 'man';
    const chemical = onboardingData.chemicalProcessing || 'natural';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a scalp health product expert specialising in textured hair and darker skin tones.

Generate 6 personalised product recommendations for someone with these characteristics:
- Gender: ${isMale ? 'man' : 'woman'}
- Hair styles: ${styles}
- Main concerns: ${concerns}
- Chemical processing: ${chemical}
- Location: Kenya (consider availability and currency KSh)

Return ONLY a JSON array, no other text, no markdown:
[
  {
    "name": "Product name (be specific, e.g. 'Briogeo Scalp Revival Charcoal Shampoo')",
    "reason": "One sentence why this suits their profile",
    "searchQuery": "exact search query to find this on Google Shopping (e.g. 'Briogeo Scalp Revival Charcoal Shampoo Kenya')",
    "category": "one of: Shampoo | Conditioner | Scalp Treatment | Styling | Oil | Supplement"
  }
]

Focus on products that:
1. Are available or shippable to Kenya
2. Work well for type 3–4 textured hair
3. Address their specific concerns (${concerns})
4. Are appropriate for their processing level (${chemical})`
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.find((b: any) => b.type === 'text')?.text || '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return [];
  } catch (err) {
    console.error('[MyRoutine] Product recs fetch failed:', err);
    return [];
  }
};

// ─── GOOGLE SHOPPING LINK ─────────────────────────────────────────────────────
const openGoogleShopping = (query: string) => {
  const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
  window.open(url, '_blank', 'noopener noreferrer');
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

// Section header
const SectionHeader = ({ icon: Icon, title, color }: { icon: any; title: string; color: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
    <div style={{ width: 32, height: 32, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={15} color={C.gold} strokeWidth={1.8} />
    </div>
    <h2 style={{ fontFamily: dm, fontSize: 14, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '0.02em' }}>{title}</h2>
  </div>
);

// Routine step card
const StepCard = ({ step }: { step: RoutineStep }) => (
  <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: '14px 16px', marginBottom: 8, fontFamily: dm }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
          <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, margin: 0 }}>{step.step}</p>
        </div>
        <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: 0, lineHeight: 1.65, paddingLeft: 13 }}>{step.detail}</p>
        {step.frequency && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, marginLeft: 13, background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 100, padding: '2px 10px' }}>
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 600, color: C.gold }}>{step.frequency}</span>
          </div>
        )}
      </div>
      {step.duration && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, background: C.mid, borderRadius: 100, padding: '3px 10px' }}>
          <Clock size={10} color={C.sub} strokeWidth={2} />
          <span style={{ fontFamily: dm, fontSize: 10, color: C.sub }}>{step.duration}</span>
        </div>
      )}
    </div>
  </div>
);

// Product card with Google Shopping link
const ProductCard = ({ product, index }: { product: ProductRec; index: number }) => {
  const catColors: Record<string, string> = {
    'Shampoo': 'rgba(74,124,111,0.15)',
    'Conditioner': 'rgba(74,124,111,0.10)',
    'Scalp Treatment': 'rgba(212,168,102,0.12)',
    'Styling': 'rgba(184,92,92,0.10)',
    'Oil': 'rgba(212,168,102,0.10)',
    'Supplement': 'rgba(90,154,80,0.10)',
  };
  const catTextColors: Record<string, string> = {
    'Shampoo': '#4A7C6F', 'Conditioner': '#4A7C6F', 'Scalp Treatment': C.goldDeep,
    'Styling': '#B05040', 'Oil': C.goldDeep, 'Supplement': C.green,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '16px', marginBottom: 10, fontFamily: dm, position: 'relative', overflow: 'hidden' }}
    >
      {/* Category badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'inline-flex', marginBottom: 6, background: catColors[product.category] || C.gold10, borderRadius: 100, padding: '2px 10px' }}>
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: catTextColors[product.category] || C.gold, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{product.category}</span>
          </div>
          <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, margin: 0, lineHeight: 1.3 }}>{product.name}</p>
        </div>
      </div>

      <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: '0 0 14px', lineHeight: 1.6 }}>{product.reason}</p>

      {/* Google Shopping button */}
      <button
        onClick={() => openGoogleShopping(product.searchQuery)}
        style={{
          width: '100%', height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, #2B1F14 0%, #1C1C1C 100%)`,
          border: `1px solid ${C.goldBorder}`,
          color: C.gold, fontFamily: dm, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          position: 'relative', overflow: 'hidden',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, rgba(212,168,102,0.35), transparent)` }} />
        <ShoppingBag size={13} color={C.gold} strokeWidth={2} />
        Find on Google Shopping
        <ExternalLink size={11} color={C.sub} strokeWidth={2} />
      </button>
    </motion.div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const MyRoutine = () => {
  const navigate       = useNavigate();
  const { onboardingData } = useApp();
  const [routine, setRoutine]         = useState<Routine | null>(null);
  const [loading, setLoading]         = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const loadRoutine = async () => {
    setLoading(true);
    setLoadingProducts(true);

    // Generate routine immediately (local)
    const base = generateMockRoutine(onboardingData);

    setTimeout(async () => {
      // Fetch Claude product recs in parallel
      const products = await fetchProductRecs(onboardingData);
      setRoutine({ ...base, products });
      setLoading(false);
      setLoadingProducts(false);
    }, 1200);
  };

  useEffect(() => { loadRoutine(); }, []);

  const toggleSection = (key: string) =>
    setExpandedSection(s => s === key ? null : key);

  const toggleProduct = (name: string) =>
    setSelectedProducts(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);

  const sections = routine ? [
    {
      key: 'wash',
      icon: Droplets,
      title: 'Wash Day',
      items: routine.wash_day,
      type: 'steps' as const,
    },
    {
      key: 'midcycle',
      icon: Repeat,
      title: 'Between Washes',
      items: routine.mid_cycle,
      type: 'steps' as const,
    },
    {
      key: 'daily',
      icon: Sun,
      title: 'Daily Habits',
      items: routine.daily,
      type: 'steps' as const,
    },
    {
      key: 'nutrition',
      icon: Utensils,
      title: 'Nutrition',
      items: routine.weekly_nutrition,
      type: 'bullets' as const,
    },
    {
      key: 'avoid',
      icon: AlertTriangle,
      title: 'Avoid',
      items: routine.avoid,
      type: 'avoid' as const,
    },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 100, fontFamily: dm }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600&display=swap'); * { box-sizing: border-box; }`}</style>

      {/* ── HERO ── */}
      <div style={{
        background: `radial-gradient(ellipse 160% 120% at 50% -10%, rgba(212,168,102,0.10) 0%, transparent 55%), linear-gradient(180deg, #16120D 0%, #0A0908 100%)`,
        padding: '52px 20px 32px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,102,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.2, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")` }} />

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, position: 'relative' }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={16} color={C.sub} strokeWidth={1.8} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: 'rgba(212,168,102,0.85)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>FolliSense</span>
          </div>
          <button
            onClick={loadRoutine}
            disabled={loading}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
            title="Regenerate routine"
          >
            <RefreshCw size={14} color={C.sub} strokeWidth={1.8} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        <div style={{ position: 'relative' }}>
          <h1 style={{ fontFamily: playfair, fontSize: 26, fontWeight: 500, color: C.ink, margin: '0 0 8px', lineHeight: 1.2 }}>My Routine</h1>
          {routine && !loading && (
            <p style={{ fontFamily: dm, fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.6 }}>{routine.summary}</p>
          )}
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(212,168,102,0.25), transparent)`, marginTop: 24 }} />
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '20px 20px 0' }}>

        {/* Loading state */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.gold10, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                <Sparkles size={22} color={C.gold} strokeWidth={1.5} />
              </motion.div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: dm, fontSize: 14, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>Building your routine…</p>
              <p style={{ fontFamily: dm, fontSize: 12, color: C.sub, margin: 0 }}>Personalising based on your profile</p>
            </div>
          </motion.div>
        )}

        {/* Routine content */}
        {!loading && routine && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

            {/* Collapsible sections */}
            {sections.map(section => (
              <div key={section.key} style={{ marginBottom: 10 }}>
                <button
                  onClick={() => toggleSection(section.key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: expandedSection === section.key ? '16px 16px 0 0' : 16,
                    padding: '14px 16px', cursor: 'pointer', transition: 'border-radius 0.2s', fontFamily: dm,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: C.gold10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <section.icon size={14} color={C.gold} strokeWidth={1.8} />
                    </div>
                    <span style={{ fontFamily: dm, fontSize: 14, fontWeight: 600, color: C.ink }}>{section.title}</span>
                    <div style={{ background: C.gold10, borderRadius: 100, padding: '1px 8px' }}>
                      <span style={{ fontFamily: dm, fontSize: 10, color: C.gold, fontWeight: 600 }}>{section.items.length}</span>
                    </div>
                  </div>
                  {expandedSection === section.key
                    ? <ChevronUp size={16} color={C.sub} strokeWidth={1.8} />
                    : <ChevronDown size={16} color={C.sub} strokeWidth={1.8} />
                  }
                </button>

                <AnimatePresence>
                  {expandedSection === section.key && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden', background: C.surface, border: `1px solid ${C.cardBorder}`, borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '12px 12px 4px' }}
                    >
                      {section.type === 'steps' && (section.items as RoutineStep[]).map((step, i) => (
                        <StepCard key={i} step={step} />
                      ))}
                      {section.type === 'bullets' && (section.items as { tip: string }[]).map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12, padding: '0 4px' }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0, marginTop: 6 }} />
                          <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: 0, lineHeight: 1.65 }}>{item.tip}</p>
                        </div>
                      ))}
                      {section.type === 'avoid' && (section.items as { item: string }[]).map((entry, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12, padding: '0 4px' }}>
                          <span style={{ fontFamily: dm, fontSize: 13, color: C.red, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>✕</span>
                          <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: 0, lineHeight: 1.65 }}>{entry.item}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* Clinical notes */}
            {routine.notes && (
              <div style={{ background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Stethoscope size={15} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: 0, lineHeight: 1.65 }}>{routine.notes}</p>
              </div>
            )}

            {/* ── PRODUCT RECOMMENDATIONS ── */}
            <div style={{ marginTop: 24, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                    Recommended for you
                  </p>
                  <h3 style={{ fontFamily: playfair, fontSize: 18, fontWeight: 500, color: C.ink, margin: 0 }}>Products</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 100, padding: '4px 12px' }}>
                  <Sparkles size={11} color={C.gold} strokeWidth={1.8} />
                  <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.gold }}>AI picks</span>
                </div>
              </div>

              {loadingProducts ? (
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '24px', textAlign: 'center' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 24, height: 24, border: `2px solid ${C.cardBorder}`, borderTopColor: C.gold, borderRadius: '50%', margin: '0 auto 10px' }} />
                  <p style={{ fontFamily: dm, fontSize: 12, color: C.sub, margin: 0 }}>Finding products for your profile…</p>
                </div>
              ) : routine.products.length > 0 ? (
                <>
                  {/* My product list toggle */}
                  {selectedProducts.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      style={{ background: C.green10, border: `1px solid rgba(90,154,80,0.25)`, borderRadius: 14, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Check size={14} color={C.green} strokeWidth={2.5} />
                      <p style={{ fontFamily: dm, fontSize: 12, color: C.green, margin: 0, fontWeight: 600 }}>
                        {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} saved to your list
                      </p>
                    </motion.div>
                  )}

                  {routine.products.map((product, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      {/* Save toggle */}
                      <button
                        onClick={() => toggleProduct(product.name)}
                        style={{
                          position: 'absolute', top: 14, right: 14, zIndex: 2,
                          width: 28, height: 28, borderRadius: '50%',
                          background: selectedProducts.includes(product.name) ? C.green10 : 'rgba(255,255,255,0.06)',
                          border: `1.5px solid ${selectedProducts.includes(product.name) ? 'rgba(90,154,80,0.4)' : C.cardBorder}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        title={selectedProducts.includes(product.name) ? 'Remove from list' : 'Save to my list'}
                      >
                        <Check size={12} color={selectedProducts.includes(product.name) ? C.green : C.sub} strokeWidth={2.5} />
                      </button>
                      <ProductCard product={product} index={i} />
                    </div>
                  ))}

                  <p style={{ fontFamily: dm, fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
                    Tap ✓ to save products to your list · Shopping links open Google Shopping
                  </p>
                </>
              ) : (
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontFamily: dm, fontSize: 13, color: C.sub, margin: 0 }}>Could not load product recommendations right now.</p>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MyRoutine;