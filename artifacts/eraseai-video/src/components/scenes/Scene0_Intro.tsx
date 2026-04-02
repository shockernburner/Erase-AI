import { motion } from 'framer-motion';
import { ShieldX } from 'lucide-react';

export function Scene0_Intro() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center flex-col z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.5 }}
        className="relative"
        style={{ padding: '1.5rem', borderRadius: '1.5rem', marginBottom: '2rem' }}
      >
        <div className="absolute inset-0 rounded-3xl" style={{ background: '#06B6D4', filter: 'blur(16px)', opacity: 0.5 }} />
        <div style={{ background: 'rgba(6,182,212,0.2)', padding: '1.5rem', borderRadius: '1.5rem', position: 'relative', zIndex: 10 }}>
          <ShieldX style={{ width: '8rem', height: '8rem', color: '#06B6D4' }} />
        </div>
      </motion.div>

      <motion.div style={{ overflow: 'hidden' }}>
        <motion.h1
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8, delay: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: 'clamp(3rem, 7vw, 5rem)',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            marginBottom: '1rem',
            backgroundImage: 'linear-gradient(to right, #ffffff, #06B6D4)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          EraseAI
        </motion.h1>
      </motion.div>

      <motion.div style={{ overflow: 'hidden' }}>
        <motion.p
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
            fontFamily: 'var(--font-mono)',
            color: 'rgba(6,182,212,0.8)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            textAlign: 'center',
            maxWidth: '48rem',
            padding: '0 1rem',
          }}
        >
          Make AI forget what it should never learn
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 2.5, ease: "easeInOut" }}
        style={{
          width: '12rem',
          height: '2px',
          background: 'linear-gradient(to right, transparent, #06B6D4, transparent)',
          marginTop: '3rem',
        }}
      />
    </motion.div>
  );
}
