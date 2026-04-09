import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => setPhase(5), 5500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: '-100%' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute top-16 left-16 z-20">
        <motion.h2 
          className="text-[3vw] font-bold text-white mb-2"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.6 }}
        >
          Enterprise Mode
        </motion.h2>
        <motion.div 
          className="h-1 bg-[#06B6D4] w-24"
          initial={{ scaleX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          originX={0}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        <motion.p
          className="text-[1.5vw] text-slate-400 mt-4 max-w-md"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          Identify and sanitize sensitive data before it reaches your models.
        </motion.p>
      </div>

      {/* Dirty Data Screenshot */}
      <motion.div
        className="absolute right-[15vw] top-[20vh] w-[50vw] rounded-xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        initial={{ opacity: 0, rotateY: 20, rotateX: 10, z: -200, x: 100 }}
        animate={phase >= 2 ? (phase >= 4 ? { opacity: 0, scale: 0.9, x: -50 } : { opacity: 1, rotateY: -5, rotateX: 5, z: 0, x: 0 }) : { opacity: 0, rotateY: 20, rotateX: 10, z: -200, x: 100 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        <img src={`${import.meta.env.BASE_URL}screenshots/frame_003.jpg`} alt="Analysis Results" className="w-full h-auto object-cover" />
        
        {/* Callouts for dirty data */}
        <motion.div 
          className="absolute top-[20%] left-[25%] bg-[#F59E0B] text-[#0a0e1a] px-4 py-2 rounded-lg font-bold text-[1.2vw] shadow-lg"
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 3 && phase < 4 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          913 PII Detected
        </motion.div>
      </motion.div>

      {/* Clean Data Screenshot */}
      <motion.div
        className="absolute right-[10vw] top-[25vh] w-[55vw] rounded-xl overflow-hidden border border-[#06B6D4]/30 shadow-[0_20px_60px_rgba(6,182,212,0.2)]"
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={phase >= 4 ? { opacity: 1, y: 0, scale: 1, rotateY: -5, rotateX: 5 } : { opacity: 0, y: 100, scale: 0.9 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        <img src={`${import.meta.env.BASE_URL}screenshots/frame_005.jpg`} alt="Sanitized Results" className="w-full h-auto object-cover" />
        
        {/* Callouts for clean data */}
        <motion.div 
          className="absolute top-[30%] left-[20%] bg-[#10B981] text-white px-4 py-2 rounded-lg font-bold text-[1.2vw] shadow-lg flex flex-col items-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 5 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: 'spring' }}
        >
          <span>91% Forget Score</span>
          <span className="text-[0.9vw] font-normal opacity-80">751 Redacted</span>
        </motion.div>
      </motion.div>

      {/* Connection arrow */}
      {phase >= 4 && (
        <motion.svg className="absolute w-[20vw] h-[20vw] left-[35vw] top-[40vh] z-30 pointer-events-none" viewBox="0 0 200 200" fill="none">
          <motion.path
            d="M 20,20 C 100,20 100,180 180,180"
            stroke="#06B6D4"
            strokeWidth="4"
            strokeDasharray="8 8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1 }}
          />
        </motion.svg>
      )}
    </motion.div>
  );
}
