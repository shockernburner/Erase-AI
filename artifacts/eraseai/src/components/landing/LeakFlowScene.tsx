import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { AI_GATES, PII_CHIPS, PUBLIC_SINKS } from "./landingData";

// Your data → AI gates → the public. Chips of personal data travel from you,
// through whichever AI app you use, out to logs, training sets and search.

type Pt = { x: number; y: number };

function layout(vertical: boolean) {
  if (vertical) {
    const gates: Pt[] = AI_GATES.map((_, i) => ({ x: 70 + (i % 3) * 130, y: 300 + Math.floor(i / 3) * 80 }));
    return { w: 400, h: 680, you: { x: 200, y: 70 }, pub: { x: 200, y: 600 }, gates, gateW: 112, gateH: 46 };
  }
  const gates: Pt[] = AI_GATES.map((_, i) => ({ x: 500, y: 60 + i * 80 }));
  return { w: 1000, h: 520, you: { x: 110, y: 260 }, pub: { x: 880, y: 260 }, gates, gateW: 150, gateH: 50 };
}

/** Rough rendered width of a 12px label; CJK glyphs are about twice as wide. */
function labelWidth(text: string) {
  let w = 0;
  for (const ch of text) w += /[\u2E80-\uFFEF]/.test(ch) ? 12.5 : 7.6;
  return w;
}

function route(a: Pt, g: Pt, b: Pt, vertical: boolean) {
  if (vertical) {
    return `M ${a.x} ${a.y} C ${a.x} ${(a.y + g.y) / 2}, ${g.x} ${(a.y + g.y) / 2}, ${g.x} ${g.y} C ${g.x} ${(g.y + b.y) / 2}, ${b.x} ${(g.y + b.y) / 2}, ${b.x} ${b.y}`;
  }
  return `M ${a.x} ${a.y} C ${(a.x + g.x) / 2} ${a.y}, ${(a.x + g.x) / 2} ${g.y}, ${g.x} ${g.y} C ${(g.x + b.x) / 2} ${g.y}, ${(g.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`;
}

