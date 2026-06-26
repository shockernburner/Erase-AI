import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { sceneTransitions } from "@/lib/video/animations";

export function TheAsk() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-black/60"
      {...sceneTransitions.perspectiveFlip}>
      
      <div className="text-center relative z-10">
        <motion.p className="text-[2vw] text-cyan-400 font-mono tracking-widest uppercase mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}>
          SEED ROUND / 种子轮融资
        </motion.p>
        
        <motion.h1 className="text-[8vw] font-black text-white leading-none mb-12 drop-shadow-[0_0_30px_rgba(6,182,212,0.6)]"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}>
          $2,500,000
        </motion.h1>

        <div className="flex justify-center gap-12 text-[1.8vw] text-gray-200">
          {[
            { text: "加速研发", phase: 3 },
            { text: "扩大企业销售团队", phase: 4 },
            { text: "获取初始企业客户", phase: 4 }
          ].map((item, i) => (
            <motion.div key={i} className="flex items-center gap-4 bg-cyan-950/30 px-6 py-3 rounded-full border border-cyan-500/30 backdrop-blur-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={phase >= item.phase ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}>
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              {item.text}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
