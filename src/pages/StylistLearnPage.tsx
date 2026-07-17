import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, Eye, ArrowUpRight, AlertTriangle, Shield,
  BookOpen, Play, Flame, Star, Info, Heart, ExternalLink, Camera, ImageIcon,
} from 'lucide-react';
import { stylistConditions, StylistCondition, getConditionById } from '@/data/stylistConditions';
import { consumerConditions } from '@/data/conditionGuide';
import ScalpIllustration from '@/components/ScalpIllustration';
import { toast } from '@/hooks/use-toast';

// ─── Design tokens ────────────────────────────────────────────────────────────
const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";
const green    = '#2d6e55';
const darkGreen= '#1a4d3a';
const greenLight = '#e8f4ef';
const greenBorder = 'rgba(45,110,85,0.18)';
const green10  = 'rgba(45,110,85,0.10)';

const C = {
  bg:     'var(--color-background-tertiary)',
  card:   'var(--color-background-primary)',
  text:   'var(--color-text-primary)',
  muted:  'var(--color-text-secondary)',
  border: greenBorder,
  shadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
  shadowHover: '0 4px 18px rgba(45,110,85,0.14), 0 1px 4px rgba(0,0,0,0.06)',
};

// ─── Tag colours ─────────────────────────────────────────────────────────────
const tagStyle = (tag: string): React.CSSProperties => {
  switch (tag) {
    case 'Common':
      return { background: greenLight, color: darkGreen, border: `1px solid ${greenBorder}` };
    case 'Less common':
      return { background: 'rgba(45,110,85,0.06)', color: green, border: `1px solid rgba(45,110,85,0.12)` };
    case 'Urgent':
      return { background: '#fad9d7', color: '#7a2020', border: '1px solid rgba(176,80,64,0.2)' };
    default:
      return { background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-tertiary)' };
  }
};

const dermnetLinks: Record<string, { name: string; url: string }> = {
  'traction-alopecia':    { name: 'Traction alopecia',       url: 'https://dermnetnz.org/topics/traction-alopecia' },
  'ccca':                 { name: 'CCCA',                     url: 'https://dermnetnz.org/topics/central-centrifugal-cicatricial-alopecia' },
  'seborrheic-dermatitis':{ name: 'Seborrheic dermatitis',   url: 'https://dermnetnz.org/topics/seborrhoeic-dermatitis' },
  'scalp-psoriasis':      { name: 'Scalp psoriasis',         url: 'https://dermnetnz.org/topics/scalp-psoriasis' },
  'alopecia-areata':      { name: 'Alopecia areata',         url: 'https://dermnetnz.org/topics/alopecia-areata' },
  'folliculitis':         { name: 'Folliculitis',             url: 'https://dermnetnz.org/topics/folliculitis' },
  'tinea-capitis':        { name: 'Tinea capitis',            url: 'https://dermnetnz.org/topics/tinea-capitis' },
  'chemical-damage':      { name: 'Chemical burns',          url: 'https://dermnetnz.org/topics/chemical-burn' },
};

// ─── Shared card style ────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1.5px solid ${C.border}`,
  borderRadius: 16,
  boxShadow: C.shadow,
  padding: '16px',
  fontFamily: dm,
};

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{
    fontFamily: dm, fontSize: 10, fontWeight: 600,
    letterSpacing: '0.09em', textTransform: 'uppercase',
    color: 'var(--color-text-secondary)', marginBottom: 10, marginTop: 2,
  }}>
    {children}
  </p>
);

