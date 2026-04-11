import { useState, useRef, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";
import {
  ShieldX,
  Globe,
  LogOut,
  Crown,
  LayoutDashboard,
  Play,
  Film,
  X,
  Clock,
  Key,
  BarChart3,
  Shield,
  Megaphone,
  Book,
  Code2,
  Award,
  ExternalLink,
  MessageCircle,
  Mail,
  Database,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  ScrollText,
  ShieldCheck,
  Phone,
} from "lucide-react";
import { FeedbackButton } from "@/components/FeedbackModal";
import { LanguageSelector } from "@/components/LanguageSelector";
import { motion, AnimatePresence } from "framer-motion";
import { DatasetSanitizer } from "@/pages/DatasetSanitizer";

type AppView = "home" | "pricing" | "checkout-success" | "admin" | "developer" | "analytics" | "personal" | "social" | "docs" | "devMode" | "certifications" | "firewallDocs" | "terms" | "license" | "privacy" | "contact";

function PlanBadge({ plan }: { plan: string }) {
  const { t } = useTranslation();
  if (plan === "personal") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
        <Crown className="w-3 h-3" />
        {t("plan.personal")}
      </span>
    );
  }
  if (plan === "pro") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
        <Crown className="w-3 h-3" />
        {t("plan.pro")}
      </span>
    );
  }
  if (plan === "business") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold">
        <Crown className="w-3 h-3" />
        {t("plan.business")}
      </span>
    );
  }
  if (plan === "enterprise") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
        <Crown className="w-3 h-3" />
        {t("plan.enterprise")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground text-xs font-medium">
      {t("plan.free")}
    </span>
  );
}

