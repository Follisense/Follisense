import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Check, ChevronDown, Camera, ShieldCheck, Image as ImageIcon, Eye, Stethoscope, Trash2, Download,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { computeCheckInStatus } from '@/utils/checkInRules';
import type { CheckInData } from '@/contexts/AppContext';
import ScalpBaselineCapture from '@/components/ScalpBaselineCapture';
import NorwoodScale from '@/components/NorwoodScale';
import {
  computeMaleTriageRisk, getSeverityTransitionText, getSeverityLevel,
} from '@/utils/maleTriageLogic';
import { scoreSymptom, scoreToRisk } from '@/utils/symptomScoring';
import { syncOnboardingProfile } from '@/services/onboardingProfileService';
import scalpFrontFemale from '@/assets/scalp-front-female.jpeg';
import scalpSideFemale from '@/assets/scalp-side-female.jpeg';
import scalpBackFemale from '@/assets/scalp-back-female.jpeg';
import refMaleFront from '@/assets/ref-male-front.jpg';
import scalpSideMaleB from '@/assets/scalp-side-male-b.jpeg';
import scalpBackMale from '@/assets/scalp-back-male.png';

// ─── SHARED STYLE ─────────────────────────────────────────────────────────────
// Forest green + Fraunces/Instrument Sans theme (matches mockups).
// If your login theme tokens use slightly different hexes, swap them here,one place only.
const S = {
  bg:      '#F1EEE5',                     // warm cream page background
  card:    '#FAF9F3',                     // card surface
  sage:    '#3E5A46',                     // forest green accent (selection, icons, links)
  sageB:   'rgba(62,90,70,0.12)',         // selected fill
  soft:    '#E7EEE5',                     // soft green banner fill
  border:  '#E4E1D4',
  ink:     '#22261F',
  muted:   '#8C8C7F',
  itemBg:  '#FFFFFF',
  inputBg: '#fff',
  btn:     '#20261E',                     // deep forest CTA (near-black green, per mockups)
};
const HEAD = "'Fraunces', Georgia, 'Times New Roman', serif";
const BODY = "'Instrument Sans', -apple-system, 'Segoe UI', sans-serif";

import hair3A from '@/assets/hair_type_3A_v2.png';
import hair3B from '@/assets/hair_type_3B.png';
import hair3C from '@/assets/hair_type_3C.png';
import hair4A from '@/assets/hair_type_4A.png';
import hair4B from '@/assets/hair_type_4B.png';
import hair4C from '@/assets/hair_type_4C.png';
import hair1 from '@/assets/hair_type_1_v2.png';
import hair2 from '@/assets/hair_type_2_v2.png';

// ─── OPTIONS ─────────────────────────────────────────────────────────────────
const femaleStyleOptions = ['Braids', 'Locs', 'Twists', 'Twist out', 'Wig', 'Weave', 'Silk press', 'Blow out', 'Loose natural', 'Wash and go', 'Cornrows', 'Other'];
const maleStyleOptions   = ['Low cut / fade', 'Waves', 'Locs', 'Twists', 'Cornrows', 'Afro', 'High top', 'Bald / shaved', 'Other'];
const maleLongStyleNames = ['Locs', 'Twists', 'Cornrows'];
const protectiveFreqOptions = ['Most of the time', 'Sometimes', 'Rarely', 'Never'];
const barberFreqOptions     = ['Every 1-2 weeks', 'Every 3-4 weeks', 'Monthly', 'Less often', 'I cut my own hair'];
const cycleLengthOptions    = ['1-2 weeks', '3-4 weeks', '5-6 weeks', '7-8 weeks', 'Longer than 8 weeks', 'Not sure yet'];
const betweenWashOptions    = ['Nothing', 'Oil my scalp', 'Scalp spray or tonic', 'Rinse with water only', 'Other'];
const goalOptions           = ['Grow my edges', 'Less breakage', 'Less shedding', 'Calm itch', 'Length', 'Just staying on top'];
const maleConcernOptions    = ['Hairline recession', 'Thinning at the crown', 'Razor bumps or ingrowns', 'Itching or flaking', 'Scalp irritation', 'I just want to stay on top of things', 'Not sure'];
const chemicalOptions       = [{ id: 'natural', label: 'No, fully natural' }, { id: 'current', label: 'Yes, currently' }, { id: 'growing-out', label: 'Previously, growing out' }, { id: 'unsure', label: 'Not sure' }];
const chemicalTypeOptions   = ['Relaxer', 'Texturiser', 'Keratin treatment', 'Colour / bleach', 'Other'];
const lastTreatmentOptions  = ['Within the last month', '1-3 months ago', '3-6 months ago', '6-12 months ago', 'Over a year ago'];
const chemicalFreqOptions   = ['Every 4-6 weeks', 'Every 2-3 months', 'Every 3-6 months', 'Twice a year or less'];

// ─── SYMPTOM DATA ─────────────────────────────────────────────────────────────
// Questions are conversational; stored values stay canonical (None/Mild/Moderate/Severe)
// so symptomScoring.ts is untouched. Only the labels the user SEES are friendly.
const onboardingSymptoms = [
  { key: 'itch',       label: 'Itching',    question: 'Any itching lately?',                          sub: 'On your scalp, over the last few weeks.' },
  { key: 'flaking',    label: 'Flaking',    question: 'Any flaking or dandruff?',                     sub: 'On your scalp or clothes, recently.' },
  { key: 'tenderness', label: 'Tenderness', question: 'Any tenderness when you touch your scalp?',    sub: 'Especially at the roots or edges.' },
  { key: 'hairline',   label: 'Thinning',   question: 'Noticed any thinning?',                        sub: 'Less volume, or a wider parting.' },
  { key: 'edgeLoss',   label: 'Edge loss',  question: 'How are your edges holding up?',               sub: 'Any thinning or pulling back at the hairline.' },
  { key: 'shedding',   label: 'Breakage',   question: 'More breakage or shedding than usual?',        sub: 'Short pieces, snapping, uneven lengths.' },
  { key: 'bumps',      label: 'Bumps',      question: 'Any bumps on your scalp?',                     sub: 'Small raised areas, painful or not.' },
  { key: 'dryness',    label: 'Dryness',    question: 'Has your scalp been feeling dry?',             sub: 'Tightness or dryness between washes.' },
];
const maleCoreSymptoms = [
  { key: 'hairlineChange', label: 'Hairline changes', question: 'Any changes to your hairline?',   sub: 'Compared to a few months ago.' },
  { key: 'thinning',      label: 'Thinning',          question: 'Any thinning at your temples or crown?', sub: 'Even if it feels subtle.' },
  { key: 'scalpIssues',   label: 'Scalp issues',      question: 'Any itching, flaking, or dryness?', sub: 'Over the last few weeks.' },
];
const maleSecondaryShort = [
  { key: 'razorBumps',       label: 'Razor bumps', question: 'Any razor bumps or ingrown hairs?', sub: 'After recent cuts.' },
  { key: 'barberIrritation', label: 'Irritation',  question: 'Any irritation after your last cut?', sub: 'Redness, burning, or a rash.' },
];
const maleSecondaryLong = [
  { key: 'buildup',    label: 'Buildup',    question: 'Any buildup or odour between washes?', sub: 'At the roots or along parts.' },
  { key: 'tenderness', label: 'Tenderness', question: 'Any tenderness or tightness at the roots?', sub: 'Especially after retwists or installs.' },
];
const maleSecondaryAfro = [{ key: 'breakage', label: 'Breakage', question: 'Any breakage or excessive shedding?', sub: 'Short pieces or more hair than usual.' }];

const severityOptions = ['None', 'Mild', 'Moderate', 'Severe'];
// What the user sees on each option (canonical value stays as the key)
const severityDisplay: Record<string, string> = { None: 'None', Mild: 'A little', Moderate: 'Quite a bit', Severe: 'A lot' };
const friendlySeverity: Record<string, string> = { mild: 'A little', moderate: 'Quite a bit', severe: 'A lot' };

