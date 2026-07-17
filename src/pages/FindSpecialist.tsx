import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:         '#0A0908',
  surface:    '#101512',
  card:       '#101A14',
  cardBorder: 'rgba(110,158,130,0.12)',
  ink:        '#EAF0E9',
  sub:        'rgba(234,240,233,0.45)',
  warm:       'rgba(234,240,233,0.65)',
  gold:       '#6E9E82',
  goldDeep:   '#4E7A63',
  gold10:     'rgba(110,158,130,0.10)',
  gold20:     'rgba(110,158,130,0.18)',
  goldBorder: 'rgba(110,158,130,0.30)',
  mid:        'rgba(234,240,233,0.10)',
};

const FindSpecialist = () => {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleNotify = () => {
    if (!email.includes('@')) {
      toast({ title: 'Enter a valid email', description: 'Please enter your email address.' });
      return;
    }
    setSubmitted(true);
    toast({ title: "You're on the list!", description: "We'll notify you when the specialist directory is ready." });
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: dm }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(234,240,233,0.25); font-family: 'DM Sans', sans-serif; }
        input:focus { outline: none; border-color: rgba(110,158,130,0.5) !important; }
      `}</style>

      {/* ── HERO ── */}
      <div style={{
        background: `radial-gradient(ellipse 160% 120% at 50% -10%, rgba(110,158,130,0.10) 0%, transparent 55%), linear-gradient(180deg, #101512 0%, #0A0908 100%)`,
        padding: '52px 20px 44px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Grain */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.2, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")` }} />
        {/* Corner glow */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(110,158,130,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48, position: 'relative' }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={16} color={C.sub} strokeWidth={1.8} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: 'rgba(110,158,130,0.85)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>FolliSense</span>
          </div>
          <div style={{ width: 36 }} />
        </div>

        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, position: 'relative' }}
        >
          <div style={{ position: 'relative' }}>
            {/* Outer glow rings */}
            <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: `radial-gradient(circle, rgba(110,158,130,0.15) 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: `1px solid rgba(110,158,130,0.18)`, pointerEvents: 'none' }} />
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: `radial-gradient(circle at 35% 35%, rgba(110,158,130,0.25) 0%, rgba(110,158,130,0.08) 100%)`,
              border: `1.5px solid rgba(110,158,130,0.35)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 32px rgba(110,158,130,0.15), inset 0 1px 0 rgba(110,158,130,0.2)`,
            }}>
              {/* Stethoscope icon built from SVG */}
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 3H5a2 2 0 0 0-2 2v4a6 6 0 0 0 6 6 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2h-4" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 7h3M21 7h-3" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M15 13a6 6 0 0 0 6 6v0a3 3 0 0 1-3 3h-1" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="11" cy="22" r="1" fill={C.gold}/>
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 100, padding: '4px 14px', marginBottom: 14 }}>
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Coming soon</span>
          </div>
          <h1 style={{ fontFamily: playfair, fontSize: 26, fontWeight: 500, color: C.ink, margin: '0 0 10px', lineHeight: 1.2 }}>
            Find a Specialist
          </h1>
          <p style={{ fontFamily: dm, fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.65, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
            We're building a curated directory of trichologists, dermatologists, and GPs who understand textured hair.
          </p>
        </motion.div>

        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(110,158,130,0.25), transparent)`, marginTop: 36 }} />
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '24px 20px 80px' }}>

        {/* What to expect cards */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[
            { emoji: '🔍', title: 'Verified specialists', desc: 'Every professional is vetted for experience with textured hair and scalp conditions.' },
            { emoji: '📍', title: 'Local to you', desc: 'Find trichologists, dermatologists, and GPs near you in Kenya and beyond.' },
            { emoji: '📋', title: 'Share your summary', desc: 'Send your FolliSense clinical summary directly to your chosen specialist.' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.07 }}
              style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{item.emoji}</span>
              <div>
                <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>{item.title}</p>
                <p style={{ fontFamily: dm, fontSize: 12, color: C.sub, margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Email notify card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          style={{
            background: C.card,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 22,
            padding: '22px 20px',
            marginBottom: 16,
            position: 'relative', overflow: 'hidden',
          }}>
          {/* Top accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)` }} />

          {!submitted ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: C.gold10, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={16} color={C.gold} strokeWidth={1.8} />
                </div>
                <p style={{ fontFamily: dm, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0 }}>Get notified when it's ready</p>
              </div>
              <p style={{ fontFamily: dm, fontSize: 12, color: C.sub, margin: '0 0 16px', lineHeight: 1.6 }}>
                Be first to access the specialist directory when it launches.
              </p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                onKeyDown={e => e.key === 'Enter' && handleNotify()}
                style={{
                  width: '100%', height: 48, padding: '0 16px',
                  borderRadius: 14, border: `1.5px solid rgba(110,158,130,0.20)`,
                  background: 'rgba(110,158,130,0.06)',
                  fontFamily: dm, fontSize: 14, color: C.ink,
                  marginBottom: 12, display: 'block',
                  transition: 'border-color 0.15s',
                }}
              />
              <button onClick={handleNotify} style={{
                width: '100%', height: 50, borderRadius: 16, border: 'none',
                background: `linear-gradient(135deg, #1A2820 0%, #23392C 50%, #101A14 100%)`,
                color: '#F5EFE6', fontFamily: dm, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 16px rgba(110,158,130,0.08)`,
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, rgba(110,158,130,0.45), transparent)` }} />
                Notify me
              </button>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(90,154,80,0.12)', border: `2px solid rgba(90,154,80,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <CheckCircle size={24} color="#5A9A50" strokeWidth={2} />
              </div>
              <p style={{ fontFamily: playfair, fontSize: 17, fontWeight: 500, color: C.ink, margin: '0 0 6px' }}>You're on the list</p>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.6 }}>
                We'll email you at <strong style={{ color: C.warm }}>{email}</strong> when the specialist directory is ready.
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Back button */}
        <motion.button
          onClick={() => navigate(-1)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
          style={{
            width: '100%', height: 52, borderRadius: 16,
            border: `1px solid rgba(234,240,233,0.10)`,
            background: 'rgba(234,240,233,0.04)',
            color: C.sub, fontFamily: dm, fontSize: 14, fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Back
        </motion.button>
      </div>
    </div>
  );
};

export default FindSpecialist;