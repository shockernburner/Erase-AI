import { motion } from 'framer-motion';

export function Scene5_Retrain() {
  const pythonCode = `import eraseai
from ml_pipeline import train_model

# Fetch sanitized dataset
dataset = eraseai.get_dataset("v1.0.4")

# Safely retrain
model = train_model(dataset)
print("Model retrained securely.")`;

  const lines = pythonCode.split('\n');

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-20"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, filter: "blur(20px)" }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '60rem', width: '100%', padding: '0 3rem' }}>
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: '#ffffff',
            marginBottom: '3rem',
            textAlign: 'center',
          }}
        >
          Step 5: <span className="glow-text" style={{ color: '#06B6D4' }}>Retrain Models</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          style={{
            width: '100%',
            background: '#1e1e1e',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            border: '1px solid rgba(30,41,59,0.5)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{
            background: '#2d2d2d',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderBottom: '1px solid #3d3d3d',
          }}>
            <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '9999px', background: '#EF4444' }} />
            <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '9999px', background: '#F59E0B' }} />
            <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '9999px', background: '#10B981' }} />
            <span style={{ marginLeft: '1rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#9ca3af' }}>retrain.py</span>
          </div>
          <div style={{ padding: '2rem', fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.65rem, 1.2vw, 0.9rem)', color: '#d4d4d4', overflow: 'hidden' }}>
            <pre>
              {lines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 + (i * 0.15) }}
                  style={{ padding: '0.25rem 0' }}
                >
                  <span style={{ color: '#6b7280', marginRight: '1rem', userSelect: 'none' }}>{i + 1}</span>
                  <span dangerouslySetInnerHTML={{
                    __html: line
                      .replace(/import/g, '<span style="color:#c586c0">import</span>')
                      .replace(/from/g, '<span style="color:#c586c0">from</span>')
                      .replace(/print/g, '<span style="color:#dcdcaa">print</span>')
                      .replace(/"[^"]*"/g, '<span style="color:#ce9178">$&</span>')
                      .replace(/#.*/g, '<span style="color:#6a9955">$&</span>')
                  }} />
                </motion.div>
              ))}
            </pre>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
