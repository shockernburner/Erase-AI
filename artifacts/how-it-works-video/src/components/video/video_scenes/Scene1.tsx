import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 3000),
      setTimeout(() => setPhase(5), 5000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(100% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 1.3, filter: 'blur(30px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative flex flex-col items-center">
        <motion.div
          className="relative w-[7vw] h-[7vw] mb-[3vh]"
          initial={{ scale: 0, rotate: -180 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#06B6D4] to-[#3b82f6] shadow-[0_0_60px_rgba(6,182,212,0.6)]" />
          <div className="absolute inset-[4px] rounded-xl bg-[#0a0e1a] flex items-center justify-center">
            <div className="w-[3vw] h-[3vw] border-[3px] border-[#06B6D4] rounded-lg rotate-45" />
          </div>
        </motion.div>

        <div className="flex items-baseline gap-[0.2vw]" style={{ fontFamily: 'var(--font-display)' }}>
          {'EraseAI'.split('').map((char, i) => (
            <motion.span
              key={i}
              className={`text-[6vw] font-bold tracking-tighter leading-none ${i >= 5 ? 'text-[#06B6D4]' : 'text-white'}`}
              initial={{ opacity: 0, y: 60, rotateX: -90, transformPerspective: 800 }}
              animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0, transformPerspective: 800 } : { opacity: 0, y: 60, rotateX: -90, transformPerspective: 800 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22, delay: i * 0.06 }}
              style={{ display: 'inline-block' }}
            >
              {char}
            </motion.span>
          ))}
        </div>

        <motion.div className="overflow-hidden mt-[2vh]">
          <motion.p
            className="text-[1.5vw] uppercase tracking-[0.25em] text-slate-400 font-semibold"
            initial={{ y: '120%', opacity: 0 }}
            animate={phase >= 3 ? { y: '0%', opacity: 1 } : { y: '120%', opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            How It Works
          </motion.p>
        </motion.div>

        <motion.p
          className="mt-[4vh] text-[2vw] font-medium text-white/90 text-center max-w-[60vw]"
          initial={{ opacity: 0, y: 20, filter: 'blur(12px)' }}
          animate={phase >= 4 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 20, filter: 'blur(12px)' }}
          transition={{ duration: 0.9 }}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Make AI forget what it should <span className="text-[#06B6D4] font-bold">never have learned</span>.
        </motion.p>
      </div>

      <motion.div
        className="absolute bottom-[8vh] flex gap-[3vw] items-center"
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 0.4 } : { opacity: 0 }}
        transition={{ duration: 1 }}
      >
        {['ChatGPT', 'Claude', 'Gemini', 'Replit'].map((platform, i) => (
          <motion.span
            key={platform}
            className="text-[0.9vw] text-slate-500 uppercase tracking-widest"
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: i * 0.1 + 0.3 }}
          >
            {platform}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}
