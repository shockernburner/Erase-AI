import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRightLeft, Sparkles, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene3_AIRewriting() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5000),
      setTimeout(() => setPhase(5), 7000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20 px-[8vw]"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 1, ease: easings.easeInOut.ease }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(16,185,129,0.08)_0%,transparent_60%)] pointer-events-none" />

      {phase >= 1 && (
        <motion.div
          className="absolute top-[8vh] left-[5vw] flex items-center gap-4"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: easings.easeOut.ease }}
        >
          <div className="w-10 h-10 rounded-full bg-[#10B981]/20 flex items-center justify-center border border-[#10B981]/30">
            <Sparkles className="w-5 h-5 text-[#10B981]" />
          </div>
          <div>
            <h2 className="text-[2.2vw] font-display font-bold text-white leading-none">AI-Powered Rewriting</h2>
            <p className="text-[1.1vw] text-white/50 font-mono mt-1">Transform Risky Content Instantly</p>
          </div>
        </motion.div>
      )}

      <div className="w-full flex items-center gap-8 mt-8">
        <div className="flex-1 flex flex-col gap-4">
          {phase >= 2 && (
            <motion.div
              className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-3 mb-4 text-red-400">
                <Eye className="w-5 h-5" />
                <span className="font-mono text-[0.9vw] uppercase tracking-wider">Original — High Risk</span>
              </div>
              <p className="text-[1.3vw] text-white/80 font-display leading-relaxed">
                Just finished dealing with that <span className="bg-red-500/30 text-red-300 px-1 rounded">horrible client</span> at <span className="bg-orange-500/30 text-orange-300 px-1 rounded">123 Main St</span>. What a complete <span className="bg-red-500/30 text-red-300 px-1 rounded">disaster</span> of a meeting. Their team is <span className="bg-yellow-500/30 text-yellow-300 px-1 rounded">utterly clueless</span>.
              </p>
              <div className="absolute top-3 right-3 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                <span className="text-[0.7vw] font-mono text-red-400">RISK: 78%</span>
              </div>
            </motion.div>
          )}

          {phase >= 3 && (
            <motion.div
              className="flex justify-center py-2"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-full bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center"
                  animate={{ boxShadow: ['0 0 0px rgba(16,185,129,0.3)', '0 0 20px rgba(16,185,129,0.5)', '0 0 0px rgba(16,185,129,0.3)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ArrowRightLeft className="w-5 h-5 text-[#10B981]" />
                </motion.div>
                <span className="text-[1vw] font-mono text-[#10B981] uppercase tracking-wider">AI Processing</span>
              </div>
            </motion.div>
          )}

          {phase >= 4 && (
            <motion.div
              className="bg-[#10B981]/5 border border-[#10B981]/30 rounded-2xl p-6 relative overflow-hidden"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-4 text-[#10B981]">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-mono text-[0.9vw] uppercase tracking-wider">Rewritten — Safe</span>
              </div>
              <p className="text-[1.3vw] text-white font-display leading-relaxed">
                Just finished a challenging meeting today. Looking forward to improving our collaboration and moving on to the next project milestone.
              </p>
              <div className="absolute top-3 right-3 px-3 py-1 bg-[#10B981]/20 border border-[#10B981]/30 rounded-full">
                <span className="text-[0.7vw] font-mono text-[#10B981]">RISK: 5%</span>
              </div>
            </motion.div>
          )}
        </div>

        {phase >= 4 && (
          <motion.div
            className="w-[20vw] flex flex-col gap-4"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {[
              { label: 'Tone', before: 'Hostile', after: 'Professional', color: '#10B981' },
              { label: 'PII', before: 'Exposed', after: 'Removed', color: '#06B6D4' },
              { label: 'Legal', before: 'At Risk', after: 'Clear', color: '#8b5cf6' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="bg-black/30 border border-white/10 rounded-xl p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.15 }}
              >
                <div className="text-[0.8vw] font-mono text-white/40 uppercase mb-2">{item.label}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.9vw] text-red-400 line-through">{item.before}</span>
                  <span className="text-[0.8vw] text-white/30">→</span>
                  <span className="text-[0.9vw] font-semibold" style={{ color: item.color }}>{item.after}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {phase >= 5 && (
        <motion.div
          className="absolute bottom-[8vh] flex items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Sparkles className="w-5 h-5 text-[#10B981]" />
          <span className="text-[1.3vw] font-display text-white/80">One click to transform risky content into professional communication</span>
        </motion.div>
      )}
    </motion.div>
  );
}
