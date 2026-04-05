import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene8Cta() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.03) 40%, transparent 70%)' }}
        />
      </motion.div>

      <motion.div
        className="relative w-[7vw] h-[7vw] rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        initial={{ scale: 0, rotate: -90 }}
        animate={phase >= 1 ? { scale: 1, rotate: 0 } : {}}
        transition={{ type: 'spring', stiffness: 250, damping: 18 }}
      >
        <svg viewBox="0 0 24 24" className="w-[3.5vw] h-[3.5vw]" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <motion.div
          className="absolute -inset-2 rounded-2xl border border-indigo-400/30"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      <motion.h2
        className="font-display font-bold text-[4vw] tracking-tight text-center leading-[1.1] mb-3"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Try EraseAI Free
        </span>
      </motion.h2>

      <motion.div
        className="text-[1.2vw] text-white/40 font-body mb-8"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : {}}
        transition={{ delay: 0.3 }}
      >
        Protect every prompt. Every platform. Every time.
      </motion.div>

      <motion.div
        className="px-8 py-3 rounded-xl text-[1.3vw] font-display font-semibold text-white tracking-wide"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        eraseai.ai
      </motion.div>

      <motion.div
        className="flex gap-8 mt-8"
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}
      >
        {['Chrome', 'VS Code', 'API', 'Replit', 'Xcode'].map((platform, i) => (
          <motion.span
            key={platform}
            className="text-[0.85vw] text-white/25 font-mono uppercase tracking-wider"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1 }}
          >
            {platform}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}
