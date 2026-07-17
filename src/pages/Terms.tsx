import { useNavigate } from 'react-router-dom';

// NOTE: This is template legal language aligned to how FolliSense actually
// works (wellness tool, photo check-ins, account deletion). Review it with
// Maryann,and eventually someone qualified,before public launch.

const Terms = () => {
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
          Terms &amp; Conditions
        </h1>
        <div style={{ width: '44px', height: '3px', background: green, borderRadius: '2px', margin: '10px 0 6px' }} />
        <p style={{ color: muted, fontSize: '0.78rem', margin: '0 0 22px', fontFamily: mont }}>Last updated: June 25, 2026</p>

        {/* The single most important paragraph for a scalp-health app */}
        <div style={{ background: sageBg, border: `1px solid #DCE6DC`, borderRadius: 12, padding: '14px 16px', marginBottom: 6 }}>
          <p style={{ ...p, margin: 0, fontSize: '0.85rem' }}>
            <strong style={{ color: green }}>Please note:</strong> FolliSense is a wellness and
            self-care companion. It does not diagnose, treat, or prevent any medical condition,
            and it is not a substitute for advice from a qualified healthcare professional.
          </p>
        </div>

        <h3 style={h3}>1. Acceptance of Terms</h3>
        <p style={p}>By creating an account or using the FolliSense service ("the Service"), you agree to be bound by these Terms. If you do not agree, please do not use the Service. You must be at least 18 years old to use the Service.</p>

        <h3 style={h3}>2. About the Service</h3>
        <p style={p}>FolliSense helps you track and understand your scalp and hair health through guided photo check-ins, routine tracking, and personalised wellness insights. Insights provided by the Service are informational only. Always consult a healthcare professional about any concern regarding your scalp, hair, or general health.</p>

        <h3 style={h3}>3. Your Account</h3>
        <p style={p}>You agree to provide accurate information during registration and to keep your login credentials secure. You are responsible for all activity that occurs under your account. Notify us promptly if you suspect unauthorised access.</p>

        <h3 style={h3}>4. Your Content and Photos</h3>
        <p style={p}>You retain ownership of the photos and information you submit. By using the Service, you grant FolliSense a limited licence to store and process this content solely to provide the Service to you,for example, generating your check-in history and insights. We do not sell your content. See our Privacy Policy for full details on how your data is handled.</p>

        <h3 style={h3}>5. Acceptable Use</h3>
        <p style={p}>You agree not to misuse the Service, including by attempting to access other users' data, interfering with the Service's operation, uploading unlawful content, or using the Service for any purpose other than personal, non-commercial scalp and hair care.</p>

        <h3 style={h3}>6. Intellectual Property</h3>
        <p style={p}>The FolliSense name, logo, design, and all content and software comprising the Service are the property of FolliSense and are protected by applicable intellectual property laws. You may not copy, modify, or distribute them without our prior written permission.</p>

        <h3 style={h3}>7. Account Deletion</h3>
        <p style={p}>You may delete your account at any time from your profile settings. Deletion permanently removes your account and associated data from the Service, subject to any retention required by law.</p>

        <h3 style={h3}>8. Disclaimers and Limitation of Liability</h3>
        <p style={p}>The Service is provided "as is" without warranties of any kind, whether express or implied. To the maximum extent permitted by law, FolliSense shall not be liable for any indirect, incidental, or consequential damages arising from your use of, or inability to use, the Service.</p>

        <h3 style={h3}>9. Changes to These Terms</h3>
        <p style={p}>We may update these Terms from time to time. If we make material changes, we will notify you through the Service. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</p>

        <h3 style={h3}>10. Governing Law</h3>
        <p style={p}>These Terms are governed by the laws of the Republic of Kenya, without regard to conflict of law provisions.</p>

        <h3 style={h3}>11. Contact</h3>
        <p style={p}>Questions about these Terms? Reach us at support@follisense.app.</p>

      </div>
    </div>
  );
};

export default Terms;