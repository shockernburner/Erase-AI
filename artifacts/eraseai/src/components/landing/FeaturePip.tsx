import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileArchive,
  FileText,
  Image as ImageIcon,
  KeyRound,
  Link2,
  FileCheck,
  Send,
  Server,
  ShieldCheck,
  Smartphone,
  User,
  Users,
  Webhook,
  X,
} from "lucide-react";
import type { PricingTierId } from "@/lib/pricingPlans";

// A picture-in-picture window that plays a looped, wordless-as-possible
// animation of what a plan does, with sign up / sign in under it. It floats
// into the empty space beside the plan cards when there is room (wide
// screens, draggable) and otherwise sits above the timeline like a sheet.
// Nothing in it is data: no counts, no usage, no amounts.

export type PipPlan = Extract<PricingTierId, "personal" | "pro" | "business">;
export const PIP_PLANS: PipPlan[] = ["personal", "pro", "business"];
export const hasPip = (id: string): id is PipPlan => (PIP_PLANS as string[]).includes(id);

const DEMO_TEXT = "Can you check why this fails? My AWS key is AKIAIOSFODNN7EXAMPLE";
const MASKED_TEXT = "Can you check why this fails? My AWS key is AKIA************MPLE";

/** Steps through 0..count-1 on a timer; stays on `still` when motion is reduced. */
function useLoop(count: number, ms: number, still: number) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? still : 0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % count), ms);
    return () => window.clearInterval(id);
  }, [count, ms, reduce]);
  return reduce ? still : step;
}

function Typed({ text, speed = 38 }: { text: string; speed?: number }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setN((v) => Math.min(v + 1, text.length)), speed);
    return () => window.clearInterval(id);
  }, [text, speed, reduce]);
  return (
    <>
      {text.slice(0, n)}
      <motion.span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-cyan-300" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
    </>
  );
}

const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.35 } };

function Frame({ children }: { children: ReactNode }) {
  return <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-[#091322] p-3">{children}</div>;
}

function ChatBar({ children, tone = "idle" }: { children: ReactNode; tone?: "idle" | "alert" | "ok" }) {
  const ring = tone === "alert" ? "border-rose-400/60" : tone === "ok" ? "border-emerald-400/60" : "border-white/15";
  return (
    <div className={`flex items-end gap-2 rounded-xl border ${ring} bg-white/5 p-2.5 text-[11px] leading-snug text-white/85 transition-colors`}>
      <p className="min-h-[2.6rem] flex-1 break-words font-mono">{children}</p>
      <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-slate-950">
        <Send className="h-3 w-3" />
      </span>
    </div>
  );
}

function PersonalStage({ step }: { step: number }) {
  return (
    <Frame>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-white/20" />
        <span className="h-2 w-2 rounded-full bg-white/20" />
        <span className="h-2 w-2 rounded-full bg-white/20" />
      </div>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" {...fade}>
            <ChatBar>
              <Typed text={DEMO_TEXT} />
            </ChatBar>
          </motion.div>
        )}
        {step === 1 && (
          <motion.div key="s1" {...fade} className="space-y-2">
            <ChatBar tone="alert">
              {DEMO_TEXT.slice(0, DEMO_TEXT.indexOf("AKIA"))}
              <span className="rounded bg-rose-500/30 px-0.5 text-rose-200">AKIAIOSFODNN7EXAMPLE</span>
            </ChatBar>
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 160, damping: 16 }}
              className="flex items-center gap-3 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3"
            >
              <AlertTriangle className="h-6 w-6 text-rose-300" />
              <KeyRound className="h-5 w-5 text-white/70" />
              <span className="ml-auto flex gap-1.5">
                <span className="h-5 w-12 rounded-full bg-white/10" />
                <span className="h-5 w-12 rounded-full bg-cyan-400/80" />
              </span>
            </motion.div>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="s2" {...fade} className="space-y-2">
            <ChatBar tone="ok">{MASKED_TEXT}</ChatBar>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: "spring" }} className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
              <Check className="h-4 w-4 text-emerald-300" />
            </motion.div>
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="s3" {...fade} className="flex items-center justify-around pt-3">
            {[FileText, ImageIcon, FileArchive].map((Icon, i) => (
              <div key={i} className="relative flex h-16 w-14 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white/5">
                <Icon className="h-6 w-6 text-white/75" />
                <motion.span
                  className="absolute inset-x-0 h-0.5 bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]"
                  initial={{ top: 0 }}
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 1.6, delay: i * 0.25, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            ))}
            <ArrowRight className="h-4 w-4 text-white/40" />
            <div className="relative flex h-20 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/5">
              <Smartphone className="h-5 w-5 text-white/50" />
              <ShieldCheck className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-[#091322] text-cyan-300" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Frame>
  );
}

