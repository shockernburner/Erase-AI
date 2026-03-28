import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { ShieldX, Check, ArrowLeft, Loader2, Crown, Zap, Building2, Mail, Calendar, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui-elements";

interface PricingPageProps {
  onBack: () => void;
}

const tiers = [
  {
    id: "free" as const,
    name: "Free",
    price: 0,
    icon: <Zap className="w-6 h-6" />,
    description: "Get started with basic dataset tools",
    features: [
      "Basic dataset analysis",
      "Up to 100 rows per dataset",
      "PII & bias detection",
      "Data erasure & redaction",
      "Version history",
    ],
    cta: "Current Plan",
    highlight: false,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: 49,
    icon: <Crown className="w-6 h-6" />,
    description: "Full power for production data teams",
    features: [
      "Full dataset analysis",
      "Unlimited rows per dataset",
      "ML Pipeline Feedback",
      "Advanced PII detection",
      "Priority support",
      "Export recommendations",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: -1,
    icon: <Building2 className="w-6 h-6" />,
    description: "Custom solutions for large organizations",
    features: [
      "Everything in Pro",
      "Custom analysis rules",
      "API access & webhooks",
      "SSO integration",
      "Dedicated support",
      "Custom data retention",
    ],
    cta: "Contact Us",
    highlight: false,
  },
];

interface PlanDetails {
  planType: string;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  planStartDate: string | null;
  planEndDate: string | null;
}

export default function PricingPage({ onBack }: PricingPageProps) {
  const { user } = useAuth();
  const currentPlan = user?.planType || "free";
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);

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
        body: JSON.stringify({ plan: "pro" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to start checkout");
        return;
      }

      const confirmRes = await fetch(
        `${import.meta.env.BASE_URL}api/billing/checkout/${data.checkoutSessionId}/confirm`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const confirmData = await confirmRes.json();
      if (confirmRes.ok && confirmData.success) {
        window.location.reload();
      } else {
        alert(confirmData.error || "Checkout failed");
      }
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
            Back to Dashboard
          </button>

          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                <ShieldX className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                EraseAI
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Plan</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Scale your AI data governance with the right tier for your team
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
                    Most Popular
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
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                  )}
                  {tier.price > 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">${tier.price}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                  )}
                  {tier.price < 0 && (
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold text-foreground">Custom Pricing</span>
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
                    Current Plan
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
                        Processing...
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
                    {isDowngrade ? "Included in your plan" : ""}
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
              Subscription Management
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="text-sm font-semibold text-foreground capitalize">{planDetails.subscriptionStatus || "Active"}</p>
              </div>
              <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Started</p>
                <p className="text-sm font-semibold text-foreground">
                  {planDetails.planStartDate ? new Date(planDetails.planStartDate).toLocaleDateString() : "—"}
                </p>
              </div>
              <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Renews</p>
                <p className="text-sm font-semibold text-foreground">
                  {planDetails.planEndDate ? new Date(planDetails.planEndDate).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowCancelConfirm(true)}
              variant="outline"
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <AlertTriangle className="w-4 h-4" />
              Cancel Subscription
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
                <h3 className="text-xl font-bold text-foreground">Cancel Subscription</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to cancel your Pro subscription? You will lose access to:
              </p>
              <ul className="space-y-2 mb-6">
                <li className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  Unlimited rows per dataset
                </li>
                <li className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  ML Pipeline Feedback
                </li>
                <li className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  Advanced PII detection
                </li>
              </ul>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCancelConfirm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Keep Subscription
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Yes, Cancel"
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
                <h3 className="text-xl font-bold text-foreground">Enterprise Inquiry</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                For enterprise pricing and custom solutions, please reach out to our sales team.
              </p>
              <div className="bg-muted/20 rounded-xl p-4 border border-border/30 mb-6">
                <p className="text-sm font-mono text-foreground">sales@eraseai.ai</p>
              </div>
              <Button
                onClick={() => setShowContact(false)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
