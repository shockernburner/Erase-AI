import { motion } from 'framer-motion';
import { ShieldX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene1_Intro() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20 px-[10vw]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: easings.easeOut.ease }}
    >
      <div className="flex flex-col items-center gap-[2vh]">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-3xl bg-primary/50 blur-xl" />
          <div className="relative z-10 bg-primary/20 p-5 rounded-3xl border border-primary/30">
            <ShieldX className="w-24 h-24 text-primary" />
          </div>
        </motion.div>

        {phase >= 1 && (
          <motion.h1
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: easings.easeOut.ease }}
            className="text-[5.5vw] font-display font-black tracking-tighter text-gradient text-gradient-cyan leading-none text-center"
          >
            EraseAI
          </motion.h1>
        )}

        {phase >= 2 && (
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: easings.easeOut.ease }}
            className="text-[1.8vw] font-mono text-primary/70 uppercase tracking-[0.2em] text-center"
          >
            AI Data Governance Platform
          </motion.p>
        )}

        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easings.easeOut.ease }}
            className="flex flex-col items-center gap-[1.5vh] mt-[2vh]"
          >
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <p className="text-[1.6vw] font-display text-white/70 text-center tracking-tight">
              Protect your content before it reaches AI
            </p>

            <div className="flex items-center gap-[2vw]">
              {['Scan', 'Rewrite', 'Protect', 'Monitor'].map((word, i) => (
                <motion.span
                  key={word}
                  className="text-[1.1vw] font-mono text-white/50 uppercase tracking-[0.15em]"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.5 }}
                >
                  {word}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
