import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Activity } from 'lucide-react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-between p-20"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: "blur(20px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[45%] flex flex-col gap-8">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-[3.5vw] font-display font-bold leading-tight text-white mb-4">
            AI-POWERED <br/>
            <span className="text-[var(--color-accent)]">REWRITING</span>
          </h2>
          <p className="text-[1.5vw] text-white/60 font-body">
            Remove training risks while preserving your original meaning.
          </p>
        </motion.div>

        {/* UI Mockup Card */}
        <motion.div 
          className="bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          initial={{ opacity: 0, y: 50 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="p-6 bg-white/[0.02] border-b border-white/5 relative">
            <div className="font-mono text-red-400 text-sm mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              ORIGINAL (HIGH RISK)
            </div>
            <p className="text-white/80 line-through decoration-red-500/50">My private email is john.doe@personal.com and my phone number is 555-0192.</p>
          </div>
          
          <div className="p-6 relative">
            <div className="font-mono text-green-400 text-sm mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              SANITIZED (SAFE)
            </div>
            <motion.p 
              className="text-white font-medium"
              initial={{ opacity: 0 }}
              animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              [Email redacted] and [Phone redacted].
            </motion.p>
            
            {phase >= 3 && (
              <motion.div 
                className="absolute inset-0 bg-green-500/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1 }}
              />
            )}
          </div>
        </motion.div>
      </div>

      <div className="w-[45%] flex flex-col gap-6">
        <motion.div 
          className="p-8 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 relative overflow-hidden"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
        >
          <Activity className="w-8 h-8 text-[var(--color-accent)] mb-4" />
          <h3 className="text-[1.8vw] font-display font-bold text-white mb-2">Trend Analysis</h3>
          <p className="text-white/60">30-day rolling averages & alerts</p>
          
          {/* Mock chart line */}
          <svg className="absolute bottom-0 left-0 w-full h-32 opacity-30" preserveAspectRatio="none" viewBox="0 0 100 100">
            <motion.path 
              d="M0,100 L20,80 L40,90 L60,40 L80,50 L100,20" 
              fill="none" 
              stroke="var(--color-accent)" 
              strokeWidth="4"
              initial={{ pathLength: 0 }}
              animate={phase >= 3 ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </svg>
        </motion.div>

        <motion.div 
          className="p-8 rounded-2xl border border-warning/30 bg-warning/5"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.4 }}
        >
          <h3 className="text-[1.8vw] font-display font-bold text-white mb-2">Instant Alerts</h3>
          <p className="text-white/60 mb-6">Get notified when risk spikes.</p>
          <div className="bg-[#020617] rounded-lg p-4 border border-white/10 flex items-center justify-between">
            <span className="font-mono text-sm">Risk spike detected</span>
            <ArrowRight className="w-4 h-4 text-white/50" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