const severityDescriptors: Record<string, Record<string, string>> = {
  itch:             { None: 'No itching', Mild: 'Occasional itch, easy to ignore', Moderate: 'Frequent itching, hard to leave alone', Severe: 'Constant itching, disrupts your day' },
  flaking:          { None: 'No flaking', Mild: 'A few flakes when you scratch or part', Moderate: 'Visible flakes on your scalp or clothes', Severe: 'Heavy, persistent flaking' },
  tenderness:       { None: 'No tenderness', Mild: 'Slight sensitivity when you press', Moderate: 'Sore to touch, especially at edges', Severe: 'Painful without touching' },
  hairline:         { None: 'No thinning', Mild: 'Slightly less volume than usual', Moderate: 'Noticeably thinner areas, wider parting', Severe: 'Scalp clearly visible through hair' },
  edgeLoss:         { None: 'No edge loss', Mild: 'Edges slightly thinner than before', Moderate: 'Visible thinning at temples or hairline', Severe: 'Significant recession, hairline has pulled back' },
  shedding:         { None: 'No breakage', Mild: 'A few short pieces when styling', Moderate: 'Noticeable snapping, uneven lengths', Severe: 'Significant breakage daily' },
  bumps:            { None: 'No bumps', Mild: 'A few small bumps, not painful', Moderate: 'Multiple bumps, some tenderness', Severe: 'Widespread, painful, or spreading' },
  dryness:          { None: 'No dryness', Mild: 'Slightly dry or tight between washes', Moderate: 'Dry and flaky despite moisturising', Severe: 'Extremely dry, cracking, or painful' },
  hairlineChange:   { None: 'No changes noticed', Mild: 'Something looks slightly different', Moderate: 'Hairline has visibly moved back or thinned', Severe: 'Clear recession compared to a year ago' },
  thinning:         { None: 'No thinning', Mild: 'Slightly thinner at crown or temples', Moderate: 'Noticeably thinner, scalp more visible', Severe: 'Scalp clearly visible, hairline receding' },
  scalpIssues:      { None: 'No scalp issues', Mild: 'Occasional itch or a few flakes', Moderate: 'Frequent itching, visible flaking', Severe: 'Constant discomfort, heavy flaking' },
  razorBumps:       { None: 'No razor bumps', Mild: 'A few bumps after a cut', Moderate: 'Regular bumps, some painful or inflamed', Severe: 'Persistent bumps, pus-filled or scarring' },
  barberIrritation: { None: 'No irritation after cuts', Mild: 'Slight redness for a day or two', Moderate: 'Burning or rash lasting several days', Severe: 'Intense reaction every time' },
  buildup:          { None: 'No buildup or odour', Mild: 'Slight buildup, no smell', Moderate: 'Noticeable buildup or faint odour', Severe: 'Heavy buildup, persistent odour' },
  breakage:         { None: 'No breakage', Mild: 'A few short pieces when styling', Moderate: 'Noticeable shedding, uneven lengths', Severe: 'Significant breakage or shedding daily' },
};

const symptomAcks: Record<string, { mild: string; moderate: string; severe: string }> = {
  itch:             { mild: "Thanks. We'll keep an eye on this together.", moderate: "That level of itching is worth tracking. Noted.", severe: "Constant itching can really affect your day. We'll make this a priority." },
  flaking:          { mild: "Noted. We'll factor this in.", moderate: "More flaking than usual. We'll watch it with you.", severe: "Heavy flaking like that deserves attention. Noted." },
  tenderness:       { mild: "Good that you flagged it.", moderate: "Tenderness can signal something underneath. We'll track it.", severe: "Pain on your scalp shouldn't be ignored. Noted." },
  hairline:         { mild: "Slight changes are hard to spot. Good that you noticed.", moderate: "Noticeable thinning is worth paying attention to.", severe: "Significant thinning deserves professional input. We'll flag this." },
  edgeLoss:         { mild: "Noted. We'll track your edges closely.", moderate: "Edge thinning at this level is worth watching.", severe: "Significant edge loss needs attention soon. Noted." },
  shedding:         { mild: "Noted. We'll see how this tracks.", moderate: "More breakage than expected. We'll watch it.", severe: "That level of breakage can signal something deeper. Noted." },
  bumps:            { mild: "Noted. We'll see if they persist.", moderate: "Multiple bumps are worth keeping an eye on.", severe: "A professional should take a look at this soon. Noted." },
  dryness:          { mild: "Noted. We'll factor this in.", moderate: "Persistent dryness can affect your scalp barrier. Noted.", severe: "Severe dryness can lead to other problems. We'll track it." },
  razorBumps:       { mild: "Noted. We'll track whether these recur.", moderate: "Regular bumps after cuts are worth watching.", severe: "Persistent razor bumps can lead to scarring. Noted." },
  barberIrritation: { mild: "Noted. We'll see if there's a pattern.", moderate: "Reactions like that aren't something you should just live with.", severe: "That kind of reaction every time needs professional attention." },
  hairlineChange:   { mild: "Slight changes are hard to be sure about. Good that you noticed.", moderate: "Visible changes to your hairline are worth monitoring.", severe: "That level of change deserves professional attention." },
  thinning:         { mild: "Slight thinning can be hard to spot. Noted.", moderate: "Noticeable thinning is worth paying attention to.", severe: "Significant thinning deserves professional input." },
  scalpIssues:      { mild: "Noted. We'll factor this in.", moderate: "Persistent scalp issues are worth watching together.", severe: "Severe scalp discomfort needs attention. Noted." },
  buildup:          { mild: "Noted.", moderate: "Noticeable buildup is worth addressing.", severe: "Heavy buildup can affect scalp health. Noted." },
  breakage:         { mild: "Noted.", moderate: "More breakage than expected. We'll watch it.", severe: "That level of breakage can signal something deeper." },
};

const getAck = (severity: string, label: string, key: string): string | null => {
  if (severity === 'None') return null;
  const sevKey = severity.toLowerCase() as 'mild' | 'moderate' | 'severe';
  return symptomAcks[key]?.[sevKey] || symptomAcks[label.toLowerCase()]?.[sevKey] || null;
};

// ─── SELF-CARE (no products, no diagnoses,routine and habit guidance only) ──
const getSelfCareTips = (responses: Record<string, string>): string[] => {
  const lvl = (k: string) => getSeverityLevel(responses[k] || 'None');
  const tips: string[] = [];
  if (lvl('tenderness') > 0 || lvl('edgeLoss') > 0 || lvl('hairline') > 0 || lvl('hairlineChange') > 0 || lvl('thinning') > 0)
    tips.push("Loosen anything that feels tight. A style should never hurt, especially at your edges.");
  if (lvl('itch') > 0 || lvl('flaking') > 0 || lvl('dryness') > 0 || lvl('scalpIssues') > 0 || lvl('buildup') > 0)
    tips.push("Plan a gentle wash day soon, and let your scalp dry fully afterwards.");
  if (lvl('shedding') > 0 || lvl('breakage') > 0)
    tips.push("Keep manipulation low this week,less combing, less tension, more rest.");
  if (lvl('razorBumps') > 0 || lvl('barberIrritation') > 0 || lvl('bumps') > 0)
    tips.push("Keep the area clean and hands-off, and give your skin a break before the next cut or install.");
  tips.push("Note when it started and what changed around then,new style, new routine, stress. It sharpens your next check-in.");
  return tips.slice(0, 4);
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const SelCard = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} style={{
    border: `1.5px solid ${selected ? S.sage : S.border}`, borderRadius: 12, padding: 12,
    width: '100%', textAlign: 'left', background: selected ? S.sageB : S.itemBg,
    cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(34,38,31,0.04)',
  }}>
    {children}
  </button>
);

const RadioDot = ({ selected }: { selected: boolean }) => (
  <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? S.sage : 'transparent', border: selected ? 'none' : `2px solid #d8d5c9` }}>
    {selected && <Check size={10} color="#fff" strokeWidth={2.5} />}
  </div>
);

const BoxDot = ({ selected }: { selected: boolean }) => (
  <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? S.sage : 'transparent', border: selected ? 'none' : `2px solid #d8d5c9` }}>
    {selected && <Check size={10} color="#fff" strokeWidth={2.5} />}
  </div>
);

const PillBtn = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} style={{
    border: `1.5px solid ${selected ? S.sage : S.border}`, borderRadius: 100, padding: '9px 16px',
    background: selected ? S.sageB : S.itemBg, cursor: 'pointer', fontSize: '0.875rem',
    fontWeight: selected ? 600 : 400,
    color: selected ? S.ink : S.muted, transition: 'all 0.15s', whiteSpace: 'nowrap' as const,
  }}>
    {children}
  </button>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontFamily: HEAD, fontSize: '0.95rem', fontWeight: 600, color: S.ink, marginBottom: 12 }}>{children}</p>
);

const SubLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: '0.75rem', color: S.muted, marginBottom: 8 }}>{children}</p>
);

const CTA = ({ onClick, children, secondary, innerRef }: { onClick: () => void; children: React.ReactNode; secondary?: boolean; innerRef?: React.Ref<HTMLButtonElement> }) => (
  <button ref={innerRef} onClick={onClick} style={{
    width: '100%', height: secondary ? 52 : 56, borderRadius: 14,
    border: secondary ? `1.5px solid ${S.border}` : 'none',
    background: secondary ? S.itemBg : S.btn, color: secondary ? S.ink : '#fff',
    fontWeight: 600, fontSize: secondary ? '0.9rem' : '1rem', cursor: 'pointer', marginTop: secondary ? 10 : 0,
  }}>
    {children}
  </button>
);

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
const ProgressBar = ({ current, total }: { current: number; total: number }) => (
  <div style={{ display: 'flex', gap: 8 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{ height: 6, width: 32, borderRadius: 100, backgroundColor: i <= current ? S.sage : '#e2dfd3', transition: 'background-color 0.3s' }} />
    ))}
  </div>
);

