import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const dm = "'DM Sans', sans-serif";

const C = {
  bg:     '#0A0908',
  card:   '#101A14',
  border: 'rgba(110,158,130,0.14)',
  ink:    '#EAF0E9',
  muted:  'rgba(234,240,233,0.42)',
  gold:   '#6E9E82',
  green:  '#5A9A50',
  amber:  '#D4A866',
  red:    '#B05040',
};

interface UserRow { id: string; checkins: number; first_at: string; last_at: string }
interface FeatureRow { feature: string; events: number; users: number }
interface ReturnRow { action: string; count: number }
interface TopProduct { name: string; clicks: number }
interface Commerce {
  product_clicks?: number;
  wishlist_saves?: number;
  distinct_products_clicked?: number;
  subscriptions?: number;
  top_products?: TopProduct[];
}
interface Overview {
  total_users: number;
  onboarded_users: number;
  baseline_users?: number;
  active_users: number;
  returning_users: number;
  second_checkin_from_baseline?: number;
  second_checkin_from_onboarded?: number;
  total_checkins: number;
  total_photos: number;
  triage_split: Record<string, number>;
  signups_14d: { day: string; n: number }[];
  feature_usage?: FeatureRow[];
  return_reasons?: ReturnRow[];
  commerce?: Commerce;
  users: UserRow[];
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const shortId = (id: string) => (id ? id.slice(0, 8) : '');
const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

const Metric = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px' }}>
    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{label}</p>
    <p style={{ fontSize: 26, fontWeight: 700, color: C.ink, margin: '4px 0 0' }}>{value}</p>
    {sub && <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{sub}</p>}
  </div>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
    <p style={{ fontSize: 11, color: C.muted, margin: '0 0 12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</p>
    {children}
  </div>
);

const Bar = ({ value, max }: { value: number; max: number }) => (
  <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
    <div style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, height: 6, background: C.gold, borderRadius: 3 }} />
  </div>
);

