import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ShieldX, ScrollText, FileCheck, Loader2, ExternalLink } from "lucide-react";

const CURRENT_TERMS_VERSION = "1.0";

interface TermsAcceptanceModalProps {
  onAccepted: () => void;
  onViewTerms: () => void;
  onViewLicense: () => void;
}

export default function TermsAcceptanceModal({ onAccepted, onViewTerms, onViewLicense }: TermsAcceptanceModalProps) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!checked) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/accept-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("legal.acceptError"));
        return;
      }

      onAccepted();
    } catch {
      setError(t("legal.acceptError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl"
      >
        <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2 text-center">
          {t("legal.acceptTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          {t("legal.acceptDesc")}
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={onViewTerms}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/20 transition-all text-left group"
          >
            <div className="bg-primary/10 p-2 rounded-lg shrink-0">
              <ScrollText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t("legal.tosTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("legal.tosSummary")}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
          </button>

          <button
            onClick={onViewLicense}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/20 transition-all text-left group"
          >
            <div className="bg-emerald-500/10 p-2 rounded-lg shrink-0">
              <FileCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t("legal.licenseTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("legal.licenseSummary")}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
          </button>
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer group">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-border bg-muted/20 text-primary focus:ring-primary/50 accent-primary cursor-pointer"
          />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            {t("legal.checkboxLabel")}
          </span>
        </label>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4"
          >
            {error}
          </motion.p>
        )}

        <button
          onClick={handleAccept}
          disabled={!checked || loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-cyan-400 text-black font-bold text-sm hover:from-primary/90 hover:to-cyan-400/90 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("legal.accepting")}
            </span>
          ) : (
            t("legal.acceptButton")
          )}
        </button>

        <p className="text-[10px] text-muted-foreground/50 text-center mt-4">
          {t("legal.version")} {CURRENT_TERMS_VERSION}
        </p>
      </motion.div>
    </motion.div>
  );
}

export { CURRENT_TERMS_VERSION };
