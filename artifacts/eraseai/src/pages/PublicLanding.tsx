import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldX,
  Globe,
  Play,
  SkipForward,
  Code2,
  Building2,
  Shield,
  ArrowLeft,
  MessageCircle,
  Mail,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import AuthForm from "@/components/AuthForm";

type PreviewMode = "developer" | "enterprise" | "personal" | null;

export default function PublicLanding({ onPreview }: { onPreview: (mode: PreviewMode) => void }) {
  const { t } = useTranslation();
  const [videoFinished, setVideoFinished] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleSkip = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setVideoFinished(true);
  }, []);

  const handleVideoEnd = useCallback(() => {
    setVideoFinished(true);
  }, []);

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

      <AnimatePresence mode="wait">
        {!videoFinished ? (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onEnded={handleVideoEnd}
              className="w-full h-full object-contain"
              src={`${import.meta.env.BASE_URL}videos/landing.mp4`}
            />
            <button
              onClick={handleSkip}
              className="absolute bottom-8 right-8 flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-all"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <div className="absolute top-4 right-4 z-20">
              <LanguageSelector />
            </div>

            <div className="max-w-5xl mx-auto px-4 pt-12 pb-8">
              <div className="flex flex-col items-center text-center mb-16">
                <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.5)] mb-4">
                  <ShieldX className="w-10 h-10" />
                </div>
                <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
                  EraseAI
                </h1>
                <p className="text-sm font-mono text-primary/80 uppercase tracking-widest">
                  {t("app.tagline")}
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
                  What brings you here?
                </h2>
                <p className="text-muted-foreground">
                  Try any mode once — no account needed
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
              >
                <button
                  onClick={() => onPreview("developer")}
                  className="group relative p-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm hover:bg-amber-500/10 hover:border-amber-500/50 hover:scale-[1.02] transition-all text-left"
                >
                  <Code2 className="w-10 h-10 text-amber-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    Are you a Developer?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Integrate AI data governance into your apps with our API, SDKs, and real-time webhooks.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-amber-400 text-sm font-medium">
                    <Play className="w-4 h-4" />
                    Try Developer Dashboard
                  </div>
                </button>

                <button
                  onClick={() => onPreview("enterprise")}
                  className="group relative p-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 backdrop-blur-sm hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:scale-[1.02] transition-all text-left"
                >
                  <Building2 className="w-10 h-10 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    Enterprise / Business / Govt?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Need regulatory compliance, dataset sanitization, and AI governance at scale?
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-cyan-400 text-sm font-medium">
                    <Play className="w-4 h-4" />
                    Try Enterprise Analytics
                  </div>
                </button>

                <button
                  onClick={() => onPreview("personal")}
                  className="group relative p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:scale-[1.02] transition-all text-left"
                >
                  <Shield className="w-10 h-10 text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    Protect your social presence?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Scan your posts and profiles for toxicity, PII leaks, bias — and get AI-rewritten safe versions.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <Play className="w-4 h-4" />
                    Try Personal Mode
                  </div>
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="max-w-md mx-auto mb-16"
              >
                <h3 className="text-center text-xl font-display font-bold text-foreground mb-2">
                  Join when you want
                </h3>
                <p className="text-center text-sm text-muted-foreground mb-6">
                  {t("login.subtitle")}
                </p>
                <AuthForm />
                <p className="text-center text-xs text-muted-foreground/50 mt-4 font-mono">
                  {t("app.copyright")}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="border-t border-border/30 pt-8 pb-8"
              >
                <div className="flex flex-wrap items-center justify-center gap-6 mb-4">
                  <a
                    href="https://wa.me/85290576851"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-green-400 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    +852 9057 6851
                  </a>
                  <a
                    href="mailto:director@futureonward.com"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4 text-primary" />
                    director@futureonward.com
                  </a>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground/60">
                  <a href={`${import.meta.env.BASE_URL}ai-firewall`} className="hover:text-primary transition-colors">AI Firewall</a>
                  <span className="text-border/30">·</span>
                  <a href={`${import.meta.env.BASE_URL}chatgpt-data-leak`} className="hover:text-primary transition-colors">Prevent Data Leaks</a>
                  <span className="text-border/30">·</span>
                  <a href={`${import.meta.env.BASE_URL}blog`} className="hover:text-primary transition-colors">Blog</a>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
