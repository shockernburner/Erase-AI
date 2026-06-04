import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Crown,
  Loader2,
  Mail,
  MessageCircle,
  Shield,
  ShieldX,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  const [showPaymentsMaintenance, setShowPaymentsMaintenance] = useState(false);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);

  useEffect(() => {
    if (currentPlan !== "free") {
      fetch(`${import.meta.env.BASE_URL}api/billing/plan`, { credentials: "include" })
        .then((response) => response.json())
        .then((data) => setPlanDetails(data))
        .catch(() => {});
    }
  }, [currentPlan]);

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/billing/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data.success) {
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

  const handleCheckout = (_plan: string) => {
    setShowPaymentsMaintenance(true);
  };
  void checkoutLoading;
  void setCheckoutLoading;

  // TODO: Rename backend plan ids `pro` -> `developer` and `business` -> `team`
  // across billing, analytics, and stored plan metadata once a migration is planned.
  const tiers = [
    {
      id: "free" as TierId,
      name: "Free",
      monthlyPrice: 0,
      icon: <Zap className="w-6 h-6" />,
      description: "Testing EraseAI",
      segment: "Best for evaluating the browser firewall before rollout.",
      features: [
        "25 scans/month",
        "Browser firewall",
        "Basic PII detection",
        "Manual redaction",
        "No team features",
        "No API access",
      ],
      cta: "Start Free",
      highlight: false,
    },
    {
      id: "personal" as TierId,
      name: "Personal",
      monthlyPrice: 5,
      icon: <Shield className="w-6 h-6" />,
      description: "Individuals, freelancers, students, and consultants",
      segment: "Protect personal AI chats and files before they leave your browser.",
      features: [
        "Browser firewall",
        "ChatGPT, Claude, Gemini protection",
        "PII, bank data, and API key detection",
        "Auto-redaction",
        "Local history",
        "Basic risk score",
      ],
      cta: "Protect My AI Chats",
      highlight: false,
    },
    {
      id: "pro" as TierId,
      name: "Developer",
      monthlyPrice: 19,
      icon: <Crown className="w-6 h-6" />,
      description: "App builders and indie SaaS founders",
      segment: "Add prompt scanning and AI firewall controls to your own product.",
      features: [
        "Everything in Personal",
        "API access",
        "10,000 scans/month",
        "Input/output scanning",
        "API key and token detection",
        "Webhooks",
        "Basic logs",
        "SDK examples",
      ],
      cta: "Get API Key",
      note: "$5 per extra 10,000 scans",
      highlight: true,
    },
    {
      id: "business" as TierId,
      name: "Team",
      monthlyPrice: 99,
      icon: <Users className="w-6 h-6" />,
      description: "Small companies",
      segment: "Roll out shared AI protection across teams with admin controls.",
      features: [
        "10 seats",
        "Browser firewall for team members",
        "Shared policies",
        "Admin dashboard",
        "Audit logs",
        "Export logs",
        "100,000 scans/month",
        "Priority support",
      ],
      cta: "Secure My Team",
      note: "Extra seats: $8/user/month",
      highlight: false,
    },
    {
      id: "enterprise" as TierId,
      name: "Enterprise",
      monthlyPrice: -1,
      icon: <Building2 className="w-6 h-6" />,
      description: "Banks, law firms, healthcare, government, and large companies",
      segment: "For private deployment, security requirements, and governance workflows.",
      features: [
        "SSO",
        "Custom policies",
        "Private deployment option",
        "Compliance reporting",
        "Dataset governance",
        "Machine unlearning module",
        "Dedicated support",
        "SLA",
        "On-prem / VPC option",
      ],
      cta: "Book Demo",
      highlight: false,
    },
  ];

  const comparisonRows = [
    ["Browser firewall", "Yes", "Yes", "Yes", "Yes", "Yes"],
    ["Monthly scans", "25", "Unlimited personal use", "10,000", "100,000", "Custom"],
    ["API access", "No", "No", "Yes", "Yes", "Yes"],
    ["Team policies", "No", "No", "No", "Yes", "Yes"],
    ["Audit logs", "No", "No", "Basic", "Yes", "Advanced"],
    ["Enterprise deployment", "No", "No", "No", "No", "Yes"],
  ];

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

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="mb-3 flex justify-end">
          <LanguageSelector />
        </div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="rounded-xl bg-primary p-2 text-primary-foreground shadow-[0_0_20px_rgba(6,182,212,0.45)]">
                <ShieldX className="w-7 h-7" />
              </div>
              <h1 className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-3xl font-display font-extrabold tracking-tight text-transparent">
                EraseAI
              </h1>
            </div>
            <h2 className="text-3xl font-display font-bold text-foreground">Pricing for AI firewall protection</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              EraseAI stops sensitive data from leaking into AI tools. Choose the browser firewall, API, or enterprise controls that match your rollout stage.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          {tiers.map((tier, index) => {
            const isCurrentPlan = currentPlan === tier.id;
            const isDowngrade = tierIndex(tier.id) < tierIndex(currentPlan);
            const isUpgrade = tierIndex(tier.id) > tierIndex(currentPlan);
            const canCheckout = tier.id === "personal" || tier.id === "pro" || tier.id === "business";

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`relative flex flex-col rounded-3xl border p-6 backdrop-blur-md ${tier.highlight ? "border-primary/50 bg-primary/5 shadow-[0_0_30px_rgba(6,182,212,0.15)]" : "border-border/50 bg-card/50"}`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-cyan-400 px-4 py-1 text-xs font-bold text-black">
                    Most Popular
                  </div>
                )}

                <div className="mb-2 flex items-center gap-3">
                  <span className={tier.highlight ? "text-primary" : "text-muted-foreground"}>{tier.icon}</span>
                  <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
                </div>

                <p className="mb-2 text-xs font-medium text-primary/80">{tier.description}</p>
                <p className="mb-4 text-sm text-muted-foreground">{tier.segment}</p>

                <div className="mb-6">
                  {tier.monthlyPrice === 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">$0</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                  )}
                  {tier.monthlyPrice > 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">${tier.monthlyPrice}</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                  )}
                  {tier.monthlyPrice < 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">Custom</span>
                    </div>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${tier.highlight ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-foreground/90">{feature}</span>
                    </li>
                  ))}
                </ul>

                {tier.note && <p className="mb-4 text-xs font-semibold text-primary">{tier.note}</p>}

                {isCurrentPlan ? (
                  <div className="w-full rounded-xl border border-border/30 bg-muted/30 py-3 text-center text-sm font-semibold text-muted-foreground">
                    Current Plan
                  </div>
                ) : isUpgrade && canCheckout ? (
                  <Button
                    onClick={() => handleCheckout(tier.id)}
                    disabled={checkoutLoading !== null}
                    className={`w-full gap-2 py-5 font-bold ${tier.highlight ? "bg-gradient-to-r from-primary to-cyan-400 text-black hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.4)]" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                  >
                    {checkoutLoading === tier.id ? (
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
                ) : tier.id === "enterprise" && !isDowngrade ? (
                  <Button onClick={() => setShowContact(true)} variant="outline" className="w-full gap-2 border-border/50 py-5 hover:bg-muted/30">
                    <Mail className="w-4 h-4" />
                    {tier.cta}
                  </Button>
                ) : tier.id === "free" ? (
                  <div className="w-full rounded-xl py-3 text-center text-sm text-muted-foreground">Available by changing your current subscription</div>
                ) : (
                  <div className="w-full rounded-xl py-3 text-center text-sm text-muted-foreground">
                    {isDowngrade ? "Included in your current plan scope" : ""}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-10 overflow-hidden rounded-3xl border border-border/50 bg-card/50 backdrop-blur-md">
          <div className="grid grid-cols-6 border-b border-border/40 bg-background/60 text-sm font-semibold text-foreground">
            <div className="px-4 py-4">Compare</div>
            <div className="px-4 py-4">Free</div>
            <div className="px-4 py-4">Personal</div>
            <div className="px-4 py-4">Developer</div>
            <div className="px-4 py-4">Team</div>
            <div className="px-4 py-4">Enterprise</div>
          </div>
          {comparisonRows.map((row) => (
            <div key={row[0]} className="grid grid-cols-6 border-b border-border/30 last:border-b-0 text-sm">
              {row.map((cell, index) => (
                <div key={`${row[0]}-${index}`} className={`px-4 py-4 ${index === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </motion.div>

        {currentPlan !== "free" && planDetails && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-10 rounded-3xl border border-border/50 bg-card/50 p-6 backdrop-blur-md">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <Calendar className="w-5 h-5 text-primary" />
              Subscription Management
            </h3>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
                <p className="mb-1 text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-semibold capitalize text-foreground">{planDetails.subscriptionStatus || "Active"}</p>
              </div>
              <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
                <p className="mb-1 text-xs text-muted-foreground">Started</p>
                <p className="text-sm font-semibold text-foreground">
                  {planDetails.planStartDate ? new Date(planDetails.planStartDate).toLocaleDateString() : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
                <p className="mb-1 text-xs text-muted-foreground">Renews</p>
                <p className="text-sm font-semibold text-foreground">
                  {planDetails.planEndDate ? new Date(planDetails.planEndDate).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCancelConfirm(true)} variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
              <AlertTriangle className="w-4 h-4" />
              Cancel Subscription
            </Button>
          </motion.div>
        )}

        {showCancelConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(event) => event.stopPropagation()} className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <h3 className="text-xl font-bold text-foreground">Cancel Subscription</h3>
              </div>
              <p className="mb-6 text-sm text-muted-foreground">Are you sure you want to cancel your subscription? You will lose access to:</p>
              <ul className="mb-6 space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-destructive" />AI firewall protections above the free tier</li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-destructive" />API access, logs, and team controls</li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-destructive" />Advanced redaction and policy management</li>
              </ul>
              <div className="flex gap-3">
                <Button onClick={() => setShowCancelConfirm(false)} variant="outline" className="flex-1">Keep Subscription</Button>
                <Button onClick={handleCancel} disabled={cancelLoading} className="flex-1 gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

        {showPaymentsMaintenance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPaymentsMaintenance(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="payments-maintenance-title"
              className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h3 id="payments-maintenance-title" className="text-xl font-bold text-foreground">
                  {t("pricing.maintenanceTitle")}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {t("pricing.maintenanceBody")}
              </p>
              <Button
                onClick={() => setShowPaymentsMaintenance(false)}
                className="w-full"
                autoFocus
              >
                {t("pricing.maintenanceOk")}
              </Button>
            </motion.div>
          </motion.div>
        )}

        {showContact && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowContact(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(event) => event.stopPropagation()} className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <Building2 className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold text-foreground">Book Demo</h3>
              </div>
              <p className="mb-6 text-sm text-muted-foreground">Talk to the EraseAI team about private deployment, governance, audit workflows, and enterprise rollout requirements.</p>
              <div className="mb-6 space-y-3">
                <a href="mailto:director@vantward.com" className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <Mail className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="mb-0.5 text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-mono text-foreground">director@vantward.com</p>
                  </div>
                </a>
                <a href="https://wa.me/85290576851" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <MessageCircle className="h-5 w-5 shrink-0 text-green-500" />
                  <div>
                    <p className="mb-0.5 text-xs text-muted-foreground">WhatsApp</p>
                    <p className="text-sm font-mono text-foreground">+852 9057 6851</p>
                  </div>
                </a>
              </div>
              <Button onClick={() => setShowContact(false)} variant="outline" className="w-full">Close</Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
