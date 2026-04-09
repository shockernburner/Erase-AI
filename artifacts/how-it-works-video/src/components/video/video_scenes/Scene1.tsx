import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const titleText = "EraseAI".split('');

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative flex flex-col items-center">
        {/* Logo Mark */}
        <motion.div 
          className="relative w-24 h-24 mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#06B6D4] to-blue-600 shadow-[0_0_40px_rgba(6,182,212,0.5)]"></div>
          <div className="absolute inset-1 rounded-xl bg-[#0a0e1a] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#06B6D4] rounded-lg rotate-45 transform origin-center"></div>
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-[6vw] font-bold tracking-tighter leading-none mb-6 flex space-x-1">
          {titleText.map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 50, rotateX: 90 }}
              animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: 90 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.05 }}
              className={i >= 5 ? "text-[#06B6D4]" : "text-white"}
            >
              {char}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.div
          className="overflow-hidden h-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.p 
            className="text-[1.8vw] text-slate-400 uppercase tracking-[0.2em] font-semibold"
            initial={{ y: '100%' }}
            animate={phase >= 3 ? { y: '0%' } : { y: '100%' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            AI Data Governance Layer
          </motion.p>
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="mt-8 text-[2.2vw] font-medium text-white/90 text-center max-w-4xl"
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={phase >= 3 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 20, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Make AI forget what it should <span className="text-[#06B6D4]">never have learned</span>.
        </motion.p>
      </div>
    </motion.div>
  );
}
