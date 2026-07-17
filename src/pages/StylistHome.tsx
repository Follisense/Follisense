import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Play, Zap, Timer, MapPin, ChevronDown, Brain, Target, Trophy } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { dummyLeaderboard } from '@/data/quizQuestions';
import { useState, useEffect, useMemo } from 'react';

// ─── paste any image URL here for the header background ───────────────────
// great options: unsplash.com,search "textured hair", "natural hair care"
// e.g. 'https://images.unsplash.com/photo-xxxxx?w=800&q=80'
const HERO_IMAGE = ''; // ← drop your URL here, leave empty to skip
// ──────────────────────────────────────────────────────────────────────────

interface StylistProfile {
  role: string | string[]; businessName: string; [key: string]: any;
}

const loadStylistProfile = (): StylistProfile | null => {
  try {
    const saved = localStorage.getItem('follisense-stylist-profile');
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
};

const loadQuizState = () => {
  try {
    const saved = localStorage.getItem('follisense-quiz');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { totalPoints: 0, currentStreak: 0, bestStreak: 0, challengeHighScore: 0 };
};

const dm = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";
const green = '#2d6e55';
const darkGreen = '#1a4d3a';

const StylistHome = () => {
  const navigate = useNavigate();
  const { clientObservations, userName } = useApp();
  const [quiz, setQuiz] = useState(loadQuizState);
  const [locationFilter, setLocationFilter] = useState('All locations');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [hasAttemptedQuiz, setHasAttemptedQuiz] = useState(false);

  useEffect(() => {
    const handler = () => setQuiz(loadQuizState());
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, []);

  useEffect(() => {
    setHasAttemptedQuiz(quiz.totalPoints > 0 || quiz.bestStreak > 0);
  }, [quiz]);

  const stylistProfile = loadStylistProfile();

  const locationNames = useMemo(() => {
    const names = new Set<string>();
    clientObservations.forEach(o => { if (o.location) names.add(o.location); });
    return ['All locations', ...Array.from(names)];
  }, [clientObservations]);

  const filteredObservations = useMemo(() => {
    if (locationFilter === 'All locations') return clientObservations;
    return clientObservations.filter(o => o.location === locationFilter);
  }, [clientObservations, locationFilter]);

  const userEntry = { rank: 5, name: 'You', points: quiz.totalPoints, bestStreak: quiz.bestStreak };
  const leaderboard = [...dummyLeaderboard, userEntry]
    .sort((a, b) => b.points - a.points)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  const userRank = leaderboard.find(e => e.name === 'You')?.rank ?? 5;
  const nextUp = leaderboard[userRank - 2];
  const ptsGap = nextUp ? nextUp.points - quiz.totalPoints : 0;

  const riskColor = (risk: string) => {
    if (risk === 'green') return { bg: '#d3ede0', color: '#1e5c3f', label: 'Low' };
    if (risk === 'amber') return { bg: '#faeacc', color: '#7a5212', label: 'Monitor' };
    return { bg: '#fad9d7', color: '#7a2020', label: 'Refer' };
  };

  const roleDisplay = (() => {
    if (!stylistProfile?.role) return null;
    const roles = Array.isArray(stylistProfile.role)
      ? stylistProfile.role.filter((r: string) => r !== 'Other')
      : [stylistProfile.role];
    if (stylistProfile.otherRole) roles.push(stylistProfile.otherRole);
    const display = roles.length > 2
      ? `${roles.slice(0, 2).join(' and ')} + ${roles.length - 2} more`
      : roles.join(' and ');
    return `${display}${stylistProfile.businessName ? ` at ${stylistProfile.businessName}` : ''}`;
  })();

  return (
    <div style={{ fontFamily: dm, background: 'var(--color-background-tertiary)', paddingBottom: 100, maxWidth: 480, margin: '0 auto' }}>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');`}</style>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

        {/* ── Header,with optional hero image fading into background ── */}
        <div style={{ position: 'relative', padding: '28px 20px 24px', overflow: 'hidden' }}>

          {/* Background image, fades out at the bottom */}
          {HERO_IMAGE && (
            <>
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${HERO_IMAGE})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
                opacity: 0.15,
              }} />
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%',
                background: 'linear-gradient(to bottom, transparent, var(--color-background-tertiary))',
              }} />
            </>
          )}

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: green }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                FolliSense
              </span>
              {/* Green tinted stylist badge */}
              <span style={{
                fontSize: 10, fontWeight: 600,
                background: '#d3ede0',
                color: '#1a5c3a',
                border: '1px solid rgba(45,110,85,0.22)',
                padding: '2px 9px',
                borderRadius: 100,
                letterSpacing: '0.02em',
              }}>
                Stylist
              </span>
            </div>
            <h1 style={{ fontFamily: playfair, fontSize: 28, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.2, margin: '0 0 4px' }}>
              Hi {userName || 'there'}
            </h1>
            {roleDisplay && (
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>{roleDisplay}</p>
            )}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => navigate('/stylist/quick-intake')}
              style={{ borderRadius: 16, padding: '18px 16px', border: 'none', background: green, textAlign: 'left', cursor: 'pointer', fontFamily: dm, transition: 'transform 0.12s' }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Target size={16} color="rgba(255,255,255,0.9)" strokeWidth={2.2} />
              </div>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>Quick Intake</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>New client fast</span>
            </button>

            <button
              onClick={() => navigate('/stylist/observation')}
              style={{ borderRadius: 16, padding: '18px 16px', border: '1.5px solid rgba(45,110,85,0.18)', background: 'var(--color-background-primary)', textAlign: 'left', cursor: 'pointer', fontFamily: dm, transition: 'transform 0.12s', boxShadow: '0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#e8f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Plus size={16} color={green} strokeWidth={2.2} />
              </div>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>Full Observation</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Detailed notes</span>
            </button>
          </div>
        </div>

        {/* ── Quiz card ── */}
        <div style={{ padding: '0 20px', marginBottom: 24 }}>
          <div style={{ borderRadius: 20, overflow: 'hidden', background: darkGreen, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 64, opacity: 0.08, pointerEvents: 'none', lineHeight: 1 }}>🧠</div>
            <div style={{ padding: 22, position: 'relative' }}>
              <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.12)', padding: '3px 10px', borderRadius: 100, marginBottom: 12 }}>
                Scalp IQ
              </span>
              <p style={{ fontFamily: playfair, fontSize: 20, fontWeight: 500, color: '#fff', margin: '0 0 6px', lineHeight: 1.25 }}>
                Test Your Clinical Eye
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, margin: '0 0 18px', maxWidth: 220 }}>
                {hasAttemptedQuiz
                  ? 'Keep building your clinical eye. Every question makes you sharper.'
                  : 'How much do you really know about scalp conditions? 5 questions.'}
              </p>

              <div style={{ display: 'flex', gap: 18, marginBottom: 18, alignItems: 'center' }}>
                {[
                  { val: quiz.totalPoints, label: 'Points' },
                  { val: quiz.currentStreak, label: 'Streak' },
                  { val: `#${userRank}`, label: 'Rank' },
                ].map((s, i) => (
                  <>
                    {i > 0 && <div key={`div-${i}`} style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />}
                    <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{s.val}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{s.label}</span>
                    </div>
                  </>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => navigate('/stylist/quiz')}
                  style={{ flex: 1, height: 42, borderRadius: 12, border: 'none', background: '#fff', color: darkGreen, fontFamily: dm, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Play size={14} fill={darkGreen} strokeWidth={0} />
                  {hasAttemptedQuiz ? 'Play Again' : 'Start Quiz'}
                </button>
                <button
                  onClick={() => navigate('/stylist/quiz?mode=challenge')}
                  style={{ height: 42, padding: '0 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', fontFamily: dm, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Zap size={13} />
                  Challenge
                </button>
              </div>
            </div>
          </div>

          {/* ── Rank nudge ── */}
          <div style={{
            marginTop: 10,
            background: 'var(--color-background-primary)',
            border: '1.5px solid rgba(45,110,85,0.14)',
            borderRadius: 14,
            padding: '11px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#e8f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trophy size={14} color={green} strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                Ranked <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>#{userRank}</strong>
                {nextUp
                  ? <>,<strong style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{ptsGap} pts</strong> behind {nextUp.name}</>
                  : <>,you're at the top!</>}
              </span>
            </div>
            <button
              onClick={() => navigate('/stylist/leaderboard')}
              style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 600,
                color: green,
                background: '#e8f4ef',
                border: '1px solid rgba(45,110,85,0.2)',
                borderRadius: 8,
                padding: '5px 11px',
                cursor: 'pointer',
                fontFamily: dm,
                whiteSpace: 'nowrap' as const,
                letterSpacing: '0.01em',
              }}
            >
              View board
            </button>
          </div>
        </div>

        {/* ── Weekly challenge ── */}
        <div style={{ padding: '0 20px', marginBottom: 24 }}>
          <div style={{
            background: 'var(--color-background-primary)',
            border: '1.5px solid rgba(45,110,85,0.14)',
            borderRadius: 16,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#e8f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Timer size={18} color={green} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 2px' }}>Weekly Challenge</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0 }}>10 seconds per question,faster = more pts</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1 }}>{quiz.challengeHighScore || 0}</p>
              <p style={{ fontSize: 10, color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>high score</p>
            </div>
          </div>
        </div>

        {/* ── Recent observations ── */}
        <div style={{ padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--color-text-secondary)' }}>
              Recent observations
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {locationNames.length > 2 && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm }}
                  >
                    <MapPin size={11} /> {locationFilter} <ChevronDown size={11} />
                  </button>
                  {showLocationDropdown && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', zIndex: 10, minWidth: 160 }}>
                      {locationNames.map(name => (
                        <button key={name} onClick={() => { setLocationFilter(name); setShowLocationDropdown(false); }}
                          style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 12, color: locationFilter === name ? green : 'var(--color-text-primary)', fontWeight: locationFilter === name ? 500 : 400, background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm }}>
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => navigate('/stylist/clients')} style={{ fontSize: 11, fontWeight: 500, color: green, background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm }}>
                See all →
              </button>
            </div>
          </div>

          {filteredObservations.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '32px 0' }}>
              No observations yet. Tap "Quick Intake" to get started.
            </p>
          ) : (
            filteredObservations.slice(0, 5).map(obs => {
              const risk = riskColor(obs.risk);
              return (
                <div key={obs.id} style={{ background: 'var(--color-background-primary)', border: '1.5px solid rgba(45,110,85,0.12)', borderRadius: 14, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: '#e8f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: green, flexShrink: 0 }}>
                    {obs.clientName.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                      {obs.clientName}{obs.location ? `,${obs.location}` : ''}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '1px 0 0' }}>
                      {obs.date}{obs.locationCity ? `, ${obs.locationCity}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' as const, padding: '4px 10px', borderRadius: 100, background: risk.bg, color: risk.color, flexShrink: 0 }}>
                    {risk.label}
                  </span>
                </div>
              );
            })
          )}
        </div>

      </motion.div>

      {/* ── Quiz FAB ── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        onClick={() => navigate('/stylist/quiz')}
        style={{ position: 'fixed', bottom: 28, right: 20, display: 'flex', alignItems: 'center', gap: 8, background: green, color: '#fff', border: 'none', borderRadius: 100, padding: '13px 18px', fontFamily: dm, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(45,110,85,0.35)', zIndex: 40 }}
      >
        <Brain size={16} />
        Quiz
        {!hasAttemptedQuiz && (
          <span style={{ position: 'absolute', top: -4, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#c0392b', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>
        )}
      </motion.button>
    </div>
  );
};

export default StylistHome;