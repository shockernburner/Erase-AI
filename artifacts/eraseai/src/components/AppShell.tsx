import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldX,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Crown,
  Clock,
  User,
  Shield,
  Database,
  Book,
  Newspaper,
  ScrollText,
  ShieldCheck,
  Phone,
  LayoutDashboard,
  BarChart3,
  Megaphone,
  TrendingUp,
  Globe,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { FeedbackButton } from "@/components/FeedbackModal";

export type AppView =
  | "home"
  | "pricing"
  | "checkout-success"
  | "admin"
  | "developer"
  | "analytics"
  | "personal"
  | "datasetSanitizer"
  | "social"
  | "adContent"
  | "docs"
  | "devMode"
  | "certifications"
  | "firewallDocs"
  | "firewallHub"
  | "docsHub"
  | "blogsHub"
  | "publishingChecklist"
  | "terms"
  | "license"
  | "privacy"
  | "contact";

const SIDEBAR_KEY = "eraseai.sidebarOpen";
const ADMIN_EMAIL = "firdous.mahmood26@gmail.com";

interface NavItem {
  id: AppView;
  labelKey: string;
  icon: ReactNode;
  match?: AppView[];
}

function loadInitial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(SIDEBAR_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function PlanBadge({ plan }: { plan: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    personal: "bg-emerald-500/20 text-emerald-400",
    pro: "bg-primary/20 text-primary",
    business: "bg-violet-500/20 text-violet-400",
    enterprise: "bg-yellow-500/20 text-yellow-400",
  };
  if (plan === "free") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground text-[10px] font-medium">
        {t("plan.free")}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${map[plan] || "bg-muted/30 text-muted-foreground"}`}>
      <Crown className="w-3 h-3" />
      {t(`plan.${plan}`)}
    </span>
  );
}

function trialDaysRemaining(planType?: string, planEndDate?: string | null): number | null {
  const plan = planType || "free";
  if (plan !== "free") return null;
  if (!planEndDate) return null;
  const diff = Math.ceil((new Date(planEndDate).getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}

function UserPill({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const plan = user.planType || "free";
  const trialDays = trialDaysRemaining(user.planType, user.planEndDate);
  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((n) => n![0])
      .join("")
      .toUpperCase() || (user.email?.[0]?.toUpperCase() ?? "U");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Account";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded-full border border-border/50 bg-card/60 backdrop-blur-md hover:bg-muted/40 transition-all"
        aria-label={t("appShell.account", { defaultValue: "Account" })}
      >
        {user.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        )}
        <PlanBadge plan={plan} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-card border border-border rounded-xl shadow-xl p-2">
            <div className="px-3 py-2 border-b border-border/30 mb-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground truncate flex-1">{displayName}</p>
                <PlanBadge plan={plan} />
              </div>
              {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
              {trialDays !== null && (
                <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${trialDays === 0 ? "text-destructive" : trialDays <= 2 ? "text-yellow-400" : "text-primary"}`}>
                  <Clock className="w-3 h-3" />
                  {trialDays === 0 ? t("trial.expired") : t("trial.daysLeft", { count: trialDays })}
                </div>
              )}
            </div>

            <button
              onClick={() => { setOpen(false); onNavigate("pricing"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
            >
              <Crown className="w-4 h-4" />
              {plan === "free" ? t("nav.upgradePlan") : t("nav.managePlan")}
            </button>

            <div className="border-t border-border/30 mt-1 pt-1">
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <LogOut className="w-4 h-4" />
                {t("nav.logOut")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({
  view,
  onNavigate,
  children,
}: {
  view: AppView;
  onNavigate: (v: AppView) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState<boolean>(loadInitial());
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const isOwner = user?.email === ADMIN_EMAIL;
  const plan = user?.planType || "free";
  const isPaidDev = plan === "pro" || plan === "business" || plan === "enterprise";

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, open ? "1" : "0");
    } catch {}
  }, [open]);

  useEffect(() => {
    setMobileOpen(false);
  }, [view]);

  const groups = useMemo<{ label: string; items: NavItem[] }[]>(() => [
    {
      label: t("appShell.groupPersonal", { defaultValue: "Personal" }),
      items: [
        { id: "personal", labelKey: "nav.personalMode", icon: <User className="w-4 h-4" />, match: ["personal"] },
      ],
    },
    {
      label: t("appShell.groupFirewall", { defaultValue: "Firewall" }),
      items: [
        { id: "firewallHub", labelKey: "appShell.firewallHub", icon: <Shield className="w-4 h-4" />, match: ["firewallHub", "firewallDocs", "publishingChecklist"] },
        ...(isPaidDev
          ? [{ id: "developer" as AppView, labelKey: "appShell.devKeys", icon: <LayoutDashboard className="w-4 h-4" />, match: ["developer"] as AppView[] }]
          : []),
      ],
    },
    {
      label: t("appShell.groupSanitizers", { defaultValue: "Dataset Sanitizers" }),
      items: [
        { id: "datasetSanitizer", labelKey: "appShell.sanitizerHome", icon: <Database className="w-4 h-4" />, match: ["datasetSanitizer"] },
      ],
    },
    {
      label: t("appShell.groupDocs", { defaultValue: "Documentation" }),
      items: [
        { id: "docsHub", labelKey: "appShell.docsHub", icon: <Book className="w-4 h-4" />, match: ["docsHub", "docs", "devMode", "certifications"] },
      ],
    },
    {
      label: t("appShell.groupBlogs", { defaultValue: "Blogs" }),
      items: [
        { id: "blogsHub", labelKey: "appShell.blogsHub", icon: <Newspaper className="w-4 h-4" />, match: ["blogsHub"] },
      ],
    },
    {
      label: t("appShell.groupLegal", { defaultValue: "Legal" }),
      items: [
        { id: "license", labelKey: "appShell.licenseAgreement", icon: <ScrollText className="w-4 h-4" />, match: ["license"] },
        { id: "terms", labelKey: "nav.termsLegal", icon: <ScrollText className="w-4 h-4" />, match: ["terms"] },
        { id: "privacy", labelKey: "nav.privacyPolicy", icon: <ShieldCheck className="w-4 h-4" />, match: ["privacy"] },
        { id: "contact", labelKey: "nav.contact", icon: <Phone className="w-4 h-4" />, match: ["contact"] },
      ],
    },
  ], [t, isPaidDev]);

  const adminGroup = useMemo<{ label: string; items: NavItem[] } | null>(() => {
    if (!isAdmin) return null;
    const items: NavItem[] = [
      { id: "admin", labelKey: "nav.adminDashboard", icon: <LayoutDashboard className="w-4 h-4" />, match: ["admin"] },
      { id: "analytics", labelKey: "nav.analytics", icon: <BarChart3 className="w-4 h-4" />, match: ["analytics"] },
    ];
    if (isOwner) {
      items.push(
        { id: "social", labelKey: "nav.socialPosts", icon: <Megaphone className="w-4 h-4" />, match: ["social"] },
        { id: "adContent", labelKey: "nav.adContent", icon: <TrendingUp className="w-4 h-4" />, match: ["adContent"] },
      );
    }
    return { label: t("appShell.groupAdmin", { defaultValue: "Admin" }), items };
  }, [isAdmin, isOwner, t]);

  const sidebarWidth = open ? "w-60" : "w-16";

  const SidebarContent = (
    <nav className="h-full flex flex-col">
      <button
        onClick={() => onNavigate("home")}
        className="flex items-center gap-2 px-3 py-4 border-b border-border/30 hover:bg-muted/20 transition-colors"
      >
        <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0">
          <ShieldX className="w-5 h-5" />
        </div>
        {open && (
          <div className="min-w-0">
            <div className="text-sm font-display font-extrabold tracking-tight text-foreground truncate">
              {t("app.name")}
            </div>
            <div className="text-[9px] font-mono text-primary/70 uppercase tracking-widest truncate">
              {t("app.tagline")}
            </div>
          </div>
        )}
      </button>

      <div className="flex-1 overflow-y-auto py-3 space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            {open && (
              <div className="px-4 pb-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">
                {g.label}
              </div>
            )}
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = item.match?.includes(view) ?? false;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={!open ? t(item.labelKey) : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg text-sm transition-all ${
                      active
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground border border-transparent"
                    } ${open ? "justify-start" : "justify-center"}`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {open && <span className="truncate">{t(item.labelKey)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {adminGroup && (
          <div className="mt-auto pt-3 border-t border-border/30" data-testid="sidebar-admin-group">
            {open && (
              <div className="px-4 pb-1 text-[10px] uppercase font-bold tracking-wider text-yellow-400/70">
                {adminGroup.label}
              </div>
            )}
            <div className="space-y-0.5">
              {adminGroup.items.map((item) => {
                const active = item.match?.includes(view) ?? false;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={!open ? t(item.labelKey) : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg text-sm transition-all ${
                      active
                        ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                        : "text-muted-foreground hover:bg-yellow-500/10 hover:text-yellow-400 border border-transparent"
                    } ${open ? "justify-start" : "justify-center"}`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {open && <span className="truncate">{t(item.labelKey)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="hidden md:flex items-center justify-center gap-1.5 px-3 py-2.5 border-t border-border/30 text-xs text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-colors"
        aria-label={open ? t("appShell.collapse", { defaultValue: "Collapse sidebar" }) : t("appShell.expand", { defaultValue: "Expand sidebar" })}
      >
        {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {open && <span>{t("appShell.collapse", { defaultValue: "Collapse" })}</span>}
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen w-full flex bg-background">
      <aside
        className={`hidden md:flex shrink-0 ${sidebarWidth} border-r border-border/30 bg-card/40 backdrop-blur-md sticky top-0 h-screen transition-[width] duration-200`}
      >
        {SidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed left-0 top-0 z-50 w-60 h-screen bg-card border-r border-border md:hidden"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 px-4 py-2.5 bg-background/80 backdrop-blur-md border-b border-border/30">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted/30"
            aria-label={t("appShell.openNav", { defaultValue: "Open navigation" })}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-muted-foreground bg-card/50 px-3 py-1.5 rounded-full border border-border/40">
            <Globe className="w-3 h-3 text-primary" />
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {t("nav.live")}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSelector />
            <FeedbackButton />
            <UserPill onNavigate={onNavigate} />
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
