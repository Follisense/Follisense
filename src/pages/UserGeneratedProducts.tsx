import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ExternalLink, Star, ShoppingCart,
  Bookmark, BookmarkCheck, X, ChevronRight,
  Zap, Shield, TrendingUp, LayoutGrid, List,
  Search, SlidersHorizontal, Check,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useRecommendationEngine, RecommendedProduct } from '@/hooks/useRecommendationEngine';
import { useProductInteractions } from '@/hooks/useProductInteractions';
import { useConsumerProfile } from '@/hooks/useConsumerProfile';
import { toSlug } from '@/lib/slugify';
import { jumiaLinkFor } from '@/lib/jumia';
import { useCatalogSearch } from '@/hooks/useCatalogSearch';

// ── Constants ─────────────────────────────────────────────────
const TRIGGER_META: Record<string, { label: string; Icon: any }> = {
  no_mid_cycle_product:      { label: 'Nothing between washes', Icon: Zap },
  only_oils_mid_cycle:       { label: 'Only oils mid-cycle',    Icon: Zap },
  no_clarifying_shampoo:     { label: 'No clarifying shampoo',  Icon: Shield },
  no_scalp_product_wash_day: { label: 'Scalp untreated on wash day', Icon: Shield },
  no_pre_wash_product:       { label: 'Pre-wash phase empty',   Icon: TrendingUp },
  no_growth_product:         { label: 'No growth product',      Icon: TrendingUp },
};

const SOURCE_HEADER: Record<string, { title: string; sub: string }> = {
  routine:    { title: 'Filling Your Gaps',     sub: 'Products matched to what your routine is missing' },
  onboarding: { title: 'Based on Your Profile', sub: 'Matched to the concerns you shared when you joined' },
  top_rated:  { title: 'Top Picks',             sub: 'Highest rated products for natural hair' },
};

const STRENGTH_STYLES: Record<string, string> = {
  low:      'bg-emerald-50 text-emerald-700 border border-emerald-200',
  medium:   'bg-amber-50 text-amber-700 border border-amber-200',
  high:     'bg-orange-50 text-orange-700 border border-orange-200',
  clinical: 'bg-blue-50 text-blue-700 border border-blue-200',
};

const PRICE_RANGES = [
  { label: 'Any price',        min: 0,    max: Infinity },
  { label: 'Under KSh 1,000',  min: 0,    max: 999      },
  { label: 'KSh 1,000–2,000',  min: 1000, max: 2000     },
  { label: 'Over KSh 2,000',   min: 2001, max: Infinity },
];

// ── Toast notification ────────────────────────────────────────
interface ToastProps { message: string; productName: string; onClose: () => void; }

const SaveToast = ({ message, productName, onClose }: ToastProps) => (
  <motion.div
    initial={{ opacity: 0, y: 60, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-[390px]"
  >
    <div className="bg-foreground text-background rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <Check size={15} className="text-white" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">{message}</p>
        <p className="text-[10px] opacity-70 truncate">{productName}</p>
      </div>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  </motion.div>
);

// ── Stars ──────────────────────────────────────────────────────
const Stars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={10}
        className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
      />
    ))}
    <span className="ml-1 text-[10px] text-muted-foreground">{rating.toFixed(1)}</span>
  </div>
);

// ── Card props ────────────────────────────────────────────────
interface CardProps {
  product: RecommendedProduct;
  isSaved: boolean;
  index: number;
  onSave: () => void;
  onSkip: () => void;
  onBuy: () => void;
  onViewDetail: () => void;
}

