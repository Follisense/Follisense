import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { scoreSymptom } from '@/utils/symptomScoring';
import { trackReportViewed } from '@/lib/events';
import { trackCheckInCompleted } from '@/lib/events';
import { signPhotoUrls } from '@/services/photoUrlService';
// Clinician summary. Read by Dr Judy when a user has paid to consult with her.
//
// This is the clinician half of decision 4.5: derived values appear HERE and
// never in the patient's own view, and every derived value is shown with the
// answers that produced it, so it reads as arithmetic rather than a verdict.
//
// Route: /clinician/:userId
// Access: this page only renders what RLS lets the caller select. Gate the
// route the same way AdminPage is gated (server-side check), and do not rely
// on hiding the link.
//
// SCORES ARE RECOMPUTED HERE, NOT READ FROM THE COLUMNS.
// The score columns on `checkins` are only populated by check-ins that went
// through buildNumericPayload. Baseline and onboarding rows were written by a
// different path, so their columns sit at 0 while the symptoms jsonb holds the
// real answers. Reading the columns produced "Composite 0 of 20" on a check-in
// where the patient had reported two Mild symptoms, which is the exact opposite
// of the truth. The jsonb answers are present on every row regardless of which
// path wrote it, so they are the source of truth here.
//
// Printing: the @media print block strips the app chrome so Ctrl+P produces a
// clean page. No PDF library needed.

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  ink:     '#23201A',
  body:    '#4A4F47',
  muted:   '#6B6F66',
  faint:   '#8A8F86',
  line:    '#E3E7DE',
  hair:    '#EDEFE7',
  green:   '#2E4A39',
  greenLt: '#6E9E82',
  amberBg: '#FAEEDA',
  amberInk:'#633806',
  amber:   '#BA7517',
};

const isMetaKey = (k: string) =>
    k.endsWith('_score') || k === 'total_score' || k === 'risk_level' ||
  k === 'pattern_flag' || k === 'ccca_flag';

const NOT_REPORTED = new Set([
  'None', 'No', 'No change', 'Normal',
  'Feels normal', 'Soft and moisturised as usual',
  'No breakage', 'Looks healthy, no changes', 'No, hair feels normal',
]);

const SYMPTOM_LABELS: Record<string, string> = {
  itch: 'Itch', tenderness: 'Tenderness', hairline: 'Hairline change',
  flaking: 'Flaking', shedding: 'Shedding', irritation: 'Irritation',
  hairFeel: 'Hair feel', hairBreakage: 'Breakage', hairAppearance: 'Appearance',
  hairConcern: 'Hair concern', bumps: 'Bumps', dryness: 'Dryness',
    part_width_change: 'Part width change', crown_density_change: 'Crown density change',
  // Old keys, for check-ins written before the rename
  centerPartWidening: 'Part width change', crownThinning: 'Crown density change',
};

// Symptoms that feed the composite, with their real per-symptom maximum.
// flaking tops out at 2 in SYMPTOM_SCORE_MAP; everything else at 3. Hardcoding
// a total of 21 would be wrong for any check-in that skips questions, so the
// denominator is summed from whatever was actually answered.
const COMPOSITE_KEYS: { key: string; max: number }[] = [
  { key: 'itch',           max: 3 },
  { key: 'tenderness',     max: 3 },
  { key: 'irritation',     max: 3 },
  { key: 'hairline',       max: 3 },
  { key: 'flaking',        max: 2 },
  { key: 'shedding',       max: 3 },
  { key: 'hairFeel',       max: 3 },
  { key: 'hairBreakage',   max: 3 },
  { key: 'hairAppearance', max: 3 },
  { key: 'hairConcern',    max: 3 },
  { key: 'bumps',          max: 3 },
  { key: 'dryness',        max: 3 },
];

const labelFor = (k: string) =>
  SYMPTOM_LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();

const hasSymptomData = (s: Record<string, any> | null | undefined) =>
  !!s && Object.entries(s).some(([k, v]) => !isMetaKey(k) && typeof v === 'string' && v.length > 0);

const reportedSymptoms = (s: Record<string, any> | null | undefined) =>
  !s ? [] : Object.entries(s)
    .filter(([k, v]) => !isMetaKey(k) && typeof v === 'string' && v.length > 0 && !NOT_REPORTED.has(v))
    .map(([k]) => k);

