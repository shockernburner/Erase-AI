import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldX,
  Globe,
  Film,
  Loader2,
  Play,
  SkipForward,
  Code2,
  Building2,
  Shield,
  MessageCircle,
  Mail,
  LogIn,
  Volume2,
  VolumeX,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { FeedbackButton } from "@/components/FeedbackModal";
import AuthForm from "@/components/AuthForm";

const VIDEO_SEEN_KEY = "eraseai_video_seen";
const API_BASE = import.meta.env.VITE_API_URL || "/api";

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

type PreviewMode = "developer" | "enterprise" | "personal" | null;

export default function PublicLanding({ onPreview }: { onPreview: (mode: PreviewMode) => void }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ dataPointsScanned: 0, threatsDetected: 0 });

  useEffect(() => {
    fetch(`${API_BASE}/public/stats`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {});
  }, []);

  const [videoFinished, setVideoFinished] = useState(() => {
    try { return typeof window !== "undefined" && localStorage.getItem(VIDEO_SEEN_KEY) === "1"; }
    catch { return false; }
  });
  const [showVideo, setShowVideo] = useState(!videoFinished);
  const [videoReady, setVideoReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasUnmutedRef = useRef(false);

  const handleSkip = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    localStorage.setItem(VIDEO_SEEN_KEY, "1");
    setVideoFinished(true);
    setShowVideo(false);
  }, []);

  const handleVideoEnd = useCallback(() => {
    localStorage.setItem(VIDEO_SEEN_KEY, "1");
    setVideoFinished(true);
    setShowVideo(false);
  }, []);

  const handleReplay = useCallback(() => {
    localStorage.removeItem(VIDEO_SEEN_KEY);
    setVideoFinished(false);
    setShowVideo(true);
    setIsMuted(true);
    hasUnmutedRef.current = false;
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
  }, []);

  const handleWaiting = useCallback(() => {
    setVideoReady(false);
  }, []);

  const handlePlaying = useCallback(() => {
    setVideoReady(true);
    if (!hasUnmutedRef.current && videoRef.current) {
      hasUnmutedRef.current = true;
      try {
        videoRef.current.muted = false;
        setIsMuted(false);
      } catch {
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const next = !videoRef.current.muted;
      videoRef.current.muted = next;
      setIsMuted(next);
    }
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

      <div
        className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-500 ${showVideo ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        {!videoReady && showVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse">
              <ShieldX className="w-10 h-10" />
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("app.loading")}
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay={!videoFinished}
          playsInline
          muted
          preload="auto"
          onCanPlay={handleCanPlay}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onEnded={handleVideoEnd}
          className={`w-full h-full object-contain transition-opacity duration-300 ${videoReady ? "opacity-100" : "opacity-0"}`}
          src={`${import.meta.env.BASE_URL}videos/landing.mp4`}
        />
        <button
          onClick={toggleMute}
          className={`absolute bottom-8 left-8 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all z-20 ${showVideo ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <button
          onClick={handleSkip}
          className={`absolute bottom-8 right-8 flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-all z-20 ${showVideo ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <SkipForward className="w-4 h-4" />
          {t("landing.skip")}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {videoFinished && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between px-4 sm:px-6 lg:px-8 pt-6 max-w-5xl mx-auto flex-wrap gap-4"
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
                  onClick={handleReplay}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/30 transition-all group"
                >
                  <Film className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  {t("nav.founderPitch")}
                </button>
                <button
                  onClick={() => window.open("/how-it-works-video/", "_blank")}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all group"
                >
                  <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                  {t("nav.seeHow")}
                </button>
                <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card/50 px-4 py-2 rounded-full border border-border/50 backdrop-blur-md">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  {t("nav.live")}
                </div>
                <LanguageSelector />
                <FeedbackButton />
                <button
                  onClick={() => document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  {t("landing.logIn")}
                </button>
              </div>
            </motion.header>

            <div className="max-w-5xl mx-auto px-4 pt-8 pb-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-10 py-4 px-6 rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <ScanSearch className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground leading-none">
                      <AnimatedNumber value={stats.dataPointsScanned} />
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{t("landing.dataPointsScanned")}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-border/30 hidden sm:block" />
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground leading-none">
                      <AnimatedNumber value={stats.threatsDetected} />
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{t("landing.threatsDetected")}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-border/30 hidden sm:block" />
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-violet-500/10">
                    <ShieldCheck className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground leading-none">99.9%</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{t("landing.uptime")}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
                  {t("landing.whatBringsYou")}
                </h2>
                <p className="text-muted-foreground mb-3">
                  {t("landing.tryOnce")}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  {t("trial.heroTrialCallout")}
                </div>
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
                    {t("landing.devCardTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("landing.devCardDesc")}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-amber-400 text-sm font-medium">
                    <Play className="w-4 h-4" />
                    {t("landing.devCardCta")}
                  </div>
                </button>

                <button
                  onClick={() => onPreview("enterprise")}
                  className="group relative p-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 backdrop-blur-sm hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:scale-[1.02] transition-all text-left"
                >
                  <Building2 className="w-10 h-10 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {t("landing.entCardTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("landing.entCardDesc")}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-cyan-400 text-sm font-medium">
                    <Play className="w-4 h-4" />
                    {t("landing.entCardCta")}
                  </div>
                </button>

                <button
                  onClick={() => onPreview("personal")}
                  className="group relative p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:scale-[1.02] transition-all text-left"
                >
                  <Shield className="w-10 h-10 text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {t("landing.personalCardTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("landing.personalCardDesc")}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <Play className="w-4 h-4" />
                    {t("landing.personalCardCta")}
                  </div>
                </button>
              </motion.div>

              <motion.div
                id="auth-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="max-w-md mx-auto mb-16 scroll-mt-24"
              >
                <h3 className="text-center text-xl font-display font-bold text-foreground mb-2">
                  {t("landing.joinWhenYouWant")}
                </h3>
                <p className="text-center text-sm text-muted-foreground mb-4">
                  {t("login.subtitle")}
                </p>
                <div className="text-center mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t("trial.startFreeTrialCta")}
                  </span>
                </div>
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
                <h3 className="text-center text-sm font-semibold text-muted-foreground/80 uppercase tracking-wider mb-4">
                  {t("landing.contactUs")}
                </h3>
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
                    href="mailto:director@vantward.com"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4 text-primary" />
                    director@vantward.com
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
