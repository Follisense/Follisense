import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X, Flame, Microscope, ChevronRight, Eye, AlertCircle, CalendarDays, Lightbulb } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useGeneratedProducts, GeneratedProduct } from '@/data/useGeneratedProducts';

const serviceOptions = [
  'Wash', 'Treatment', 'Style installation', 'Style removal/takedown',
  'Trim', 'Colour', 'Lineup or shape-up', 'Retwist (locs)',
  'Barber fade or cut', 'Scalp treatment', 'Other',
];

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

// How many check-ins we encourage per month,the hero progress bar fills
// against this instead of the full style duration (less overwhelming).
const MONTHLY_CHECKIN_GOAL = 4;

const C = {
  bg:         '#EDEFE7',
  ink:        '#23201A',
  gold:       '#4E7A63',
  goldDeep:   '#2E4A39',
  gold10:     'rgba(46,74,57,0.10)',
  mid:        '#E3E7DE',
  muted:      '#8A8F86',
  warm:       '#6B6F66',
  white:      '#FFFFFF',
  cardBg:     '#F3F5EF',
};

// ── Daily "did you know" facts,rotate by date, tap through to Know It ──
// Education only: no product or treatment claims, ever.
const scalpFacts = [
  'Type 4 hair is the most fragile texture, not the strongest,it needs the gentlest handling.',
  'Shrinkage can hide up to 75% of your real length. Shrinkage is health, not a problem.',
  'Your scalp renews its skin roughly every 28 days,about one style cycle.',
  'Traction alopecia is one of the most reversible types of hair loss when caught early.',
  'Hair grows about 1cm a month on average. Retention, not growth, is where length is won.',
  'Flakes from buildup and flakes from dandruff look similar but behave differently over time.',
  'Edges are the finest, most fragile hairs on your head,they take the most tension in styles.',
];

const parseCycleLengthToDays = (raw: string): number => {
  if (!raw) return 28;
  const n = raw.match(/\d+/g);
  if (!n) return 28;
  if (n.length >= 2) return Math.round(((parseInt(n[0]) + parseInt(n[1])) / 2) * 7);
  return parseInt(n[0]) * 7;
};

// ─── ICON TILE ────────────────────────────────────────────────
// Warm cream rounded square with a beautiful illustrated SVG scene
const IconTile = ({ icon, label, onClick, badge }: {
  icon: React.ReactNode; label: string; onClick: () => void; badge?: string;
}) => (
  <motion.button whileTap={{ scale: 0.89 }} onClick={onClick}
    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, position: 'relative', padding: 0 }}>
    {badge && (
      <div style={{ position: 'absolute', top: -5, right: -2, zIndex: 2, background: 'linear-gradient(135deg, #4E7A63, #2E4A39)', borderRadius: 100, padding: '2px 7px', fontFamily: dm, fontSize: 8, fontWeight: 700, color: '#fff', boxShadow: '0 2px 8px rgba(46,74,57,0.5)' }}>
        {badge}
      </div>
    )}
    <div style={{
      width: 66, height: 66, borderRadius: 22,
      background: 'linear-gradient(145deg, #FFFFFF 0%, #E4EADF 100%)',
      boxShadow: '0 4px 16px rgba(46,74,57,0.12), 0 1px 4px rgba(20,28,22,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(46,74,57,0.18)',
    }}>
      {icon}
    </div>
    <span style={{ fontFamily: dm, fontSize: 11, fontWeight: 500, color: '#2E4A39', textAlign: 'center', lineHeight: 1.2 }}>
      {label}
    </span>
  </motion.button>
);

// ─── ILLUSTRATED SVG ICONS,green palette ───────────────

const IconRoutine = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    {/* Calendar body */}
    <rect x="5" y="9" width="26" height="22" rx="5" fill="#DCE5D8"/>
    <rect x="5" y="9" width="26" height="22" rx="5" stroke="#4E7A63" strokeWidth="1.2"/>
    {/* Header strip */}
    <rect x="5" y="9" width="26" height="8" rx="5" fill="#4E7A63"/>
    <rect x="5" y="13" width="26" height="4" fill="#4E7A63"/>
    {/* Hooks */}
    <rect x="11" y="6" width="3" height="7" rx="1.5" fill="#2E4A39"/>
    <rect x="22" y="6" width="3" height="7" rx="1.5" fill="#2E4A39"/>
    {/* Dots */}
    <circle cx="11" cy="22" r="2" fill="#4E7A63"/>
    <circle cx="18" cy="22" r="2" fill="#4E7A63"/>
    <circle cx="25" cy="22" r="2" fill="#8FB29E" opacity="0.6"/>
    <circle cx="11" cy="28" r="2" fill="#8FB29E" opacity="0.6"/>
    <circle cx="18" cy="28" r="2" fill="#4E7A63"/>
  </svg>
);

