import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { articles, categories, getArticleById } from '@/data/learnArticles';
import { useApp } from '@/contexts/AppContext';
import ArticleView from '@/components/ArticleView';
import ConditionGuidePage from '@/pages/ConditionGuidePage';

const mont     = "'Montserrat', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:         '#FFFFFF',
  surface:    '#F3F5EF',
  ink:        '#5F6B60',
  goldSolid:  '#4E7A63',
  goldDeep:   '#2E4A39',
  gold08:     'rgba(46,74,57,0.08)',
  goldBorder: 'rgba(46,74,57,0.18)',
  mid:        '#DEE4D9',
  muted:      '#9BA398',
  warm:       '#7E877C',
  white:      '#FFFFFF',
};

const categoryColor: Record<string, string> = {
  'Scalp health':           'rgba(46,74,57,0.75)',
  'Hair health':            'rgba(64,96,74,0.75)',
  'Nutrition':              'rgba(90,120,70,0.75)',
  'Conditions':             'rgba(58,88,68,0.75)',
  'Styling and protection': 'rgba(96,112,100,0.75)',
  "Men's hair":             'rgba(80,100,84,0.75)',
  'Myth busting':           'rgba(72,116,88,0.75)',
  'All':                    'rgba(46,74,57,0.75)',
  'Know the signs':         'rgba(58,88,68,0.75)',
};

const categoryColorSolid: Record<string, string> = {
  'Scalp health':           '#2E4A39',
  'Hair health':            '#40604A',
  'Nutrition':              '#5A7846',
  'Conditions':             '#3A5844',
  'Styling and protection': '#607064',
  "Men's hair":             '#506454',
  'Myth busting':           '#487458',
  'All':                    '#2E4A39',
  'Know the signs':         '#3A5844',
};

// ─── Local article images ─────────────────────────────────────────────────────
import imgScalpMatters         from '@/assets/Scalp Matters image 1.jpg';
import imgUnderProtective      from '@/assets/Under Protective Style image 2.jpg';
import imgScalpPh              from '@/assets/Scalp ph image 3.jpg';
import imgSweatScalp           from '@/assets/Sweat Scalp image 4.jpg';
import imgDandruffVsDry        from '@/assets/Dandruff vs Dry image 5.jpg';
import imgScalpMicrobiome      from '@/assets/Scalp microbome image 6.jpg';
import imgHairBreakage         from '@/assets/Hair breakage image 7.jpg';
import imgShedding             from '@/assets/Shedding vs Breakage image 11.jpg';
import imgProtein              from '@/assets/Protein image 12.jpg';
import imgDryEnds              from '@/assets/Dry Ends image 13.jpg';
import imgEatForHair           from '@/assets/Eat for Hair image 14.jpg';
import imgSupplements          from '@/assets/Supplements image 16.jpg';
import imgCrashDiet            from '@/assets/Crash diet image 17.jpg';
import imgTractionAlopecia     from '@/assets/traction alopecia image 18.jpg';
import imgCcca                 from '@/assets/ccca image 19.jpg';
import imgSebDerm              from '@/assets/seb derm image 20.jpg';
import imgTelogen              from '@/assets/telogen effluvium image 20.jpg';
import imgAlopeciaAreata       from '@/assets/alopecia areata image 21.jpg';
import imgAndrogenetic         from '@/assets/androgenetic image 22.jpg';
import imgHowTight             from '@/assets/how tight image 23.jpg';
import imgBetweenStyles        from '@/assets/between styles image 24.jpg';
import imgSilkPress            from '@/assets/silk press image 25.jpg';
import imgEdgeControl          from '@/assets/edge control image 26.jpg';
import imgProtectiveTruth      from '@/assets/protective styling truth image 28.jpg';
import imgTractionMen          from '@/assets/traction men image 29.jpg';
import imgWavesDurag           from '@/assets/waves durag image 30.jpg';
import imgBarberVisits         from '@/assets/barber visits image 31.jpg';
import imgLocMaintenance       from '@/assets/loc maintenance image 32.jpg';
import imgMaleTraction         from '@/assets/male traction vs baldness image 33.jpg';
import imgShavingMyth          from '@/assets/Shaving myth image 34.jpg';
import imgEdgesGrowBack        from '@/assets/edges grow back image 35.jpg';
import imgRiceWater            from '@/assets/rice water image 37.jpg';
import imgScalpMassage         from '@/assets/scalp massage image 40.jpg';
import imgNaturalHairMyth      from '@/assets/natural hair myth image 41.jpg';
import imgHydration            from '@/assets/Hydration image.jpg';

// ─── Article image map ────────────────────────────────────────────────────────
const articleImageSets: Record<string, string> = {
  'scalp-matters':            imgScalpMatters,
  'under-protective-style':   imgUnderProtective,
  'scalp-ph':                 imgScalpPh,
  'sweat-scalp':              imgSweatScalp,
  'dandruff-vs-dry':          imgDandruffVsDry,
  'scalp-microbiome':         imgScalpMicrobiome,
  'hair-breakage':            imgHairBreakage,
  'porosity':                 imgHairBreakage,
  'hair-growth-rate':         imgUnderProtective,
  'shedding-vs-breakage':     imgShedding,
  'protein-moisture':         imgProtein,
  'dry-ends':                 imgDryEnds,
  'eat-for-hair':             imgEatForHair,
  'hydration':                imgHydration,
  'supplements':              imgSupplements,
  'crash-diets':              imgCrashDiet,
  'traction-alopecia':        imgTractionAlopecia,
  'ccca':                     imgCcca,
  'telogen-effluvium':        imgTelogen,
  'seb-derm':                 imgSebDerm,
  'alopecia-areata':          imgAlopeciaAreata,
  'androgenetic':             imgAndrogenetic,
  'how-tight':                imgHowTight,
  'between-styles':           imgBetweenStyles,
  'silk-press':               imgSilkPress,
  'edge-control':             imgEdgeControl,
  'protective-styling-truth': imgProtectiveTruth,
  'traction-men':             imgTractionMen,
  'waves-durags':             imgWavesDurag,
  'barber-visits':            imgBarberVisits,
  'loc-maintenance':          imgLocMaintenance,
  'male-pattern-vs-traction': imgMaleTraction,
  'shaving-myth':             imgShavingMyth,
  'edges-grow-back':          imgEdgesGrowBack,
  'rice-water':               imgRiceWater,
  'scalp-massage':            imgScalpMassage,
  'natural-hair-myth':        imgNaturalHairMyth,
};

const sessionSeed = Math.random();
const getArticleImage = (id: string): string | null => {
  return articleImageSets[id] || null;
};

const allCategories = ['All', ...categories.filter(c => c !== 'All'), 'Know the signs'];

// ─── Article row ──────────────────────────────────────────────────────────────
const ArticleRow = ({ article, onClick }: { article: any; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const accentSolid = categoryColorSolid[article.category] || '#2E4A39';
  const img = getArticleImage(article.id);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)} onBlur={() => setHovered(false)}
      layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      style={{ width: '100%', textAlign: 'left', background: C.white, borderRadius: 18, marginBottom: 10, border: hovered ? `1.5px solid ${C.goldBorder}` : `1.5px solid ${C.mid}`, cursor: 'pointer', display: 'flex', overflow: 'hidden', boxShadow: hovered ? `0 6px 20px rgba(46,74,57,0.10), 0 2px 8px rgba(0,0,0,0.04)` : '0 2px 8px rgba(0,0,0,0.04)', transition: 'border 0.18s, box-shadow 0.18s' }}
    >
      <div style={{ width: hovered ? 4 : 3, flexShrink: 0, background: accentSolid, opacity: hovered ? 0.5 : 0.22, transition: 'width 0.18s, opacity 0.18s' }} />
      {img && (
        <div style={{ width: 120, flexShrink: 0, backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100%' }} />
      )}
      <div style={{ flex: 1, padding: '14px 12px' }}>
        <span style={{ fontFamily: mont, fontSize: 9, fontWeight: 700, color: categoryColor[article.category] || C.goldDeep, display: 'block', marginBottom: 5, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {article.category}
        </span>
        <h3 style={{ fontFamily: mont, fontSize: 13, fontWeight: 600, color: hovered ? C.goldDeep : C.ink, margin: '0 0 5px', lineHeight: 1.35, transition: 'color 0.18s' }}>
          {article.title}
        </h3>
        <p style={{ fontFamily: mont, fontSize: 11, fontWeight: 400, color: C.warm, margin: '0 0 10px', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.preview}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.muted, fontFamily: mont, fontSize: 10 }}>
          <Clock size={10} />
          <span>{article.readTime} min read</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12 }}>
        <ChevronRight size={14} color={hovered ? C.goldSolid : C.mid} style={{ transition: 'color 0.18s' }} />
      </div>
    </motion.button>
  );
};

