import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2, Download, ChevronRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { evaluateCCCA, type CCCAFlag } from '@/utils/symptomScoring';
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

// ─── LIGHT THEME,green accent, matched to the app's dark-green palette ─────
const C = {
  bg:         '#FAFAF7',
  surface:    '#FFFFFF',
  card:       '#FFFFFF',
  cardBorder: 'rgba(37,65,45,0.14)',
  ink:        '#1C2620',
  sub:        'rgba(28,38,32,0.48)',
  warm:       'rgba(28,38,32,0.70)',
  gold:       '#25412D',      // primary accent,now green (kept the var name to minimize churn below)
  goldDeep:   '#1F3A2A',
  gold10:     'rgba(37,65,45,0.07)',
  gold20:     'rgba(37,65,45,0.13)',
  goldBorder: 'rgba(37,65,45,0.24)',
  red:        '#B5493D',
  red10:      'rgba(181,73,61,0.08)',
  redBorder:  'rgba(181,73,61,0.26)',
  mid:        'rgba(28,38,32,0.10)',
  divider:    'rgba(37,65,45,0.16)',
};

// CCCA score (0–3) → clinician-facing descriptor, mirrors the check-in option labels
const PART_LABELS  = ['No change', 'Slightly wider', 'Noticeably wider', 'Much wider'];
const CROWN_LABELS = ['No change', 'Slightly thinner', 'Noticeably thinner', 'See-through at the crown'];

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

const Section = ({
  title,
  accent = false,
  children,
  delay = 0,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    style={{
      background:   C.card,
      border:       `1px solid ${C.cardBorder}`,
      borderRadius: 20,
      overflow:     'hidden',
      marginBottom: 12,
      fontFamily:   dm,
      boxShadow:    '0 1px 3px rgba(28,38,32,0.04)',
    }}
  >
    <div style={{
      padding:      '14px 20px 12px',
      borderBottom: `1px solid ${C.divider}`,
      display:      'flex', alignItems: 'center', gap: 8,
    }}>
      {accent && <div style={{ width: 3, height: 14, borderRadius: 2, background: C.gold, flexShrink: 0 }} />}
      <p style={{
        fontFamily:    dm, fontSize: 9, fontWeight: 700,
        color:         accent ? C.gold : C.sub,
        letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0,
      }}>
        {title}
      </p>
    </div>
    <div style={{ padding: '14px 20px 18px' }}>
      {children}
    </div>
  </motion.div>
);

const FieldRow = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div style={{
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    gap:            16,
    padding:        '8px 0',
    borderBottom:   `1px solid ${C.divider}`,
  }}>
    <span style={{ fontFamily: dm, fontSize: 12, color: C.sub, flexShrink: 0, lineHeight: 1.5 }}>{label}</span>
    <span style={{
      fontFamily: dm, fontSize: 12, fontWeight: 600,
      color:      highlight ? C.gold : C.warm,
      textAlign:  'right', maxWidth: '58%', lineHeight: 1.5,
    }}>
      {value}
    </span>
  </div>
);

