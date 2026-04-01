import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import Home from "@/pages/Home";
import LoginPage from "@/pages/LoginPage";
import PricingPage from "@/pages/PricingPage";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import AdminDashboard from "@/pages/AdminDashboard";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type AppView = "home" | "pricing" | "checkout-success" | "admin";

function AuthGate() {
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
          <p className="text-sm text-muted-foreground font-mono">Loading EraseAI...</p>
        </div>
      </div>
    );
  }

  if (view === "admin" && (!isAuthenticated || user?.role !== "admin")) {
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

  return <Home onNavigate={setView} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthGate />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
