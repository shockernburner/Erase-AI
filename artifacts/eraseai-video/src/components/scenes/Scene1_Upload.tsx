import { motion } from 'framer-motion';
import { UploadCloud, FileJson, FileText, Database } from 'lucide-react';

export function Scene1_Upload() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-20"
      initial={{ opacity: 0, clipPath: "circle(0% at 50% 50%)" }}
      animate={{ opacity: 1, clipPath: "circle(150% at 50% 50%)" }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{ display: 'flex', width: '100%', maxWidth: '72rem', padding: '0 3rem', gap: '4rem', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <motion.div style={{ overflow: 'hidden' }}>
            <motion.h2
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              Step 1: <span className="glow-text" style={{ color: '#06B6D4' }}>Upload</span>
            </motion.h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              color: '#94a3b8',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.6,
            }}
          >
            Drag & Drop Dataset Sanitizer.
            <br />Connect cloud URLs securely.
          </motion.p>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1, duration: 1, type: "spring" }}
            className="glow-box"
            style={{
              border: '1px dashed rgba(30,41,59,0.5)',
              background: 'rgba(15,17,24,0.4)',
              backdropFilter: 'blur(12px)',
              padding: '3rem',
              borderRadius: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <UploadCloud style={{ width: '6rem', height: '6rem', color: '#06B6D4', marginBottom: '2rem' }} />
            </motion.div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[FileJson, FileText, Database].map((Icon, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ delay: 1.5 + (i * 0.2), type: "spring", bounce: 0.6 }}
                  style={{
                    background: 'rgba(30,41,59,0.5)',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                  }}
                >
                  <Icon style={{ width: '2rem', height: '2rem', color: 'rgba(6,182,212,0.7)' }} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
