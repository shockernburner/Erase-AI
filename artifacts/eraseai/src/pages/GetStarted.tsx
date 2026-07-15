import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Shield,
  Database,
  Code2,
  ArrowRight,
  Lock,
  Clock,
  Sparkles,
  LayoutDashboard,
  BarChart3,
  User,
} from "lucide-react";
import type { AppView } from "@/components/AppShell";

const API_ELIGIBLE_PLANS = ["pro", "business", "enterprise"];

function ProductCard({
  icon,
  iconClass,
  title,
  desc,
  timeBadge,
  cta,
  onClick,
  locked,
  lockedNote,
  delay,
  testId,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  desc: string;
  timeBadge: string;
  cta: string;
  onClick: () => void;
  locked?: boolean;
  lockedNote?: string;
  delay: number;
  testId: string;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      data-testid={testId}
      className={`group relative flex flex-col text-left bg-card/60 border rounded-2xl p-6 transition-all ${
        locked
          ? "border-border/30 opacity-80 hover:border-yellow-500/40"
          : "border-border/40 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconClass}`}>
        {icon}
      </div>

      <h3 className="text-lg font-bold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{desc}</p>

      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/30 text-muted-foreground text-xs font-medium">
          <Clock className="w-3 h-3" />
          {timeBadge}
        </span>
        {locked && lockedNote && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-semibold">
            <Lock className="w-3 h-3" />
            {lockedNote}
          </span>
        )}
      </div>

      <span
        className={`inline-flex items-center gap-2 text-sm font-bold transition-all ${
          locked ? "text-yellow-400" : "text-primary group-hover:gap-3"
        }`}
      >
        {cta}
        <ArrowRight className="w-4 h-4" />
      </span>
    </motion.button>
  );
}

export default function GetStarted({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const plan = user?.planType || "free";
  const apiEligible = API_ELIGIBLE_PLANS.includes(plan);
  const analyticsEligible = plan === "business" || plan === "enterprise";

  const firstName = user?.firstName;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-16 pb-16">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 md:mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          {firstName
            ? t("getStarted.welcomeName", { name: firstName })
            : t("getStarted.welcome")}
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          {t("getStarted.title")}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
          {t("getStarted.subtitle")}
        </p>
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-10">
        <ProductCard
          icon={<Shield className="w-6 h-6" />}
          iconClass="bg-red-500/15 text-red-400 border border-red-500/30"
          title={t("getStarted.firewall.title")}
          desc={t("getStarted.firewall.desc")}
          timeBadge={t("getStarted.firewall.time")}
          cta={t("getStarted.firewall.cta")}
          onClick={() => onNavigate("firewallSetup")}
          delay={0.05}
          testId="get-started-firewall"
        />
        <ProductCard
          icon={<Database className="w-6 h-6" />}
          iconClass="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          title={t("getStarted.sanitizer.title")}
          desc={t("getStarted.sanitizer.desc")}
          timeBadge={t("getStarted.sanitizer.time")}
          cta={t("getStarted.sanitizer.cta")}
          onClick={() => onNavigate("datasetSanitizer")}
          delay={0.1}
          testId="get-started-sanitizer"
        />
        <ProductCard
          icon={<Code2 className="w-6 h-6" />}
          iconClass="bg-violet-500/15 text-violet-400 border border-violet-500/30"
          title={t("getStarted.api.title")}
          desc={t("getStarted.api.desc")}
          timeBadge={t("getStarted.api.time")}
          cta={apiEligible ? t("getStarted.api.cta") : t("getStarted.api.upgradeCta")}
          onClick={() => onNavigate(apiEligible ? "apiSetup" : "pricing")}
          locked={!apiEligible}
          lockedNote={t("getStarted.api.lockedNote")}
          delay={0.15}
          testId="get-started-api"
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="border-t border-border/30 pt-6"
      >
        <p className="text-xs text-muted-foreground/70 font-semibold uppercase tracking-wider mb-3">
          {t("getStarted.shortcuts")}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate("personal")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card/60 border border-border/30 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            data-testid="get-started-shortcut-personal"
          >
            <User className="w-4 h-4" />
            {t("getStarted.shortcutPersonal")}
          </button>
          {apiEligible && (
            <button
              onClick={() => onNavigate("developer")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card/60 border border-border/30 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
              data-testid="get-started-shortcut-developer"
            >
              <LayoutDashboard className="w-4 h-4" />
              {t("getStarted.shortcutDeveloper")}
            </button>
          )}
          {analyticsEligible && (
            <button
              onClick={() => onNavigate("analytics")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card/60 border border-border/30 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
              data-testid="get-started-shortcut-analytics"
            >
              <BarChart3 className="w-4 h-4" />
              {t("getStarted.shortcutAnalytics")}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
