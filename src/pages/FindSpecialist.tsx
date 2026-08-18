import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, CheckCircle, ShieldCheck, MapPin, FileText, Stethoscope } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

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
  green:      '#6E9E82',
  greenDeep:  '#4E7A63',
  green10:    'rgba(110,158,130,0.10)',
  green20:    'rgba(110,158,130,0.18)',
  greenBorder:'rgba(110,158,130,0.30)',
  mid:        'rgba(234,240,233,0.10)',
};

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Vetted for textured hair',
    desc: 'Every professional listed is checked for real experience with textured hair and scalp conditions, not just general practice.',
  },
  {
    icon: MapPin,
    title: 'Wherever you are',
    desc: 'Search by location to find trichologists, dermatologists, and GPs near you. We are building the directory region by region.',
  },
  {
    icon: FileText,
    title: 'Bring your record with you',
    desc: 'Share your FolliSense summary with whoever you see, so the conversation starts from evidence rather than memory.',
  },
];

// Good enough to catch typos without rejecting valid unusual addresses.
// The old check was email.includes('@'), which accepted "@" on its own.
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const FindSpecialist = () => {
  const navigate = useNavigate();
  const [email, setEmail]         = useState('');
  const [region, setRegion]       = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving]       = useState(false);

  // Writes to specialist_waitlist. Previously this only flipped a local flag,
  // so every address entered here was thrown away.
  const handleNotify = async () => {
    if (saving) return;

    if (!looksLikeEmail(email)) {
      toast({ title: 'Enter a valid email', description: 'Please check the address and try again.' });
      return;
    }

    setSaving(true);
    try {
      // user_id is optional: the page is reachable while signed in, but the
      // waitlist should still work if it is ever linked publicly.
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase.from('specialist_waitlist').insert({
        user_id: session?.user?.id ?? null,
        email:   email.trim().toLowerCase(),
        region:  region.trim() || null,
      });

      // 23505 = unique violation on the email index. They are already on the
      // list, which is not a failure from the user's point of view.
      if (error && error.code !== '23505') throw error;

      setSubmitted(true);
      toast({ title: "You're on the list", description: "We'll be in touch when the directory covers your area." });
    } catch (e) {
      console.error('[FindSpecialist] waitlist insert failed:', e);
      toast({
        title: 'That did not save',
        description: 'Something went wrong on our side. Please try again in a moment.',
      });
    } finally {
      setSaving(false);
    }
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
        background: `linear-gradient(180deg, #101512 0%, #0A0908 100%)`,
        padding: '52px 20px 38px',
        position: 'relative', overflow: 'hidden',
        borderBottom: `1px solid ${C.mid}`,
      }}>
        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, position: 'relative' }}>
          <button onClick={() => navigate(-1)} aria-label="Back" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={16} color={C.sub} strokeWidth={1.8} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: 'rgba(110,158,130,0.85)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>FolliSense</span>
          </div>
          <div style={{ width: 36 }} />
        </div>

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}
        >
          <div style={{
            width: 62, height: 62, borderRadius: 18,
            background: C.green10,
            border: `1px solid ${C.greenBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Stethoscope size={26} color={C.green} strokeWidth={1.6} />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.green10, border: `1px solid ${C.greenBorder}`, borderRadius: 100, padding: '4px 14px', marginBottom: 14 }}>
            <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: '0.1em', textTransform: 'uppercase' }}>In development</span>
          </div>
          <h1 style={{ fontFamily: playfair, fontSize: 25, fontWeight: 500, color: C.ink, margin: '0 0 10px', lineHeight: 1.25 }}>
            Find a specialist
          </h1>
          <p style={{ fontFamily: dm, fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.7, maxWidth: 310, marginLeft: 'auto', marginRight: 'auto' }}>
            A directory of trichologists, dermatologists, and GPs who understand textured hair. We are building it out region by region.
          </p>
        </motion.div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '24px 20px 80px' }}>

        {/* What to expect */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {FEATURES.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i}
                style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 18, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: C.green10, border: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={15} color={C.green} strokeWidth={1.7} />
                </div>
                <div>
                  <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>{item.title}</p>
                  <p style={{ fontFamily: dm, fontSize: 12, color: C.sub, margin: 0, lineHeight: 1.65 }}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Email notify card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{
            background: C.card,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 20,
            padding: '22px 20px',
            marginBottom: 16,
          }}>

          {!submitted ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: C.green10, border: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={16} color={C.green} strokeWidth={1.8} />
                </div>
                <p style={{ fontFamily: dm, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0 }}>Tell us where you are</p>
              </div>
              <p style={{ fontFamily: dm, fontSize: 12, color: C.sub, margin: '0 0 16px', lineHeight: 1.65 }}>
                We build the directory where people are asking for it. Leave your details and we will let you know when yours is covered.
              </p>
              <input
                type="text"
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder="City or country"
                disabled={saving}
                style={{
                  width: '100%', height: 48, padding: '0 16px',
                  borderRadius: 14, border: `1.5px solid rgba(110,158,130,0.20)`,
                  background: 'rgba(110,158,130,0.06)',
                  fontFamily: dm, fontSize: 14, color: C.ink,
                  marginBottom: 10, display: 'block',
                  transition: 'border-color 0.15s',
                }}
              />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                onKeyDown={e => e.key === 'Enter' && handleNotify()}
                disabled={saving}
                style={{
                  width: '100%', height: 48, padding: '0 16px',
                  borderRadius: 14, border: `1.5px solid rgba(110,158,130,0.20)`,
                  background: 'rgba(110,158,130,0.06)',
                  fontFamily: dm, fontSize: 14, color: C.ink,
                  marginBottom: 12, display: 'block',
                  transition: 'border-color 0.15s',
                }}
              />
              <button onClick={handleNotify} disabled={saving} style={{
                width: '100%', height: 50, borderRadius: 14, border: `1px solid ${C.greenBorder}`,
                background: saving ? 'rgba(110,158,130,0.18)' : C.greenDeep,
                color: saving ? C.sub : '#F2F7F1', fontFamily: dm, fontSize: 14, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}>
                {saving ? 'Adding you…' : 'Notify me'}
              </button>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: C.green10, border: `1.5px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <CheckCircle size={23} color={C.green} strokeWidth={1.9} />
              </div>
              <p style={{ fontFamily: playfair, fontSize: 17, fontWeight: 500, color: C.ink, margin: '0 0 6px' }}>You're on the list</p>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.65 }}>
                We'll email <strong style={{ color: C.warm }}>{email}</strong> when the directory covers{region.trim() ? ` ${region.trim()}` : ' your area'}.
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Back button */}
        <motion.button
          onClick={() => navigate(-1)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{
            width: '100%', height: 52, borderRadius: 14,
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