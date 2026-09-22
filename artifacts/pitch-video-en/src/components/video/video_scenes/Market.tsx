import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { sceneTransitions } from "@/lib/video/animations";

export function Market() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center bg-black/60 px-24 font-body"
      {...sceneTransitions.clipPolygon}>
      
      <div className="w-full relative z-10">
        <motion.h2 className="text-[4vw] font-bold text-white mb-16 text-center font-display"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}>
          Massive Market Opportunity
        </motion.h2>

        <div className="flex justify-center gap-16">
          <motion.div className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.8, type: "spring" }}>
            <div className="w-64 h-64 rounded-full border-4 border-cyan-500 flex flex-col items-center justify-center bg-cyan-900/20 backdrop-blur-md">
              <span className="text-[3.5vw] font-mono font-bold text-cyan-400">$93.75B</span>
              <span className="text-[1.2vw] text-cyan-100 font-mono">2030 (24.4% CAGR)</span>
            </div>
            <p className="mt-6 text-[2vw] text-white font-medium">AI Cybersecurity Market</p>
          </motion.div>

          <motion.div className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.8, type: "spring" }}>
            <div className="w-64 h-64 rounded-full border-4 border-blue-500 flex flex-col items-center justify-center bg-blue-900/20 backdrop-blur-md">
              <span className="text-[3.5vw] font-mono font-bold text-blue-400">$9.33B</span>
              <span className="text-[1.2vw] text-blue-100 font-mono">2030</span>
            </div>
            <p className="mt-6 text-[2vw] text-white font-medium">DLP Market</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}