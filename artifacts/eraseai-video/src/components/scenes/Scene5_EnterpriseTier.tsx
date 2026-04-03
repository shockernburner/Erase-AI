import { motion } from 'framer-motion';
import { Infinity as InfinityIcon, ShieldAlert, Lock, Clock, Settings, Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene5_EnterpriseTier() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1300),
      setTimeout(() => setPhase(4), 1800),
      setTimeout(() => setPhase(5), 2300),
      setTimeout(() => setPhase(6), 2800),
      setTimeout(() => setPhase(7), 6000), // Key message reveal
      setTimeout(() => setPhase(8), 13500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const features = [
    { icon: InfinityIcon, text: "Unlimited rows & API keys" },
    { icon: Settings, text: "Custom analysis rules" },
    { icon: Lock, text: "SSO integration" },
    { icon: Clock, text: "SLA support" },
    { icon: ShieldAlert, text: "Custom data retention" }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-20 px-[5vw]"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.5, filter: 'blur(30px)' }}
      transition={{ duration: 1.5, ease: easings.easeOut.ease }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.1)_0%,transparent_70%)] pointer-events-none" />

      {phase < 7 ? (
        <div className="flex w-full h-full items-center justify-between px-[5vw]">
          <div className="flex-1 flex flex-col justify-center">
            {phase >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: easings.easeOut.ease }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <Building2 className="w-12 h-12 text-[#FFD700]" />
                  <h2 className="text-[2.2vw] font-mono text-[#FFD700] uppercase tracking-widest">Enterprise / Gov</h2>
                </div>
                <div className="text-[6.5vw] font-display font-bold text-white leading-none mb-4" style={{ textShadow: '0 0 40px rgba(255, 215, 0, 0.3)' }}>
                  Custom
                </div>
                <p className="text-[2.5vw] font-display text-white/90">Unlimited Power</p>
              </motion.div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center gap-4 pl-12">
            {features.map((feat, i) => (
              phase >= i + 2 && (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: easings.easeOut.ease }}
                  className="flex items-center gap-6 bg-[#FFD700]/5 p-5 rounded-2xl border border-[#FFD700]/20"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                    <feat.icon className="w-6 h-6 text-[#FFD700]" />
                  </div>
                  <span className="text-[1.8vw] font-display text-white/90">{feat.text}</span>
                </motion.div>
              )
            ))}
          </div>
        </div>
      ) : (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: easings.easeOut.ease, delay: 0.5 }}
            className="text-center max-w-[80vw]"
          >
            <h2 className="text-[4.5vw] font-display font-black text-white leading-tight mb-8">
              Enterprise or Government?
            </h2>
            <motion.p 
              className="text-[3vw] font-display text-[#FFD700] italic"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 2 }}
            >
              We build new APIs for your needs.
            </motion.p>
          </motion.div>
        </motion.div>
      )}

    </motion.div>
  );
}