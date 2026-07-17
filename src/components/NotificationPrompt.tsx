// src/components/NotificationPrompt.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, X, Check, Calendar, Droplets as DropletsIcon, BarChart2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";
const sage     = '#7fa896';
const gold     = '#D4A866';
const goldDeep = '#B8893E';
const ink      = '#1C1C1C';
const muted    = '#999999';
const border   = '#E8DED1';
const itemBg   = '#F5F0EB';
const white    = '#FFFFFF';

interface NotificationPromptProps {
  onDismiss: () => void;
}

export const NotificationPrompt = ({ onDismiss }: NotificationPromptProps) => {
  const { permission, isLoading, requestPermission } = usePushNotifications();
  const [enabled, setEnabled] = useState(false);

  const handleEnable = async () => {
    await requestPermission();
    setEnabled(true);
  };

  if (enabled && permission === 'granted') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        style={{ background: `${sage}10`, border: `1.5px solid ${sage}30`, borderRadius: 18, padding: '16px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${sage}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={18} color={sage} strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: ink, margin: '0 0 2px' }}>Notifications enabled</p>
          <p style={{ fontFamily: dm, fontSize: 11, color: muted, margin: 0 }}>We'll remind you when it's time for a check-in.</p>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <X size={16} color={muted} strokeWidth={1.8} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ background: white, border: `1.5px solid ${border}`, borderRadius: 18, padding: '18px 18px', marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: `${gold}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={19} color={goldDeep} strokeWidth={1.6} />
          </div>
          <div>
            <p style={{ fontFamily: playfair, fontSize: 15, fontWeight: 500, color: ink, margin: '0 0 2px' }}>Stay on top of your scalp</p>
            <p style={{ fontFamily: dm, fontSize: 11, color: muted, margin: 0 }}>Get reminders that fit your routine</p>
          </div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
          <X size={16} color={muted} strokeWidth={1.8} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[
          { icon: '🌿', text: 'Check-in reminders timed to your cycle' },
          { icon: '💧', text: 'Wash day nudges based on your routine'  },
          { icon: '🛍', text: 'New product picks matched to your profile' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <p style={{ fontFamily: dm, fontSize: 12, color: '#555', margin: 0, lineHeight: 1.5 }}>{item.text}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onDismiss}
          style={{ flex: 1, height: 44, borderRadius: 12, border: `1.5px solid ${border}`, background: itemBg, fontFamily: dm, fontSize: 13, color: muted, cursor: 'pointer' }}>
          Not now
        </button>
        <button onClick={handleEnable} disabled={isLoading}
          style={{ flex: 2, height: 44, borderRadius: 12, border: 'none', background: ink, color: '#fff', fontFamily: dm, fontSize: 13, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Bell size={14} color="#fff" strokeWidth={2} />
          {isLoading ? 'Enabling…' : 'Enable notifications'}
        </button>
      </div>
    </motion.div>
  );
};

// ─── NOTIFICATION SETTINGS (for Profile page) ─────────────────────────────────
const mont       = "'Montserrat', sans-serif";
const goldSolid  = '#D4A866';
const goldBorder = 'rgba(212,168,102,0.22)';
const gold08     = 'rgba(212,168,102,0.08)';
const mid        = '#E8E4DF';


const notificationTypes = [
  { key: 'checkin', Icon: Bell,           label: 'Scalp check-in reminder', desc: 'Notified halfway through your style cycle'  },
  { key: 'washday', Icon: DropletsIcon,  label: 'Wash day reminder',        desc: '2 days before your expected wash day'       },
  { key: 'tip',     Icon: Calendar,      label: 'Scalp care tips',          desc: 'A helpful tip every 2 days at 9am'          },
  { key: 'summary', Icon: BarChart2,     label: 'Weekly scalp summary',     desc: 'Every Sunday at 5pm your week in review'    },
];

export const NotificationSettings = () => {
  const { permission, isLoading, requestPermission } = usePushNotifications();
  const [active, setActive] = useState(permission === 'granted');

  const handleToggle = async () => {
    if (active) {
      // Disable in-app,reminders won't fire even if browser permission remains
      setActive(false);
      return;
    }
    if (permission === 'granted') {
      setActive(true);
      return;
    }
    await requestPermission();
    setActive(true);
  };

  const isDenied = permission === 'denied';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Main toggle row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: active ? `1px solid ${mid}` : 'none' }}>
        <div>
          <p style={{ fontFamily: mont, fontSize: 13, fontWeight: 700, color: '#2A2420', margin: '0 0 2px' }}>Push notifications</p>
          <p style={{ fontFamily: mont, fontSize: 11, color: isDenied ? '#B05040' : active ? goldDeep : muted, margin: 0 }}>
            {isDenied ? 'Blocked in browser settings' : active ? 'Active' : 'Tap to enable'}
          </p>
        </div>
        <button onClick={handleToggle} disabled={isLoading || isDenied}
          style={{ width: 48, height: 28, borderRadius: 100, flexShrink: 0, background: active ? goldSolid : mid, border: 'none', cursor: (isLoading || isDenied) ? 'not-allowed' : 'pointer', position: 'relative', transition: 'background 0.25s', opacity: isLoading ? 0.6 : 1 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: white, position: 'absolute', top: 3, left: active ? 23 : 3, transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }} />
        </button>
      </div>

      {/* Notification types shown when active */}
      {active && (
        <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {notificationTypes.map((item, i) => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < notificationTypes.length - 1 ? `1px solid ${mid}` : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: gold08, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <item.Icon size={15} color={goldDeep} strokeWidth={1.6} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: mont, fontSize: 12, fontWeight: 700, color: '#2A2420', margin: '0 0 2px' }}>{item.label}</p>
                <p style={{ fontFamily: mont, fontSize: 11, color: muted, margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
              </div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: goldSolid, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      {/* Denied message */}
      {isDenied && (
        <div style={{ marginTop: 12, background: 'rgba(176,80,64,0.05)', border: '1px solid rgba(176,80,64,0.15)', borderRadius: 12, padding: '10px 14px' }}>
          <p style={{ fontFamily: mont, fontSize: 11, color: '#B05040', margin: 0, lineHeight: 1.6 }}>
            To enable notifications go to your browser then Site settings then Notifications then Allow for this site.
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationPrompt;