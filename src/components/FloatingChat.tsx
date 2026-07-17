import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

const FloatingChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hide on auth/onboarding/checkin/stylist/triage screens,and on the chat page itself
  const hiddenPaths = ['/', '/signup', '/login', '/forgot-password', '/onboarding', '/mid-cycle', '/wash-day', '/stylist', '/results', '/baseline-response', '/chat'];
  const shouldHide = hiddenPaths.some(p => location.pathname === p || location.pathname.startsWith('/stylist'));

  // Chat discovery: tooltip on first dashboard visit, and again after 3 visits if never tapped
  useEffect(() => {
    if (location.pathname === '/home') {
      const tooltipKey = 'follisense-chat-tooltip-shown';
      const tappedKey = 'follisense-chat-ever-tapped';
      const visitCountKey = 'follisense-dashboard-visit-count';
      const secondTooltipKey = 'follisense-chat-tooltip-second-shown';

      const alreadyShown = localStorage.getItem(tooltipKey);
      const everTapped = localStorage.getItem(tappedKey);
      const visitCount = parseInt(localStorage.getItem(visitCountKey) || '0', 10) + 1;
      localStorage.setItem(visitCountKey, String(visitCount));

      if (!alreadyShown) {
        const timer = setTimeout(() => setShowTooltip(true), 1500);
        const dismiss = setTimeout(() => {
          setShowTooltip(false);
          localStorage.setItem(tooltipKey, 'true');
        }, 6500);
        return () => { clearTimeout(timer); clearTimeout(dismiss); };
      } else if (!everTapped && visitCount >= 3 && !localStorage.getItem(secondTooltipKey)) {
        const timer = setTimeout(() => setShowTooltip(true), 2000);
        const dismiss = setTimeout(() => {
          setShowTooltip(false);
          localStorage.setItem(secondTooltipKey, 'true');
        }, 6500);
        return () => { clearTimeout(timer); clearTimeout(dismiss); };
      }
    }
  }, [location.pathname]);

  // 30s idle pulse on dashboard
  useEffect(() => {
    if (location.pathname === '/home') {
      const resetIdle = () => {
        setShouldPulse(false);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => setShouldPulse(true), 30000);
      };

      resetIdle();
      const events = ['click', 'scroll', 'touchstart', 'keydown'];
      events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));

      return () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        events.forEach(e => window.removeEventListener(e, resetIdle));
      };
    } else {
      setShouldPulse(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
  }, [location.pathname]);

  // Stop pulse after one animation
  useEffect(() => {
    if (shouldPulse) {
      const t = setTimeout(() => setShouldPulse(false), 2000);
      return () => clearTimeout(t);
    }
  }, [shouldPulse]);

  const handleOpenChat = () => {
    setShowTooltip(false);
    localStorage.setItem('follisense-chat-ever-tapped', 'true');
    navigate('/chat');
  };

  if (shouldHide) return null;

  // Check if first visit (larger bubble)
  const isFirstVisit = !localStorage.getItem('follisense-chat-tooltip-shown');

  return (
    <>
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-[148px] right-6 z-50 max-w-[220px]"
            onClick={() => { setShowTooltip(false); localStorage.setItem('follisense-chat-tooltip-shown', 'true'); }}
          >
            <div className="bg-card rounded-2xl p-3.5 shadow-lg border border-border">
              <p className="text-sm text-foreground">Got questions? Ask here 👋</p>
            </div>
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-card border-r border-b border-border rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={handleOpenChat}
        className={`fixed bottom-20 right-6 z-50 rounded-full flex items-center justify-center ${isFirstVisit ? 'w-16 h-16' : 'w-14 h-14'}`}
        style={{ backgroundColor: 'hsl(155, 12%, 55%)', boxShadow: '0 4px 16px rgba(45,45,45,0.25)' }}
        animate={shouldPulse ? { scale: [1, 1.08, 1, 1.08, 1] } : { scale: 1 }}
        transition={shouldPulse ? { duration: 1.8, ease: 'easeInOut' } : {}}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle size={24} className="text-white" strokeWidth={1.8} />
      </motion.button>
    </>
  );
};

export default FloatingChat;