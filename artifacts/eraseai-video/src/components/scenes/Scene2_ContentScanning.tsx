import { motion } from 'framer-motion';
import { Search, AlertTriangle, Eye, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene2_ContentScanning() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 4000),
      setTimeout(() => setPhase(5), 5500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const riskScore = 72;
  const radius = 55;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-20 px-[8vw]"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, filter: 'blur(15px)' }}
      transition={{ duration: 1.2, ease: easings.easeInOut.ease }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(6,182,212,0.08)_0%,transparent_60%)] pointer-events-none" />

      {phase >= 1 && (
        <motion.div
          className="absolute top-[8vh] left-[5vw] flex items-center gap-4"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: easings.easeOut.ease }}
        >
          <div className="w-10 h-10 rounded-full bg-[#06B6D4]/20 flex items-center justify-center border border-[#06B6D4]/30">
            <Search className="w-5 h-5 text-[#06B6D4]" />
          </div>
          <div>
            <h2 className="text-[2.2vw] font-display font-bold text-white leading-none">Content Scanning</h2>
            <p className="text-[1.1vw] text-white/50 font-mono mt-1">AI-Powered Risk Detection</p>
          </div>
        </motion.div>
      )}

      <div className="w-full flex items-center justify-between gap-12 mt-8">
        <div className="flex-1 flex flex-col gap-5">
          {phase >= 2 && (
            <motion.div
              className="bg-black/40 border border-white/10 rounded-2xl p-6 relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-3 mb-4 text-[#06B6D4]">
                <Eye className="w-5 h-5" />
                <span className="font-mono text-[1vw] uppercase tracking-wider">Analyzing Content</span>
              </div>
              <p className="text-[1.4vw] text-white/80 font-display leading-relaxed">
                Had a terrible experience with <span className="bg-red-500/20 text-red-300 px-2 rounded">that awful company</span> at <span className="bg-orange-500/20 text-orange-300 px-2 rounded">123 Corporate Ave</span>. Their <span className="bg-yellow-500/20 text-yellow-300 px-2 rounded">CEO John Smith</span> is completely incompetent.
              </p>

              {phase === 2 && (
                <motion.div
                  className="absolute top-0 bottom-0 w-[3px] bg-[#06B6D4] shadow-[0_0_20px_#06B6D4]"
                  initial={{ left: "0%" }}
                  animate={{ left: "100%" }}
                  transition={{ duration: 1.3, ease: "linear" }}
                />
              )}
            </motion.div>
          )}

          {phase >= 3 && (
            <motion.div
              className="flex flex-wrap gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[
                { label: 'TOXICITY', color: 'bg-red-500/20 text-red-400 border-red-500/30', active: true },
                { label: 'PII DETECTED', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', active: true },
                { label: 'DEFAMATION', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', active: true },
                { label: 'BIAS', color: 'bg-zinc-800 text-zinc-500 border-zinc-700', active: false },
                { label: 'HATE SPEECH', color: 'bg-zinc-800 text-zinc-500 border-zinc-700', active: false },
              ].map((badge, i) => (
                <motion.div
                  key={i}
                  className={`px-4 py-2 rounded-full border text-[0.85vw] font-mono tracking-wider ${badge.color}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                >
                  {badge.active && <span className="inline-block w-2 h-2 rounded-full bg-current mr-2 animate-pulse" />}
                  {badge.label}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center gap-6">
          {phase >= 4 && (
            <motion.div
              className="relative w-48 h-48 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, type: "spring" }}
            >
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r={radius} className="stroke-white/10" strokeWidth="10" fill="none" />
                <motion.circle
                  cx="96" cy="96" r={radius}
                  className="stroke-[#f59e0b]"
                  strokeWidth="10" fill="none" strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - (circumference * riskScore) / 100 }}
                  transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <motion.span
                  className="text-[3vw] font-black text-white font-display leading-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {riskScore}
                </motion.span>
                <span className="text-[0.9vw] font-mono text-[#f59e0b] uppercase tracking-widest mt-1">Risk Score</span>
              </div>
            </motion.div>
          )}

          {phase >= 5 && (
            <motion.div
              className="flex flex-col gap-3 w-full max-w-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {[
                { label: 'Toxicity', value: 85, color: '#ef4444' },
                { label: 'PII Exposure', value: 60, color: '#f59e0b' },
                { label: 'Legal Risk', value: 45, color: '#eab308' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[0.85vw] font-mono text-white/60 w-24">{item.label}</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.15, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-[0.8vw] font-mono" style={{ color: item.color }}>{item.value}%</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {phase >= 5 && (
        <motion.div
          className="absolute bottom-[8vh] flex items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
          <span className="text-[1.3vw] font-display text-white/80">Instant multi-category risk analysis across 10+ dimensions</span>
        </motion.div>
      )}
    </motion.div>
  );
}
