import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { sceneTransitions } from "@/lib/video/animations";

export function Hook() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 px-24"
      {...sceneTransitions.clipCircle}>
      
      <div className="text-center relative z-10 w-full">
        <motion.p className="text-[1.5vw] text-red-500 font-mono mb-4 tracking-widest uppercase"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}>
          CRITICAL ALERT / 严重警告
        </motion.p>
        
        <motion.h1 className="text-[6vw] font-black text-white leading-tight mb-8"
          initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
          animate={phase >= 2 ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.9, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: "easeOut" }}>
          企业机密正在<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">流入 AI 模型</span>
        </motion.h1>

        <motion.p className="text-[2vw] text-gray-300 font-light"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}>
          合规性危机已经爆发
        </motion.p>
      </div>
    </motion.div>
  );
}
