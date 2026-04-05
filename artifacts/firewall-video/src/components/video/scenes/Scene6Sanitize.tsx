import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const CHANGES = [
  { original: 'P@ssw0rd123', replacement: '[REDACTED_PASSWORD]', type: 'credential' },
  { original: 'sk-proj-4f8a2b...9e3d1c', replacement: '[REDACTED_API_KEY]', type: 'credential' },
  { original: 'wJalrXUtnF...EXAMPLEKEY', replacement: '[REDACTED_SECRET]', type: 'credential' },
  { original: 'sarah.chen@acme-corp.com', replacement: '[REDACTED_EMAIL]', type: 'pii' },
];

export function Scene6Sanitize() {
  const [phase, setPhase] = useState(0);
  const [visibleChanges, setVisibleChanges] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => { setPhase(3); setVisibleChanges(1); }, 1800),
      setTimeout(() => setVisibleChanges(2), 2200),
      setTimeout(() => setVisibleChanges(3), 2600),
      setTimeout(() => setVisibleChanges(4), 3000),
      setTimeout(() => setPhase(4), 3800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-[70vw]">
        <motion.div
          className="text-[1.8vw] text-center font-display font-bold text-white/90 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Instant sanitization
        </motion.div>

        <div className="grid grid-cols-2 gap-6">
          <motion.div
            className="rounded-xl border overflow-hidden"
            style={{ background: '#1a1b23', borderColor: phase >= 2 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)' }}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
              <span className="text-red-400 text-[0.9vw]">&#9679;</span>
              <span className="text-white/40 text-[0.8vw] font-mono">Before</span>
            </div>
            <div className="p-4 font-mono text-[0.85vw] leading-[1.8] text-white/60">
              <div>DATABASE_URL=postgresql://admin:</div>
              <motion.div
                className="relative"
                animate={phase >= 2 ? { color: 'rgba(239,68,68,0.8)' } : {}}
              >
                <span className={phase >= 2 ? 'line-through decoration-red-500/50' : ''}>P@ssw0rd123</span>
                <span className="text-white/40">@prod-db...</span>
              </motion.div>
              <div className="mt-2">OPENAI_API_KEY=</div>
              <motion.div animate={phase >= 2 ? { color: 'rgba(239,68,68,0.8)' } : {}}>
                <span className={phase >= 2 ? 'line-through decoration-red-500/50' : ''}>sk-proj-4f8a2b...9e3d1c</span>
              </motion.div>
              <div className="mt-2">Contact:</div>
              <motion.div animate={phase >= 2 ? { color: 'rgba(245,158,11,0.8)' } : {}}>
                <span className={phase >= 2 ? 'line-through decoration-amber-500/50' : ''}>sarah.chen@acme-corp.com</span>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            className="rounded-xl border overflow-hidden"
            style={{ background: '#1a1b23', borderColor: phase >= 3 ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)' }}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
              <span className="text-green-400 text-[0.9vw]">&#9679;</span>
              <span className="text-white/40 text-[0.8vw] font-mono">After</span>
            </div>
            <div className="p-4 font-mono text-[0.85vw] leading-[1.8] text-white/60">
              <div>DATABASE_URL=postgresql://admin:</div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={phase >= 3 ? { opacity: 1 } : {}}
                className="text-green-400"
              >
                [REDACTED_PASSWORD]<span className="text-white/40">@prod-db...</span>
              </motion.div>
              <div className="mt-2">OPENAI_API_KEY=</div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={phase >= 3 ? { opacity: 1 } : {}}
                transition={{ delay: 0.2 }}
                className="text-green-400"
              >
                [REDACTED_API_KEY]
              </motion.div>
              <div className="mt-2">Contact:</div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={phase >= 3 ? { opacity: 1 } : {}}
                transition={{ delay: 0.4 }}
                className="text-green-400"
              >
                [REDACTED_EMAIL]
              </motion.div>
            </div>
          </motion.div>
        </div>

        {phase >= 3 && (
          <motion.div
            className="mt-5 rounded-xl border border-white/10 bg-[#1a1b23] overflow-hidden"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 py-2 border-b border-white/5">
              <span className="text-white/40 text-[0.65vw] font-semibold uppercase tracking-wider">
                Changes Applied ({visibleChanges})
              </span>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {CHANGES.map((change, i) => {
                if (i >= visibleChanges) return null;
                return (
                  <motion.div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.06]"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className={`text-[0.55vw] font-bold uppercase px-1.5 py-0.5 rounded ${change.type === 'credential' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {change.type}
                    </span>
                    <span className="text-white/30 line-through text-[0.7vw]">{change.original}</span>
                    <span className="text-white/20">&#8594;</span>
                    <span className="text-green-400 text-[0.7vw]">{change.replacement}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {phase >= 4 && (
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-green-400 text-[1vw] font-mono">&#10003; Prompt sanitized — safe to send</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
