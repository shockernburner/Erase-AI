import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Shield, Lock, Layers } from 'lucide-react';
import { sceneTransitions, easings } from '@/lib/video/animations';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500)
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      {...sceneTransitions.clipCircle}
    >
      <div className="absolute inset-0 bg-[#0a0e1a]" />
      
      {/* The Governance Layer Graphic */}
      <div className="relative w-full h-full flex items-center justify-center px-[10vw]">
        
        {/* Left Side: Users */}
        <motion.div
          className="flex-1 flex flex-col items-center gap-4 z-20"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-[12vw] h-[8vw] bg-white/5 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-2">
            <Layers className="w-[2vw] h-[2vw] text-white/50" />
            <span className="text-[1vw] text-white/50 font-mono">Enterprise Users</span>
          </div>
        </motion.div>

        {/* Center: EraseAI Governance Layer */}
        <motion.div
          className="w-[25vw] h-[40vw] max-h-[80vh] flex items-center justify-center z-30 relative"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: easings.easeOut.ease, delay: 0.3 }}
        >
          {/* Main Shield Pillar */}
          <div className="absolute inset-y-0 w-[8vw] bg-gradient-to-b from-[#06B6D4]/10 via-[#06B6D4]/40 to-[#06B6D4]/10 border-x border-[#06B6D4]/50 rounded-full shadow-[0_0_60px_rgba(6,182,212,0.3)] flex items-center justify-center overflow-hidden">
            
            {phase >= 1 && (
              <motion.div 
                className="absolute inset-x-0 h-1 bg-white shadow-[0_0_20px_white]"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
            )}
            
            <div className="w-[6vw] h-[6vw] bg-[#0a0e1a] rounded-full border-2 border-[#06B6D4] flex items-center justify-center z-10 shadow-[0_0_30px_#06B6D4]">
              <Shield className="w-[3vw] h-[3vw] text-[#06B6D4] fill-current" />
            </div>
          </div>
          
          <motion.div 
            className="absolute top-[10%] text-[1.5vw] font-display font-bold text-white whitespace-nowrap bg-[#0a0e1a] px-4 py-2 rounded-lg border border-[#06B6D4]/30"
            initial={{ opacity: 0, y: -20 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          >
            AI Data Governance Layer
          </motion.div>
        </motion.div>

        {/* Right Side: AI Models */}
        <motion.div
          className="flex-1 flex flex-col items-center gap-4 z-20"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="w-[12vw] h-[8vw] bg-indigo-900/20 rounded-xl border border-indigo-500/30 flex flex-col items-center justify-center gap-2">
            <Lock className="w-[2vw] h-[2vw] text-indigo-400" />
            <span className="text-[1vw] text-indigo-400 font-mono">LLM Providers</span>
          </div>
        </motion.div>

        {/* Connection Lines */}
        {phase >= 3 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <motion.path 
              d="M 30vw 50vh L 45vw 50vh" 
              stroke="rgba(6, 182, 212, 0.5)" 
              strokeWidth="4"
              strokeDasharray="8 8"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
            <motion.path 
              d="M 55vw 50vh L 70vw 50vh" 
              stroke="rgba(99, 102, 241, 0.5)" 
              strokeWidth="4"
              strokeDasharray="8 8"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </svg>
        )}
      </div>
    </motion.div>
  );
}