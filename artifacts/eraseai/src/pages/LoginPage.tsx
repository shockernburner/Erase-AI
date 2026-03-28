import { useAuth } from "@workspace/replit-auth-web";
import { ShieldX, LogIn, Zap, Database, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui-elements";

export default function LoginPage() {
  const { login } = useAuth();

  const features = [
    { icon: <Database className="w-5 h-5" />, title: "Dataset Intelligence", desc: "Detect PII, bias, toxic content, duplicates, and quality issues" },
    { icon: <Zap className="w-5 h-5" />, title: "AI Unlearning Engine", desc: "Version-controlled data erasure with before/after verification" },
    { icon: <BrainCircuit className="w-5 h-5" />, title: "ML Pipeline Feedback", desc: "Actionable recommendations for preprocessing, training & evaluation" },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-md w-full mx-4"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.5)] mb-4">
            <ShieldX className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            EraseAI
          </h1>
          <p className="text-sm font-mono text-primary/80 uppercase tracking-widest mt-2">
            Make AI forget what it should never learn
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-md border border-border/50 rounded-2xl p-6 space-y-6">
          <div className="space-y-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/10 border border-border/20"
              >
                <span className="text-primary mt-0.5 shrink-0">{f.icon}</span>
                <div>
                  <span className="text-sm font-semibold text-foreground">{f.title}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <Button
            onClick={login}
            className="w-full gap-2 bg-gradient-to-r from-primary to-cyan-400 text-black font-bold hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.4)] py-5 text-base"
          >
            <LogIn className="w-5 h-5" />
            Log in to get started
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-6 font-mono">
          &copy; 2026 EraseAI.ai &mdash; AI Data Governance Layer
        </p>
      </motion.div>
    </div>
  );
}
