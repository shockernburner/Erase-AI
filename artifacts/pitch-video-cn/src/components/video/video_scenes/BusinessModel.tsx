import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { sceneTransitions } from "@/lib/video/animations";

export function BusinessModel() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e1a]/70 px-24"
      {...sceneTransitions.pushLeft}>
      
      <motion.h2 className="text-[4vw] font-bold text-white mb-16 relative z-10"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}>
        成熟的 SaaS 商业模式
      </motion.h2>

      <div className="flex justify-center items-end gap-6 w-full relative z-10">
        {[
          { tier: "Free", price: "$0", desc: "个人开发者", height: "h-48", phase: 1, color: "border-gray-600 bg-gray-800/50 text-gray-300" },
          { tier: "Starter", price: "$5/mo", desc: "小型团队", height: "h-64", phase: 2, color: "border-cyan-700 bg-cyan-900/40 text-cyan-200" },
          { tier: "Pro", price: "$20/mo", desc: "专业企业", height: "h-80", phase: 3, color: "border-cyan-500 bg-cyan-800/60 text-cyan-300" },
          { tier: "Enterprise", price: "定制", desc: "私有化部署", height: "h-96", phase: 4, color: "border-blue-400 bg-blue-900/80 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)]" }
        ].map((item) => (
          <motion.div key={item.tier}
            className={`w-1/4 rounded-t-xl border-t border-l border-r p-6 flex flex-col justify-between ${item.height} ${item.color} backdrop-blur-md`}
            initial={{ height: 0, opacity: 0 }}
            animate={phase >= item.phase ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}>
            <div>
              <h3 className="text-[1.8vw] font-bold mb-2">{item.tier}</h3>
              <p className="text-[1.2vw] opacity-80">{item.desc}</p>
            </div>
            <div className="text-[2.5vw] font-mono font-bold mt-4">{item.price}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
