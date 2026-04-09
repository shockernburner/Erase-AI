import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => setPhase(5), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#06B6D4]/5 to-transparent" />
        <motion.div
          className="absolute top-[20vh] left-1/2 -translate-x-1/2 w-[40vw] h-[40vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15), transparent)' }}
          animate={{ scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <div className="relative flex flex-col items-center z-10">
        <motion.div
          className="relative w-[6vw] h-[6vw] mb-[3vh]"
          initial={{ scale: 0, rotate: -90 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -90 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#06B6D4] to-[#3b82f6] shadow-[0_0_60px_rgba(6,182,212,0.5)]" />
          <div className="absolute inset-[4px] rounded-xl bg-[#0a0e1a] flex items-center justify-center">
            <div className="w-[2.5vw] h-[2.5vw] border-[3px] border-[#06B6D4] rounded-lg rotate-45" />
          </div>
        </motion.div>

        <motion.h2
          className="text-[4.5vw] font-bold text-white mb-[2vh]"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Erase<span className="text-[#06B6D4]">AI</span>
        </motion.h2>

        <motion.p
          className="text-[1.6vw] text-slate-300 text-center max-w-[45vw] mb-[3vh] leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.7 }}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Your AI data governance layer.
          <br />
          Enterprise. Personal. Developer.
        </motion.p>

        <motion.div
          className="flex items-center gap-[3vw] mb-[4vh]"
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.a
            className="text-[1.4vw] font-bold text-[#06B6D4] tracking-wide"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ delay: 0.1 }}
          >
            eraseai.ai
          </motion.a>
          <motion.div
            className="w-[1px] h-[2vw] bg-slate-600"
            initial={{ scaleY: 0 }}
            animate={phase >= 4 ? { scaleY: 1 } : { scaleY: 0 }}
          />
          <motion.span
            className="text-[1vw] text-slate-400"
            initial={{ opacity: 0, x: 20 }}
            animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ delay: 0.2 }}
          >
            Singapore
          </motion.span>
        </motion.div>

        <motion.div
          className="flex gap-[2vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: 0.5 } : { opacity: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-[0.75vw] text-slate-500 uppercase tracking-wider">director@futureonward.com</span>
          <span className="text-[0.75vw] text-slate-500 uppercase tracking-wider">wa.me/85290576851</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