// ─── Condition detail view ────────────────────────────────────────────────────
const ConditionDetail = ({ condition, onBack }: { condition: StylistCondition; onBack: () => void }) => {
  const link        = dermnetLinks[condition.id];
  const consumerCond = consumerConditions.find(c => c.id === condition.id);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
      style={{ fontFamily: dm }}
    >
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: dm, fontSize: 13, fontWeight: 500,
          color: green, background: 'none', border: 'none',
          cursor: 'pointer', marginBottom: 20, padding: 0,
        }}
      >
        <ArrowLeft size={15} strokeWidth={2} /> Back
      </button>

      {/* Tag + title */}
      <span style={{
        display: 'inline-block', fontFamily: dm, fontSize: 10, fontWeight: 600,
        padding: '3px 10px', borderRadius: 100, marginBottom: 8,
        ...tagStyle(condition.tag),
      }}>
        {condition.tag}
      </span>
      <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>
        {condition.name}
      </h2>
      <p style={{ fontFamily: dm, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: 24 }}>
        {condition.summary}
      </p>

      {/* Illustrated guide */}
      <SectionLabel>Illustrated guide</SectionLabel>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, marginBottom: 20, WebkitOverflowScrolling: 'touch' as any }}>
        {condition.stages.map((stage, i) => (
          <div key={i} style={{ flexShrink: 0, width: 160 }}>
            <div style={{ width: 160, height: 160, borderRadius: 14, overflow: 'hidden', marginBottom: 8, border: `1.5px solid ${greenBorder}` }}>
              <ScalpIllustration conditionId={condition.id} stageIndex={i} />
            </div>
            <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 2px' }}>{stage.label}</p>
            <p style={{ fontFamily: dm, fontSize: 11, color: 'var(--color-text-secondary)' }}>{stage.annotation}</p>
          </div>
        ))}
      </div>

      {/* Photo gallery placeholders */}
      {consumerCond && (
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Reference photos</SectionLabel>
          <p style={{ fontFamily: dm, fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
            Photos on textured hair and darker skin tones,placeholders for now
          </p>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch' as any }}>
            {consumerCond.photoGallery.map((photo, i) => (
              <div key={i} style={{ flexShrink: 0, width: 200 }}>
                <div style={{
                  width: 200, height: 150, borderRadius: 14,
                  border: `1.5px dashed ${greenBorder}`,
                  background: green10,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8,
                }}>
                  <ImageIcon size={22} color={green} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                  <span style={{ fontFamily: dm, fontSize: 10, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0 12px', lineHeight: 1.4 }}>
                    {photo.description}
                  </span>
                </div>
                <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{photo.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Darker skin note */}
      <div style={{ ...cardStyle, background: green10, borderColor: greenBorder, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Eye size={14} color={green} strokeWidth={1.8} />
          <h4 style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            How it presents on darker skin
          </h4>
        </div>
        <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {condition.darkerSkinNote}
        </p>
      </div>

      {/* Clinical reference link */}
      {link && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Clinical reference photos</SectionLabel>
          <p style={{ fontFamily: dm, fontSize: 11, color: 'var(--color-text-secondary)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 12 }}>
            These clinical photos may not reflect how conditions present on darker skin tones. Use the descriptions and illustrations above as your primary guide.
          </p>
          <a
            href={link.url} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              ...cardStyle, textDecoration: 'none',
            }}
          >
            <Camera size={17} color={green} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{link.name}</p>
              <p style={{ fontFamily: dm, fontSize: 11, color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>View clinical reference photos on DermNet NZ</p>
            </div>
            <ExternalLink size={13} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
          </a>
        </div>
      )}

      {/* Detail sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 80 }}>
        <DetailSection icon={<Eye size={15} color={green} strokeWidth={1.8} />}   title="What it looks like"        content={condition.whatItLooksLike} />
        <DetailSection icon={<Shield size={15} color={green} strokeWidth={1.8} />} title="Where to look"             content={condition.whereToLook} />
        <DetailSection icon={<BookOpen size={15} color={green} strokeWidth={1.8} />} title="What to tell your client" content={condition.whatToTell} italic />
        <DetailSection icon={<ArrowUpRight size={15} color={green} strokeWidth={1.8} />} title="What you can do"    content={condition.whatYouCanDo} />
        <DetailSection icon={<AlertTriangle size={15} color={green} strokeWidth={1.8} />} title="Severity guide"    content={condition.severityGuide} />
      </div>
    </motion.div>
  );
};

const DetailSection = ({ icon, title, content, italic }: {
  icon: React.ReactNode; title: string; content: string; italic?: boolean;
}) => (
  <div style={cardStyle}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      {icon}
      <h3 style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{title}</h3>
    </div>
    <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0, fontStyle: italic ? 'italic' : 'normal' }}>
      {content}
    </p>
  </div>
);

// ─── Referral guide ───────────────────────────────────────────────────────────
const ReferralGuide = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, fontFamily: dm }}>
    {[
      {
        title: 'Your role',
        body: "As a stylist, you see scalps more regularly and more closely than anyone else in your client's life. You're not a doctor and nobody expects you to diagnose anything. But you're in the best position to notice changes early, and early notice is what makes conditions treatable.",
      },
    ].map(s => (
      <div key={s.title} style={cardStyle}>
        <h3 style={{ fontFamily: playfair, fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>{s.title}</h3>
        <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>{s.body}</p>
      </div>
    ))}

    <div style={cardStyle}>
      <h3 style={{ fontFamily: playfair, fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>When to say something</h3>
      <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>Speak up when you see:</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          "Thinning that wasn't there before, especially at the hairline, temples, or crown",
          'Smooth, shiny patches with no hair at all',
          'Redness, bumps, or pimples that don\'t go away',
          'Unusual flaking that\'s different from normal dryness',
          'Patches of broken or missing hair with black dots',
          'Any open wounds, scabbing, or signs of burns',
          'Anything the client asks you about or seems worried about',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: green, flexShrink: 0, marginTop: 5 }} />
            <span style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>

    <div style={cardStyle}>
      <h3 style={{ fontFamily: playfair, fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>How to say it</h3>
      <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>Keep it simple, honest, and kind.</p>
      <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>Good examples:</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {[
          '"I\'ve noticed your edges look a bit thinner than last time. Have you noticed that?"',
          '"There\'s some irritation on your scalp that looks like it might need attention."',
          '"I\'m seeing a patch here that looks different from usual."',
        ].map((ex, i) => (
          <p key={i} style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>{ex}</p>
        ))}
      </div>
      <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 600, color: '#b05040', marginBottom: 6 }}>Don't say:</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[
          ['You have traction alopecia', "that's a diagnosis"],
          ['This looks really bad', 'alarming'],
          ['Just use some oil on it', 'not your role'],
        ].map(([text, note], i) => (
          <p key={i} style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
            "{text}" <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', opacity: 0.6 }}>({note})</span>
          </p>
        ))}
      </div>
    </div>

    <div style={cardStyle}>
      <h3 style={{ fontFamily: playfair, fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>How to refer using FolliSense</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          'Capture what you see (photos and notes)',
          'Share the observation with your client',
          'The client receives it in their personal timeline',
          "They'll have documented history to bring to a professional",
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: green10, border: `1px solid ${greenBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: dm, fontSize: 9, fontWeight: 700, color: green }}>{i + 1}</span>
            </div>
            <span style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, paddingTop: 2 }}>{step}</span>
          </div>
        ))}
      </div>
    </div>

    <div style={cardStyle}>
      <h3 style={{ fontFamily: playfair, fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>Who to suggest they see</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { who: 'Trichologist',  desc: 'Specialises in hair and scalp conditions.' },
          { who: 'Dermatologist', desc: 'A skin specialist who can diagnose and treat.' },
          { who: 'GP',            desc: 'Can do initial assessment and refer onwards.' },
        ].map(r => (
          <div key={r.who} style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: green, flexShrink: 0, marginTop: 5 }} />
            <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{r.who}:</strong> {r.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
const StylistLearnPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConditionId, setSelectedConditionId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'conditions' | 'refer'>('conditions');

  useEffect(() => {
    const conditionParam = searchParams.get('condition');
    if (conditionParam && getConditionById(conditionParam)) {
      setSelectedConditionId(conditionParam);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const selectedCondition = selectedConditionId ? getConditionById(selectedConditionId) : null;

  if (selectedCondition) {
    return (
      <div style={{ padding: '24px 20px 0', maxWidth: 480, margin: '0 auto', fontFamily: dm }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');`}</style>
        <ConditionDetail condition={selectedCondition} onBack={() => setSelectedConditionId(null)} />
      </div>
    );
  }

  let quiz = { totalPoints: 0, currentStreak: 0 };
  try { const s = localStorage.getItem('follisense-quiz'); if (s) quiz = JSON.parse(s); } catch {}

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingBottom: 100, fontFamily: dm }}>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');`}</style>

      {/* ── Dark hero header ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: darkGreen,
        padding: '52px 20px 28px',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(45,110,85,0.3) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
          background: `linear-gradient(to top, ${C.bg}, transparent)`,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#d3ede0' }} />
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 600, color: 'rgba(211,237,224,0.8)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              FolliSense
            </span>
            <span style={{
              fontFamily: dm, fontSize: 9, fontWeight: 600,
              background: '#d3ede0', color: '#1a5c3a',
              border: '1px solid rgba(45,110,85,0.22)',
              padding: '2px 8px', borderRadius: 100, letterSpacing: '0.02em',
            }}>
              Stylist
            </span>
          </div>
          <h1 style={{ fontFamily: playfair, fontSize: 26, fontWeight: 500, color: '#f0f8f4', margin: '0 0 6px', lineHeight: 1.2 }}>
            Reference Guide
          </h1>
          <p style={{ fontFamily: dm, fontSize: 13, color: 'rgba(240,248,244,0.6)', margin: 0 }}>
            Spot it, understand it, refer it
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
        style={{ padding: '20px 20px 0', maxWidth: 480, margin: '0 auto' }}
      >

        {/* ── Disclaimer ────────────────────────────────────────────────────── */}
        <div style={{
          ...cardStyle,
          background: green10, borderColor: greenBorder, marginBottom: 16,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <Info size={15} color={green} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
              A note on images
            </p>
            <p style={{ fontFamily: dm, fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              High-quality clinical images of scalp conditions on darker skin tones are still significantly underrepresented in medical resources. Focus on the descriptions and illustrations. Your eyes on a real scalp will always be more accurate than any reference image.
            </p>
          </div>
        </div>

        {/* ── Quiz card ─────────────────────────────────────────────────────── */}
        <button
          onClick={() => navigate('/stylist/quiz')}
          style={{
            width: '100%', textAlign: 'left',
            background: darkGreen, borderRadius: 18,
            padding: '16px 18px', marginBottom: 20, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', boxShadow: '0 4px 18px rgba(26,77,58,0.25)',
          }}
        >
          <div>
            <p style={{ fontFamily: playfair, fontSize: 15, fontWeight: 500, color: '#f0f8f4', margin: '0 0 3px' }}>Scalp Quiz</p>
            <p style={{ fontFamily: dm, fontSize: 12, color: 'rgba(240,248,244,0.6)', margin: '0 0 8px' }}>Test your eye. Build your confidence.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: dm, fontSize: 11, color: 'rgba(240,248,244,0.6)' }}>
                <Flame size={11} color="#d3ede0" fill="#d3ede0" strokeWidth={0} /> {quiz.currentStreak}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: dm, fontSize: 11, color: 'rgba(240,248,244,0.6)' }}>
                <Star size={11} color="#d3ede0" fill="#d3ede0" strokeWidth={0} /> {quiz.totalPoints} pts
              </span>
            </div>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(211,237,224,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Play size={16} color="#d3ede0" fill="#d3ede0" strokeWidth={0} style={{ marginLeft: 2 }} />
          </div>
        </button>

        {/* ── Section toggle ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 24,
          padding: 4, background: green10, borderRadius: 14,
          border: `1px solid ${greenBorder}`,
        }}>
          {([
            { id: 'conditions' as const, label: 'What am I looking at?' },
            { id: 'refer'      as const, label: 'How to refer' },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveSection(t.id)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
                fontFamily: dm, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
                background: activeSection === t.id ? green : 'transparent',
                color: activeSection === t.id ? '#fff' : 'var(--color-text-secondary)',
                boxShadow: activeSection === t.id ? `0 2px 8px rgba(45,110,85,0.3)` : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Conditions tab ───────────────────────────────────────────────── */}
          {activeSection === 'conditions' && (
            <motion.div
              key="conditions"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            >
              <h2 style={{ fontFamily: playfair, fontSize: 19, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
                Common scalp conditions
              </h2>
              <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Tap any condition to see what it looks like and what to do
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {stylistConditions.map((condition) => {
                  const [hov, setHov] = useState(false);
                  return (
                    <button
                      key={condition.id}
                      onClick={() => setSelectedConditionId(condition.id)}
                      onMouseEnter={() => setHov(true)}
                      onMouseLeave={() => setHov(false)}
                      style={{
                        width: '100%', textAlign: 'left',
                        background: C.card,
                        border: hov ? `1.5px solid rgba(45,110,85,0.45)` : `1.5px solid ${C.border}`,
                        borderRadius: 16, padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        cursor: 'pointer',
                        boxShadow: hov ? C.shadowHover : C.shadow,
                        transition: 'border 0.15s, box-shadow 0.15s',
                        fontFamily: dm,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h3 style={{ fontFamily: dm, fontSize: 14, fontWeight: 600, color: hov ? green : 'var(--color-text-primary)', margin: 0, transition: 'color 0.15s' }}>
                            {condition.name}
                          </h3>
                          <span style={{
                            fontFamily: dm, fontSize: 9, fontWeight: 600,
                            padding: '2px 8px', borderRadius: 100,
                            ...tagStyle(condition.tag),
                          }}>
                            {condition.tag}
                          </span>
                        </div>
                        <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                          {condition.summary}
                        </p>
                      </div>
                      <ChevronRight size={15} color={hov ? green : 'var(--color-text-secondary)'} style={{ flexShrink: 0, transition: 'color 0.15s' }} />
                    </button>
                  );
                })}
              </div>

              {/* Clinical references */}
              <SectionLabel>More clinical references</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {[
                  { name: 'DermNet NZ',          desc: 'Comprehensive dermatology image library',    url: 'https://dermnetnz.org' },
                  { name: 'VisualDx',             desc: 'Clinical decision support with diverse skin images', url: 'https://www.visualdx.com' },
                  { name: 'Skin Deep by VisualDx',desc: 'Dermatology images across skin tones',      url: 'https://www.visualdx.com/skindeep' },
                  { name: 'Brown Skin Matters',   desc: 'Dermatology on darker skin tones',          url: 'https://brownskinmatters.com' },
                ].map(r => (
                  <a
                    key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{r.name}</p>
                      <p style={{ fontFamily: dm, fontSize: 11, color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>{r.desc}</p>
                    </div>
                    <ExternalLink size={13} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
                  </a>
                ))}
              </div>
              <p style={{ fontFamily: dm, fontSize: 11, color: 'var(--color-text-secondary)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 24 }}>
                DermNet NZ is a free, trusted dermatology resource used by medical professionals worldwide. Images are for educational reference only.
              </p>
            </motion.div>
          )}

          {/* ── Refer tab ────────────────────────────────────────────────────── */}
          {activeSection === 'refer' && (
            <motion.div
              key="refer"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            >
              <h2 style={{ fontFamily: playfair, fontSize: 19, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
                When and how to refer
              </h2>
              <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                You're not expected to diagnose. You're expected to notice and act.
              </p>
              <ReferralGuide />
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Why representation matters ────────────────────────────────────── */}
        <div style={{
          ...cardStyle,
          borderLeft: `3px solid ${green}`,
          borderRadius: 16, marginBottom: 80,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Heart size={14} color={green} strokeWidth={1.8} />
            <h3 style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              Why representation matters in clinical education
            </h3>
          </div>
          <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
            Most medical training materials show skin conditions on lighter skin. FolliSense is working to change this.
          </p>
          <button
            onClick={() => toast({ title: 'Thank you', description: "We'll be in touch." })}
            style={{
              height: 40, padding: '0 20px', borderRadius: 12, border: 'none',
              background: green, color: '#fff',
              fontFamily: dm, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            I'd like to help
          </button>
        </div>

      </motion.div>
    </div>
  );
};

export default StylistLearnPage;