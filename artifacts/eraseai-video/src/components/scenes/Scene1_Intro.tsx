import { motion } from 'framer-motion';
import { ShieldX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings, elementAnimations } from '@/lib/video/animations';

export function Scene1_Intro() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 5500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: easings.easeOut.ease }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: phase >= 3 ? 0.7 : 1, rotate: 0, y: phase >= 3 ? -80 : 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 rounded-3xl bg-primary/50 blur-xl" />
        <div className="relative z-10 bg-primary/20 p-6 rounded-3xl border border-primary/30">
          <ShieldX className="w-32 h-32 text-primary" />
        </div>
      </motion.div>

      {phase >= 1 && (
        <motion.div className="overflow-hidden">
          <motion.h1
            {...elementAnimations.fadeUp}
            className="text-[6vw] font-display font-black tracking-tighter text-gradient text-gradient-cyan leading-none text-center"
          >
            EraseAI
          </motion.h1>
        </motion.div>
      )}

      {phase >= 2 && (
        <motion.div className="overflow-hidden mt-4">
          <motion.h2
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: easings.easeOut.ease }}
            className="text-[2vw] font-mono text-primary/80 uppercase tracking-[0.2em] text-center"
          >
            AI Data Governance Platform
          </motion.h2>
        </motion.div>
      )}

      {phase >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easings.easeOut.ease }}
          className="absolute bottom-[22%] flex flex-col items-center gap-4"
        >
          <div className="text-[2.8vw] font-display font-bold text-white tracking-tight text-center">
            Protect Your Content. Secure Your Data.
          </div>
          <motion.div
            className="flex items-center gap-6 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {['Scan', 'Rewrite', 'Protect', 'Monitor'].map((word, i) => (
              <motion.span
                key={word}
                className="text-[1.2vw] font-mono text-primary/60 uppercase tracking-widest"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.15 }}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
