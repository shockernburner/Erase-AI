import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { AlertCircle, Send, Network } from 'lucide-react';
import { sceneTransitions, easings } from '@/lib/video/animations';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10 overflow-hidden"
      {...sceneTransitions.clipPolygon}
    >
      {/* Background Grid */}
      <div className="absolute inset-0" 
        style={{ 
          backgroundImage: 'linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)',
          backgroundSize: '4vw 4vw'
        }} 
      />

      <div className="w-[60vw] max-w-[1200px] absolute z-20 top-1/2 -translate-y-1/2">
        <div className="flex justify-between items-center w-full relative">
          
          {/* Send Button/Input Area */}
          <motion.div
            className="w-[20vw] bg-[#111827] border border-[#06B6D4]/30 rounded-xl p-4 flex flex-col gap-4 relative z-30"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: easings.easeOut.ease }}
          >
            <div className="h-2 w-full bg-white/10 rounded"></div>
            <div className="h-2 w-3/4 bg-white/10 rounded"></div>
            <div className="h-2 w-1/2 bg-red-500/40 rounded"></div>
            <div className="flex justify-end mt-2">
              <div className="w-8 h-8 rounded-lg bg-[#06B6D4] flex items-center justify-center">
                <Send className="w-4 h-4 text-[#0a0e1a]" />
              </div>
            </div>
            
            {phase >= 1 && (
              <motion.div
                className="absolute inset-0 border-2 border-red-500 rounded-xl"
                animate={{ opacity: [0, 1, 0], scale: [1, 1.05, 1.1] }}
                transition={{ duration: 1, repeat: 2 }}
              />
            )}
          </motion.div>

          {/* AI Model Cloud */}
          <motion.div
            className="w-[20vw] h-[20vw] rounded-full border-2 border-white/10 flex flex-col items-center justify-center relative z-30 bg-[#0a0e1a]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Network className="w-12 h-12 text-white/30" />
            <span className="text-[1vw] text-white/50 mt-2 font-mono uppercase">External AI</span>
            
            <motion.div
              className="absolute inset-0 border-2 border-red-500/50 rounded-full border-dashed"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
          
          {/* Data Packets Flying */}
          {phase >= 2 && (
            <div className="absolute left-[20vw] right-[20vw] h-10 top-1/2 -translate-y-1/2 z-20">
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="absolute w-[4vw] h-8 bg-red-500/20 border border-red-500/50 rounded flex items-center justify-center"
                  initial={{ left: "0%", opacity: 0, scale: 0.5 }}
                  animate={{ left: "100%", opacity: [0, 1, 0], scale: 1 }}
                  transition={{ 
                    duration: 1.5, 
                    delay: i * 0.3,
                    ease: "linear",
                    repeat: Infinity 
                  }}
                >
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Overlay Warning */}
      {phase >= 3 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-red-900/10 backdrop-blur-sm z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="bg-[#0a0e1a] border border-red-500/50 px-8 py-6 rounded-2xl flex items-center gap-6 shadow-[0_0_100px_rgba(239,68,68,0.2)]">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <h2 className="text-[3vw] font-display font-bold text-white uppercase tracking-wider">Control Lost</h2>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}