import { motion } from 'framer-motion';
import { Database, Users, Webhook, BarChart, HeartHandshake } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene4_BusinessTier() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1100),
      setTimeout(() => setPhase(4), 1500),
      setTimeout(() => setPhase(5), 1900),
      setTimeout(() => setPhase(6), 2300),
      setTimeout(() => setPhase(7), 10500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const features = [
    { icon: Database, text: "Up to 10,000 rows" },
    { icon: Users, text: "20 API keys" },
    { icon: Webhook, text: "Webhook integrations" },
    { icon: BarChart, text: "Advanced analytics dashboard" },
    { icon: HeartHandshake, text: "Dedicated account manager" }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-20 px-[10vw]"
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
      transition={{ duration: 1.2, ease: easings.easeOut.ease }}
    >
      <div className="flex w-full h-full items-center justify-between">
        
        <div className="flex-1 flex flex-col justify-center">
          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, rotateX: 90 }}
              animate={{ opacity: 1, rotateX: 0 }}
              transition={{ duration: 1, ease: easings.easeOut.ease }}
            >
              <h2 className="text-[2vw] font-mono text-warning uppercase tracking-widest mb-2">Business Tier</h2>
              <div className="text-[7.5vw] font-display font-bold text-white leading-none mb-4" style={{ textShadow: '0 0 40px rgba(245, 158, 11, 0.4)' }}>
                $149<span className="text-[3vw] text-white/50">/mo</span>
              </div>
              <p className="text-[2.5vw] font-display text-white/90">Scale Your Team</p>
            </motion.div>
          )}

          {phase >= 2 && (
            <motion.div 
              className="mt-8 flex gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="h-2 w-16 bg-warning rounded-full animate-pulse" />
              <div className="h-2 w-16 bg-warning/50 rounded-full animate-pulse delay-75" />
              <div className="h-2 w-16 bg-warning/30 rounded-full animate-pulse delay-150" />
            </motion.div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center gap-4 pl-12 relative z-10">
          {features.map((feat, i) => (
            phase >= i + 2 && (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                className="flex items-center gap-6 bg-warning/10 p-5 rounded-2xl border border-warning/20 backdrop-blur-sm"
              >
                <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <feat.icon className="w-6 h-6 text-warning" />
                </div>
                <span className="text-[1.8vw] font-display text-white/90">{feat.text}</span>
              </motion.div>
            )
          ))}
        </div>

      </div>

      <motion.div 
        className="absolute left-1/4 top-1/4 w-[50vw] h-[50vw] bg-warning/10 blur-[120px] rounded-full pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3], x: [0, 50, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}