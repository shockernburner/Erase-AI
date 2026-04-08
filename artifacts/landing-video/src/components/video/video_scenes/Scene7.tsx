import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Shield, Zap, AlertOctagon } from 'lucide-react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 3000), // Threat approaches
      setTimeout(() => setPhase(3), 4000), // BLOCKED
      setTimeout(() => setPhase(4), 6000), // Stats reveal
      setTimeout(() => setPhase(5), 9000), // Platforms reveal
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      {...sceneTransitions.clipCircle}
    >
      {/* Dynamic Background */}
      <motion.div 
        className="absolute inset-0"
        animate={{ 
          background: phase >= 3 
            ? 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.15) 0%, transparent 60%)' 
            : 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.1) 0%, transparent 60%)'
        }}
        transition={{ duration: 1 }}
      />

      {/* Hero Shield (EraseAI Firewall) */}
      <motion.div 
        className="relative z-30"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, delay: 0.2 }}
      >
        <div className="w-[15vw] h-[15vw] rounded-full border-4 border-[#06B6D4]/30 flex items-center justify-center bg-[#0a0e1a] shadow-[0_0_80px_rgba(6,182,212,0.2)] relative">
          
          <Shield className={`w-[8vw] h-[8vw] transition-colors duration-500 ${phase >= 3 ? 'text-[#06B6D4] fill-[#06B6D4]/20' : 'text-white/50'}`} />
          
          {/* Active Firewall Rings */}
          {phase >= 1 && (
            <>
              <motion.div className="absolute inset-0 rounded-full border-2 border-[#06B6D4]/50" animate={{ scale: [1, 1.5], opacity: [0.8, 0] }} transition={{ duration: 2, repeat: Infinity }} />
              <motion.div className="absolute inset-0 rounded-full border-2 border-[#06B6D4]/30" animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
            </>
          )}

          {/* Block Impact Effect */}
          {phase === 3 && (
            <motion.div 
              className="absolute inset-0 rounded-full bg-[#06B6D4]"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          )}
        </div>
      </motion.div>

      {/* Malicious Prompt Attacking */}
      {phase >= 2 && phase < 3 && (
        <motion.div 
          className="absolute top-[20%] right-[10%] bg-red-950 border border-red-500 p-4 rounded-lg flex items-center gap-3 z-20"
          initial={{ x: '50vw', y: '-20vh', scale: 0.5, opacity: 0 }}
          animate={{ x: '10vw', y: '-5vh', scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeIn' }}
        >
          <AlertOctagon className="w-6 h-6 text-red-500" />
          <span className="font-mono text-red-200">System prompt injection payload...</span>
        </motion.div>
      )}

      {/* BLOCKED Text */}
      {phase >= 3 && phase < 5 && (
        <motion.div 
          className="absolute top-[25%] right-[25%] font-black text-[4vw] text-transparent tracking-widest z-40"
          style={{ WebkitTextStroke: '2px #06B6D4' }}
          initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
          animate={{ scale: 1.2, opacity: [1, 1, 0], rotate: -15 }}
          transition={{ duration: 1.5 }}
        >
          BLOCKED
        </motion.div>
      )}

      {/* Stats Reveal */}
      {phase >= 4 && (
        <div className="absolute bottom-[25vh] w-full px-[15vw] flex justify-between z-20">
          {[
            { label: 'Prompt Injection', val: '99%' },
            { label: 'Jailbreak Attempts', val: '95%' },
            { label: 'Data Exfiltration', val: '87%' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
            >
              <div className="text-[3.5vw] font-display font-bold text-white">{stat.val}</div>
              <div className="text-[1vw] font-mono text-[#06B6D4] uppercase tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Platforms Protected */}
      {phase >= 5 && (
        <motion.div 
          className="absolute bottom-[8vh] flex items-center gap-6 text-[1.5vw] text-white/60 font-display"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span>Securing connections to:</span>
          <span className="text-white bg-white/10 px-4 py-2 rounded-lg border border-white/20">ChatGPT</span>
          <span className="text-white bg-white/10 px-4 py-2 rounded-lg border border-white/20">Claude</span>
          <span className="text-white bg-white/10 px-4 py-2 rounded-lg border border-white/20">Gemini</span>
        </motion.div>
      )}
    </motion.div>
  );
}