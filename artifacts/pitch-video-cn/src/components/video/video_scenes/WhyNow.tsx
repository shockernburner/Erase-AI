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
    <motion.div className="absolute inset-0 flex items-center bg-black/60 px-24"
      {...sceneTransitions.wipe}>
      
      <div className="w-1/2 relative z-10">
        <motion.h2 className="text-[4.5vw] font-bold text-white leading-tight mb-12"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8 }}>
          为什么是现在？
        </motion.h2>
        
        <div className="space-y-8">
          <motion.div 
            className="p-6 border border-cyan-500/30 bg-cyan-900/20 backdrop-blur-md rounded-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 100 }}>
            <h3 className="text-cyan-400 font-mono text-[1.5vw] mb-2">EU AI Act (2025年8月生效)</h3>
            <p className="text-white text-[2vw]">通用人工智能 (GPAI) 合规已成强制要求</p>
          </motion.div>

          <motion.div 
            className="p-6 border border-red-500/30 bg-red-900/20 backdrop-blur-md rounded-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 100 }}>
            <h3 className="text-red-400 font-mono text-[1.5vw] mb-2">$4.88M</h3>
            <p className="text-white text-[2vw]">2024年数据泄露平均成本 (同比上升10%)</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
