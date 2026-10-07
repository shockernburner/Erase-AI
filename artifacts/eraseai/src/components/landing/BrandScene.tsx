import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, SendHorizontal, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

// How the name reads, in three frames:
//   0  "Erase AI?"                        — the misreading
//   1  "Erase your leaks before AI"       — what it actually means
//   2  "EraseAI" + the Send-button demo   — where it works

const SPRING = { type: "spring" as const, stiffness: 140, damping: 20 };

function Wordmark({ step }: { step: number }) {
  const { t } = useTranslation();
  return (
    <LayoutGroup>
      <motion.div layout className="flex flex-wrap items-baseline justify-center font-display font-extrabold leading-none text-white">
        <motion.span layout transition={SPRING} className="text-5xl sm:text-7xl lg:text-8xl">
          {t("story.brand.erase")}
        </motion.span>
        <AnimatePresence mode="popLayout">
          {step === 1 && (
            <motion.span
              key="middle"
              layout
              initial={{ opacity: 0, width: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, width: "auto", filter: "blur(0px)" }}
              exit={{ opacity: 0, width: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.6 }}
              className="mx-3 overflow-hidden whitespace-nowrap text-3xl text-cyan-300 sm:mx-5 sm:text-5xl lg:text-6xl"
            >
              {t("story.brand.middle")}
            </motion.span>
          )}
        </AnimatePresence>
        <motion.span
          layout
          transition={SPRING}
          className={`text-5xl sm:text-7xl lg:text-8xl ${step === 2 ? "bg-gradient-to-r from-cyan-300 to-sky-500 bg-clip-text text-transparent" : ""} ${step === 0 ? "ml-4 sm:ml-6" : ""}`}
        >
          AI
        </motion.span>
        {step === 0 && (
          <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="ml-1 text-5xl text-red-400 sm:text-7xl lg:text-8xl">
            ?
          </motion.span>
        )}
      </motion.div>
    </LayoutGroup>
  );
}


/** A chat composer: Send is pressed, EraseAI catches it, secrets are wiped, a safe message goes. */
function SendDemo() {
  const reduce = useReducedMotion();
  const { t } = useTranslation();
  const demoText: { text: string; secret?: string }[] = [
    { text: t("story.brand.demo1") },
    { text: t("story.brand.demoName"), secret: t("story.brand.tokenName") },
    { text: t("story.brand.demo2") },
    { text: "4111 1111 1111 1111", secret: t("story.brand.tokenCard") },
    { text: t("story.brand.demo3") },
    { text: "sk_live_51H…9xQ", secret: t("story.brand.tokenKey") },
  ];
  // 0 typing done · 1 Send pressed (caught) · 2 erased · 3 sent
  const [phase, setPhase] = useState(reduce ? 3 : 0);
  useEffect(() => {
    if (reduce) return;
    const timings = [1400, 1100, 1300, 1800];
    const t = setTimeout(() => setPhase((p) => (p + 1) % 4), timings[phase]);
    return () => clearTimeout(t);
  }, [phase, reduce]);
  const erased = phase >= 2;

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <motion.div
        className="absolute -inset-6 rounded-[2rem] bg-cyan-400/20 blur-2xl"
        animate={{ opacity: phase === 1 ? 1 : 0.25 }}
        transition={{ duration: 0.4 }}
      />
      <div className="relative rounded-2xl border border-white/10 bg-[#0b1220]/90 p-3 shadow-2xl backdrop-blur sm:p-4">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
          <span>{t("story.brand.demoLabel")}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={phase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`flex items-center gap-1 font-bold ${phase === 1 ? "text-amber-300" : phase >= 2 ? "text-emerald-300" : "text-white/40"}`}
            >
              {phase === 1 && <><ShieldCheck className="h-3 w-3" /> {t("story.brand.caught")}</>}
              {phase === 2 && <><ShieldCheck className="h-3 w-3" /> {t("story.brand.erased")}</>}
              {phase === 3 && <><Check className="h-3 w-3" /> {t("story.brand.sent")}</>}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex items-end gap-2">
          <p className="min-h-[4.5rem] flex-1 text-left text-sm leading-relaxed text-white/90 sm:text-base">
            {demoText.map((part, i) =>
              part.secret ? (
                <span key={i} className="relative inline-block">
                  <AnimatePresence mode="wait" initial={false}>
                    {erased ? (
                      <motion.span
                        key="safe"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded bg-emerald-500/15 px-1 font-mono text-emerald-300"
                      >
                        {part.secret}
                      </motion.span>
                    ) : (
                      <motion.span
                        key="raw"
                        exit={{ opacity: 0, filter: "blur(6px)", x: 8 }}
                        transition={{ duration: 0.35 }}
                        className={`rounded px-0.5 ${phase === 1 ? "bg-red-500/25 text-red-200 underline decoration-red-400 decoration-wavy" : ""}`}
                      >
                        {part.text}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </p>
          <motion.div
            animate={phase === 1 ? { scale: [1, 0.85, 1] } : phase === 3 ? { x: [0, 14, 0], opacity: [1, 0, 1] } : {}}
            transition={{ duration: 0.5 }}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-slate-950"
          >
            <SendHorizontal className="h-5 w-5" />
            {phase === 1 && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-cyan-300"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function BrandScene({ step }: { step: number }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-6 px-4 pb-24 pt-20 text-center sm:gap-8 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.18),transparent_60%)]" />

      <AnimatePresence>
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.4, rotateY: -180 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 [perspective:800px]"
          >
            <BrandLogo className="h-14 w-14 shadow-[0_0_40px_rgba(34,211,238,0.5)] sm:h-20 sm:w-20" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10">
        <Wordmark step={step} />
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 max-w-2xl text-lg text-white/70 sm:text-2xl"
        >
          {t(`story.brand.c${step}`)}
        </motion.p>
      </AnimatePresence>

      <AnimatePresence>
        {step === 2 && (
          <motion.div
            key="demo"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative z-10 w-full"
          >
            <SendDemo />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