function ProStage({ step }: { step: number }) {
  return (
    <Frame>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="p0" {...fade} className="space-y-3 pt-2">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-3 py-1.5 text-slate-950">
              <KeyRound className="h-3.5 w-3.5" />
              <span className="h-2 w-14 rounded-full bg-slate-950/40" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-[11px] text-white/80">
              <KeyRound className="h-3.5 w-3.5 text-cyan-300" />
              eak_••••••••••••••••
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.1 }} className="ml-auto text-emerald-300">
                <Check className="h-4 w-4" />
              </motion.span>
            </motion.div>
          </motion.div>
        )}
        {step === 1 && (
          <motion.div key="p1" {...fade} className="space-y-2">
            <div className="rounded-lg border border-white/15 bg-black/30 p-2.5 font-mono text-[10.5px] leading-relaxed text-white/80">
              <span className="text-violet-300">POST</span> /api/dev/analyze
              <br />
              <span className="text-white/50">{`{ "text": "…" }`}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-2">
              {["secret_exposure", "pii"].map((c, i) => (
                <motion.span key={c} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.4 }} className="rounded-full border border-amber-300/40 bg-amber-400/10 px-2.5 py-1 font-mono text-[10.5px] text-amber-200">
                  {c}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="p2" {...fade} className="relative flex h-full items-center justify-between px-2 pt-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/10">
              <ShieldCheck className="h-7 w-7 text-cyan-300" />
            </div>
            <div className="relative mx-2 h-6 flex-1">
              <span className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
              <motion.span className="absolute top-1/2 -translate-y-1/2 text-violet-300" animate={{ left: ["0%", "88%"] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}>
                <Webhook className="h-5 w-5" />
              </motion.span>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-violet-300/40 bg-violet-400/10">
              <Server className="h-7 w-7 text-violet-300" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Frame>
  );
}

function TeamsStage({ step }: { step: number }) {
  return (
    <Frame>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="t0" {...fade} className="flex h-full items-center justify-center pt-2">
            <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="flex items-center gap-2 rounded-full border border-cyan-300/50 bg-cyan-400/10 px-4 py-2 text-cyan-200">
              <Link2 className="h-4 w-4" />
              <span className="h-2 w-20 rounded-full bg-cyan-200/40" />
            </motion.div>
          </motion.div>
        )}
        {step === 1 && (
          <motion.div key="t1" {...fade} className="relative flex h-full items-center justify-center gap-3 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.div key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 + i * 0.3, type: "spring", stiffness: 180, damping: 14 }} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400/10">
                <User className="h-5 w-5 text-emerald-200" />
                <ShieldCheck className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[#091322] text-cyan-300" />
              </motion.div>
            ))}
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="t2" {...fade} className="space-y-2 pt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                <User className="h-4 w-4 text-white/60" />
                <span className="h-2 flex-1 rounded-full bg-white/10" />
                {i === 1 && (
                  <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.1, repeat: Infinity }} className="text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                  </motion.span>
                )}
                {i !== 1 && <Check className="h-4 w-4 text-emerald-300/70" />}
              </div>
            ))}
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="t3" {...fade} className="flex h-full items-center justify-center gap-3 pt-2">
            <Users className="h-8 w-8 text-white/50" />
            <ArrowRight className="h-4 w-4 text-white/40" />
            <motion.div initial={{ rotate: -6, scale: 0.85 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring" }} className="flex h-16 w-14 items-center justify-center rounded-lg border border-white/20 bg-white/10">
              <FileCheck className="h-7 w-7 text-cyan-200" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Frame>
  );
}

