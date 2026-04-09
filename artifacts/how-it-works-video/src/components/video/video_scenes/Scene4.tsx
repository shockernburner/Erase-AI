import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => setPhase(5), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: '-100%' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute top-16 right-16 z-20 text-right">
        <motion.h2 
          className="text-[3vw] font-bold text-white mb-2"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.6 }}
        >
          Developer Mode
        </motion.h2>
        <motion.div 
          className="h-1 bg-[#3b82f6] w-24 ml-auto"
          initial={{ scaleX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          originX={1}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        <motion.p
          className="text-[1.5vw] text-slate-400 mt-4 max-w-md ml-auto"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          Intercept risks at the prompt level. AI Firewall & API SDKs.
        </motion.p>
      </div>

      {/* Firewall Docs Screenshot */}
      <motion.div
        className="absolute left-[15vw] top-[20vh] w-[45vw] rounded-xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-10"
        initial={{ opacity: 0, x: -100, rotateY: -15, z: -100 }}
        animate={phase >= 2 ? { opacity: 0.7, x: 0, rotateY: 10, z: -100, scale: 0.9 } : { opacity: 0, x: -100, rotateY: -15, z: -100 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        <img src={`${import.meta.env.BASE_URL}screenshots/frame_009.jpg`} alt="AI Firewall Docs" className="w-full h-auto object-cover" />
      </motion.div>

      {/* Prompt Scanner Screenshot */}
      <motion.div
        className="absolute right-[25vw] top-[30vh] w-[50vw] rounded-xl overflow-hidden border border-[#3b82f6]/40 shadow-[0_20px_60px_rgba(59,130,246,0.3)] z-20"
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={phase >= 3 ? { opacity: 1, y: 0, scale: 1, rotateY: -5, rotateX: 2 } : { opacity: 0, y: 100, scale: 0.8 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        <img src={`${import.meta.env.BASE_URL}screenshots/frame_008.jpg`} alt="Prompt Scanner" className="w-full h-auto object-cover" />
        
        {/* Animated scanning line over the code */}
        {phase >= 4 && (
          <motion.div
            className="absolute left-0 right-0 h-[2px] bg-[#06B6D4] shadow-[0_0_10px_#06B6D4,0_0_20px_#06B6D4]"
            initial={{ top: '20%' }}
            animate={{ top: '80%' }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          />
        )}
      </motion.div>

      {/* Feature tags */}
      <div className="absolute bottom-[15vh] left-[20vw] flex gap-4 z-30">
        {['Prompt Interception', 'Risk Analysis', 'Auto-Sanitize'].map((tag, i) => (
          <motion.div
            key={tag}
            className="px-4 py-2 rounded-full border border-[#3b82f6]/50 bg-[#0a0e1a]/80 backdrop-blur-sm text-[#3b82f6] text-[1vw] font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: i * 0.15 }}
          >
            {tag}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