const IconSalon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    {/* Scissors blades */}
    <circle cx="11" cy="13" r="4" fill="#8FB29E" stroke="#4E7A63" strokeWidth="1.2"/>
    <circle cx="11" cy="24" r="4" fill="#DCE5D8" stroke="#4E7A63" strokeWidth="1.2"/>
    {/* Scissors body */}
    <path d="M14 15 L26 26" stroke="#2E4A39" strokeWidth="2" strokeLinecap="round"/>
    <path d="M14 22 L26 11" stroke="#4E7A63" strokeWidth="2" strokeLinecap="round"/>
    {/* Holes */}
    <circle cx="11" cy="13" r="1.5" fill="#2E4A39"/>
    <circle cx="11" cy="24" r="1.5" fill="#2E4A39"/>
    {/* Sparkle */}
    <path d="M27 8 L28 10 L30 11 L28 12 L27 14 L26 12 L24 11 L26 10 Z" fill="#4E7A63" opacity="0.8"/>
  </svg>
);

const IconProducts = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    {/* Bottle body */}
    <rect x="13" y="15" width="10" height="16" rx="3" fill="#DCE5D8" stroke="#4E7A63" strokeWidth="1.2"/>
    {/* Bottle neck */}
    <rect x="15" y="10" width="6" height="6" rx="2" fill="#8FB29E" stroke="#4E7A63" strokeWidth="1.2"/>
    {/* Cap */}
    <rect x="14.5" y="7" width="7" height="4" rx="2" fill="#4E7A63"/>
    {/* Label */}
    <rect x="15" y="18" width="6" height="8" rx="1.5" fill="white" opacity="0.5"/>
    <rect x="16" y="20" width="4" height="1" rx="0.5" fill="#4E7A63"/>
    <rect x="16" y="22" width="3" height="1" rx="0.5" fill="#8FB29E"/>
    {/* Drops */}
    <ellipse cx="27" cy="14" rx="2" ry="3" fill="#4E7A63" opacity="0.6"/>
    <ellipse cx="9" cy="20" rx="1.5" ry="2" fill="#8FB29E" opacity="0.5"/>
  </svg>
);

const IconScalpHealth = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    {/* Head silhouette */}
    <ellipse cx="18" cy="19" rx="11" ry="12" fill="#DCE5D8" stroke="#4E7A63" strokeWidth="1.2"/>
    {/* Hair waves */}
    <path d="M7 16 C7 10 10 6 18 6 C26 6 29 10 29 16" fill="#4E7A63" stroke="#2E4A39" strokeWidth="1"/>
    {/* Face features */}
    <circle cx="14.5" cy="20" r="1.2" fill="#2E4A39"/>
    <circle cx="21.5" cy="20" r="1.2" fill="#2E4A39"/>
    <path d="M15 24 Q18 26.5 21 24" stroke="#2E4A39" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    {/* Health pulse on scalp */}
    <path d="M11 13 L13 13 L14.5 10 L16 16 L17.5 13 L19 13" stroke="#4E7A63" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSpotIt = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    {/* Lens */}
    <circle cx="16" cy="16" r="9" fill="#DCE5D8" stroke="#4E7A63" strokeWidth="1.2"/>
    <circle cx="16" cy="16" r="6" fill="#FFFFFF" opacity="0.6"/>
    {/* Detected spot */}
    <circle cx="16" cy="16" r="3" fill="#4E7A63"/>
    <circle cx="16" cy="16" r="3" stroke="#2E4A39" strokeWidth="0.8"/>
    {/* Crosshair ticks */}
    <path d="M16 9.5 L16 11.5 M16 20.5 L16 22.5 M9.5 16 L11.5 16 M20.5 16 L22.5 16" stroke="#4E7A63" strokeWidth="1" strokeLinecap="round"/>
    {/* Handle */}
    <path d="M23 23 L29 29" stroke="#2E4A39" strokeWidth="2.4" strokeLinecap="round"/>
    {/* Sparkle */}
    <path d="M27 8 L27.8 9.6 L29.5 10.4 L27.8 11.2 L27 12.8 L26.2 11.2 L24.5 10.4 L26.2 9.6 Z" fill="#4E7A63" opacity="0.7"/>
  </svg>
);

const IconResults = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    {/* Card */}
    <rect x="6" y="6" width="24" height="24" rx="5" fill="#DCE5D8" stroke="#4E7A63" strokeWidth="1.2"/>
    {/* Bars */}
    <rect x="11" y="18" width="3.5" height="7" rx="1.5" fill="#8FB29E"/>
    <rect x="16.25" y="14" width="3.5" height="11" rx="1.5" fill="#4E7A63"/>
    <rect x="21.5" y="20" width="3.5" height="5" rx="1.5" fill="#4E7A63"/>
    {/* Trend dot + line */}
    <circle cx="13" cy="11" r="1.4" fill="#2E4A39"/>
    <path d="M16 11 L25 11" stroke="#4E7A63" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

