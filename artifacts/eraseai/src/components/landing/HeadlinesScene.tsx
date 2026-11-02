import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Archive,
  CodeXml,
  CreditCard,
  Database,
  Dna,
  Flame,
  Globe,
  Mail,
  Scale,
  Search,
  ShieldAlert,
  Video,
  type LucideIcon,
} from "lucide-react";
import { LEAK_CLIPS, MISUSE_CLIPS, TICKER_KEYS, type ClipIcon, type NewsClip } from "./landingData";

const ICONS: Record<ClipIcon, LucideIcon> = {
  code: CodeXml,
  card: CreditCard,
  database: Database,
  search: Search,
  globe: Globe,
  dna: Dna,
  flame: Flame,
  video: Video,
  scale: Scale,
  archive: Archive,
  alert: ShieldAlert,
  mail: Mail,
};

const TONES: Record<NewsClip["tone"], string> = {
  red: "from-red-600/50 via-red-950/40",
  amber: "from-amber-500/40 via-orange-950/40",
  violet: "from-violet-600/45 via-indigo-950/40",
  cyan: "from-cyan-500/40 via-sky-950/40",
};

function monthLabel(month: string, lang: string) {
  const [y, m] = month.split("-").map(Number);
  try {
    return new Intl.DateTimeFormat(lang, { month: "short", year: "numeric" }).format(new Date(y, m - 1, 1));
  } catch {
    return month;
  }
}

function Clip({ clip, i }: { clip: NewsClip; i: number }) {
  const reduce = useReducedMotion();
  const { t, i18n } = useTranslation();
  const Icon = ICONS[clip.icon];
  return (
    <motion.figure
      initial={{ opacity: 0, y: 30, rotateX: 18, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.96 }}
      transition={{ duration: 0.6, delay: reduce ? 0 : 0.12 * i, ease: [0.2, 0.8, 0.2, 1] }}
      className={`relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.6)] ${i >= 4 ? "hidden md:block" : ""}`}
    >
      {/* "Footage": a slow Ken Burns drift over a glowing subject. */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${TONES[clip.tone]} to-black`}
        animate={reduce ? undefined : { scale: [1, 1.12, 1], x: ["0%", "-3%", "0%"] }}
        transition={{ duration: 14 + i, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className="absolute right-[8%] top-[10%] h-[58%] w-[58%] text-white/15" strokeWidth={1} />
      </motion.div>
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_3px)]" />
      <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white sm:text-[10px]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        {t("story.headlines.news")}
      </div>
      <div className="absolute right-2 top-2 font-mono text-[9px] text-white/60 sm:text-[10px]">{monthLabel(clip.month, i18n.language)}</div>

      {/* Lower third, like a TV chyron. */}
      <figcaption className="absolute inset-x-0 bottom-0">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5, delay: reduce ? 0 : 0.12 * i + 0.35, ease: "easeOut" }}
          className="mx-2 mb-2 overflow-hidden rounded-md"
        >
          <div className="bg-white px-2 py-1 font-serif text-[11px] font-bold leading-tight text-black sm:text-[13px] lg:text-sm">{t(`story.headlines.${clip.key}`)}</div>
          <div className="bg-red-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white sm:text-[10px]">{clip.outlet}</div>
        </motion.div>
        <div className="h-0.5 w-full bg-white/10">
          <motion.div
            className="h-full bg-red-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 9 + i, ease: "linear", repeat: Infinity }}
          />
        </div>
      </figcaption>
    </motion.figure>
  );
}

export function HeadlinesScene({ step }: { step: number }) {
  const reduce = useReducedMotion();
  const { t } = useTranslation();
  const clips = step === 0 ? LEAK_CLIPS : MISUSE_CLIPS;
  const title = t(step === 0 ? "story.headlines.titleLeaks" : "story.headlines.titleMisuse");
  const ticker = TICKER_KEYS.map((k) => t(`story.headlines.ticker.${k}`));

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-4 pb-28 pt-20 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.18),transparent_60%)]" />

      <AnimatePresence mode="wait">
        <motion.h1
          key={title}
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -16, filter: "blur(8px)" }}
          transition={{ duration: 0.5 }}
          className="relative z-10 mb-6 text-center font-display text-3xl font-extrabold leading-tight text-white sm:mb-8 sm:text-5xl lg:text-6xl"
        >
          {title}
        </motion.h1>
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-6xl [perspective:1200px]">
        <AnimatePresence mode="wait">
          <motion.div key={step} className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3">
            {clips.map((clip, i) => (
              <Clip key={clip.key} clip={clip} i={i} />
            ))}
          </motion.div>
        </AnimatePresence>
        <p className="mt-3 text-center text-[10px] text-white/40">{t("story.headlines.note")}</p>
      </div>

      {/* Breaking ticker */}
      <div className="absolute inset-x-0 bottom-16 z-10 flex h-8 items-center overflow-hidden border-y border-red-500/30 bg-red-950/60 backdrop-blur sm:bottom-[4.5rem]">
        <div className="z-10 flex h-full shrink-0 items-center bg-red-600 px-3 text-[10px] font-black uppercase tracking-widest text-white">{t("story.headlines.breaking")}</div>
        <motion.div
          className="flex shrink-0 gap-10 whitespace-nowrap pl-6 text-xs font-semibold uppercase tracking-wider text-red-100/90"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {[...ticker, ...ticker].map((line, i) => (
            <span key={i} className="flex items-center gap-10">
              {line}
              <span className="text-red-500">●</span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
