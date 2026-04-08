import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Code2, LayoutDashboard, Database } from 'lucide-react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene8() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Code
      setTimeout(() => setPhase(2), 3500), // Dashboard
      setTimeout(() => setPhase(3), 6500), // Dataset
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10 bg-[#0a0e1a]"
      {...sceneTransitions.clipPolygon}
    >
      <div className="w-[70vw] h-[60vh] relative">
        
        {/* State 1: API Code Snippet */}
        <AnimateSection show={phase === 1}>
          <div className="w-full h-full bg-[#0d1117] rounded-2xl border border-white/10 p-8 shadow-2xl flex flex-col">
            <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
              <Code2 className="w-6 h-6 text-indigo-400" />
              <span className="text-[1.2vw] font-mono text-white/80">eraseai-node-sdk</span>
            </div>
            <div className="font-mono text-[1.4vw] leading-loose text-white/90">
              <span className="text-pink-400">import</span> {'{ EraseClient }'} <span className="text-pink-400">from</span> <span className="text-green-400">'@eraseai/sdk'</span>;<br/><br/>
              <span className="text-blue-400">const</span> client = <span className="text-pink-400">new</span> EraseClient(API_KEY);<br/><br/>
              <span className="text-white/40">// Protect inference pipeline at scale</span><br/>
              <span className="text-blue-400">const</span> safePrompt = <span className="text-pink-400">await</span> client.firewall.<span className="text-yellow-200">scan</span>(userPrompt);
            </div>
          </div>
        </AnimateSection>

        {/* State 2: Dashboard View */}
        <AnimateSection show={phase === 2}>
          <div className="w-full h-full bg-[#111827] rounded-2xl border border-white/10 p-8 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center gap-4 mb-2">
              <LayoutDashboard className="w-6 h-6 text-[#06B6D4]" />
              <span className="text-[1.5vw] font-display font-bold text-white">Enterprise Analytics</span>
            </div>
            
            <div className="flex gap-6 h-full">
              <div className="flex-[2] bg-white/5 rounded-xl border border-white/5 p-6 flex flex-col justify-end gap-2">
                {/* Fake Chart */}
                <div className="flex items-end gap-2 h-full">
                  {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                    <motion.div 
                      key={i} 
                      className="flex-1 bg-gradient-to-t from-[#06B6D4]/20 to-[#06B6D4] rounded-t-sm"
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <div className="text-white/40 font-mono text-[0.8vw]">Requests Scanned (7d)</div>
              </div>
              <div className="flex-1 flex flex-col gap-4">
                <div className="bg-white/5 rounded-xl border border-white/5 p-6 flex-1 flex flex-col justify-center">
                  <div className="text-[3vw] font-display font-bold text-red-400">1.2k</div>
                  <div className="text-white/40 font-mono text-[0.8vw]">Threats Blocked</div>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/5 p-6 flex-1 flex flex-col justify-center">
                  <div className="text-[3vw] font-display font-bold text-[#10b981]">14ms</div>
                  <div className="text-white/40 font-mono text-[0.8vw]">Avg Latency</div>
                </div>
              </div>
            </div>
          </div>
        </AnimateSection>

        {/* State 3: Dataset Sanitizer */}
        <AnimateSection show={phase >= 3}>
          <div className="w-full h-full bg-[#18181b] rounded-2xl border border-white/10 p-12 shadow-2xl flex flex-col items-center justify-center gap-8">
            <Database className="w-12 h-12 text-[#22D3EE]" />
            <h3 className="text-[2vw] font-display text-white">Sanitizing Training Data</h3>
            
            <div className="w-full max-w-[40vw] flex flex-col gap-2">
              <div className="flex justify-between text-white/60 font-mono text-[1vw]">
                <span>processing_batch_89.jsonl</span>
                <span>87%</span>
              </div>
              <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#06B6D4] to-[#22D3EE]"
                  initial={{ width: '40%' }}
                  animate={{ width: '87%' }}
                  transition={{ duration: 2, ease: 'linear' }}
                />
              </div>
              <div className="text-[#10b981] font-mono text-[0.9vw] mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                42,000 PII entities redacted
              </div>
            </div>
          </div>
        </AnimateSection>

      </div>
    </motion.div>
  );
}

function AnimateSection({ show, children }: { show: boolean, children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={show ? { opacity: 1, scale: 1, zIndex: 20 } : { opacity: 0, scale: 1.05, zIndex: 10 }}
      transition={{ duration: 0.6 }}
      style={{ pointerEvents: show ? 'auto' : 'none' }}
    >
      {children}
    </motion.div>
  );
}