import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, ChevronRight, Shield, Trash2, Leaf, Heart, Camera, RefreshCw, Target, Check,
  Eye, EyeOff, Lock, Sparkles, Pencil, ChevronDown, Droplets, Scissors, FlaskConical, Activity, Info,
  CalendarDays, X,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import ProductSearch from '@/components/ProductSearch';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NotificationSettings } from '@/components/NotificationPrompt';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

// ─── DARK THEME,green accent, matches RoutineTracker ───────────────────────
const C = {
  bg:         '#0A0908',
  surface:    '#16120D',
  card:       '#1C1814',
  ink:        '#F5EFE6',
  goldSolid:  '#8FB29E',
  goldDeep:   '#6FA283',
  gold08:     'rgba(143,178,158,0.08)',
  gold15:     'rgba(143,178,158,0.15)',
  goldBorder: 'rgba(143,178,158,0.28)',
  mid:        'rgba(245,239,230,0.08)',
  muted:      'rgba(245,239,230,0.40)',
  warm:       'rgba(245,239,230,0.65)',
  white:      '#FFFFFF',
  red:        '#C0604040',
  redSolid:   '#C47070',
};

const parseCycleLengthToDays = (raw: string): number => {
  if (!raw) return 28;
  const n = raw.match(/\d+/g);
  if (!n) return 28;
  if (n.length >= 2) return Math.round(((parseInt(n[0]) + parseInt(n[1])) / 2) * 7);
  return parseInt(n[0]) * 7;
};

const mapStyles = (styles: string[] = []) => {
  const map: Record<string, string> = {
    'Braids': 'braids', 'Locs': 'locs', 'Twists': 'twists',
    'Twist out': 'twist_out', 'Wig': 'wig', 'Weave': 'weave',
    'Silk press': 'silk_press', 'Blow out': 'blow_out',
  };
  return styles.map(s => map[s] || s.toLowerCase());
};

const saveConsumerProfile = async (data: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const payload = {
      user_id: user.id,
      gender: data.gender === 'woman' ? 'female' : data.gender === 'man' ? 'male' : 'prefer_not_to_say',
      hair_texture: data.hairType?.startsWith('4') ? 'coily' : data.hairType?.startsWith('3') ? 'curly' : 'not_sure',
      current_styles: mapStyles(data.current_styles || []),
      protective_style_frequency: data.protectiveStyleFrequency || null,
      style_duration: data.styleDuration || null,
      between_wash_care: data.betweenWashCare || [],
      between_wash_other: data.otherBetweenWashCare || null,
      top_concerns: data.goals || [],
      chemical_processing: data.chemicalProcessing === 'No, fully natural' ? 'no_fully_natural' : data.chemicalProcessing === 'Yes' ? 'yes_currently' : data.chemicalProcessing === 'Previously' ? 'previously_growing_out' : 'not_sure',
    };
    const { error } = await supabase.from('consumer_profiles').upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;
    toast({ title: 'Profile saved' });
  } catch (err) {
    console.error(err);
    toast({ title: 'Error saving profile', variant: 'destructive' });
  }
};

const goalOptions = [
  'Protect my edges / grow my hairline back',
  'Reduce scalp irritation or itching',
  'Understand my hair loss or thinning',
  'Build a consistent scalp care routine',
  'Monitor my scalp between salon visits',
  'Recover from damage (chemical, heat, or traction)',
  'General scalp and hair health',
  "I'm not sure yet, just exploring",
];

const hairTypeLabels: Record<string, string> = {
  'type3': 'Type 3, Curly', 'type4': 'Type 4, Coily',
  '3b': '3b, Wide, springy curls', '3c': '3c, Tight, corkscrew curls',
  '4a': '4a, Soft, defined coils', '4b': '4b, Z-shaped, tightly coiled',
  '4c': '4c, Very tight, densely packed coils', 'unsure': 'Not sure yet',
};

