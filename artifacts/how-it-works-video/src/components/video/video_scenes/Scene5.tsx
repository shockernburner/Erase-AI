import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background glow specific to closing */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-t from-[#06B6D4]/10 to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 2 }}
      />

      {/* Logo */}
      <motion.div 
        className="flex items-center justify-center gap-4 mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#06B6D4] to-blue-600 shadow-[0_0_30px_rgba(6,182,212,0.4)]"></div>
          <div className="absolute inset-1 rounded-lg bg-[#0a0e1a] flex items-center justify-center">
            <div className="w-6 h-6 border-[3px] border-[#06B6D4] rounded-md rotate-45 transform origin-center"></div>
          </div>
        </div>
        <h1 className="text-[4vw] font-bold tracking-tighter text-white">EraseAI</h1>
      </motion.div>

      {/* Core Message */}
      <motion.h2
        className="text-[3vw] font-medium text-center text-slate-300 leading-tight max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        Your data. Your rules.<br/>
        <span className="text-white font-bold">AI that respects both.</span>
      </motion.h2>

      {/* URL */}
      <motion.div
        className="mt-12 px-8 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-md"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <span className="text-[1.5vw] font-mono text-[#06B6D4] tracking-wider">eraseai.ai</span>
      </motion.div>

      {/* Accent particles */}
      {phase >= 1 && Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-[#06B6D4]/50 pointer-events-none"
          initial={{ 
            x: '50vw', y: '50vh', 
            opacity: 1,
            scale: 0
          }}
          animate={{ 
            x: `${50 + (Math.random() * 80 - 40)}vw`, 
            y: `${50 + (Math.random() * 80 - 40)}vh`,
            opacity: 0,
            scale: Math.random() * 2 + 1
          }}
          transition={{ 
            duration: Math.random() * 2 + 2, 
            ease: "easeOut",
            delay: Math.random() * 0.5
          }}
        />
      ))}
    </motion.div>
  );
}
