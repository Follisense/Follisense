import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ChevronDown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

const countries = [
  'United Kingdom', 'United States', 'Nigeria', 'Ghana', 'South Africa', 'Jamaica', 'Canada',
  'Kenya', 'Tanzania', 'Uganda', 'Zimbabwe', 'Cameroon', 'Senegal', 'Ethiopia', 'France',
  'Germany', 'Netherlands', 'Ireland', 'Australia', 'New Zealand', 'Brazil', 'Trinidad and Tobago',
  'Barbados', 'Bahamas', 'Bermuda', 'India', 'Pakistan', 'Bangladesh', 'United Arab Emirates',
  'Saudi Arabia', 'Italy', 'Spain', 'Portugal', 'Belgium', 'Sweden', 'Norway', 'Denmark',
  'Switzerland', 'Austria', 'Other',
];

const roles        = ['Hairstylist', 'Braider', 'Barber', 'Loctician', 'Salon owner', 'Salon assistant or apprentice', 'Mobile or home-visit stylist', 'Other'];
const experience   = ['Less than 1 year', '1 to 3 years', '3 to 5 years', '5 to 10 years', '10+ years'];
const workplaces   = ['A salon', 'Home-based studio', 'Mobile or home service', 'Clinic', 'Multiple locations'];
const clientCounts = ['1 to 5', '5 to 15', '15 to 30', '30+'];
const services     = ['Braids (box braids, knotless, etc.)', 'Cornrows or flat twists', 'Locs installation or maintenance', 'Weave or sew-in', 'Wig install (lace fronts, etc.)', 'Crochet braids', 'Twist styles', 'Natural hair styling', 'Silk press or blowout', 'Relaxer or chemical treatments', 'Colour or bleach', 'Haircuts or trims', 'Barber services (fades, lineups)', 'Scalp treatments'];
const goals        = ['Document scalp observations for my clients', 'Learn to spot scalp conditions early', 'Build trust with clients through better scalp care', 'Track client scalp health over time', 'Get referral guidance when I see something concerning', 'Stay up to date on scalp health knowledge', "I'm just exploring for now"];

interface StylistProfile {
  role: string[]; otherRole: string; experience: string; businessName: string; city: string; country: string;
  workplace: string; clientCount: string; services: string[]; otherService: string; goals: string[];
}

const TOTAL_STEPS = 4;

// ─── Maps form workplace labels to the allowed DB values ─────────────────────
const mapWorkplace = (workplace: string): 'salon' | 'mobile' | 'both' | null => {
  if (!workplace) return null;
  if (workplace === 'A salon')                   return 'salon';
  if (workplace === 'Home-based studio')         return 'mobile';
  if (workplace === 'Mobile or home service')    return 'mobile';
  if (workplace === 'Clinic')                    return 'both';
  if (workplace === 'Multiple locations')        return 'both';
  return 'both'; // safe fallback
};

