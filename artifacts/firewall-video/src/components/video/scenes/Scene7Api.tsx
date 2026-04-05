import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const CURL_LINES = [
  '$ curl -X POST https://api.eraseai.com/v1/scan \\',
  '  -H "Authorization: Bearer era_live_..." \\',
  '  -H "Content-Type: application/json" \\',
  '  -d \'{"text": "Deploy with key sk-proj-..."}\'',
];

const RESPONSE_LINES = [
  '{',
  '  "safetyScore": 28,',
  '  "level": "danger",',
  '  "issues": [',
  '    { "severity": "high", "type": "api_key" }',
  '  ],',
  '  "sanitized": "Deploy with key [REDACTED]"',
  '}',
];

export function Scene7Api() {
  const [curlLines, setCurlLines] = useState(0);
  const [showResponse, setShowResponse] = useState(false);
  const [responseLines, setResponseLines] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    CURL_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setCurlLines(i + 1), 200 + i * 250));
    });
    timers.push(setTimeout(() => setShowResponse(true), 1500));
    RESPONSE_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setResponseLines(i + 1), 1700 + i * 120));
    });
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="text-[1.8vw] font-display font-bold text-white/90 mb-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Simple API. Powerful protection.
      </motion.div>
      <motion.div
        className="text-[1vw] text-white/40 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        One endpoint. Any language. Any platform.
      </motion.div>

      <motion.div
        className="w-full max-w-[60vw] rounded-xl overflow-hidden border border-white/10"
        style={{ background: '#0d0d14' }}
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <div className="w-2 h-2 rounded-full bg-green-500/60" />
          <span className="text-white/25 text-[0.7vw] font-mono">Terminal</span>
        </div>

        <div className="p-5 font-mono text-[0.9vw] leading-[1.8]">
          {CURL_LINES.map((line, i) => {
            if (i >= curlLines) return null;
            return (
              <motion.div
                key={`c-${i}`}
                className={i === 0 ? 'text-cyan-300/80' : 'text-white/50'}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {line}
              </motion.div>
            );
          })}

          {!showResponse && curlLines >= CURL_LINES.length && (
            <motion.span
              className="inline-block w-[0.5vw] h-[1.1vw] bg-green-400 mt-2"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: 'mirror' }}
            />
          )}

          {showResponse && (
            <>
              <motion.div
                className="my-2 border-t border-white/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
              {RESPONSE_LINES.map((line, i) => {
                if (i >= responseLines) return null;
                const isKey = line.includes('"safetyScore"') || line.includes('"level"') || line.includes('"severity"') || line.includes('"sanitized"');
                const isDanger = line.includes('"danger"') || line.includes('"high"');
                const isScore = line.includes('28');
                return (
                  <motion.div
                    key={`r-${i}`}
                    className={isDanger ? 'text-red-400/80' : isScore ? 'text-amber-400/80' : isKey ? 'text-indigo-300/80' : 'text-white/40'}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {line}
                  </motion.div>
                );
              })}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
