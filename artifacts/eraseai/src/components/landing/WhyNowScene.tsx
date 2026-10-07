import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { STATS } from "./landingData";

function Counter({ to, delay }: { to: number; delay: number }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) return;
    const c = animate(0, to, { duration: 1.6, delay, ease: "easeOut", onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [to, delay, reduce]);
  return <>{n}</>;
}

export function WhyNowScene() {
  const { t } = useTranslation();
  const R = 54;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-4 pb-24 pt-20 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(245,158,11,0.12),transparent_55%)]" />
      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mb-8 text-center font-display text-3xl font-extrabold text-white sm:mb-12 sm:text-5xl"
      >
        {t("story.now.title")} <span className="text-amber-300">{t("story.now.titleAccent")}</span>
      </motion.h2>

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-8">
        {STATS.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 30, rotateY: -25 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 0.7, delay: 0.15 * i }}
            className="flex items-center gap-4 sm:flex-col sm:gap-5 sm:text-center"
          >
            <div className="relative h-24 w-24 shrink-0 sm:h-44 sm:w-44">
              <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <motion.circle
                  cx="64"
                  cy="64"
                  r={R}
                  fill="none"
                  stroke="url(#wn-grad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  initial={{ strokeDashoffset: C }}
                  animate={{ strokeDashoffset: C * (1 - s.ring) }}
                  transition={{ duration: 1.6, delay: 0.15 * i, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="wn-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-display text-xl font-extrabold text-white sm:text-4xl">
                {s.prefix}
                <Counter to={s.value} delay={0.15 * i} />
                {s.suffix}
              </div>
            </div>
            <p className="text-sm leading-snug text-white/75 sm:max-w-[14rem] sm:text-base">{t(`story.now.${s.key}`)}</p>
          </motion.div>
        ))}
      </div>
      <p className="relative z-10 mt-8 text-[11px] text-white/40">{t("story.now.source")}</p>
    </div>
  );
}
