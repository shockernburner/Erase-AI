import { motion } from 'framer-motion';

export function Scene2_Analyze() {
  const codeSnippet = `{
  "status": "scanning",
  "pii_found": ["SSN", "Email"],
  "bias_score": 0.84,
  "toxicity": "detected"
}`;

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-20"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{ maxWidth: '80rem', width: '100%', padding: '0 3rem', display: 'flex', gap: '3rem', alignItems: 'center' }}>

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
            }}
          >
            Step 2: <span className="glow-text" style={{ color: '#06B6D4' }}>Analyze</span>
          </motion.h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {['PII Detection (SSN, Emails)', 'Gender & Racial Bias', 'Toxicity Scanning'].map((text, i) => (
              <motion.div
                key={i}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1 + (i * 0.2) }}
                style={{
                  background: 'rgba(15,17,24,0.5)',
                  border: '1px solid rgba(6,182,212,0.3)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                  style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    borderRadius: '9999px',
                    background: '#EF4444',
                  }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.8rem, 1.5vw, 1.1rem)' }}>{text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0, rotateY: -30 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(6,182,212,0.2)',
            padding: '2rem',
            borderRadius: '1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)',
            color: 'rgba(6,182,212,0.8)',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 0 50px rgba(6,182,212,0.1)',
            perspective: '1000px',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '2px',
            background: 'linear-gradient(to right, transparent, #06B6D4, transparent)',
          }} />
          <pre style={{ position: 'relative', zIndex: 10 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 2 }}
            >
              {codeSnippet}
            </motion.div>
          </pre>

          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(6,182,212,0.1)',
              pointerEvents: 'none',
            }}
            initial={{ y: '-100%' }}
            animate={{ y: '100%' }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
