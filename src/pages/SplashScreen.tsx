import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

import splashImage from '@/assets/follisense_splash_v2.png';

// Brand green matched to the app, fades blend into green instead of brown
const GREEN = '#12211A';

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
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
        position: 'fixed',
        inset: 0,
        backgroundColor: GREEN,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Full-bleed splash image: fades up, breathes gently, fades out */}
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
          objectFit: 'cover',
          objectPosition: 'center',
          position: 'absolute',
          inset: 0,
        }}
      />

      {/* Green fade-out layer for a smooth handoff to the next page */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{ duration: 2.5, times: [0, 0.82, 1], ease: 'easeIn' }}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: GREEN,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default SplashScreen;