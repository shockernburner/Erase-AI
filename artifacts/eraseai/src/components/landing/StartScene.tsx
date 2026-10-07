import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, Mail, MessageCircle, MessagesSquare, Smartphone } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { chromeStoreLink } from "@/lib/extensionStore";
import { ANDROID_PLAY_URL } from "@/lib/products";
import { CONTACT } from "./landingData";

export function StartScene({ onSignUp, onPlans }: { onSignUp: () => void; onPlans: () => void }) {
  const base = import.meta.env.BASE_URL;
  const { t } = useTranslation();
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-4 pb-24 pt-20 text-center sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.22),transparent_55%)]" />

      <motion.div initial={{ opacity: 0, scale: 0.6, rotate: -20 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 120, damping: 14 }} className="relative z-10 hidden sm:block">
        <BrandLogo className="h-16 w-16 shadow-[0_0_50px_rgba(34,211,238,0.45)] sm:h-20 sm:w-20" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 font-display text-4xl sm:mt-6 font-extrabold text-white sm:text-6xl"
      >
        {t("story.start.title")} <span className="bg-gradient-to-r from-cyan-300 to-sky-500 bg-clip-text text-transparent">{t("story.start.titleAccent")}</span>
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 mt-6 flex w-full max-w-md sm:mt-8 flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center"
      >
        <a
          href={chromeStoreLink("landing-start")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
        >
          {t("story.start.chrome")}
          <ArrowRight className="h-4 w-4" />
        </a>
        <a
          href={ANDROID_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <Smartphone className="h-4 w-4" />
          {t("story.start.android")}
        </a>
        <button
          onClick={onSignUp}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          {t("story.start.account")}
        </button>
      </motion.div>
      <button onClick={onPlans} className="relative z-10 mt-3 text-xs font-semibold text-white/50 underline-offset-4 hover:text-white hover:underline">
        {t("story.start.plansAgain")}
      </button>
      <a href={`${base}learn`} className="relative z-10 mt-2 text-xs font-semibold text-white/50 underline-offset-4 hover:text-white hover:underline">
        {t("story.start.learn")}
      </a>

      {/* Contact */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="relative z-10 mt-6 grid w-full max-w-md grid-cols-1 gap-2 sm:mt-10 sm:max-w-3xl sm:grid-cols-3 sm:gap-3"
      >
        <a href={CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-left sm:py-4 transition hover:border-green-400/40 hover:bg-white/10">
          <MessageCircle className="h-5 w-5 shrink-0 text-green-400" />
          <span>
            <span className="block text-[10px] uppercase tracking-widest text-white/40">{t("story.start.whatsapp")}</span>
            <span className="text-sm font-semibold text-white">{CONTACT.whatsappLabel}</span>
          </span>
        </a>
        <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-left sm:py-4 transition hover:border-cyan-400/40 hover:bg-white/10">
          <Mail className="h-5 w-5 shrink-0 text-cyan-300" />
          <span className="min-w-0">
            <span className="block text-[10px] uppercase tracking-widest text-white/40">{t("story.start.email")}</span>
            <span className="block truncate text-sm font-semibold text-white">{CONTACT.email}</span>
          </span>
        </a>
        <a href={`${base}contact`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-left sm:py-4 transition hover:border-violet-400/40 hover:bg-white/10">
          <MessagesSquare className="h-5 w-5 shrink-0 text-violet-300" />
          <span>
            <span className="block text-[10px] uppercase tracking-widest text-white/40">{t("story.start.sales")}</span>
            <span className="text-sm font-semibold text-white">{t("story.start.form")}</span>
          </span>
        </a>
      </motion.div>

      <div className="relative z-10 mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-white/40">
        <span>© {new Date().getFullYear()} {t("story.start.company")}</span>
        <a href={`${base}privacy`} className="hover:text-white">{t("story.start.privacy")}</a>
        <a href={`${base}terms`} className="hover:text-white">{t("story.start.terms")}</a>
        <a href={`${base}license`} className="hover:text-white">{t("story.start.license")}</a>
      </div>
    </div>
  );
}
