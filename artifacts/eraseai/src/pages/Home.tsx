import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { ShieldX, Globe, ArrowRight, LogOut, Crown, LayoutDashboard, Play, X } from "lucide-react";
import { FeedbackButton } from "@/components/FeedbackModal";
import { motion, AnimatePresence } from "framer-motion";
import { DatasetSanitizer } from "@/pages/DatasetSanitizer";

type AppView = "home" | "pricing" | "checkout-success" | "admin";

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "pro") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
        <Crown className="w-3 h-3" />
        PRO
      </span>
    );
  }
  if (plan === "enterprise") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
        <Crown className="w-3 h-3" />
        ENTERPRISE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground text-xs font-medium">
      FREE
    </span>
  );
}

function UserMenu({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const plan = user.planType || "free";
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
        <PlanBadge plan={plan} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-card border border-border rounded-xl shadow-xl p-2 space-y-1">
            <div className="px-3 py-2 border-b border-border/30 mb-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground truncate flex-1">{displayName}</p>
                <PlanBadge plan={plan} />
              </div>
              {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
            </div>
            {user.role === "admin" && (
              <button
                onClick={() => { setOpen(false); onNavigate("admin"); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                Admin Dashboard
              </button>
            )}
            <button
              onClick={() => { setOpen(false); onNavigate("pricing"); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all"
            >
              <Crown className="w-4 h-4" />
              {plan === "free" ? "Upgrade Plan" : "Manage Plan"}
            </button>
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

function VideoModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden border border-primary/30 shadow-[0_0_60px_rgba(6,182,212,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <iframe
          src={`${import.meta.env.BASE_URL}../eraseai-video/`}
          className="w-full h-full border-0"
          allow="autoplay"
          title="EraseAI System Explainer"
        />
      </motion.div>
    </motion.div>
  );
}

export default function Home({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const [showVideo, setShowVideo] = useState(false);

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
                AI Data Governance Layer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowVideo(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all group"
            >
              <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              See how it works
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card/50 px-4 py-2 rounded-full border border-border/50 backdrop-blur-md">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              eraseai.ai LIVE
            </div>

            <FeedbackButton />
            <UserMenu onNavigate={onNavigate} />
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex items-center gap-3 mb-8 text-xs font-mono text-muted-foreground"
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DatasetSanitizer onNavigatePricing={() => onNavigate("pricing")} />
        </motion.div>
      </div>

      <footer className="relative z-10 border-t border-border/30 mt-16 py-6 text-center">
        <p className="text-xs font-mono text-muted-foreground/60">
          &copy; 2026 EraseAI.ai &mdash; AI Data Governance Layer
        </p>
      </footer>

      <AnimatePresence>
        {showVideo && <VideoModal onClose={() => setShowVideo(false)} />}
      </AnimatePresence>
    </div>
  );
}
