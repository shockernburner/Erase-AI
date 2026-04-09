import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => setPhase(5), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute top-16 left-16 z-20">
        <motion.h2 
          className="text-[3vw] font-bold text-white mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
        >
          Real-time Analytics
        </motion.h2>
        <motion.div 
          className="h-1 bg-[#10B981] w-24"
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
          Monitor your data governance posture globally.
        </motion.p>
      </div>

      <motion.div
        className="absolute left-[10vw] right-[10vw] top-[25vh] rounded-xl overflow-hidden border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
        initial={{ opacity: 0, y: 50, rotateX: -10 }}
        animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: -10 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        <img src={`${import.meta.env.BASE_URL}screenshots/frame_007.jpg`} alt="Analytics Dashboard" className="w-full h-auto object-cover" />
        
        {/* Metric Highlight 1 */}
        <motion.div 
          className="absolute top-[18%] left-[20%] w-[15vw] h-[10vw] border-2 border-[#06B6D4] rounded-lg bg-[#06B6D4]/10 pointer-events-none"
          initial={{ opacity: 0, scale: 1.2 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.5 }}
        />

        {/* Metric Highlight 2 */}
        <motion.div 
          className="absolute top-[18%] right-[22%] w-[15vw] h-[10vw] border-2 border-[#10B981] rounded-lg bg-[#10B981]/10 pointer-events-none"
          initial={{ opacity: 0, scale: 1.2 }}
          animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.5 }}
        />
      </motion.div>

      {/* Floating stats */}
      <motion.div
        className="absolute bottom-[10vh] left-[20vw] bg-[#1a233a] border border-white/10 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <div className="w-12 h-12 rounded-full bg-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div>
          <div className="text-[1vw] text-slate-400">Total Issues Found</div>
          <div className="text-[2vw] font-bold text-white leading-none">6,507</div>
        </div>
      </motion.div>
    </motion.div>
  );
}
