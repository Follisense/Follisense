import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bookmark, ShoppingCart, ExternalLink,
  Star, X, Trash2, Package, AlertCircle, RotateCw,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { useProductInteractions } from '@/hooks/useProductInteractions';
import { toSlug } from '@/lib/slugify';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop';

// Brand green. Was #D4A866 (gold) before the forest green migration.
const DEFAULT_BADGE_COLOR = '#2E4A39';

interface SavedProduct {
  id: string;
  interactionId: string; // the row ID in product_interactions, needed for deletion
  name: string;
  brand: string;
  category: string;
  priceKsh: number | null;
  rating: number | null;
  badge: string;
  badgeColor: string;
  imageUrl: string;
  jumiaUrl: string;
  amazonUrl: string;
  benefits: string;
  description: string;
  savedAt: string;
}

const Stars = ({ rating }: { rating: number | null }) => {
  if (rating == null) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={11}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground font-medium">{rating.toFixed(1)}</span>
    </div>
  );
};

const WishlistPage = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const { recordInteraction } = useProductInteractions(user?.id);

  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadWishlist = async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    setLoadFailed(false);

    const { data, error } = await supabase
      .from('product_interactions')
      .select(`
        id,
        created_at,
        product_id,
        product_catalog (
          id, name, brand, category,
          price_ksh, rating, badge, badge_color,
          image_url, jumia_url, amazon_url,
          benefits, description
        )
      `)
      .eq('user_id', user.id)
      .eq('action', 'saved')
      .order('created_at', { ascending: false });

    if (error) {
      // Previously this fell through to the empty state, so a failed query
      // looked identical to an empty wishlist.
      console.error('Failed to load wishlist:', error);
      setLoadFailed(true);
      setLoading(false);
      return;
    }

    const seenProductIds = new Set<string>();
    const products: SavedProduct[] = (data ?? [])
      .filter(row => row.product_catalog)
      .reduce<SavedProduct[]>((acc, row) => {
        const p = row.product_catalog as any;

        // Rows are ordered newest first, so keep the first occurrence and drop
        // any older duplicate saves of the same product.
        if (seenProductIds.has(p.id)) return acc;
        seenProductIds.add(p.id);

        acc.push({
          id: p.id,
          interactionId: row.id, // the product_interactions row ID
          name: p.name ?? 'Unnamed product',
          brand: p.brand ?? '',
          category: p.category || 'Other',
          priceKsh: typeof p.price_ksh === 'number' ? p.price_ksh : null,
          rating: typeof p.rating === 'number' ? p.rating : null,
          badge: p.badge || '',
          badgeColor: p.badge_color || DEFAULT_BADGE_COLOR,
          imageUrl: p.image_url || FALLBACK_IMAGE,
          jumiaUrl: p.jumia_url || '',
          amazonUrl: p.amazon_url || '',
          benefits: p.benefits ?? '',
          description: p.description ?? '',
          savedAt: row.created_at,
        });
        return acc;
      }, []);

    setSavedProducts(products);
    setLoading(false);
  };

  useEffect(() => { loadWishlist(); }, [user?.id]);

  // Reset the clear-all confirmation whenever the list changes underneath it.
  useEffect(() => { setConfirmClear(false); }, [savedProducts.length]);

  // ── Remove a single product ───────────────────────────────
  // Deletes the actual `saved` row from product_interactions instead of just
  // recording a `skipped`, which is why removed items kept reappearing.
  const handleRemove = async (product: SavedProduct) => {
    if (!user?.id) return;
    setActionError(null);
    setRemovingId(product.interactionId);

    // Optimistic removal from UI
    const previous = savedProducts;
    setSavedProducts(prev => prev.filter(p => p.interactionId !== product.interactionId));

    const { error } = await supabase
      .from('product_interactions')
      .delete()
      .eq('id', product.interactionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to remove from wishlist:', error);
      setSavedProducts(previous);
      setActionError('That item could not be removed. Check your connection and try again.');
    }

    setRemovingId(null);
  };

  // ── Clear all saved items ─────────────────────────────────
  const handleClearAll = async () => {
    if (!user?.id || savedProducts.length === 0) return;

    // First tap arms the button, second tap performs the delete.
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }

    setActionError(null);
    setClearingAll(true);

    const previous = savedProducts;
    const interactionIds = previous.map(p => p.interactionId);

    // Optimistic clear
    setSavedProducts([]);

    const { error } = await supabase
      .from('product_interactions')
      .delete()
      .in('id', interactionIds)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to clear wishlist:', error);
      setSavedProducts(previous);
      setActionError('Your wishlist could not be cleared. Check your connection and try again.');
    }

    setClearingAll(false);
    setConfirmClear(false);
  };

  // Open the store tab synchronously so the popup blocker allows it, then log
  // the click. Previously the interaction was fired without being awaited on an
  // <a target="_blank">, so the request was often dropped on mobile.
  const handleBuy = (
    e: React.MouseEvent<HTMLAnchorElement>,
    product: SavedProduct,
    url: string,
  ) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
    Promise.resolve(recordInteraction(product.id, 'clicked', 'wishlist'))
      .catch(err => console.error('Failed to record product click:', err));
  };

  const handleViewDetail = (product: SavedProduct) => {
    // Use the shared slug helper so a product opened from here resolves to the
    // same URL as the same product opened from ProductSearch.
    navigate(`/product/${toSlug(product.name)}`, {
      state: {
        product: {
          id: product.id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          priceKsh: product.priceKsh,
          rating: product.rating,
          badge: product.badge,
          badgeColor: product.badgeColor,
          imageUrl: product.imageUrl,
          jumiaUrl: product.jumiaUrl,
          amazonUrl: product.amazonUrl,
          benefits: product.benefits,
          description: product.description,
          concerns: [],
          tags: [],
          usagePhase: [],
          strengthLevel: '',
          recommendationReason: '',
          recommendationPriority: 0,
          triggeredBy: 'wishlist',
        },
      },
    });
  };

  // Group by category
  const grouped = savedProducts.reduce<Record<string, SavedProduct[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] mx-auto pb-28">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 pt-12 pb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
            <ArrowLeft size={18} className="text-foreground" strokeWidth={1.8} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Wishlist</h1>
            <p className="text-xs text-muted-foreground">
              {loading
                ? 'Loading...'
                : loadFailed
                  ? 'Could not load'
                  : savedProducts.length > 0
                    ? `${savedProducts.length} saved product${savedProducts.length !== 1 ? 's' : ''}`
                    : 'No saved products'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Bookmark size={17} className="text-primary fill-primary/30" strokeWidth={1.8} />
          </div>
        </div>

        {/* ── Action error banner ───────────────────────── */}
        {actionError && (
          <div className="mx-5 mb-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-[11px] text-red-600 leading-relaxed">{actionError}</p>
            <button
              onClick={() => setActionError(null)}
              className="flex-shrink-0 text-red-400"
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground">Loading your wishlist...</p>
          </div>
        )}

        {/* ── Load failed ───────────────────────────────── */}
        {!loading && loadFailed && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4"
          >
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle size={28} className="text-red-400" strokeWidth={1.5} />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-bold text-foreground">Your wishlist did not load</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nothing has been lost. Check your connection and try again.
              </p>
            </div>
            <button
              onClick={loadWishlist}
              className="mt-2 h-11 px-6 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-md flex items-center gap-2"
            >
              <RotateCw size={14} /> Try again
            </button>
          </motion.div>
        )}

        {/* ── Empty state ───────────────────────────────── */}
        {!loading && !loadFailed && savedProducts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4"
          >
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center">
              <Package size={28} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-bold text-foreground">Nothing saved yet</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tap the bookmark icon on any product to save it here for later.
              </p>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="mt-2 h-11 px-6 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-md"
            >
              Browse recommendations
            </button>
          </motion.div>
        )}

        {/* ── Product list ──────────────────────────────── */}
        {!loading && !loadFailed && savedProducts.length > 0 && (
          <div className="px-5 space-y-6">
            {Object.entries(grouped).map(([category, products]) => (
              <div key={category}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {category}
                  </p>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {products.length}
                  </span>
                </div>

                <div className="space-y-3">
                  <AnimatePresence>
                    {products.map((product, i) => (
                      <motion.div
                        key={product.interactionId}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -30, scale: 0.95 }}
                        transition={{ delay: i * 0.04, duration: 0.22 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                      >
                        <div className="flex gap-3 p-3">
                          {/* Image */}
                          <div
                            className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 cursor-pointer"
                            onClick={() => handleViewDetail(product)}
                          >
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={e => {
                                const img = e.target as HTMLImageElement;
                                if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
                              }}
                            />
                            {product.badge && (
                              <div
                                className="absolute bottom-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: product.badgeColor }}
                              >
                                {product.badge}
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <div className="flex items-start justify-between gap-1">
                              <div className="cursor-pointer min-w-0" onClick={() => handleViewDetail(product)}>
                                {product.brand && (
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {product.brand}
                                  </p>
                                )}
                                <p className="text-xs font-bold text-foreground leading-tight line-clamp-2 mt-0.5">
                                  {product.name}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemove(product)}
                                disabled={removingId === product.interactionId}
                                aria-label={`Remove ${product.name} from wishlist`}
                                className="flex-shrink-0 w-7 h-7 rounded-full bg-red-50 border border-red-100 flex items-center justify-center disabled:opacity-40 transition-all active:scale-90"
                              >
                                {removingId === product.interactionId
                                  ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                  : <Trash2 size={12} className="text-red-400" />
                                }
                              </button>
                            </div>

                            <Stars rating={product.rating} />

                            {product.benefits && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">
                                {product.benefits}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-auto pt-0.5">
                              <span className="text-sm font-bold text-foreground">
                                {product.priceKsh != null
                                  ? `KSh ${product.priceKsh.toLocaleString()}`
                                  : 'Price unavailable'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Buy buttons */}
                        {(product.jumiaUrl || product.amazonUrl) && (
                          <div className="flex gap-2 px-3 pb-3">
                            {product.jumiaUrl && (
                              <a
                                href={product.jumiaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => handleBuy(e, product, product.jumiaUrl)}
                                className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <ShoppingCart size={12} /> Buy on Jumia
                              </a>
                            )}
                            {product.amazonUrl && (
                              <a
                                href={product.amazonUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => handleBuy(e, product, product.amazonUrl)}
                                className="flex-1 h-9 rounded-xl border border-gray-200 text-foreground text-[11px] font-bold flex items-center justify-center gap-1.5"
                              >
                                <ExternalLink size={12} /> Amazon
                              </a>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}

            {/* Clear all */}
            <button
              onClick={handleClearAll}
              disabled={clearingAll}
              className={`w-full flex items-center justify-center gap-2 py-3 text-xs disabled:opacity-50 ${
                confirmClear ? 'text-red-500 font-bold' : 'text-muted-foreground'
              }`}
            >
              {confirmClear ? <Trash2 size={12} /> : <X size={12} />}
              {clearingAll
                ? 'Clearing...'
                : confirmClear
                  ? `Tap again to remove all ${savedProducts.length}`
                  : 'Clear wishlist'}
            </button>

            {confirmClear && !clearingAll && (
              <button
                onClick={() => setConfirmClear(false)}
                className="w-full text-center text-[11px] text-muted-foreground -mt-4 pb-2"
              >
                Keep them
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;