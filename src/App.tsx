import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route,Navigate, useNavigate, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import Layout from "./components/Layout";
import SplashScreen from "./pages/SplashScreen";
import Welcome from "./pages/Welcome";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import Onboarding from "./pages/Onboarding";
import BaselineResponse from "./pages/BaselineResponse";
import HomePage from "./pages/HomePage";
import MidCycleCheckIn from "./pages/MidCycleCheckIn";
import WashDayAssessment from "./pages/WashDayAssessment";
import CheckInSummary from "./pages/CheckInSummary";
import ClinicianSummary from "./pages/ClinicianSummary";
import HealthProfile from "./pages/HealthProfile";
import HistoryPage from "./pages/HistoryPage";
import LearnPage from "./pages/LearnPage";
import ProfilePage from "./pages/ProfilePage";
import StylistHome from "./pages/StylistHome";
import StylistObservation from "./pages/StylistObservation";
import StylistClients from "./pages/StylistClients";
import StylistSignUpPage from "./pages/StylistSignUpPage";
import StylistLoginPage from "./pages/StylistLoginPage";
import StylistOnboarding from "./pages/StylistOnboarding";
import StylistProfilePage from "./pages/StylistProfilePage";
import ChatPage from "./pages/ChatPage";
import ProductDirectory from "./pages/ProductDirectory";
import ResearchProgramme from "./pages/ResearchProgramme";
import FindSpecialist from "./pages/FindSpecialist";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import MyRoutine from "./pages/MyRoutine";
import RoutineTracker from "./pages/RoutineTracker";
import SalonBooking from "./pages/SalonBooking";
import StylistLearnPage from "./pages/StylistLearnPage";
import ScalpQuiz from "./pages/ScalpQuiz";
import SalonCheckIn from "./pages/SalonCheckIn";
import StylistQuickIntake from "./pages/StylistQuickIntake";
import SpotIt from "./pages/SpotIt";
import ScalpCheckIn from "./pages/ScalpCheckIn";
import ShopPage from "./pages/ShopPage";
import NotFound from "./pages/NotFound";
import { supabase } from "./lib/supabaseClient";
import OTPVerificationPage from "./pages/OTPVerificationPage";
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import GoodbyePage from './pages/GoodbyePage';
import AuthCallback from '@/pages/AuthCallback';
import ResetPasswordPage from './pages/ResetPassword';
import AdminPage from './pages/AdminPage';
import UserGeneratedProducts from './pages/UserGeneratedProducts';
import ProductDetailPage from './pages/ProductDetailPage';
import WishlistPage from './pages/WishlistPage';
import { initAnalytics, grantAnalyticsConsent, trackPageview } from './lib/analytics'

const queryClient = new QueryClient();

