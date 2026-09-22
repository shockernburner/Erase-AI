import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { sceneTransitions } from "@/lib/video/animations";

export function Close() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e1a] px-24 font-body"
      {...sceneTransitions.fadeBlur}>
      
      <motion.div className="relative z-10 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.8, ease: "easeOut" }}>
        
        <h1 className="text-[8vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 font-display">EraseAI</h1>
        <p className="text-[2.2vw] text-cyan-100 font-light tracking-wide mb-12">Next-generation Enterprise AI Data Firewall</p>

        <motion.div className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}>
          <p className="text-[2.5vw] text-white font-mono">eraseai.ai</p>
          <p className="text-[1.8vw] text-gray-400 font-mono">director@vantward.com</p>
        </motion.div>

        <motion.p className="text-[1vw] text-gray-600 mt-16"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}>
          © {new Date().getFullYear()} Vantward Solutions. All rights reserved.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}