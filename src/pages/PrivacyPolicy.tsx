import { useNavigate } from 'react-router-dom';

// NOTE: Template privacy language aligned to how FolliSense actually works
// (scalp photos, Supabase storage, AI analysis, account deletion). Review
// with Maryann,and eventually someone qualified (Kenya's Data Protection
// Act, 2019 applies),before public launch.

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const mont  = "'Montserrat', sans-serif";
  const ink   = '#20241F';
  const body  = '#3D423C';
  const muted = '#8A8F87';
  const green = '#2E4A39';
  const sageBg = '#EEF3EE';

  const h3 = { color: ink, fontSize: '0.98rem', fontWeight: 700, margin: '26px 0 8px', fontFamily: mont } as const;
  const p  = { margin: '0 0 6px', color: body, fontSize: '0.9rem', lineHeight: 1.7, fontFamily: mont } as const;

  return (
    <div style={{
      minHeight: '100dvh', width: '100%', background: '#FFFFFF',
      display: 'flex', justifyContent: 'center',
      fontFamily: mont,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
        html, body, #root { background: #FFFFFF !important; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '430px', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column' }}>

        <button
          onClick={() => navigate(-1)}
          style={{
            alignSelf: 'flex-start', background: 'none', border: 'none',
            color: green, fontSize: '0.95rem', fontWeight: 600, fontFamily: mont,
            cursor: 'pointer', padding: '4px 0', marginBottom: '20px',
          }}
        >
          ← Back
        </button>

        <h1 style={{ color: ink, fontSize: '1.55rem', fontWeight: 700, margin: '0 0 4px', fontFamily: mont, letterSpacing: '-0.01em' }}>
          Privacy Policy
        </h1>
        <div style={{ width: '44px', height: '3px', background: green, borderRadius: '2px', margin: '10px 0 6px' }} />
        <p style={{ color: muted, fontSize: '0.78rem', margin: '0 0 22px', fontFamily: mont }}>Last updated: June 25, 2026</p>

        <div style={{ background: sageBg, border: `1px solid #DCE6DC`, borderRadius: 12, padding: '14px 16px', marginBottom: 6 }}>
          <p style={{ ...p, margin: 0, fontSize: '0.85rem' }}>
            <strong style={{ color: green }}>In short:</strong> your scalp photos and check-in
            data belong to you, are stored privately, and are used only to provide FolliSense
            to you. We never sell your data, and you can delete everything at any time.
          </p>
        </div>

        <h3 style={h3}>1. Information We Collect</h3>
        <p style={p}>When you register, we collect your name and email address. As you use the Service, we collect the information you choose to provide,including scalp and hair photos, check-in responses, routine details, and hair profile information (such as hair texture). We also automatically collect limited technical data, such as device type and usage information, to keep the Service running reliably.</p>

        <h3 style={h3}>2. How We Use Your Information</h3>
        <p style={p}>We use your information to create and manage your account, generate your check-in history and personalised wellness insights, analyse the photos you submit in order to provide the Service's features, and improve the Service. We do not use your photos or health-related information for advertising.</p>

        <h3 style={h3}>3. Photo Storage and Analysis</h3>
        <p style={p}>Photos you submit are stored securely in a private storage bucket accessible only to your account. When you request an analysis, your photo is processed by our AI service solely to generate your results, and is not used for any other purpose.</p>

        <h3 style={h3}>4. Disclosure of Your Information</h3>
        <p style={p}>We do not sell your personal information. We share data only with the service providers that make the Service work (such as secure hosting, authentication, and AI analysis providers), each bound to use it only on our behalf,or where disclosure is required by law.</p>

        <h3 style={h3}>5. Data Retention and Deletion</h3>
        <p style={p}>Your data is retained while your account is active. You may delete your account at any time from your profile settings, which permanently removes your account, photos, and check-in history from the Service, subject to any retention required by law.</p>

        <h3 style={h3}>6. Security</h3>
        <p style={p}>We use administrative and technical safeguards,including encrypted connections and access controls,to protect your personal information. No system is completely impenetrable, but we work to keep your data safe and will notify you of any breach affecting your personal data as required by law.</p>

        <h3 style={h3}>7. Your Rights</h3>
        <p style={p}>Subject to applicable law, including Kenya's Data Protection Act, 2019, you have the right to access, correct, and delete your personal data, and to object to or restrict certain processing. To exercise these rights, use the in-app tools or contact us directly.</p>

        <h3 style={h3}>8. Changes to This Policy</h3>
        <p style={p}>We may update this policy from time to time. If we make material changes, we will notify you through the Service before they take effect.</p>

        <h3 style={h3}>9. Contact Us</h3>
        <p style={p}>Questions about this policy or your data? Contact us at support@follisense.com.</p>

      </div>
    </div>
  );
};

export default PrivacyPolicy;