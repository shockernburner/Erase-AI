import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Mail, Mouse } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import AuthForm from "@/components/AuthForm";
import { BrandLogo } from "@/components/BrandLogo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useSeoMeta } from "@/pages/seo/useSeoMeta";
import { chromeStoreLink } from "@/lib/extensionStore";
import { ANDROID_PLAY_URL, peekPricingFocus, setPricingFocus } from "@/lib/products";
import type { PricingTierId } from "@/lib/pricingPlans";
import { useSceneNavigation } from "@/components/landing/useSceneNavigation";
import { HeadlinesScene } from "@/components/landing/HeadlinesScene";
import { LeakFlowScene } from "@/components/landing/LeakFlowScene";
import { WhyNowScene } from "@/components/landing/WhyNowScene";
import { BrandScene } from "@/components/landing/BrandScene";
import { PlansScene, type PlanActions } from "@/components/landing/PlansScene";
import { StartScene } from "@/components/landing/StartScene";
import { CONTACT, LANDING_PLANS } from "@/components/landing/landingData";

// The public homepage plays like a film: the page itself never scrolls.
// Scrolling (wheel, swipe, arrow keys) moves to the next frame in place and
// scrolling up goes back. Frames: the headlines → how data leaks through AI →
// why now → what EraseAI is → plans with checkout → start and contact.
// Docs, blogs and the rest live behind sign-in.

type PreviewMode = "developer" | "enterprise" | "personal" | null;

const SCENES = [
  { id: "headlines", steps: 2 },
  { id: "leak", steps: 1 },
  { id: "now", steps: 1 },
  { id: "eraseai", steps: 3 },
  { id: "plans", steps: LANDING_PLANS.length },
  { id: "start", steps: 1 },
] as const;

const FRAMES = SCENES.flatMap((s, scene) => Array.from({ length: s.steps }, (_, step) => ({ scene, step })));
const PLANS_SCENE = SCENES.findIndex((s) => s.id === "plans");
const firstFrameOf = (scene: number) => FRAMES.findIndex((f) => f.scene === scene);

// Read at load: App rewrites /pricing to / before this page first renders.
const LANDED_ON_PRICING = typeof window !== "undefined" && /\/pricing\/?$/.test(window.location.pathname);

function initialFrame(): number {
  // eraseai.ai/pricing and a plan picked earlier open on the plans.
  const focus = peekPricingFocus();
  if (!focus && !LANDED_ON_PRICING) return 0;
  const planIdx = Math.max(0, LANDING_PLANS.findIndex((p) => p.id === focus));
  return firstFrameOf(PLANS_SCENE) + planIdx;
}