export function LeakFlowScene() {
  const vertical = useIsMobile();
  const reduce = useReducedMotion();
  const { t } = useTranslation();
  const L = layout(vertical);
  const routes = L.gates.map((g) => route(L.you, g, L.pub, vertical));

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-4 pb-24 pt-20 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(239,68,68,0.12),transparent_55%),radial-gradient(ellipse_at_20%_50%,rgba(6,182,212,0.12),transparent_50%)]" />

      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center font-display text-3xl font-extrabold text-white sm:text-5xl"
      >
        <span className="text-cyan-300">{t("story.leak.yourData")}</span>
        <span className="text-white/40">→</span>
        <span>{t("story.leak.ai")}</span>
        <span className="text-white/40">→</span>
        <span className="text-red-400">{t("story.leak.world")}</span>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 mb-4 text-center text-sm text-white/60 sm:text-base"
      >
        {t("story.leak.sub")}
      </motion.p>

      <svg viewBox={`0 0 ${L.w} ${L.h}`} className="relative z-10 h-auto max-h-[62dvh] w-full max-w-5xl" role="img" aria-label={t("story.leak.aria")}>
        <defs>
          <radialGradient id="lf-you" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lf-pub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lf-wire" x1="0" y1="0" x2={vertical ? "0" : "1"} y2={vertical ? "1" : "0"}>
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {routes.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke="url(#lf-wire)"
            strokeWidth={1.5}
            strokeDasharray="4 6"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.1 * i }}
          />
        ))}

        {/* You */}
        <circle cx={L.you.x} cy={L.you.y} r={80} fill="url(#lf-you)" />
        <circle cx={L.you.x} cy={L.you.y} r={38} fill="#06121a" stroke="#22d3ee" strokeWidth={2} />
        <circle cx={L.you.x} cy={L.you.y - 9} r={9} fill="#22d3ee" />
        <path d={`M ${L.you.x - 16} ${L.you.y + 20} a 16 13 0 0 1 32 0`} fill="#22d3ee" />
        <text x={L.you.x} y={L.you.y + (vertical ? -52 : 62)} textAnchor="middle" className="fill-white font-display" fontSize={vertical ? 20 : 18} fontWeight={700}>
          {t("story.leak.you")}
        </text>

        {/* AI gates */}
        {L.gates.map((g, i) => (
          <motion.g key={AI_GATES[i]} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.08 }} style={{ transformOrigin: `${g.x}px ${g.y}px` }}>
            <rect x={g.x - L.gateW / 2} y={g.y - L.gateH / 2} width={L.gateW} height={L.gateH} rx={L.gateH / 2} fill="#0b1220" stroke="#64748b" strokeOpacity={0.6} />
            <rect x={g.x - L.gateW / 2 + 4} y={g.y - L.gateH / 2 + 4} width={L.gateW - 8} height={L.gateH - 8} rx={(L.gateH - 8) / 2} fill="none" stroke="#a78bfa" strokeOpacity={0.35}>
              {!reduce && <animate attributeName="stroke-opacity" values="0.15;0.6;0.15" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />}
            </rect>
            <text x={g.x} y={g.y + 6} textAnchor="middle" fill="#e2e8f0" fontSize={vertical ? 15 : 17} fontWeight={600}>
              {AI_GATES[i]}
            </text>
          </motion.g>
        ))}

        {/* The public */}
        <circle cx={L.pub.x} cy={L.pub.y} r={95} fill="url(#lf-pub)" />
        <g>
          <circle cx={L.pub.x} cy={L.pub.y} r={42} fill="#1a0707" stroke="#ef4444" strokeWidth={2} />
          <ellipse cx={L.pub.x} cy={L.pub.y} rx={18} ry={42} fill="none" stroke="#ef4444" strokeOpacity={0.6} />
          <line x1={L.pub.x - 42} y1={L.pub.y} x2={L.pub.x + 42} y2={L.pub.y} stroke="#ef4444" strokeOpacity={0.6} />
          <line x1={L.pub.x - 36} y1={L.pub.y - 20} x2={L.pub.x + 36} y2={L.pub.y - 20} stroke="#ef4444" strokeOpacity={0.35} />
          <line x1={L.pub.x - 36} y1={L.pub.y + 20} x2={L.pub.x + 36} y2={L.pub.y + 20} stroke="#ef4444" strokeOpacity={0.35} />
          {!reduce && <animateTransform attributeName="transform" type="rotate" from={`0 ${L.pub.x} ${L.pub.y}`} to={`360 ${L.pub.x} ${L.pub.y}`} dur="30s" repeatCount="indefinite" />}
        </g>
        <text x={L.pub.x} y={L.pub.y + (vertical ? 66 : 68)} textAnchor="middle" fill="#fca5a5" fontSize={18} fontWeight={700}>
          {t("story.leak.public")}
        </text>
        {PUBLIC_SINKS.map((s, i) => {
          const p = vertical
            ? { x: L.pub.x + (i < 2 ? -1 : 1) * 125, y: L.pub.y - 12 + (i % 2) * 30 }
            : { x: L.pub.x, y: i < 2 ? L.pub.y - 150 + i * 30 : L.pub.y + 110 + (i - 2) * 30 };
          return (
            <motion.text
              key={s}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              fill="#fecaca"
              fillOpacity={0.75}
              fontSize={vertical ? 14 : 15}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 + i * 0.2 }}
            >
              {t(`story.leak.sinks.${s}`)}
            </motion.text>
          );
        })}

        {/* Data chips in flight */}
        {!reduce &&
          PII_CHIPS.map((key, i) => {
            const chip = t(`story.leak.chips.${key}`);
            const w = labelWidth(chip) + 18;
            return (
              <g key={key} opacity={0}>
                <rect x={-w / 2} y={-12} width={w} height={24} rx={12} fill="#0e2a33" stroke="#22d3ee" strokeOpacity={0.8} />
                <text x={0} y={4.5} textAnchor="middle" fill="#a5f3fc" fontSize={12} fontWeight={600}>
                  {chip}
                </text>
                <animateMotion dur="5.6s" begin={`${i * 0.7}s`} repeatCount="indefinite" path={routes[i % routes.length]} />
                <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;0.08;0.5;0.9;1" dur="5.6s" begin={`${i * 0.7}s`} repeatCount="indefinite" />
              </g>
            );
          })}
      </svg>
    </div>
  );
}
