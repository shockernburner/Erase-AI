import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';
import { Shield } from 'lucide-react';

export function Scene1() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      {...sceneTransitions.clipCircle}
    >
      <motion.div 
        className="flex items-center gap-4 text-white/20"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        <Shield className="w-12 h-12 text-[#06B6D4]/30" />
        <span className="text-[2vw] font-display tracking-widest uppercase">EraseAI</span>
      </motion.div>
      
      {/* Subtle pulsing rings for ambient animation */}
      <motion.div
        className="absolute w-[20vw] h-[20vw] rounded-full border border-[#06B6D4]/10"
        animate={{ scale: [1, 2], opacity: [0.5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="absolute w-[20vw] h-[20vw] rounded-full border border-[#06B6D4]/10"
        animate={{ scale: [1, 2], opacity: [0.5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: 2 }}
      />
    </motion.div>
  );
}