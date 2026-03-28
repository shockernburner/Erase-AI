import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TeachSection } from "@/components/TeachSection";
import { AskSection } from "@/components/AskSection";
import { UnlearnSection } from "@/components/UnlearnSection";
import { VerifySection } from "@/components/VerifySection";
import { AuditLogSection } from "@/components/AuditLogSection";
import { DemoProvider, useDemoContext } from "@/context/DemoContext";
import { DatasetSanitizer } from "@/pages/DatasetSanitizer";
import { getListFactsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { ShieldX, Play, Loader2, Zap, Database, Globe, ArrowRight, LogOut, User } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui-elements";

const DEMO_FACT = "Firdous is the CEO of X company";
const DEMO_QUESTION = "Who is Firdous?";

type Tab = "live-demo" | "dataset-sanitizer";

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map(n => n![0])
    .join("")
    .toUpperCase() || "U";

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";

  return (
    <div className="relative">
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
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-card border border-border rounded-xl shadow-xl p-2 space-y-1">
            <div className="px-3 py-2 border-b border-border/30 mb-1">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
            </div>
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function HomeContent() {
  const demoCtx = useDemoContext();
  const queryClient = useQueryClient();
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [demoLabel, setDemoLabel] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("live-demo");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/seed`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.seeded) {
          queryClient.invalidateQueries({ queryKey: getListFactsQueryKey() });
        }
      })
      .catch(() => {});
  }, []);

  const runDemo = async () => {
    if (isRunningDemo) return;
    setIsRunningDemo(true);

    try {
      setDemoLabel("Re-seeding demo fact...");
      await fetch(`${import.meta.env.BASE_URL}api/seed`);
      queryClient.invalidateQueries({ queryKey: getListFactsQueryKey() });
      await delay(600);

      setDemoLabel("Asking question...");
      demoCtx.sendMessageRef.current?.(DEMO_QUESTION);
      await delay(1500);

      setDemoLabel("Erasing memory...");
      await demoCtx.unlearnFactRef.current?.(DEMO_FACT);
      await delay(1000);

      setDemoLabel("Verifying erasure...");
      await delay(400);
    } finally {
      setDemoLabel("");
      setIsRunningDemo(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "live-demo", label: "Live Demo", icon: <Zap className="w-4 h-4" /> },
    { id: "dataset-sanitizer", label: "AI Dataset Unlearning Engine", icon: <Database className="w-4 h-4" /> },
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-6 flex-wrap gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2.5 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <ShieldX className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                EraseAI
              </h1>
              <p className="text-sm font-mono text-primary/80 uppercase tracking-widest mt-1">
                Make AI forget what it should never learn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "live-demo" && (
              <Button
                onClick={runDemo}
                disabled={isRunningDemo}
                className="gap-2 bg-gradient-to-r from-primary to-cyan-400 text-black font-bold hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.4)] px-5"
              >
                {isRunningDemo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {demoLabel || "Running..."}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Run Demo
                  </>
                )}
              </Button>
            )}

            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card/50 px-4 py-2 rounded-full border border-border/50 backdrop-blur-md">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              eraseai.ai LIVE
            </div>

            <UserMenu />
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex items-center gap-3 mb-6 text-xs font-mono text-muted-foreground"
        >
          <span className="uppercase tracking-wider text-primary/70 font-semibold">AI Data Control</span>
          <span className="flex items-center gap-1.5">
            Upload <ArrowRight className="w-3 h-3" />
            Analyze <ArrowRight className="w-3 h-3" />
            Fix <ArrowRight className="w-3 h-3" />
            Verify <ArrowRight className="w-3 h-3" />
            Retrain
          </span>
          <span className="hidden sm:inline text-muted-foreground/50">|</span>
          <span className="hidden sm:inline text-muted-foreground/60">Detect risk. Clean data. Fix your model.</span>
        </motion.div>

        <div className="flex items-center gap-1 mb-8 bg-card/50 p-1 rounded-xl border border-border/50 backdrop-blur-md w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "live-demo" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-4"
            >
              <TeachSection />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-8"
            >
              <AskSection defaultQuestion={DEMO_QUESTION} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-4"
            >
              <UnlearnSection />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-8"
            >
              <VerifySection />
            </motion.div>

            <AuditLogSection />
          </div>
        )}

        {activeTab === "dataset-sanitizer" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DatasetSanitizer />
          </motion.div>
        )}
      </div>

      <footer className="relative z-10 border-t border-border/30 mt-16 py-6 text-center">
        <p className="text-xs font-mono text-muted-foreground/60">
          &copy; 2026 EraseAI.ai &mdash; AI Data Governance Layer
        </p>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <DemoProvider>
      <HomeContent />
    </DemoProvider>
  );
}
