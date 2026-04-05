import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3Reveal() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(15px)' }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.05) 50%, transparent 70%)' }}
        />
      </motion.div>

      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={phase >= 1 ? { scale: 1, rotate: 0 } : {}}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <div className="w-[10vw] h-[10vw] rounded-2xl flex items-center justify-center relative"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <svg viewBox="0 0 24 24" className="w-[5vw] h-[5vw]" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>

          {phase >= 2 && (
            <motion.div
              className="absolute -inset-3 rounded-3xl border-2 border-indigo-400/40"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: [0, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
      </motion.div>

      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <h2 className="font-display font-bold text-[3.5vw] tracking-tight">
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
            EraseAI Firewall
          </span>
        </h2>
      </motion.div>

      <motion.div
        className="mt-3"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}
      >
        <span className="text-[1.4vw] text-white/50 font-body tracking-wide">
          The AI Privacy Layer
        </span>
      </motion.div>
    </motion.div>
  );
}
