import { motion } from 'framer-motion';
import { ShieldX, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene8_Outro() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: easings.easeOut.ease }}
    >
      <div className="absolute inset-0 bg-primary/5 blur-[150px]" />

      {phase >= 1 && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: easings.easeOut.ease }}
          className="flex items-center gap-6 mb-6"
        >
          <motion.div
            className="bg-primary/20 p-4 rounded-2xl border border-primary/30"
            animate={{
              boxShadow: [
                '0 0 0px rgba(6,182,212,0.3)',
                '0 0 30px rgba(6,182,212,0.5)',
                '0 0 0px rgba(6,182,212,0.3)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <ShieldX className="w-16 h-16 text-primary" />
          </motion.div>
          <h1 className="text-[6vw] font-display font-black text-white tracking-tight">
            EraseAI
          </h1>
        </motion.div>
      )}

      {phase >= 2 && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: easings.easeOut.ease }}
        >
          <p className="text-[2vw] font-mono text-primary/80 uppercase tracking-[0.2em] text-center mb-6">
            AI Data Governance Platform
          </p>
        </motion.div>
      )}

      {phase >= 3 && (
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-4">
            {['Personal', 'Professional', 'Enterprise'].map((tier, i) => (
              <motion.div
                key={tier}
                className="px-5 py-2 rounded-full border border-white/20 bg-white/5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.15, type: "spring" }}
              >
                <span className="text-[1.1vw] font-display text-white/80">{tier}</span>
              </motion.div>
            ))}
          </div>

          <motion.p
            className="text-[1.5vw] font-display text-white/60 text-center max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Protect your content. Secure your data. Scale with confidence.
          </motion.p>
        </motion.div>
      )}

      {phase >= 4 && (
        <motion.div
          className="flex flex-col items-center gap-4 mt-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <motion.div
            className="flex items-center gap-3 px-8 py-3 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] border border-white/20"
            animate={{
              boxShadow: [
                '0 0 0px rgba(99,102,241,0.3)',
                '0 0 25px rgba(99,102,241,0.5)',
                '0 0 0px rgba(99,102,241,0.3)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-[1.5vw] font-display text-white font-semibold">Start Protecting Now</span>
            <ArrowRight className="w-5 h-5 text-white" />
          </motion.div>

          <div className="px-6 py-2 rounded-full bg-white/5 border border-white/10">
            <span className="text-[1.2vw] font-display text-white/70">eraseai.ai</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