const AdminPage = () => {
  const [data, setData]       = useState<Overview | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: rpcErr } = await supabase.rpc('admin_overview');
    if (rpcErr) {
      setError(rpcErr.message.includes('not authorised')
        ? 'This account is not on the admin list.'
        : rpcErr.message);
    } else {
      setData(res as Overview);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.muted, fontFamily: dm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Loading…
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: dm, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div>
        <p style={{ fontSize: 15, margin: '0 0 6px' }}>{error}</p>
        <button onClick={load} style={{ marginTop: 10, background: 'none', border: `1px solid ${C.border}`, borderRadius: 100, color: C.gold, padding: '6px 14px', fontFamily: dm, fontSize: 13, cursor: 'pointer' }}>Retry</button>
      </div>
    </div>
  );

  if (!data) return null;

  const maxSignup = Math.max(1, ...data.signups_14d.map(d => d.n));
  const triage = data.triage_split || {};
  const triageTotal = Object.values(triage).reduce((a, b) => a + b, 0);

  const features = data.feature_usage || [];
  const maxFeature = Math.max(1, ...features.map(f => f.events));
  const returns = data.return_reasons || [];
  const maxReturn = Math.max(1, ...returns.map(r => r.count));
  const commerce = data.commerce;

  const hasBaseline = typeof data.baseline_users === 'number';
  const retained = data.second_checkin_from_baseline ?? data.returning_users;
  const retainedOf = data.second_checkin_from_baseline != null && hasBaseline
    ? (data.baseline_users as number)
    : data.onboarded_users;
  const retainedLabel = data.second_checkin_from_baseline != null && hasBaseline
    ? 'captured a baseline'
    : 'finished onboarding';

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: dm, padding: '40px 20px 80px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
        .adm { max-width: 1000px; margin: 0 auto; }
        .adm-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
        @media (min-width: 760px) { .adm-grid { grid-template-columns: repeat(5, minmax(0,1fr)); } }
        .adm-two { display: grid; grid-template-columns: minmax(0,1fr); gap: 12px; }
        @media (min-width: 760px) { .adm-two { grid-template-columns: repeat(2, minmax(0,1fr)); } }
      `}</style>

      <div className="adm">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink, margin: 0 }}>Admin</h1>
          <button onClick={load} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 100, color: C.gold, padding: '5px 12px', fontFamily: dm, fontSize: 12, cursor: 'pointer' }}>Refresh</button>
        </div>

        <div className="adm-grid" style={{ marginBottom: 12 }}>
          <Metric label="Signups" value={data.total_users} />
          <Metric label="Finished onboarding" value={data.onboarded_users} sub={`${pct(data.onboarded_users, data.total_users)}% of signups`} />
          {hasBaseline && (
            <Metric label="Captured baseline" value={data.baseline_users as number} sub={`${pct(data.baseline_users as number, data.onboarded_users)}% of onboarded`} />
          )}
          <Metric label="Came back" value={retained} sub={`${pct(retained, retainedOf)}% of ${retainedLabel}`} />
          <Metric label="Check-ins" value={data.total_checkins} sub={`${data.total_photos} photos`} />
        </div>

        {/* The number the whole product rests on */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: C.muted, margin: '0 0 6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Retention</p>
          <p style={{ fontSize: 15, color: C.ink, margin: 0, lineHeight: 1.6 }}>
            {retained} of {retainedOf} people who {retainedLabel} have done a second check-in.
            {retainedOf > 0 && ` That is ${pct(retained, retainedOf)}%.`}
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0' }}>Target is 60%.</p>
        </div>

        <Panel title="Signups, last 14 days">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
            {data.signups_14d.length === 0 && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Nothing yet.</p>}
            {data.signups_14d.map((d, i) => (
              <div key={i} title={`${fmt(d.day)}: ${d.n}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ height: `${(d.n / maxSignup) * 100}%`, minHeight: 3, background: C.gold, borderRadius: 3 }} />
              </div>
            ))}
          </div>
        </Panel>

        <div className="adm-two" style={{ marginBottom: 12 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, color: C.muted, margin: '0 0 12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Feature usage</p>
            {features.length === 0 ? (
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Not reported yet.</p>
            ) : features.map(f => (
              <div key={f.feature} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.ink, marginBottom: 5 }}>
                  <span>{label(f.feature)}</span>
                  <span style={{ color: C.muted }}>{f.events} · {f.users} {f.users === 1 ? 'person' : 'people'}</span>
                </div>
                <Bar value={f.events} max={maxFeature} />
              </div>
            ))}
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, color: C.muted, margin: '0 0 12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>What people return for</p>
            {returns.length === 0 ? (
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Not reported yet.</p>
            ) : returns.map(r => (
              <div key={r.action} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.ink, marginBottom: 5 }}>
                  <span>{label(r.action)}</span>
                  <span style={{ color: C.muted }}>{r.count}</span>
                </div>
                <Bar value={r.count} max={maxReturn} />
              </div>
            ))}
            {returns.length > 0 && (
              <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0', lineHeight: 1.5 }}>
                First action after a gap of more than 24 hours.
              </p>
            )}
          </div>
        </div>

        {commerce && (
          <Panel title="Commerce">
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: commerce.top_products?.length ? 14 : 0 }}>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: C.ink, margin: 0 }}>{commerce.product_clicks ?? 0}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Product clicks</p>
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: C.ink, margin: 0 }}>{commerce.wishlist_saves ?? 0}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Wishlist saves</p>
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: C.ink, margin: 0 }}>{commerce.distinct_products_clicked ?? 0}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Products clicked</p>
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: C.ink, margin: 0 }}>{commerce.subscriptions ?? 0}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Subscriptions</p>
              </div>
            </div>
            {commerce.top_products?.length ? (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                {commerce.top_products.map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.ink, padding: '4px 0' }}>
                    <span>{p.name}</span>
                    <span style={{ color: C.muted }}>{p.clicks}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </Panel>
        )}

        {triageTotal > 0 && (
          <Panel title="Triage split">
            <div style={{ display: 'flex', height: 10, borderRadius: 100, overflow: 'hidden', marginBottom: 10 }}>
              {(['green', 'amber', 'red'] as const).map(k => (
                <div key={k} style={{ width: `${pct(triage[k] || 0, triageTotal)}%`, background: k === 'green' ? C.green : k === 'amber' ? C.amber : C.red }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {(['green', 'amber', 'red'] as const).map(k => (
                <span key={k} style={{ fontSize: 12, color: C.muted }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: k === 'green' ? C.green : k === 'amber' ? C.amber : C.red, marginRight: 6 }} />
                  {k} {triage[k] || 0}
                </span>
              ))}
            </div>
          </Panel>
        )}

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px' }}>
          <p style={{ fontSize: 11, color: C.muted, margin: '0 0 12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>People with check-ins</p>
          {data.users.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>No check-ins recorded yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ color: C.muted, fontSize: 11, textAlign: 'left' }}>
                  <th style={{ padding: '0 0 8px', fontWeight: 400 }}>User</th>
                  <th style={{ padding: '0 0 8px', fontWeight: 400 }}>Check-ins</th>
                  <th style={{ padding: '0 0 8px', fontWeight: 400 }}>First</th>
                  <th style={{ padding: '0 0 8px', fontWeight: 400 }}>Last</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <tr key={u.id} style={{ borderTop: `1px solid ${C.border}`, color: C.ink }}>
                    <td style={{ padding: '9px 0', fontFamily: 'monospace', fontSize: 12 }}>{shortId(u.id)}</td>
                    <td style={{ padding: '9px 0', color: u.checkins >= 2 ? C.green : C.muted }}>{u.checkins}</td>
                    <td style={{ padding: '9px 0', color: C.muted }}>{fmt(u.first_at)}</td>
                    <td style={{ padding: '9px 0', color: C.muted }}>{fmt(u.last_at)} · {daysAgo(u.last_at)}d ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;