const STAGES: Record<PipPlan, { Stage: (p: { step: number }) => ReactElement; steps: number; ms: number; still: number }> = {
  personal: { Stage: PersonalStage, steps: 4, ms: 3600, still: 1 },
  pro: { Stage: ProStage, steps: 3, ms: 3600, still: 1 },
  business: { Stage: TeamsStage, steps: 4, ms: 3200, still: 2 },
};

/** Wide enough for the window to sit beside the plan cards instead of over them. */
const SIDE_QUERY = "(min-width: 1360px)";

function useSideSpace() {
  const [side, setSide] = useState(() => typeof window !== "undefined" && window.matchMedia(SIDE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(SIDE_QUERY);
    const on = () => setSide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return side;
}

export function FeaturePip({ plan, onClose, onSignUp, onSignIn }: { plan: PipPlan; onClose: () => void; onSignUp: () => void; onSignIn: () => void }) {
  const { t } = useTranslation();
  const side = useSideSpace();
  const bounds = useRef<HTMLDivElement>(null);
  const { Stage, steps, ms, still } = STAGES[plan];
  const step = useLoop(steps, ms, still);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const k = `story.pip.${plan}`;
  return (
    <div ref={bounds} className="pointer-events-none fixed inset-0 z-40">
      <div className={`absolute flex ${side ? "inset-y-0 right-6 items-center" : "inset-x-0 bottom-16 justify-center sm:bottom-20"}`}>
      <motion.aside
        key={side ? "side" : "sheet"}
        role="dialog"
        aria-label={t(`${k}.title`)}
        drag={side}
        dragConstraints={bounds}
        dragMomentum={false}
        dragElastic={0.08}
        initial={side ? { opacity: 0, x: 60, scale: 0.94 } : { opacity: 0, y: 80 }}
        animate={side ? { opacity: 1, x: 0, scale: 1 } : { opacity: 1, y: 0 }}
        exit={side ? { opacity: 0, x: 60, scale: 0.94 } : { opacity: 0, y: 80 }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        className={`pointer-events-auto rounded-2xl border border-cyan-300/30 bg-[#070d18]/95 p-3 shadow-[0_30px_90px_rgba(0,0,0,0.7)] backdrop-blur-xl ${
          side ? "w-[clamp(300px,calc((100vw-780px)/2-24px),420px)] cursor-grab active:cursor-grabbing" : "w-[min(94vw,440px)]"
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan-200">
            <motion.span className="h-1.5 w-1.5 rounded-full bg-cyan-300" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
            {t("story.pip.preview")}
          </span>
          <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-white">{t(`${k}.title`)}</h3>
          <button onClick={onClose} aria-label={t("story.pip.close")} className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-[168px] sm:h-[190px]">
          <Stage step={step} />
        </div>

        <div className="mt-2 flex items-center gap-3">
          <p aria-live="off" className="min-h-[2.2rem] flex-1 text-xs leading-snug text-white/75">
            {t(`${k}.s${step + 1}`)}
          </p>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: steps }, (_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-4 bg-cyan-300" : "w-1.5 bg-white/25"}`} />
            ))}
          </div>
        </div>

        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex gap-2">
            <button onClick={onSignUp} className="flex-1 rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">
              {t("story.pip.signUp")}
            </button>
            <button onClick={onSignIn} className="flex-1 rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10">
              {t("story.pip.signIn")}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-white/45">{t("story.pip.hint")}</p>
        </div>
      </motion.aside>
      </div>
    </div>
  );
}
