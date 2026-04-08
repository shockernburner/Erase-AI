import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene9() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#0a0e1a]"
      {...sceneTransitions.clipCircle}
    >
      {/* Subtle Glow Behind Logo */}
      <motion.div 
        className="absolute w-[40vw] h-[40vw] bg-[#06B6D4]/20 rounded-full blur-[100px]"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2 }}
      />

      <motion.div
        className="flex flex-col items-center gap-8 relative z-20"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-[5vw] h-[5vw] bg-[#06B6D4] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.4)]">
            <Shield className="w-[2.5vw] h-[2.5vw] text-[#0a0e1a] fill-current" />
          </div>
          <span className="text-[4vw] font-display font-bold text-white tracking-tight">EraseAI</span>
        </div>

        <motion.h1 
          className="text-[2.5vw] font-display text-white/90 font-light mt-4 text-center max-w-[60vw]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
        >
          Make AI forget what it should never learn.
        </motion.h1>

        <motion.div
          className="mt-12 px-8 py-3 rounded-full border border-white/20 bg-white/5 text-[1.2vw] font-mono text-white/60 tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.5 }}
        >
          ERASEAI.AI
        </motion.div>
      </motion.div>
    </motion.div>
  );
}