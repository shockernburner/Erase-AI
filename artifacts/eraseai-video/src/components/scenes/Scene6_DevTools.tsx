import { motion } from 'framer-motion';
import { Code, Database, Key, Webhook, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene6_DevTools() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5500),
      setTimeout(() => setPhase(5), 7500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20 px-[8vw]"
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      exit={{ opacity: 0, filter: 'blur(15px)' }}
      transition={{ duration: 1, ease: easings.easeInOut.ease }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(139,92,246,0.08)_0%,transparent_60%)] pointer-events-none" />

      {phase >= 1 && (
        <motion.div
          className="absolute top-[8vh] left-[5vw] flex items-center gap-4"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: easings.easeOut.ease }}
        >
          <div className="w-10 h-10 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center border border-[#8b5cf6]/30">
            <Code className="w-5 h-5 text-[#8b5cf6]" />
          </div>
          <div>
            <h2 className="text-[2.2vw] font-display font-bold text-white leading-none">Developer API & Dataset Tools</h2>
            <p className="text-[1.1vw] text-white/50 font-mono mt-1">Integrate AI Governance Into Your Pipeline</p>
          </div>
        </motion.div>
      )}

      <div className="w-full flex items-center gap-10 mt-8">
        <div className="flex-[1.3] flex flex-col gap-5">
          {phase >= 2 && (
            <motion.div
              className="bg-black/60 border border-[#8b5cf6]/20 rounded-2xl p-6 font-mono text-[1vw] relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-2 mb-4 text-[#8b5cf6]">
                <Terminal className="w-4 h-4" />
                <span className="text-[0.8vw] uppercase tracking-wider">eraseai-sdk</span>
              </div>
              <div className="space-y-1.5 text-[0.95vw] leading-relaxed">
                <div><span className="text-[#8b5cf6]">import</span> <span className="text-white/70">{'{'} EraseClient {'}'}</span> <span className="text-[#8b5cf6]">from</span> <span className="text-[#10B981]">'@eraseai/sdk'</span>;</div>
                <div>&nbsp;</div>
                <div><span className="text-[#8b5cf6]">const</span> <span className="text-white/90">client</span> = <span className="text-[#8b5cf6]">new</span> <span className="text-[#06B6D4]">EraseClient</span>(API_KEY);</div>
                <div>&nbsp;</div>
                <div className="text-white/40">{'// Scan content for risks'}</div>
                <div><span className="text-[#8b5cf6]">const</span> <span className="text-white/90">report</span> = <span className="text-[#8b5cf6]">await</span> client.<span className="text-[#06B6D4]">analyze</span>(content);</div>
                <div>&nbsp;</div>
                <div className="text-white/40">{'// Sanitize datasets at scale'}</div>
                <div><span className="text-[#8b5cf6]">const</span> <span className="text-white/90">clean</span> = <span className="text-[#8b5cf6]">await</span> client.<span className="text-[#06B6D4]">sanitize</span>(dataset);</div>
              </div>

              {phase === 2 && (
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.5, ease: "linear" }}
                />
              )}
            </motion.div>
          )}

          {phase >= 3 && (
            <motion.div
              className="bg-black/40 border border-white/10 rounded-xl p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-3 text-white/60">
                <Database className="w-4 h-4" />
                <span className="text-[0.9vw] font-mono uppercase tracking-wider">Dataset Sanitization</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-[0.8vw] font-mono mb-1">
                    <span className="text-white/50">Processing</span>
                    <span className="text-[#10B981]">10,000 rows</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#06B6D4]"
                      initial={{ width: 0 }}
                      animate={{ width: '87%' }}
                      transition={{ duration: 2, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <motion.span
                  className="text-[1.5vw] font-bold font-display text-[#10B981]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  87%
                </motion.span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-4">
          {phase >= 4 && (
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {[
                { icon: Key, label: 'API Keys', desc: 'Secure token management', color: '#8b5cf6' },
                { icon: Database, label: 'Batch Processing', desc: 'Clean thousands of rows', color: '#06B6D4' },
                { icon: Webhook, label: 'Webhooks', desc: 'Real-time event notifications', color: '#10B981' },
                { icon: Code, label: 'ML Pipeline', desc: 'Feedback loop integration', color: '#f59e0b' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-4 bg-black/30 border border-white/10 rounded-xl p-4"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div>
                    <div className="text-[1vw] font-display text-white font-semibold">{item.label}</div>
                    <div className="text-[0.75vw] text-white/40 font-display">{item.desc}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {phase >= 5 && (
        <motion.div
          className="absolute bottom-[8vh] flex items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Code className="w-5 h-5 text-[#8b5cf6]" />
          <span className="text-[1.3vw] font-display text-white/80">From personal content to enterprise datasets — one API for all</span>
        </motion.div>
      )}
    </motion.div>
  );
}
