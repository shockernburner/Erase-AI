import { motion } from 'framer-motion';
import { ShieldCheck, Activity, Eye, ArrowRightLeft, User, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene6_PersonalMode() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // Title + Intro
      setTimeout(() => setPhase(2), 1500),  // Text scanning block appears
      setTimeout(() => setPhase(3), 3000),  // Badges appear + Gauge starts filling
      setTimeout(() => setPhase(4), 5000),  // Trend chart + rewrite arrow
      setTimeout(() => setPhase(5), 6500),  // Cleaned text appears
      setTimeout(() => setPhase(6), 8500),  // Final protection message
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const riskScore = 85; // Low risk, safe
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-20 px-[5vw]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -100, filter: 'blur(20px)' }}
      transition={{ duration: 1.2, ease: easings.easeOut.ease }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(16,185,129,0.08)_0%,transparent_60%)] pointer-events-none" />

      {/* Header */}
      {phase >= 1 && (
        <motion.div 
          className="absolute top-[10vh] left-[5vw] flex items-center gap-4"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: easings.easeOut.ease }}
        >
          <div className="w-12 h-12 rounded-full bg-[#10B981]/20 flex items-center justify-center border border-[#10B981]/30">
            <User className="w-6 h-6 text-[#10B981]" />
          </div>
          <div>
            <h2 className="text-[2vw] font-mono text-[#10B981] uppercase tracking-widest leading-none mb-1">Personal Mode</h2>
            <p className="text-[1.2vw] text-white/60 font-display">Individual Privacy Protection</p>
          </div>
        </motion.div>
      )}

      <div className="w-full flex items-center justify-center gap-12 mt-12">
        {/* Left Side: Scanning & Rewriting */}
        <div className="flex-1 flex flex-col gap-6">
          {phase >= 2 && (
            <motion.div
              className="bg-black/40 border border-white/10 rounded-2xl p-6 relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-3 mb-4 text-[#06B6D4]">
                <Eye className="w-5 h-5" />
                <span className="font-mono text-[1vw] uppercase tracking-wider">Original Draft</span>
              </div>
              <p className="text-[1.5vw] text-white/80 font-display leading-relaxed">
                Just finished dealing with that <span className="bg-red-500/20 text-red-300 px-2 rounded">horrible client</span> at <span className="bg-orange-500/20 text-orange-300 px-2 rounded">123 Main St</span>. What a complete disaster of a meeting.
              </p>
              
              {/* Scanning effect */}
              {phase === 2 && (
                <motion.div 
                  className="absolute top-0 bottom-0 w-[4px] bg-[#06B6D4] shadow-[0_0_20px_#06B6D4]"
                  initial={{ left: "0%" }}
                  animate={{ left: "100%" }}
                  transition={{ duration: 1.5, ease: "linear" }}
                />
              )}
            </motion.div>
          )}

          {phase >= 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center"
            >
              <ArrowRightLeft className="w-8 h-8 text-[#10B981]" />
            </motion.div>
          )}

          {phase >= 5 && (
            <motion.div
              className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl p-6 relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-4 text-[#10B981]">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-mono text-[1vw] uppercase tracking-wider">AI Rewritten (Safe)</span>
              </div>
              <p className="text-[1.5vw] text-white font-display leading-relaxed">
                Just finished a challenging meeting today. Looking forward to moving on to the next project.
              </p>
            </motion.div>
          )}
        </div>

        {/* Right Side: Analytics & Gauge */}
        <div className="flex-1 flex flex-col gap-8 items-center">
          {phase >= 3 && (
            <motion.div 
              className="relative w-64 h-64 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, type: "spring" }}
            >
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  className="stroke-white/10"
                  strokeWidth="12"
                  fill="none"
                />
                <motion.circle
                  cx="128"
                  cy="128"
                  r={radius}
                  className="stroke-[#10B981]"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - (circumference * riskScore) / 100 }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <motion.span 
                  className="text-[3.5vw] font-black text-white font-display leading-none"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                >
                  {riskScore}
                </motion.span>
                <span className="text-[1vw] font-mono text-[#10B981] uppercase tracking-widest mt-2">Safety Score</span>
              </div>
            </motion.div>
          )}

          {phase >= 3 && (
            <motion.div 
              className="flex flex-wrap justify-center gap-3 w-full max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {[
                { label: 'TOXICITY', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                { label: 'PII DETECTED', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                { label: 'HATE SPEECH', color: 'bg-zinc-800 text-zinc-500 border-zinc-700' },
                { label: 'BIAS', color: 'bg-zinc-800 text-zinc-500 border-zinc-700' }
              ].map((badge, i) => (
                <motion.div
                  key={i}
                  className={`px-4 py-2 rounded-full border text-[0.9vw] font-mono tracking-wider ${badge.color}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + (i * 0.1), type: "spring" }}
                >
                  {badge.label}
                </motion.div>
              ))}
            </motion.div>
          )}

          {phase >= 4 && (
            <motion.div 
              className="w-full max-w-md bg-black/30 border border-white/5 rounded-xl p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#06B6D4]" />
                  <span className="text-[1vw] font-display text-white/70">30-Day Trend</span>
                </div>
                <span className="text-[#10B981] text-[0.9vw] font-mono">+12% Safer</span>
              </div>
              <div className="h-16 flex items-end justify-between gap-2">
                {[40, 55, 45, 70, 60, 85].map((h, i) => (
                  <motion.div 
                    key={i}
                    className="w-full bg-gradient-to-t from-[#06B6D4]/20 to-[#06B6D4] rounded-t-sm"
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.5 + (i * 0.1), duration: 0.8, type: "spring" }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {phase >= 6 && (
        <motion.div 
          className="absolute bottom-[10vh] left-0 right-0 flex justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-[#10B981]/20 border border-[#10B981]/40 px-8 py-4 rounded-full flex items-center gap-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <ShieldAlert className="w-6 h-6 text-[#10B981]" />
            <span className="text-[1.5vw] font-display text-white">Continuous monitoring. Zero surprises.</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
