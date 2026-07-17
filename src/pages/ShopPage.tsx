import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Heart, ShoppingBag, Star,
  SlidersHorizontal, X, Check, ExternalLink, RefreshCw, Sparkles,
} from 'lucide-react';import { useApp } from '@/contexts/AppContext';
import { useGeneratedProducts, GeneratedProduct } from '@/data/useGeneratedProducts';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:         '#EDEFE7',
  surface:    '#E4EADF',
  card:       '#FFFFFF',
  ink:        '#23201A',
  gold:       '#4E7A63',
  goldDeep:   '#2E4A39',
  gold10:     'rgba(46,74,57,0.10)',
  goldBorder: 'rgba(46,74,57,0.22)',
  muted:      '#8A8F86',
  warm:       '#6B6F66',
  mid:        '#E3E7DE',
  border:     '#E3E7DE',
};

const categories  = ['All', 'Shampoo', 'Conditioner', 'Scalp Oil', 'Scalp Treatment', 'Leave-in', 'Hair Growth', 'Edge Control', 'Styling', 'Treatment', 'Supplement'];
const concerns    = ['Itching', 'Flaking', 'Dryness', 'Growth', 'Thinning', 'Breakage', 'Buildup', 'Styling'];
const sortOptions = ['Default', 'Price: Low to High', 'Price: High to Low', 'Highest Rated'];

