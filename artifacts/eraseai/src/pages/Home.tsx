import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TeachSection } from "@/components/TeachSection";
import { AskSection } from "@/components/AskSection";
import { UnlearnSection } from "@/components/UnlearnSection";
import { VerifySection } from "@/components/VerifySection";
import { AuditLogSection } from "@/components/AuditLogSection";
import { DemoProvider, useDemoContext } from "@/context/DemoContext";
import { getListFactsQueryKey } from "@workspace/api-client-react";
import { ShieldX, Play, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui-elements";

const DEMO_FACT = "Firdous is the CEO of X company";
const DEMO_QUESTION = "Who is Firdous?";

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function HomeContent() {
  const demoCtx = useDemoContext();
  const queryClient = useQueryClient();
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [demoLabel, setDemoLabel] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/seed`)
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
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-10 flex-wrap gap-4"
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
                Delete Knowledge from AI Models
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card/50 px-4 py-2 rounded-full border border-border/50 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              SYSTEM ONLINE
            </div>
          </div>
        </motion.header>

        {/* Main Dashboard Grid */}
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
      </div>
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
