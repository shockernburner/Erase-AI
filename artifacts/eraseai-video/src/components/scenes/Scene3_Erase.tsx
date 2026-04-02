import { motion } from 'framer-motion';

export function Scene3_Erase() {
  const rows = [
    { id: '001', text: 'Contact john@example.com', pii: 'Email', status: 'clean' },
    { id: '002', text: 'SSN is 000-00-0000', pii: 'SSN', status: 'redact' },
    { id: '003', text: 'Biased dataset row...', pii: 'Proxy Bias', status: 'delete' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      style={{ padding: '0 3rem' }}
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -100 }}
      transition={{ duration: 1.2, ease: "circOut" }}
    >
      <motion.h2
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: '#ffffff',
          marginBottom: '3rem',
          textAlign: 'center',
        }}
      >
        Step 3: <span className="glow-text" style={{ color: '#06B6D4' }}>Erase & Redact</span>
      </motion.h2>

      <div style={{
        width: '100%',
        maxWidth: '60rem',
        background: 'rgba(15,17,24,0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #1e293b',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'rgba(30,41,59,0.5)',
          padding: '1rem',
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(0.7rem, 1.2vw, 0.85rem)',
          fontWeight: 700,
          color: '#94a3b8',
          borderBottom: '1px solid #1e293b',
        }}>
          <div>ID</div>
          <div>Text</div>
          <div>PII</div>
          <div>Action</div>
        </div>

        {rows.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + (i * 0.3) }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              padding: '1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(0.65rem, 1.1vw, 0.85rem)',
              borderBottom: '1px solid rgba(30,41,59,0.5)',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div>{row.id}</div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '1rem' }}>{row.text}</div>
            <div>{row.pii}</div>
            <div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 2 + (i * 0.5) }}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  display: 'inline-block',
                  border: `1px solid ${row.status === 'clean' ? '#10B981' : row.status === 'redact' ? '#06B6D4' : '#EF4444'}`,
                  color: row.status === 'clean' ? '#10B981' : row.status === 'redact' ? '#06B6D4' : '#EF4444',
                  background: row.status === 'clean' ? 'rgba(16,185,129,0.1)' : row.status === 'redact' ? 'rgba(6,182,212,0.1)' : 'rgba(239,68,68,0.1)',
                }}
              >
                {row.status.toUpperCase()}
              </motion.div>
            </div>

            {row.status === 'redact' && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 3.5, duration: 0.5 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  background: 'rgba(6,182,212,0.2)',
                  backdropFilter: 'blur(2px)',
                }}
              />
            )}
            {row.status === 'delete' && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 4, duration: 0.5 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  background: 'rgba(239,68,68,0.2)',
                }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
