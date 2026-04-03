import { motion } from 'framer-motion';
import { ShieldX } from 'lucide-react';
import { easings } from '@/lib/video/animations';

export function Scene6_Outro() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: easings.easeOut.ease }}
    >
      <div className="absolute inset-0 bg-primary/5 blur-[150px]" />
      
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 0.5, ease: easings.easeOut.ease }}
        className="flex items-center gap-6 mb-8"
      >
        <div className="bg-primary/20 p-4 rounded-2xl border border-primary/30">
          <ShieldX className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-[6vw] font-display font-black text-white tracking-tight">
          EraseAI
        </h1>
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 1.2, ease: easings.easeOut.ease }}
      >
        <p className="text-[2vw] font-mono text-primary/80 uppercase tracking-[0.2em] text-center mb-8">
          AI Data Governance Layer
        </p>
      </motion.div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, delay: 2, type: "spring" }}
      >
        <div className="px-8 py-3 rounded-full bg-white/10 border border-white/20 text-[1.5vw] font-display text-white/90">
          eraseai.com
        </div>
      </motion.div>
    </motion.div>
  );
}