// ─── Section component ────────────────────────────────────────────────────────
const ProfileSection = ({
  title, icon: Icon, children, defaultOpen = false,
  editLabel, onEdit, editing, onSave, onCancel,
}: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
  editLabel?: string; onEdit?: () => void; editing?: boolean; onSave?: () => void; onCancel?: () => void;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 10 }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: C.card, border: `1.5px solid ${C.mid}`, borderRadius: open ? '16px 16px 0 0' : 16, cursor: 'pointer', transition: 'border-radius 0.2s', borderBottom: open ? `1.5px solid ${C.goldBorder}` : `1.5px solid ${C.mid}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: C.gold08, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={15} color={C.goldDeep} strokeWidth={1.8} />
          </div>
          <span style={{ fontFamily: dm, fontSize: 13, fontWeight: 700, color: C.ink }}>{title}</span>
        </div>
        <ChevronDown size={15} color={C.muted} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ background: C.card, border: `1.5px solid ${C.mid}`, borderTop: 'none', borderRadius: '0 0 16px 16px' }}>
              {onEdit && !editing && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 18px 0' }}>
                  <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.goldDeep }}>
                    <Pencil size={11} /> {editLabel || 'Edit'}
                  </button>
                </div>
              )}
              {editing && onSave && onCancel && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '10px 18px 0' }}>
                  <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm, fontSize: 11, fontWeight: 600, color: C.muted }}>Cancel</button>
                  <button onClick={onSave} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.goldDeep }}>Save</button>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 18px', borderBottom: `1px solid ${C.mid}`, gap: 12 }}>
    <span style={{ fontFamily: dm, fontSize: 12, color: C.muted, flexShrink: 0 }}>{label}</span>
    <span style={{ fontFamily: dm, fontSize: 12, color: C.ink, textAlign: 'right', maxWidth: 200 }}>{value}</span>
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '14px 18px 6px' }}>
    <span style={{ fontFamily: dm, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{children}</span>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
const ProfilePage = () => {
  const navigate = useNavigate();
  const {
    userName, onboardingData, setOnboardingData, resetAll,
    baselinePhotos, setBaselinePhotos, baselineRisk, baselineDate,
    healthProfile, research, setResearch,
  } = useApp();

  // Defensive locals: a user who has never opened Health Profile (or whose
  // Supabase row has null columns) gets undefined here, and reading .length
  // off undefined crashed the whole page to blank.
  const hp: any     = healthProfile || {};
  const res: any    = research || {};
  const photos: any[] = baselinePhotos || [];
  const ob: any     = onboardingData || {};
  
  const [showGoalEditor, setShowGoalEditor]         = useState(false);
  const [editGoals, setEditGoals]                   = useState<string[]>(ob.goals || []);
  const [showProductEditor, setShowProductEditor]   = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm]   = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword]       = useState('');
  const [newPassword, setNewPassword]               = useState('');
  const [confirmPassword, setConfirmPassword]       = useState('');
  const [showCurrentPw, setShowCurrentPw]           = useState(false);
  const [showNewPw, setShowNewPw]                   = useState(false);
  const [showConfirmPw, setShowConfirmPw]           = useState(false);
  const [preferredStylist, setPreferredStylist]     = useState('');
  const [preferredSalon, setPreferredSalon]         = useState('');
  const [bookingMethod, setBookingMethod]           = useState('');
  const [salonContact, setSalonContact]             = useState('');

  // ── Delete account state ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ── Takedown reminder state ──
  const [styleStartDate, setStyleStartDate] = useState<string | null>(null);
  const [styleDueDate, setStyleDueDate]     = useState<string | null>(null);

  const isMale = ob.gender === 'man';

  useEffect(() => {
    const loadTakedown = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const uid = session.user.id;
        const { data: cp } = await supabase.from('consumer_profiles')
          .select('current_style_start_date, style_due_date')
          .eq('user_id', uid).maybeSingle();
        if (cp?.current_style_start_date) setStyleStartDate(cp.current_style_start_date);
        if (cp?.style_due_date) setStyleDueDate(cp.style_due_date);
        if (!cp?.current_style_start_date) {
          const { data: p } = await supabase.from('profiles')
            .select('current_style_start_date').eq('id', uid).maybeSingle();
          if (p?.current_style_start_date) setStyleStartDate(p.current_style_start_date);
        }
      } catch (e) { console.error('[Profile] takedown load failed:', e); }
    };
    loadTakedown();
  }, []);

  const totalDays    = parseCycleLengthToDays(ob.cycleLength);
  const styleStartMs = styleStartDate ? new Date(styleStartDate).getTime() : null;
  const dueDate = styleDueDate
    ? new Date(styleDueDate)
    : styleStartMs ? new Date(styleStartMs + totalDays * 86400000) : null;
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : null;
  const takedownColor = daysUntilDue === null ? C.muted
    : daysUntilDue < 0 ? C.redSolid
    : daysUntilDue <= 5 ? '#B8724F'
    : C.goldSolid;
  const takedownLabel =
    daysUntilDue === null ? 'Not set'
    : daysUntilDue < 0    ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue`
    : daysUntilDue === 0  ? 'Due today'
    : `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;

  // ── Real account deletion (client-side scope) ──
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      // One call: the Edge Function removes storage files, then deletes the
      // auth user — every app table (checkins, photos, profiles, routine,
      // style_cycles, chat_memory...) cascades from that automatically.
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;

      // User no longer exists server-side; signOut just clears the local
      // session and may error harmlessly — ignore it.
      await supabase.auth.signOut().catch(() => {});
      resetAll();
      navigate('/goodbye', { state: { accountDeleted: true } });
    } catch (e) {
      console.error('[Delete] failed:', e);
      toast({ title: 'Something went wrong deleting your account', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  const handleRetakePhoto = async (area: string) => {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const updatedPhotos = photos.map(p => p.area === area ? { ...p, date: today } : p);
    setBaselinePhotos(updatedPhotos);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('consumer_profiles').upsert([{ user_id: user?.id, baseline_photos: updatedPhotos }], { onConflict: 'user_id' });
  };

  const handleAddBaseline = async () => {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const newPhotos = [
      { area: 'Hairline, temples and edges', captured: true, date: today },
      { area: 'Crown and vertex', captured: true, date: today },
    ];
    setBaselinePhotos(newPhotos);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('consumer_profiles').upsert([{ user_id: user?.id, baseline_photos: newPhotos }], { onConflict: 'user_id' });
  };

  const toggleEditGoal = (g: string) => {
    setEditGoals(prev => {
      if (prev.includes(g)) return prev.filter(x => x !== g);
      if (prev.length >= 3) return prev;
      return [...prev, g];
    });
  };

  const saveGoals = async () => {
    const updated = { ...ob, goals: editGoals };
    setOnboardingData(updated);
    setShowGoalEditor(false);
    await saveConsumerProfile(updated);
  };

  const toggleMenstrualTracking = () => {
    const newVal = ob.menstrualTracking === "Yes, I'd like to track" ? 'No thanks' : "Yes, I'd like to track";
    setOnboardingData({ ...ob, menstrualTracking: newVal });
  };

  const hpSections = [
    { key: 'scalp',   complete: !!(hp.sweat && hp.exercise && hp.heatStyling && hp.satinCovering) },
    { key: 'medical', complete: !!(hp.medicalConditions?.length > 0 && hp.pregnancyStatus && hp.medications) },
    { key: 'blood',   complete: !!hp.lastBloodTest },
    { key: 'skin',    complete: !!(hp.skinConditions?.length > 0 && hp.sensitiveSkin) },
    { key: 'hair',    complete: !!(hp.previousHairLoss && hp.diagnosedCondition && hp.familyHistory) },
  ];
  const hpCompleted = hpSections.filter(s => s.complete).length;

  const chemDisplay = (() => {
    if (!ob.chemicalProcessing) return 'Not set';
    if (ob.chemicalProcessing === 'Never') return 'Never';
    if (ob.chemicalProcessing === 'No, fully natural') return 'No, fully natural';
    const treatments = ob.chemicalProcessingMultiple?.length > 0
      ? ob.chemicalProcessingMultiple.join(', ')
      : ob.chemicalProcessing;
    return treatments;
  })();

  const betweenWashDisplay = ob.betweenWashCare?.length > 0
    ? ob.betweenWashCare.join(', ') + (ob.otherBetweenWashCare ? `, ${ob.otherBetweenWashCare}` : '')
    : 'Not set';

  const riskColor = (r: string | null) => {
    if (r === 'green') return '#8FB29E';
    if (r === 'amber') return '#B8724F';
    if (r === 'red')   return '#C47070';
    return C.muted;
  };

  const inputStyle = {
    width: '100%', height: 42, padding: '0 12px',
    borderRadius: 10, border: `1.5px solid rgba(255,255,255,0.10)`,
    background: 'rgba(255,255,255,0.05)', color: C.ink,
    fontFamily: dm, fontSize: 13, outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 120, fontFamily: dm }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
        input::placeholder { color: rgba(245,239,230,0.25); font-family: 'DM Sans', sans-serif; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #16120D inset !important; -webkit-text-fill-color: #F5EFE6 !important; }
      `}</style>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

        {/* Hero,matches RoutineTracker hero treatment */}
        <div style={{ background: `radial-gradient(ellipse 160% 120% at 50% -10%, rgba(143,178,158,0.10) 0%, transparent 55%), linear-gradient(180deg, #16120D 0%, #0A0908 100%)`, padding: '52px 24px 32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(143,178,158,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: 'rgba(143,178,158,0.12)', border: '1.5px solid rgba(143,178,158,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={24} color="rgba(143,178,158,0.80)" strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: 'rgba(143,178,158,0.85)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Your Profile</p>
              <h1 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.ink, margin: 0 }}>{userName || 'Welcome'}</h1>
              {ob.gender && (
                <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '3px 0 0' }}>
                  {ob.gender === 'woman' ? 'Female' : ob.gender === 'man' ? 'Male' : 'Prefer not to say'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 16px 0' }}>

          {/* ── Account ── */}
          <ProfileSection title="Account" icon={User} defaultOpen>
            <InfoRow label="First name" value={userName || 'Not set'} />
            <InfoRow label="Gender" value={
              ob.gender === 'woman' ? 'Female' :
              ob.gender === 'man' ? 'Male' :
              ob.gender === 'prefer-not-to-say' ? 'Prefer not to say' : 'Not set'
            } />

            <SectionLabel>Notifications</SectionLabel>
            <div style={{ padding: '0 18px 18px' }}>
              <NotificationSettings />
            </div>

            <SectionLabel>Data & Research</SectionLabel>
            <div style={{ padding: '0 18px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.ink, flex: 1, margin: 0 }}>
                  Contribute my anonymised data to scalp health research
                </p>
                <Switch
                  checked={!!res.consented}
                  onCheckedChange={(checked) => setResearch({
                    ...res, consented: checked,
                    consentDate: checked ? new Date().toISOString() : null,
                  })}
                />
              </div>
              <Collapsible>
                <CollapsibleTrigger style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.goldDeep, marginBottom: 6 }}>
                  <Info size={11} /> Learn more
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, lineHeight: 1.55, margin: 0 }}>
                    Your anonymised check-in patterns help improve scalp health understanding for {isMale ? 'people' : 'women'} with textured hair. No photos or personal details are shared without your explicit consent.
                  </p>
                </CollapsibleContent>
              </Collapsible>
              {res.consented && res.photoCount > 0 && (
                <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.goldDeep, margin: 0 }}>
                  You've contributed {res.photoCount} photo{res.photoCount !== 1 ? 's' : ''}.
                </p>
              )}
            </div>

            <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.mid}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Shield size={16} color={C.goldDeep} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>How we use your information</p>
                  <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, lineHeight: 1.55, margin: 0 }}>
                    Your data personalises your experience and generates your clinician summary if needed. Nothing is shared without permission. Photos stay on your device.
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => toast({ title: 'Coming soon', description: 'Data export will be available in a future update.' })} style={{ width: '100%', padding: '13px 18px', background: 'none', border: 'none', borderTop: `1px solid ${C.mid}`, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: dm, fontSize: 12, color: C.ink }}>
              Export my data <ChevronRight size={14} color={C.muted} />
            </button>

            <button onClick={() => setShowChangePassword(!showChangePassword)} style={{ width: '100%', padding: '13px 18px', background: 'none', border: 'none', borderTop: `1px solid ${C.mid}`, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontFamily: dm, fontSize: 12, color: C.ink }}>
              <Lock size={13} strokeWidth={1.5} color={C.muted} /> Change password
              <ChevronRight size={13} color={C.muted} style={{ marginLeft: 'auto' }} />
            </button>
            {showChangePassword && (
              <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.mid}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Current password',     val: currentPassword, set: setCurrentPassword, show: showCurrentPw, toggle: () => setShowCurrentPw(!showCurrentPw) },
                  { label: 'New password',          val: newPassword,     set: setNewPassword,     show: showNewPw,     toggle: () => setShowNewPw(!showNewPw) },
                  { label: 'Confirm new password',  val: confirmPassword, set: setConfirmPassword, show: showConfirmPw, toggle: () => setShowConfirmPw(!showConfirmPw) },
                ].map(field => (
                  <div key={field.label} style={{ position: 'relative' }}>
                    <label style={{ fontFamily: dm, fontSize: 10, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4 }}>{field.label}</label>
                    <input type={field.show ? 'text' : 'password'} value={field.val} onChange={e => field.set(e.target.value)} style={{ ...inputStyle, paddingRight: 36 }} />
                    <button type="button" onClick={field.toggle} style={{ position: 'absolute', right: 10, bottom: 11, background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}>
                      {field.show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                ))}
                <button
                  onClick={async () => {
                    if (!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword) return;
                    try {
                      const { error } = await supabase.auth.updateUser({ password: newPassword });
                      if (error) throw error;
                      toast({ title: 'Password updated successfully' });
                      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setShowChangePassword(false);
                    } catch {
                      toast({ title: 'Error updating password', description: 'Try again later.', variant: 'destructive' });
                    }
                  }}
                  disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  style={{ height: 42, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: dm, fontSize: 13, fontWeight: 700, background: (currentPassword && newPassword && confirmPassword && newPassword === confirmPassword) ? C.goldSolid : 'rgba(255,255,255,0.08)', color: (currentPassword && newPassword && confirmPassword && newPassword === confirmPassword) ? '#0A0908' : C.muted, transition: 'background 0.18s' }}>
                  Update password
                </button>
              </div>
            )}

            <button onClick={() => setShowDeleteModal(true)} style={{ width: '100%', padding: '13px 18px', background: 'none', border: 'none', borderTop: `1px solid ${C.mid}`, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontFamily: dm, fontSize: 12, color: C.redSolid, borderRadius: '0 0 16px 16px' }}>
              <Trash2 size={13} strokeWidth={1.5} /> Delete my account & data
            </button>
          </ProfileSection>

          {/* ── Your Hair ── */}
          <ProfileSection title="Your Hair" icon={Scissors}>
            <InfoRow label="Hair type" value={hairTypeLabels[ob.hairType] || ob.hairType || 'Not set'} />
            <InfoRow label="How you wear your hair" value={ob.protectiveStyles?.length > 0 ? ob.protectiveStyles.join(', ') : 'Not set'} />
            {!isMale && ob.protectiveStyleFrequency && <InfoRow label="How often in protective styles" value={ob.protectiveStyleFrequency} />}
            {isMale && ob.barberFrequency && <InfoRow label="Barber frequency" value={ob.barberFrequency} />}
            <div style={{ height: 4 }} />
          </ProfileSection>

          {/* ── Hair History ── */}
          <ProfileSection title="Hair History" icon={FlaskConical}>
            <InfoRow label="Chemical processing" value={chemDisplay} />
            {ob.chemicalProcessing && !['No, fully natural', 'Never', 'Not sure'].includes(ob.chemicalProcessing) && ob.lastChemicalTreatment && (
              <InfoRow label="Last treatment" value={ob.lastChemicalTreatment} />
            )}
            {ob.chemicalProcessingMultiple?.length > 0 && (
              <InfoRow label="Type" value={ob.chemicalProcessingMultiple.join(', ')} />
            )}
            <div style={{ height: 4 }} />
          </ProfileSection>

          {/* ── Your Routine ── */}
          <ProfileSection title="Your Routine" icon={Droplets} editLabel={showProductEditor ? 'Done' : 'Edit products'} onEdit={() => setShowProductEditor(true)} editing={showProductEditor} onSave={() => setShowProductEditor(false)} onCancel={() => setShowProductEditor(false)}>

            {/* ── Takedown reminder ── */}
            <button onClick={() => navigate('/routine-tracker')} style={{ width: '100%', padding: '14px 18px', background: 'none', border: 'none', borderBottom: `1px solid ${C.mid}`, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: C.gold08, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarDays size={15} color={takedownColor} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 700, color: C.ink, margin: 0 }}>Takedown reminder</p>
                <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 700, color: takedownColor, margin: '2px 0 0' }}>{takedownLabel}</p>
              </div>
              <ChevronRight size={14} color={C.muted} />
            </button>

            {ob.cycleLength && <InfoRow label="Typical cycle length" value={ob.cycleLength} />}
            <InfoRow label="Wash frequency" value={ob.washFrequency || ob.wornOutWashFrequency || ob.washFrequencyPerCycle || 'Not set'} />
            {ob.betweenWashCare?.length > 0 && <InfoRow label="Between-wash care" value={betweenWashDisplay} />}
            {!showProductEditor ? (
              <>
                <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.mid}` }}>
                  <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Scalp products</p>
                  <p style={{ fontFamily: dm, fontSize: 12, color: C.ink, margin: 0 }}>{ob.scalpProducts?.filter(p => p !== 'None').length > 0 ? ob.scalpProducts.filter(p => p !== 'None').join(', ') : 'No scalp products'}</p>
                </div>
                <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.mid}` }}>
                  <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Hair products</p>
                  <p style={{ fontFamily: dm, fontSize: 12, color: C.ink, margin: 0 }}>{ob.hairProducts?.filter(p => p !== 'None').length > 0 ? ob.hairProducts.filter(p => p !== 'None').join(', ') : 'No hair products'}</p>
                </div>
              </>
            ) : (
              <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.mid}`, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.ink, margin: '0 0 8px' }}>Scalp products</p>
                  <ProductSearch category="scalp" selectedProducts={ob.scalpProducts?.filter(p => p !== 'None') || []} onProductsChange={(prods) => setOnboardingData({ ...ob, scalpProducts: prods })} darkMode />
                </div>
                <div>
                  <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.ink, margin: '0 0 8px' }}>Hair products</p>
                  <ProductSearch category="hair" selectedProducts={ob.hairProducts?.filter(p => p !== 'None') || []} onProductsChange={(prods) => setOnboardingData({ ...ob, hairProducts: prods })} darkMode />
                </div>
              </div>
            )}
            <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.mid}` }}>
              <button onClick={() => navigate('/product-guide')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm, fontSize: 12, fontWeight: 700, color: C.goldDeep }}>Browse product guide →</button>
            </div>
          </ProfileSection>

          {/* ── Your Stylist ── */}
          <ProfileSection title="Your Stylist" icon={Scissors}>
            {[
              { label: 'Preferred stylist name (optional)', val: preferredStylist, set: setPreferredStylist, ph: 'e.g. Ama' },
              { label: 'Salon name (optional)', val: preferredSalon, set: setPreferredSalon, ph: 'e.g. Natural Touch Studio' },
              { label: 'Salon phone or booking link (optional)', val: salonContact, set: setSalonContact, ph: 'Phone number or URL' },
            ].map((field, i) => (
              <div key={field.label} style={{ padding: '12px 18px', borderTop: i === 0 ? 'none' : `1px solid ${C.mid}` }}>
                <label style={{ fontFamily: dm, fontSize: 10, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>{field.label}</label>
                <input type="text" value={field.val} onChange={e => field.set(e.target.value)} placeholder={field.ph} style={inputStyle} />
              </div>
            ))}
            <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.mid}` }}>
              <label style={{ fontFamily: dm, fontSize: 10, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>How do you usually book?</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Fresha', 'Booksy', 'Instagram DM', 'WhatsApp', 'Phone call', 'Other'].map(m => (
                  <button key={m} onClick={() => setBookingMethod(m)} style={{ padding: '6px 14px', borderRadius: 100, fontFamily: dm, fontSize: 11, fontWeight: 600, border: bookingMethod === m ? `1.5px solid ${C.goldBorder}` : `1.5px solid ${C.mid}`, background: bookingMethod === m ? C.gold08 : 'rgba(255,255,255,0.03)', color: bookingMethod === m ? C.goldDeep : C.warm, cursor: 'pointer', transition: 'all 0.15s' }}>{m}</button>
                ))}
              </div>
            </div>
            <div style={{ height: 4 }} />
          </ProfileSection>

          {/* ── Health ── */}
          <ProfileSection title="Health" icon={Activity}>
            <SectionLabel>Baseline Assessment</SectionLabel>
            <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Date',        val: baselineDate || 'Not set' },
                { label: 'Itch',        val: ob.baselineItch || 'Not set' },
                { label: 'Tenderness',  val: ob.baselineTenderness || 'Not set' },
                { label: 'Hairline',    val: ob.baselineHairline || 'Not set' },
                { label: 'Hair health', val: ob.baselineHairHealth || 'Not set' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: dm, fontSize: 12, color: C.muted }}>{row.label}</span>
                  <span style={{ fontFamily: dm, fontSize: 12, color: C.ink }}>{row.val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: dm, fontSize: 12, color: C.muted }}>Risk level</span>
                <span style={{ fontFamily: dm, fontSize: 12, fontWeight: 700, color: riskColor(baselineRisk), textTransform: 'capitalize' }}>{baselineRisk || 'Not assessed'}</span>
              </div>
            </div>

            <SectionLabel>Baseline Photos</SectionLabel>
            <div style={{ padding: '0 18px 14px' }}>
              {photos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {photos.map(photo => (
                    <div key={photo.area} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: C.gold08, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Camera size={15} color={C.goldDeep} strokeWidth={1.5} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.ink, margin: 0 }}>{photo.area}</p>
                        <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: 0 }}>Captured {photo.date}</p>
                      </div>
                      <button onClick={() => handleRetakePhoto(photo.area)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.goldDeep }}>
                        <RefreshCw size={11} strokeWidth={2} /> Retake
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button onClick={handleAddBaseline} style={{ width: '100%', padding: 14, borderRadius: 12, border: `1.5px dashed ${C.goldBorder}`, background: C.gold08, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box' as const }}>
                  <Camera size={18} color={C.goldDeep} strokeWidth={1.5} />
                  <div>
                    <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 700, color: C.ink, margin: 0 }}>Add baseline photos</p>
                    <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: 0 }}>Capture your starting point</p>
                  </div>
                </button>
              )}
            </div>

            {!isMale && (
              <>
                <SectionLabel>Menstrual Cycle</SectionLabel>
                <div style={{ padding: '0 18px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: dm, fontSize: 12, color: C.muted }}>Tracking</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: dm, fontSize: 12, color: C.ink }}>{ob.menstrualTracking === "Yes, I'd like to track" ? 'On' : 'Off'}</span>
                      <button onClick={toggleMenstrualTracking} style={{ width: 42, height: 24, borderRadius: 100, background: ob.menstrualTracking === "Yes, I'd like to track" ? C.goldSolid : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.white, position: 'absolute', top: 3, left: ob.menstrualTracking === "Yes, I'd like to track" ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <button onClick={() => navigate('/health-profile')} style={{ width: '100%', padding: '13px 18px', background: 'none', border: 'none', borderTop: `1px solid ${C.mid}`, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Heart size={15} color={C.goldDeep} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 700, color: C.ink, margin: 0 }}>Health Profile,{hpCompleted}/5 complete</p>
                <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: 0 }}>{hpCompleted < 5 ? 'Complete your health profile' : 'Edit health profile'}</p>
              </div>
              <ChevronRight size={14} color={C.muted} />
            </button>

            {/* Goals */}
            <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.mid}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: dm, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Goals</span>
                {!showGoalEditor && (
                  <button onClick={() => { setEditGoals(ob.goals || []); setShowGoalEditor(true); }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.goldDeep }}>
                    <Pencil size={11} /> Edit
                  </button>
                )}
              </div>
              {!showGoalEditor ? (
                ob.goals?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ob.goals.map(g => (
                      <div key={g} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <Target size={12} color={C.goldDeep} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontFamily: dm, fontSize: 12, color: C.ink, margin: 0 }}>{g}</p>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ fontFamily: dm, fontSize: 12, color: C.muted, margin: 0 }}>No goals set yet</p>
              ) : (
                <div>
                  <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.ink, margin: '0 0 10px' }}>Pick up to 3</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {goalOptions.map(g => (
                      <button key={g} onClick={() => toggleEditGoal(g)} disabled={editGoals.length >= 3 && !editGoals.includes(g)}
                        style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 12, cursor: 'pointer', border: editGoals.includes(g) ? `1.5px solid ${C.goldBorder}` : `1.5px solid ${C.mid}`, background: editGoals.includes(g) ? C.gold08 : 'rgba(255,255,255,0.03)', opacity: editGoals.length >= 3 && !editGoals.includes(g) ? 0.5 : 1, transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, border: editGoals.includes(g) ? `2px solid ${C.goldSolid}` : `2px solid ${C.mid}`, background: editGoals.includes(g) ? C.goldSolid : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {editGoals.includes(g) && <Check size={9} color="#0A0908" strokeWidth={2.5} />}
                          </div>
                          <span style={{ fontFamily: dm, fontSize: 12, color: C.ink }}>{g}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setShowGoalEditor(false)} style={{ flex: 1, height: 40, borderRadius: 10, border: `1.5px solid ${C.mid}`, background: 'rgba(255,255,255,0.04)', fontFamily: dm, fontSize: 12, fontWeight: 600, color: C.muted, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={saveGoals} disabled={editGoals.length === 0} style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: editGoals.length > 0 ? C.goldSolid : 'rgba(255,255,255,0.08)', fontFamily: dm, fontSize: 12, fontWeight: 700, color: editGoals.length > 0 ? '#0A0908' : C.muted, cursor: editGoals.length > 0 ? 'pointer' : 'not-allowed' }}>Save</button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => navigate('/my-routine')} style={{ width: '100%', padding: '13px 18px', background: 'none', border: 'none', borderTop: `1px solid ${C.mid}`, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Sparkles size={15} color={C.goldDeep} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 700, color: C.ink, margin: 0 }}>My Routine</p>
                <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: 0 }}>Your personalised scalp care plan</p>
              </div>
              <ChevronRight size={14} color={C.muted} />
            </button>
            <div style={{ height: 4 }} />
          </ProfileSection>

          {/* ── About ── */}
          <div style={{ background: C.card, border: `1.5px solid ${C.mid}`, borderRadius: 16, padding: 18, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Leaf size={15} color={C.goldDeep} strokeWidth={1.8} style={{ marginTop: 1 }} />
              <div>
                <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 700, color: C.ink, margin: '0 0 4px' }}>FolliSense</p>
                <p style={{ fontFamily: dm, fontSize: 11, color: C.muted, margin: '0 0 6px', lineHeight: 1.5 }}>A symptom-tracking and triage tool. It does not provide medical diagnoses.</p>
                <p style={{ fontFamily: dm, fontSize: 10, color: C.muted, margin: 0 }}>Version 1.0</p>
              </div>
            </div>
          </div>

          {/* ── Log out ── */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 20 }}>
            {!showLogoutConfirm ? (
              <button onClick={() => setShowLogoutConfirm(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: dm, fontSize: 12, color: C.muted }}>Log out</button>
            ) : (
              <div style={{ background: C.card, border: `1.5px solid ${C.mid}`, borderRadius: 16, padding: 20, width: '100%', textAlign: 'center' }}>
                <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 16px' }}>Are you sure you want to log out?</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, height: 42, borderRadius: 10, border: `1.5px solid ${C.mid}`, background: 'rgba(255,255,255,0.04)', fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.muted, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={async () => { await supabase.auth.signOut(); resetAll();navigate('/welcome', { replace: true }); }} style={{ flex: 1, height: 42, borderRadius: 10, border: `1px solid ${C.goldBorder}`, background: 'linear-gradient(135deg, #16261B 0%, #0E1610 100%)', fontFamily: dm, fontSize: 13, fontWeight: 700, color: C.goldSolid, cursor: 'pointer' }}>Yes, log out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Delete account modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: C.surface, border: `1px solid ${C.mid}`, borderRadius: 24, padding: 24, maxWidth: 360, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontFamily: playfair, fontSize: 19, color: C.ink, margin: 0 }}>Delete your account?</h3>
                <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X size={18} color={C.muted} strokeWidth={1.8} />
                </button>
              </div>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.warm, lineHeight: 1.6, margin: '0 0 8px' }}>
                This permanently deletes your check-ins, photos, routine, and profile. It cannot be undone.
              </p>
              <p style={{ fontFamily: dm, fontSize: 12, color: C.muted, lineHeight: 1.5, margin: '0 0 16px' }}>
                Type <span style={{ fontWeight: 700, color: C.redSolid }}>DELETE</span> to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                style={{ ...inputStyle, marginBottom: 14, borderColor: deleteConfirmText === 'DELETE' ? C.redSolid : 'rgba(255,255,255,0.10)' }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }} style={{ flex: 1, height: 44, borderRadius: 12, border: `1.5px solid ${C.mid}`, background: 'rgba(255,255,255,0.04)', fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.ink, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: deleteConfirmText === 'DELETE' ? C.redSolid : 'rgba(255,255,255,0.08)', fontFamily: dm, fontSize: 13, fontWeight: 700, color: deleteConfirmText === 'DELETE' ? '#0A0908' : C.muted, cursor: deleteConfirmText === 'DELETE' && !deleting ? 'pointer' : 'not-allowed', opacity: deleting ? 0.6 : 1 }}>
                  {deleting ? 'Deleting…' : 'Delete forever'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;