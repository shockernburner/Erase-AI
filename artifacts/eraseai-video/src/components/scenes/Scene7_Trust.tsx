import { motion } from 'framer-motion';
import { Award, GraduationCap, Globe, ShieldCheck, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene7_Trust() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 5000),
      setTimeout(() => setPhase(5), 7500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20 px-[8vw]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(15px)' }}
      transition={{ duration: 1.2, ease: easings.easeOut.ease }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,215,0,0.06)_0%,transparent_60%)] pointer-events-none" />

      {phase >= 1 && (
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easings.easeOut.ease }}
        >
          <h2 className="text-[2.8vw] font-display font-bold text-white leading-tight">Built on Trust & Expertise</h2>
          <p className="text-[1.2vw] text-white/50 font-mono mt-2">Certified AI Governance. Real-World Experience.</p>
        </motion.div>
      )}

      <div className="w-full flex items-center justify-center gap-12">
        {phase >= 2 && (
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, type: "spring" }}
          >
            <motion.div
              className="w-48 h-48 rounded-full border-4 border-[#FFD700]/40 flex items-center justify-center relative"
              animate={{
                boxShadow: [
                  '0 0 0px rgba(255,215,0,0.2)',
                  '0 0 40px rgba(255,215,0,0.4)',
                  '0 0 0px rgba(255,215,0,0.2)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 flex items-center justify-center border border-[#FFD700]/30">
                <Award className="w-20 h-20 text-[#FFD700]" />
              </div>

              <motion.div
                className="absolute -top-2 -right-2 bg-[#10B981]/20 border border-[#10B981]/40 rounded-full p-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <ShieldCheck className="w-6 h-6 text-[#10B981]" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {phase >= 3 && (
          <motion.div
            className="flex flex-col gap-5 max-w-lg"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="bg-black/40 border border-[#FFD700]/20 rounded-2xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-[#FFD700]" />
                </div>
                <div>
                  <h3 className="text-[1.3vw] font-display font-bold text-white mb-1">Ethical AI Governance</h3>
                  <p className="text-[1vw] text-white/60 font-display">Professional Certificate</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="px-3 py-1 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-full">
                      <span className="text-[0.8vw] font-mono text-[#FFD700]">Humber College</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {phase >= 4 && (
              <motion.div
                className="bg-black/40 border border-red-600/20 rounded-2xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-600/30 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-[1.3vw] font-display font-bold text-white mb-1">Government of Canada</h3>
                    <p className="text-[1vw] text-white/60 font-display">Program arranged and endorsed by the Government of Canada</p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-red-600/10 border border-red-600/30 rounded-full">
                        <Globe className="w-3 h-3 text-red-400" />
                        <span className="text-[0.8vw] font-mono text-red-400">Canada</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      {phase >= 5 && (
        <motion.div
          className="absolute bottom-[8vh] flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-6">
            {[
              { label: 'AI Ethics', icon: ShieldCheck },
              { label: 'Data Privacy', icon: ShieldCheck },
              { label: 'Bias Mitigation', icon: ShieldCheck },
              { label: 'Responsible AI', icon: ShieldCheck },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
              >
                <item.icon className="w-4 h-4 text-[#FFD700]" />
                <span className="text-[0.9vw] font-display text-white/60">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
