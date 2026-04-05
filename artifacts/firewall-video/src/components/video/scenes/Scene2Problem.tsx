import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const PROMPT_LINES = [
  { text: 'Help me deploy this app. Here are my configs:', type: 'normal' as const },
  { text: '', type: 'normal' as const },
  { text: 'DATABASE_URL=postgresql://admin:P@ssw0rd123@prod-db.aws.com:5432/users', type: 'danger' as const },
  { text: 'OPENAI_API_KEY=sk-proj-4f8a2b...9e3d1c', type: 'danger' as const },
  { text: 'AWS_SECRET_ACCESS_KEY=wJalrXUtnF...EXAMPLEKEY', type: 'danger' as const },
  { text: 'Contact: sarah.chen@acme-corp.com', type: 'warning' as const },
];

export function Scene2Problem() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showHighlights, setShowHighlights] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    PROMPT_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 300 + i * 400));
    });
    timers.push(setTimeout(() => setShowHighlights(true), 2800));
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center p-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -60, filter: 'blur(8px)' }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-[70vw]">
        <motion.div
          className="text-[1.4vw] text-center text-white/50 font-body mb-6 tracking-wide"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Every day, developers accidentally leak secrets to AI
        </motion.div>

        <motion.div
          className="rounded-xl overflow-hidden border border-white/10"
          style={{ background: '#1e1e2e' }}
          initial={{ y: 30, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        >
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-white/30 text-[0.9vw] font-mono">ChatGPT</span>
            </div>
          </div>

          <div className="p-6 font-mono text-[1.1vw] leading-relaxed">
            {PROMPT_LINES.map((line, i) => {
              if (i >= visibleLines) return null;
              const isDanger = line.type === 'danger' && showHighlights;
              const isWarning = line.type === 'warning' && showHighlights;
              return (
                <motion.div
                  key={i}
                  className={`relative py-0.5 ${isDanger ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-white/70'}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {(isDanger || isWarning) && (
                    <motion.div
                      className={`absolute -inset-x-2 -inset-y-0.5 rounded ${isDanger ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                      style={{ originX: 0 }}
                    />
                  )}
                  <span className="relative z-10">{line.text || '\u00A0'}</span>
                </motion.div>
              );
            })}
            <motion.span
              className="inline-block w-[0.6vw] h-[1.4vw] bg-cyan-400 ml-1"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: 'mirror' }}
            />
          </div>
        </motion.div>

        {showHighlights && (
          <motion.div
            className="flex justify-center gap-6 mt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-[1vw] font-mono">
              <span className="text-red-400">&#9679;</span> <span className="text-white/40">3 secrets detected</span>
            </span>
            <span className="text-[1vw] font-mono">
              <span className="text-amber-400">&#9679;</span> <span className="text-white/40">1 PII found</span>
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
