import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

// Splash image lives in src/assets/. The @/ alias points to src/, so this path
// works no matter where this component file sits (no fragile ../ relative path).
import splashImage from '@/assets/follisense_splash_v2.png';


// Warm brown matched to the splash image's edges, fades blend into the suede
// instead of flashing black at the start and end.
const BROWN = '#4A3526';

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // After the 2.5s splash, decide where to go:
    //  - logged in  → /home
    //  - logged out → /welcome
    const timer = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        navigate(session?.user ? '/home' : '/welcome', { replace: true });
      } catch {
        navigate('/welcome', { replace: true });
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: BROWN,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Full-bleed splash image: fades up from brown, breathes in, fades out.
          objectFit: 'cover' fills the screen; the breathe is a subtle 2% so it
          never crops more than necessary. */}
      <motion.img
        src={splashImage}
        alt="FolliSense"
        initial={{ opacity: 0, scale: 1 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [1, 1, 1, 1.02],
        }}
        transition={{
          duration: 2.5,
          times: [0, 0.22, 0.78, 1],
          ease: 'easeInOut',
        }}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '100vh',
          objectFit: 'cover',
          objectPosition: 'center',
          position: 'absolute',
          inset: 0,
        }}
      />

      {/* Brown fade-out layer for a smooth handoff to the next page */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{ duration: 2.5, times: [0, 0.82, 1], ease: 'easeIn' }}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: BROWN,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default SplashScreen;