// ── Grid card ─────────────────────────────────────────────────
const GridCard = ({ product, isSaved, index, onSave, onSkip, onBuy, onViewDetail }: CardProps) => {
  const [showReason, setShowReason] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col"
    >
      <div
        className="relative bg-gray-50 overflow-hidden cursor-pointer"
        style={{ aspectRatio: '1/1' }}
        onClick={onViewDetail}
      >
        <img
          src={product.imageUrl} alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop'; }}
        />
        {product.badge && (
          <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm"
            style={{ backgroundColor: product.badgeColor }}>
            {product.badge}
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button onClick={e => { e.stopPropagation(); onSave(); }}
            aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
            className="w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center transition-transform active:scale-90">
            {isSaved ? <BookmarkCheck size={13} className="text-primary" /> : <Bookmark size={13} className="text-gray-400" />}
          </button>
          <button onClick={e => { e.stopPropagation(); onSkip(); }}
            aria-label="Not interested"
            className="w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center transition-transform active:scale-90">
            <X size={13} className="text-gray-400" />
          </button>
        </div>
        {product.strengthLevel && (
          <span className={`absolute bottom-2 left-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STRENGTH_STYLES[product.strengthLevel]}`}>
            {product.strengthLevel.charAt(0).toUpperCase() + product.strengthLevel.slice(1)}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="cursor-pointer" onClick={onViewDetail}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground truncate">{product.brand}</p>
          <p className="text-xs font-bold text-foreground leading-tight line-clamp-2 mt-0.5">{product.name}</p>
        </div>
        <Stars rating={product.rating} />
        <p className="text-sm font-bold text-foreground">KSh {product.priceKsh.toLocaleString()}</p>

        {product.recommendationReason && (
          <>
            <button onClick={() => setShowReason(p => !p)}
              className="flex items-center gap-1 text-[10px] text-primary font-semibold">
              💡 Why this?
              <ChevronRight size={10} className={`transition-transform ${showReason ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {showReason && (
                <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="text-[10px] text-muted-foreground leading-relaxed overflow-hidden">
                  {product.recommendationReason}
                </motion.p>
              )}
            </AnimatePresence>
          </>
        )}

        {/* jumiaLinkFor always returns a usable link (exact URL or a Jumia
            search), so this button is never conditional. The list card behaves
            the same way — the two views used to disagree. */}
        <div className="mt-auto pt-1 flex gap-1.5">
          <a href={jumiaLinkFor(product)} target="_blank" rel="noopener noreferrer" onClick={onBuy}
            className="flex-1 h-8 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center gap-1">
            <ShoppingCart size={11} /> Jumia
          </a>
          {product.amazonUrl && (
            <a href={product.amazonUrl} target="_blank" rel="noopener noreferrer" onClick={onBuy}
              className="flex-1 h-8 rounded-xl border border-gray-200 text-foreground text-[10px] font-bold flex items-center justify-center gap-1">
              <ExternalLink size={11} /> Amazon
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── List card ─────────────────────────────────────────────────
const ListCard = ({ product, isSaved, index, onSave, onSkip, onBuy, onViewDetail }: CardProps) => (
  <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.94 }} transition={{ delay: index * 0.04, duration: 0.25 }}
    className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex gap-3 p-3">
    <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 cursor-pointer" onClick={onViewDetail}>
      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover"
        onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop'; }} />
    </div>
    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 cursor-pointer" onClick={onViewDetail}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{product.brand}</p>
          <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{product.name}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onSave} aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
            className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center transition-transform active:scale-90">
            {isSaved ? <BookmarkCheck size={13} className="text-primary" /> : <Bookmark size={13} className="text-gray-400" />}
          </button>
          <button onClick={onSkip} aria-label="Not interested"
            className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center">
            <X size={13} className="text-gray-400" />
          </button>
        </div>
      </div>
      <Stars rating={product.rating} />
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">KSh {product.priceKsh.toLocaleString()}</span>
        {product.badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: product.badgeColor }}>
            {product.badge}
          </span>
        )}
      </div>
      {product.recommendationReason && (
        <div className="bg-primary/5 rounded-lg px-2 py-1.5 flex items-start gap-1">
          <span className="text-[10px] leading-none mt-0.5">💡</span>
          <p className="text-[10px] text-foreground/70 leading-relaxed line-clamp-2">{product.recommendationReason}</p>
        </div>
      )}
      <div className="flex gap-1.5 mt-auto">
        <a href={jumiaLinkFor(product)} target="_blank" rel="noopener noreferrer" onClick={onBuy}
          className="flex-1 h-7 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center gap-1">
          <ShoppingCart size={10} /> Jumia
        </a>
        {product.amazonUrl && (
          <a href={product.amazonUrl} target="_blank" rel="noopener noreferrer" onClick={onBuy}
            className="flex-1 h-7 rounded-lg border border-gray-200 text-foreground text-[10px] font-bold flex items-center justify-center gap-1">
            <ExternalLink size={10} /> Amazon
          </a>
        )}
      </div>
    </div>
  </motion.div>
);

// ── Price filter bottom sheet ─────────────────────────────────
const PriceSheet = ({ selected, onSelect, onClose }: { selected: number; onSelect: (i: number) => void; onClose: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      onClick={e => e.stopPropagation()}
      className="relative w-full max-w-[430px] bg-white rounded-t-3xl sm:rounded-3xl px-5 pt-3 pb-10 sm:pb-5 shadow-2xl">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
      <p className="text-sm font-bold text-foreground mb-4">Filter by price</p>
      <div className="flex flex-col gap-2">
        {PRICE_RANGES.map((range, i) => (
          <button key={range.label} onClick={() => { onSelect(i); onClose(); }}
            className={`flex items-center justify-between h-[52px] px-4 rounded-2xl border-2 transition-all ${
              selected === i ? 'bg-primary border-primary text-primary-foreground' : 'bg-white border-gray-100 text-foreground'
            }`}>
            <span className="text-sm font-semibold">{range.label}</span>
            {selected === i && (
              <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={2.5} />
              </div>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

// ── Main page ─────────────────────────────────────────────────
const UserGeneratedProducts = () => {
  const navigate = useNavigate();
  const { user, routineLastUpdated } = useApp();

  const [activeFilter, setActiveFilter]     = useState('All');
  const [viewMode, setViewMode]             = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery]       = useState('');
  const [visibleCount, setVisibleCount]     = useState(12);
  const [priceRangeIdx, setPriceRangeIdx]   = useState(0);
  const [showPriceSheet, setShowPriceSheet] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; productName: string } | null>(null);

  const showToast = useCallback((message: string, productName: string) => {
    setToast({ message, productName });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const { profile, loading: profileLoading } = useConsumerProfile(user?.id);
  console.log('[Products] user id:', user?.id, 'profile:', profile);
  const { recordInteraction, skippedIds, savedIds, interactionBoost } = useProductInteractions(user?.id);
  const { recommendations, loading, error, triggeredRules, source } = useRecommendationEngine(
    user?.id,
    profile?.topConcerns || [],
    profile?.hairTexture || '',
    'medium',
    skippedIds,
    interactionBoost,
    routineLastUpdated,
  );
  const { results: searchResults, searching } = useCatalogSearch(searchQuery, skippedIds);

  // The category list is derived from whichever list is showing. When the user
  // starts or clears a search that list changes, and a category that no longer
  // exists would strand them on an empty page with no obvious way back.
  useEffect(() => {
    setActiveFilter('All');
  }, [searchQuery]);

  const handleSave = (p: RecommendedProduct) => {
    const nowSaved = !savedIds.has(p.id);
    recordInteraction(p.id, nowSaved ? 'saved' : 'skipped', p.triggeredBy);
    if (nowSaved) showToast('Saved to wishlist', p.name);
    else showToast('Removed from wishlist', p.name);
  };

  const handleSkip       = (p: RecommendedProduct) => recordInteraction(p.id, 'skipped', p.triggeredBy);
  const handleBuy        = (p: RecommendedProduct) => recordInteraction(p.id, 'clicked', p.triggeredBy);
  const handleViewDetail = (p: RecommendedProduct) => {
    recordInteraction(p.id, 'viewed', p.triggeredBy);
    navigate(`/product/${toSlug(p.name)}`, { state: { product: p } });
  };

  const priceRange = PRICE_RANGES[priceRangeIdx];

  // When the user is searching, use full-catalog results; otherwise use recommendations
  const isSearching = !!searchQuery.trim();
  const sourceList  = isSearching ? searchResults : recommendations;
  const categories  = ['All', ...Array.from(new Set(sourceList.map(p => p.category)))];

  const filtered = sourceList
    .filter(p => activeFilter === 'All' || p.category === activeFilter)
    .filter(p => p.priceKsh >= priceRange.min && p.priceKsh <= priceRange.max);

  const visible = filtered.slice(0, visibleCount);
  const headerMeta = SOURCE_HEADER[source] || SOURCE_HEADER.top_rated;

  if (loading || profileLoading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
      <p className="text-sm font-medium text-muted-foreground">Personalising your picks...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <p className="text-sm text-muted-foreground text-center">{error}</p>
    </div>
  );

  

  return (
    <div className="min-h-screen bg-background">

      {/* Price filter sheet */}
      <AnimatePresence>
        {showPriceSheet && (
          <PriceSheet
            selected={priceRangeIdx}
            onSelect={i => { setPriceRangeIdx(i); setVisibleCount(12); }}
            onClose={() => setShowPriceSheet(false)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <SaveToast
            message={toast.message}
            productName={toast.productName}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Phone width on mobile, a real page on a laptop. Everything below keeps
          its px-5 rhythm; only the container width and the grid columns change. */}
      <div className="max-w-[430px] lg:max-w-[1100px] mx-auto pb-28">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="px-5 pt-7 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-primary" strokeWidth={2} />
              <h1 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">{headerMeta.title}</h1>
            </div>

            {/* ── Wishlist tab — prominent ──────────────────── */}
            <button
              onClick={() => navigate('/wishlist')}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-2xl px-4 py-2.5 shadow-md transition-transform active:scale-95"
            >
              <Bookmark size={15} className="fill-primary-foreground" strokeWidth={0} />
              <span className="text-xs font-bold">Wishlist</span>
              {savedIds.size > 0 && (
                <span className="bg-white text-primary text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center leading-none">
                  {savedIds.size}
                </span>
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground pl-6">{headerMeta.sub}</p>
        </div>

        {/* ── Search ──────────────────────────────────────── */}
        <div className="px-5 mb-4">
          <div className="flex items-center gap-2 h-11 bg-white border border-gray-200 rounded-2xl px-3 shadow-sm lg:max-w-md">
            <Search size={15} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setVisibleCount(12); }}
              placeholder="Search products, brands, concerns..."
              className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="Clear search">
                <X size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        {/* Profile missing is no longer a hard stop. The engine already falls
            back to top-rated picks, so we show products and say they are not
            personalised rather than locking the page. */}
        {!profile && (
          <div className="mx-5 mb-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <Sparkles size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-0.5">Showing top picks</p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                We couldn't load your profile, so these aren't personalised yet.
              </p>
            </div>
          </div>
        )}
        {/* ── Gap pills ────────────────────────────────────── */}
        {source === 'routine' && triggeredRules.length > 0 && !isSearching && (
          <div className="px-5 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Gaps detected</p>
            <div className="flex flex-wrap gap-1.5">
              {triggeredRules.map(t => {
                const meta = TRIGGER_META[t];
                if (!meta) return null;
                const { Icon } = meta;
                return (
                  <div key={t} className="flex items-center gap-1 bg-primary/8 border border-primary/15 rounded-full px-2.5 py-1">
                    <Icon size={10} className="text-primary" />
                    <span className="text-[10px] font-semibold text-primary">{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Onboarding banner ────────────────────────────── */}
        {source === 'onboarding' && !isSearching && (
          <div className="mx-5 mb-4 flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5 lg:max-w-2xl">
            <Sparkles size={13} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary mb-0.5">Your profile is ready</p>
              <p className="text-[11px] text-primary/80 leading-relaxed">
                These picks are based on your concerns
                {profile?.topConcerns?.length ? ` — ${profile.topConcerns.slice(0, 3).join(', ')}` : ''}.
                Add products to your routine to unlock gap-based recommendations.
              </p>
            </div>
          </div>
        )}

        {/* ── FILTER TOOLBAR — clean 2-row layout ─────────── */}
        <div className="px-5 mb-2 space-y-2">

          {/* Row 1: Category pills — full width scrollable */}
          <div className="overflow-x-auto scrollbar-none -mx-5 px-5">
            <div className="flex gap-2 min-w-max">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveFilter(cat); setVisibleCount(12); }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    activeFilter === cat
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-white border border-gray-200 text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Price filter + view toggle — right-aligned */}
          <div className="flex items-center justify-between">
            {/* Price filter button */}
            <button
              onClick={() => setShowPriceSheet(true)}
              className={`flex items-center gap-2 h-9 px-3 rounded-xl border transition-all ${
                priceRangeIdx !== 0
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-white border-gray-200 text-muted-foreground'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span className="text-xs font-semibold">
                {priceRangeIdx !== 0 ? PRICE_RANGES[priceRangeIdx].label : 'Price'}
              </span>
              {priceRangeIdx !== 0 && (
                <span
                  role="button"
                  aria-label="Clear price filter"
                  onClick={e => { e.stopPropagation(); setPriceRangeIdx(0); }}
                  className="ml-0.5 opacity-70"
                >
                  <X size={11} />
                </span>
              )}
            </button>

            {/* View toggle */}
            <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`w-9 h-9 flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-primary' : ''}`}
              >
                <LayoutGrid size={14} className={viewMode === 'grid' ? 'text-white' : 'text-muted-foreground'} />
              </button>
              <div className="w-px h-5 bg-gray-200" />
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`w-9 h-9 flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-primary' : ''}`}
              >
                <List size={14} className={viewMode === 'list' ? 'text-white' : 'text-muted-foreground'} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Count ────────────────────────────────────────── */}
        <p className="px-5 text-[11px] text-muted-foreground mb-3 pt-1">
          {isSearching && searching
            ? 'Searching…'
            : isSearching
              ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${searchQuery}"`
              : `Showing ${Math.min(visibleCount, filtered.length)} of ${filtered.length} product${filtered.length !== 1 ? 's' : ''}`
          }
        </p>

        {/* ── Products ─────────────────────────────────────── */}
        {/* The searching check comes first so a debounced search never flashes
            "no results" before the rows arrive. */}
        {isSearching && searching ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground">Searching the catalogue…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center">
              <Search size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {isSearching ? `No results for "${searchQuery}"` : 'No products in this range'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isSearching ? 'Try a brand name, concern, or ingredient' : 'Try a different price range or category'}
            </p>
            <button onClick={() => { setSearchQuery(''); setPriceRangeIdx(0); setActiveFilter('All'); }}
              className="text-xs text-primary font-semibold">
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {viewMode === 'grid' ? (
                <div className="px-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
                  {visible.map((p, i) => (
                    <GridCard key={p.id} product={p} isSaved={savedIds.has(p.id)} index={i}
                      onSave={() => handleSave(p)} onSkip={() => handleSkip(p)}
                      onBuy={() => handleBuy(p)} onViewDetail={() => handleViewDetail(p)} />
                  ))}
                </div>
              ) : (
                <div className="px-5 flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
                  {visible.map((p, i) => (
                    <ListCard key={p.id} product={p} isSaved={savedIds.has(p.id)} index={i}
                      onSave={() => handleSave(p)} onSkip={() => handleSkip(p)}
                      onBuy={() => handleBuy(p)} onViewDetail={() => handleViewDetail(p)} />
                  ))}
                </div>
              )}
            </AnimatePresence>

            {filtered.length > visibleCount && (
              <div className="px-5 pt-5 lg:flex lg:justify-center">
                <button onClick={() => setVisibleCount(v => v + 8)}
                  className="w-full lg:w-auto lg:px-10 h-11 rounded-xl border-2 border-primary text-primary text-sm font-semibold">
                  Load more · {filtered.length - visibleCount} remaining
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserGeneratedProducts;