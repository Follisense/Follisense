import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { articles, categories, getArticleById } from '@/data/learnArticles';
import { useApp } from '@/contexts/AppContext';
import ArticleView from '@/components/ArticleView';
import ConditionGuidePage from '@/pages/ConditionGuidePage';
import PageShell from '@/components/PageShell';

// Layout, breakpoints and card styling now live in src/styles/layout.css.
// This file keeps only what is specific to Learn: category colours, the image
// map, and the filtering logic.

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

const accentFor = (category: string) => categoryColorSolid[category] || '#2E4A39';

// ─── Local article images ─────────────────────────────────────────────────────
import imgScalpMatters         from '@/assets/Scalp Matters image 1.webp';
import imgUnderProtective      from '@/assets/Under Protective Style image 2.webp';
import imgScalpPh              from '@/assets/Scalp ph image 3.webp';
import imgSweatScalp           from '@/assets/Sweat Scalp image 4.webp';
import imgDandruffVsDry        from '@/assets/Dandruff vs Dry image 5.webp';
import imgScalpMicrobiome      from '@/assets/Scalp microbome image 6.webp';
import imgHairBreakage         from '@/assets/Hair breakage image 7.webp';
import imgShedding             from '@/assets/Shedding vs Breakage image 11.webp';
import imgProtein              from '@/assets/Protein image 12.webp';
import imgDryEnds              from '@/assets/Dry Ends image 13.webp';
import imgEatForHair           from '@/assets/Eat for Hair image 14.webp';
import imgSupplements          from '@/assets/Supplements image 16.webp';
import imgCrashDiet            from '@/assets/Crash diet image 17.webp';
import imgTractionAlopecia     from '@/assets/traction alopecia image 18.webp';
import imgCcca                 from '@/assets/ccca image 19.webp';
import imgSebDerm              from '@/assets/seb derm image 20.webp';
import imgTelogen              from '@/assets/telogen effluvium image 20.webp';
import imgAlopeciaAreata       from '@/assets/alopecia areata image 21.webp';
import imgAndrogenetic         from '@/assets/androgenetic image 22.webp';
import imgHowTight             from '@/assets/how tight image 23.webp';
import imgBetweenStyles        from '@/assets/between styles image 24.webp';
import imgSilkPress            from '@/assets/silk press image 25.webp';
import imgEdgeControl          from '@/assets/edge control image 26.webp';
import imgProtectiveTruth      from '@/assets/protective styling truth image 28.webp';
import imgTractionMen          from '@/assets/traction men image 29.webp';
import imgWavesDurag           from '@/assets/waves durag image 30.webp';
import imgBarberVisits         from '@/assets/barber visits image 31.webp';
import imgLocMaintenance       from '@/assets/loc maintenance image 32.webp';
import imgMaleTraction         from '@/assets/male traction vs baldness image 33.webp';
import imgShavingMyth          from '@/assets/Shaving myth image 34.webp';
import imgEdgesGrowBack        from '@/assets/edges grow back image 35.webp';
import imgRiceWater            from '@/assets/rice water image 37.webp';
import imgScalpMassage         from '@/assets/scalp massage image 40.webp';
import imgNaturalHairMyth      from '@/assets/natural hair myth image 41.webp';
import imgHydration            from '@/assets/Hydration image.webp';

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

const getArticleImage = (id: string): string | null => articleImageSets[id] || null;

const allCategories = ['All', ...categories.filter(c => c !== 'All'), 'Know the signs'];

