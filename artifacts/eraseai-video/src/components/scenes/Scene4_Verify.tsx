import { motion } from 'framer-motion';
import { ShieldCheck, History } from 'lucide-react';

export function Scene4_Verify() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-20"
      initial={{ opacity: 0, rotateX: 90 }}
      animate={{ opacity: 1, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 1.2, ease: "backOut" }}
      style={{ perspective: '1500px' }}
    >
      <div style={{ display: 'flex', width: '100%', maxWidth: '72rem', padding: '0 3rem', gap: '4rem', alignItems: 'center' }}>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8, type: "spring", bounce: 0.5 }}
          >
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(16,185,129,0.2)',
              filter: 'blur(48px)',
              borderRadius: '9999px',
              transform: 'scale(1.5)',
            }} />
            <ShieldCheck style={{ width: '12rem', height: '12rem', color: '#10B981', position: 'relative', zIndex: 10 }} />
          </motion.div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            Step 4: <span className="text-shadow" style={{ color: '#10B981' }}>Verify</span>
          </motion.h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <motion.p
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                color: '#94a3b8',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Zero matches post-cleanup.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              style={{
                background: 'rgba(15,17,24,0.4)',
                border: '1px solid #1e293b',
                padding: '1.5rem',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
              }}
            >
              <History style={{ width: '2.5rem', height: '2.5rem', color: '#06B6D4', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)', marginBottom: '0.25rem' }}>Immutable Version Control</div>
                <div style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.7rem, 1.2vw, 0.85rem)' }}>v1.0.4 → Cleaned Data Layer</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
