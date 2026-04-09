import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 4000),
      setTimeout(() => setPhase(5), 6000),
      setTimeout(() => setPhase(6), 8000),
      setTimeout(() => setPhase(7), 10000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 z-10"
      initial={{ clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' }}
      animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
      exit={{ clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' }}
      transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="absolute top-[5vh] left-[4vw] z-20">
        <motion.div
          className="flex items-center gap-[1vw] mb-[1vh]"
          initial={{ opacity: 0, x: -40 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-[2.5vw] h-[2.5vw] rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] flex items-center justify-center">
            <svg className="w-[1.3vw] h-[1.3vw]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="text-[2.8vw] font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Personal Mode
          </h2>
        </motion.div>
        <motion.div
          className="h-[3px] bg-gradient-to-r from-[#8b5cf6] to-transparent rounded-full"
          initial={{ width: 0 }}
          animate={phase >= 1 ? { width: '18vw' } : { width: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        />
        <motion.p
          className="text-[1.2vw] text-slate-400 mt-[1.5vh] max-w-[28vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          Protect yourself. Scan text before sharing with AI platforms.
        </motion.p>
      </div>

      <div className="absolute right-[8vw] top-[18vh] w-[50vw] flex flex-col gap-[2vh]">
        <motion.div
          className="rounded-xl border border-white/10 bg-[#111827]/90 backdrop-blur-sm p-[1.5vw] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
          initial={{ opacity: 0, x: 60, rotateY: 10 }}
          animate={phase >= 2 ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: 60, rotateY: 10 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformPerspective: 1200 }}
        >
          <div className="flex items-center gap-[0.5vw] mb-[1vh]">
            <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#ef4444]" />
            <span className="text-[0.9vw] text-slate-400 font-medium">Input Text</span>
          </div>
          <motion.div className="text-[0.85vw] text-slate-300 font-mono leading-relaxed bg-[#0a0e1a] rounded-lg p-[1vw]">
            <motion.span
              initial={{ opacity: 0 }}
              animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.2 }}
            >
              My name is <span className="text-[#ef4444] bg-[#ef4444]/10 px-1 rounded">John Smith</span> and I live at{' '}
              <span className="text-[#ef4444] bg-[#ef4444]/10 px-1 rounded">123 Main St, Singapore</span>.{' '}
              My email is <span className="text-[#ef4444] bg-[#ef4444]/10 px-1 rounded">john@company.com</span>.{' '}
              Please help me draft a complaint about my employer.
            </motion.span>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex items-center justify-center gap-[1vw]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <motion.div
            className="w-[3vw] h-[3vw] rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#06B6D4] flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.4)]"
            animate={phase >= 4 ? { rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <svg className="w-[1.5vw] h-[1.5vw]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </motion.div>
          <div className="flex flex-col">
            <span className="text-[1vw] text-white font-bold">Scanning & Sanitizing</span>
            <span className="text-[0.7vw] text-slate-400">3 PII instances detected</span>
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl border border-[#10B981]/30 bg-[#111827]/90 backdrop-blur-sm p-[1.5vw] shadow-[0_20px_60px_rgba(16,185,129,0.1)]"
          initial={{ opacity: 0, x: 60, rotateY: 10 }}
          animate={phase >= 5 ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: 60, rotateY: 10 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformPerspective: 1200 }}
        >
          <div className="flex items-center gap-[0.5vw] mb-[1vh]">
            <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#10B981]" />
            <span className="text-[0.9vw] text-[#10B981] font-medium">Sanitized Output</span>
          </div>
          <motion.div className="text-[0.85vw] text-slate-300 font-mono leading-relaxed bg-[#0a0e1a] rounded-lg p-[1vw]">
            <motion.span
              initial={{ opacity: 0 }}
              animate={phase >= 5 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.3 }}
            >
              My name is <span className="text-[#10B981] bg-[#10B981]/10 px-1 rounded">[REDACTED]</span> and I live at{' '}
              <span className="text-[#10B981] bg-[#10B981]/10 px-1 rounded">[REDACTED]</span>.{' '}
              My email is <span className="text-[#10B981] bg-[#10B981]/10 px-1 rounded">[REDACTED]</span>.{' '}
              Please help me draft a complaint about my employer.
            </motion.span>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="absolute left-[6vw] bottom-[10vh] flex flex-col gap-[1.5vh] z-20"
        initial={{ opacity: 0 }}
        animate={phase >= 6 ? { opacity: 1 } : { opacity: 0 }}
      >
        {[
          { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Advisory Text Analysis', color: '#8b5cf6' },
          { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', label: 'Content Rewrite Assistant', color: '#ec4899' },
          { icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', label: 'Continuous Monitoring', color: '#06B6D4' },
        ].map((feature, i) => (
          <motion.div
            key={feature.label}
            className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.8vh] rounded-lg border border-white/5 bg-[#0a0e1a]/80 backdrop-blur-sm"
            initial={{ opacity: 0, x: -30 }}
            animate={phase >= 6 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ delay: i * 0.12, type: 'spring', stiffness: 300, damping: 25 }}
          >
            <svg className="w-[1vw] h-[1vw]" viewBox="0 0 24 24" fill="none" stroke={feature.color} strokeWidth="2">
              <path d={feature.icon} />
            </svg>
            <span className="text-[0.9vw] text-white">{feature.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
