import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1Hook() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(12px)' }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 0.15, repeat: Infinity, repeatType: 'mirror' }}
        />
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-cyan-400/20"
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative text-center px-8">
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <motion.div
            className="text-[2vw] font-mono uppercase tracking-[0.4em] text-cyan-400/80 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
          >
            &#9888; WARNING
          </motion.div>

          <h1 className="font-display font-bold text-[4.5vw] leading-[1.1] tracking-tight relative">
            <motion.span
              className="block text-white"
              initial={{ y: 40, opacity: 0 }}
              animate={phase >= 1 ? { y: 0, opacity: 1 } : {}}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
            >
              Your secrets are
            </motion.span>
            <motion.span
              className="block bg-gradient-to-r from-red-500 via-amber-400 to-red-500 bg-clip-text text-transparent"
              initial={{ y: 40, opacity: 0 }}
              animate={phase >= 2 ? { y: 0, opacity: 1 } : {}}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              one prompt away
            </motion.span>
            <motion.span
              className="block text-white/60 text-[3vw]"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={phase >= 3 ? { opacity: 1, filter: 'blur(0px)' } : {}}
              transition={{ duration: 0.6 }}
            >
              from AI.
            </motion.span>
          </h1>

          {phase >= 1 && (
            <motion.div
              className="absolute -inset-6 border border-red-500/20 rounded-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: [0, 0.6, 0.3], scale: 1 }}
              transition={{ duration: 1 }}
            />
          )}
        </motion.div>
      </div>

      {phase >= 1 && (
        <motion.div
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)' }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 0.3, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}
