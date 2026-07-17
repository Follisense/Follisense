import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ShoppingCart, ExternalLink, Star,
  Bookmark, BookmarkCheck, Share2,
  Droplets, Zap, Leaf, FlaskConical, TrendingUp,
  CheckCircle2, Clock, Sparkles,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useProductInteractions } from '@/hooks/useProductInteractions';
import { RecommendedProduct } from '@/hooks/useRecommendationEngine';
import { toSlug } from '@/lib/slugify';


const PHASE_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  wash_day: { label: 'Wash Day', color: 'text-blue-700', bg: 'bg-blue-50', icon: Droplets },
  post_wash: { label: 'Days 1–3', color: 'text-green-700', bg: 'bg-green-50', icon: Leaf },
  mid_cycle: { label: 'Mid-cycle', color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
  pre_wash: { label: 'Pre-wash', color: 'text-purple-700', bg: 'bg-purple-50', icon: Sparkles },
};

const STRENGTH_META: Record<string, { label: string; desc: string; color: string; bg: string }> = {
  low: { label: 'Gentle', desc: 'Safe for everyday use', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  medium: { label: 'Standard', desc: 'Regular strength formula', color: 'text-amber-700', bg: 'bg-amber-50' },
  high: { label: 'Strong', desc: 'Potent,use as directed', color: 'text-orange-700', bg: 'bg-orange-50' },
  clinical: { label: 'Clinical', desc: 'Dermatologist or pharmacist grade', color: 'text-blue-700', bg: 'bg-blue-50' },
};

const CATEGORY_ICONS: Record<string, any> = {
  'Scalp Oil': Droplets,
  'Shampoo': Zap,
  'Conditioner': Leaf,
  'Leave-in': Leaf,
  'Scalp Treatment': FlaskConical,
  'Hair Growth': TrendingUp,
  'Edge Control': Sparkles,
  'Styling': Sparkles,
  'Supplement': FlaskConical,
};

const USAGE_TIPS: Record<string, string> = {
  wash_day: 'Apply to wet or damp hair on wash day. Work through lengths from roots to ends and leave for the directed time before rinsing thoroughly.',
  post_wash: 'Apply to freshly washed hair while still damp. Section hair and work product through evenly, paying attention to ends.',
  mid_cycle: 'Apply directly to scalp through your partings. Use fingertips to massage gently in small circular motions.',
  pre_wash: 'Apply 30–60 minutes before shampooing. Cover hair with a shower cap and let it absorb fully before washing.',
};

const Stars = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) => {
  const px = size === 'lg' ? 15 : 11;
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={px}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
      <span className={`ml-1 font-semibold text-muted-foreground ${size === 'lg' ? 'text-sm' : 'text-[10px]'}`}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────
const ProductDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const { recordInteraction, savedIds } = useProductInteractions(user?.id);

  const product: RecommendedProduct | undefined = location.state?.product;

  const [saved, setSaved] = useState(savedIds.has(product?.id || ''));
  const [activeTab, setActiveTab] = useState<'about' | 'usage'>('about');

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6">
        <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center">
          <Droplets size={22} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">Product not found</p>
        <button onClick={() => navigate(-1)} className="text-xs text-primary font-semibold">Go back</button>
      </div>
    );
  }

  const CategoryIcon = CATEGORY_ICONS[product.category] || Droplets;
  const strengthMeta = product.strengthLevel ? STRENGTH_META[product.strengthLevel] : null;

  const handleSave = async () => {
    const nowSaved = !saved;
    setSaved(nowSaved);
    await recordInteraction(product.id, nowSaved ? 'saved' : 'skipped', product.triggeredBy);
  };

  const handleShare = async () => {
    const url = product.jumiaUrl || product.amazonUrl || window.location.href;
    const text = `${product.name} by ${product.brand},KSh ${product.priceKsh.toLocaleString()}`;
    if (navigator.share) {
      await navigator.share({ title: product.name, text, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    }
  };

  const handleBuy = () => recordInteraction(product.id, 'clicked', product.triggeredBy);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] mx-auto">

        {/* ── Hero image ──────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gray-100" style={{ height: 340 }}>
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop';
            }}
          />

          {/* Dark gradient at bottom for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

          {/* Top navigation bar */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-12 pb-4">
            <button onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center">
              <ArrowLeft size={18} className="text-foreground" strokeWidth={2} />
            </button>
            <div className="flex gap-2">
              <button onClick={handleSave}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center transition-transform active:scale-90">
                {saved
                  ? <BookmarkCheck size={18} className="text-primary" />
                  : <Bookmark size={18} className="text-gray-600" strokeWidth={1.8} />
                }
              </button>
              <button onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center">
                <Share2 size={17} className="text-gray-600" strokeWidth={1.8} />
              </button>
            </div>
          </div>

          {/* Badge on image */}
          {product.badge && (
            <div
              className="absolute bottom-4 left-4 text-[10px] font-bold px-3 py-1 rounded-full text-white shadow-lg"
              style={{ backgroundColor: product.badgeColor }}
            >
              {product.badge}
            </div>
          )}

          {/* Strength pill on image */}
          {strengthMeta && (
            <div className={`absolute bottom-4 right-4 text-[10px] font-bold px-3 py-1 rounded-full ${strengthMeta.bg} ${strengthMeta.color}`}>
              {strengthMeta.label}
            </div>
          )}
        </div>

        {/* ── Content card,pulls up over the image ──────── */}
        <div className="bg-background rounded-t-3xl -mt-5 relative z-10 px-5 pt-5 pb-36 space-y-5">

          {/* Category + brand + name + price ──────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <CategoryIcon size={13} className="text-primary" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {product.brand} · {product.category}
              </span>
            </div>

            <h1 className="text-xl font-bold text-foreground leading-snug mb-3">
              {product.name}
            </h1>

            <div className="flex items-center justify-between">
              <Stars rating={product.rating} size="lg" />
              <span className="text-2xl font-black text-foreground">
                KSh {product.priceKsh.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Why recommended ────────────────────────────── */}
          {product.recommendationReason && (
            <div className="flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3.5">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles size={13} className="text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">
                  Why it was recommended
                </p>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {product.recommendationReason}
                </p>
              </div>
            </div>
          )}

          {/* Concern tags ───────────────────────────────── */}
          {product.concerns?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Targets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.concerns.map(c => (
                  <span key={c}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-accent text-foreground font-medium">
                    <CheckCircle2 size={10} className="text-primary" />
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Usage phases ───────────────────────────────── */}
          {product.usagePhase?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Best used during
              </p>
              <div className="flex flex-wrap gap-2">
                {product.usagePhase.map(phase => {
                  const meta = PHASE_META[phase];
                  const Icon = meta?.icon || Clock;
                  return (
                    <div key={phase}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${meta?.bg || 'bg-accent'}`}>
                      <Icon size={12} className={meta?.color || 'text-foreground'} />
                      <span className={`text-xs font-semibold ${meta?.color || 'text-foreground'}`}>
                        {meta?.label || phase.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab bar ────────────────────────────────────── */}
          <div className="flex bg-gray-100 rounded-2xl p-1">
            {(['about', 'usage'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab ? 'bg-white shadow text-foreground' : 'text-muted-foreground'
                }`}>
                {tab === 'about' ? 'About' : 'How to Use'}
              </button>
            ))}
          </div>

          {/* Tab content ────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {activeTab === 'about' ? (
              <motion.div key="about"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
                className="space-y-4">

                {/* Description */}
                {product.description && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Description
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{product.description}</p>
                  </div>
                )}

                {/* Benefit highlight */}
                {product.benefits && (
                  <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3.5">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-0.5">
                        Key benefit
                      </p>
                      <p className="text-xs font-semibold text-emerald-800">{product.benefits}</p>
                    </div>
                  </div>
                )}

                {/* Strength info */}
                {strengthMeta && (
                  <div className={`rounded-2xl px-4 py-3.5 ${strengthMeta.bg}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${strengthMeta.color}`}>
                      Strength: {strengthMeta.label}
                    </p>
                    <p className={`text-xs ${strengthMeta.color} opacity-80`}>{strengthMeta.desc}</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="usage"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                className="space-y-3">

                {product.usagePhase?.length > 0 ? (
                  product.usagePhase.map(phase => {
                    const meta = PHASE_META[phase];
                    const Icon = meta?.icon || Clock;
                    return (
                      <div key={phase} className={`rounded-2xl px-4 py-4 ${meta?.bg || 'bg-accent'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={14} className={meta?.color || 'text-foreground'} />
                          <p className={`text-xs font-bold ${meta?.color || 'text-foreground'}`}>
                            {meta?.label || phase.replace('_', ' ')}
                          </p>
                        </div>
                        <p className={`text-xs leading-relaxed ${meta?.color || 'text-foreground'} opacity-80`}>
                          {USAGE_TIPS[phase] || 'Follow the instructions on the product packaging.'}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-accent px-4 py-4">
                    <p className="text-sm text-foreground/70 leading-relaxed">
                      Follow the instructions on the product packaging for best results.
                    </p>
                  </div>
                )}

                {/* General tip */}
                <div className="bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                    Pro tip
                  </p>
                  <p className="text-xs text-foreground/70 leading-relaxed">
                    Consistency matters more than frequency. Use as directed for at least 4–6 weeks before assessing results.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Sticky buy buttons ─────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-5 py-4">
        <div className="max-w-[430px] mx-auto flex gap-3">
          {product.jumiaUrl && (
            <a
              href={product.jumiaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleBuy}
              className="flex-1 h-13 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            >
              <ShoppingCart size={16} /> Buy on Jumia
            </a>
          )}
          {product.amazonUrl && (
            <a
              href={product.amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleBuy}
              className={`${product.jumiaUrl ? 'w-13 px-3.5' : 'flex-1'} h-13 py-3.5 rounded-2xl border-2 border-gray-200 text-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform`}
            >
              {product.jumiaUrl
                ? <ExternalLink size={17} />
                : <><ExternalLink size={16} /> Amazon</>
              }
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;