function getTrialDaysRemaining(planType: string | undefined, planEndDate: string | null | undefined): number | null {
  const plan = planType || "free";
  if (plan !== "free") return null;
  if (!planEndDate) return null;
  const end = new Date(planEndDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function UserMenu({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const plan = user.planType || "free";
  const trialDays = getTrialDaysRemaining(user.planType, user.planEndDate);
  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map(n => n![0])
    .join("")
    .toUpperCase() || t("home.userInitial");

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || t("home.userFallback");

  return (
    <div className="relative flex items-center gap-2">
      {trialDays !== null && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          trialDays === 0
            ? "bg-destructive/10 border-destructive/30 text-destructive"
            : trialDays <= 2
              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        }`}>
          <Clock className="w-3 h-3" />
          {trialDays === 0 ? t("trial.expiredShort") : t("trial.daysLeftShort", { count: trialDays })}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card/50 backdrop-blur-md hover:bg-muted/40 transition-all"
      >
        {user.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        )}
        <span className="text-sm font-medium text-foreground hidden sm:inline max-w-[120px] truncate">{displayName}</span>
        <PlanBadge plan={plan} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-card border border-border rounded-xl shadow-xl p-2 space-y-1">
            <div className="px-3 py-2 border-b border-border/30 mb-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground truncate flex-1">{displayName}</p>
                <PlanBadge plan={plan} />
              </div>
              {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
              {trialDays !== null && (
                <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${trialDays === 0 ? "text-destructive" : trialDays <= 2 ? "text-yellow-400" : "text-primary"}`}>
                  <Clock className="w-3 h-3" />
                  {trialDays === 0
                    ? t("trial.expired")
                    : t("trial.daysLeft", { count: trialDays })
                  }
                </div>
              )}
            </div>
            {user.role === "admin" && (
              <button
                onClick={() => { setOpen(false); onNavigate("admin"); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                {t("nav.adminDashboard")}
              </button>
            )}
            <button
              onClick={() => { setOpen(false); onNavigate("developer"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
            >
              <Key className="w-4 h-4" />
              {t("nav.developer")}
            </button>
            {(plan === "business" || plan === "enterprise") && (
              <button
                onClick={() => { setOpen(false); onNavigate("analytics"); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                {t("nav.analytics")}
              </button>
            )}
            <button
              onClick={() => { setOpen(false); onNavigate("personal"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
            >
              <Shield className="w-4 h-4" />
              {t("nav.personalMode")}
            </button>
            {user.email === "firdous.mahmood26@gmail.com" && (
              <button
                onClick={() => { setOpen(false); onNavigate("social"); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
              >
                <Megaphone className="w-4 h-4" />
                {t("nav.socialPosts")}
              </button>
            )}
            <button
              onClick={() => { setOpen(false); onNavigate("devMode"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-amber-500/10 hover:text-amber-400 transition-all"
            >
              <Code2 className="w-4 h-4" />
              {t("nav.devMode")}
            </button>
            <button
              onClick={() => { setOpen(false); onNavigate("firewallDocs"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <Shield className="w-4 h-4" />
              {t("nav.firewallDocs")}
            </button>
            <button
              onClick={() => { setOpen(false); onNavigate("docs"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
            >
              <Book className="w-4 h-4" />
              {t("nav.apiDocs")}
            </button>
            <button
              onClick={() => { setOpen(false); onNavigate("certifications"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400 transition-all"
            >
              <Award className="w-4 h-4" />
              {t("nav.certifications")}
            </button>
            <button
              onClick={() => { setOpen(false); onNavigate("terms"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all"
            >
              <ScrollText className="w-4 h-4" />
              {t("nav.termsLegal")}
            </button>
            <button
              onClick={() => { setOpen(false); onNavigate("privacy"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              {t("nav.privacyPolicy")}
            </button>
            <button
              onClick={() => { setOpen(false); onNavigate("contact"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all"
            >
              <Phone className="w-4 h-4" />
              {t("nav.contact")}
            </button>
            <button
              onClick={() => { setOpen(false); onNavigate("pricing"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all"
            >
              <Crown className="w-4 h-4" />
              {plan === "free" ? t("nav.upgradePlan") : t("nav.managePlan")}
            </button>
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="w-4 h-4" />
              {t("nav.logOut")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function VideoModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden border border-primary/30 shadow-[0_0_60px_rgba(6,182,212,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <iframe
          src="/how-it-works-video/"
          className="w-full h-full border-0"
          allow="autoplay"
          title={t("home.systemExplainer")}
        />
      </motion.div>
    </motion.div>
  );
}

function FounderPitchModal({ onClose }: { onClose: () => void }) {
  const pitchRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const hasUnmuted = useRef(false);

  const handlePlaying = useCallback(() => {
    if (!hasUnmuted.current && pitchRef.current) {
      hasUnmuted.current = true;
      try {
        pitchRef.current.muted = false;
        setIsMuted(false);
      } catch {
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (pitchRef.current) {
      const next = !pitchRef.current.muted;
      pitchRef.current.muted = next;
      setIsMuted(next);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <button
          onClick={toggleMute}
          className="absolute bottom-3 left-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <video
          ref={pitchRef}
          autoPlay
          playsInline
          muted
          controls
          preload="metadata"
          className="w-full h-full object-contain"
          src={`${import.meta.env.BASE_URL}videos/landing.mp4`}
          onPlaying={handlePlaying}
          onEnded={onClose}
        />
      </motion.div>
    </motion.div>
  );
}

interface DashboardCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
  view: AppView;
  content?: React.ReactNode;
}

function ExpandableCard({
  card,
  expanded,
  onToggle,
  onNavigate,
}: {
  card: DashboardCard;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (view: AppView) => void;
}) {
  return (
    <motion.div
      layout
      className={`rounded-2xl border ${card.borderColor} ${card.bgColor} backdrop-blur-sm overflow-hidden transition-all`}
    >
      <button
        onClick={onToggle}
        className="w-full p-6 text-left flex items-start gap-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className={`p-2.5 rounded-xl ${card.color} shrink-0`}>
          {card.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground mb-1">{card.title}</h3>
          <p className="text-sm text-muted-foreground">{card.description}</p>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-border/20 pt-4">
              {card.content ? (
                card.content
              ) : (
                <button
                  onClick={() => onNavigate(card.view)}
                  className="px-6 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all"
                >
                  {card.title}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Home({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showVideo, setShowVideo] = useState(false);
  const [showFounderPitch, setShowFounderPitch] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const plan = user?.planType || "free";

  const cards: DashboardCard[] = [
    {
      id: "sanitizer",
      icon: <Database className="w-6 h-6" />,
      title: t("home.sanitizerTitle"),
      description: t("home.sanitizerDesc"),
      color: "bg-cyan-500/20 text-cyan-400",
      borderColor: "border-cyan-500/30",
      bgColor: "bg-cyan-500/5",
      view: "home",
      content: <DatasetSanitizer onNavigatePricing={() => onNavigate("pricing")} />,
    },
    {
      id: "personal",
      icon: <Shield className="w-6 h-6" />,
      title: t("nav.personalMode"),
      description: t("home.personalDesc"),
      color: "bg-emerald-500/20 text-emerald-400",
      borderColor: "border-emerald-500/30",
      bgColor: "bg-emerald-500/5",
      view: "personal",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-emerald-400">{t("home.personalStat1Val")}</p><p className="text-xs text-muted-foreground">{t("home.personalStat1")}</p></div>
            <div className="bg-background/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-yellow-400">{t("home.personalStat2Val")}</p><p className="text-xs text-muted-foreground">{t("home.personalStat2")}</p></div>
            <div className="bg-background/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-red-400">{t("home.personalStat3Val")}</p><p className="text-xs text-muted-foreground">{t("home.personalStat3")}</p></div>
          </div>
          <p className="text-xs text-muted-foreground">{t("home.personalExpandedDesc")}</p>
          <button onClick={() => onNavigate("personal")} className="px-6 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all flex items-center gap-2"><ExternalLink className="w-4 h-4" />{t("home.openSection")}</button>
        </div>
      ),
    },
    {
      id: "developer",
      icon: <Key className="w-6 h-6" />,
      title: t("nav.developer"),
      description: t("home.devDesc"),
      color: "bg-amber-500/20 text-amber-400",
      borderColor: "border-amber-500/30",
      bgColor: "bg-amber-500/5",
      view: "developer",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-amber-400">{t("home.devStat1Val")}</p><p className="text-xs text-muted-foreground">{t("home.devStat1")}</p></div>
            <div className="bg-background/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-primary">{t("home.devStat2Val")}</p><p className="text-xs text-muted-foreground">{t("home.devStat2")}</p></div>
            <div className="bg-background/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-emerald-400">{t("home.devStat3Val")}</p><p className="text-xs text-muted-foreground">{t("home.devStat3")}</p></div>
          </div>
          <p className="text-xs text-muted-foreground">{t("home.devExpandedDesc")}</p>
          <button onClick={() => onNavigate("developer")} className="px-6 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-all flex items-center gap-2"><ExternalLink className="w-4 h-4" />{t("home.openSection")}</button>
        </div>
      ),
    },
    ...(plan === "business" || plan === "enterprise"
      ? [
          {
            id: "analytics",
            icon: <BarChart3 className="w-6 h-6" />,
            title: t("nav.analytics"),
            description: t("home.analyticsDesc"),
            color: "bg-violet-500/20 text-violet-400",
            borderColor: "border-violet-500/30",
            bgColor: "bg-violet-500/5",
            view: "analytics" as AppView,
            content: (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-background/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-violet-400">{t("home.analyticsStat1Val")}</p><p className="text-xs text-muted-foreground">{t("home.analyticsStat1")}</p></div>
                  <div className="bg-background/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-primary">{t("home.analyticsStat2Val")}</p><p className="text-xs text-muted-foreground">{t("home.analyticsStat2")}</p></div>
                  <div className="bg-background/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-emerald-400">{t("home.analyticsStat3Val")}</p><p className="text-xs text-muted-foreground">{t("home.analyticsStat3")}</p></div>
                </div>
                <p className="text-xs text-muted-foreground">{t("home.analyticsExpandedDesc")}</p>
                <button onClick={() => onNavigate("analytics")} className="px-6 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 text-sm font-medium hover:bg-violet-500/20 transition-all flex items-center gap-2"><ExternalLink className="w-4 h-4" />{t("home.openSection")}</button>
              </div>
            ),
          },
        ]
      : []),
    {
      id: "devMode",
      icon: <Code2 className="w-6 h-6" />,
      title: t("nav.devMode"),
      description: t("home.devModeDesc"),
      color: "bg-amber-500/20 text-amber-400",
      borderColor: "border-amber-500/30",
      bgColor: "bg-amber-500/5",
      view: "devMode",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("home.devModeExpandedDesc")}</p>
          <button onClick={() => onNavigate("devMode")} className="px-6 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-all flex items-center gap-2"><ExternalLink className="w-4 h-4" />{t("home.openSection")}</button>
        </div>
      ),
    },
    {
      id: "firewallDocs",
      icon: <Shield className="w-6 h-6" />,
      title: t("nav.firewallDocs"),
      description: t("home.firewallDesc"),
      color: "bg-red-500/20 text-red-400",
      borderColor: "border-red-500/30",
      bgColor: "bg-red-500/5",
      view: "firewallDocs",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("home.firewallExpandedDesc")}</p>
          <button onClick={() => onNavigate("firewallDocs")} className="px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all flex items-center gap-2"><ExternalLink className="w-4 h-4" />{t("home.openSection")}</button>
        </div>
      ),
    },
    {
      id: "docs",
      icon: <Book className="w-6 h-6" />,
      title: t("nav.apiDocs"),
      description: t("home.docsDesc"),
      color: "bg-blue-500/20 text-blue-400",
      borderColor: "border-blue-500/30",
      bgColor: "bg-blue-500/5",
      view: "docs",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("home.docsExpandedDesc")}</p>
          <button onClick={() => onNavigate("docs")} className="px-6 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-all flex items-center gap-2"><ExternalLink className="w-4 h-4" />{t("home.openSection")}</button>
        </div>
      ),
    },
    {
      id: "certifications",
      icon: <Award className="w-6 h-6" />,
      title: t("nav.certifications"),
      description: t("home.certsDesc"),
      color: "bg-emerald-500/20 text-emerald-400",
      borderColor: "border-emerald-500/30",
      bgColor: "bg-emerald-500/5",
      view: "certifications",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("home.certsExpandedDesc")}</p>
          <button onClick={() => onNavigate("certifications")} className="px-6 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all flex items-center gap-2"><ExternalLink className="w-4 h-4" />{t("home.openSection")}</button>
        </div>
      ),
    },
    {
      id: "pricing",
      icon: <Crown className="w-6 h-6" />,
      title: plan === "free" ? t("nav.upgradePlan") : t("nav.managePlan"),
      description: t("home.pricingDesc"),
      color: "bg-primary/20 text-primary",
      borderColor: "border-primary/30",
      bgColor: "bg-primary/5",
      view: "pricing",
      content: (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("home.pricingExpandedDesc")}</p>
          <button onClick={() => onNavigate("pricing")} className="px-6 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all flex items-center gap-2"><ExternalLink className="w-4 h-4" />{t("home.openSection")}</button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen w-full pb-20 relative">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8 flex-wrap gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2.5 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <ShieldX className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                {t("app.name")}
              </h1>
              <p className="text-sm font-mono text-primary/80 uppercase tracking-widest mt-1">
                {t("app.tagline")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFounderPitch(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/30 transition-all group"
            >
              <Film className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {t("nav.founderPitch")}
            </button>
            <button
              onClick={() => setShowVideo(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all group"
            >
              <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              {t("nav.seeHow")}
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card/50 px-4 py-2 rounded-full border border-border/50 backdrop-blur-md">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              {t("nav.live")}
            </div>

            <LanguageSelector />
            <FeedbackButton />
            <UserMenu onNavigate={onNavigate} />
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-foreground mb-1">
            {t("home.welcomeBack")}{user?.firstName ? `, ${user.firstName}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("home.clickToExpand")}
          </p>
        </motion.div>

        <div className="space-y-4 mb-12">
          {cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <ExpandableCard
                card={card}
                expanded={expandedCard === card.id}
                onToggle={() =>
                  setExpandedCard(expandedCard === card.id ? null : card.id)
                }
                onNavigate={onNavigate}
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="border-t border-border/30 pt-8 pb-4"
        >
          <h3 className="text-center text-sm font-semibold text-muted-foreground/80 uppercase tracking-wider mb-6">
            {t("landing.contactUs")}
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
            <a
              href="https://wa.me/85290576851"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-4 rounded-xl border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-all"
            >
              <MessageCircle className="w-6 h-6 text-green-500" />
              <div className="text-left">
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="text-sm font-semibold text-foreground">+852 9057 6851</p>
              </div>
            </a>
            <a
              href="mailto:director@vantward.com"
              className="flex items-center gap-3 px-6 py-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all"
            >
              <Mail className="w-6 h-6 text-primary" />
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-semibold text-foreground">director@vantward.com</p>
              </div>
            </a>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { key: "SOC 2", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
                { key: "ISO 27001", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
                { key: "GDPR", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
              ].map((badge) => (
                <span
                  key={badge.key}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold tracking-wide ${badge.color}`}
                >
                  <Shield className="w-3 h-3" />
                  {badge.key}
                  <span className="text-[8px] font-sans text-muted-foreground/60 uppercase ml-0.5">
                    {t("certifications.status.planned")}
                  </span>
                </span>
              ))}
            </div>
            <button
              onClick={() => onNavigate("certifications")}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {t("certifications.trustStrip.viewAll")}
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-xs text-muted-foreground/50">
            <button onClick={() => onNavigate("terms")} className="hover:text-primary transition-colors">{t("legal.tosTitle")}</button>
            <span className="text-border/30">·</span>
            <button onClick={() => onNavigate("license")} className="hover:text-primary transition-colors">{t("legal.licenseTitle")}</button>
            <span className="text-border/30">·</span>
            <button onClick={() => onNavigate("privacy")} className="hover:text-primary transition-colors">{t("privacy.title")}</button>
            <span className="text-border/30">·</span>
            <button onClick={() => onNavigate("contact")} className="hover:text-primary transition-colors">{t("contact.title")}</button>
          </div>
          <p className="text-xs font-mono text-muted-foreground/60 text-center mt-3">
            {t("app.copyright")}
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {showVideo && <VideoModal onClose={() => setShowVideo(false)} />}
        {showFounderPitch && <FounderPitchModal onClose={() => setShowFounderPitch(false)} />}
      </AnimatePresence>
    </div>
  );
}
