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
import { ArrowLeft, Loader2, ShieldX, Globe } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { FeedbackButton } from "@/components/FeedbackModal";
import { motion } from "framer-motion";

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

type AppView = "home" | "pricing" | "checkout-success" | "admin" | "developer" | "analytics" | "personal" | "social" | "docs" | "devMode" | "certifications" | "firewallDocs";
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
  const { isLoading, isAuthenticated, user } = useAuth();
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

  if (view === "admin" && user?.role !== "admin") {
    return <Home onNavigate={setView} />;
  }

  if (view === "checkout-success") {
    return <CheckoutSuccess onDone={() => setView("home")} />;
  }

  if (view === "pricing") {
    return <PricingPage onBack={() => setView("home")} />;
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
