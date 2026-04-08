import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Search, AlertTriangle, Eye } from 'lucide-react';
import { sceneTransitions, easings } from '@/lib/video/animations';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5000),
      setTimeout(() => setPhase(5), 7000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const riskScore = 72;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10 px-[6vw]"
      {...sceneTransitions.clipPolygon}
    >
      {/* Header */}
      <motion.div
        className="absolute top-[8vh] left-[6vw] flex items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="w-12 h-12 rounded-xl bg-[#06B6D4]/20 flex items-center justify-center border border-[#06B6D4]/40">
          <Search className="w-6 h-6 text-[#06B6D4]" />
        </div>
        <h2 className="text-[2.5vw] font-display font-bold text-white tracking-wide">Real-time Scanning</h2>
      </motion.div>

      <div className="w-full flex gap-12 mt-[10vh]">
        {/* Left Column: Text Analysis */}
        <div className="flex-[1.5] flex flex-col gap-6">
          <motion.div
            className="bg-[#111827] border border-white/10 rounded-2xl p-8 relative overflow-hidden"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: easings.easeOut.ease }}
          >
            <div className="flex items-center gap-3 mb-6 text-[#06B6D4]">
              <Eye className="w-5 h-5" />
              <span className="font-mono text-[1vw] uppercase tracking-wider">Analyzing Prompt</span>
            </div>
            
            <p className="text-[1.6vw] text-white/80 font-display leading-relaxed">
              Generate a summary of the incident involving <span className={`transition-colors duration-500 rounded px-2 ${phase >= 2 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : ''}`}>Jane Doe (SSN: 123-45-678)</span> at <span className={`transition-colors duration-500 rounded px-2 ${phase >= 3 ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : ''}`}>Acme Corp</span>. Make sure to include her <span className={`transition-colors duration-500 rounded px-2 ${phase >= 2 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : ''}`}>medical diagnosis details</span>.
            </p>

            {/* Scanner Line */}
            {phase >= 1 && (
              <motion.div
                className="absolute top-0 bottom-0 w-1 bg-[#06B6D4] shadow-[0_0_30px_#06B6D4]"
                initial={{ left: "0%" }}
                animate={{ left: "100%" }}
                transition={{ duration: 3, ease: "linear" }}
              />
            )}
          </motion.div>

          {/* Tags */}
          <div className="flex gap-4">
            <motion.div
              className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-full font-mono text-[0.9vw] flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> PII DETECTED
            </motion.div>
            <motion.div
              className="bg-orange-500/10 border border-orange-500/30 text-orange-400 px-4 py-2 rounded-full font-mono text-[0.9vw] flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            >
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" /> ENTITY RISK
            </motion.div>
          </div>
        </div>

        {/* Right Column: Score & Breakdown */}
        <div className="flex-1 flex flex-col items-center gap-8">
          {/* Risk Score Gauge */}
          <motion.div
            className="relative w-[15vw] h-[15vw] flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="50%" cy="50%" r={radius} className="stroke-white/5" strokeWidth="12" fill="none" />
              <motion.circle
                cx="50%" cy="50%" r={radius}
                className="stroke-[#ef4444]"
                strokeWidth="12" fill="none" strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={phase >= 4 ? { strokeDashoffset: circumference - (circumference * riskScore) / 100 } : { strokeDashoffset: circumference }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <motion.span 
                className="text-[4vw] font-black text-white font-display leading-none"
                initial={{ opacity: 0 }}
                animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 1 }}
              >
                {riskScore}
              </motion.span>
              <span className="text-[1vw] font-mono text-red-400 mt-2 uppercase tracking-widest">Risk Score</span>
            </div>
          </motion.div>

          {/* Breakdown Bars */}
          <motion.div 
            className="w-full flex flex-col gap-4"
            initial={{ opacity: 0 }}
            animate={phase >= 5 ? { opacity: 1 } : { opacity: 0 }}
          >
            {[
              { label: 'PII / Secrets', value: 95, color: '#ef4444' },
              { label: 'Legal / Compliance', value: 70, color: '#f59e0b' },
              { label: 'Toxicity / Bias', value: 15, color: '#10b981' }
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-[0.9vw] font-mono text-white/60 w-[30%]">{stat.label}</span>
                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: stat.color }}
                    initial={{ width: 0 }}
                    animate={phase >= 5 ? { width: `${stat.value}%` } : { width: 0 }}
                    transition={{ duration: 1, delay: i * 0.2 + 0.5 }}
                  />
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}