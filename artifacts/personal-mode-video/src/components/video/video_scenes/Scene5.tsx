import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <h1 className="text-[5vw] font-display font-bold text-white leading-tight mb-6">
          TAKE CONTROL OF <br/>
          <span className="text-[var(--color-accent)]">YOUR DIGITAL PRIVACY</span>
        </h1>
      </motion.div>

      <motion.div
        className="flex items-center gap-4 mt-12 bg-white/5 px-8 py-4 rounded-full border border-white/10 backdrop-blur-sm"
        initial={{ y: 50, opacity: 0 }}
        animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Shield className="w-10 h-10 text-[var(--color-accent)]" />
        <div className="text-left">
          <div className="text-[2vw] font-display font-bold leading-none tracking-tight">EraseAI</div>
          <div className="text-[1vw] font-mono text-[var(--color-accent)] tracking-widest mt-1">PERSONAL MODE</div>
        </div>
      </motion.div>
      
      {/* Light sweep effect */}
      {phase >= 2 && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 1.5, delay: 0.5 }}
        />
      )}
    </motion.div>
  );
}
