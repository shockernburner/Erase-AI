import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, ScrollText } from "lucide-react";
import { Card } from "./ui-elements";
import { useDemoContext } from "@/context/DemoContext";

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function AuditLogSection() {
  const { auditLog } = useDemoContext();

  if (auditLog.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="lg:col-span-12"
    >
      <Card className="border-emerald-500/20 bg-gradient-to-r from-card to-emerald-950/10">
        <div className="p-5 border-b border-emerald-500/10 bg-card/40 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-display text-foreground">Unlearning Log</h2>
            <p className="text-xs text-emerald-500/70 font-mono uppercase tracking-widest">Immutable audit trail</p>
          </div>
          <span className="ml-auto text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
            {auditLog.length} event{auditLog.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-5 space-y-3">
          <AnimatePresence initial={false}>
            {auditLog.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-start gap-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20"
              >
                <div className="shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Removed</span>
                    <span className="text-sm text-foreground font-mono truncate">"{entry.fact}"</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(entry.time)}
                    </span>
                    <span className="text-emerald-500/70">✓ Model updated</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
