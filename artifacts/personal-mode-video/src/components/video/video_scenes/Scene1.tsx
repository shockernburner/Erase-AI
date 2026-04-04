import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 3200), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative">
        <motion.div 
          className="absolute -inset-10 border border-red-500/30 rounded-lg"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, rotate: [0, 2] } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        
        <h1 className="text-[6vw] leading-[1.1] font-display font-bold uppercase tracking-tight text-white mix-blend-difference">
          <motion.span 
            className="block text-red-500"
            initial={{ y: 50, opacity: 0 }}
            animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            YOUR DATA
          </motion.span>
          <motion.span 
            className="block text-white"
            initial={{ y: 50, opacity: 0 }}
            animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          >
            IS TRAINING AI
          </motion.span>
          <motion.span 
            className="block text-white/50 text-[3vw] mt-4"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={phase >= 2 ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            WITHOUT YOUR KNOWLEDGE.
          </motion.span>
        </h1>
      </div>
      
      {/* Glitch Overlay Effect */}
      {phase >= 1 && phase < 3 && (
        <motion.div 
          className="absolute inset-0 bg-red-500 mix-blend-overlay pointer-events-none"
          animate={{ opacity: [0, 0.2, 0, 0.1, 0] }}
          transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror" }}
        />
      )}
    </motion.div>
  );
}
