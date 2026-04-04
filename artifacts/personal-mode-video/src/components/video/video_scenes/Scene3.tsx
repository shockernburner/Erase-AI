import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const categories = [
    { name: "PII EXPOSURE", score: 85, color: "var(--color-error)" },
    { name: "TOXICITY", score: 42, color: "var(--color-warning)" },
    { name: "BIAS", score: 15, color: "var(--color-success)" },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-12"
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -100 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div 
        className="text-[2vw] font-mono text-[var(--color-accent)] tracking-widest mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        REAL-TIME PRIVACY RISK SCORE
      </motion.div>

      {/* Circular Gauge */}
      <div className="relative w-[30vw] h-[30vw] flex items-center justify-center mb-12">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle 
            cx="50%" cy="50%" r="45%" 
            fill="none" 
            stroke="rgba(255,255,255,0.05)" 
            strokeWidth="20" 
          />
          {phase >= 2 && (
            <motion.circle 
              cx="50%" cy="50%" r="45%" 
              fill="none" 
              stroke="var(--color-error)" 
              strokeWidth="20"
              strokeDasharray="283%" /* 2 * pi * 45 */
              initial={{ strokeDashoffset: "283%" }}
              animate={{ strokeDashoffset: "60%" }} /* High risk */
              transition={{ duration: 2, ease: "easeOut" }}
              strokeLinecap="round"
            />
          )}
        </svg>

        <div className="text-center">
          <motion.div 
            className="text-[8vw] font-display font-black leading-none text-red-500"
            initial={{ opacity: 0, scale: 0 }}
            animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.5 }}
          >
            38
          </motion.div>
          <motion.div 
            className="text-[1.5vw] font-bold text-red-500 mt-2 tracking-widest"
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 1 }}
          >
            HIGH RISK
          </motion.div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-8 w-full max-w-5xl">
        {categories.map((cat, i) => (
          <motion.div 
            key={i}
            className="flex-1 bg-[#0F172A]/80 backdrop-blur-md border border-white/10 p-6 rounded-2xl"
            initial={{ opacity: 0, y: 50 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: phase >= 3 ? i * 0.1 : 0 }}
          >
            <div className="font-mono text-white/60 mb-4">{cat.name}</div>
            <div className="flex items-end justify-between">
              <div className="text-[2.5vw] font-display font-bold leading-none" style={{ color: cat.color }}>
                {cat.score}
              </div>
              <svg width="40" height="20" viewBox="0 0 40 20" className="opacity-50">
                <path d={`M0,20 Q10,${20 - cat.score/5} 20,${20 - cat.score/5} T40,10`} fill="none" stroke={cat.color} strokeWidth="2" />
              </svg>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
