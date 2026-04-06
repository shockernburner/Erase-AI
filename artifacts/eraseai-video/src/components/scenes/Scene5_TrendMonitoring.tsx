import { motion } from 'framer-motion';
import { Activity, Bell, TrendingUp, BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { easings } from '@/lib/video/animations';

export function Scene5_TrendMonitoring() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 5000),
      setTimeout(() => setPhase(5), 7000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const chartData = [35, 42, 38, 55, 48, 62, 58, 75, 68, 82, 78, 85];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20 px-[8vw]"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: -100, filter: 'blur(15px)' }}
      transition={{ duration: 1.2, ease: easings.easeOut.ease }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(6,182,212,0.06)_0%,transparent_60%)] pointer-events-none" />

      {phase >= 1 && (
        <motion.div
          className="absolute top-[8vh] left-[5vw] flex items-center gap-4"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: easings.easeOut.ease }}
        >
          <div className="w-10 h-10 rounded-full bg-[#06B6D4]/20 flex items-center justify-center border border-[#06B6D4]/30">
            <Activity className="w-5 h-5 text-[#06B6D4]" />
          </div>
          <div>
            <h2 className="text-[2.2vw] font-display font-bold text-white leading-none">Trend Monitoring</h2>
            <p className="text-[1.1vw] text-white/50 font-mono mt-1">Real-Time Safety Analytics</p>
          </div>
        </motion.div>
      )}

      <div className="w-full flex items-center gap-10 mt-8">
        <div className="flex-[1.5] flex flex-col gap-5">
          {phase >= 2 && (
            <motion.div
              className="bg-black/30 border border-white/10 rounded-2xl p-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#06B6D4]" />
                  <span className="text-[1.1vw] font-display text-white/80">Safety Score — 30 Days</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#10B981]" />
                  <span className="text-[0.9vw] font-mono text-[#10B981]">+18% Improvement</span>
                </div>
              </div>

              <div className="h-32 flex items-end justify-between gap-1.5 px-2">
                {chartData.map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-full rounded-t-sm"
                    style={{
                      background: `linear-gradient(to top, rgba(6,182,212,0.3), rgba(6,182,212,0.8))`,
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 px-2">
                <span className="text-[0.7vw] font-mono text-white/30">Day 1</span>
                <span className="text-[0.7vw] font-mono text-white/30">Day 30</span>
              </div>
            </motion.div>
          )}

          {phase >= 4 && (
            <motion.div
              className="grid grid-cols-3 gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {[
                { label: 'Content Scans', value: '2,847', trend: '+24%', color: '#06B6D4' },
                { label: 'Risks Caught', value: '156', trend: '-31%', color: '#10B981' },
                { label: 'Avg. Score', value: '91/100', trend: '+12%', color: '#8b5cf6' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  className="bg-black/30 border border-white/10 rounded-xl p-4 text-center"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.12 }}
                >
                  <div className="text-[2vw] font-bold font-display" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[0.75vw] font-mono text-white/40 uppercase mt-1">{stat.label}</div>
                  <div className="text-[0.7vw] font-mono text-[#10B981] mt-1">{stat.trend}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-4">
          {phase >= 3 && (
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {[
                { title: 'Toxicity Spike', desc: 'Social post draft flagged', time: '2 min ago', severity: 'high' },
                { title: 'PII Warning', desc: 'Email contains address', time: '15 min ago', severity: 'medium' },
                { title: 'Bias Detected', desc: 'Report uses gendered language', time: '1 hr ago', severity: 'low' },
              ].map((alert, i) => (
                <motion.div
                  key={i}
                  className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-start gap-3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.2 }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                    alert.severity === 'high' ? 'bg-red-500/20 border-red-500/30' :
                    alert.severity === 'medium' ? 'bg-[#f59e0b]/20 border-[#f59e0b]/30' :
                    'bg-[#06B6D4]/20 border-[#06B6D4]/30'
                  }`}>
                    <Bell className={`w-4 h-4 ${
                      alert.severity === 'high' ? 'text-red-400' :
                      alert.severity === 'medium' ? 'text-[#f59e0b]' : 'text-[#06B6D4]'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[1vw] font-display text-white font-semibold">{alert.title}</div>
                    <div className="text-[0.8vw] text-white/50 font-display">{alert.desc}</div>
                    <div className="text-[0.7vw] font-mono text-white/30 mt-1">{alert.time}</div>
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
          <Activity className="w-5 h-5 text-[#06B6D4]" />
          <span className="text-[1.3vw] font-display text-white/80">Track your digital safety over time with actionable insights</span>
        </motion.div>
      )}
    </motion.div>
  );
}
