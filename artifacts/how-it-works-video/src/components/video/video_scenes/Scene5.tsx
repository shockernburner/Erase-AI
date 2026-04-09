import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 5000),
      setTimeout(() => setPhase(5), 7000),
      setTimeout(() => setPhase(6), 9000),
      setTimeout(() => setPhase(7), 12000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase >= 2 && videoRef1.current) {
      videoRef1.current.play().catch(() => {});
    }
    if (phase >= 5 && videoRef2.current) {
      videoRef2.current.play().catch(() => {});
    }
  }, [phase]);

  return (
    <motion.div
      className="absolute inset-0 z-10"
      initial={{ opacity: 0, scale: 1.15 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: '-50%', scale: 0.9 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute top-[5vh] right-[4vw] z-20 text-right">
        <motion.div
          className="flex items-center justify-end gap-[1vw] mb-[1vh]"
          initial={{ opacity: 0, x: 40 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-[2.8vw] font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Developer Mode
          </h2>
          <div className="w-[2.5vw] h-[2.5vw] rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#06B6D4] flex items-center justify-center">
            <svg className="w-[1.3vw] h-[1.3vw]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
        </motion.div>
        <motion.div
          className="h-[3px] bg-gradient-to-l from-[#3b82f6] to-transparent rounded-full ml-auto"
          initial={{ width: 0 }}
          animate={phase >= 1 ? { width: '18vw' } : { width: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        />
        <motion.p
          className="text-[1.2vw] text-slate-400 mt-[1.5vh] max-w-[28vw] ml-auto"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          AI Firewall, API SDKs, browser extension, and prompt scanning.
        </motion.p>
      </div>

      <motion.div
        className="absolute left-[5vw] top-[18vh] w-[50vw] rounded-xl overflow-hidden border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.6)] z-10"
        initial={{ opacity: 0, x: -80, rotateY: -10 }}
        animate={phase >= 2 ? (phase >= 4 ? { opacity: 0.6, scale: 0.85, x: -30 } : { opacity: 1, x: 0, rotateY: -3, rotateX: 3 }) : { opacity: 0, x: -80, rotateY: -10 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        <video
          ref={videoRef1}
          src={`${import.meta.env.BASE_URL}clips/dev_scanner.mp4`}
          muted
          playsInline
          className="w-full h-auto"
        />
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-[#06B6D4] shadow-[0_0_15px_#06B6D4,0_0_30px_#06B6D4] pointer-events-none"
          initial={{ top: '15%' }}
          animate={phase >= 3 ? { top: ['15%', '85%', '15%'] } : { top: '15%' }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>

      <motion.div
        className="absolute left-[3vw] bottom-[22vh] z-20"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? (phase >= 4 ? { opacity: 0 } : { opacity: 1 }) : { opacity: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="px-[1.2vw] py-[0.8vh] rounded-lg border border-[#3b82f6]/30 bg-[#0a0e1a]/90 backdrop-blur-sm">
          <span className="text-[0.8vw] text-[#3b82f6] font-semibold">Scan & Analyze</span>
          <p className="text-[0.7vw] text-slate-400 mt-[0.3vh]">Detect secrets, PII, injection risks</p>
        </div>
      </motion.div>

      <motion.div
        className="absolute right-[5vw] top-[22vh] w-[52vw] rounded-xl overflow-hidden border border-[#3b82f6]/30 shadow-[0_20px_70px_rgba(59,130,246,0.2)] z-20"
        initial={{ opacity: 0, y: 80, scale: 0.85 }}
        animate={phase >= 5 ? { opacity: 1, y: 0, scale: 1, rotateY: -3, rotateX: 2 } : { opacity: 0, y: 80, scale: 0.85 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        <video
          ref={videoRef2}
          src={`${import.meta.env.BASE_URL}clips/firewall_overview.mp4`}
          muted
          playsInline
          className="w-full h-auto"
        />
      </motion.div>

      <motion.div
        className="absolute bottom-[6vh] left-[5vw] right-[5vw] flex justify-center gap-[2vw] z-30"
        initial={{ opacity: 0 }}
        animate={phase >= 6 ? { opacity: 1 } : { opacity: 0 }}
      >
        {[
          { label: 'Prompt Interception', color: '#3b82f6' },
          { label: 'Risk Analysis', color: '#06B6D4' },
          { label: 'Auto-Sanitize', color: '#10B981' },
          { label: 'API & Webhooks', color: '#F59E0B' },
          { label: 'Browser Extension', color: '#8b5cf6' },
        ].map((tag, i) => (
          <motion.div
            key={tag.label}
            className="px-[1vw] py-[0.5vh] rounded-full border bg-[#0a0e1a]/80 backdrop-blur-sm text-[0.8vw] font-medium"
            style={{ borderColor: `${tag.color}40`, color: tag.color }}
            initial={{ opacity: 0, y: 15 }}
            animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
            transition={{ delay: i * 0.08 }}
          >
            {tag.label}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
