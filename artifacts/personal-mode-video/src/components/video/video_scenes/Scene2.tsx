import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Search, ShieldAlert, FileText, Mail, MessageSquare } from 'lucide-react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const items = [
    { icon: FileText, label: "DOCUMENTS", delay: 0 },
    { icon: Mail, label: "EMAILS", delay: 0.1 },
    { icon: MessageSquare, label: "SOCIAL POSTS", delay: 0.2 },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center p-20"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-1/2 pr-10">
        <motion.div
          className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/20 flex items-center justify-center mb-8 border border-[var(--color-accent)]/50"
          initial={{ scale: 0, rotate: -90 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -90 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Search className="w-8 h-8 text-[var(--color-accent)]" />
        </motion.div>
        
        <h2 className="text-[4vw] font-display font-bold leading-tight mb-4 text-white">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            SCAN YOUR
          </motion.span>
          <br/>
          <motion.span 
            className="text-[var(--color-accent)]"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            DIGITAL FOOTPRINT
          </motion.span>
        </h2>
      </div>

      <div className="w-1/2 flex flex-col gap-6 relative">
        {/* Scanner Line */}
        {phase >= 3 && (
          <motion.div 
            className="absolute -inset-x-10 h-[2px] bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] z-20"
            initial={{ top: "-10%" }}
            animate={{ top: "110%" }}
            transition={{ duration: 2, ease: "linear", repeat: Infinity }}
          />
        )}

        {items.map((item, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-6 bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: phase >= 2 ? item.delay : 0 }}
          >
            <item.icon className="w-8 h-8 text-white/50" />
            <div className="flex-1">
              <div className="font-mono text-[1.2vw] tracking-widest text-white/80">{item.label}</div>
              <div className="w-full bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
                <motion.div 
                  className="h-full bg-[var(--color-accent)]"
                  initial={{ width: "0%" }}
                  animate={phase >= 3 ? { width: ["0%", "100%"] } : { width: "0%" }}
                  transition={{ duration: 1.5, delay: item.delay, ease: "easeOut" }}
                />
              </div>
            </div>
            
            {phase >= 3 && (
              <motion.div 
                className="absolute right-6 flex items-center text-red-400 font-mono text-sm gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: item.delay + 1.2 }}
              >
                <ShieldAlert className="w-4 h-4" />
                RISK DETECTED
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
