import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowRight, Wand2, ShieldCheck } from 'lucide-react';
import { sceneTransitions, easings } from '@/lib/video/animations';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 4000),
      setTimeout(() => setPhase(4), 5500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-[5vw]"
      {...sceneTransitions.clipPolygon}
    >
      <motion.h2 
        className="absolute top-[8vh] text-[2.5vw] font-display font-bold text-white tracking-wide flex items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Wand2 className="w-8 h-8 text-[#06B6D4]" />
        Intelligent Rewriting
      </motion.h2>

      <div className="flex items-center justify-between w-full gap-8 mt-12">
        
        {/* Left: Original (Risky) Text */}
        <motion.div 
          className="flex-1 bg-red-950/20 border border-red-500/20 rounded-2xl p-8 relative"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-[1vw] font-mono text-red-400 mb-4 uppercase tracking-wider">Original Input</div>
          <div className="text-[1.4vw] leading-relaxed text-white/80">
            Summarize the meeting with <span className="bg-red-500/20 text-red-300 px-1 rounded">Elon Musk</span> regarding the <span className="bg-red-500/20 text-red-300 px-1 rounded">Project Alpha acquisition</span>. My auth token is <span className="bg-red-500/20 text-red-300 px-1 rounded">ey12345...</span>
          </div>
          
          {phase >= 2 && (
            <motion.div 
              className="absolute inset-0 bg-[#06B6D4]/10"
              initial={{ left: 0, width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.5, ease: 'linear' }}
            />
          )}
        </motion.div>

        {/* Center: Transformation Arrow */}
        <motion.div 
          className="w-[8vw] flex flex-col items-center justify-center gap-2"
          initial={{ opacity: 0, scale: 0 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ type: 'spring', bounce: 0.5 }}
        >
          <div className="w-[4vw] h-[4vw] rounded-full bg-[#06B6D4]/20 border border-[#06B6D4]/50 flex items-center justify-center relative">
            <ArrowRight className="w-[2vw] h-[2vw] text-[#06B6D4]" />
            {phase >= 2 && phase < 4 && (
              <motion.div 
                className="absolute inset-0 border-2 border-[#06B6D4] rounded-full border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </div>
        </motion.div>

        {/* Right: Sanitized Text */}
        <motion.div 
          className="flex-1 bg-[#10b981]/10 border border-[#10b981]/30 rounded-2xl p-8"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-[1vw] font-mono text-[#10b981] uppercase tracking-wider">Sanitized Output</div>
            {phase >= 4 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                <ShieldCheck className="w-6 h-6 text-[#10b981]" />
              </motion.div>
            )}
          </div>
          <div className="text-[1.4vw] leading-relaxed text-white">
            Summarize the meeting with <span className="bg-[#10b981]/20 text-[#10b981] px-2 rounded border border-[#10b981]/30">[PERSON_1]</span> regarding the <span className="bg-[#10b981]/20 text-[#10b981] px-2 rounded border border-[#10b981]/30">[CONFIDENTIAL_PROJECT]</span>. My auth token is <span className="bg-[#10b981]/20 text-[#10b981] px-2 rounded border border-[#10b981]/30">[REDACTED_CREDENTIAL]</span>
          </div>
        </motion.div>

      </div>
      
      {/* Bottom Tagline */}
      {phase >= 4 && (
        <motion.div 
          className="absolute bottom-[10vh] text-[1.4vw] font-display text-white/60 bg-white/5 px-6 py-3 rounded-full border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Meaning preserved. Risk eliminated.
        </motion.div>
      )}
    </motion.div>
  );
}