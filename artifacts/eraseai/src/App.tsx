import { useState, useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";
import { Router, Route, Switch } from "wouter";
import Home from "@/pages/Home";
import PublicLanding from "@/pages/PublicLanding";
import PricingPage from "@/pages/PricingPage";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import AdminDashboard from "@/pages/AdminDashboard";
import DeveloperDashboard from "@/pages/DeveloperDashboard";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import PersonalMode from "@/pages/PersonalMode";
import SocialPosts from "@/pages/SocialPosts";
import ApiDocs from "@/pages/ApiDocs";
import DevMode from "@/pages/DevMode";
import Certifications from "@/pages/Certifications";
import FirewallDocs from "@/pages/FirewallDocs";
import TermsOfService from "@/pages/TermsOfService";
import LicenseAgreement from "@/pages/LicenseAgreement";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import ContactPage from "@/pages/ContactPage";
import TermsAcceptanceModal from "@/components/TermsAcceptanceModal";
import { ArrowLeft, Loader2, ShieldX, Globe, Crown, Shield, Briefcase, Building2, LogOut } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { FeedbackButton } from "@/components/FeedbackModal";
import { motion } from "framer-motion";

function isTrialExpiredFrontend(user: { planType?: string; planEndDate?: string | null; role?: string } | null): boolean {
  if (!user) return false;
  const plan = user.planType || "free";
  if (plan !== "free") return false;
  if (user.role === "admin") return false;
  if (!user.planEndDate) return false;
  return new Date(user.planEndDate) < new Date();
}

function TrialExpiredModal({ onChoosePlan, onLogout }: { onChoosePlan: () => void; onLogout: () => void }) {
  const { t } = useTranslation();

  const plans = [
    { id: "personal", nameKey: "plan.personal", price: "$5", icon: <Shield className="w-5 h-5" />, showUnit: true },
    { id: "pro", nameKey: "plan.pro", price: "$49", icon: <Crown className="w-5 h-5" />, showUnit: true },
    { id: "business", nameKey: "plan.business", price: "$149", icon: <Briefcase className="w-5 h-5" />, showUnit: true },
    { id: "enterprise", nameKey: "plan.enterprise", price: "", icon: <Building2 className="w-5 h-5" />, showUnit: false },
  ];

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
        className="bg-card border border-border rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl text-center"
      >
        <div className="bg-destructive/10 p-3 rounded-full w-fit mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          {t("trial.expiredModalTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t("trial.expiredModalDesc")}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border border-border/50 bg-muted/10 p-3 text-left`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-muted-foreground">{p.icon}</span>
                <span className="text-sm font-semibold text-foreground">{t(p.nameKey)}</span>
              </div>
              {p.showUnit ? (
                <>
                  <span className="text-lg font-bold text-foreground">{p.price}</span>
                  <span className="text-xs text-muted-foreground">{t("pricing.month")}</span>
                </>
              ) : (
                <span className="text-lg font-bold text-foreground">{t("pricing.customPricing")}</span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onChoosePlan}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-cyan-400 text-black font-bold text-sm hover:from-primary/90 hover:to-cyan-400/90 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-3"
        >
          <Crown className="w-4 h-4 inline mr-2" />
          {t("trial.expiredModalCta")}
        </button>
        <button
          onClick={onLogout}
          className="w-full py-2.5 rounded-xl border border-border/50 text-sm text-muted-foreground hover:bg-muted/20 transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          {t("trial.expiredModalLogout")}
        </button>
      </motion.div>
    </motion.div>
  );
}

const AiFirewallPage = lazy(() => import("@/pages/seo/AiFirewallPage"));
const ChatgptDataLeakPage = lazy(() => import("@/pages/seo/ChatgptDataLeakPage"));
const AiPromptSecurityPage = lazy(() => import("@/pages/seo/AiPromptSecurityPage"));
const ApiKeyProtectionPage = lazy(() => import("@/pages/seo/ApiKeyProtectionPage"));
const BlogIndex = lazy(() => import("@/pages/seo/BlogIndex"));
const BlogPost_ApiKeys = lazy(() => import("@/pages/seo/BlogPost_ApiKeys"));
const BlogPost_AiFirewall = lazy(() => import("@/pages/seo/BlogPost_AiFirewall"));
const BlogPost_PreventLeaks = lazy(() => import("@/pages/seo/BlogPost_PreventLeaks"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type AppView = "home" | "pricing" | "checkout-success" | "admin" | "developer" | "analytics" | "personal" | "social" | "docs" | "devMode" | "certifications" | "firewallDocs" | "terms" | "license" | "privacy" | "contact";
type PreviewMode = "developer" | "enterprise" | "personal" | null;

function SeoLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

function PreviewPage({ mode, onBack }: { mode: PreviewMode; onBack: () => void }) {
  const { t } = useTranslation();

  const noop = () => {};

  return (
    <div className="min-h-screen w-full relative">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between flex-wrap gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                <ShieldX className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                  {t("app.name")}
                </span>
                <p className="text-[10px] font-mono text-primary/80 uppercase tracking-widest">
                  {t("app.tagline")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/90 backdrop-blur-md border border-border/50 text-sm font-medium text-foreground hover:bg-muted/40 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("landing.backToHomepage")}
              </button>
              <span className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                {t("landing.previewMode")}
              </span>
              <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card/50 px-4 py-2 rounded-full border border-border/50 backdrop-blur-md">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                {t("nav.live")}
              </div>
              <LanguageSelector />
              <FeedbackButton />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="relative z-10">
        {mode === "developer" && <DeveloperDashboard onBack={onBack} previewMode />}
        {mode === "enterprise" && <AnalyticsDashboard onBack={onBack} onUpgrade={noop} previewMode />}
        {mode === "personal" && <PersonalMode onBack={onBack} onUpgrade={noop} previewMode />}
      </div>
    </div>
  );
}

function getDefaultViewForPlan(planType: string | undefined): AppView {
  const plan = planType || "free";
  switch (plan) {
    case "personal":
      return "personal";
    case "pro":
      return "developer";
    case "business":
    case "enterprise":
      return "analytics";
    default:
      return "home";
  }
}

function AuthGate() {
  const { t } = useTranslation();
  const { isLoading, isAuthenticated, user, logout } = useAuth();
  const [previewMode, setPreviewMode] = useState<PreviewMode>(null);
  const [view, setView] = useState<AppView>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "true") {
      return "admin";
    }
    if (params.get("checkout") === "success") {
      return "checkout-success";
    }
    return "home";
  });
  const [initialViewSet, setInitialViewSet] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success" || params.get("admin") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user && !initialViewSet && view === "home") {
      const params = new URLSearchParams(window.location.search);
      if (!params.get("admin") && !params.get("checkout")) {
        const plan = user.planType || "free";
        if (plan !== "free") {
          setView(getDefaultViewForPlan(plan));
        }
      }
      setInitialViewSet(true);
    }
  }, [isAuthenticated, user, initialViewSet, view]);

  useEffect(() => {
    if (isAuthenticated && user) {
      setTermsAccepted(null);
      fetch("/api/auth/terms-status", { credentials: "include" })
        .then(r => r.json())
        .then(data => setTermsAccepted(data.accepted === true))
        .catch(() => setTermsAccepted(false));
    } else {
      setTermsAccepted(null);
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-mono">{t("app.loading")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (previewMode) {
      return <PreviewPage mode={previewMode} onBack={() => setPreviewMode(null)} />;
    }
    return <PublicLanding onPreview={setPreviewMode} />;
  }

  if (view === "terms") {
    return <TermsOfService onBack={() => setView("home")} onViewLicense={() => setView("license")} />;
  }

  if (view === "license") {
    return <LicenseAgreement onBack={() => setView("home")} onViewTerms={() => setView("terms")} />;
  }

  if (view === "privacy") {
    return <PrivacyPolicy onBack={() => setView("home")} onViewTerms={() => setView("terms")} />;
  }

  if (view === "contact") {
    return <ContactPage onBack={() => setView("home")} />;
  }

  if (termsAccepted === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-mono">{t("app.loading")}</p>
        </div>
      </div>
    );
  }

  const trialExpired = isTrialExpiredFrontend(user);

  if (view === "admin" && user?.role !== "admin") {
    return <Home onNavigate={setView} />;
  }

  if (view === "checkout-success") {
    return <CheckoutSuccess onDone={() => setView("home")} />;
  }

  if (view === "pricing") {
    return <PricingPage onBack={() => setView("home")} />;
  }

  if (!termsAccepted) {
    return (
      <>
        <Home onNavigate={setView} />
        <TermsAcceptanceModal
          onAccepted={() => setTermsAccepted(true)}
          onViewTerms={() => setView("terms")}
          onViewLicense={() => setView("license")}
        />
      </>
    );
  }

  if (trialExpired) {
    return (
      <>
        <Home onNavigate={setView} />
        <TrialExpiredModal onChoosePlan={() => setView("pricing")} onLogout={logout} />
      </>
    );
  }

  if (view === "admin") {
    return <AdminDashboard onBack={() => setView("home")} />;
  }

  if (view === "developer") {
    return <DeveloperDashboard onBack={() => setView("home")} onUpgrade={() => setView("pricing")} />;
  }

  if (view === "analytics") {
    return <AnalyticsDashboard onBack={() => setView("home")} onUpgrade={() => setView("pricing")} />;
  }

  if (view === "personal") {
    return <PersonalMode onBack={() => setView("home")} onUpgrade={() => setView("pricing")} />;
  }

  if (view === "social") {
    if (user?.email !== "firdous.mahmood26@gmail.com") {
      return <Home onNavigate={setView} />;
    }
    return <SocialPosts onBack={() => setView("home")} />;
  }

  if (view === "docs") {
    return <ApiDocs onBack={() => setView("home")} onUpgrade={() => setView("pricing")} onDevMode={() => setView("devMode")} />;
  }

  if (view === "devMode") {
    return <DevMode onBack={() => setView("home")} onUpgrade={() => setView("pricing")} />;
  }

  if (view === "firewallDocs") {
    return <FirewallDocs onBack={() => setView("home")} onUpgrade={() => setView("pricing")} onDevMode={() => setView("devMode")} />;
  }

  if (view === "certifications") {
    return <Certifications onBack={() => setView("home")} />;
  }

  return <Home onNavigate={setView} />;
}

function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router base={base === "/" ? "" : base}>
          <Suspense fallback={<SeoLoadingFallback />}>
            <Switch>
              <Route path="/ai-firewall" component={AiFirewallPage} />
              <Route path="/chatgpt-data-leak" component={ChatgptDataLeakPage} />
              <Route path="/ai-prompt-security" component={AiPromptSecurityPage} />
              <Route path="/api-key-protection-ai" component={ApiKeyProtectionPage} />
              <Route path="/blog" component={BlogIndex} />
              <Route path="/blog/api-keys-chatgpt" component={BlogPost_ApiKeys} />
              <Route path="/blog/what-is-ai-firewall" component={BlogPost_AiFirewall} />
              <Route path="/blog/prevent-data-leaks-ai" component={BlogPost_PreventLeaks} />
              <Route path="/terms">
                <TermsOfService onBack={() => window.history.back()} />
              </Route>
              <Route path="/license">
                <LicenseAgreement onBack={() => window.history.back()} />
              </Route>
              <Route path="/privacy">
                <PrivacyPolicy onBack={() => window.history.back()} />
              </Route>
              <Route path="/contact">
                <ContactPage onBack={() => window.history.back()} />
              </Route>
              <Route>
                <AuthGate />
              </Route>
            </Switch>
          </Suspense>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
