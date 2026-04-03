import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";
import { ShieldX, Check, ArrowLeft, Loader2, Crown, Zap, Building2, Mail, Calendar, AlertTriangle, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui-elements";

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

export default function PricingPage({ onBack }: PricingPageProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const currentPlan = user?.planType || "free";
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);

  const tiers = [
    {
      id: "free" as const,
      name: t("pricing.tierFree"),
      price: 0,
      icon: <Zap className="w-6 h-6" />,
      description: t("pricing.tierFreeDesc"),
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
      id: "pro" as const,
      name: t("pricing.tierPro"),
      price: 49,
      icon: <Crown className="w-6 h-6" />,
      description: t("pricing.tierProDesc"),
      features: [
        t("pricing.tierProF1"),
        t("pricing.tierProF2"),
        t("pricing.tierProF3"),
        t("pricing.tierProF4"),
        t("pricing.tierProF5"),
        t("pricing.tierProF6"),
      ],
      cta: t("pricing.tierProCta"),
      highlight: true,
    },
    {
      id: "enterprise" as const,
      name: t("pricing.tierEnterprise"),
      price: -1,
      icon: <Building2 className="w-6 h-6" />,
      description: t("pricing.tierEnterpriseDesc"),
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
        alert(data.error || "Failed to cancel subscription");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setCancelLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          plan: "pro",
          returnUrl: window.location.origin + import.meta.env.BASE_URL + "?checkout=success",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to start checkout");
        return;
      }

      if (data.checkoutUrl && data.intentId) {
        sessionStorage.setItem("eraseai_checkout_intent", data.intentId);
        window.location.href = data.checkoutUrl;
        return;
      }

      alert("Failed to create checkout session");
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(false);
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

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => {
            const isCurrentPlan = currentPlan === tier.id;
            const isDowngrade = (currentPlan === "pro" && tier.id === "free") || (currentPlan === "enterprise" && (tier.id === "free" || tier.id === "pro"));

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

                <div className="flex items-center gap-3 mb-4">
                  <span className={`${tier.highlight ? "text-primary" : "text-muted-foreground"}`}>
                    {tier.icon}
                  </span>
                  <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
                </div>

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
                ) : tier.id === "pro" && !isDowngrade ? (
                  <Button
                    onClick={handleUpgrade}
                    disabled={checkoutLoading}
                    className="w-full gap-2 bg-gradient-to-r from-primary to-cyan-400 text-black font-bold hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.4)] py-5"
                  >
                    {checkoutLoading ? (
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
                ) : tier.id === "enterprise" ? (
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
                <p className="text-sm font-semibold text-foreground capitalize">{planDetails.subscriptionStatus || "Active"}</p>
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
                    <p className="text-xs text-muted-foreground mb-0.5">WhatsApp</p>
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
