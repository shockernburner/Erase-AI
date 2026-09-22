import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { sceneTransitions } from "@/lib/video/animations";

export function Solution() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-[#0a0e1a]/80 font-body"
      {...sceneTransitions.morphExpand}>
      
      <div className="w-full max-w-6xl relative z-10 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-16">
          <h1 className="text-[7vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 font-display">EraseAI</h1>
          <p className="text-[2vw] text-cyan-100 font-light tracking-wide">Enterprise-grade AI data firewall by Vantward</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-8">
          {[
            { phase: 2, num: "01", title: "Discover", desc: "Automatically identifies PII in AI prompts", color: "text-cyan-300", bg: "border-cyan-500/30 bg-cyan-900/20" },
            { phase: 3, num: "02", title: "Classify", desc: "Real-time sensitivity labeling", color: "text-blue-300", bg: "border-blue-500/30 bg-blue-900/20" },
            { phase: 4, num: "03", title: "Erase", desc: "Redacts data before it leaves your network", color: "text-indigo-300", bg: "border-indigo-500/30 bg-indigo-900/20" }
          ].map((item) => (
            <motion.div key={item.num}
              className={`p-8 rounded-2xl border backdrop-blur-md text-left ${item.bg}`}
              initial={{ opacity: 0, y: 40 }}
              animate={phase >= item.phase ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}>
              <span className={`font-mono text-[2vw] font-bold ${item.color} mb-4 block`}>{item.num}</span>
              <h3 className="text-[2.5vw] font-bold text-white mb-4 font-display">{item.title}</h3>
              <p className="text-[1.3vw] text-gray-300">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}