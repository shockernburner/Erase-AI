import { useState, useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";
import { Router, Route, Switch } from "wouter";
import Home from "@/pages/Home";
import LoginPage from "@/pages/LoginPage";
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
import { Loader2 } from "lucide-react";

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

function SeoLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

function AuthGate() {
  const { t } = useTranslation();
  const { isLoading, isAuthenticated, user } = useAuth();
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success" || params.get("admin") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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
    return <LoginPage />;
  }

  if (view === "admin" && user?.role !== "admin") {
    return <LoginPage />;
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