// ─── Featured card ────────────────────────────────────────────────────────────
const FeaturedCard = ({ article, onClick }: { article: any; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const img = getArticleImage(article.id);

  return (
    <motion.button
      layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)} onBlur={() => setHovered(false)}
      style={{ width: '100%', textAlign: 'left', background: C.white, borderRadius: 22, overflow: 'hidden', marginBottom: 12, border: hovered ? `1.5px solid ${C.goldBorder}` : `1.5px solid ${C.mid}`, cursor: 'pointer', boxShadow: hovered ? `0 8px 24px rgba(46,74,57,0.12), 0 2px 8px rgba(0,0,0,0.04)` : '0 3px 12px rgba(0,0,0,0.05)', transition: 'border 0.18s, box-shadow 0.18s' }}
    >
      <div style={{ height: 160, background: img ? `url(${img}) center/cover no-repeat` : `linear-gradient(135deg, ${C.gold08} 0%, ${C.surface} 100%)`, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '12px 16px' }}>
        <span style={{ position: 'relative', zIndex: 1, fontFamily: mont, fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 100, letterSpacing: '0.06em', background: 'rgba(255,255,255,0.88)', color: categoryColorSolid[article.category] || '#2E4A39', border: `1px solid ${C.goldBorder}`, textTransform: 'uppercase' }}>
          {article.category}
        </span>
      </div>
      <div style={{ padding: '14px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <Sparkles size={11} color="rgba(46,74,57,0.65)" />
          <span style={{ fontFamily: mont, fontSize: 9, fontWeight: 700, color: 'rgba(46,74,57,0.70)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Featured</span>
        </div>
        <h3 style={{ fontFamily: mont, fontSize: 16, fontWeight: 600, color: hovered ? C.goldDeep : C.ink, margin: '0 0 7px', lineHeight: 1.3, transition: 'color 0.18s' }}>
          {article.title}
        </h3>
        <p style={{ fontFamily: mont, fontSize: 12, fontWeight: 400, color: C.warm, margin: '0 0 12px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.preview}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.muted, fontFamily: mont, fontSize: 10 }}>
            <Clock size={11} />
            <span>{article.readTime} min read</span>
          </div>
          <ChevronRight size={14} color={hovered ? C.goldSolid : C.mid} style={{ transition: 'color 0.18s' }} />
        </div>
      </div>
    </motion.button>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const LearnPage = () => {
  const { onboardingData } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(searchParams.get('article'));
  const [showConditionGuide, setShowConditionGuide] = useState(!!searchParams.get('condition'));
  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams.get('condition')) setShowConditionGuide(true);
    const article = searchParams.get('article');
    if (article) setSelectedArticleId(article);
  }, [searchParams]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedArticleId, showConditionGuide]);

  const isMale = onboardingData.gender === 'man';

  const sortedArticles = useMemo(() => {
    let filtered = articles;
    if (activeCategory !== 'All' && activeCategory !== 'Know the signs')
      filtered = filtered.filter(a => a.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.preview.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.content.some((p: string) => p.toLowerCase().includes(q))
      );
    }
    if (isMale && activeCategory === 'All' && !searchQuery.trim()) {
      const mens = filtered.filter(a => a.category === "Men's hair");
      const rest = filtered.filter(a => a.category !== "Men's hair");
      return [...mens, ...rest];
    }
    return filtered;
  }, [activeCategory, searchQuery, isMale]);

  const selectedArticle = selectedArticleId ? getArticleById(selectedArticleId) : null;

  if (selectedArticle) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, overflowY: 'auto' }}>
        <ArticleView article={selectedArticle} coverImage={getArticleImage(selectedArticle.id)} onBack={() => { setSelectedArticleId(null); setSearchParams({}); }} onNavigate={(id) => { setSelectedArticleId(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>
    );
  }

  if (showConditionGuide || activeCategory === 'Know the signs') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, overflowY: 'auto' }}>
        <ConditionGuidePage onBack={() => { setShowConditionGuide(false); setActiveCategory('All'); setSearchParams({}); }} />
      </div>
    );
  }

  const featuredArticle = sortedArticles[0];
  const restArticles    = sortedArticles.slice(1);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 100, fontFamily: mont }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
        input::placeholder { color: #AEB6A9; font-family: 'Montserrat', sans-serif; }
      `}</style>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

        {/* Hero,green and dark aesthetic */}
        <div style={{ position: 'relative', background: 'linear-gradient(145deg, #1A2820 0%, #23392C 40%, #1E2E24 70%, #101A14 100%)', padding: '52px 20px 32px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(110,158,130,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(110,158,130,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6E9E82' }} />
              <span style={{ fontFamily: mont, fontSize: 10, fontWeight: 700, color: 'rgba(110,158,130,0.9)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>FolliSense</span>
            </div>
            <h1 style={{ fontFamily: playfair, fontSize: 26, fontWeight: 500, color: '#F5F7F2', margin: 0, lineHeight: 1.2 }}>Learn</h1>
            <p style={{ fontFamily: mont, fontSize: 12, color: 'rgba(245,247,242,0.5)', fontWeight: 300, margin: '6px 0 0' }}>Scalp and hair health explained</p>
          </div>
        </div>

        <div style={{ padding: '16px 20px 0' }}>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input type="text" placeholder="Search topics…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 14, background: C.surface, border: `1.5px solid ${C.mid}`, color: C.ink, fontFamily: mont, fontSize: 13, outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }} />
          </div>

          {/* Category pills */}
          <div ref={pillsRef} style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none' }}>
            {allCategories.map(cat => {
              const active = activeCategory === cat;
              const solid = categoryColorSolid[cat] || '#2E4A39';
              const r = parseInt(solid.slice(1,3), 16);
              const g = parseInt(solid.slice(3,5), 16);
              const b = parseInt(solid.slice(5,7), 16);
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 100, fontFamily: mont, fontSize: 11, fontWeight: 700, border: active ? `1px solid rgba(${r},${g},${b},0.28)` : `1.5px solid ${C.mid}`, cursor: 'pointer', transition: 'all 0.18s', background: active ? `rgba(${r},${g},${b},0.12)` : C.white, color: active ? solid : C.warm, boxShadow: active ? `0 2px 8px rgba(${r},${g},${b},0.12)` : '0 1px 4px rgba(0,0,0,0.04)', letterSpacing: '0.02em' }}>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Articles */}
          <AnimatePresence mode="popLayout">
            {sortedArticles.length === 0 ? (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', color: C.muted, padding: '48px 0', fontFamily: mont, fontSize: 13 }}>
                No articles found. Try a different search or category.
              </motion.p>
            ) : (
              <>
                {featuredArticle && (
                  <FeaturedCard key={featuredArticle.id + '-featured'} article={featuredArticle} onClick={() => setSelectedArticleId(featuredArticle.id)} />
                )}
                {restArticles.map((article, i) => (
                  <motion.div key={article.id} transition={{ duration: 0.18, delay: i * 0.04 }}>
                    <ArticleRow article={article} onClick={() => setSelectedArticleId(article.id)} />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default LearnPage;