import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, Building2, Check, AppWindow, CodeXml, Smartphone, Users, type LucideIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { LANDING_PLANS, PLAN_FEATURE_KEYS, type LandingPlan } from "./landingData";

const FACES: Record<LandingPlan["object"], { icons: LucideIcon[]; color: string; glow: string }> = {
  devices: { icons: [AppWindow, Smartphone, AppWindow, Smartphone], color: "from-cyan-400/40 to-sky-700/30", glow: "rgba(34,211,238,0.45)" },
  code: { icons: [CodeXml, CodeXml, CodeXml, CodeXml], color: "from-violet-400/40 to-indigo-700/30", glow: "rgba(167,139,250,0.45)" },
  team: { icons: [Users, Users, Users, Users], color: "from-emerald-400/40 to-teal-700/30", glow: "rgba(52,211,153,0.45)" },
  building: { icons: [Building2, Building2, Building2, Building2], color: "from-amber-300/40 to-orange-700/30", glow: "rgba(251,191,36,0.45)" },
};

/** A glass cube that turns slowly, one icon per side. */
function Cube({ kind, spinning }: { kind: LandingPlan["object"]; spinning: boolean }) {
  const reduce = useReducedMotion();
  const s = 72;
  const face = FACES[kind];
  const sides = [
    `rotateY(0deg) translateZ(${s / 2}px)`,
    `rotateY(90deg) translateZ(${s / 2}px)`,
    `rotateY(180deg) translateZ(${s / 2}px)`,
    `rotateY(270deg) translateZ(${s / 2}px)`,
  ];
  return (
    <div className="relative mx-auto flex h-28 w-28 items-center justify-center [perspective:600px]">
      <div className="absolute bottom-1 h-4 w-20 rounded-full blur-md" style={{ background: face.glow }} />
      <motion.div
        className="relative [transform-style:preserve-3d]"
        style={{ width: s, height: s }}
        initial={{ rotateX: -18, rotateY: 20 }}
        animate={spinning && !reduce ? { rotateY: [20, 380], y: [0, -6, 0] } : { rotateY: 20 }}
        transition={spinning && !reduce ? { rotateY: { duration: 10, repeat: Infinity, ease: "linear" }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } } : { duration: 0.6 }}
      >
        {sides.map((transform, i) => {
          const Icon = face.icons[i];
          return (
            <div
              key={i}
              className={`absolute inset-0 flex items-center justify-center rounded-xl border border-white/25 bg-gradient-to-br ${face.color} backdrop-blur-sm`}
              style={{ transform }}
            >
              <Icon className="h-8 w-8 text-white" strokeWidth={1.6} />
            </div>
          );
        })}
        <div className="absolute inset-0 rounded-xl border border-white/20 bg-white/10" style={{ transform: `rotateX(90deg) translateZ(${s / 2}px)` }} />
        <div className="absolute inset-0 rounded-xl border border-white/10 bg-black/30" style={{ transform: `rotateX(-90deg) translateZ(${s / 2}px)` }} />
      </motion.div>
    </div>
  );
}

export interface PlanActions {
  onCheckout: (plan: LandingPlan) => void;
  extra: (plan: LandingPlan) => { label: string; onClick: () => void }[];
}

function PlanCard({ plan, active, actions }: { plan: LandingPlan; active: boolean; actions: PlanActions }) {
  const { t } = useTranslation();
  const k = `story.plans.${plan.id}`;
  const price = plan.monthly == null ? t("story.plans.custom") : `$${plan.monthly}`;
  const unit = plan.monthly == null ? "" : t(plan.perPerson ? "story.plans.perPersonMonth" : "story.plans.perMonth");
  const yearly =
    plan.monthly == null
      ? t("story.plans.customNote")
      : t(plan.yearlyIsMonthly ? "story.plans.yearlyPerPerson" : "story.plans.yearly", { price: plan.yearly });
  return (
    <div
      className={`flex h-full flex-col rounded-3xl border p-5 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-6 ${
        active ? "border-cyan-300/40 bg-[#0b1626]/95" : "border-white/10 bg-[#0b1220]/80"
      }`}
    >
      <Cube kind={plan.object} spinning={active} />
      <div data-scroll-inner className="-mx-1 mt-2 flex-1 overflow-y-auto px-1">
        <h3 className="font-display text-2xl font-extrabold text-white">{t(`${k}.name`)}</h3>
        <p className="mt-0.5 text-xs text-cyan-200/80">{t(`${k}.tagline`)}</p>
        <p className="mt-3 font-display text-4xl font-extrabold text-white">
          {price}
          <span className="ml-1 text-sm font-medium text-white/50">{unit}</span>
        </p>
        <p className="text-[11px] text-white/45">{yearly}</p>
        <ul className="mt-4 space-y-2 text-left text-[13px] leading-snug text-white/80">
          {PLAN_FEATURE_KEYS.map((f) => (
            <li key={f} className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
              {t(`${k}.${f}`)}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={() => actions.onCheckout(plan)}
        tabIndex={active ? 0 : -1}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
      >
        {t("story.plans.checkout")}
        <ArrowRight className="h-4 w-4" />
      </button>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {actions.extra(plan).map((x) => (
          <button key={x.label} onClick={x.onClick} tabIndex={active ? 0 : -1} className="text-xs font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline">
            {x.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PlansScene({ step, onSelect, actions }: { step: number; onSelect: (i: number) => void; actions: PlanActions }) {
  const mobile = useIsMobile();
  const { t } = useTranslation();
  const spacing = mobile ? 210 : 330;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-2 pb-20 pt-16 sm:pb-24 sm:pt-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_70%,rgba(6,182,212,0.16),transparent_60%)]" />
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center font-display text-3xl font-extrabold text-white sm:text-5xl"
      >
        {t("story.plans.title")}
      </motion.h2>

      <div role="tablist" aria-label={t("story.plans.tabs")} className="relative z-10 mt-4 flex gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
        {LANDING_PLANS.map((p, i) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={i === step}
            onClick={() => onSelect(i)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${i === step ? "bg-cyan-400 text-slate-950" : "text-white/70 hover:text-white"}`}
          >
            {t(`story.plans.${p.id}.name`)}
          </button>
        ))}
      </div>

      <div className="relative z-10 mt-4 h-[min(560px,68dvh)] w-full [perspective:1400px] sm:mt-6">
        {LANDING_PLANS.map((plan, i) => {
          const offset = i - step;
          const abs = Math.abs(offset);
          return (
            <motion.div
              key={plan.id}
              className="absolute left-1/2 top-0 h-full w-[min(82vw,340px)] [transform-style:preserve-3d]"
              style={{ marginLeft: "calc(min(82vw, 340px) / -2)", zIndex: 10 - abs, pointerEvents: abs > 1.5 ? "none" : "auto" }}
              animate={{
                x: offset * spacing,
                z: -abs * 240,
                rotateY: -offset * 38,
                opacity: abs > 1.5 ? 0 : 1 - abs * 0.45,
                filter: abs ? "blur(1.5px) brightness(0.7)" : "blur(0px) brightness(1)",
              }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              onClick={offset !== 0 ? () => onSelect(i) : undefined}
              aria-hidden={offset !== 0}
            >
              <div className={offset === 0 ? "h-full" : "pointer-events-none h-full"}>
                <PlanCard plan={plan} active={offset === 0} actions={actions} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
