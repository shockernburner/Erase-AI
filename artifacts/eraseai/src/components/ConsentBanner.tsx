import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getConsent, privacySignalOn, setConsent } from "@/lib/analytics";

/** One-time choice about Google Analytics and ad measurement. Hidden once chosen, or when the browser sends a privacy signal. */
export function ConsentBanner() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(() => !privacySignalOn() && getConsent() === null);
  if (!open) return null;

  const choose = (granted: boolean) => {
    setConsent(granted);
    setOpen(false);
  };

  return (
    <div
      role="region"
      aria-label={t("consent.label")}
      className="fixed inset-x-2 bottom-2 z-[60] flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0a1220]/95 p-3 text-sm text-white sm:block sm:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-sm"
    >
      <p className="flex-1 text-xs leading-snug text-white/80 sm:text-sm sm:leading-relaxed">
        {t("consent.text")}{" "}
        <a href={`${import.meta.env.BASE_URL}privacy`} className="font-semibold text-cyan-300 underline-offset-4 hover:underline">
          {t("consent.policy")}
        </a>
      </p>
      <div className="flex shrink-0 flex-col gap-1.5 sm:mt-3 sm:flex-row sm:gap-2">
        <button onClick={() => choose(true)} className="rounded-full bg-cyan-400 px-3 py-1.5 text-xs font-bold sm:flex-1 sm:px-4 sm:py-2 sm:text-sm text-slate-950 transition hover:bg-cyan-300">
          {t("consent.accept")}
        </button>
        <button onClick={() => choose(false)} className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold sm:flex-1 sm:px-4 sm:py-2 sm:text-sm text-white/90 transition hover:bg-white/10">
          {t("consent.decline")}
        </button>
      </div>
    </div>
  );
}
