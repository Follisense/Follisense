import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Eye, AlertCircle, ArrowLeft, Search, ChevronRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { computeCheckInStatus, getTriageGuidance } from '@/utils/checkInRules';
import { scoreSymptoms, scoreToRiskWithFlags } from '@/utils/symptomScoring';
import type { HealthProfileData } from '@/contexts/AppContext';
import HairEventPrompt from '@/components/HairEventPrompt';
const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";


type RiskLevel = 'green' | 'amber' | 'red';

const C = {
  bg:          '#0A0908',
  surface:     '#1A1612',
  card:        '#1C1814',
  cardBorder:  'rgba(212,168,102,0.10)',
  ink:         '#F5EFE6',
  sub:         'rgba(245,239,230,0.42)',
  warm:        'rgba(245,239,230,0.68)',
  gold:        '#D4A866',
  goldDeep:    '#B8893E',
  gold10:      'rgba(212,168,102,0.10)',
  goldBorder:  'rgba(212,168,102,0.28)',
  green:       '#4EC9A0',
  green10:     'rgba(78,201,160,0.10)',
  greenBorder: 'rgba(78,201,160,0.28)',
  greenGlow:   'rgba(78,201,160,0.35)',
  amber:       '#E8A830',
  amber10:     'rgba(232,168,48,0.10)',
  amberBorder: 'rgba(232,168,48,0.30)',
  amberGlow:   'rgba(232,168,48,0.40)',
  red:         '#E05555',
  red10:       'rgba(224,85,85,0.10)',
  redBorder:   'rgba(224,85,85,0.30)',
  redGlow:     'rgba(224,85,85,0.45)',
};

const riskConfig = {
  green: {
    color:      C.green,
    bg:         C.green10,
    border:     C.greenBorder,
    glow:       C.greenGlow,
    label:      'All clear',
    headline:   'Looking settled',
    sub:        "Nothing's flagging today. Keep your routine going,we'll check in again on wash day.",
    heroBg:     'radial-gradient(ellipse 160% 120% at 50% -10%, rgba(78,201,160,0.15) 0%, transparent 55%), linear-gradient(180deg, #0D1612 0%, #0A0908 100%)',
    accentLine: `linear-gradient(90deg, transparent, rgba(78,201,160,0.5), transparent)`,
    pulse:      'rgba(78,201,160,0.2)',
  },
  amber: {
    color:      C.amber,
    bg:         C.amber10,
    border:     C.amberBorder,
    glow:       C.amberGlow,
    label:      'Worth watching',
    headline:   'Worth watching',
    sub:        "A few changes are worth keeping an eye on. Let's ease the load where we can and check again next time.",
    heroBg:     'radial-gradient(ellipse 160% 120% at 50% -10%, rgba(232,168,48,0.15) 0%, transparent 55%), linear-gradient(180deg, #161208 0%, #0A0908 100%)',
    accentLine: `linear-gradient(90deg, transparent, rgba(232,168,48,0.5), transparent)`,
    pulse:      'rgba(232,168,48,0.2)',
  },
  red: {
    color:      C.red,
    bg:         C.red10,
    border:     C.redBorder,
    glow:       C.redGlow,
    label:      'See a professional',
    headline:   'Time to get it checked',
    sub:        "A few signs are showing up together. Worth seeing someone,we've put together a summary to bring.",
    heroBg:     'radial-gradient(ellipse 160% 120% at 50% -10%, rgba(224,85,85,0.18) 0%, transparent 55%), linear-gradient(180deg, #160A0A 0%, #0A0908 100%)',
    accentLine: `linear-gradient(90deg, transparent, rgba(224,85,85,0.5), transparent)`,
    pulse:      'rgba(224,85,85,0.2)',
  },
};

const hasTelogenTriggers = (hp: HealthProfileData): string[] => {
  const triggers: string[] = [];
  if (hp.pregnancyStatus === 'Postpartum (within 12 months)') triggers.push('postpartum status');
  const valid = (hp.recentStressors || []).filter(s => s !== 'None of these' && s !== 'Prefer not to say');
  triggers.push(...valid);
  return triggers;
};

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

