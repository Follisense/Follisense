import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, ChevronRight, MessageCircle } from 'lucide-react';
import { Article, getRelatedArticles } from '@/data/learnArticles';

interface ArticleViewProps {
  article: Article;
  // Passed down from LearnPage, which owns the article image map. Kept as a
  // prop rather than imported so the two files don't import each other.
  coverImage?: string | null;
  onBack: () => void;
  onNavigate: (id: string) => void;
}

const mont     = "'Montserrat', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:          '#FAF8F5',
  surface:     '#F5F0EB',
  ink:         '#7A746E',
  greenSolid:  '#4E7A63',
  greenDeep:   '#2E4A39',
  green10:     'rgba(78,122,99,0.10)',
  green20:     'rgba(78,122,99,0.20)',
  greenBorder: 'rgba(78,122,99,0.20)',
  mid:         '#E8E4DF',
  muted:       '#B0AAA4',
  warm:        '#9A9490',
  white:       '#FFFFFF',
};

const categoryColor: Record<string, string> = {
  'Scalp health':           '#4E7A63',
  'Hair health':            '#5B8468',
  'Nutrition':              '#6E9E82',
  'Conditions':             '#3F6B54',
  'Styling and protection': '#587A67',
  "Men's hair":             '#456B58',
  'Myth busting':           '#7BA88C',
};

const RelatedCard = ({ article, onClick }: { article: Article; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const accent = categoryColor[article.category] || C.greenDeep;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', textAlign: 'left',
        background: C.white,
        borderRadius: 16, marginBottom: 8,
        border: hovered ? `1.5px solid ${C.greenBorder}` : `1.5px solid ${C.mid}`,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', overflow: 'hidden',
        boxShadow: hovered ? `0 4px 16px rgba(78,122,99,0.10)` : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'border 0.18s, box-shadow 0.18s',
        padding: 0,
      }}
    >
      <div style={{
        width: hovered ? 4 : 3, alignSelf: 'stretch', flexShrink: 0,
        background: accent, opacity: hovered ? 0.5 : 0.22,
        transition: 'width 0.18s, opacity 0.18s',
      }} />
      <div style={{ flex: 1, padding: '12px 14px' }}>
        <span style={{
          fontFamily: mont, fontSize: 9, fontWeight: 700,
          color: `${accent}CC`, display: 'block', marginBottom: 4,
          letterSpacing: '0.07em', textTransform: 'uppercase',
        }}>
          {article.category}
        </span>
        <p style={{
          fontFamily: mont, fontSize: 13, fontWeight: 600,
          color: hovered ? C.greenDeep : C.ink,
          margin: '0 0 6px', lineHeight: 1.35,
          transition: 'color 0.18s',
        }}>
          {article.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.muted, fontFamily: mont, fontSize: 10 }}>
          <Clock size={10} />
          <span>{article.readTime} min read</span>
        </div>
      </div>
      <div style={{ paddingRight: 14 }}>
        <ChevronRight size={14} color={hovered ? C.greenSolid : C.mid} style={{ transition: 'color 0.18s' }} />
      </div>
    </button>
  );
};

const ArticleView = ({ article, coverImage, onBack, onNavigate }: ArticleViewProps) => {
  const related = getRelatedArticles(article);
  const accent  = categoryColor[article.category] || C.greenDeep;
  const cover   = coverImage || null;
  const [backHovered, setBackHovered] = useState(false);

  return (
    // Outer div is a plain block,gives the Layout a solid scrollable container
    <div style={{ background: C.bg, minHeight: '100vh', paddingBottom: 100, fontFamily: mont }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.25 }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
        `}</style>

        {/* ── Top back link ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <button
            onClick={onBack}
            onMouseEnter={() => setBackHovered(true)}
            onMouseLeave={() => setBackHovered(false)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0',
              color: backHovered ? C.greenDeep : C.muted,
              fontFamily: mont, fontSize: 12, fontWeight: 600,
              transition: 'color 0.18s',
            }}
          >
            <ArrowLeft size={15} />
            Back to articles
          </button>
        </div>

        {/* ── Cover image,the same image used on the article card in Learn ── */}
        {cover && (
          <div style={{ padding: '12px 20px 0' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                width: '100%', height: 190, borderRadius: 18, overflow: 'hidden',
                border: `1px solid ${C.mid}`, background: C.surface,
                boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
                position: 'relative',
              }}
            >
              <img
                src={cover}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.18) 100%)',
              }} />
            </motion.div>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <span style={{
            display: 'inline-block',
            fontFamily: mont, fontSize: 9, fontWeight: 700,
            color: accent, background: 'rgba(78,122,99,0.08)',
            border: `1px solid ${C.greenBorder}`,
            borderRadius: 100, padding: '4px 12px',
            letterSpacing: '0.07em', textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            {article.category}
          </span>

          <h1 style={{
            fontFamily: playfair, fontSize: 22, fontWeight: 500,
            color: C.ink,
            margin: '0 0 10px', lineHeight: 1.3,
          }}>
            {article.title}
          </h1>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: C.muted, fontFamily: mont, fontSize: 11, marginBottom: 20,
          }}>
            <Clock size={12} />
            <span>{article.readTime} min read</span>
          </div>

          {/* Divider */}
          <div style={{
            height: 1.5, borderRadius: 2, marginBottom: 22,
            background: `linear-gradient(to right, rgba(78,122,99,0.30), transparent)`,
          }} />
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '0 20px' }}>
          {article.content.map((paragraph, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: i * 0.04 }}
              style={{
                fontFamily: mont, fontSize: 14, fontWeight: 400,
                color: C.ink,
                lineHeight: 1.78, margin: '0 0 18px',
              }}
            >
              {paragraph}
            </motion.p>
          ))}
        </div>

        {/* ── Related articles ── */}
        {related.length > 0 && (
          <div style={{ padding: '24px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: C.mid }} />
              <span style={{
                fontFamily: mont, fontSize: 9, fontWeight: 700,
                color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0,
              }}>
                Related articles
              </span>
              <div style={{ flex: 1, height: 1, background: C.mid }} />
            </div>
            {related.map(r => (
              <RelatedCard key={r.id} article={r} onClick={() => onNavigate(r.id)} />
            ))}
          </div>
        )}

        {/* ── Chat nudge ── */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{
            background: 'rgba(78,122,99,0.07)',
            border: `1.5px solid ${C.greenBorder}`,
            borderRadius: 18, padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(78,122,99,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageCircle size={16} color={C.greenDeep} />
            </div>
            <div>
              <p style={{ fontFamily: mont, fontSize: 11, color: C.muted, margin: '0 0 2px' }}>
                Got more questions?
              </p>
              <p style={{ fontFamily: mont, fontSize: 13, fontWeight: 700, color: C.greenDeep, margin: 0 }}>
                Tap the chat button to ask FolliSense
              </p>
            </div>
          </div>
        </div>

        {/* ── Bottom back button ── */}
        <div style={{ padding: '20px 20px 0' }}>
          <button
            onClick={onBack}
            style={{
              width: '100%', height: 48, borderRadius: 14,
              border: `1.5px solid ${C.greenBorder}`,
              background: C.white,
              fontFamily: mont, fontSize: 13, fontWeight: 700,
              color: C.greenDeep, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(78,122,99,0.08)',
            }}
          >
            <ArrowLeft size={15} />
            Back to articles
          </button>
        </div>

      </motion.div>
    </div>
  );
};

export default ArticleView;