// ─── Article card ─────────────────────────────────────────────────────────────
// Renders as a row on a phone and a card in the grid from 700px up. That switch
// is entirely in layout.css; nothing here knows about screen width.
const ArticleCard = ({ article, onClick }: { article: any; onClick: () => void }) => {
  const img = getArticleImage(article.id);

  return (
    <motion.button
      type="button"
      className="fs-article"
      onClick={onClick}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      style={{ ['--fs-accent' as any]: accentFor(article.category) }}
    >
      <span className="fs-article-accent" aria-hidden="true" />
      {img && (
        <span className="fs-article-img" style={{ backgroundImage: `url(${img})` }} aria-hidden="true" />
      )}
      <span className="fs-article-body">
        <span className="fs-article-cat">{article.category}</span>
        <span className="fs-article-title">{article.title}</span>
        <span className="fs-article-preview">{article.preview}</span>
        <span className="fs-article-meta">
          <span className="fs-article-time">
            <Clock size={11} />
            {article.readTime} min read
          </span>
          <ChevronRight size={14} />
        </span>
      </span>
    </motion.button>
  );
};

// ─── Featured card ────────────────────────────────────────────────────────────
// Stacked on a phone, image-left from 900px up.
const FeaturedCard = ({ article, onClick }: { article: any; onClick: () => void }) => {
  const img = getArticleImage(article.id);
  const accent = accentFor(article.category);

  return (
    <motion.button
      type="button"
      className="fs-featured"
      onClick={onClick}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ ['--fs-accent' as any]: accent }}
    >
      <span
        className="fs-featured-img"
        style={{
          backgroundImage: img
            ? `url(${img})`
            : `linear-gradient(135deg, rgba(46,74,57,0.08) 0%, #F3F5EF 100%)`,
        }}
      >
        <span className="fs-featured-tag">{article.category}</span>
      </span>

      <span className="fs-featured-body">
        <span className="fs-featured-flag">
          <Sparkles size={11} color="rgba(46,74,57,0.65)" />
          Featured
        </span>
        <span className="fs-featured-title">{article.title}</span>
        <span className="fs-featured-preview">{article.preview}</span>
        <span className="fs-featured-meta">
          <span className="fs-article-time">
            <Clock size={11} />
            {article.readTime} min read
          </span>
          <ChevronRight size={14} />
        </span>
      </span>
    </motion.button>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const LearnPage = () => {
  const { onboardingData } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(searchParams.get('article'));
  const [showConditionGuide, setShowConditionGuide] = useState(!!searchParams.get('condition'));

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
      <div style={{ minHeight: '100vh', background: '#FFFFFF', overflowY: 'auto' }}>
        <ArticleView
          article={selectedArticle}
          coverImage={getArticleImage(selectedArticle.id)}
          onBack={() => { setSelectedArticleId(null); setSearchParams({}); }}
          onNavigate={(id) => { setSelectedArticleId(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        />
      </div>
    );
  }

  if (showConditionGuide || activeCategory === 'Know the signs') {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', overflowY: 'auto' }}>
        <ConditionGuidePage
          onBack={() => { setShowConditionGuide(false); setActiveCategory('All'); setSearchParams({}); }}
        />
      </div>
    );
  }

  const featuredArticle = sortedArticles[0];
  const restArticles = sortedArticles.slice(1);

  return (
    <PageShell title="Learn" subtitle="Scalp and hair health explained">
      {/* Search and category pills. Stacked with a scrolling pill strip on a
          phone, side by side with wrapping pills from 900px. */}
      <div className="fs-toolbar">
        <div className="fs-search">
          <Search size={15} className="fs-search-icon" />
          <input
            type="text"
            placeholder="Search topics…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="fs-pills">
          {allCategories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`fs-pill${activeCategory === cat ? ' is-active' : ''}`}
              style={{ ['--fs-accent' as any]: accentFor(cat) }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {sortedArticles.length === 0 ? (
          <motion.p key="empty" className="fs-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            No articles found. Try a different search or category.
          </motion.p>
        ) : (
          <div key="results">
            {featuredArticle && (
              <FeaturedCard
                key={featuredArticle.id + '-featured'}
                article={featuredArticle}
                onClick={() => setSelectedArticleId(featuredArticle.id)}
              />
            )}

            <div className="fs-grid">
              {restArticles.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onClick={() => setSelectedArticleId(article.id)}
                />
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

export default LearnPage;