const StylistOnboarding = () => {
  const navigate = useNavigate();
  const { setStylistMode } = useApp();
  const [step, setStep]         = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile]   = useState<StylistProfile>({
    role: [], otherRole: '', experience: '', businessName: '', city: '', country: '',
    workplace: '', clientCount: '', services: [], otherService: '', goals: [],
  });

  const toggleRole    = (r: string) => setProfile(p => ({ ...p, role: p.role.includes(r) ? p.role.filter(x => x !== r) : [...p.role, r] }));
  const toggleService = (s: string) => setProfile(p => ({ ...p, services: p.services.includes(s) ? p.services.filter(x => x !== s) : [...p.services, s] }));
  const toggleGoal    = (g: string) => setProfile(p => ({ ...p, goals: p.goals.includes(g) ? p.goals.filter(x => x !== g) : [...p.goals, g] }));

  const canNext = () => {
    if (step === 0) return profile.role.length > 0 && (!profile.role.includes('Other') || profile.otherRole.trim()) && profile.experience;
    if (step === 1) return profile.workplace && profile.clientCount;
    if (step === 2) return profile.services.length > 0;
    if (step === 3) return profile.goals.length > 0;
    return true;
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }

    // ── Final step: save everything to Supabase ───────────────────────────────
    setIsLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('No user session found. Please sign in again.');

      const userId = session.user.id;

      const { error: upsertError } = await supabase
        .from('stylist_profiles')
        .upsert({
          user_id:          userId,
          business_name:    profile.businessName || null,
          business_type:    mapWorkplace(profile.workplace),   // ← mapped correctly
          country:          profile.country || null,
          city:             profile.city || null,
          roles:            profile.role.includes('Other')
                              ? [...profile.role.filter(r => r !== 'Other'), profile.otherRole.trim()]
                              : profile.role,
          experience_level: profile.experience || null,
          services:         profile.services,
          goals:            profile.goals,
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) throw upsertError;

      localStorage.setItem('follisense-stylist-profile', JSON.stringify(profile));
      setStylistMode(true);
      navigate('/stylist');

    } catch (err: any) {
      console.error('Stylist onboarding save error:', err);
      toast({
        title: 'Could not save your profile',
        description: err?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else navigate(-1);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <style>{`
        .sel-card { border: 1.5px solid #E8DED1 !important; border-radius: 12px; padding: 12px; width: 100%; text-align: left; background: #F5F0EB; cursor: pointer; transition: border-color 0.15s; box-shadow: 0 2px 8px rgba(45,45,45,0.04); }
        .sel-card.selected { border: 1.5px solid #7C9A8E !important; background: rgba(124,154,142,0.08); }
        .pill-opt { border: 1.5px solid #E8DED1 !important; border-radius: 100px; padding: 8px 16px; background: #F5F0EB; cursor: pointer; font-size: 0.875rem; transition: border-color 0.15s; }
        .pill-opt.selected { border: 1.5px solid #7C9A8E !important; background: rgba(124,154,142,0.08); }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: '560px' }}
      >
        <div style={{ backgroundColor: '#FAF8F5', borderRadius: '24px', boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)', padding: '24px 36px 28px', display: 'flex', flexDirection: 'column' }}>

          {/* Header with progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button onClick={handleBack} style={{ padding: '8px', marginLeft: '-8px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              <ArrowLeft size={22} strokeWidth={1.8} />
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} style={{ height: '6px', width: '32px', borderRadius: '100px', backgroundColor: i <= step ? '#7fa896' : '#e8e8e8', transition: 'background-color 0.3s' }} />
              ))}
            </div>
            <div style={{ width: '40px' }} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              style={{ paddingTop: '8px', paddingBottom: '32px' }}
            >

              {/* ── Step 0: Role + Experience ── */}
              {step === 0 && (
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px' }}>Tell us about you</h2>
                  <p style={{ fontSize: '0.75rem', color: '#9e9e9e', marginBottom: '20px' }}>This helps us tailor your FolliSense experience.</p>

                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2d2d2d', marginBottom: '4px' }}>What do you do?</p>
                  <p style={{ fontSize: '0.75rem', color: '#9e9e9e', marginBottom: '12px' }}>Select all that apply</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                    {roles.map(r => (
                      <button key={r} onClick={() => toggleRole(r)} className={`sel-card ${profile.role.includes(r) ? 'selected' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: profile.role.includes(r) ? '#7fa896' : 'transparent', border: profile.role.includes(r) ? 'none' : '2px solid #e0e0e0' }}>
                            {profile.role.includes(r) && <Check size={10} color="#fff" strokeWidth={2.5} />}
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: profile.role.includes(r) ? '#2d2d2d' : '#9e9e9e' }}>{r}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {profile.role.includes('Other') && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '20px' }}>
                      <input
                        type="text"
                        value={profile.otherRole}
                        onChange={e => setProfile(p => ({ ...p, otherRole: e.target.value }))}
                        placeholder="Tell us your role"
                        style={{ width: '100%', height: '48px', padding: '0 16px', borderRadius: '12px', border: '1.5px solid #e0e0e0', backgroundColor: '#fff', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </motion.div>
                  )}

                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2d2d2d', marginBottom: '12px' }}>How long have you been practising?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {experience.map(e => (
                      <button key={e} onClick={() => setProfile(p => ({ ...p, experience: e }))} className={`sel-card ${profile.experience === e ? 'selected' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: profile.experience === e ? '#7fa896' : 'transparent', border: profile.experience === e ? 'none' : '2px solid #e0e0e0' }}>
                            {profile.experience === e && <Check size={10} color="#fff" strokeWidth={2.5} />}
                          </div>
                          <span style={{ fontSize: '0.875rem', color: '#2d2d2d' }}>{e}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 1: Location + Workplace ── */}
              {step === 1 && (
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px' }}>Where do you work?</h2>
                  <p style={{ fontSize: '0.75rem', color: '#9e9e9e', marginBottom: '20px' }}>Help us understand your work context.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#2d2d2d', marginBottom: '6px' }}>Business or salon name</label>
                      <input
                        type="text"
                        value={profile.businessName}
                        onChange={e => setProfile(p => ({ ...p, businessName: e.target.value }))}
                        style={{ width: '100%', height: '48px', padding: '0 16px', borderRadius: '12px', border: '1.5px solid #e0e0e0', backgroundColor: '#fff', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#2d2d2d', marginBottom: '6px' }}>City</label>
                        <input
                          type="text"
                          value={profile.city}
                          onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                          style={{ width: '100%', height: '48px', padding: '0 16px', borderRadius: '12px', border: '1.5px solid #e0e0e0', backgroundColor: '#fff', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#2d2d2d', marginBottom: '6px' }}>Country</label>
                        <div style={{ position: 'relative' }}>
                          <select
                            value={profile.country}
                            onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                            style={{ width: '100%', height: '48px', padding: '0 36px 0 16px', borderRadius: '12px', border: '1.5px solid #e0e0e0', backgroundColor: '#fff', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', appearance: 'none' }}
                          >
                            <option value="">Select</option>
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9e9e9e', pointerEvents: 'none' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2d2d2d', marginBottom: '12px' }}>Do you work from:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                    {workplaces.map(w => (
                      <button key={w} onClick={() => setProfile(p => ({ ...p, workplace: w }))} className={`sel-card ${profile.workplace === w ? 'selected' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: profile.workplace === w ? '#7fa896' : 'transparent', border: profile.workplace === w ? 'none' : '2px solid #e0e0e0' }}>
                            {profile.workplace === w && <Check size={10} color="#fff" strokeWidth={2.5} />}
                          </div>
                          <span style={{ fontSize: '0.875rem', color: '#2d2d2d' }}>{w}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2d2d2d', marginBottom: '12px' }}>How many clients do you see per week?</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {clientCounts.map(c => (
                      <button key={c} onClick={() => setProfile(p => ({ ...p, clientCount: c }))} className={`pill-opt ${profile.clientCount === c ? 'selected' : ''}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 2: Services ── */}
              {step === 2 && (
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px' }}>What services do you offer?</h2>
                  <p style={{ fontSize: '0.75rem', color: '#9e9e9e', marginBottom: '20px' }}>Select all that apply</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {services.map(s => (
                      <button key={s} onClick={() => toggleService(s)} className={`sel-card ${profile.services.includes(s) ? 'selected' : ''}`}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: profile.services.includes(s) ? '#2d2d2d' : '#9e9e9e' }}>{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 3: Goals ── */}
              {step === 3 && (
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px' }}>What do you want from FolliSense?</h2>
                  <p style={{ fontSize: '0.75rem', color: '#9e9e9e', marginBottom: '20px' }}>Pick all that apply</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {goals.map(g => (
                      <button key={g} onClick={() => toggleGoal(g)} className={`sel-card ${profile.goals.includes(g) ? 'selected' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: profile.goals.includes(g) ? '#7fa896' : 'transparent', border: profile.goals.includes(g) ? 'none' : '2px solid #e0e0e0' }}>
                            {profile.goals.includes(g) && <Check size={10} color="#fff" strokeWidth={2.5} />}
                          </div>
                          <span style={{ fontSize: '0.875rem', color: '#2d2d2d' }}>{g}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Bottom button */}
          <div style={{ paddingTop: '12px' }}>
            <button
              onClick={handleNext}
              disabled={!canNext() || isLoading}
              style={{
                width: '100%', height: '56px', borderRadius: '12px', border: 'none',
                fontWeight: 600, fontSize: '1rem',
                cursor: canNext() && !isLoading ? 'pointer' : 'not-allowed',
                backgroundColor: canNext() && !isLoading ? '#7fa896' : '#e0e0e0',
                color: canNext() && !isLoading ? '#FFFFFF' : '#b0b0b0',
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading ? 'Saving…' : step === TOTAL_STEPS - 1 ? 'Get started' : 'Next'}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default StylistOnboarding;