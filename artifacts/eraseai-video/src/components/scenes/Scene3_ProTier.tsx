import { motion } from 'framer-motion';
import { Database, Code, ShieldCheck, Key, HeadphonesIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene3_ProTier() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1300),
      setTimeout(() => setPhase(4), 1800),
      setTimeout(() => setPhase(5), 2300),
      setTimeout(() => setPhase(6), 2800),
      setTimeout(() => setPhase(7), 8500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const features = [
    { icon: Database, text: "Up to 1,000 rows" },
    { icon: Code, text: "ML Pipeline Feedback" },
    { icon: ShieldCheck, text: "Advanced PII detection" },
    { icon: Key, text: "API Access (5 keys)" },
    { icon: HeadphonesIcon, text: "Priority support" }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-20 px-[10vw]"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 1, ease: easings.easeInOut.ease }}
    >
      <div className="flex w-full h-full items-center justify-between">
        
        <div className="flex-1 flex flex-col justify-center">
          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <h2 className="text-[2vw] font-mono text-primary uppercase tracking-widest mb-2">Pro Tier</h2>
              <div className="text-[7vw] font-display font-bold text-white leading-none mb-4 glow-text">
                $49<span className="text-[3vw] text-white/50">/mo</span>
              </div>
              <p className="text-[2.2vw] font-display text-white/90">For Developers</p>
            </motion.div>
          )}
          
          {phase >= 2 && (
            <motion.div 
              className="mt-8 p-6 bg-black/60 border border-primary/30 rounded-xl font-mono text-[1.2vw] text-primary/70"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <code>
                <span className="text-white/40">import</span> &#123; EraseClient &#125; <span className="text-white/40">from</span> '@eraseai/sdk';<br/><br/>
                <span className="text-white/40">const</span> client = <span className="text-white/40">new</span> EraseClient(API_KEY);<br/>
                <span className="text-white/40">await</span> client.sanitize(dataset);
              </code>
            </motion.div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center gap-5 pl-12">
          {features.map((feat, i) => (
            phase >= i + 2 && (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="flex items-center gap-6 bg-primary/10 p-5 rounded-2xl border border-primary/20"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  <feat.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-[1.8vw] font-display text-white/90">{feat.text}</span>
              </motion.div>
            )
          ))}
        </div>

      </div>

      {/* Decorative midground */}
      <motion.div 
        className="absolute right-1/4 top-1/4 w-[40vw] h-[40vw] bg-primary/10 blur-[100px] rounded-full pointer-events-none"
        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </motion.div>
  );
}