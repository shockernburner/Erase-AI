import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4Browser() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3800),
      setTimeout(() => setPhase(5), 4800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const circumference = 2 * Math.PI * 22;
  const score = 28;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative w-full max-w-[75vw]">
        <motion.div
          className="rounded-xl overflow-hidden border border-white/10 shadow-2xl"
          style={{ background: '#343541' }}
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        >
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-[#2b2c38]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-white/25 text-[0.75vw] font-mono">chatgpt.com</span>
            </div>
          </div>

          <div className="p-6 min-h-[30vh]">
            <div className="flex gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-[0.7vw] font-bold flex-shrink-0">G</div>
              <div>
                <div className="text-white/80 text-[1vw] font-mono leading-relaxed">
                  Help me deploy this app with my production configs:
                  <br />
                  <span className="text-white/50">DB_PASS=SuperSecret123 API_KEY=sk-proj-...</span>
                </div>
              </div>
            </div>

            {phase >= 1 && (
              <motion.div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <motion.div
                  className="w-[40vw] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                  style={{ background: '#1a1b23' }}
                  initial={{ y: 30, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                >
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06]">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[0.8vw] text-white"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      E
                    </div>
                    <div>
                      <div className="text-white/90 text-[0.95vw] font-semibold">EraseAI Firewall</div>
                      <div className="text-white/40 text-[0.7vw]">
                        {phase < 2 ? 'Analyzing your prompt for privacy risks...' : 'Prompt analysis complete'}
                      </div>
                    </div>
                  </div>

                  {phase < 2 && (
                    <div className="py-8 text-center">
                      <motion.div
                        className="w-8 h-8 mx-auto border-2 border-indigo-500/20 border-t-indigo-500 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      <div className="text-white/40 text-[0.8vw] mt-3">Scanning prompt...</div>
                    </div>
                  )}

                  {phase >= 2 && (
                    <>
                      <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.06]">
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
                            <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                            <motion.circle
                              cx="24" cy="24" r="22" fill="none" stroke="#ef4444" strokeWidth="3"
                              strokeDasharray={circumference}
                              strokeLinecap="round"
                              initial={{ strokeDashoffset: circumference }}
                              animate={{ strokeDashoffset: dashOffset }}
                              transition={{ duration: 0.8, delay: 0.2, ease: 'circOut' }}
                            />
                          </svg>
                          <motion.span
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-400 text-[1vw] font-bold"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
                          >
                            {score}
                          </motion.span>
                        </div>
                        <div>
                          <div className="text-red-400 text-[0.9vw] font-semibold">High Risk — Blocked</div>
                          <div className="text-white/40 text-[0.75vw]">3 credentials and 1 PII detected</div>
                        </div>
                      </div>

                      {phase >= 3 && (
                        <motion.div
                          className="px-5 py-3 border-b border-white/[0.06]"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="text-white/40 text-[0.6vw] font-semibold uppercase tracking-wider mb-2">Issues Found (3)</div>
                          {[
                            { severity: 'HIGH', text: 'Database password exposed' },
                            { severity: 'HIGH', text: 'API key detected (OpenAI)' },
                            { severity: 'MEDIUM', text: 'Email address found' },
                          ].map((issue, i) => (
                            <motion.div
                              key={i}
                              className="flex items-center gap-2 py-1.5 px-2 mb-1 rounded-md bg-white/[0.02] border border-white/[0.04]"
                              initial={{ opacity: 0, x: 15 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.15 }}
                            >
                              <span className={`text-[0.55vw] font-bold uppercase px-1.5 py-0.5 rounded ${issue.severity === 'HIGH' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                {issue.severity}
                              </span>
                              <span className="text-white/60 text-[0.75vw]">{issue.text}</span>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}

                      {phase >= 4 && (
                        <motion.div
                          className="flex gap-2 px-5 py-3"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex-1 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-center text-white/40 text-[0.75vw] font-semibold">
                            Cancel
                          </div>
                          <motion.div
                            className="flex-1 py-2 rounded-lg text-center text-white text-[0.75vw] font-semibold"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                            animate={phase >= 5 ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ duration: 0.4 }}
                          >
                            {phase >= 5 ? '✓ Sanitize & Send' : 'Sanitize & Send'}
                          </motion.div>
                          <div className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center text-red-400/70 text-[0.75vw] font-semibold">
                            Send Anyway
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