const fmtLong  = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

interface CheckIn {
  id: string; type: string; created_at: string; is_baseline: boolean;
  symptoms: Record<string, any> | null;
  [column: string]: any;
}
interface Photo { id: string; checkin_id: string; photo_url: string; region_tag: string; created_at: string; }

const Label = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>{children}</p>
);

const Row = ({ k, v }: { k: string; v: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.hair}` }}>
    <span style={{ fontFamily: dm, fontSize: 12.5, color: C.muted }}>{k}</span>
    <span style={{ fontFamily: dm, fontSize: 12.5, color: C.ink }}>{v}</span>
  </div>
);

const DerivedBlock = ({ title, value, max, derivation }: {
  title: string; value: number; max: number; derivation: string;
}) => (
  <div style={{ border: `1px solid ${C.line}`, borderRadius: 3, marginBottom: 12 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '13px 16px', borderBottom: `1px solid ${C.hair}`, background: '#FAFBF8' }}>
      <span style={{ fontFamily: dm, fontSize: 13, fontWeight: 500, color: C.ink }}>{title}</span>
      <span style={{ fontFamily: dm, fontSize: 15, fontWeight: 500, color: C.ink }}>{value} of {max}</span>
    </div>
    <div style={{ padding: '11px 16px', fontFamily: dm, fontSize: 12, color: C.muted, lineHeight: 1.9 }}>{derivation}</div>
  </div>
);

const ClinicianSummary = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [denied, setDenied]     = useState(false);
  const [profile, setProfile]   = useState<any>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [photos, setPhotos]     = useState<Photo[]>([]);

  useEffect(() => {
    (async () => {
           if (!userId) { setError('No patient specified.'); setLoading(false); return; }
      try {
        // Route gate. Defence in depth, NOT the security control — RLS is.
        // Until owner-scoped policies land on checkins, checkin_photos and
        // profiles, an unlisted URL is the only thing between a signed-in user
        // and someone else's health record.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setDenied(true); setLoading(false); return; }

        const { data: me } = await supabase
          .from('profiles').select('role').eq('id', session.user.id).maybeSingle();

        const isClinician = me?.role === 'clinician' || me?.role === 'admin';
        // Anyone can open their own record; only a clinician can open another's.
        if (!isClinician && session.user.id !== userId) {
          setDenied(true); setLoading(false); return;
        }
        // consumer_profiles is empty in production and profiles carries only
        // id/role/first_name/gender/created_at/current_style_start_date, so
        // hair type, style, cycle length and chemical processing are not
        // readable from the database at all. See the Background note below.
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, first_name, gender, current_style_start_date, created_at')
          .eq('id', userId)
          .maybeSingle();

        const { data: ci, error: ciErr } = await supabase
          .from('checkins').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (ciErr) throw ciErr;

        const ids = (ci || []).map(c => c.id);
        const { data: ph } = ids.length
          ? await supabase.from('checkin_photos').select('*').in('checkin_id', ids).order('created_at', { ascending: true })
          : { data: [] as Photo[] };
              setProfile(prof || null);
        setCheckins((ci || []) as CheckIn[]);
                // Private bucket: sign before rendering, same as HistoryPage.
        const signed = await signPhotoUrls((ph || []).map(p => p.photo_url));
        setPhotos(((ph || []) as Photo[]).map(p => ({
          ...p,
          photo_url: signed[p.photo_url] ?? p.photo_url,
        })));
        trackReportViewed('clinician');
      } catch (e: any) {
        console.error('[ClinicianSummary] load failed:', e);
        setError(e?.message || 'Could not load this record.');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const symptomCheckins = checkins.filter(c => hasSymptomData(c.symptoms));
  const latest = symptomCheckins[0];
  const oldest = symptomCheckins[symptomCheckins.length - 1];
  const total  = symptomCheckins.length;

  const frequency = (() => {
    const counts: Record<string, number> = {};
    symptomCheckins.forEach(c => reportedSymptoms(c.symptoms).forEach(k => {
            // Shown separately, under both old and new key names
      if (k === 'part_width_change' || k === 'crown_density_change' ||
          k === 'centerPartWidening' || k === 'crownThinning') return;
      counts[k] = (counts[k] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
  })();

  // Composite, recomputed from the answers rather than the score columns.
  const composite = (() => {
    if (!latest?.symptoms) return null;
    const parts = COMPOSITE_KEYS
      .filter(k => typeof latest.symptoms![k.key] === 'string' && latest.symptoms![k.key])
      .map(k => ({
        ...k,
        answer: latest.symptoms![k.key] as string,
        score:  scoreSymptom(k.key, latest.symptoms![k.key] as string),
      }));
    if (parts.length === 0) return null;
    return {
      value: parts.reduce((n, p) => n + p.score, 0),
      max:   parts.reduce((n, p) => n + p.max, 0),
      derivation: parts.map(p => `${labelFor(p.key)} "${p.answer}" = ${p.score}`).join('  ·  '),
    };
  })();

  // The two scarring-pattern questions. Only rendered when the patient was
  // actually asked: men skip them, and older check-ins predate them. Showing
  // "0 of 3, not answered" read as a measurement of zero, which it is not.
  // Reads the new key, falling back to the old one for check-ins written before
  // the P1-5 rename. Existing rows still hold centerPartWidening / crownThinning.
  const readPattern = (s: Record<string, any> | null | undefined, newKey: string, oldKey: string): string | null => {
    const v = s?.[newKey] ?? s?.[oldKey];
    return typeof v === 'string' && v.length ? v : null;
  };

  const partAnswer  = readPattern(latest?.symptoms, 'part_width_change',    'centerPartWidening');
  const crownAnswer = readPattern(latest?.symptoms, 'crown_density_change', 'crownThinning');

  const partWidthReported = symptomCheckins.filter(c => {
    const v = readPattern(c.symptoms, 'part_width_change', 'centerPartWidening');
    return v && !NOT_REPORTED.has(v);
  }).length;
  const crownReported = symptomCheckins.filter(c => {
    const v = readPattern(c.symptoms, 'crown_density_change', 'crownThinning');
    return v && !NOT_REPORTED.has(v);
  }).length;
  const showFlag          = partWidthReported > 0 || crownReported > 0;

  const matchedPair = (() => {
    const byRegion: Record<string, Photo[]> = {};
    photos.forEach(p => { (byRegion[p.region_tag] ||= []).push(p); });
    const region = Object.keys(byRegion).find(r => byRegion[r].length >= 2);
    if (!region) return null;
    const set = byRegion[region];
    return { region, first: set[0], last: set[set.length - 1] };
  })();

  const printCss = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500&display=swap');
    @media print {
      .cs-noprint { display: none !important; }
      .cs-page { border: none !important; margin: 0 !important; }
      body { background: #fff !important; }
    }
  `;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F4F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: dm, fontSize: 13, color: C.muted }}>Loading record…</p>
    </div>
  );

    if (denied) return (
    <div style={{ minHeight: '100vh', background: '#F4F6F1', padding: '40px 20px', fontFamily: dm }}>
      <div style={{ maxWidth: 660, margin: '0 auto', background: '#fff', border: `1px solid ${C.line}`, borderRadius: 4, padding: '40px 44px' }}>
        <p style={{ fontFamily: playfair, fontSize: 19, color: C.ink, margin: '0 0 8px' }}>Not available</p>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 }}>
          You do not have access to this record.
        </p>
        <button onClick={() => navigate('/home')} style={{ marginTop: 22, height: 42, padding: '0 20px', borderRadius: 12, border: `1px solid ${C.line}`, background: 'transparent', fontFamily: dm, fontSize: 13, color: C.ink, cursor: 'pointer' }}>Back to home</button>
      </div>
    </div>
  );

  if (error || total === 0) return (
    <div style={{ minHeight: '100vh', background: '#F4F6F1', padding: '40px 20px', fontFamily: dm }}>
      <style>{printCss}</style>
      <div style={{ maxWidth: 660, margin: '0 auto', background: '#fff', border: `1px solid ${C.line}`, borderRadius: 4, padding: '40px 44px' }}>
        <p style={{ fontFamily: playfair, fontSize: 19, color: C.ink, margin: '0 0 8px' }}>
          {error ? 'Could not load this record' : 'Nothing to summarise yet'}
        </p>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 }}>
          {error || 'This patient has not completed a symptom check-in, so there is no data to summarise.'}
        </p>
        <button onClick={() => navigate(-1)} style={{ marginTop: 22, height: 42, padding: '0 20px', borderRadius: 12, border: `1px solid ${C.line}`, background: 'transparent', fontFamily: dm, fontSize: 13, color: C.ink, cursor: 'pointer' }}>Back</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6F1', padding: '24px 20px 60px', fontFamily: dm }}>
      <style>{printCss}</style>

      <div className="cs-noprint" style={{ maxWidth: 660, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 16px', borderRadius: 12, border: `1px solid ${C.line}`, background: '#fff', fontFamily: dm, fontSize: 13, color: C.ink, cursor: 'pointer' }}>
          <ArrowLeft size={15} strokeWidth={1.8} /> Back
        </button>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 16px', borderRadius: 12, border: 'none', background: C.green, fontFamily: dm, fontSize: 13, fontWeight: 600, color: '#F5F7F2', cursor: 'pointer' }}>
          <Printer size={15} strokeWidth={1.8} /> Print or save as PDF
        </button>
      </div>

      <div className="cs-page" style={{ maxWidth: 660, margin: '0 auto', background: '#fff', border: `1px solid ${C.line}`, borderRadius: 4 }}>

        <div style={{ background: '#20261E', padding: '26px 48px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.greenLt }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.greenLt, letterSpacing: '0.14em', textTransform: 'uppercase' }}>FolliSense</span>
              </div>
              <p style={{ fontFamily: playfair, fontSize: 22, color: '#F5F7F2', margin: 0, lineHeight: 1.2 }}>Clinician summary</p>
              <p style={{ fontSize: 12.5, color: 'rgba(245,247,242,0.55)', margin: '5px 0 0' }}>
                {total} check-in{total !== 1 ? 's' : ''} · {fmtShort(oldest.created_at)} to {fmtShort(latest.created_at)}
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(245,247,242,0.45)', lineHeight: 1.7, flexShrink: 0 }}>
              <p style={{ color: '#F5F7F2', fontWeight: 500, fontSize: 12.5, margin: 0 }}>{profile?.first_name || 'Patient'}</p>
              <p style={{ margin: '5px 0 0' }}>Ref {userId?.slice(0, 8).toUpperCase()}</p>
              <p style={{ margin: 0 }}>Generated {fmtShort(new Date().toISOString())}</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 48px 40px' }}>

          <div style={{ background: 'rgba(46,74,57,0.06)', borderLeft: `3px solid ${C.green}`, padding: '13px 15px', marginBottom: 26 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 5px' }}>Read this first</p>
            <p style={{ fontSize: 12, color: C.body, lineHeight: 1.65, margin: 0 }}>
              All symptom data is self-reported by the patient through a consumer app. Derived values below are simple sums of her own answers and are shown with their inputs. They are not a clinical assessment, a diagnosis, or a validated instrument. FolliSense is a wellness tool, not a medical device.
            </p>
          </div>

          <Label>Background</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0 28px', marginBottom: 10 }}>
            <Row k="First name" v={profile?.first_name || 'Not given'} />
            <Row k="Sex" v={profile?.gender || 'Not given'} />
            <Row k="Tracking since" v={new Date(oldest.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} />
            <Row k="Style started" v={profile?.current_style_start_date ? fmtLong(profile.current_style_start_date) : 'Not recorded'} />
          </div>
          <p style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.7, margin: '0 0 26px' }}>
            Hair pattern, current style, cycle length and chemical processing are not available. The patient gave these during onboarding, but they are held on her device and are not stored in a form this summary can read. Ask her directly.
          </p>

          {composite && (
            <>
              <Label>Derived values, most recent check-in</Label>
              <p style={{ fontSize: 11.5, color: C.faint, margin: '0 0 13px' }}>
                {fmtLong(latest.created_at)}. Recomputed from her answers, every input shown.
              </p>
              <DerivedBlock title="Composite symptom total" value={composite.value} max={composite.max} derivation={composite.derivation} />
              {partAnswer && (
                <DerivedBlock
                  title="Part width change" value={scoreSymptom('part_width_change', partAnswer)} max={3}
                  derivation={`Patient answer: "${partAnswer}". Scored separately and deliberately excluded from the composite total above.`}
                />
              )}
              {crownAnswer && (
                <DerivedBlock
                                  title="Crown density change" value={scoreSymptom('crown_density_change', crownAnswer)} max={3}
                  derivation={`Patient answer: "${crownAnswer}". Scored separately and deliberately excluded from the composite total above.`}
                />
              )}
              <div style={{ height: 14 }} />
            </>
          )}

          {showFlag && (
            <div style={{ border: `1px solid ${C.amber}`, borderLeft: `3px solid ${C.amber}`, padding: '14px 16px', marginBottom: 26, background: C.amberBg }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.amberInk, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>Pattern worth your attention</p>
              <p style={{ fontSize: 12.5, color: C.amberInk, lineHeight: 1.7, margin: 0 }}>
                Part width reported as changed in {partWidthReported} of {total} check-in{total !== 1 ? 's' : ''}. Crown density reported as changed in {crownReported} of {total}. Surfaced here because the app does not surface these to the patient.
              </p>
            </div>
          )}

          <Label>Reported across the period</Label>
          <p style={{ fontSize: 11.5, color: C.faint, margin: '0 0 14px' }}>
            Check-ins in which each was reported, out of {total}
          </p>
          <div style={{ marginBottom: 26 }}>
            {frequency.length === 0 ? (
              <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>No symptoms reported in any check-in on record.</p>
            ) : frequency.map((r, i) => (
              <div key={r.key} style={{ marginBottom: i < frequency.length - 1 ? 11 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, color: C.ink }}>{labelFor(r.key)}</span>
                  <span style={{ fontSize: 11.5, color: C.muted }}>{r.count} of {total}</span>
                </div>
                <div style={{ height: 7, borderRadius: 2, background: C.hair, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round((r.count / Math.max(total, 1)) * 100)}%`, height: '100%', background: C.green }} />
                </div>
              </div>
            ))}
          </div>

          <Label>Check-in by check-in</Label>
          <p style={{ fontSize: 11.5, color: C.faint, margin: '0 0 13px' }}>Every symptom check-in on record, most recent first</p>
          <div style={{ marginBottom: 26 }}>
            {symptomCheckins.map(c => {
              const rep = reportedSymptoms(c.symptoms);
              return (
                <div key={c.id} style={{ display: 'flex', gap: 14, padding: '9px 0', borderBottom: `1px solid ${C.hair}` }}>
                  <span style={{ fontSize: 12, color: C.muted, width: 74, flexShrink: 0 }}>{fmtShort(c.created_at)}</span>
                  <span style={{ fontSize: 12, color: C.ink, lineHeight: 1.6 }}>
                    {rep.length === 0 ? 'Nothing reported' : rep.map(k => `${labelFor(k)}: ${c.symptoms![k]}`).join(' · ')}
                  </span>
                </div>
              );
            })}
          </div>

          {matchedPair && (
            <>
              <Label>Photographs</Label>
              <p style={{ fontSize: 11.5, color: C.faint, margin: '0 0 13px' }}>
                Same area ({matchedPair.region}), earliest and most recent. Self-captured; lighting and angle are not controlled.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[matchedPair.first, matchedPair.last].map(p => (
                  <div key={p.id}>
                    <img src={p.photo_url} alt={`${matchedPair.region}, ${fmtShort(p.created_at)}`}
                      style={{ width: '100%', height: 190, objectFit: 'cover', borderRadius: 3, border: `1px solid ${C.line}`, display: 'block' }} />
                    <p style={{ fontSize: 11.5, color: C.muted, margin: '6px 0 0' }}>{matchedPair.region} · {fmtLong(p.created_at)}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <p style={{ borderTop: `1px solid ${C.line}`, marginTop: 28, paddingTop: 14, fontSize: 10.5, color: C.faint, lineHeight: 1.7 }}>
            Generated by FolliSense on {fmtLong(new Date().toISOString())} from {total} self-reported check-in{total !== 1 ? 's' : ''}. FolliSense is a wellness and self-care companion, not a medical device, and does not diagnose, treat or prevent any condition. Nothing here is intended to replace clinical judgement.
          </p>

        </div>
      </div>
    </div>
  );
};

export default ClinicianSummary;