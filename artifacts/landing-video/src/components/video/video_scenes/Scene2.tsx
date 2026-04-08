import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { sceneTransitions, easings } from '@/lib/video/animations';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 0),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3500)
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      {...sceneTransitions.clipCircle}
    >
      {/* Fast Logo Entrance */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e1a] z-30"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase >= 2 ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="flex items-center gap-4"
        >
          <div className="w-[6vw] h-[6vw] bg-[#06B6D4] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.4)]">
            <Shield className="w-[3vw] h-[3vw] text-[#0a0e1a] fill-current" />
          </div>
          <span className="text-[5vw] font-display font-bold text-white tracking-tight">EraseAI</span>
        </motion.div>
      </motion.div>

      {/* UI Prompt Cut */}
      <div className="w-[60vw] max-w-[1200px] absolute z-20">
        <motion.div
          className="bg-[#111827] rounded-xl border border-white/10 shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={phase >= 2 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.6, ease: easings.easeOut.ease }}
        >
          <div className="bg-[#1f2937] px-4 py-3 flex gap-2 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          
          <div className="p-8 flex flex-col gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="bg-[#1f2937] rounded-2xl p-4 text-[1.2vw] text-white/80 max-w-[80%]">
                How can I help you today?
              </div>
            </div>
            
            <div className="flex gap-4 flex-row-reverse">
              <div className="w-10 h-10 rounded-full bg-[#06B6D4]/20 flex items-center justify-center shrink-0">
                <div className="w-5 h-5 bg-[#06B6D4] rounded-full"></div>
              </div>
              <div className="bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded-2xl p-4 text-[1.2vw] text-white flex gap-1 relative overflow-hidden max-w-[80%]">
                <span className="opacity-70">Analyze this customer list: </span>
                <span className="text-red-400 font-mono">
                  {phase >= 3 ? "user: admin, pass: secr3t99" : ""}
                </span>
                {phase >= 3 && (
                  <motion.div 
                    className="w-2 h-[1.5vw] bg-white inline-block ml-1"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}