export default function PublicLanding({ onPreview }: { onPreview: (mode: PreviewMode) => void }) {
  const reduce = useReducedMotion();
  const { t } = useTranslation();
  const [auth, setAuth] = useState<null | "login" | "signup">(null);
  // Plan picked before signing up; after sign-up the app opens checkout on it.
  const [chosenPlan, setChosenPlan] = useState<PricingTierId | null>(() => peekPricingFocus());
  const startAt = useMemo(initialFrame, []);
  const { index, direction, goTo, step } = useSceneNavigation(FRAMES.length, { initial: startAt, paused: auth !== null });
  const frame = FRAMES[index];
  const scene = SCENES[frame.scene];
  const baseUrl = import.meta.env.BASE_URL;

  useSeoMeta({
    title: "EraseAI — Use AI without leaking your data",
    description:
      "EraseAI erases names, card numbers, API keys and private files from what you send to ChatGPT, Claude, Gemini and other AI, right at the Send button.",
    url: "https://eraseai.ai",
    keywords:
      "AI firewall, ChatGPT data leak prevention, Claude privacy, Gemini privacy, LLM security, prompt scanning, PII detection, API key detection, AI DLP, AI privacy tool",
  });

  // The page is a fixed stage; stop the document from scrolling underneath.
  useEffect(() => {
    const html = document.documentElement;
    const prev = { o: html.style.overflow, b: document.body.style.overflow, ob: html.style.overscrollBehavior };
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prev.o;
      document.body.style.overflow = prev.b;
      html.style.overscrollBehavior = prev.ob;
    };
  }, []);

  const contact = () => {
    window.location.href = `${baseUrl}contact`;
  };
  const openExternal = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  const planActions: PlanActions = {
    onCheckout: (plan) => {
      if (plan.id === "enterprise") return contact();
      setPricingFocus(plan.id);
      setChosenPlan(plan.id);
      setAuth("signup");
    },
    extra: (plan) => {
      switch (plan.id) {
        case "personal":
          return [
            { label: t("story.plans.extraChrome"), onClick: () => openExternal(chromeStoreLink("landing-plan-personal")) },
            { label: t("story.plans.extraAndroid"), onClick: () => openExternal(ANDROID_PLAY_URL) },
          ];
        case "pro":
          return [{ label: t("story.plans.extraPreview"), onClick: () => onPreview("developer") }];
        case "business":
          return [{ label: t("story.plans.extraAdmin"), onClick: () => onPreview("enterprise") }];
        case "enterprise":
          return [{ label: t("story.plans.extraWhatsapp", { number: CONTACT.whatsappLabel }), onClick: () => openExternal(CONTACT.whatsappUrl) }];
      }
    },
  };

  const variants = {
    enter: (dir: number) => (reduce ? { opacity: 0 } : { opacity: 0, scale: dir > 0 ? 1.08 : 0.94 }),
    center: { opacity: 1, scale: 1 },
    exit: (dir: number) => (reduce ? { opacity: 0 } : { opacity: 0, scale: dir > 0 ? 0.94 : 1.08 }),
  };

  function renderScene() {
    switch (scene.id) {
      case "headlines":
        return <HeadlinesScene step={frame.step} />;
      case "leak":
        return <LeakFlowScene />;
      case "now":
        return <WhyNowScene />;
      case "eraseai":
        return <BrandScene step={frame.step} />;
      case "plans":
        return <PlansScene step={frame.step} onSelect={(i) => goTo(firstFrameOf(PLANS_SCENE) + i)} actions={planActions} />;
      case "start":
        return <StartScene onSignUp={() => setAuth("signup")} onPlans={() => goTo(firstFrameOf(PLANS_SCENE))} />;
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#03060c] text-white">
      {/* Ambient backdrop shared by every frame. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(14,116,144,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
        <button onClick={() => goTo(0)} className="flex items-center gap-2.5" aria-label={t("story.nav.home")}>
          <BrandLogo className="h-9 w-9" />
          <span className="hidden font-display text-lg font-bold tracking-tight sm:inline">EraseAI</span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <a href={`${baseUrl}contact`} className="hidden items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white sm:flex">
            <Mail className="h-4 w-4" />
            {t("story.nav.contact")}
          </a>
          <LanguageSelector />
          <button onClick={() => setAuth("login")} className="whitespace-nowrap rounded-full px-2 py-1.5 text-sm font-semibold text-white/85 hover:text-white sm:px-3">
            {t("story.nav.signIn")}
          </button>
          <button onClick={() => setAuth("signup")} className="whitespace-nowrap rounded-full bg-cyan-400 px-3 py-1.5 text-sm font-bold sm:px-4 text-slate-950 transition hover:bg-cyan-300">
            {t("story.nav.signUp")}
          </button>
        </div>
      </header>

      {/* Stage */}
      <main className="absolute inset-0">
        <AnimatePresence custom={direction} initial={false}>
          <motion.section
            key={scene.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduce ? 0.2 : 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-0"
            aria-label={t(`story.chapters.${scene.id}`)}
          >
            {renderScene()}
          </motion.section>
        </AnimatePresence>
      </main>

      {/* Scroll cue on the first frame */}
      <AnimatePresence>
        {index === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.2 }}
            className="pointer-events-none absolute bottom-[6.5rem] left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60 sm:bottom-[7.25rem]"
          >
            <Mouse className="hidden h-5 w-5 sm:block" />
            <motion.span animate={reduce ? undefined : { y: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="flex items-center gap-1">
              <span className="sm:hidden">{t("story.swipe")}</span>
              <span className="hidden sm:inline">{t("story.scroll")}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prev / next */}
      <div className="absolute right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        <button onClick={() => step(-1)} disabled={index === 0} aria-label={t("story.nav.previous")} className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 backdrop-blur transition hover:text-white disabled:opacity-30">
          <ChevronUp className="h-4 w-4" />
        </button>
        <button onClick={() => step(1)} disabled={index === FRAMES.length - 1} aria-label={t("story.nav.next")} className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 backdrop-blur transition hover:text-white disabled:opacity-30">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Timeline: chapters like a film scrubber. */}
      <nav aria-label={t("story.nav.chapters")} className="absolute inset-x-0 bottom-0 z-30 px-4 pb-3 pt-2 sm:px-8 sm:pb-4">
        <div className="mx-auto flex max-w-4xl gap-1.5 sm:gap-2">
          {SCENES.map((s, si) => {
            const done = si < frame.scene;
            const current = si === frame.scene;
            const fill = done ? 1 : current ? (frame.step + 1) / s.steps : 0;
            return (
              <button key={s.id} onClick={() => goTo(firstFrameOf(si))} className="group flex-1 text-left" aria-current={current ? "step" : undefined}>
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full rounded-full bg-cyan-400" animate={{ width: `${fill * 100}%` }} transition={{ duration: 0.5 }} />
                </div>
                <span
                  className={`mt-1.5 block truncate text-[10px] font-semibold uppercase tracking-wider transition sm:text-[11px] ${
                    current ? "text-white" : "hidden text-white/40 group-hover:text-white/70 sm:block"
                  }`}
                >
                  {t(`story.chapters.${s.id}`)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sign in / sign up */}
      <Dialog open={auth !== null} onOpenChange={(open) => !open && setAuth(null)}>
        <DialogContent className="max-h-[92dvh] max-w-md overflow-y-auto rounded-3xl border-white/10 bg-[#070c14] p-6 sm:p-8">
          <DialogTitle className="text-center font-display text-2xl font-bold text-white">
            {t(auth === "signup" ? "story.auth.signupTitle" : "story.auth.loginTitle")}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-white/60">
            {chosenPlan && chosenPlan !== "free"
              ? t("story.auth.picked", { plan: t(`story.plans.${chosenPlan}.name`) })
              : t("story.auth.default")}
          </DialogDescription>
          {auth && <AuthForm key={auth} initialMode={auth} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