// ─── BASELINE RESULT ──────────────────────────────────────────────────────────
// No named conditions, no product recommendations. Green shows the baseline card;
// amber routes to self-care; red leads with the clinician summary and a specialist.
interface TriageResultProps {
  risk: 'green' | 'amber' | 'red';
  symptomResponses: Record<string, string>;
  activeSymptoms: { key: string; label: string; question: string }[];
  isMale: boolean;
  onContinue: () => void;
  completeAndNavigate: (dest: string) => void;
}

const TriageResult = ({ risk, symptomResponses, activeSymptoms, isMale, onContinue, completeAndNavigate }: TriageResultProps) => {
  const flagged = activeSymptoms
    .filter(s => getSeverityLevel(symptomResponses[s.key]) > 0)
    .map(s => {
      const level = getSeverityLevel(symptomResponses[s.key]);
      return { label: s.label, severity: level === 1 ? 'mild' : level === 2 ? 'moderate' : 'severe', level };
    });

  // "What influenced this",flagged items first; if nothing flagged, show the
  // first couple of clean readings so the card never feels empty (mockup 1.15).
  const influenced = flagged.length > 0
    ? flagged.map(f => ({ label: f.label, value: friendlySeverity[f.severity], level: f.level }))
    : activeSymptoms.slice(0, 2).map(s => ({ label: s.label, value: 'None', level: 0 }));

  const accentColor = risk === 'green' ? '#4C7A5A' : risk === 'amber' ? '#C0873E' : '#B85C5C';

  const headlineText =
    risk === 'green' ? 'Your baseline is set'
    : risk === 'amber' ? 'Your baseline is set, with watch points'
    : 'Your baseline is set,and worth a professional look';

  const subText =
    risk === 'green'
      ? "Nothing's flagging today. This is your starting point, and we'll track from here."
      : risk === 'amber'
      ? "Some of what you told us is worth keeping an eye on. We'll track it closely from here, and the steps below can help in the meantime."
      : "The combination you reported deserves a review by a trichologist or dermatologist. We've packaged what you told us to make that easy.";

  const selfCare = risk === 'green' ? [] : getSelfCareTips(symptomResponses);

  return (
    <div>
      {/* Headline card,soft green banner like mockup 1.15 */}
      <div style={{ background: risk === 'green' ? S.soft : S.itemBg, border: `1.5px solid ${risk === 'green' ? 'transparent' : S.border}`, borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
        {risk !== 'green' && <div style={{ height: 4, background: accentColor }} />}
        <div style={{ padding: '18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {risk === 'green' && <Check size={16} color="#fff" strokeWidth={2.5} />}
              {risk === 'amber' && <Eye size={15} color="#fff" strokeWidth={2} />}
              {risk === 'red'   && <Stethoscope size={15} color="#fff" strokeWidth={2} />}
            </div>
            <p style={{ fontFamily: HEAD, fontSize: 17, fontWeight: 600, color: S.ink, margin: 0, lineHeight: 1.25 }}>{headlineText}</p>
          </div>
          <p style={{ fontSize: 13, color: risk === 'green' ? '#4d5a4c' : S.muted, lineHeight: 1.6, margin: 0 }}>{subText}</p>
        </div>
      </div>

      {/* What influenced this */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: S.muted, margin: '0 0 10px' }}>What influenced this</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {influenced.map((s, i) => {
            const dot = s.level === 0 ? '#d8d5c9' : s.level === 1 ? '#4C7A5A' : s.level === 2 ? '#C0873E' : '#B85C5C';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: S.itemBg, border: `1.5px solid ${S.border}`, borderRadius: 12, padding: '13px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${dot}`, background: s.level > 0 ? dot : 'transparent', flexShrink: 0 }} />
                  <p style={{ fontSize: 14, color: S.ink, margin: 0 }}>{s.label}</p>
                </div>
                <p style={{ fontSize: 13, color: S.muted, margin: 0 }}>{s.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Self-care,habits and routine only, never products or treatments */}
      {selfCare.length > 0 && (
        <div style={{ background: S.itemBg, border: `1.5px solid ${S.border}`, borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: 3, background: accentColor, opacity: 0.4 }} />
          <div style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 12px' }}>
              {risk === 'red' ? 'While you find a specialist' : 'In the meantime'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selfCare.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${accentColor}18`, border: `1px solid ${accentColor}40`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: accentColor, marginTop: 1 }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: 12.5, color: '#5c5c52', lineHeight: 1.55, margin: 0 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* What this means,red only. No condition names, no diagnosis. */}
      {risk === 'red' && (
        <div style={{ background: 'rgba(184,92,92,0.06)', border: '1.5px solid rgba(184,92,92,0.18)', borderRadius: 18, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#B85C5C', margin: '0 0 6px' }}>What this means</p>
          <p style={{ fontSize: 12.5, color: '#5c5c52', lineHeight: 1.6, margin: 0 }}>
            Symptoms at this level respond best to early professional input. This isn't a diagnosis,it's your record, organised so a specialist can pick it up quickly.
          </p>
        </div>
      )}

      {/* Next steps,these SAVE your baseline first, so back always takes you home */}
      {(risk === 'amber' || risk === 'red') && (
        <div style={{ background: S.itemBg, border: `1.5px solid ${S.border}`, borderRadius: 18, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 10px' }}>Next steps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {risk === 'red' && (
              <button onClick={() => completeAndNavigate('/clinician-summary')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12, background: `${accentColor}12`, border: `1.5px solid ${accentColor}40`, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: S.ink, margin: 0 }}>Generate clinician summary</p>
                  <p style={{ fontSize: 11, color: S.muted, margin: '1px 0 0' }}>Share your symptoms with a professional</p>
                </div>
                <ChevronDown size={14} color={accentColor} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            )}
            <button onClick={() => completeAndNavigate('/find-specialist')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12, background: `${S.sage}10`, border: `1.5px solid ${S.sage}40`, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: S.ink, margin: 0 }}>Find a specialist</p>
                <p style={{ fontSize: 11, color: S.muted, margin: '1px 0 0' }}>Trichologists and dermatologists near you</p>
              </div>
              <ChevronDown size={14} color={S.sage} style={{ transform: 'rotate(-90deg)' }} />
            </button>
          </div>
        </div>
      )}

      <CTA onClick={onContinue}>Continue</CTA>
    </div>
  );
};

// ─── LENGTH CHECK ─────────────────────────────────────────────────────────────
const lengthStepsLong  = [{ title: 'Front', instruction: 'Pull a section of hair straight down alongside your face. Show your true length past shrinkage.' }, { title: 'Side', instruction: 'Pull a section over your ear to show side length.' }, { title: 'Back', instruction: 'Pull a section down your back to show back length.' }];
const lengthStepsShort = [{ title: 'Front', instruction: 'Take a photo of your hair from the front as it is now.' }, { title: 'Side', instruction: 'Take a photo from the side.' }, { title: 'Back', instruction: 'Take a photo from the back.' }];
const getLengthRef = (gender: string, index: number) => {
  const fRefs = [scalpFrontFemale, scalpSideFemale, scalpBackFemale];
  const mRefs = [refMaleFront, scalpSideMaleB, scalpBackMale];
  return (gender === 'man' ? mRefs : fRefs)[index] || fRefs[index] || '';
};

const LengthCheckPhotos = ({ isShortHair, gender, onComplete, onSkip }: { isShortHair: boolean; gender: string; onComplete: (p: { area: string; dataUrl: string }[]) => void; onSkip: () => void }) => {
  const steps = isShortHair ? lengthStepsShort : lengthStepsLong;
  const [cur, setCur]     = useState(0);
  const [photos, setPhotos] = useState<{ area: string; dataUrl: string }[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const step = steps[cur];
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => setPreview(r.result as string); r.readAsDataURL(f); e.target.value = '';
  };
  const handleUse = () => {
    if (!preview) return;
    const np = [...photos, { area: step.title, dataUrl: preview }];
    setPhotos(np); setPreview(null);
    if (cur < steps.length - 1) setCur(cur + 1); else onComplete(np);
  };
  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: S.muted, marginBottom: 4 }}>{cur + 1} of {steps.length}</p>
      <h2 style={{ fontFamily: HEAD, fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>{step.title}</h2>
      <p style={{ fontSize: '0.875rem', color: S.muted, marginBottom: 20, lineHeight: 1.6 }}>{step.instruction}</p>
      {!preview ? (
        <>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${S.border}`, marginBottom: 20, background: S.itemBg }}>
            <img src={getLengthRef(gender, cur)} alt={step.title} style={{ width: '100%', height: 200, objectFit: 'contain', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ width: '100%', height: 52, borderRadius: 14, background: S.btn, color: '#fff', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
              <Camera size={18} strokeWidth={1.8} /> Take photo
              <input type="file" accept="image/*" capture="user" onChange={handleFile} style={{ display: 'none' }} />
            </label>
            <label style={{ width: '100%', height: 52, borderRadius: 14, border: `1.5px solid ${S.border}`, background: S.itemBg, fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: S.ink }}>
              <ImageIcon size={18} strokeWidth={1.8} /> Choose from gallery
              <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          </div>
          <button onClick={onSkip} style={{ width: '100%', textAlign: 'center', fontSize: '0.875rem', color: S.muted, marginTop: 16, padding: 8, background: 'none', border: 'none', cursor: 'pointer' }}>Skip length check</button>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${S.border}`, marginBottom: 20 }}>
            <img src={preview} alt="Preview" style={{ width: '100%', height: 240, objectFit: 'contain', display: 'block', background: S.itemBg }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleUse} style={{ width: '100%', height: 52, borderRadius: 14, background: S.btn, color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Use this photo</button>
            <button onClick={() => setPreview(null)} style={{ width: '100%', height: 52, borderRadius: 14, border: `1.5px solid ${S.border}`, background: S.itemBg, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', color: S.ink }}>Retake</button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// Step map (female): -1 welcome · 0 gender · 1 hair type · 2 chemical · 3 styles
// · 4 routine · 5 GOALS (new, chips) · 12 REFLECTION (new) · 6 photo consent
// · 13 PHOTOS-DECLINED (new) · 7 baseline photos · 8 symptoms+result · 9/10 length · 11 done
// Male: 0 · 20–24 · 12 · 6 · (13) · 7 · 8 · 11
const TOTAL_FEMALE = 8;
const TOTAL_MALE   = 8;

const Onboarding = () => {
  const navigate = useNavigate();
  const { onboardingData, setOnboardingData, setOnboardingComplete, addToCheckInHistory, setCurrentCheckIn, setBaselineRisk, setBaselineDate, setBaselinePhotos } = useApp();

  const [step, setStep]                   = useState(-1);
  const [consentChecked, setConsentChecked] = useState(false);
  const consentButtonRef                  = useRef<HTMLButtonElement>(null);
  const gender  = onboardingData.gender;
  const isMale  = gender === 'man';
  const isNeutral = gender === 'prefer-not-to-say';

  const [hairType, setHairType]             = useState(onboardingData.hairType || '');
  const [hairSubType, setHairSubType]       = useState('');
  const [hairContinue, setHairContinue]     = useState(false);
  const [chemicalStatus, setChemicalStatus] = useState(onboardingData.chemicalProcessing || '');
  const [chemicalStep, setChemicalStep]     = useState(0);
  const [chemicalTypes, setChemicalTypes]   = useState<string[]>(onboardingData.chemicalProcessingMultiple || []);
  const [chemicalOther, setChemicalOther]   = useState('');
  const [lastTreatment, setLastTreatment]   = useState(onboardingData.lastChemicalTreatment || '');
  const [chemicalFreq, setChemicalFreq]     = useState(onboardingData.chemicalFrequency || '');
  const [styles, setStyles]                 = useState<string[]>(onboardingData.protectiveStyles || []);
  const [otherStyle, setOtherStyle]         = useState(onboardingData.otherStyle || '');
  const [protectiveFreq, setProtectiveFreq] = useState(onboardingData.protectiveStyleFrequency || '');
  const [showMoreStyles, setShowMoreStyles] = useState(false);
  const [barberFreq, setBarberFreq]         = useState('');
  const [cycleLength, setCycleLength]       = useState(onboardingData.cycleLength || '');
  const [betweenWash, setBetweenWash]       = useState<string[]>(onboardingData.betweenWashCare || []);
  const [otherBetween, setOtherBetween]     = useState(onboardingData.otherBetweenWashCare || '');
  const [concerns, setConcerns]             = useState<string[]>(onboardingData.goals || []);
  const [norwoodStage, setNorwoodStage]     = useState(onboardingData.norwoodBaseline || '');
  const [mFamilyHistory, setMFamilyHistory] = useState(onboardingData.familyHistory || '');
  const [mCutCadence, setMCutCadence]       = useState(onboardingData.cutCadence || '');
  const [symptomPhase, setSymptomPhase]     = useState<'transition' | 'symptoms' | 'thanks' | 'result'>('transition');
  const [symptomIndex, setSymptomIndex]     = useState(0);
  const [symptomResponses, setSymptomResponses] = useState<Record<string, string>>({});
  const [symptomAck, setSymptomAck]         = useState<string | null>(null);
  const [triageResult, setTriageResult]     = useState<'green' | 'amber' | 'red' | null>(null);
  const [lengthPhotos, setLengthPhotos]     = useState<{ area: string; dataUrl: string }[]>([]);

  const maleHasShortStyles  = isMale && styles.some(s => ['Low cut / fade', 'Waves', 'Bald / shaved'].includes(s));
  const maleHasLongStyles   = isMale && styles.some(s => maleLongStyleNames.includes(s));
  const maleHasAfroOnly     = isMale && styles.includes('Afro') && !maleHasShortStyles && !maleHasLongStyles;
  const maleIsShortOnly     = isMale && !maleHasLongStyles;

  const getMaleSymptoms = () => {
    const core = [...maleCoreSymptoms];
    if (maleHasShortStyles) return [...core, ...maleSecondaryShort];
    if (maleHasLongStyles)  return [...core, ...maleSecondaryLong];
    if (maleHasAfroOnly)    return [...core, ...maleSecondaryAfro];
    return core;
  };
  const activeSymptoms    = isMale ? getMaleSymptoms() : onboardingSymptoms;
  const activeDescriptors = severityDescriptors;

  const rawStyleOptions = isMale ? maleStyleOptions : isNeutral ? [...new Set([...femaleStyleOptions, ...maleStyleOptions])] : femaleStyleOptions;
  const isRelaxed       = chemicalStatus === 'current' && (chemicalTypes.includes('Relaxer') || chemicalTypes.includes('Texturiser'));
  const filteredStyles  = isRelaxed ? rawStyleOptions.filter(s => s !== 'Loose natural' && s !== 'Wash and go') : rawStyleOptions;

  const toggleStyle    = (s: string) => setStyles(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleBetween  = (v: string) => { if (v === 'Nothing') { setBetweenWash(p => p.includes(v) ? [] : [v]); return; } setBetweenWash(p => { const w = p.filter(x => x !== 'Nothing'); return w.includes(v) ? w.filter(x => x !== v) : [...w, v]; }); };
  const toggleConcern  = (c: string) => setConcerns(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  // Goals: max three,they shape the routine, never the safety checks
  const toggleGoal     = (g: string) => setConcerns(p => p.includes(g) ? p.filter(x => x !== g) : p.length >= 3 ? p : [...p, g]);
  const toggleChemType = (t: string) => setChemicalTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const getProgressSeg = () => {
    if (isMale) { if (step <= 0) return 0; if (step === 20) return 1; if (step === 21) return 2; if (step === 22) return 3; if (step === 23) return 4; if (step === 24 || step === 12) return 5; if (step === 6 || step === 7 || step === 13) return 6; if (step >= 8) return 7; return 0; }
    if (step <= 0) return 0; if (step === 1) return 1; if (step === 2) return 2; if (step === 3) return 3; if (step === 4) return 4; if (step === 5 || step === 12) return 5; if (step === 6 || step === 7 || step === 13) return 6; return 7;
  };

  useEffect(() => {
    if (consentChecked && consentButtonRef.current) setTimeout(() => consentButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  }, [consentChecked]);

  useEffect(() => {
    if (step === 8 && symptomPhase === 'transition') { const t = setTimeout(() => { setSymptomPhase('symptoms'); setSymptomIndex(0); setSymptomAck(null); }, 2500); return () => clearTimeout(t); }
    if (step === 8 && symptomPhase === 'thanks') { const t = setTimeout(() => setSymptomPhase('result'), 2000); return () => clearTimeout(t); }
  }, [step, symptomPhase]);

  const buildCheckIn = (responses: Record<string, string>): CheckInData => ({
    itch: responses.itch || responses.scalpIssues || 'None', tenderness: responses.tenderness || 'None',
    hairline: responses.hairline || responses.hairlineChange || 'None', flaking: responses.flaking || 'None',
    shedding: responses.shedding || responses.breakage || 'None', bumps: responses.bumps || 'None',
    dryness: responses.dryness || 'None', razorBumps: responses.razorBumps || 'None',
    barberIrritation: responses.barberIrritation || 'None',
    type: 'baseline', date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  });

  const saveAndComplete = (checkIn: CheckInData, risk: 'green' | 'amber' | 'red', dest: string = '/home') => {
    // Build once and use for both the context update and the database write.
    // Passing `onboardingData` to the save instead of this object is a stale
    // closure: it is the value from before setOnboardingData runs, so only the
    // fields set on earlier steps (gender) reach the database.
    const merged = { ...onboardingData, hairType: hairSubType || hairType, chemicalProcessing: chemicalStatus, chemicalProcessingMultiple: chemicalTypes, chemicalFrequency: chemicalFreq, lastChemicalTreatment: lastTreatment, protectiveStyles: styles, otherStyle, protectiveStyleFrequency: protectiveFreq, barberFrequency: barberFreq, cycleLength, betweenWashCare: betweenWash, otherBetweenWashCare: otherBetween, goals: concerns, norwoodBaseline: norwoodStage, familyHistory: mFamilyHistory, cutCadence: mCutCadence };
    setOnboardingData(merged);
    // Save numeric scores to Supabase baseline check-in
    import('@/lib/supabaseClient').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return;
        const numericScores = {
          itch_score:          scoreSymptom('itch',          checkIn.itch       ?? ''),
          tenderness_score:    scoreSymptom('tenderness',    checkIn.tenderness ?? ''),
          hairline_score:      scoreSymptom('hairline',      checkIn.hairline   ?? ''),
          flaking_score:       scoreSymptom('flaking',       checkIn.flaking    ?? ''),
          shedding_score:      scoreSymptom('shedding',      checkIn.shedding   ?? ''),
          bumps_score:         scoreSymptom('bumps',         checkIn.bumps      ?? ''),
          dryness_score:       scoreSymptom('dryness',       checkIn.dryness    ?? ''),
        };
        const total = Object.values(numericScores).reduce((a, b) => a + b, 0);
        supabase.from('checkins').insert({
          user_id:     session.user.id,
          type:        'symptoms',
          symptoms:    {
            itch: checkIn.itch, tenderness: checkIn.tenderness, hairline: checkIn.hairline,
            flaking: checkIn.flaking, shedding: checkIn.shedding, bumps: checkIn.bumps, dryness: checkIn.dryness,
            ...numericScores, total_score: total, risk_level: scoreToRisk(total),
          },
         // Score COLUMNS, not just the jsonb. Without these the columns sit at
          // their default of 0 while symptoms holds the real answers, which is
          // what made the clinician summary read "0 of 20" on a check-in where
          // two symptoms were reported.
          ...numericScores,
          total_score:   total,
          triage_result: scoreToRisk(total),
          is_baseline: true,
        }).then(({ error }) => { if (error) console.error('[Onboarding] baseline save error:', error); });
        supabase.from('consumer_profiles').update({ hair_goals: concerns })
          .eq('user_id', session.user.id)
          .then(({ error }) => { if (error) console.error('[Onboarding] hair_goals save error:', error); });
      });
    });
    syncOnboardingProfile(merged);
    sessionStorage.setItem('follisense-just-onboarded', 'true');
    setOnboardingComplete(true);
    navigate(dest);
  };

  const handlePhotosComplete = (photos: { area: string; dataUrl: string }[]) => {
    setBaselinePhotos(photos.map(p => ({ area: p.area, captured: true, date: new Date().toISOString(), dataUrl: p.dataUrl }))); setStep(8); setSymptomPhase('transition');
  };

  const handleBack = () => {
    if (step === -1) { navigate(-1); return; }
    if (step === 0)  { setStep(-1); return; }
    if (step === 13) { setStep(6); return; }
    if (step === 12) { setStep(isMale ? 24 : 5); return; }
    if (step === 6)  { setStep(12); return; }
    if (step === 8) {
      if (symptomPhase === 'thanks' || symptomPhase === 'result') { setSymptomPhase('symptoms'); setSymptomIndex(activeSymptoms.length - 1); setSymptomAck(null); return; }
      if (symptomPhase === 'symptoms' && symptomAck)             { setSymptomAck(null); return; }
      if (symptomPhase === 'symptoms' && symptomIndex > 0)       { setSymptomIndex(i => i - 1); return; }
      setStep(7); return;
    }
    if (step === 2 && chemicalStep > 0) { setChemicalStep(c => c - 1); return; }
    if (isMale) { if (step === 20) { setStep(0); return; } if (step === 21) { setStep(20); return; } if (step === 22) { setStep(21); return; } if (step === 23) { setStep(22); return; } if (step === 24) { setStep(23); return; } if (step === 7) { setStep(6); return; } if (step === 11) { setStep(8); return; } }
    if (step > 0) { if (step === 2) setChemicalStep(0); setStep(s => s - 1); }
  };

  const finishOnboarding = () => { const checkIn = buildCheckIn(symptomResponses); saveAndComplete(checkIn, triageResult || 'green'); };
  const finishToClinicianSummary = () => { const checkIn = buildCheckIn(symptomResponses); saveAndComplete(checkIn, triageResult || 'green', '/clinician-summary'); };
  // Used by the result screen buttons,saves and completes onboarding BEFORE
  // navigating, so going back from clinician summary / find specialist lands on
  // home, never back at the start of onboarding.
  const completeAndNavigate = (dest: string) => { const checkIn = buildCheckIn(symptomResponses); saveAndComplete(checkIn, triageResult || 'green', dest); };

  const isShortStyle = styles.some(s => ['Low cut / fade', 'Bald / shaved', 'Afro', 'High top'].includes(s) || s.toLowerCase().includes('twa'));
  const totalSeg = isMale ? TOTAL_MALE : TOTAL_FEMALE;
  const progSeg  = getProgressSeg();

  // ── Reflection cards ("Here's what we'll watch for you") ──
  const primaryStyle = (styles.find(s => s !== 'Other') || otherStyle || '').toLowerCase();
  const topGoal = concerns[0] || '';
  const goalCard = (() => {
    const inStyle = primaryStyle ? `, in ${primaryStyle}` : '';
    switch (topGoal) {
      case 'Grow my edges':
        return { title: `Your edges${inStyle}`, body: `${primaryStyle ? primaryStyle.charAt(0).toUpperCase() + primaryStyle.slice(1) : 'Tension styles'} can pull at the hairline, and it's your top goal, so we'll track your edges closely.` };
      case 'Less breakage':
        return { title: `Your strands${inStyle}`, body: "Less breakage is your top goal, so we'll watch shedding and snap points across your style cycle." };
      case 'Less shedding':
        return { title: `Your shedding pattern`, body: "You want shedding down, so we'll track it check-in to check-in and flag anything unusual." };
      case 'Calm itch':
        return { title: `Your scalp comfort`, body: "You want the itch settled, so we'll track it week to week and watch for patterns." };
      case 'Length':
        return { title: `Your length journey`, body: "Growth is the goal, so we'll track your length checks and what's helping you retain it." };
      case 'Just staying on top':
        return { title: `Your baseline`, body: "No fires to put out,we'll keep a steady record so any change shows up early." };
      // Male concern fallbacks
      case 'Hairline recession':
        return { title: `Your hairline`, body: "It's your top concern, so we'll compare against your baseline photos every cycle." };
      case 'Thinning at the crown':
        return { title: `Your crown`, body: "It's your top concern, so we'll track density there against your baseline photos." };
      case 'Razor bumps or ingrowns':
        return { title: `Your skin after cuts`, body: "You flagged bumps, so we'll check in after your cuts and watch for a pattern." };
      case 'Itching or flaking':
      case 'Scalp irritation':
        return { title: `Your scalp comfort`, body: "You flagged irritation, so we'll track it closely between check-ins." };
      default:
        return { title: `Your scalp, overall`, body: "We'll keep a steady record of how things change, so nothing sneaks up on you." };
    }
  })();
  const rhythm = isMale ? (mCutCadence || barberFreq) : cycleLength;
  const rhythmCard = {
    title: 'Your scalp between washes',
    body: rhythm && rhythm !== 'Not sure yet'
      ? `On a ${rhythm.toLowerCase()} rhythm${primaryStyle ? ` with ${primaryStyle}` : ''}, we'll watch for itch, flaking, and tenderness.`
      : `Between washes, we'll watch for itch, flaking, and tenderness,the things that build up quietly.`,
  };

  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: BODY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; } input, select, button { font-family: inherit; }
      `}</style>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ background: S.card, borderRadius: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)', padding: '24px 36px 28px', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          {step >= 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button onClick={handleBack} style={{ padding: 8, marginLeft: -8, background: 'none', border: 'none', cursor: 'pointer', color: S.ink }}>
                <ArrowLeft size={22} strokeWidth={1.8} />
              </button>
              <ProgressBar current={progSeg} total={totalSeg} />
              <div style={{ width: 40 }} />
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={step === 8 ? `8-${symptomPhase}-${symptomIndex}-${!!symptomAck}` : step === 2 ? `2-${chemicalStep}` : step}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }} style={{ paddingTop: 8, paddingBottom: 32 }}>

              {/* ── Welcome ── */}
              {step === -1 && (
                <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                  <h1 style={{ fontFamily: HEAD, fontSize: '1.75rem', fontWeight: 600, color: S.ink, marginBottom: 12 }}>Welcome to FolliSense</h1>
                  <p style={{ fontSize: '0.9rem', color: S.muted, marginBottom: 8 }}>Your scalp health, tracked around your routine.</p>
                  <p style={{ fontSize: '0.8rem', color: S.muted, marginBottom: 36, lineHeight: 1.6 }}>We'll ask a few questions, listen, and build around your answers. About 3 minutes.</p>
                  <CTA onClick={() => setStep(0)}>Get started</CTA>
                </div>
              )}

              {/* ── Gender ── */}
              {step === 0 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 4, color: S.ink }}>How do you identify?</h2>
                  <p style={{ fontSize: '0.8rem', color: S.muted, marginBottom: 20 }}>This helps us show you the right content and reference images.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { id: 'woman', label: 'Woman', symbol: '♀' },
                      { id: 'man',   label: 'Man',   symbol: '♂' },
                    ].map(opt => (
                      <SelCard key={opt.id} selected={gender === opt.id} onClick={() => { setOnboardingData({ ...onboardingData, gender: opt.id }); setTimeout(() => setStep(opt.id === 'man' ? 20 : 1), 180); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 20, color: gender === opt.id ? S.sage : S.muted, fontWeight: 400, lineHeight: 1 }}>{opt.symbol}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: S.ink }}>{opt.label}</span>
                        </div>
                      </SelCard>
                    ))}
                  </div>
                </div>
              )}

              {/* ── MALE: Norwood Scale ── */}
              {step === 20 && (
                <div>
                  <NorwoodScale selected={norwoodStage} onSelect={stage => setNorwoodStage(stage)} />
                  {norwoodStage && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 20 }}>
                      <CTA onClick={() => setStep(21)}>Next</CTA>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── MALE: Family History ── */}
              {step === 21 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 4, color: S.ink }}>Does hair loss run in your family?</h2>
                  <p style={{ fontSize: '0.8rem', color: S.muted, marginBottom: 20 }}>Family history helps us understand your risk profile.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {["Yes, father's side", "Yes, mother's side", "Yes, both sides", "No", "Not sure"].map(opt => (
                      <SelCard key={opt} selected={mFamilyHistory === opt} onClick={() => { setMFamilyHistory(opt); setTimeout(() => setStep(22), 180); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <RadioDot selected={mFamilyHistory === opt} />
                          <span style={{ fontSize: '0.875rem', color: S.ink }}>{opt}</span>
                        </div>
                      </SelCard>
                    ))}
                  </div>
                </div>
              )}

              {/* ── MALE: Styles ── */}
              {step === 22 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 4, color: S.ink }}>How do you usually wear your hair?</h2>
                  <p style={{ fontSize: '0.8rem', color: S.muted, marginBottom: 16 }}>Select everything you rotate between.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {maleStyleOptions.map(s => (
                      <SelCard key={s} selected={styles.includes(s)} onClick={() => toggleStyle(s)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <BoxDot selected={styles.includes(s)} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: styles.includes(s) ? S.ink : S.muted }}>{s}</span>
                        </div>
                      </SelCard>
                    ))}
                  </div>
                  {styles.includes('Other') && (
                    <input type="text" value={otherStyle} onChange={e => setOtherStyle(e.target.value)} placeholder="Describe your style"
                      style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: `1.5px solid ${S.border}`, background: S.inputBg, fontSize: '0.875rem', outline: 'none', marginBottom: 12 }} />
                  )}
                  {styles.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <CTA onClick={() => setStep(23)}>Next</CTA>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── MALE: Cut Cadence ── */}
              {step === 23 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 4, color: S.ink }}>How often do you get your hair cut or maintained?</h2>
                  <p style={{ fontSize: '0.8rem', color: S.muted, marginBottom: 20 }}>We time your check-ins to your real routine.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['Weekly', 'Every 2 weeks', 'Monthly', 'Every 6+ weeks', 'I maintain it myself'].map(opt => (
                      <SelCard key={opt} selected={mCutCadence === opt} onClick={() => { setMCutCadence(opt); setTimeout(() => setStep(24), 180); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <RadioDot selected={mCutCadence === opt} />
                          <span style={{ fontSize: '0.875rem', color: S.ink }}>{opt}</span>
                        </div>
                      </SelCard>
                    ))}
                  </div>
                </div>
              )}

              {/* ── MALE: Concerns ── */}
              {step === 24 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 4, color: S.ink }}>What's on your mind most?</h2>
                  <p style={{ fontSize: '0.8rem', color: S.muted, marginBottom: 16 }}>Select all that apply. These shape what we watch for, never your safety checks.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {maleConcernOptions.map(c => (
                      <SelCard key={c} selected={concerns.includes(c)} onClick={() => toggleConcern(c)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <BoxDot selected={concerns.includes(c)} />
                          <span style={{ fontSize: '0.875rem', color: S.ink }}>{c}</span>
                        </div>
                      </SelCard>
                    ))}
                  </div>
                  {concerns.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <CTA onClick={() => setStep(12)}>Continue</CTA>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── FEMALE: Hair Type ── */}
              {step === 1 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 4, color: S.ink }}>What's your hair type?</h2>
                  <p style={{ fontSize: '0.8rem', color: S.muted, marginBottom: 16 }}>Pick the texture closest to yours. This helps us tailor your check-ins.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { id: '4a', label: '4A', desc: 'Soft, springy coils',        img: hair4A },
                      { id: '4b', label: '4B', desc: 'Sharp Z-pattern coils',      img: hair4B },
                      { id: '4c', label: '4C', desc: 'Tight coils, max shrinkage', img: hair4C },
                      { id: '3a', label: '3A', desc: 'Loose, large curls',         img: hair3A, fit: 'contain' },
                      { id: '3b', label: '3B', desc: 'Springy ringlets',           img: hair3B },
                      { id: '3c', label: '3C', desc: 'Tight corkscrews',           img: hair3C },
                      { id: 'type2', label: 'Type 2', desc: 'Wavy, S-shaped',       img: hair2 },
                      { id: 'type1', label: 'Type 1', desc: 'Straight',             img: hair1 },
                    ].map(opt => {
                      const sel = hairSubType === opt.id;
                      return (
                        <button key={opt.id}
                        onClick={() => { setHairSubType(opt.id); setHairType(opt.id.startsWith('4') ? 'type4' : opt.id.startsWith('3') ? 'type3' : opt.id); setHairContinue(true); }}
                          style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: `2px solid ${sel ? S.sage : S.border}`, background: sel ? S.sageB : S.itemBg, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                          <div style={{ position: 'relative', height: 130, background: S.itemBg, overflow: 'hidden' }}>
                            <img src={opt.img} alt={`Type ${opt.label} hair texture`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                            {sel && (
                              <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: S.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={12} color="#fff" strokeWidth={2.5} />
                              </div>
                            )}
                          </div>
                          <div style={{ padding: '8px 10px 10px' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: S.ink, margin: '0 0 1px' }}>{opt.label}</p>
                            <p style={{ fontSize: '0.7rem', color: S.muted, margin: 0, lineHeight: 1.3 }}>{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => { setHairType('unsure'); setHairSubType(''); setHairContinue(false); setStep(2); }}
                    style={{ width: '100%', borderRadius: 14, padding: '14px 16px', textAlign: 'left', border: `1.5px solid ${S.border}`, background: S.itemBg, cursor: 'pointer', marginTop: 12 }}>
                    <p style={{ fontWeight: 600, color: S.ink, margin: 0, fontSize: '0.875rem' }}>Not sure</p>
                    <p style={{ fontSize: '0.75rem', color: S.muted, margin: '2px 0 0' }}>That's okay. We'll still personalise your experience.</p>
                  </button>

                  {hairContinue && hairSubType && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16 }}>
                      <CTA onClick={() => setStep(2)}>Continue</CTA>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── Chemical Processing ── */}
              {step === 2 && chemicalStep === 0 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 4, color: S.ink }}>Is your hair chemically processed?</h2>
                  <p style={{ fontSize: '0.8rem', color: S.muted, marginBottom: 16 }}>This means treatments that permanently change your hair's natural texture.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {chemicalOptions.map(opt => (
                      <SelCard key={opt.id} selected={chemicalStatus === opt.id} onClick={() => { setChemicalStatus(opt.id); if (opt.id === 'natural' || opt.id === 'unsure') setTimeout(() => setStep(3), 150); else setTimeout(() => setChemicalStep(1), 150); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <RadioDot selected={chemicalStatus === opt.id} />
                          <span style={{ fontSize: '0.875rem', color: S.ink }}>{opt.label}</span>
                        </div>
                      </SelCard>
                    ))}
                  </div>
                </div>
              )}
              {step === 2 && chemicalStep === 1 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 4, color: S.ink }}>What type of processing?</h2>
                  <SubLabel>Select all that apply.</SubLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {chemicalTypeOptions.map(t => (
                      <SelCard key={t} selected={chemicalTypes.includes(t)} onClick={() => toggleChemType(t)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <BoxDot selected={chemicalTypes.includes(t)} />
                          <span style={{ fontSize: '0.875rem', color: S.ink }}>{t}</span>
                        </div>
                      </SelCard>
                    ))}
                  </div>
                  {chemicalTypes.length > 0 && <CTA onClick={() => setChemicalStep(2)}>Next</CTA>}
                </div>
              )}
              {step === 2 && chemicalStep === 2 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 16, color: S.ink }}>When was your last treatment?</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lastTreatmentOptions.map(o => (
                      <SelCard key={o} selected={lastTreatment === o} onClick={() => { setLastTreatment(o); setTimeout(() => setChemicalStep(3), 150); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><RadioDot selected={lastTreatment === o} /><span style={{ fontSize: '0.875rem', color: S.ink }}>{o}</span></div>
                      </SelCard>
                    ))}
                  </div>
                </div>
              )}
              {step === 2 && chemicalStep === 3 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 16, color: S.ink }}>How often do you get it done?</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {chemicalFreqOptions.map(o => (
                      <SelCard key={o} selected={chemicalFreq === o} onClick={() => { setChemicalFreq(o); setTimeout(() => { setChemicalStep(0); setStep(3); }, 150); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><RadioDot selected={chemicalFreq === o} /><span style={{ fontSize: '0.875rem', color: S.ink }}>{o}</span></div>
                      </SelCard>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Styles ── */}
              {step === 3 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 4, color: S.ink }}>How do you usually wear your hair?</h2>
                  <p style={{ fontSize: '0.8rem', color: S.muted, marginBottom: 16 }}>Select everything you rotate between.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {filteredStyles.slice(0, showMoreStyles ? filteredStyles.length : 8).map(s => (
                      <SelCard key={s} selected={styles.includes(s)} onClick={() => toggleStyle(s)}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: styles.includes(s) ? S.ink : S.muted }}>{s}</span>
                      </SelCard>
                    ))}
                  </div>
                  {!showMoreStyles && filteredStyles.length > 8 && (
                    <button onClick={() => setShowMoreStyles(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: S.sage, fontWeight: 600, fontSize: '0.875rem' }}>
                      Show more styles <ChevronDown size={16} strokeWidth={2} />
                    </button>
                  )}
                  {styles.includes('Other') && (
                    <input type="text" value={otherStyle} onChange={e => setOtherStyle(e.target.value)} placeholder="Describe your style"
                      style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: `1.5px solid ${S.border}`, background: S.inputBg, fontSize: '0.875rem', outline: 'none', marginTop: 8 }} />
                  )}
                  {styles.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 20 }}>
                      <SectionLabel>{isMale ? 'How often do you wear longer or covered styles?' : 'How often are you in protective styles?'}</SectionLabel>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                        {protectiveFreqOptions.map(o => <PillBtn key={o} selected={protectiveFreq === o} onClick={() => setProtectiveFreq(o)}>{o}</PillBtn>)}
                      </div>
                      {(protectiveFreq || !isMale) && <CTA onClick={() => setStep(4)}>Continue</CTA>}
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── Routine ── */}
              {step === 4 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 4, color: S.ink }}>Your routine</h2>
                  <p style={{ fontSize: '0.8rem', color: S.muted, marginBottom: 20 }}>We time check-ins to your real routine, and gently nudge from there.</p>
                  {maleIsShortOnly ? (
                    <><SectionLabel>How often do you visit the barber?</SectionLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                      {barberFreqOptions.map(o => <PillBtn key={o} selected={barberFreq === o} onClick={() => setBarberFreq(o)}>{o}</PillBtn>)}
                    </div></>
                  ) : (
                    <><SectionLabel>How long do you usually keep a style in?</SectionLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                      {cycleLengthOptions.map(o => <PillBtn key={o} selected={cycleLength === o} onClick={() => setCycleLength(o)}>{o}</PillBtn>)}
                    </div></>
                  )}
                  <SectionLabel>Between washes, your scalp gets...</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {betweenWashOptions.map(o => <PillBtn key={o} selected={betweenWash.includes(o)} onClick={() => toggleBetween(o)}>{o}</PillBtn>)}
                  </div>
                  {betweenWash.includes('Other') && (
                    <input type="text" value={otherBetween} onChange={e => setOtherBetween(e.target.value)} placeholder="What else do you do?"
                      style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: `1.5px solid ${S.border}`, background: S.inputBg, fontSize: '0.875rem', outline: 'none', marginTop: 10 }} />
                  )}
                  {betweenWash.length > 0 && (maleIsShortOnly ? !!barberFreq : !!cycleLength) && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 20 }}>
                      <CTA onClick={() => setStep(5)}>Continue</CTA>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── FEMALE: Goals (new) ── */}
              {step === 5 && (
                <div>
                  <p style={{ fontSize: 12, color: S.muted, textAlign: 'center', margin: '0 0 14px' }}>Your goals</p>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.5rem', fontWeight: 600, marginBottom: 8, color: S.ink, lineHeight: 1.2 }}>What's on your mind most?</h2>
                  <p style={{ fontSize: '0.85rem', color: S.muted, marginBottom: 20, lineHeight: 1.6 }}>Pick up to three. These shape your routine and what we suggest, never your safety checks.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                    {goalOptions.map(g => <PillBtn key={g} selected={concerns.includes(g)} onClick={() => toggleGoal(g)}>{g}</PillBtn>)}
                  </div>
                  {concerns.length >= 3 && (
                    <p style={{ fontSize: '0.75rem', color: S.muted, margin: '4px 0 0' }}>Three's the max,swap one out to change your pick.</p>
                  )}
                  {concerns.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24 }}>
                      <CTA onClick={() => setStep(12)}>Continue</CTA>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── Reflection: here's what we'll watch (new) ── */}
              {step === 12 && (
                <div>
                  <p style={{ fontSize: 12, color: S.muted, textAlign: 'center', margin: '0 0 14px' }}>Before we start</p>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.5rem', fontWeight: 600, marginBottom: 6, color: S.ink, lineHeight: 1.2 }}>Here's what we'll watch for you</h2>
                  <p style={{ fontSize: '0.85rem', color: S.muted, marginBottom: 20 }}>Based on what you've told us.</p>

                  <div style={{ background: S.soft, borderRadius: 16, padding: '16px 16px', marginBottom: 12 }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: S.ink, margin: '0 0 6px' }}>{goalCard.title}</p>
                    <p style={{ fontSize: '0.82rem', color: '#4d5a4c', lineHeight: 1.6, margin: 0 }}>{goalCard.body}</p>
                  </div>

                  <div style={{ background: S.itemBg, border: `1.5px solid ${S.border}`, borderRadius: 16, padding: '16px 16px', marginBottom: 24 }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: S.ink, margin: '0 0 6px' }}>{rhythmCard.title}</p>
                    <p style={{ fontSize: '0.82rem', color: S.muted, lineHeight: 1.6, margin: 0 }}>{rhythmCard.body}</p>
                  </div>

                  <CTA onClick={() => setStep(6)}>Take my first check-in</CTA>
                </div>
              )}

              {/* ── Photo consent ── */}
              {step === 6 && (
                <div>
                  <p style={{ fontSize: 12, color: S.muted, textAlign: 'center', margin: '0 0 14px' }}>Baseline photos</p>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.5rem', fontWeight: 600, marginBottom: 6, color: S.ink, lineHeight: 1.2 }}>About your photos</h2>
                  <p style={{ fontSize: '0.85rem', color: S.muted, marginBottom: 20 }}>One thing before your first photo.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 18 }}>
                    {[
                      { icon: <Download size={16} color={S.ink} strokeWidth={1.8} />, title: "They're health data", body: 'Treated with the same care as the rest.' },
                      { icon: <Eye size={16} color={S.ink} strokeWidth={1.8} />, title: 'Only you see them', body: 'Stored securely.' },
                      { icon: <Trash2 size={16} color={S.ink} strokeWidth={1.8} />, title: 'Delete any time', body: 'One photo, or all of them.' },
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 0', borderBottom: i < 2 ? `1px solid ${S.border}` : 'none' }}>
                        <div style={{ marginTop: 2, flexShrink: 0 }}>{row.icon}</div>
                        <div>
                          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: S.ink, margin: '0 0 2px' }}>{row.title}</p>
                          <p style={{ fontSize: '0.8rem', color: S.muted, margin: 0 }}>{row.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {['Good lighting, no flash, plain background', 'Hair and scalp dry and clearly visible', ...(!isMale ? ['Ideally on wash day or takedown day'] : [])].map((tip, i) => (
                      <p key={i} style={{ fontSize: '0.75rem', color: S.muted, margin: 0, lineHeight: 1.55 }}>• {tip}</p>
                    ))}
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 18 }}>
                    <input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: S.sage }} />
                    <p style={{ fontSize: '0.75rem', color: S.muted, margin: 0, lineHeight: 1.65 }}>
                      I consent to my photos and personal data being stored securely for tracking my scalp and hair health over time.
                    </p>
                  </label>

                  {consentChecked && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <CTA innerRef={consentButtonRef} onClick={() => setStep(7)}>Agree &amp; take photos</CTA>
                    </motion.div>
                  )}
                  <p style={{ fontSize: '0.72rem', color: S.muted, textAlign: 'center', margin: '12px 0 0', lineHeight: 1.5 }}>
                    Photos are part of how the monitoring works, so this step is required.
                  </p>
                  <button onClick={() => setStep(13)} style={{ width: '100%', textAlign: 'center', fontSize: '0.8rem', color: S.muted, marginTop: 6, padding: 8, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    I'd rather not take photos
                  </button>
                </div>
              )}

              {/* ── Photos declined (new) ── */}
              {step === 13 && (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: S.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <Camera size={26} color={S.ink} strokeWidth={1.6} />
                  </div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.4rem', fontWeight: 600, color: S.ink, margin: '0 0 12px', lineHeight: 1.25 }}>FolliSense needs photos to work</h2>
                  <p style={{ fontSize: '0.875rem', color: S.muted, lineHeight: 1.65, margin: '0 0 28px' }}>
                    Tracking is comparison. Without a starting photo there's nothing to compare against, so we can't run the service without them.
                  </p>
                  <CTA onClick={() => setStep(6)}>Go back</CTA>
                  <CTA secondary onClick={() => navigate('/')}>Exit setup</CTA>
                  <p style={{ fontSize: '0.72rem', color: S.muted, margin: '14px 0 0', lineHeight: 1.5 }}>
                    Your answers stay on this device,you can pick up where you left off.
                  </p>
                </div>
              )}

              {/* ── Scalp Baseline Photos ── */}
              {step === 7 && <ScalpBaselineCapture onComplete={handlePhotosComplete} onBack={() => setStep(6)} gender={gender} />}

              {/* ── Symptom Flow ── */}
              {step === 8 && symptomPhase === 'transition' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
                    style={{ fontFamily: HEAD, color: S.ink, fontSize: 19, textAlign: 'center', lineHeight: 1.4 }}>
                    Nearly there. A few quick questions about your scalp.
                  </motion.p>
                </div>
              )}

              {step === 8 && symptomPhase === 'symptoms' && (
                <AnimatePresence mode="wait">
                  {symptomAck ? (
                    <motion.div key="ack" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, padding: '0 4px' }}>
                      <div style={{ background: S.soft, borderRadius: 14, padding: '16px 18px', width: '100%' }}>
                        <p style={{ color: '#3d4a3c', fontSize: 14.5, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>{symptomAck}</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key={`sym-${symptomIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                      <p style={{ fontSize: '0.75rem', color: S.muted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{symptomIndex + 1} of {activeSymptoms.length}</p>
                      <h2 style={{ fontFamily: HEAD, fontSize: '1.5rem', fontWeight: 600, color: S.ink, margin: '0 0 6px', lineHeight: 1.2 }}>{activeSymptoms[symptomIndex].question}</h2>
                      <p style={{ fontSize: '0.85rem', color: S.muted, margin: '0 0 20px' }}>{(activeSymptoms[symptomIndex] as any).sub || ''}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {severityOptions.map(sev => {
                          const sym    = activeSymptoms[symptomIndex];
                          const isSel  = symptomResponses[sym.key] === sev;
                          const hasSel = !!symptomResponses[sym.key];
                          return (
                            <motion.button key={sev} whileTap={{ scale: 1.01 }}
                              onClick={() => {
                                setSymptomResponses(prev => ({ ...prev, [sym.key]: sev }));
                                const ack = getAck(sev, sym.label, sym.key);
                                const advance = () => {
                                  if (symptomIndex < activeSymptoms.length - 1) setSymptomIndex(i => i + 1);
                                  else {
                                    const allRes = { ...symptomResponses, [sym.key]: sev };
                                    const checkIn = buildCheckIn(allRes);
                                    const risk = isMale ? computeMaleTriageRisk(checkIn, [], norwoodStage, norwoodStage) : computeCheckInStatus(checkIn, []);
                                    setTriageResult(risk); setSymptomPhase('thanks');
                                  }
                                };
                                if (sev === 'None') { setTimeout(advance, 150); return; }
                                if (ack) { setSymptomAck(ack); setTimeout(() => { setSymptomAck(null); advance(); }, 1500); }
                                else advance();
                              }}
                              style={{ border: `1.5px solid ${isSel ? S.sage : S.border}`, borderRadius: 12, padding: 12, width: '100%', textAlign: 'left' as const, background: isSel ? S.sageB : S.itemBg, cursor: 'pointer', transition: 'all 0.15s', opacity: hasSel && !isSel ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 10 }}
                            >
                              <RadioDot selected={isSel} />
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: S.ink, margin: '0 0 2px' }}>{severityDisplay[sev]}</p>
                                {activeDescriptors[sym.key]?.[sev] && (
                                  <p style={{ fontSize: '0.75rem', color: S.muted, margin: 0, lineHeight: 1.45 }}>{activeDescriptors[sym.key][sev]}</p>
                                )}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {step === 8 && symptomPhase === 'thanks' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, padding: '0 4px' }}>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
                    style={{ background: S.soft, borderRadius: 14, padding: '18px 20px', width: '100%' }}>
                    <p style={{ color: '#3d4a3c', fontSize: 16, textAlign: 'center', lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
                      {getSeverityTransitionText(symptomResponses)}
                    </p>
                  </motion.div>
                </div>
              )}

              {step === 8 && symptomPhase === 'result' && triageResult && (
                <TriageResult risk={triageResult} symptomResponses={symptomResponses} activeSymptoms={activeSymptoms}
                  isMale={isMale}
                  onContinue={() => isMale ? setStep(11) : setStep(9)}
                  completeAndNavigate={completeAndNavigate} />
              )}

              {/* ── Length Check ── */}
              {step === 9 && (
                <div>
                  <h2 style={{ fontFamily: HEAD, fontSize: '1.35rem', fontWeight: 600, marginBottom: 8, color: S.ink }}>Want to track your hair length too?</h2>
                  <p style={{ fontSize: '0.875rem', color: S.muted, marginBottom: 20, lineHeight: 1.6 }}>
                    {isShortStyle ? "Take a photo of your hair as it is now. This tracks your growth over time." : "Pull a section straight to show your true length past shrinkage."}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <SelCard selected={false} onClick={() => setStep(10)}><p style={{ fontWeight: 600, color: S.ink, margin: 0, fontSize: '0.875rem' }}>Yes, let's do it</p></SelCard>
                    <SelCard selected={false} onClick={() => setStep(11)}><p style={{ fontWeight: 600, color: S.ink, margin: 0, fontSize: '0.875rem' }}>Skip for now</p></SelCard>
                  </div>
                </div>
              )}
              {step === 10 && <LengthCheckPhotos isShortHair={isShortStyle} gender={gender} onComplete={photos => { setLengthPhotos(photos); setStep(11); }} onSkip={() => setStep(11)} />}

              {/* ── Completion: your record starts here ── */}
              {step === 11 && (
                <div>
                  <div style={{ background: S.soft, borderRadius: 18, padding: '20px 18px', marginBottom: 14 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: S.sage, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>You're set</p>
                    <h2 style={{ fontFamily: HEAD, fontSize: '1.5rem', fontWeight: 600, color: S.ink, margin: '0 0 8px', lineHeight: 1.2 }}>Your record starts here</h2>
                    <p style={{ fontSize: '0.85rem', color: '#4d5a4c', lineHeight: 1.65, margin: '0 0 18px' }}>
                      We've got your starting point and your first routine. From here, we track how your scalp changes.
                    </p>
                    <CTA onClick={finishOnboarding}>See my routine</CTA>
                  </div>

                  <p style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>Ready for you</p>
                  <div style={{ background: S.itemBg, border: `1.5px solid ${S.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: S.ink, margin: '0 0 3px' }}>
                      Your routine{primaryStyle ? ` · ${primaryStyle}` : ''}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: S.muted, margin: 0 }}>
                      {isMale ? 'Cut-day checks, mid-cycle care, hairline watch.' : 'Wash day, mid-week care, daily edges.'}
                    </p>
                  </div>

                  <CTA secondary onClick={finishToClinicianSummary}>View clinician summary</CTA>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;