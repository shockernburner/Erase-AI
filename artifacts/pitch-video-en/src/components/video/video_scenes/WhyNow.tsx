import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { sceneTransitions } from "@/lib/video/animations";

export function WhyNow() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center bg-black/60 px-24 font-body"
      {...sceneTransitions.wipe}>
      
      <div className="w-1/2 relative z-10">
        <motion.h2 className="text-[4.5vw] font-bold text-white leading-tight mb-12 font-display"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8 }}>
          Why Now?
        </motion.h2>
        
        <div className="space-y-8">
          <motion.div 
            className="p-6 border border-cyan-500/30 bg-cyan-900/20 backdrop-blur-md rounded-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 100 }}>
            <h3 className="text-cyan-400 font-mono text-[1.5vw] mb-2">EU AI Act (Effective Aug 2025)</h3>
            <p className="text-white text-[2vw]">GPAI compliance is now mandatory.</p>
          </motion.div>

          <motion.div 
            className="p-6 border border-red-500/30 bg-red-900/20 backdrop-blur-md rounded-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 100 }}>
            <h3 className="text-red-400 font-mono text-[1.5vw] mb-2">$4.88M</h3>
            <p className="text-white text-[2vw]">Average cost of a data breach (Up 10% YoY)</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}