const Card = ({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.cardBorder}`,
    borderRadius: 20, padding: '20px 22px', marginBottom: 12,
    position: 'relative', overflow: 'hidden', fontFamily: dm,
    ...style,
  }}>
    {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent }} />}
    {children}
  </div>
);

const Dot = ({ color }: { color: string }) => (
  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 6, boxShadow: `0 0 6px ${color}` }} />
);

const NumberBadge = ({ n, color }: { n: number; color: string }) => (
  <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${color}18`, border: `1px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 8px ${color}30` }}>
    <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color }}>{n}</span>
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const CheckInSummary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentCheckIn, riskOverride, setRiskOverride, healthProfile, onboardingData, checkInHistory } = useApp();

  const isMale    = onboardingData.gender === 'man';
  const paramRisk = searchParams.get('risk') as RiskLevel | null;

  // Track whether a severe shedding / itch symptom forced the risk floor up to amber.
  let severeFlagActive = false;

  let historicalRisk: RiskLevel = 'green';
  try {
    if (currentCheckIn) {
      // Composite score, with a safety floor: severe shedding or severe itch
      // can never read as green,it is floored at amber. Red still requires
      // the composite total to agree.
      const scores = scoreSymptoms(currentCheckIn as unknown as Record<string, string>);
      historicalRisk = scoreToRiskWithFlags(scores);
      severeFlagActive = scores.shedding >= 3 || scores.itch >= 3;
    }
  }
  catch (e) {
    console.error('[CheckInSummary]', e);
        try { historicalRisk = currentCheckIn ? computeCheckInStatus(currentCheckIn, checkInHistory) : 'green'; }
    catch {}
  }

  const risk = (paramRisk || riskOverride || historicalRisk) as RiskLevel;
  const cfg  = riskConfig[risk];

  // Which severe symptom(s) triggered the floor,used for the amber notice.
  const severeFlagSymptoms: string[] = [];
  if (severeFlagActive && currentCheckIn) {
    try {
      const s = scoreSymptoms(currentCheckIn as unknown as Record<string, string>);
      if (s.shedding >= 3) severeFlagSymptoms.push('shedding');
      if (s.itch >= 3)     severeFlagSymptoms.push('itching');
    } catch {}
  }

  let triageGuidance: { heading: string; message: string }[] = [];
  try { triageGuidance = currentCheckIn ? getTriageGuidance(risk, currentCheckIn, checkInHistory) : []; }
  catch (e) { console.error('[CheckInSummary]', e); }

  const telogenTriggers = hasTelogenTriggers(healthProfile);

  const handleLogoTap = () => {
    const order: RiskLevel[] = ['green', 'amber', 'red'];
    setRiskOverride(order[(order.indexOf(risk) + 1) % 3]);
  };

  return (
    <div style={{ fontFamily: dm, background: C.bg, minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }

        @keyframes pulse-ring {
          0%   { transform: scale(1);    opacity: 0.6; }
          50%  { transform: scale(1.12); opacity: 0.2; }
          100% { transform: scale(1),   opacity: 0.6; }
        }
        @keyframes pulse-ring-slow {
          0%   { transform: scale(1);    opacity: 0.3; }
          50%  { transform: scale(1.22); opacity: 0.0; }
          100% { transform: scale(1);    opacity: 0.3; }
        }
        @keyframes shimmer {
          0%   { opacity: 0.4; }
          50%  { opacity: 1;   }
          100% { opacity: 0.4; }
        }
        .pulse-ring {
          animation: pulse-ring 2.2s ease-in-out infinite;
        }
        .pulse-ring-slow {
          animation: pulse-ring-slow 2.8s ease-in-out infinite 0.4s;
        }
        .shimmer-text {
          animation: shimmer 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', background: cfg.heroBg, padding: '0 0 44px', overflow: 'hidden' }}>

        {/* Grain */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")` }} />

        {/* Corner glow */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle, ${cfg.color}20 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${cfg.color}10 0%, transparent 70%)`, pointerEvents: 'none' }} />

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 20px 0' }}>
          <button onClick={() => navigate('/home')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={15} color={C.sub} strokeWidth={1.8} />
          </button>
          <button onClick={handleLogoTap} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, boxShadow: `0 0 8px ${C.gold}` }} />
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: 'rgba(212,168,102,0.85)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>FolliSense</span>
          </button>
          <div style={{ width: 34 }} />
        </div>

        {/* Risk circle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40 }}>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ position: 'relative', marginBottom: 26 }}
          >
            {/* Outermost slow pulse ring */}
            <div className="pulse-ring-slow" style={{
              position: 'absolute', inset: -28, borderRadius: '50%',
              border: `1px solid ${cfg.color}`,
              opacity: 0.15, pointerEvents: 'none',
            }} />
            {/* Pulse ring */}
            <div className="pulse-ring" style={{
              position: 'absolute', inset: -14, borderRadius: '50%',
              border: `1.5px solid ${cfg.color}`,
              opacity: 0.3, pointerEvents: 'none',
            }} />
            {/* Crisp static ring,a defined single-line frame, distinct from the soft pulses */}
            <div style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              border: `1px solid ${cfg.color}55`,
              pointerEvents: 'none',
            }} />
            {/* Glow halo */}
            <div style={{
              position: 'absolute', inset: -20, borderRadius: '50%',
              background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            {/* Main circle */}
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, ${cfg.color}40 0%, ${cfg.color}18 60%, ${cfg.color}08 100%)`,
              border: `2px solid ${cfg.color}70`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 32px ${cfg.glow}, 0 0 64px ${cfg.pulse}, inset 0 1px 0 ${cfg.color}30`,
            }}>
              {risk === 'green' && <Check       size={38} color={cfg.color} strokeWidth={2.5} style={{ filter: `drop-shadow(0 0 8px ${cfg.color})` }} />}
              {risk === 'amber' && <Eye         size={38} color={cfg.color} strokeWidth={2}   style={{ filter: `drop-shadow(0 0 8px ${cfg.color})` }} />}
              {risk === 'red'   && <AlertCircle size={38} color={cfg.color} strokeWidth={1.8} style={{ filter: `drop-shadow(0 0 8px ${cfg.color})` }} />}
            </div>
          </motion.div>

          {/* Label pill */}
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              borderRadius: 100, padding: '5px 16px', marginBottom: 16,
              boxShadow: `0 0 16px ${cfg.pulse}`,
            }}
          >
            <span className="shimmer-text" style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
              {cfg.label}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            style={{ fontFamily: playfair, fontSize: 24, fontWeight: 500, color: C.ink, textAlign: 'center', margin: '0 0 10px', lineHeight: 1.2, padding: '0 28px' }}
          >
            {cfg.headline}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }}
            style={{ fontFamily: dm, fontSize: 13, color: C.sub, textAlign: 'center', margin: 0, lineHeight: 1.6, padding: '0 36px', maxWidth: 340 }}
          >
            {cfg.sub}
          </motion.p>
        </div>

        {/* Accent divider */}
        <div style={{ height: 1, background: cfg.accentLine, marginTop: 38, boxShadow: `0 0 12px ${cfg.pulse}` }} />
      </div>

      {/* ── BODY ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.44, duration: 0.4 }}
        style={{ padding: '22px 20px 100px' }}
      >

        {/* ══ SEVERE-SYMPTOM NOTICE,shows on amber when a severe shedding/itch
              symptom lifted the result up from green ══ */}
        {risk === 'amber' && severeFlagActive && severeFlagSymptoms.length > 0 && (
          <Card style={{ background: `${C.amber}12`, borderColor: `${C.amber}40` }}>
            <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.amber, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px', textShadow: `0 0 10px ${C.amber}60` }}>
              ⚠ Flagged for review
            </p>
            <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.7, margin: 0 }}>
              You reported severe {severeFlagSymptoms.join(' and ')}. Even though your other
              symptoms are mild, a symptom this strong on its own is worth keeping a close eye
              on,so we've moved you to "worth watching" rather than all clear.
            </p>
          </Card>
        )}

        {/* ══ GREEN ══ */}
        {risk === 'green' && (
          <>
            <Card accent={`linear-gradient(90deg, ${C.green}, transparent)`} style={{ borderColor: `${C.green}22` }}>
              <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px', textShadow: `0 0 12px ${C.green}` }}>Keep it up</p>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.7, margin: 0 }}>
                Nothing's flagging today, so keep doing what you're doing. We'll check in again at your next wash day,consistency is what makes the difference over time.
              </p>
            </Card>

            <Card style={{ background: `${C.green}0A`, borderColor: `${C.green}25` }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
                <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.7, margin: 0 }}>
                  A gentle scalp massage with your fingertips for 2–3 minutes can improve circulation without any product needed. Best done on wash day.
                </p>
              </div>
            </Card>

          <HairEventPrompt />
            <button onClick={() => navigate('/home')} style={{ width: '100%', height: 54, borderRadius: 18, border: 'none', background: `linear-gradient(135deg, #1A2018 0%, #0E1A0C 60%, #0A0908 100%)`, color: C.green, fontFamily: dm, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8, boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 20px ${C.green}18`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.green}50, transparent)` }} />
              Back to dashboard
            </button>
          </>
        )}

        {/* ══ AMBER ══ */}
        {risk === 'amber' && (
          <>
            {triageGuidance.length > 0 && (
              <Card accent={`linear-gradient(90deg, ${C.amber}, transparent)`} style={{ borderColor: `${C.amber}25` }}>
                <p style={{ fontFamily: playfair, fontSize: 16, fontWeight: 500, color: C.ink, margin: '0 0 16px' }}>What influenced this</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {triageGuidance.map((g, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Dot color={C.amber} />
                      <div>
                        <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.amber, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 4px', textShadow: `0 0 10px ${C.amber}60` }}>{g.heading}</p>
                        <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, margin: 0, lineHeight: 1.65 }}>{g.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <p style={{ fontFamily: playfair, fontSize: 16, fontWeight: 500, color: C.ink, margin: '0 0 16px' }}>Before your next style</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Gently cleanse your scalp with a sulphate-free rinse',
                  "Go looser and lighter at the hairline this time,if edges are loose, leave them",
                  'If dry or tight, use a fragrance-free scalp mist. Avoid heavy oils directly on the scalp.',
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <NumberBadge n={i + 1} color={C.amber} />
                    <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, margin: 0, lineHeight: 1.65 }}>{tip}</p>
                  </div>
                ))}
              </div>
            </Card>

            {telogenTriggers.length > 0 && (
              <Card style={{ background: `${C.amber}0A`, borderColor: `${C.amber}28` }}>
                <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.amber, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px', textShadow: `0 0 10px ${C.amber}60` }}>Worth knowing</p>
                <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.7, margin: 0 }}>
                  You've mentioned {telogenTriggers.join(', ')}. Increased shedding can be a temporary response called telogen effluvium,it usually resolves within 6–12 months, but tracking helps.
                </p>
              </Card>
            )}

            <Card>
              <p style={{ fontFamily: playfair, fontSize: 16, fontWeight: 500, color: C.ink, margin: '0 0 6px' }}>We'll check again next takedown</p>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.65, margin: '0 0 16px' }}>At your next check-in we'll compare. If things get worse before then, check in anytime.</p>
              <button onClick={() => navigate('/find-specialist')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', background: `${C.amber}0F`, border: `1px solid ${C.amber}35`, borderRadius: 14, cursor: 'pointer', textAlign: 'left', boxShadow: `0 0 16px ${C.amber}15` }}>
                <span style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.amber }}>Find a specialist</span>
                <ChevronRight size={15} color={C.amber} strokeWidth={1.8} />
              </button>
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <button onClick={() => navigate('/mid-cycle')} style={{ width: '100%', height: 48, borderRadius: 16, border: `1.5px solid ${C.amber}40`, background: `${C.amber}10`, color: C.amber, fontFamily: dm, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: `0 0 16px ${C.amber}18` }}>
                Start an early check-in
              </button>
              <HairEventPrompt />
              <button onClick={() => navigate('/home')} style={{ width: '100%', height: 54, borderRadius: 18, border: 'none', background: `linear-gradient(135deg, #1E1608 0%, #16120A 60%, #0A0908 100%)`, color: C.amber, fontFamily: dm, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 20px ${C.amber}18`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.amber}55, transparent)` }} />
                Back to dashboard
              </button>
            </div>
          </>
        )}

        {/* ══ RED ══ */}
        {risk === 'red' && (
          <>
            {/* Urgent banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 }}
              style={{
                background: `linear-gradient(135deg, ${C.red}22 0%, ${C.red}10 100%)`,
                border: `1.5px solid ${C.red}50`,
                borderRadius: 18, padding: '16px 20px', marginBottom: 12,
                boxShadow: `0 0 30px ${C.red}25, inset 0 1px 0 ${C.red}20`,
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.red}, transparent)`, boxShadow: `0 0 12px ${C.red}` }} />
              <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.red, letterSpacing: '0.13em', textTransform: 'uppercase', margin: '0 0 6px', textShadow: `0 0 12px ${C.red}` }}>⚠ Action recommended</p>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.65, margin: 0 }}>
                              What you have logged has kept up over several check-ins. That is worth showing to someone who can examine your scalp properly, and the earlier you do, the more options you tend to have.
              </p>
            </motion.div>

            {triageGuidance.length > 0 && (
              <Card accent={`linear-gradient(90deg, ${C.red}, transparent)`} style={{ borderColor: `${C.red}28` }}>
                <p style={{ fontFamily: playfair, fontSize: 16, fontWeight: 500, color: C.ink, margin: '0 0 16px' }}>What influenced this</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {triageGuidance.map((g, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Dot color={C.red} />
                      <div>
                        <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.red, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 4px', textShadow: `0 0 10px ${C.red}60` }}>{g.heading}</p>
                        <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, margin: 0, lineHeight: 1.65 }}>{g.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {telogenTriggers.length > 0 && (
              <Card style={{ background: `${C.gold}0A`, borderColor: `${C.gold}28` }}>
                <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Worth knowing</p>
                <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.7, margin: 0 }}>
                  You've mentioned {telogenTriggers.join(', ')}. Increased shedding can be a temporary response called telogen effluvium,it usually resolves within 6–12 months.
                </p>
              </Card>
            )}

            <Card>
              <p style={{ fontFamily: playfair, fontSize: 16, fontWeight: 500, color: C.ink, margin: '0 0 6px' }}>Bring this to whoever you see</p>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.65, margin: '0 0 16px' }}>
                It's what you reported, not a diagnosis,a structured summary generated automatically from your symptom patterns.
              </p>
              <button onClick={() => navigate('/clinician-summary')} style={{ width: '100%', height: 46, borderRadius: 14, border: `1.5px solid ${C.red}35`, background: `${C.red}0F`, color: C.ink, fontFamily: dm, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: `0 0 14px ${C.red}15` }}>
                View your summary
              </button>
            </Card>

            <Card>
              <p style={{ fontFamily: playfair, fontSize: 16, fontWeight: 500, color: C.ink, margin: '0 0 6px' }}>Who to see</p>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.65, margin: '0 0 16px' }}>
                A trichologist specialises in hair and scalp. A dermatologist can investigate further. Your GP can refer you.
                {isMale && ' Your barber may also notice changes,ask them to flag anything they see.'}
              </p>
              <button onClick={() => navigate('/find-specialist')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', background: `${C.red}0F`, border: `1px solid ${C.red}38`, borderRadius: 14, cursor: 'pointer', textAlign: 'left', boxShadow: `0 0 16px ${C.red}18` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Search size={13} color={C.red} strokeWidth={1.8} style={{ filter: `drop-shadow(0 0 4px ${C.red})` }} />
                  <span style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.red }}>Find someone near me</span>
                </div>
                <ChevronRight size={15} color={C.red} strokeWidth={1.8} />
              </button>
            </Card>

            <button onClick={() => navigate('/home')} style={{ width: '100%', height: 54, borderRadius: 18, border: 'none', background: `linear-gradient(135deg, #1E0A0A 0%, #160808 60%, #0A0908 100%)`, color: C.red, fontFamily: dm, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8, boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 24px ${C.red}20`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.red}60, transparent)`, boxShadow: `0 0 8px ${C.red}` }} />
              Back to dashboard
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default CheckInSummary;