const BulletItem = ({ text }: { text: string }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0' }}>
    <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0, marginTop: 5 }} />
    <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, margin: 0, lineHeight: 1.6 }}>{text}</p>
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const ClinicianSummary = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ccca, setCcca] = useState<{ part: number; crown: number; flag: CCCAFlag } | null>(null);
  const {
    onboardingData, currentCheckIn,
    healthProfile, baselineRisk, baselineDate,
  } = useApp();

  const today  = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const isMale = onboardingData.gender === 'man';

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) { console.error('Error fetching user:', error); return; }
      setUser(data.user);
    };
    getUser();
  }, []);

  // CCCA cluster,pulled from the latest check-in's symptoms jsonb (where the
  // check-in handlers wrote center_part_widening_score / crown_thinning_score).
  // The flag is recomputed from the scores via evaluateCCCA so the summary always
  // reflects the current threshold, not a stale stored value. Resolves to null
  // for men / pre-feature check-ins (scores absent → both 0), so the section
  // simply doesn't render.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('checkins')
        .select('symptoms')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || error || !data?.symptoms) return;
      const s = data.symptoms as Record<string, unknown>;
      const part  = Number(s.center_part_widening_score ?? 0);
      const crown = Number(s.crown_thinning_score ?? 0);
      if (!part && !crown) { setCcca(null); return; }
      setCcca({ part, crown, flag: evaluateCCCA({ centerPartWidening: part, crownThinning: crown }) });
    })();
    return () => { cancelled = true; };
  }, [user]);

  const hairTypeLabel: Record<string, string> = {
    '3b': '3b,Loose, springy curls',
    '3c': '3c,Tight, corkscrew curls',
    '4a': '4a,Dense, S-shaped coils',
    '4b': '4b,Z-shaped, tightly coiled',
    '4c': '4c,Very tight, densely packed coils',
    'unsure': 'Mixed / Unsure',
  };

  const chemLabel = () => {
    const cp = onboardingData.chemicalProcessing;
    if (!cp || cp === 'No, fully natural' || cp === 'Never') return null;
    let label = cp;
    if (cp === 'Multiple') label = onboardingData.chemicalProcessingMultiple?.join(', ') || 'Multiple (unspecified)';
    if (onboardingData.lastChemicalTreatment) label += `, last: ${onboardingData.lastChemicalTreatment}`;
    if (onboardingData.chemicalBrand) {
      const b = onboardingData.chemicalBrand === 'Other' ? (onboardingData.chemicalBrandOther || 'Other') : onboardingData.chemicalBrand;
      label += `, brand: ${b}`;
    }
    if (onboardingData.chemicalFrequency) label += `, ${onboardingData.chemicalFrequency}`;
    return label;
  };

  // Profile fields
  const fields: { label: string; value: string }[] = [];
  if (onboardingData.hairType) fields.push({ label: 'Hair type', value: hairTypeLabel[onboardingData.hairType] || onboardingData.hairType });
  const chem = chemLabel();
  if (chem) fields.push({ label: 'Chemical processing', value: chem });
  if (onboardingData.protectiveStyles.length > 0) fields.push({ label: 'Current style(s)', value: onboardingData.protectiveStyles.join(', ') });
  if (onboardingData.cycleLength) fields.push({ label: 'Typical cycle length', value: onboardingData.cycleLength });
  if (onboardingData.washFrequency) fields.push({ label: 'Wash frequency', value: onboardingData.washFrequency });
  if (onboardingData.wornOutWashFrequency) fields.push({ label: 'Wash frequency', value: onboardingData.wornOutWashFrequency });

  // Menstrual fields
  const menstrualFields: { label: string; value: string }[] = [];
  if (!isMale && onboardingData.menstrualTracking === "Yes, I'd like to track") {
    const getCycleDay = (): number | null => {
      if (!onboardingData.lastPeriodDate) return null;
      const diff = Math.floor((Date.now() - new Date(onboardingData.lastPeriodDate).getTime()) / 86400000);
      return diff > 0 ? diff : null;
    };
    const getCycleLen = (): number => {
      const m: Record<string, number> = { '21 to 25 days': 23, '26 to 30 days': 28, '31 to 35 days': 33 };
      return m[onboardingData.menstrualCycleLength] || 28;
    };
    const day = getCycleDay();
    const len = getCycleLen();
    if (day) menstrualFields.push({ label: 'Menstrual cycle', value: `Day ${day % len || len} of ~${len} day cycle` });
    if (onboardingData.hormonalContraception) menstrualFields.push({ label: 'Hormonal contraception', value: onboardingData.hormonalContraception });
    menstrualFields.push({ label: 'Menstrual status', value: onboardingData.menstrualCycleLength === 'Irregular' ? 'Irregular' : 'Regular' });
  }

  // Symptoms
  const hasCheckIn = !!currentCheckIn;
  const symptoms: { label: string; value: string }[] = [];
  if (hasCheckIn) {
    if (currentCheckIn.itch)       symptoms.push({ label: 'Itch', value: currentCheckIn.itch });
    if (currentCheckIn.tenderness) symptoms.push({ label: 'Tenderness', value: currentCheckIn.tenderness });
    if (currentCheckIn.flaking)    symptoms.push({ label: 'Flaking', value: currentCheckIn.flaking });
    if (currentCheckIn.hairline)   symptoms.push({ label: 'Hairline changes', value: currentCheckIn.hairline });
    if (currentCheckIn.shedding)   symptoms.push({ label: 'Shedding', value: currentCheckIn.shedding });
  }

  const hairCondition: { label: string; value: string }[] = [];
  if (hasCheckIn) {
    if (currentCheckIn.hairFeel)       hairCondition.push({ label: 'Texture / feel', value: currentCheckIn.hairFeel });
    if (currentCheckIn.hairBreakage)   hairCondition.push({ label: 'Breakage', value: currentCheckIn.hairBreakage });
    if (currentCheckIn.hairAppearance) hairCondition.push({ label: 'Overall appearance', value: currentCheckIn.hairAppearance });
    if (currentCheckIn.hairConcern)    hairCondition.push({ label: 'Hair concern', value: currentCheckIn.hairConcern });
  }

  const baselineFields: { label: string; value: string }[] = [];
  if (onboardingData.baselineItch)       baselineFields.push({ label: 'Baseline itch', value: onboardingData.baselineItch });
  if (onboardingData.baselineTenderness) baselineFields.push({ label: 'Baseline tenderness', value: onboardingData.baselineTenderness });
  if (onboardingData.baselineHairline)   baselineFields.push({ label: 'Baseline hairline', value: onboardingData.baselineHairline });
  if (onboardingData.baselineHairHealth) baselineFields.push({ label: 'Baseline hair health', value: onboardingData.baselineHairHealth });

  const hasScalpProducts = onboardingData.scalpProducts.length > 0;
  const hasHairProducts  = onboardingData.hairProducts.length > 0 && !onboardingData.hairProducts.every(p => p === 'None');

  const negatives = symptoms.filter(s => ['None', 'No', 'Normal', 'No change'].includes(s.value));

  const hp = healthProfile;
  const contextItems: { label: string; value: string }[] = [];
  if (hp.medicalConditions.length > 0 && !hp.medicalConditions.includes('None of these') && !hp.medicalConditions.includes('Prefer not to say'))
    contextItems.push({ label: 'Medical conditions', value: hp.medicalConditions.join(', ') });
  if (hp.pregnancyStatus && hp.pregnancyStatus !== 'No' && hp.pregnancyStatus !== 'Prefer not to say')
    contextItems.push({ label: 'Reproductive status', value: hp.pregnancyStatus });
  if (hp.medications === 'Yes')
    contextItems.push({ label: 'Medications', value: hp.medicationDetails || 'Yes (unspecified)' });
  Object.entries(hp.bloodLevels).forEach(([marker, level]) => {
    if (level === 'Low') contextItems.push({ label: marker, value: 'Low' });
  });
  if (hp.skinConditions.length > 0 && !hp.skinConditions.includes('None')) {
    const items = hp.skinConditions.filter(s => s !== 'Other');
    if (hp.skinConditions.includes('Other') && hp.skinConditionDetails) items.push(hp.skinConditionDetails);
    if (items.length) contextItems.push({ label: 'Skin conditions', value: items.join(', ') });
  }
  if (hp.previousHairLoss && hp.previousHairLoss !== 'No')
    contextItems.push({ label: 'Previous hair loss', value: hp.previousHairLoss });
  if (hp.diagnosedCondition === 'Yes')
    contextItems.push({ label: 'Diagnosed condition', value: hp.diagnosedConditionDetails || 'Yes (unspecified)' });
  if (hp.familyHistory === 'Yes')
    contextItems.push({ label: 'Family history', value: 'Hair loss / thinning' });
  const telogenTriggers: string[] = [];
  if (hp.pregnancyStatus === 'Postpartum (within 12 months)') telogenTriggers.push('Postpartum (within 12 months)');
  const validStressors = (hp.recentStressors || []).filter(s => s !== 'None of these' && s !== 'Prefer not to say');
  telogenTriggers.push(...validStressors);
  if (telogenTriggers.length > 0)
    contextItems.push({ label: 'Potential TE triggers', value: telogenTriggers.join(', ') });

  // ── ACTIONS ────────────────────────────────────────────────────────────────

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'FolliSense Clinical Summary', text: 'Patient-reported scalp symptom summary' });
      } catch { /* cancelled */ }
    } else {
      toast('Share feature coming soon');
    }
  };

  const handleDownloadPDF = async () => {
    if (!user) {
      toast.error('Please log in to download the summary');
      return;
    }

    setIsGenerating(true);

    // Target only the printable content div,NOT the action buttons
    const element = document.getElementById('clinician-summary-printable');

    if (!element) {
      toast.error('Summary content not found');
      setIsGenerating(false);
      return;
    }

    try {
      const opt = {
        margin:     [10, 10, 10, 10] as [number, number, number, number],
        filename:   `FolliSense_Clinical_Summary_${today.replace(/ /g, '_')}.pdf`,
        image:      { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:      { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak:  { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await new Promise(resolve => setTimeout(resolve, 300));

      // Clone only the printable content
      const clone = element.cloneNode(true) as HTMLElement;

      const container = document.createElement('div');
      container.style.position  = 'fixed';
      container.style.top       = '-9999px';
      container.style.left      = '0';
      container.style.width     = '800px';
      container.style.background = 'white';
      container.style.padding   = '20px';

      clone.style.maxWidth  = '800px';
      clone.style.margin    = '0 auto';
      clone.style.padding   = '0';
      clone.style.transform = 'none';

      container.appendChild(clone);
      document.body.appendChild(container);

      const pdfBlob = await html2pdf().from(clone).set(opt).output('blob');

      document.body.removeChild(container);

      // Upload to Supabase Storage
      const fileName = `summaries/${user.id}/${Date.now()}-clinical-summary.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('Clinician-pdfs')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('Clinician-pdfs')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('clinician_summaries')
        .insert({
          user_id:                user.id,
          pdf_url:                publicUrl,
          triggering_checkin_id:  null,
          summary_data: {
            onboardingData,
            currentCheckIn,
            healthProfile,
            baselineRisk,
            baselineDate,
            ccca,
            generatedAt: new Date().toISOString(),
          },
        });

      if (dbError) throw dbError;

      // Trigger browser download
      const url  = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = opt.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Clinical summary downloaded and saved!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: dm, background: C.bg, minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600&display=swap'); * { box-sizing: border-box; }`}</style>

      {/* ══════════════════════════════════════════════════════════════════
          PRINTABLE CONTENT,only this div is captured by html2pdf
      ══════════════════════════════════════════════════════════════════ */}
      <div id="clinician-summary-printable">

        {/* ── HERO ── */}
        <div style={{
          background: `radial-gradient(ellipse 140% 100% at 50% 0%, rgba(37,65,45,0.06) 0%, transparent 60%), linear-gradient(180deg, #FFFFFF 0%, #F7F6F2 100%)`,
          padding: '52px 20px 32px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,65,45,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Nav,shown on screen, hidden in PDF via the back button being OUTSIDE printable div */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, position: 'relative', zIndex: 1 }}>
            <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(28,38,32,0.05)', border: '1px solid rgba(28,38,32,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ArrowLeft size={15} color={C.sub} strokeWidth={1.8} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: 'rgba(37,65,45,0.85)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>FolliSense</span>
            </div>
            <div style={{ width: 34 }} />
          </div>

          {/* Title block */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 100, padding: '4px 12px', marginBottom: 14 }}>
              <span style={{ fontFamily: dm, fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Clinical Document</span>
            </div>
            <h1 style={{ fontFamily: playfair, fontSize: 26, fontWeight: 500, color: C.ink, margin: '0 0 8px', lineHeight: 1.15 }}>Clinical Summary</h1>
            <p style={{ fontFamily: dm, fontSize: 12, color: C.sub, margin: '0 0 4px' }}>Patient-reported scalp and hair symptom summary</p>
            <p style={{ fontFamily: dm, fontSize: 11, color: 'rgba(37,65,45,0.65)', margin: 0 }}>Generated {today}</p>
          </div>

          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(37,65,45,0.28), transparent)`, marginTop: 28 }} />
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: '20px 20px 32px' }}>

          {/* Baseline warning */}
          {baselineRisk === 'red' && baselineDate && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: C.red10, border: `1px solid ${C.redBorder}`, borderRadius: 16, padding: '14px 18px', marginBottom: 12 }}
            >
              <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: C.red }}>Note: </strong>
                Significant symptoms were reported at initial intake on {baselineDate}. No longitudinal trend data available.
              </p>
            </motion.div>
          )}

          {/* Goals */}
          {onboardingData.goals.length > 0 && (
            <Section title="Patient Goals" accent delay={0.05}>
              {onboardingData.goals.map((g, i) => <BulletItem key={i} text={g} />)}
            </Section>
          )}

          {/* Profile */}
          {(fields.length > 0 || menstrualFields.length > 0) && (
            <Section title="Patient Profile" accent delay={0.1}>
              {[...fields, ...menstrualFields].map((f, i) => (
                <FieldRow key={i} label={f.label} value={f.value} />
              ))}
            </Section>
          )}

          {/* Symptoms */}
          {symptoms.length > 0 && (
            <Section title={`Symptoms Reported,${currentCheckIn?.type === 'wash-day' ? 'Wash Day' : 'Mid-Cycle'}, ${currentCheckIn?.date}`} accent delay={0.15}>
              {symptoms.map((s, i) => {
                const isPositive = ['None', 'No', 'Normal', 'No change'].includes(s.value);
                return <FieldRow key={i} label={s.label} value={s.value} highlight={!isPositive} />;
              })}
              {currentCheckIn?.newProducts === 'Yes, I tried something new' && currentCheckIn?.newProductDetails && (
                <FieldRow label="New product this cycle" value={currentCheckIn.newProductDetails} highlight />
              )}
            </Section>
          )}

          {/* Central scalp,part & crown (CCCA cluster) */}
          {ccca && (
            <Section title="Central Scalp,Part & Crown" accent delay={0.17}>
              <FieldRow label="Centre part width" value={PART_LABELS[ccca.part]} highlight={ccca.part >= 2} />
              <FieldRow label="Crown / vertex density" value={CROWN_LABELS[ccca.crown]} highlight={ccca.crown >= 2} />
              {ccca.flag === 'red' && (
                <p style={{ fontFamily: dm, fontSize: 12, color: C.warm, lineHeight: 1.6, margin: '12px 0 0' }}>
                  Centre part widening and crown/vertex thinning reported concurrently, both at moderate or greater severity. This central distribution warrants in-person scalp examination.
                </p>
              )}
              {ccca.flag === 'watch' && (
                <p style={{ fontFamily: dm, fontSize: 12, color: C.sub, lineHeight: 1.6, margin: '12px 0 0' }}>
                  Early central and/or crown changes reported. Recommend monitoring for progression.
                </p>
              )}
            </Section>
          )}

          {/* Hair condition */}
          {hairCondition.length > 0 && (
            <Section title="Hair Condition Observations" delay={0.2}>
              {hairCondition.map((item, i) => <FieldRow key={i} label={item.label} value={item.value} />)}
            </Section>
          )}

          {/* Baseline */}
          {baselineFields.length > 0 && baselineDate && (
            <Section title={`Baseline Assessment,${baselineDate}`} delay={0.25}>
              {baselineFields.map((item, i) => <FieldRow key={i} label={item.label} value={item.value} />)}
            </Section>
          )}

          {/* Products */}
          {(hasScalpProducts || hasHairProducts) && (
            <Section title="Products Used" delay={0.3}>
              {hasScalpProducts && (
                <div style={{ marginBottom: hasHairProducts ? 14 : 0 }}>
                  <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                    Scalp products {onboardingData.scalpProductFrequency || onboardingData.productFrequency ? `· ${onboardingData.scalpProductFrequency || onboardingData.productFrequency}` : ''}
                  </p>
                  {onboardingData.scalpProducts.map((p, i) => <BulletItem key={i} text={p} />)}
                </div>
              )}
              {hasHairProducts && (
                <div>
                  <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                    Hair products {onboardingData.hairProductFrequency ? `· ${onboardingData.hairProductFrequency}` : ''}
                  </p>
                  {onboardingData.hairProducts.filter(p => p !== 'None').map((p, i) => <BulletItem key={i} text={p} />)}
                </div>
              )}
            </Section>
          )}

          {/* Health context */}
          {contextItems.length > 0 && (
            <Section title="Patient Health Context" accent delay={0.35}>
              {contextItems.map((item, i) => <FieldRow key={i} label={item.label} value={item.value} />)}
            </Section>
          )}

          {/* Relevant negatives */}
          {negatives.length > 0 && (
            <Section title="Relevant Negatives" delay={0.4}>
              {negatives.map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(37,65,45,0.45)', flexShrink: 0, marginTop: 5 }} />
                  <p style={{ fontFamily: dm, fontSize: 12, color: C.sub, margin: 0, lineHeight: 1.6 }}>No {n.label.toLowerCase()} concerns reported</p>
                </div>
              ))}
            </Section>
          )}

          {/* Disclaimer */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            style={{ background: C.gold10, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: '14px 18px', marginBottom: 8 }}
          >
            <p style={{ fontFamily: dm, fontSize: 11, color: C.sub, lineHeight: 1.7, margin: 0 }}>
              FolliSense is a symptom-tracking and triage tool. This summary does not constitute a medical diagnosis. Generated {today}.
            </p>
          </motion.div>

        </div>
      </div>
      {/* ══ END PRINTABLE CONTENT ══ */}

      {/* ── ACTION BUTTONS,outside printable div, never captured by html2pdf ── */}
      <div style={{ padding: '0 20px 100px' }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <button
              onClick={handleShare}
              style={{
                flex: 1, height: 46, borderRadius: 14,
                border: `1px solid ${C.goldBorder}`,
                background: C.gold10, color: C.gold,
                fontFamily: dm, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              <Share2 size={14} strokeWidth={2} /> Share
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              style={{
                flex: 1, height: 46, borderRadius: 14,
                border: `1px solid ${C.goldBorder}`,
                background: C.gold10, color: C.gold,
                fontFamily: dm, fontSize: 13, fontWeight: 600,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              <Download size={14} strokeWidth={2} />
              {isGenerating ? 'Generating…' : 'Download PDF'}
            </button>
          </div>

          <button
            onClick={() => navigate('/find-specialist')}
            style={{
              width: '100%', height: 46, borderRadius: 14, marginBottom: 10,
              border: `1px solid rgba(28,38,32,0.10)`,
              background: 'rgba(28,38,32,0.03)',
              color: C.sub, fontFamily: dm, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Find a specialist to share this with
            <ChevronRight size={14} color={C.sub} strokeWidth={1.8} />
          </button>

          <button
            onClick={() => navigate(-1)}
            style={{
              width: '100%', height: 54, borderRadius: 18, border: 'none',
              background: `linear-gradient(135deg, #25412D 0%, #182B1D 100%)`,
              color: '#F5EDE1', fontFamily: dm, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(37,65,45,0.25)',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,168,102,0.4), transparent)' }} />
            Back to results
          </button>
        </motion.div>
      </div>

    </div>
  );
};

export default ClinicianSummary;