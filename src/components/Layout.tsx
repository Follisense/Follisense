import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Clock, BookOpen, User, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import FloatingChat from '@/components/FloatingChat';

const consumerTabs = [
  { path: '/home',    icon: Home,     label: 'Home'    },
  { path: '/history', icon: Clock,    label: 'History' },
  { path: '/learn',   icon: BookOpen, label: 'Learn'   },
  { path: '/profile', icon: User,     label: 'Profile' },
];
const stylistTabs = [
  { path: '/stylist',         icon: Home,     label: 'Home'    },
  { path: '/stylist/learn',   icon: BookOpen, label: 'Learn'   },
  { path: '/stylist/clients', icon: Users,    label: 'Clients' },
  { path: '/stylist/profile', icon: User,     label: 'Profile' },
];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { stylistMode } = useApp();

  const hiddenNavPaths = [
    '/', '/welcome', '/signup', '/login', '/onboarding',
    '/mid-cycle', '/wash-day', '/results', '/clinician-summary',
    '/stylist/observation', '/stylist/quiz', '/find-specialist',
    '/forgot-password', '/salon-checkin', '/stylist/onboarding',
    '/stylist/signup', '/stylist/login', '/stylist/quick-intake',
    '/spot-it', '/shop', '/verify-otp','/terms', '/privacy', '/auth/callback', '/goodbye','/chat','/salon-visit','/reset-password',
  ];

  const showNav =
    !hiddenNavPaths.some(p => location.pathname === p) &&
    !location.pathname.startsWith('/onboarding/');

  const tabs = stylistMode ? stylistTabs : consumerTabs;

  const isAuthPage = [
    '/', '/welcome', '/login', '/signup', '/forgot-password',
    '/verify-otp', '/stylist/login', '/stylist/signup', '/onboarding','/terms', '/privacy', '/auth/callback', '/goodbye',
  ].includes(location.pathname);

  return (
    // Outer wrapper,always cream/white, fills the whole screen on desktop
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F5' }}>

      {/* Inner container,always capped at 430px, centred */}
      <div className="mx-auto min-h-screen relative max-w-[430px]">
        {children}

        {showNav && (
          <nav className="fixed bottom-0 left-0 right-0 z-50">
            <div className="max-w-[430px] mx-auto bg-card border-t border-border">
              <div className="flex items-center justify-around py-2 px-2">
                {tabs.map(({ path, icon: Icon, label }) => {
                  const active = location.pathname === path;
                  return (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors ${
                        active ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                      <span className="text-[11px] font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        )}

        {!stylistMode && !isAuthPage && <FloatingChat />}
      </div>
    </div>
  );
};

export default Layout;