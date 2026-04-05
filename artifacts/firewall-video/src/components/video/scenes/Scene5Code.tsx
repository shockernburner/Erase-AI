import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const PLATFORMS = [
  {
    name: 'VS Code',
    icon: '{ }',
    lang: 'JavaScript',
    code: [
      '// .vscode/settings.json',
      '{',
      '  "eraseai.apiKey": "era_...",',
      '  "eraseai.scanOnSave": true,',
      '  "eraseai.blockLevel": "high"',
      '}',
    ],
  },
  {
    name: 'Replit',
    icon: '< >',
    lang: 'Node.js',
    code: [
      'import { EraseAI } from "eraseai";',
      '',
      'const firewall = new EraseAI({',
      '  apiKey: process.env.ERASEAI_KEY',
      '});',
      '',
      'app.use(firewall.middleware());',
    ],
  },
  {
    name: 'Xcode',
    icon: '{ }',
    lang: 'Swift',
    code: [
      'import EraseAI',
      '',
      'let firewall = EraseAIClient(',
      '  apiKey: Env.eraseaiKey',
      ')',
      '',
      'let safe = try await firewall',
      '  .scan(prompt: userInput)',
    ],
  },
];

export function Scene5Code() {
  const [activePlatform, setActivePlatform] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    setVisibleLines(0);
    const code = PLATFORMS[activePlatform].code;
    const timers: ReturnType<typeof setTimeout>[] = [];
    code.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 150 + i * 200));
    });
    return () => timers.forEach(t => clearTimeout(t));
  }, [activePlatform]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setActivePlatform(1), 2000),
      setTimeout(() => setActivePlatform(2), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const platform = PLATFORMS[activePlatform];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -50, filter: 'blur(8px)' }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="text-[1.8vw] font-display font-bold text-white/90 mb-6 tracking-tight"
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Works everywhere you code
      </motion.div>

      <div className="flex gap-4 mb-6">
        {PLATFORMS.map((p, i) => (
          <motion.div
            key={p.name}
            className={`px-4 py-2 rounded-lg font-mono text-[0.9vw] border transition-colors ${i === activePlatform ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300' : 'border-white/10 bg-white/[0.02] text-white/30'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
          >
            <span className="mr-2 text-[0.7vw]">{p.icon}</span> {p.name}
          </motion.div>
        ))}
      </div>

      <motion.div
        className="w-full max-w-[55vw] rounded-xl overflow-hidden border border-white/10"
        style={{ background: '#1e1e2e' }}
        layout
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <span className="text-white/20 text-[0.7vw] font-mono ml-2">{platform.lang}</span>
        </div>

        <div className="p-5 font-mono text-[1vw] leading-[1.8] min-h-[22vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePlatform}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {platform.code.map((line, i) => {
                if (i >= visibleLines) return null;
                const isComment = line.trimStart().startsWith('//') || line.trimStart().startsWith('import');
                const isKey = line.includes(':') || line.includes('=');
                return (
                  <motion.div
                    key={i}
                    className="flex"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="w-6 text-white/15 text-right mr-4 select-none text-[0.8vw]">{i + 1}</span>
                    <span className={isComment ? 'text-green-400/60' : isKey ? 'text-cyan-300/80' : 'text-white/60'}>
                      {line || '\u00A0'}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
          <motion.span
            className="inline-block w-[0.5vw] h-[1.2vw] bg-indigo-400 ml-7"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'mirror' }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
