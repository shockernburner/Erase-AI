import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";
import { ShieldX, Check, ArrowLeft, Loader2, Crown, Zap, Building2, Mail, Calendar, AlertTriangle, MessageCircle, Briefcase, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui-elements";
import { LanguageSelector } from "@/components/LanguageSelector";

interface PricingPageProps {
  onBack: () => void;
}

interface PlanDetails {
  planType: string;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  planStartDate: string | null;
  planEndDate: string | null;
}

type TierId = "free" | "personal" | "pro" | "business" | "enterprise";

const TIER_ORDER: TierId[] = ["free", "personal", "pro", "business", "enterprise"];

function tierIndex(id: TierId): number {
  return TIER_ORDER.indexOf(id);
}

export default function PricingPage({ onBack }: PricingPageProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const currentPlan = (user?.planType || "free") as TierId;
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);

  const tiers = [
    {
      id: "free" as TierId,
      name: t("pricing.tierFree"),
      price: 0,
      icon: <Zap className="w-6 h-6" />,
      description: t("pricing.tierFreeDesc"),
      segment: t("pricing.tierFreeSegment"),
      features: [
        t("pricing.tierFreeF1"),
        t("pricing.tierFreeF2"),
        t("pricing.tierFreeF3"),
        t("pricing.tierFreeF4"),
        t("pricing.tierFreeF5"),
      ],
      cta: t("pricing.tierFreeCta"),
      highlight: false,
    },
    {
      id: "personal" as TierId,
      name: t("pricing.tierPersonal"),
      price: 10,
      icon: <Shield className="w-6 h-6" />,
      description: t("pricing.tierPersonalDesc"),
      segment: t("pricing.tierPersonalSegment"),
      features: [
        t("pricing.tierPersonalF1"),
        t("pricing.tierPersonalF2"),
        t("pricing.tierPersonalF3"),
        t("pricing.tierPersonalF4"),
        t("pricing.tierPersonalF5"),
      ],
      cta: t("pricing.tierPersonalCta"),
      highlight: false,
    },
    {
      id: "pro" as TierId,
      name: t("pricing.tierPro"),
      price: 49,
      icon: <Crown className="w-6 h-6" />,
      description: t("pricing.tierProDesc"),
      segment: t("pricing.tierProSegment"),
      features: [
        t("pricing.tierProF1"),
        t("pricing.tierProF2"),
        t("pricing.tierProF3"),
        t("pricing.tierProF4"),
        t("pricing.tierProF5"),
        t("pricing.tierProF6"),
        t("pricing.tierProF7"),
      ],
      cta: t("pricing.tierProCta"),
      highlight: true,
    },
    {
      id: "business" as TierId,
      name: t("pricing.tierBusiness"),
      price: 149,
      icon: <Briefcase className="w-6 h-6" />,
      description: t("pricing.tierBusinessDesc"),
      segment: t("pricing.tierBusinessSegment"),
      features: [
        t("pricing.tierBusinessF1"),
        t("pricing.tierBusinessF2"),
        t("pricing.tierBusinessF3"),
        t("pricing.tierBusinessF4"),
        t("pricing.tierBusinessF5"),
        t("pricing.tierBusinessF6"),
      ],
      cta: t("pricing.tierBusinessCta"),
      highlight: false,
    },
    {
      id: "enterprise" as TierId,
      name: t("pricing.tierEnterprise"),
      price: -1,
      icon: <Building2 className="w-6 h-6" />,
      description: t("pricing.tierEnterpriseDesc"),
      segment: t("pricing.tierEnterpriseSegment"),
      features: [
        t("pricing.tierEnterpriseF1"),
        t("pricing.tierEnterpriseF2"),
        t("pricing.tierEnterpriseF3"),
        t("pricing.tierEnterpriseF4"),
        t("pricing.tierEnterpriseF5"),
        t("pricing.tierEnterpriseF6"),
      ],
      cta: t("pricing.tierEnterpriseCta"),
      highlight: false,
    },
  ];

  useEffect(() => {
    if (currentPlan !== "free") {
      fetch(`${import.meta.env.BASE_URL}api/billing/plan`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setPlanDetails(d))
        .catch(() => {});
    }
  }, [currentPlan]);

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/billing/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.reload();
      } else {
        alert(data.error || t("pricing.failedCancel"));
      }
    } catch {
      alert(t("pricing.somethingWrong"));
    } finally {
      setCancelLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const handleCheckout = async (plan: string) => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          plan,
          returnUrl: window.location.origin + import.meta.env.BASE_URL + "?checkout=success",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || t("pricing.failedCheckout"));
        return;
      }

      if (data.checkoutUrl && data.intentId) {
        sessionStorage.setItem("eraseai_checkout_intent", data.intentId);
        window.location.href = data.checkoutUrl;
        return;
      }

      alert(t("pricing.failedCheckoutSession"));
    } catch {
      alert(t("pricing.somethingWrong"));
    } finally {
      setCheckoutLoading(null);
    }
  };

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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <div className="flex justify-end mb-2">
          <LanguageSelector />
        </div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("pricing.backToDashboard")}
          </button>

          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                <ShieldX className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                {t("app.name")}
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{t("pricing.chooseYourPlan")}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("pricing.scaleGovernance")}
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {tiers.map((tier, i) => {
            const isCurrentPlan = currentPlan === tier.id;
            const isDowngrade = tierIndex(tier.id) < tierIndex(currentPlan);
            const isUpgrade = tierIndex(tier.id) > tierIndex(currentPlan);
            const canCheckout = tier.id === "personal" || tier.id === "pro" || tier.id === "business";

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  tier.highlight
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
                    : "border-border/50 bg-card/50"
                } backdrop-blur-md`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-cyan-400 text-black text-xs font-bold px-4 py-1 rounded-full">
                    {t("pricing.mostPopular")}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-2">
                  <span className={`${tier.highlight ? "text-primary" : "text-muted-foreground"}`}>
                    {tier.icon}
                  </span>
                  <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
                </div>

                <p className="text-xs text-primary/80 font-medium mb-2">{tier.segment}</p>
                <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>

                <div className="mb-6">
                  {tier.price === 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">$0</span>
                      <span className="text-muted-foreground text-sm">{t("pricing.month")}</span>
                    </div>
                  )}
                  {tier.price > 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">${tier.price}</span>
                      <span className="text-muted-foreground text-sm">{t("pricing.month")}</span>
                    </div>
                  )}
                  {tier.price < 0 && (
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold text-foreground">{t("pricing.customPricing")}</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${tier.highlight ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-foreground/90">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-semibold bg-muted/30 text-muted-foreground border border-border/30">
                    {t("pricing.currentPlan")}
                  </div>
                ) : isUpgrade && canCheckout ? (
                  <Button
                    onClick={() => handleCheckout(tier.id)}
                    disabled={checkoutLoading !== null}
                    className={`w-full gap-2 py-5 font-bold ${
                      tier.highlight
                        ? "bg-gradient-to-r from-primary to-cyan-400 text-black hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {checkoutLoading === tier.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("pricing.processing")}
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4" />
                        {tier.cta}
                      </>
                    )}
                  </Button>
                ) : tier.id === "enterprise" && !isDowngrade ? (
                  <Button
                    onClick={() => setShowContact(true)}
                    variant="outline"
                    className="w-full gap-2 py-5 border-border/50 hover:bg-muted/30"
                  >
                    <Mail className="w-4 h-4" />
                    {tier.cta}
                  </Button>
                ) : (
                  <div className="w-full py-3 rounded-xl text-center text-sm text-muted-foreground">
                    {isDowngrade ? t("pricing.includedInPlan") : ""}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {currentPlan !== "free" && planDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-md p-6"
          >
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {t("pricing.subscriptionManagement")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">{t("pricing.status")}</p>
                <p className="text-sm font-semibold text-foreground capitalize">{planDetails.subscriptionStatus || t("pricing.active")}</p>
              </div>
              <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">{t("pricing.started")}</p>
                <p className="text-sm font-semibold text-foreground">
                  {planDetails.planStartDate ? new Date(planDetails.planStartDate).toLocaleDateString() : "\u2014"}
                </p>
              </div>
              <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">{t("pricing.renews")}</p>
                <p className="text-sm font-semibold text-foreground">
                  {planDetails.planEndDate ? new Date(planDetails.planEndDate).toLocaleDateString() : "\u2014"}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowCancelConfirm(true)}
              variant="outline"
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <AlertTriangle className="w-4 h-4" />
              {t("pricing.cancelSubscription")}
            </Button>
          </motion.div>
        )}

        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCancelConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <h3 className="text-xl font-bold text-foreground">{t("pricing.cancelConfirmTitle")}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {t("pricing.cancelConfirmText")}
              </p>
              <ul className="space-y-2 mb-6">
                <li className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {t("pricing.cancelFeature1")}
                </li>
                <li className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {t("pricing.cancelFeature2")}
                </li>
                <li className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {t("pricing.cancelFeature3")}
                </li>
              </ul>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCancelConfirm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  {t("pricing.keepSubscription")}
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("pricing.cancelling")}
                    </>
                  ) : (
                    t("pricing.yesCancel")
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowContact(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold text-foreground">{t("pricing.enterpriseInquiry")}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {t("pricing.enterpriseText")}
              </p>
              <div className="space-y-3 mb-6">
                <a
                  href="mailto:director@futureonward.com"
                  className="flex items-center gap-3 bg-muted/20 rounded-xl p-4 border border-border/30 hover:bg-muted/30 transition-colors"
                >
                  <Mail className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{t("admin.email")}</p>
                    <p className="text-sm font-mono text-foreground">director@futureonward.com</p>
                  </div>
                </a>
                <a
                  href="https://wa.me/85290576851"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-muted/20 rounded-xl p-4 border border-border/30 hover:bg-muted/30 transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{t("pricing.whatsapp")}</p>
                    <p className="text-sm font-mono text-foreground">+852 9057 6851</p>
                  </div>
                </a>
              </div>
              <Button
                onClick={() => setShowContact(false)}
                variant="outline"
                className="w-full"
              >
                {t("pricing.close")}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
