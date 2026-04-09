import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5500),
      setTimeout(() => setPhase(5), 7500),
      setTimeout(() => setPhase(6), 10000),
      setTimeout(() => setPhase(7), 12500),
      setTimeout(() => setPhase(8), 15000),
      setTimeout(() => setPhase(9), 17500),
      setTimeout(() => setPhase(10), 20000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase >= 2 && videoRef1.current) {
      videoRef1.current.play().catch(() => {});
    }
    if (phase >= 7 && videoRef2.current) {
      videoRef2.current.play().catch(() => {});
    }
  }, [phase]);

  return (
    <motion.div
      className="absolute inset-0 z-10"
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      exit={{ clipPath: 'inset(0 0 0 100%)' }}
      transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="absolute top-[4vh] left-[4vw] z-20">
        <motion.div
          className="flex items-center gap-[1vw] mb-[1vh]"
          initial={{ opacity: 0, x: -40 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-[2.5vw] h-[2.5vw] rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#ef4444] flex items-center justify-center">
            <svg className="w-[1.3vw] h-[1.3vw]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <h2 className="text-[2.8vw] font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Enterprise Mode
          </h2>
        </motion.div>
        <motion.div
          className="h-[3px] bg-gradient-to-r from-[#F59E0B] to-transparent rounded-full"
          initial={{ width: 0 }}
          animate={phase >= 1 ? { width: '20vw' } : { width: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        />
        <motion.p
          className="text-[1.1vw] text-slate-400 mt-[1vh] max-w-[30vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.3 }}
        >
          Upload datasets &middot; Scan for PII, bias &amp; toxic content &middot; Apply ML-driven fixes &middot; Download sanitized data
        </motion.p>
      </div>

      <motion.div
        className="absolute right-[4vw] top-[14vh] w-[55vw] rounded-xl overflow-hidden border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
        initial={{ opacity: 0, y: 60, rotateY: 15, scale: 0.9 }}
        animate={phase >= 2 ? (phase >= 6 ? { opacity: 0, scale: 0.85, x: -80 } : { opacity: 1, y: 0, rotateY: -3, scale: 1 }) : { opacity: 0, y: 60, rotateY: 15, scale: 0.9 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        <video
          ref={videoRef1}
          src={`${import.meta.env.BASE_URL}clips/enterprise_analysis.mp4`}
          muted
          playsInline
          className="w-full h-auto"
        />
      </motion.div>

      <motion.div
        className="absolute left-[5vw] top-[32vh] flex flex-col gap-[1.2vh] z-20"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? (phase >= 6 ? { opacity: 0 } : { opacity: 1 }) : { opacity: 0 }}
      >
        {[
          { label: 'PII Detected', value: '913', color: '#ef4444', severity: 'HIGH' },
          { label: 'Duplicates Found', value: '167', color: '#F59E0B', severity: 'LOW' },
          { label: 'Toxic Content', value: '2', color: '#ef4444', severity: 'HIGH' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="flex items-center gap-[0.8vw] px-[1vw] py-[0.6vh] rounded-lg border border-white/10 bg-[#0a0e1a]/90 backdrop-blur-sm"
            initial={{ opacity: 0, x: -30 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ delay: i * 0.15, type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ backgroundColor: stat.color }} />
            <span className="text-[1vw] text-white font-bold">{stat.value}</span>
            <span className="text-[0.85vw] text-slate-400">{stat.label}</span>
            <span className="text-[0.6vw] px-[0.3vw] py-[0.15vh] rounded text-white font-bold" style={{ backgroundColor: stat.color }}>
              {stat.severity}
            </span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="absolute left-[5vw] bottom-[22vh] z-20"
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? (phase >= 6 ? { opacity: 0 } : { opacity: 1 }) : { opacity: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="px-[1vw] py-[0.8vh] rounded-lg border border-[#06B6D4]/30 bg-[#0a0e1a]/90 backdrop-blur-sm">
          <p className="text-[0.75vw] text-[#06B6D4] mb-[0.3vh] font-semibold">ML Pipeline Recommendation</p>
          <code className="text-[0.65vw] text-slate-300 font-mono">
            pipeline.add_step(PIIMaskingTransformer(fields=['text']))
          </code>
        </div>
      </motion.div>

      <motion.div
        className="absolute left-[5vw] bottom-[12vh] z-20"
        initial={{ opacity: 0 }}
        animate={phase >= 5 ? (phase >= 6 ? { opacity: 0 } : { opacity: 1 }) : { opacity: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="px-[1vw] py-[0.8vh] rounded-lg border border-[#10B981]/30 bg-[#0a0e1a]/90 backdrop-blur-sm">
          <p className="text-[0.75vw] text-[#10B981] mb-[0.3vh] font-semibold">ML Feedback Suggestion</p>
          <code className="text-[0.65vw] text-slate-300 font-mono">
            model.retrain(exclude=['pii_columns'], feedback=True)
          </code>
        </div>
      </motion.div>

      <motion.div
        className="absolute right-[4vw] top-[16vh] w-[58vw] rounded-xl overflow-hidden border border-[#10B981]/30 shadow-[0_20px_80px_rgba(16,185,129,0.15)]"
        initial={{ opacity: 0, y: 100, scale: 0.85 }}
        animate={phase >= 7 ? { opacity: 1, y: 0, scale: 1, rotateY: -3, rotateX: 2 } : { opacity: 0, y: 100, scale: 0.85 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        <video
          ref={videoRef2}
          src={`${import.meta.env.BASE_URL}clips/enterprise_fixes.mp4`}
          muted
          playsInline
          className="w-full h-auto"
        />
      </motion.div>

      <motion.div
        className="absolute left-[5vw] bottom-[6vh] flex gap-[1.8vw] z-20"
        initial={{ opacity: 0 }}
        animate={phase >= 8 ? { opacity: 1 } : { opacity: 0 }}
      >
        {[
          { label: 'Rows Removed', value: '168', color: '#ef4444' },
          { label: 'Fields Redacted', value: '751', color: '#F59E0B' },
          { label: 'Forget Score', value: '91%', color: '#10B981' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="flex flex-col items-center px-[1.2vw] py-[0.8vh] rounded-xl border border-white/10 bg-[#0a0e1a]/90 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={phase >= 8 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
            transition={{ delay: i * 0.12, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span className="text-[1.8vw] font-bold" style={{ color: stat.color }}>{stat.value}</span>
            <span className="text-[0.7vw] text-slate-400">{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="absolute right-[5vw] bottom-[6vh] z-20"
        initial={{ opacity: 0 }}
        animate={phase >= 9 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.8vh] rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 backdrop-blur-sm">
          <svg className="w-[1.2vw] h-[1.2vw]" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="text-[0.9vw] text-[#10B981] font-semibold">Download Sanitized Dataset</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