// ─── Session guard,restores user on refresh ─────────────────────────────────
const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { setUserName, setOnboardingComplete, setOnboardingData, onboardingData, onboardingComplete } = useApp();

  // Onboarded users should never see onboarding again,catches in-session
  // navigation (back button, deep links) without re-running the full restore.
  useEffect(() => {
    if (onboardingComplete && location.pathname === '/onboarding') {
      navigate('/home', { replace: true });
    }
  }, [location.pathname, onboardingComplete]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          // No session,redirect to login unless already on public pages.
          // '/' is the splash screen,always allowed so the splash can play.
         const publicPages = ['/', '/welcome', '/login', '/signup', '/forgot-password', '/verify-otp', '/stylist/login', '/stylist/signup', '/terms', '/privacy', '/auth/callback', '/goodbye','/reset-password'];
          if (!publicPages.includes(location.pathname)) {
            navigate('/login');
          }
          return;
        }

        // Session exists,restore name
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, gender')
          .eq('id', session.user.id)
          .single();

        if (profile?.first_name) setUserName(profile.first_name);
        if (profile?.gender && !onboardingData.gender) {
          setOnboardingData({ ...onboardingData, gender: profile.gender });
        }

        // Check if onboarding was completed in Supabase
        const { data: consumerProfile } = await supabase
          .from('consumer_profiles')
          .select('hair_texture')
          .eq('user_id', session.user.id)
          .single();

        const hasOnboarded = onboardingComplete || !!consumerProfile?.hair_texture;
        if (hasOnboarded && !onboardingComplete) {
          setOnboardingComplete(true);
        }

        // Onboarded user landing directly on /onboarding (refresh, old link,
        // notification deep-link) → home, never back to step 1.
        if (hasOnboarded && location.pathname === '/onboarding') {
          navigate('/home', { replace: true });
          return;
        }

        // If on an auth page and session exists, redirect to home.
        // NOTE: '/' (splash) and '/welcome' are deliberately NOT here,the
        // splash screen plays for everyone and decides where to go next itself.
        const authPages = ['/login', '/signup'];
        if (authPages.includes(location.pathname)) {
          navigate(hasOnboarded ? '/home' : '/onboarding');
        }

      } catch (err) {
        console.error('[Session] Restore error:', err);
      }
    };

    restoreSession();
  }, []);

  return <>{children}</>;
};
const RouteTracker = () => {
  const location = useLocation();
  useEffect(() => { trackPageview(); }, [location.pathname]);
  return null;
};
const App = () => {
  // Register Firebase service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('[SW] Registered:', registration.scope);
        })
        .catch((err) => {
          console.error('[SW] Registration failed:', err);
        });
    }
  }, []);
   useEffect(() => {
    initAnalytics();
    if (localStorage.getItem('analytics_consent') === 'granted') {
      grantAnalyticsConsent();
    }
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SessionGuard>
              <RouteTracker />
              <Layout>
                <Routes>
                  <Route path="/" element={<SplashScreen />} />
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/verify-otp" element={<OTPVerificationPage />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/onboarding/baseline-response" element={<BaselineResponse />} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/my-routine" element={<MyRoutine />} />
                  <Route path="/routine-tracker" element={<RoutineTracker />} />
                  <Route path="/salon-booking" element={<SalonBooking />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/mid-cycle" element={<MidCycleCheckIn />} />
                  <Route path="/wash-day" element={<WashDayAssessment />} />
                  <Route path="/results" element={<CheckInSummary />} />
                  <Route path="/clinician-summary" element={<ClinicianSummary />} />
                  <Route path="/health-profile" element={<HealthProfile />} />
                  <Route path="/research" element={<ResearchProgramme />} />
                  <Route path="/find-specialist" element={<FindSpecialist />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/learn" element={<LearnPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/scalp-check" element={<ScalpCheckIn />} />
                  <Route path="/spot-it" element={<SpotIt />} />
                  <Route path="/salon-checkin" element={<SalonCheckIn />} />
                  <Route path="/stylist/signup" element={<StylistSignUpPage />} />
                  <Route path="/stylist/login" element={<StylistLoginPage />} />
                  <Route path="/stylist/onboarding" element={<StylistOnboarding />} />
                  <Route path="/stylist" element={<StylistHome />} />
                  <Route path="/stylist/learn" element={<StylistLearnPage />} />
                  <Route path="/stylist/observation" element={<StylistObservation />} />
                  <Route path="/stylist/quiz" element={<ScalpQuiz />} />
                  <Route path="/stylist/quick-intake" element={<StylistQuickIntake />} />
                  <Route path="/stylist/clients" element={<StylistClients />} />
                  <Route path="/stylist/profile" element={<StylistProfilePage />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/goodbye" element={<GoodbyePage />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/products" element={<UserGeneratedProducts />} />
                  <Route path="/product/:slug" element={<ProductDetailPage />} />
                  <Route path="/product-guide" element={<ProductDirectory />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/shop" element={<Navigate to="/products" replace />} />
                  <Route path="/clinician/:userId" element={<ClinicianSummary />} />
                  {/* Catch-all stays last. */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </SessionGuard>
          </BrowserRouter>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;