// Bookmark, matching the save icon used on the product cards and the
// Wishlist page header. Deliberately NOT a basket,there is no cart and
// no checkout, purchases happen on the retailer's site.
const IconWishlist = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    {/* Bookmark body */}
    <path d="M11 6 L25 6 Q27 6 27 8.5 L27 29.5 L18 23.5 L9 29.5 L9 8.5 Q9 6 11 6 Z" fill="#DCE5D8" stroke="#4E7A63" strokeWidth="1.2" strokeLinejoin="round"/>
    {/* Top band */}
    <path d="M11 6 L25 6 Q27 6 27 8.5 L27 11 L9 11 L9 8.5 Q9 6 11 6 Z" fill="#4E7A63"/>
    {/* Saved heart */}
    <path d="M18 21 C18 21 14 18.6 14 15.9 C14 14.4 15.2 13.4 16.4 13.4 C17.2 13.4 17.8 13.9 18 14.4 C18.2 13.9 18.8 13.4 19.6 13.4 C20.8 13.4 22 14.4 22 15.9 C22 18.6 18 21 18 21 Z" fill="#4E7A63"/>
    {/* Sparkle */}
    <path d="M29 9 L29.8 10.6 L31.5 11.4 L29.8 12.2 L29 13.8 L28.2 12.2 L26.5 11.4 L28.2 10.6 Z" fill="#4E7A63" opacity="0.7"/>
  </svg>
);

// IconCart is unused. Kept only in case a real checkout ever ships,which
// would mean leaving the affiliate model, since commission requires the
// purchase to complete on the retailer's own site.
const IconCart = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    {/* Basket body */}
    <path d="M9 14 L28 14 L26 26 Q25.7 27.5 24 27.5 L13 27.5 Q11.3 27.5 11 26 Z" fill="#DCE5D8" stroke="#4E7A63" strokeWidth="1.2" strokeLinejoin="round"/>
    {/* Basket vertical ribs */}
    <path d="M14.5 14 L15.3 26.5" stroke="#4E7A63" strokeWidth="0.9" opacity="0.55"/>
    <path d="M18.5 14 L18.5 26.5" stroke="#4E7A63" strokeWidth="0.9" opacity="0.55"/>
    <path d="M22.5 14 L21.7 26.5" stroke="#4E7A63" strokeWidth="0.9" opacity="0.55"/>
    {/* Basket cross line */}
    <path d="M10.2 18.5 L26.8 18.5" stroke="#4E7A63" strokeWidth="0.9" opacity="0.55"/>
    {/* Handle */}
    <path d="M12.5 14 L15.5 7.5 L21.5 7.5 L24.5 14" fill="none" stroke="#2E4A39" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Wheels */}
    <circle cx="15" cy="30.5" r="1.8" fill="#4E7A63"/>
    <circle cx="22" cy="30.5" r="1.8" fill="#4E7A63"/>
    {/* Sparkle */}
    <path d="M29 9 L29.8 10.6 L31.5 11.4 L29.8 12.2 L29 13.8 L28.2 12.2 L26.5 11.4 L28.2 10.6 Z" fill="#4E7A63" opacity="0.7"/>
  </svg>
);

// ─── PRODUCT CARD SKELETON ─────────────────────────────────────────────────────
const ProductCardSkeleton = () => (
  <div style={{ flexShrink: 0, width: '46vw', maxWidth: 200, background: C.cardBg, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)' }}>
    <div style={{ height: 200, background: `linear-gradient(90deg, #E9EEE4 25%, #DDE4D8 50%, #E9EEE4 75%)`, backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
    <div style={{ padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ height: 13, borderRadius: 4, background: C.mid, width: '90%' }} />
      <div style={{ height: 10, borderRadius: 4, background: C.mid, width: '55%' }} />
    </div>
  </div>
);

// ─── PRODUCT CARD,unified surface, image + text on the SAME background, no badge ───
const ProductCard = ({ product, index }: { product: GeneratedProduct; index: number }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.35), duration: 0.28 }}
      onClick={() => window.open(product.jumiaUrl, '_blank', 'noopener noreferrer')}
      style={{
        flexShrink: 0, width: '46vw', maxWidth: 200, cursor: 'pointer',
        background: C.cardBg,
        borderRadius: 18,
        border: '1px solid rgba(0,0,0,0.04)',
        boxShadow: '0 1px 3px rgba(20,28,22,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Image area,same bg as the card, so there's no color seam */}
      <div style={{
        width: '100%', height: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img
          src={imgError ? 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop' : product.image}
          alt={product.name}
          style={{ width: '85%', height: '85%', objectFit: 'contain' }}
          onError={() => setImgError(true)}
        />
      </div>

      {/* Text,sits on the SAME background as the image */}
      <div style={{ padding: '2px 14px 16px' }}>
        <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 3px', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.name}
        </p>
        <p style={{ fontFamily: dm, fontSize: 12, color: C.muted, margin: 0 }}>
          {product.brand}
        </p>
      </div>
    </motion.div>
  );
};

// ─── HERO STATE TYPES ──────────────────────────────────────────────────────────
type HeroState = 'loading' | 'attention' | 'takedown' | 'routine';

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { onboardingData, setOnboardingData, addSalonVisit, checkInCount, setCheckInCount, userName, research, setResearch } = useApp();

  const { products, loading: productsLoading } = useGeneratedProducts(onboardingData, 8);

  const [showSalonForm, setShowSalonForm]               = useState(false);
  const [showSalonVisitPicker, setShowSalonVisitPicker] = useState(false);
  const [visitDate, setVisitDate]                       = useState<Date>(new Date());
  const [services, setServices]                         = useState<string[]>([]);
  const [stylistName, setStylistName]                   = useState('');
  const [visitNotes, setVisitNotes]                     = useState('');
  const [showResearchPrompt, setShowResearchPrompt]     = useState(false);
  const [styleStartDate, setStyleStartDate]             = useState<string | null>(null);
  const [styleDueDate, setStyleDueDate]                 = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded]               = useState(false);
  const [latestRiskLevel, setLatestRiskLevel]           = useState<string | null>(null);
  const [monthlyCheckIns, setMonthlyCheckIns]           = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setProfileLoaded(true); return; }
        const uid = session.user.id;
        const { data: p1 } = await supabase.from('profiles').select('current_style_start_date').eq('id', uid).maybeSingle();
        if (p1?.current_style_start_date) {
          setStyleStartDate(p1.current_style_start_date);
          const { data: cp } = await supabase.from('consumer_profiles').select('style_duration, style_due_date').eq('user_id', uid).maybeSingle();
          if (cp?.style_duration) setOnboardingData({ ...onboardingData, cycleLength: cp.style_duration });
          if (cp?.style_due_date) setStyleDueDate(cp.style_due_date);
          return;
        }
        const { data: p2 } = await supabase.from('consumer_profiles').select('current_style_start_date, style_duration, style_due_date').eq('user_id', uid).maybeSingle();
        if (p2?.current_style_start_date) {
          setStyleStartDate(p2.current_style_start_date);
          if (p2.style_duration) setOnboardingData({ ...onboardingData, cycleLength: p2.style_duration });
          if (p2.style_due_date) setStyleDueDate(p2.style_due_date);
        }
      } catch (e) { console.error(e); } finally { setProfileLoaded(true); }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // COUNT RULES: the streak pill and hero progress bar count MID-CYCLE
        // symptom check-ins only. Excluded on purpose:
        //   1. is_baseline = true  → the onboarding baseline is setup, not a
        //      check-in. A first-time user starts at 0, not 1.
        //   2. type visual/progress_photo → photo-only entries carry no
        //      symptom data (same rule as the History page scoring).
        const { count } = await supabase
          .from('checkins')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('is_baseline', false)
          .not('type', 'in', '(visual,progress_photo)');
        if (count !== null) setCheckInCount(count);

        // Check-ins completed this calendar month,drives the hero progress bar
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count: monthCount } = await supabase
          .from('checkins')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('is_baseline', false)
          .not('type', 'in', '(visual,progress_photo)')
          .gte('created_at', monthStart);
        if (monthCount !== null) setMonthlyCheckIns(monthCount);

        const { data: latest } = await supabase
          .from('checkins')
          .select('risk_level')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setLatestRiskLevel(latest?.risk_level ?? null);
      } catch {}
    };
    load();
  }, [location]);

  useEffect(() => { localStorage.setItem('follisense-last-home-visit', String(Date.now())); }, []);

  useEffect(() => {
    if (checkInCount >= 3 && !research.consented && !research.dismissed) {
      const t = setTimeout(() => setShowResearchPrompt(true), 1500);
      return () => clearTimeout(t);
    }
  }, [checkInCount, research.consented, research.dismissed]);

  const isMale       = onboardingData.gender === 'man';
  const currentStyle = onboardingData.protectiveStyles?.[0] || 'your style';
  const currentDay   = styleStartDate ? Math.max(0, Math.floor((Date.now() - new Date(styleStartDate).getTime()) / 86400000)) : 0;
  const totalDays    = parseCycleLengthToDays(onboardingData.cycleLength);
  const hour         = new Date().getHours();
  const greeting     = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // ── Today's fact,same fact all day for everyone, rotates by date ──
  const todaysFact = scalpFacts[new Date().getDate() % scalpFacts.length];

  // ── Monthly check-in progress,fills the hero bar (4 per month by default) ──
  const monthlyProgress = profileLoaded
    ? Math.min((monthlyCheckIns / MONTHLY_CHECKIN_GOAL) * 100, 100)
    : 0;

  // ── Takedown timing, mirrors RoutineTracker's logic ──
  const styleStartMs  = styleStartDate ? new Date(styleStartDate).getTime() : null;
  const dueDate        = styleDueDate
    ? new Date(styleDueDate)
    : styleStartMs ? new Date(styleStartMs + totalDays * 86400000) : null;
  const daysUntilDue    = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : null;

  // ── Which hero state wins ──
  // The banner is reserved for check-in encouragement: new users with zero
  // check-ins see the standard routine banner (0 of 4 this month) rather than
  // a special onboarding card.
  const heroState: HeroState = !profileLoaded
    ? 'loading'
    : latestRiskLevel === 'red'
    ? 'attention'
    : (daysUntilDue !== null && daysUntilDue <= 5)
    ? 'takedown'
    : 'routine';

  // ── Short, punchy routine tip,max ~4 words, no punctuation dashes ──
  const getRoutineTip = () => {
    if (totalDays <= 0) return 'Keep scalp clean';
    const ratio = currentDay / totalDays;
    if (currentDay <= 1) return 'Keep scalp clean';
    if (ratio < 0.3) return 'Moisturize and protect';
    if (ratio < 0.7) return 'Watch for buildup';
    return 'Ease out buildup';
  };

  // ── Small contextual note under the tip,phase-aware, so it feels smart ──
  const getRoutineNote = () => {
    if (totalDays <= 0 || currentDay <= 1) return 'A fresh install is when your scalp is easiest to read';
    const ratio = currentDay / totalDays;
    if (ratio < 0.3) return 'Moisture in these early days prevents dryness later in the style';
    if (ratio < 0.7) return 'Mid-style is when buildup quietly starts, a quick look keeps you ahead';
    return 'Tension and buildup peak late in a style, keep your check-ins close';
  };

  // ── Weekly routine nudge,shows on the first two days of each style-week,
  //    so roughly once a week the green banner also offers the routine ──
  const showRoutineNudge = currentDay > 0 && currentDay % 7 <= 1;

  const toggleService   = (s: string) => setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
 const handleSaveSalon = async () => {
    const visit = { id: `sv-${Date.now()}`, date: format(visitDate, 'MMM d'), services, stylistName: stylistName || undefined, notes: visitNotes || undefined };
    addSalonVisit(visit);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // No date column on salon_visits (created_at defaults to now), so a
        // backdated visit keeps its real date inside notes.
        const isToday   = format(visitDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        const dateNote  = isToday ? '' : `Visit date: ${format(visitDate, 'PPP')}`;
        const fullNotes = [dateNote, visitNotes].filter(Boolean).join(' · ') || null;

        const { error } = await supabase.from('salon_visits').insert({
          user_id:      session.user.id,
          visit_type:   'self_logged',
          stylist_name: stylistName || null,
          observations: services,
          notes:        fullNotes,
        });
        if (error) console.error('[Salon] insert failed:', error);
      }
    } catch (e) { console.error('[Salon] save failed:', e); }
    setShowSalonForm(false); setServices([]); setStylistName(''); setVisitNotes(''); setVisitDate(new Date());
  };
  const handleResearchDismiss = () => { setShowResearchPrompt(false); setResearch({ ...research, dismissed: true }); };
  const handleResearchOptIn   = () => { setShowResearchPrompt(false); setResearch({ ...research, consented: true, consentDate: new Date().toISOString() }); };

  const iconTiles = [
    { icon: <IconRoutine />,     label: 'Routine',      onClick: () => navigate('/routine-tracker') },
    { icon: <IconSalon />,       label: 'Salon Visit',  onClick: () => setShowSalonVisitPicker(true) },
    { icon: <IconProducts />,    label: 'Products',     onClick: () => navigate('/shop') },
    { icon: <IconScalpHealth />, label: 'Scalp Health', onClick: () => navigate('/history?tab=scalp') },
    { icon: <IconSpotIt />,      label: 'Know It',      onClick: () => navigate('/spot-it') },
    { icon: <IconResults />,     label: 'Results',      onClick: () => navigate('/results') },
    { icon: <IconWishlist />,    label: 'Wishlist',     onClick: () => navigate('/wishlist') },
  ];

  // ── Hero content per state ──
  // Every check-in entry point goes STRAIGHT to /scalp-check,no chooser.
  const renderHero = () => {
    if (heroState === 'loading') {
      return (
        <div style={{ width: '100%', background: 'linear-gradient(135deg, #23392C 0%, #2E4A39 50%, #1A2820 100%)', borderRadius: 22, padding: '18px 20px', marginBottom: 28 }}>
          <p style={{ fontFamily: dm, fontSize: 12, color: 'rgba(245,247,242,0.6)', margin: 0 }}>Loading routine</p>
        </div>
      );
    }

    if (heroState === 'attention') {
      return (
        <motion.button onClick={() => navigate('/results')}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          whileTap={{ scale: 0.98 }}
          style={{ width: '100%', background: 'linear-gradient(135deg, #7A4E4E 0%, #4A2E2E 100%)', borderRadius: 22, padding: '18px 20px', marginBottom: 28, border: 'none', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden', boxShadow: '0 6px 24px rgba(74,46,46,0.22)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(249,234,234,0.35), transparent)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AlertCircle size={13} color="#F9EAEA" strokeWidth={1.8} />
              <p style={{ fontFamily: dm, fontSize: 11, color: 'rgba(249,234,234,0.75)', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Needs attention</p>
            </div>
            <p style={{ fontFamily: playfair, fontSize: 19, fontWeight: 500, color: '#F9EAEA', margin: '0 0 6px', lineHeight: 1.25 }}>
              Let's look closer
            </p>
            <p style={{ fontFamily: dm, fontSize: 10, color: 'rgba(249,234,234,0.6)', margin: 0, lineHeight: 1.55 }}>
              Your latest check-in flagged something worth a second look, your summary explains what and why
            </p>
          </div>
          <ChevronRight size={16} color="#F9EAEA" strokeWidth={1.8} style={{ flexShrink: 0 }} />
        </motion.button>
      );
    }

    if (heroState === 'takedown') {
      const dueLabel = daysUntilDue !== null && daysUntilDue <= 0 ? 'Due now' : `Week ${Math.max(1, Math.ceil(currentDay / 7))}`;
      return (
        <>
          <motion.button onClick={() => navigate('/scalp-check')}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', background: 'linear-gradient(135deg, #B8724F 0%, #8A5238 100%)', borderRadius: 22, padding: '18px 20px', marginBottom: 10, border: 'none', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden', boxShadow: '0 6px 24px rgba(138,82,56,0.22)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(252,238,229,0.35), transparent)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Eye size={13} color="#FCEEE5" strokeWidth={1.8} />
                <p style={{ fontFamily: dm, fontSize: 11, color: 'rgba(252,238,229,0.8)', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Takedown time · {dueLabel}</p>
              </div>
              <p style={{ fontFamily: playfair, fontSize: 19, fontWeight: 500, color: '#FCEEE5', margin: '0 0 6px', lineHeight: 1.25 }}>
                Time for takedown
              </p>
              <p style={{ fontFamily: dm, fontSize: 10, color: 'rgba(252,238,229,0.7)', margin: 0, lineHeight: 1.55 }}>
                Takedown day is the clearest view your scalp gets, the perfect moment to capture it
              </p>
            </div>
            <ChevronRight size={16} color="#FCEEE5" strokeWidth={1.8} style={{ flexShrink: 0 }} />
          </motion.button>

          <motion.button onClick={() => navigate('/routine-tracker')}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', background: 'rgba(138,82,56,0.10)', border: '1px solid rgba(138,82,56,0.25)', borderRadius: 14, padding: '10px 16px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <CalendarDays size={12} color="#8A5238" strokeWidth={1.8} />
            <span style={{ fontFamily: dm, fontSize: 11, fontWeight: 600, color: '#8A5238', flex: 1, textAlign: 'left' }}>
              View routine · update your takedown or set a new style
            </span>
            <ChevronRight size={13} color="#8A5238" strokeWidth={1.8} />
          </motion.button>
        </>
      );
    }

    // heroState === 'routine',default, everything on track.
    // The whole cycle banner is ONE button → straight into the check-in.
    return (
      <>
        <motion.button onClick={() => navigate('/scalp-check')}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          whileTap={{ scale: 0.98 }}
          style={{ width: '100%', background: 'linear-gradient(135deg, #23392C 0%, #2E4A39 50%, #1A2820 100%)', borderRadius: 22, padding: '18px 20px', marginBottom: showRoutineNudge ? 10 : 28, border: 'none', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden', boxShadow: '0 6px 24px rgba(26,40,32,0.18)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(143,178,158,0.4), transparent)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: dm, fontSize: 10, color: 'rgba(245,247,242,0.55)', margin: '0 0 4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Day {currentDay} of {totalDays} · {currentStyle}
            </p>
            <p style={{ fontFamily: playfair, fontSize: 19, fontWeight: 500, color: '#F5F7F2', margin: '0 0 5px', lineHeight: 1.25 }}>
              {getRoutineTip()}
            </p>
            <p style={{ fontFamily: dm, fontSize: 10, color: 'rgba(245,247,242,0.55)', margin: '0 0 12px', lineHeight: 1.55 }}>
              {getRoutineNote()}
            </p>

            {/* Progress bar,fills with this month's check-ins, not style days */}
            <div style={{ height: 6, borderRadius: 100, background: 'rgba(255,255,255,0.14)', overflow: 'hidden', marginBottom: 7 }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${monthlyProgress}%` }} transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
                style={{ height: '100%', borderRadius: 100, background: C.gold }} />
            </div>
            <p style={{ fontFamily: dm, fontSize: 10, color: 'rgba(245,247,242,0.6)', margin: 0 }}>
              {monthlyCheckIns} of {MONTHLY_CHECKIN_GOAL} check-ins this month · tap for a quick check-in
            </p>
          </div>
          <ChevronRight size={16} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
        </motion.button>

        {/* Weekly routine nudge,its own pill below the banner, start of each style-week */}
        {showRoutineNudge && (
          <motion.button onClick={() => navigate('/routine-tracker')}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', background: 'rgba(46,74,57,0.08)', border: '1px solid rgba(46,74,57,0.15)', borderRadius: 14, padding: '10px 16px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <CalendarDays size={12} color={C.goldDeep} strokeWidth={1.8} />
            <span style={{ fontFamily: dm, fontSize: 11, fontWeight: 500, color: C.goldDeep, flex: 1, textAlign: 'left' }}>
              New week, new phase · view your routine
            </span>
            <ChevronRight size={13} color={C.goldDeep} strokeWidth={1.8} />
          </motion.button>
        )}
      </>
    );
  };

  return (
    <div style={{ fontFamily: dm, background: C.bg, minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
        input::placeholder, textarea::placeholder { color: #A8ADA3; font-family: 'DM Sans', sans-serif; }
        .product-scroll::-webkit-scrollbar { display: none; }
        .product-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes shimmer { 0%{background-position:400% 0} 100%{background-position:-400% 0} }
        @media (min-width: 768px) {
          .fs-home-inner { max-width: 760px; margin: 0 auto; }
          .fs-home-hero  { max-width: 760px; margin: 0 auto; }
          .fs-icon-grid  { grid-template-columns: repeat(7, 1fr) !important; }
        }
      `}</style>
      

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

        {/* ── Hero (light) ── */}
       <div className="fs-home-hero" style={{ background: C.bg, padding: '52px 20px 20px', position: 'relative', overflow: 'hidden' }}> 
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold }} />
                <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.goldDeep, letterSpacing: '0.14em', textTransform: 'uppercase' }}>FolliSense</span>
              </div>
              <h1 style={{ fontFamily: playfair, fontSize: 24, fontWeight: 500, color: C.ink, margin: '0 0 4px' }}>
                {greeting}{userName ? `, ${userName}` : ''}
              </h1>
              <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, fontWeight: 400, margin: 0 }}>
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <button onClick={() => navigate('/profile')} style={{ width: 38, height: 38, borderRadius: '50%', background: C.gold10, border: `1px solid rgba(46,74,57,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <User size={15} color={C.goldDeep} strokeWidth={1.8} />
            </button>
          </div>
        </div>
       <div className="fs-home-inner" style={{ padding: '0 20px 110px' }}>
        

          {/* ── Streak ── */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.ink, color: '#f5f5f5', borderRadius: 100, padding: '6px 14px', fontFamily: dm, fontSize: 12, fontWeight: 500, margin: '16px 0 20px' }}>
            <Flame size={12} color={C.gold} fill={C.gold} strokeWidth={0} />
            {checkInCount} check-in{checkInCount !== 1 ? 's' : ''} · keep it up
            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < checkInCount ? C.gold : 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>
          </motion.div>

          {/* ── Hero card,state-driven ── */}
          {renderHero()}

          {/* ── Icon grid ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ marginBottom: 32 }}>
           <div className="fs-icon-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: 20, columnGap: 4 }}>
              {iconTiles.map((tile, i) => (
                <motion.div key={tile.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.045 }}>
                  <IconTile {...tile} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Did you know,daily fact strip, links to Know It ── */}
          <motion.button onClick={() => navigate('/spot-it')}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', background: 'rgba(46,74,57,0.08)', border: '1px solid rgba(46,74,57,0.15)', borderRadius: 14, padding: '10px 16px', marginBottom: 28, display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <Lightbulb size={12} color={C.goldDeep} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontFamily: dm, fontSize: 11, fontWeight: 500, color: C.goldDeep, flex: 1, textAlign: 'left', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700 }}>Did you know?</span> {todaysFact}
            </span>
            <ChevronRight size={13} color={C.goldDeep} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
          </motion.button>

          {/* ── Recommended Products,horizontal scroll, matches reference ── */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>

            {/* Header row,"Recommended Products For You" + "View All" */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: dm, fontSize: 16, fontWeight: 700, color: C.ink }}>
                Recommended Products For You
              </span>
              <button onClick={() => navigate('/shop')}
                style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.goldDeep, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
                View All
              </button>
            </div>

            {/* Horizontal scroll,cards bleed to screen edge like the reference */}
            <div className="product-scroll"
              style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, marginLeft: -20, paddingLeft: 20, marginRight: -20, paddingRight: 20 }}>
              {productsLoading
                ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : products.slice(0, 6).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)
              }
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Research modal ── */}
      <AnimatePresence>
        {showResearchPrompt && (
          <Modal onClose={handleResearchDismiss}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: C.gold10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Microscope size={19} color={C.goldDeep} strokeWidth={1.6} />
              </div>
              <h3 style={{ fontFamily: playfair, fontSize: 17, color: C.ink, margin: 0, lineHeight: 1.2 }}>Help improve scalp health research</h3>
            </div>
            <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.6, marginBottom: 20 }}>
              You've completed {checkInCount} check-ins. Your anonymised data helps us understand scalp health for textured hair.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={handleResearchOptIn} style={primaryBtn}>Yes, opt me in</button>
              <button onClick={handleResearchDismiss} style={outlineBtn}>Not now</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Salon visit picker ── */}
      <AnimatePresence>
        {showSalonVisitPicker && (
          <Modal onClose={() => setShowSalonVisitPicker(false)} title="Salon Visit">
            <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, marginBottom: 20 }}>What would you like to do?</p>
            <ModalOption icon={<IconRoutine />} iconBg="#E4EADF" title="Log my own visit" desc="Record your salon or barber experience" onClick={() => { setShowSalonVisitPicker(false); setShowSalonForm(true); }} />
            <ModalOption icon={<IconScalpHealth />} iconBg={C.gold10} title="Stylist check-in" desc="Hand your phone to your stylist for photo capture" onClick={() => { setShowSalonVisitPicker(false); navigate('/salon-checkin'); }} />
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Salon form ── */}
      <AnimatePresence>
        {showSalonForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{ background: C.white, borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 430, maxHeight: '85vh', overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h3 style={{ fontFamily: playfair, fontSize: 18, color: C.ink, margin: 0 }}>{isMale ? 'Log a barber or salon visit' : 'Log a salon visit'}</h3>
                <button onClick={() => setShowSalonForm(false)} style={iconBtnStyle}><X size={19} color={C.muted} strokeWidth={1.8} /></button>
              </div>
              <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 500, color: C.ink, marginBottom: 8 }}>Date of visit</p>
              <Popover>
                <PopoverTrigger asChild><button style={formField}>{format(visitDate, 'PPP')}</button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="single" selected={visitDate} onSelect={d => d && setVisitDate(d)} initialFocus className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
              <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 500, color: C.ink, marginBottom: 8 }}>Services</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {serviceOptions.map(s => (
                  <button key={s} onClick={() => toggleService(s)} style={{ padding: '7px 14px', borderRadius: 100, fontFamily: dm, fontSize: 12, fontWeight: 500, border: services.includes(s) ? `1.5px solid ${C.gold}` : `1.5px solid ${C.mid}`, background: services.includes(s) ? C.gold10 : C.white, color: services.includes(s) ? C.goldDeep : C.warm, cursor: 'pointer' }}>{s}</button>
                ))}
              </div>
              <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 500, color: C.ink, marginBottom: 8 }}>Stylist name (optional)</p>
              <input type="text" value={stylistName} onChange={e => setStylistName(e.target.value)} placeholder="Who did your hair?" style={{ ...formField, marginBottom: 20 }} />
              <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 500, color: C.ink, marginBottom: 8 }}>Notes (optional)</p>
              <textarea value={visitNotes} onChange={e => setVisitNotes(e.target.value)} placeholder="Anything to remember?" rows={3} style={{ ...(formField as React.CSSProperties), height: 'auto', padding: '12px 16px', resize: 'none', marginBottom: 24 }} />
              <button onClick={handleSaveSalon} disabled={services.length === 0} style={{ ...primaryBtn, opacity: services.length === 0 ? 0.4 : 1, cursor: services.length === 0 ? 'not-allowed' : 'pointer' }}>Save visit</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const Modal = ({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title?: string }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
    <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
      style={{ background: '#fff', borderRadius: 28, padding: 24, maxWidth: 360, width: '100%', fontFamily: dm }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: playfair, fontSize: 18, color: '#23201A', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={iconBtnStyle}><X size={19} color="#8A8F86" strokeWidth={1.8} /></button>
        </div>
      )}
      {children}
    </motion.div>
  </motion.div>
);

const ModalOption = ({ icon, iconBg, title, desc, onClick }: { icon: React.ReactNode; iconBg: string; title: string; desc: string; onClick: () => void }) => (
  <motion.button onClick={onClick} whileTap={{ scale: 0.98 }}
    style={{ width: '100%', background: '#F4F6F1', border: '1.5px solid #E3E7DE', borderRadius: 16, padding: '14px 16px', marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', fontFamily: dm }}>
    <div style={{ width: 42, height: 42, borderRadius: 14, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: '#23201A', margin: '0 0 2px' }}>{title}</p>
      <p style={{ fontFamily: dm, fontSize: 11, color: '#8A8F86', margin: 0 }}>{desc}</p>
    </div>
    <ChevronRight size={14} color="#B8C0B2" strokeWidth={1.8} />
  </motion.button>
);

const primaryBtn:   React.CSSProperties = { width: '100%', height: 52, borderRadius: 16, background: '#2E4A39', color: '#f5f5f5', border: 'none', fontFamily: dm, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const outlineBtn:   React.CSSProperties = { width: '100%', height: 52, borderRadius: 16, background: 'transparent', color: '#23201A', border: '1.5px solid #E3E7DE', fontFamily: dm, fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const iconBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const formField:    React.CSSProperties = { width: '100%', height: 48, padding: '0 16px', borderRadius: 14, border: '1.5px solid #E3E7DE', background: '#F4F6F1', fontFamily: dm, fontSize: 13, color: '#23201A', marginBottom: 20, outline: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', boxSizing: 'border-box' };

export default HomePage;