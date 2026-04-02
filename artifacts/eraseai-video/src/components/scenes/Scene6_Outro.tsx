import { motion } from 'framer-motion';
import { ShieldX } from 'lucide-react';

export function Scene6_Outro() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: 50, filter: "blur(10px)" }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring", damping: 15 }}
        style={{ marginBottom: '2rem' }}
      >
        <ShieldX className="glow-text" style={{ width: '6rem', height: '6rem', color: '#06B6D4' }} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
        style={{
          fontSize: 'clamp(3rem, 7vw, 5rem)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          marginBottom: '1.5rem',
        }}
      >
        EraseAI.ai
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        style={{
          background: 'rgba(6,182,212,0.1)',
          border: '1px solid rgba(6,182,212,0.3)',
          padding: '0.75rem 2rem',
          borderRadius: '9999px',
        }}
      >
        <p style={{
          fontSize: 'clamp(0.8rem, 1.8vw, 1.25rem)',
          fontFamily: 'var(--font-mono)',
          color: '#06B6D4',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
        }}>
          AI Data Governance Layer
        </p>
      </motion.div>
    </motion.div>
  );
}