// ─── SKELETON ─────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 20, overflow: 'hidden' }}>
    <div style={{ height: 160, background: `linear-gradient(90deg, ${C.surface} 25%, #DDE4D8 50%, ${C.surface} 75%)`, backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease-in-out infinite' }} />
    <div style={{ padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[50, 85, 65, 40].map((w, i) => <div key={i} style={{ height: i === 1 ? 13 : 9, borderRadius: 4, background: C.mid, width: `${w}%` }} />)}
    </div>
  </div>
);

// ─── PRODUCT DETAIL ───────────────────────────────────────────────────────────
const ProductDetail = ({ product, onClose, saved, onToggleSave }: {
  product: GeneratedProduct; onClose: () => void; saved: boolean; onToggleSave: () => void;
}) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}
    onClick={onClose}
  >
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 340 }}
      onClick={e => e.stopPropagation()}
      style={{ background: C.card, borderRadius: '28px 28px 0 0', width: '100%', maxHeight: '90vh', overflowY: 'auto', fontFamily: dm }}
    >
      {/* Image */}
      <div style={{ height: 220, background: `linear-gradient(135deg, ${C.surface} 0%, #DCE5D8 100%)`, position: 'relative', overflow: 'hidden' }}>
        <img src={product.image} alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop'; }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.45))' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={15} color="#fff" strokeWidth={2} />
        </button>
        <button onClick={onToggleSave} style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Heart size={14} color={saved ? '#E05555' : C.muted} fill={saved ? '#E05555' : 'none'} strokeWidth={2} />
        </button>
        <div style={{ position: 'absolute', bottom: 14, left: 16 }}>
          <div style={{ background: product.badgeColor, borderRadius: 100, padding: '4px 10px' }}>
            <span style={{ fontFamily: dm, fontSize: 9, fontWeight: 700, color: '#fff' }}>{product.badge}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 40px' }}>
        <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>{product.brand} · {product.category}</p>
        <h2 style={{ fontFamily: playfair, fontSize: 20, fontWeight: 500, color: C.ink, margin: '0 0 8px', lineHeight: 1.2 }}>{product.name}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          {[1,2,3,4,5].map(s => <Star key={s} size={11} color={C.gold} fill={s <= Math.round(product.rating) ? C.gold : 'none'} strokeWidth={1.5} />)}
          <span style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.ink, marginLeft: 2 }}>{product.rating.toFixed(1)}</span>
        </div>
        <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.7, margin: '0 0 14px' }}>{product.description}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {product.concern.map(c => (
            <span key={c} style={{ fontFamily: dm, fontSize: 10, fontWeight: 600, color: C.goldDeep, background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 100, padding: '4px 10px' }}>{c}</span>
          ))}
        </div>

        {/* Where to buy */}
        <div style={{ background: '#F4F6F1', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Where to buy</p>
          {[
            { label: 'Jumia Kenya', sub: 'Local delivery · KSh', bg: '#FF6500', letter: 'J', url: product.jumiaUrl },
            { label: 'Amazon', sub: 'Ships internationally', bg: '#FF9900', letter: 'A', url: product.amazonUrl },
          ].map((btn, i) => (
            <button key={i} onClick={() => window.open(btn.url, '_blank', 'noopener noreferrer')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: 12, background: '#fff', border: `1.5px solid ${C.border}`, cursor: 'pointer', width: '100%', marginBottom: i === 0 ? 8 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: btn.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: dm, fontSize: 14, fontWeight: 800, color: '#fff' }}>{btn.letter}</span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, margin: 0 }}>{btn.label}</p>
                  <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: 0 }}>{btn.sub}</p>
                </div>
              </div>
              <ExternalLink size={13} color={C.muted} strokeWidth={1.8} />
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: 0 }}>From approx.</p>
            <p style={{ fontFamily: playfair, fontSize: 22, fontWeight: 600, color: C.ink, margin: 0 }}>KSh {product.priceKsh.toLocaleString()}</p>
          </div>
          <button onClick={() => window.open(product.jumiaUrl, '_blank', 'noopener noreferrer')}
            style={{ height: 46, padding: '0 22px', borderRadius: 14, background: C.goldDeep, color: '#fff', border: 'none', fontFamily: dm, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <ShoppingBag size={14} color="#fff" strokeWidth={2} /> Buy on Jumia
            <ExternalLink size={11} color="rgba(255,255,255,0.5)" strokeWidth={2} />
          </button>
        </div>

        <p style={{ fontFamily: dm, fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
          Affiliate links,we may earn a small commission at no extra cost to you
        </p>
      </div>
    </motion.div>
  </motion.div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const ShopPage = () => {
  const navigate = useNavigate();
  const { onboardingData } = useApp();

  const { products, loading, error, regenerate } = useGeneratedProducts(onboardingData, 16);

  const [search, setSearch]                 = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeConcerns, setActiveConcerns] = useState<string[]>([]);
  const [sortBy, setSortBy]                 = useState('Default');
  const [showFilters, setShowFilters]       = useState(false);
  const [savedIds, setSavedIds]             = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<GeneratedProduct | null>(null);

  let filtered = products.filter(p => {
    const q = search.toLowerCase();
    return (!search || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.benefit.toLowerCase().includes(q))
      && (activeCategory === 'All' || p.category === activeCategory)
      && (activeConcerns.length === 0 || activeConcerns.some(c => p.concern.includes(c)));
  });
  if (sortBy === 'Price: Low to High') filtered = [...filtered].sort((a, b) => a.priceKsh - b.priceKsh);
  if (sortBy === 'Price: High to Low') filtered = [...filtered].sort((a, b) => b.priceKsh - a.priceKsh);
  if (sortBy === 'Highest Rated')      filtered = [...filtered].sort((a, b) => b.rating - a.rating);

  return (
    <div style={{ fontFamily: dm, background: C.bg, minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(241,238,229,0.3); }
        ::-webkit-scrollbar { display: none; }
        @keyframes shimmer { 0%{background-position:400% 0} 100%{background-position:-400% 0} }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'linear-gradient(145deg, #1A2820 0%, #23392C 50%, #101A14 100%)', padding: '48px 20px 20px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(110,158,130,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
          <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={15} color="rgba(241,238,229,0.8)" strokeWidth={1.8} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6E9E82' }} />
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: 'rgba(110,158,130,0.9)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>FolliSense Shop</span>
          </div>
          <button onClick={regenerate} disabled={loading} title="Refresh"
            style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
            <RefreshCw size={14} color="rgba(241,238,229,0.7)" strokeWidth={1.8} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <h1 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: '#F5EFE6', margin: 0 }}>Scalp Care</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(110,158,130,0.15)', border: '1px solid rgba(110,158,130,0.3)', borderRadius: 100, padding: '2px 8px' }}>
                <Sparkles size={9} color="#6E9E82" strokeWidth={2} />
                <span style={{ fontFamily: dm, fontSize: 9, fontWeight: 700, color: '#6E9E82' }}>AI picks</span>
              </div>
            </div>
            <p style={{ fontFamily: dm, fontSize: 12, color: 'rgba(241,238,229,0.4)', margin: 0 }}>
              {loading ? 'Finding products for you…' : error ? 'Could not load products' : `${filtered.length} of ${products.length} products`}
            </p>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={13} color="rgba(241,238,229,0.35)" strokeWidth={1.8} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or brands…"
            style={{ width: '100%', height: 40, paddingLeft: 36, paddingRight: 16, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.10)', color: '#F5EFE6', fontFamily: dm, fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      {/* Category pills */}
      <div style={{ padding: '12px 20px 0', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            style={{ flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 100, border: `1.5px solid ${activeCategory === cat ? C.gold : C.border}`, background: activeCategory === cat ? C.gold10 : C.card, color: activeCategory === cat ? C.goldDeep : C.warm, fontFamily: dm, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Filter + sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
        <button onClick={() => setShowFilters(f => !f)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 100, border: `1.5px solid ${activeConcerns.length > 0 ? C.gold : C.border}`, background: activeConcerns.length > 0 ? C.gold10 : C.card, color: activeConcerns.length > 0 ? C.goldDeep : C.warm, fontFamily: dm, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <SlidersHorizontal size={11} strokeWidth={2} />
          {activeConcerns.length > 0 ? `Filtered (${activeConcerns.length})` : 'Filter'}
        </button>
        <div style={{ flex: 1, overflowX: 'auto', display: 'flex', gap: 7, scrollbarWidth: 'none' }}>
          {sortOptions.map(opt => (
            <button key={opt} onClick={() => setSortBy(opt)}
              style={{ flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 100, border: `1.5px solid ${sortBy === opt ? C.goldDeep : C.border}`, background: sortBy === opt ? C.goldDeep : C.card, color: sortBy === opt ? '#fff' : C.warm, fontFamily: dm, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Concern filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', padding: '0 20px 10px' }}>
            <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Filter by concern</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {concerns.map(c => (
                <button key={c} onClick={() => setActiveConcerns(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])}
                  style={{ height: 30, padding: '0 12px', borderRadius: 100, border: `1.5px solid ${activeConcerns.includes(c) ? C.gold : C.border}`, background: activeConcerns.includes(c) ? C.gold10 : C.card, color: activeConcerns.includes(c) ? C.goldDeep : C.warm, fontFamily: dm, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {activeConcerns.includes(c) && <Check size={9} strokeWidth={2.5} />}{c}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Affiliate note */}
      <div style={{ margin: '0 20px 12px', padding: '9px 13px', background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 12, display: 'flex', gap: 7, alignItems: 'center' }}>
        <span style={{ fontSize: 12 }}>ℹ️</span>
        <p style={{ fontFamily: dm, fontSize: 11, color: C.goldDeep, margin: 0, lineHeight: 1.5 }}>
          Buy opens Jumia Kenya or Amazon. Affiliate links,small commission at no extra cost.
        </p>
      </div>

      {/* Product grid */}
      <div style={{ padding: '0 20px 100px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} />)
          : error
            ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0' }}>
                <p style={{ fontFamily: playfair, fontSize: 18, color: C.ink, margin: '0 0 6px' }}>Could not load products</p>
                <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, margin: '0 0 16px' }}>Check your connection and try again</p>
                <button onClick={regenerate} style={{ height: 44, padding: '0 24px', borderRadius: 14, background: C.goldDeep, color: '#fff', border: 'none', fontFamily: dm, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Try again
                </button>
              </div>
            )
            : filtered.length === 0
              ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0' }}>
                  <p style={{ fontFamily: playfair, fontSize: 18, color: C.ink, margin: '0 0 6px' }}>No products match</p>
                  <p style={{ fontFamily: dm, fontSize: 13, color: C.muted }}>Try adjusting your filters</p>
                </div>
              )
              : filtered.map((p, i) => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.3 }}
                  onClick={() => setSelectedProduct(p)}
                  style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(20,28,22,0.06)', cursor: 'pointer' }}
                >
                  <div style={{ height: 160, background: `linear-gradient(135deg, ${C.surface} 0%, #DCE5D8 100%)`, position: 'relative', overflow: 'hidden' }}>
                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                      onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop'; }} />
                    <div style={{ position: 'absolute', top: 8, left: 8, background: p.badgeColor, borderRadius: 100, padding: '3px 8px' }}>
                      <span style={{ fontFamily: dm, fontSize: 8, fontWeight: 700, color: '#fff' }}>{p.badge}</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setSavedIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]); }}
                      style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Heart size={11} color={savedIds.includes(p.id) ? '#E05555' : C.muted} fill={savedIds.includes(p.id) ? '#E05555' : 'none'} strokeWidth={2} />
                    </button>
                  </div>
                  <div style={{ padding: '10px 12px 14px' }}>
                    <p style={{ fontFamily: dm, fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>{p.brand}</p>
                    <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.ink, margin: '0 0 3px', lineHeight: 1.3 }}>{p.name}</p>
                    <p style={{ fontFamily: dm, fontSize: 10, color: C.warm, lineHeight: 1.4, margin: '0 0 7px' }}>{p.benefit}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 9 }}>
                      <Star size={9} color={C.gold} fill={C.gold} strokeWidth={0} />
                      <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 600, color: C.ink }}>{p.rating.toFixed(1)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontFamily: playfair, fontSize: 13, fontWeight: 600, color: C.ink, margin: 0 }}>KSh {p.priceKsh.toLocaleString()}</p>
                      <button onClick={e => { e.stopPropagation(); window.open(p.jumiaUrl, '_blank', 'noopener noreferrer'); }}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: C.goldDeep, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={11} color="#fff" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
        }
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            saved={savedIds.includes(selectedProduct.id)}
            onToggleSave={() => setSavedIds(p => p.includes(selectedProduct.id) ? p.filter(x => x !== selectedProduct.id) : [...p, selectedProduct.id])}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShopPage;