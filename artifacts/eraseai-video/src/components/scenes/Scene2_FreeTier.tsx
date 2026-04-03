import { motion } from 'framer-motion';
import { Database, Search, Eraser, History } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene2_FreeTier() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2200),
      setTimeout(() => setPhase(5), 2800),
      setTimeout(() => setPhase(6), 8500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const features = [
    { icon: Database, text: "Up to 100 rows per dataset" },
    { icon: Search, text: "Basic analysis — PII & bias detection" },
    { icon: Eraser, text: "Data erasure & redaction" },
    { icon: History, text: "Version history" }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-20 px-[10vw]"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0 }}
      transition={{ duration: 1.2, ease: easings.easeInOut.ease }}
    >
      <div className="flex w-full h-full items-center justify-between">
        
        {/* Left: Title & Pricing */}
        <div className="flex-1 flex flex-col justify-center">
          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: easings.easeOut.ease }}
            >
              <h2 className="text-[2vw] font-mono text-success uppercase tracking-widest mb-2">Free Tier</h2>
              <div className="text-[6vw] font-display font-bold text-white leading-none mb-4">
                $0<span className="text-[3vw] text-white/50">/mo</span>
              </div>
              <p className="text-[2vw] font-display text-white/80">Start Exploring</p>
            </motion.div>
          )}
        </div>

        {/* Right: Features */}
        <div className="flex-1 flex flex-col justify-center gap-6 pl-12">
          {features.map((feat, i) => (
            phase >= i + 2 && (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, ease: easings.easeOut.ease }}
                className="flex items-center gap-6 bg-white/5 p-6 rounded-2xl border border-white/10"
              >
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center border border-success/30">
                  <feat.icon className="w-6 h-6 text-success" />
                </div>
                <span className="text-[1.8vw] font-display text-white/90">{feat.text}</span>
              </motion.div>
            )
          ))}
        </div>

      </div>

      {/* Decorative midground */}
      <motion.div 
        className="absolute right-0 top-0 w-1/2 h-full bg-success/5 blur-3xl rounded-full"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
    </motion.div>
  );
}