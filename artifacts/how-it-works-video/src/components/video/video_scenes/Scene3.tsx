import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => setPhase(5), 5500),
      setTimeout(() => setPhase(6), 8500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase >= 2 && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  return (
    <motion.div
      className="absolute inset-0 z-10"
      initial={{ clipPath: 'circle(0% at 80% 20%)' }}
      animate={{ clipPath: 'circle(150% at 80% 20%)' }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(15px)' }}
      transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="absolute top-[5vh] left-[4vw] z-20">
        <motion.div
          className="flex items-center gap-[1vw] mb-[1vh]"
          initial={{ opacity: 0, y: -30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-[2.5vw] h-[2.5vw] rounded-lg bg-gradient-to-br from-[#10B981] to-[#06B6D4] flex items-center justify-center">
            <svg className="w-[1.3vw] h-[1.3vw]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
          </div>
          <h2 className="text-[2.8vw] font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Analytics Dashboard
          </h2>
        </motion.div>
        <motion.div
          className="h-[3px] bg-gradient-to-r from-[#10B981] to-transparent rounded-full"
          initial={{ width: 0 }}
          animate={phase >= 1 ? { width: '20vw' } : { width: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        />
        <motion.p
          className="text-[1.2vw] text-slate-400 mt-[1.5vh] max-w-[28vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          Monitor your data governance posture in real time.
        </motion.p>
      </div>

      <motion.div
        className="absolute left-[8vw] right-[8vw] top-[22vh] rounded-xl overflow-hidden border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.7)]"
        initial={{ opacity: 0, y: 80, rotateX: -15 }}
        animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 80, rotateX: -15 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        <video
          ref={videoRef}
          src={`${import.meta.env.BASE_URL}clips/analytics.mp4`}
          muted
          playsInline
          className="w-full h-auto"
        />
      </motion.div>

      <motion.div
        className="absolute bottom-[5vh] left-[8vw] right-[8vw] flex justify-between z-20"
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
      >
        {[
          { label: 'Datasets Processed', value: '9', icon: 'M20 7h-4V3H8v4H4v14h16V7z', color: '#06B6D4' },
          { label: 'Forget Score', value: '34.75%', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', color: '#10B981' },
          { label: 'Issues Found', value: '6,507', icon: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', color: '#F59E0B' },
          { label: 'Rows Affected', value: '4,607', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', color: '#3b82f6' },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            className="flex flex-col items-center px-[2vw] py-[1.5vh] rounded-xl border border-white/5 bg-[#0a0e1a]/80 backdrop-blur-sm"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={phase >= 4 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 22 }}
          >
            <svg className="w-[1.2vw] h-[1.2vw] mb-[0.5vh]" viewBox="0 0 24 24" fill="none" stroke={metric.color} strokeWidth="2">
              <path d={metric.icon} />
            </svg>
            <span className="text-[1.8vw] font-bold" style={{ color: metric.color }}>{metric.value}</span>
            <span className="text-[0.7vw] text-slate-400 mt-[0.3vh]">{metric.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
