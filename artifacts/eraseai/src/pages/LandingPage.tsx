import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Eye,
  Scan,
  Lock,
  Zap,
  CheckCircle2,
  ArrowRight,
  Code2,
  Building2,
  Globe,
  User,
  MessageSquare,
  Database,
  Bot,
  Sparkles,
  Crown,
} from "lucide-react";

type AppView = "home" | "pricing" | "checkout-success" | "admin" | "developer" | "analytics" | "personal" | "social" | "docs" | "devMode" | "certifications" | "firewallDocs";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

function SectionWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      className={`py-16 md:py-24 ${className}`}
    >
      {children}
    </motion.section>
  );
}

export default function LandingPage({
  onNavigate,
  onTryDemo,
}: {
  onNavigate: (view: AppView) => void;
  onTryDemo: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-0">
      <SectionWrapper className="pt-4 md:pt-8 pb-16 md:pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-8">
            <Shield className="w-4 h-4" />
            {t("landing.heroBadge")}
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-6"
          >
            {t("landing.heroTitle")}
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            {t("landing.heroSubtitle1")}
          </motion.p>
          <motion.p variants={fadeUp} className="text-lg md:text-xl text-primary font-medium max-w-2xl mx-auto mb-10">
            {t("landing.heroSubtitle2")}
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onTryDemo}
              className="px-8 py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-bold shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:scale-105 transition-all"
            >
              {t("landing.tryDemo")}
            </button>
            <button
              onClick={() => onNavigate("firewallDocs")}
              className="px-8 py-3.5 rounded-xl border border-border/60 bg-card/50 text-foreground text-base font-bold hover:bg-muted/40 transition-all"
            >
              {t("landing.installExtension")}
            </button>
          </motion.div>
        </div>
      </SectionWrapper>

      <SectionWrapper className="py-8 md:py-12 border-y border-border/20">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/60 font-semibold mb-6">
            {t("landing.trustBarLabel")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 text-muted-foreground/50">
            {["ChatGPT", "Gemini", "Claude", "Replit"].map((name) => (
              <div key={name} className="flex items-center gap-2 text-sm font-mono font-semibold tracking-wide">
                <Bot className="w-4 h-4 text-primary/50" />
                {name}
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-semibold mb-6">
            <AlertTriangle className="w-4 h-4" />
            {t("landing.problemBadge")}
          </div>
          <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
            {t("landing.problemTitle")}
          </h3>
          <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
            {t("landing.problemDesc")}
          </p>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto"
          >
            {["problemItem1", "problemItem2", "problemItem3", "problemItem4"].map((key) => (
              <motion.div
                key={key}
                variants={fadeUp}
                className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-left"
              >
                <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
                <span className="text-sm text-foreground font-medium">{t(`landing.${key}`)}</span>
              </motion.div>
            ))}
          </motion.div>
          <motion.p variants={fadeUp} className="mt-8 text-sm text-destructive/80 font-medium">
            {t("landing.problemWarning")}
          </motion.p>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
            <Shield className="w-4 h-4" />
            {t("landing.solutionBadge")}
          </div>
          <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
            {t("landing.solutionTitle")}
          </h3>
          <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
            {t("landing.solutionDesc")}
          </p>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto"
          >
            {[
              { key: "solutionItem1", icon: Scan },
              { key: "solutionItem2", icon: Eye },
              { key: "solutionItem3", icon: Lock },
              { key: "solutionItem4", icon: Sparkles },
            ].map(({ key, icon: Icon }) => (
              <motion.div
                key={key}
                variants={fadeUp}
                className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-left"
              >
                <Icon className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm text-foreground font-medium">{t(`landing.${key}`)}</span>
              </motion.div>
            ))}
          </motion.div>
          <motion.p variants={fadeUp} className="mt-8 text-primary font-semibold">
            {t("landing.solutionTagline")}
          </motion.p>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {t("landing.howTitle")}
          </h3>
          <p className="text-muted-foreground mb-12">{t("landing.howSubtitle")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", key: "howStep1", icon: MessageSquare },
              { step: "2", key: "howStep2", icon: Scan },
              { step: "3", key: "howStep3", icon: Shield },
            ].map(({ step, key, icon: Icon }) => (
              <motion.div
                key={key}
                variants={fadeUp}
                className="relative p-6 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg mb-4 mx-auto">
                  {step}
                </div>
                <Icon className="w-8 h-8 text-primary/60 mx-auto mb-3" />
                <h4 className="text-base font-bold text-foreground mb-2">{t(`landing.${key}Title`)}</h4>
                <p className="text-sm text-muted-foreground">{t(`landing.${key}Desc`)}</p>
              </motion.div>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground/70">{t("landing.howFooter")}</p>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
            {t("landing.modesTitle")}
          </h3>
          <p className="text-muted-foreground mb-12 text-center">{t("landing.modesSubtitle")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                key: "personal",
                icon: User,
                color: "text-emerald-400",
                border: "border-emerald-500/20",
                bg: "bg-emerald-500/5",
                action: () => onNavigate("personal"),
              },
              {
                key: "developer",
                icon: Code2,
                color: "text-amber-400",
                border: "border-amber-500/20",
                bg: "bg-amber-500/5",
                action: () => onNavigate("devMode"),
              },
              {
                key: "dataset",
                icon: Database,
                color: "text-cyan-400",
                border: "border-cyan-500/20",
                bg: "bg-cyan-500/5",
                action: onTryDemo,
              },
            ].map(({ key, icon: Icon, color, border, bg, action }) => (
              <motion.div
                key={key}
                variants={fadeUp}
                className={`p-6 rounded-2xl border ${border} ${bg} backdrop-blur-sm cursor-pointer hover:scale-[1.02] transition-transform`}
                onClick={action}
              >
                <Icon className={`w-8 h-8 ${color} mb-4`} />
                <h4 className="text-lg font-bold text-foreground mb-2">{t(`landing.mode${key.charAt(0).toUpperCase() + key.slice(1)}Title`)}</h4>
                <p className="text-sm text-muted-foreground mb-4">{t(`landing.mode${key.charAt(0).toUpperCase() + key.slice(1)}Desc`)}</p>
                <ul className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className={`w-4 h-4 ${color} shrink-0 mt-0.5`} />
                      {t(`landing.mode${key.charAt(0).toUpperCase() + key.slice(1)}F${i}`)}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {t("landing.featuresTitle")}
          </h3>
          <p className="text-muted-foreground mb-12">{t("landing.featuresSubtitle")}</p>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="flex items-start gap-3 p-4 rounded-xl border border-primary/10 bg-card/30 text-left"
              >
                <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground font-medium">{t(`landing.feature${i}`)}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {t("landing.useCasesTitle")}
          </h3>
          <p className="text-muted-foreground mb-12">{t("landing.useCasesSubtitle")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { key: "developers", icon: Code2, color: "text-cyan-400" },
              { key: "companies", icon: Building2, color: "text-violet-400" },
              { key: "governments", icon: Globe, color: "text-emerald-400" },
              { key: "individuals", icon: User, color: "text-amber-400" },
            ].map(({ key, icon: Icon, color }) => (
              <motion.div
                key={key}
                variants={fadeUp}
                className="p-6 rounded-2xl border border-border/30 bg-card/40 text-left"
              >
                <Icon className={`w-7 h-7 ${color} mb-3`} />
                <h4 className="text-base font-bold text-foreground mb-1">{t(`landing.useCase${key.charAt(0).toUpperCase() + key.slice(1)}Title`)}</h4>
                <p className="text-sm text-muted-foreground">{t(`landing.useCase${key.charAt(0).toUpperCase() + key.slice(1)}Desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper className="py-8 md:py-12">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-muted-foreground/50 italic">{t("landing.socialProof")}</p>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {t("landing.ctaTitle")}
          </h3>
          <p className="text-muted-foreground text-lg mb-8">{t("landing.ctaDesc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onTryDemo}
              className="px-8 py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-bold shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:scale-105 transition-all"
            >
              {t("landing.tryDemo")}
            </button>
            <button
              onClick={() => onNavigate("firewallDocs")}
              className="px-8 py-3.5 rounded-xl border border-border/60 bg-card/50 text-foreground text-base font-bold hover:bg-muted/40 transition-all"
            >
              {t("landing.installExtension")}
            </button>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
            {t("landing.pricingTitle")}
          </h3>
          <p className="text-muted-foreground mb-12 text-center">{t("landing.pricingSubtitle")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                key: "free",
                price: "$0",
                icon: Zap,
                features: ["pricingFreeF1", "pricingFreeF2"],
                highlight: false,
              },
              {
                key: "pro",
                price: "$49",
                icon: Crown,
                features: ["pricingProF1", "pricingProF2", "pricingProF3"],
                highlight: true,
              },
              {
                key: "enterprise",
                price: null,
                icon: Building2,
                features: ["pricingEntF1", "pricingEntF2", "pricingEntF3"],
                highlight: false,
              },
            ].map(({ key, price, icon: Icon, features, highlight }) => (
              <motion.div
                key={key}
                variants={fadeUp}
                className={`p-6 rounded-2xl border ${highlight ? "border-primary/40 bg-primary/5 shadow-[0_0_40px_rgba(6,182,212,0.1)]" : "border-border/30 bg-card/40"}`}
              >
                <Icon className={`w-7 h-7 ${highlight ? "text-primary" : "text-muted-foreground"} mb-3`} />
                <h4 className="text-lg font-bold text-foreground mb-1">{t(`landing.pricingTier${key.charAt(0).toUpperCase() + key.slice(1)}`)}</h4>
                <div className="text-2xl font-extrabold text-foreground mb-1">
                  {price ? (
                    <>
                      {price}
                      <span className="text-sm font-normal text-muted-foreground">{t("pricing.month")}</span>
                    </>
                  ) : (
                    <span className="text-base">{t("pricing.customPricing")}</span>
                  )}
                </div>
                <ul className="space-y-2 mt-4 mb-6">
                  {features.map((fKey) => (
                    <li key={fKey} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {t(`landing.${fKey}`)}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onNavigate("pricing")}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${highlight
                    ? "bg-primary text-primary-foreground hover:brightness-110"
                    : "bg-muted/30 text-foreground hover:bg-muted/50"
                    }`}
                >
                  {t(`landing.pricingCta${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                  <ArrowRight className="w-4 h-4 inline ml-1" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      <div className="text-center py-12 border-t border-border/20">
        <p className="text-xl md:text-2xl font-display font-bold text-foreground">
          {t("landing.finalTagline")}
        </p>
      </div>
    </div>
  );
}
