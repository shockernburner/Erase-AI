import { useState, useEffect } from "react";
import { useVerifyUnlearning } from "@workspace/api-client-react";
import { Button, Input, Card } from "./ui-elements";
import { Zap, ArrowRight, Activity, ShieldCheck, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatConfidence } from "@/lib/utils";
import { useDemoContext } from "@/context/DemoContext";

export function VerifySection() {
  const [question, setQuestion] = useState("");
  const verifyMutation = useVerifyUnlearning();
  const demoCtx = useDemoContext();

  useEffect(() => {
    if (demoCtx.pendingVerifyQuestion) {
      const q = demoCtx.pendingVerifyQuestion;
      setQuestion(q);
      demoCtx.setPendingVerifyQuestion(null);
      verifyMutation.mutate({ data: { question: q } });
    }
  }, [demoCtx.pendingVerifyQuestion]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    verifyMutation.mutate({ data: { question } });
  };

  const result = verifyMutation.data;
  const forgetPct = result ? Math.round(result.forget_score * 100) : 0;

  return (
    <Card className="h-full border-primary/20 bg-gradient-to-b from-card to-primary/5 glow-cyan">
      <div className="p-6 border-b border-primary/10 bg-card/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-[0_0_15px_-5px_rgba(6,182,212,0.8)]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-display text-foreground">Before & After Verification</h2>
            <p className="text-sm text-primary/80">Measure the impact of unlearning</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder="Question to verify..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={verifyMutation.isPending}
            className="md:w-[250px] bg-background/50 border-primary/30 focus:border-primary focus:ring-primary/30"
          />
          <Button type="submit" isLoading={verifyMutation.isPending} className="shrink-0">
            Verify
          </Button>
        </form>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center">
        {!result && !verifyMutation.isPending && (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3 opacity-60">
            <Activity className="w-12 h-12" />
            <p>Unlearn a fact and this panel will auto-populate with the before &amp; after comparison.</p>
          </div>
        )}

        {verifyMutation.isPending && (
          <div className="text-center py-16 flex flex-col items-center justify-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-2 border-destructive/20 border-b-destructive animate-spin-reverse"></div>
              <Activity className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
            </div>
            <p className="mt-4 font-mono text-primary animate-pulse tracking-widest uppercase text-sm">Simulating Time Rift...</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {result && !verifyMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col gap-6 h-full"
            >
              {/* FORGET SCORE — Big prominent display */}
              <div className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60">Forget Score</p>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
                  className="flex items-end gap-2"
                >
                  <span className="text-7xl font-display font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-300 leading-none">
                    {forgetPct}
                  </span>
                  <span className="text-3xl font-bold text-primary pb-2">%</span>
                </motion.div>
                <p className="text-xs text-muted-foreground font-mono">
                  {forgetPct >= 70 ? "✓ Knowledge successfully erased" : forgetPct >= 40 ? "~ Partial erasure detected" : "✗ Knowledge still retained"}
                </p>
              </div>

              {/* Before/After Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">

                <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-background rounded-full items-center justify-center border border-border shadow-xl">
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* BEFORE */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-colors"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-10 text-emerald-500 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">🟢 BEFORE</span>
                      <span className="font-mono text-sm text-emerald-400/80">Conf: {formatConfidence(result.before_confidence)}</span>
                    </div>
                    <p className="text-base text-foreground font-medium leading-relaxed">"{result.before}"</p>
                  </div>
                </motion.div>

                {/* AFTER */}
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-5 relative overflow-hidden group hover:border-rose-500/50 transition-colors"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-10 text-rose-500 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-1 rounded">🔴 AFTER</span>
                      <span className="font-mono text-sm text-rose-400/80">Conf: {formatConfidence(result.after_confidence)}</span>
                    </div>
                    <p className="text-base text-foreground font-medium leading-relaxed opacity-80">"{result.after}"</p>
                  </div>
                </motion.div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
