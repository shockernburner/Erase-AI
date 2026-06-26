import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { sceneTransitions } from "@/lib/video/animations";

export function Problem() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col justify-center bg-black/50 px-24"
      {...sceneTransitions.pushUp}>
      
      <motion.div className="text-center w-full mb-16 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}>
        <h2 className="text-[5vw] font-bold text-white mb-4">无管理的 AI 交互</h2>
        <p className="text-[2vw] text-gray-400">敏感数据正在失去控制</p>
      </motion.div>

      <div className="flex justify-center items-center gap-12 w-full relative z-10">
        {[
          { text: "源代码", delay: 2, icon: "</>" },
          { text: "客户 PII", delay: 3, icon: "👤" },
          { text: "财务数据", delay: 4, icon: "💰" }
        ].map((item, i) => (
          <motion.div key={i}
            className="flex flex-col items-center justify-center w-64 h-64 border-2 border-red-500/40 rounded-full bg-red-950/30 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={phase >= item.delay ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}>
            <span className="text-[3vw] mb-4 text-red-400">{item.icon}</span>
            <span className="text-[1.5vw] text-white font-medium">{item.text}</span>
          </motion.div>
        ))}
      </div>
      
      {phase >= 4 && (
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[4px] bg-red-500 z-0"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1 }}
        />
      )}
    </motion.div>
  );
}
