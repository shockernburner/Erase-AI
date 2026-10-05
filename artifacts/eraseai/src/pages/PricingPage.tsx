import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Crown,
  Loader2,
  Mail,
  MessageCircle,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui-elements";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PlanFeatureSections } from "@/components/PlanFeatureSections";
import { TeamCheckoutDialog } from "@/components/TeamCheckoutDialog";
import { ORG_COVERAGE_STEPS, takePricingFocus } from "@/lib/products";
import { PRICING_COMPARISON, PRICING_TIERS, annualPriceFor, type PricingTierId } from "@/lib/pricingPlans";
import { BrandLogo } from "@/components/BrandLogo";

interface PricingPageProps {
  onBack: () => void;
  /** Inside the app shell: no own back button, language picker or logo. */
  embedded?: boolean;
}

interface PlanDetails {
  planType: string;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  planStartDate: string | null;
  planEndDate: string | null;
}

type TierId = PricingTierId;


const TIER_ORDER: TierId[] = ["free", "personal", "pro", "business", "enterprise"];

function tierIndex(id: TierId): number {
  return TIER_ORDER.indexOf(id);
}


export default function PricingPage({ onBack, embedded = false }: PricingPageProps) {
  const { user } = useAuth();
  const currentPlan = (user?.planType || "free") as TierId;
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showTeamCheckout, setShowTeamCheckout] = useState(false);
  // Plan picked elsewhere (home page, homepage before sign-up, extension);
  // the comparison table opens with it selected.
  const [focusPlan] = useState<TierId | null>(() => takePricingFocus());
  const [selected, setSelected] = useState<TierId>(() => focusPlan ?? (currentPlan === "free" ? "personal" : currentPlan));
  const compareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusPlan) return;
    const t = setTimeout(() => compareRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    return () => clearTimeout(t);
  }, [focusPlan]);

  // One place that knows how each plan is bought.
  const startPlan = (id: TierId) => {
    if (id === "business") setShowTeamCheckout(true);
    else if (id === "enterprise") setShowContact(true);
    else if (id === "personal" || id === "pro") handleCheckout(id);
  };
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
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

  const handleCheckout = async (plan: string) => {
    setCheckoutLoading(plan);
    try {
      const returnUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
      const response = await fetch(`${import.meta.env.BASE_URL}api/billing/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingPeriod, returnUrl }),
      });
      const data = await response.json();
      if (response.ok && data.url) {
        if (data.sessionId) {
          sessionStorage.setItem("eraseai_checkout_intent", data.sessionId);
        }
        window.location.href = data.url;
        return;
      }
      alert(data.error || "Unable to start checkout. Please try again.");
      setCheckoutLoading(null);
    } catch {
      alert("Something went wrong. Please try again.");
      setCheckoutLoading(null);
    }
  };

  // TODO: Rename backend plan ids `pro` -> `developer` and `business` -> `team`
  // across billing, analytics, and stored plan metadata once a migration is planned.
  //
  // Who pays decides the plan: Personal and Developer are paid by one person for
  // themselves. When an organization pays (Team or Enterprise), its members are
  // organization users and get Enterprise-level protection, never "Personal".
  // `soon` marks features not built yet, so the page never sells what does not exist.
  const tierIcons: Record<TierId, ReactNode> = {
    free: <Zap className="w-6 h-6" />,
    personal: <Shield className="w-6 h-6" />,
    pro: <Crown className="w-6 h-6" />,
    business: <Users className="w-6 h-6" />,
    enterprise: <Building2 className="w-6 h-6" />,
  };
  const tiers = PRICING_TIERS.map((tier) => ({ ...tier, icon: tierIcons[tier.id] }));

  const comparisonRows = PRICING_COMPARISON;

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
        {!embedded && (
          <div className="mb-3 flex justify-end">
            <LanguageSelector />
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          {!embedded && (
            <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <div className="text-center">
            <div className={`mb-4 items-center justify-center gap-3 ${embedded ? "hidden" : "flex"}`}>
              <BrandLogo className="h-11 w-11" />
              <h1 className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-3xl font-display font-extrabold tracking-tight text-transparent">
                EraseAI
              </h1>
            </div>
            <h2 className="text-3xl font-display font-bold text-foreground">Pricing for AI firewall protection</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              EraseAI stops sensitive data from leaking into AI tools. Who pays decides your plan: Personal and Developer are for people paying for themselves. When your organization pays (Team or Enterprise), every member gets the Chrome extension and the Android app with full protection by signing in with their work email, and pays nothing.
            </p>
          </div>
        </motion.div>

        <div className="mb-10 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/50 p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setBillingPeriod("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${billingPeriod === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod("annual")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${billingPeriod === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Annual
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${billingPeriod === "annual" ? "bg-black/20 text-primary-foreground" : "bg-primary/15 text-primary"}`}>
                Save 10%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          {tiers.map((tier, index) => {
            const isCurrentPlan = currentPlan === tier.id;
            const isDowngrade = tierIndex(tier.id) < tierIndex(currentPlan);
            const isUpgrade = tierIndex(tier.id) > tierIndex(currentPlan);
            const canCheckout = !tier.contactSales && (tier.id === "personal" || tier.id === "pro" || tier.id === "business");
            const unit = tier.perPerson ? "/person/month" : "/month";

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

                <p className="mb-1 text-xs font-medium text-primary/80">{tier.description}</p>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tier.paidBy}</p>

                <div className="mb-6">
                  {tier.monthlyPrice === 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">$0</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                  )}
                  {tier.monthlyPrice > 0 && billingPeriod === "monthly" && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">${tier.monthlyPrice}</span>
                      <span className="text-sm text-muted-foreground">{unit}</span>
                    </div>
                  )}
                  {tier.annualMonthlyPrice != null && billingPeriod === "annual" && (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-foreground">${tier.annualMonthlyPrice}</span>
                        <span className="text-sm text-muted-foreground">{unit}</span>
                      </div>
                      <p className="mt-1 text-xs text-primary">
                        Billed yearly: ${tier.annualMonthlyPrice * 12} a person
                      </p>
                    </div>
                  )}
                  {tier.seats && <p className="mt-1 text-xs font-semibold text-foreground/80">{tier.seats}</p>}
                  {tier.monthlyPrice > 0 && tier.annualMonthlyPrice == null && billingPeriod === "annual" && (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-foreground">${annualPriceFor(tier.monthlyPrice)}</span>
                        <span className="text-sm text-muted-foreground">/year</span>
                      </div>
                      <p className="mt-1 text-xs text-primary">
                        ≈ ${Math.round(annualPriceFor(tier.monthlyPrice) / 12)}/mo · save 10%
                      </p>
                    </div>
                  )}
                  {tier.monthlyPrice < 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">Contact us for pricing</span>
                    </div>
                  )}
                </div>

                <PlanFeatureSections tier={tier} className="mb-8 flex-1" checkClassName={tier.highlight ? "text-primary" : "text-muted-foreground"} />

                {isCurrentPlan ? (
                  <div className="w-full rounded-xl border border-border/30 bg-muted/30 py-3 text-center text-sm font-semibold text-muted-foreground">
                    Current Plan
                  </div>
                ) : isUpgrade && canCheckout ? (
                  <Button
                    onClick={() => startPlan(tier.id)}
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
                ) : tier.contactSales && !isDowngrade ? (
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

        <div ref={compareRef} className="mt-12 scroll-mt-6">
          <h3 className="mb-1 text-xl font-bold text-foreground">Compare plans</h3>
          <p className="mb-4 text-sm text-muted-foreground">Pick a column to see how it works and get started.</p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="overflow-x-auto rounded-3xl border border-border/50 bg-card/50 backdrop-blur-md">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-background/60">
                  <th className="w-[20%] px-4 py-4 text-left font-semibold text-foreground">Compare</th>
                  {TIER_ORDER.map((id) => {
                    const tier = tiers.find((t) => t.id === id)!;
                    const on = selected === id;
                    return (
                      <th key={id} className={`px-2 py-3 text-left ${on ? "bg-primary/15" : ""}`}>
                        <button
                          type="button"
                          onClick={() => setSelected(id)}
                          aria-pressed={on}
                          className={`w-full rounded-lg px-2 py-1.5 text-left font-semibold transition-colors ${on ? "text-primary" : "text-foreground hover:bg-muted/30"}`}
                        >
                          {tier.name}
                          {currentPlan === id && <span className="ml-1.5 text-[10px] font-bold uppercase text-muted-foreground">yours</span>}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row[0]} className="border-b border-border/30 last:border-b-0">
                    {row.map((cell, index) => {
                      const id = index > 0 ? TIER_ORDER[index - 1] : null;
                      return (
                        <td
                          key={`${row[0]}-${index}`}
                          onClick={id ? () => setSelected(id) : undefined}
                          className={`px-4 py-3 align-top ${index === 0 ? "font-medium text-foreground" : "cursor-pointer text-muted-foreground"} ${id && selected === id ? "bg-primary/10 text-foreground" : ""}`}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {(() => {
            const tier = tiers.find((t) => t.id === selected)!;
            const isOrg = selected === "business" || selected === "enterprise";
            const price =
              tier.monthlyPrice < 0
                ? "Contact us for pricing"
                : tier.monthlyPrice === 0
                  ? "Free"
                  : billingPeriod === "annual" && tier.annualMonthlyPrice != null
                    ? `$${tier.annualMonthlyPrice} ${tier.perPerson ? "a person " : ""}a month, billed yearly`
                    : `$${tier.monthlyPrice} ${tier.perPerson ? "a person " : ""}a month`;
            return (
              <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-foreground">{tier.name}</p>
                    <p className="text-sm text-muted-foreground">{tier.description} · {price}{tier.seats ? ` · ${tier.seats}` : ""}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">{tier.paidBy}</p>
                    {isOrg && (
                      <ol className="mt-3 space-y-1.5 text-sm text-foreground/90">
                        {ORG_COVERAGE_STEPS.map((step, i) => (
                          <li key={step} className="flex gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                  <div className="w-full sm:w-auto">
                    {currentPlan === selected ? (
                      <div className="rounded-xl border border-border/30 bg-muted/30 px-5 py-3 text-center text-sm font-semibold text-muted-foreground">Your current plan</div>
                    ) : selected === "free" ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground">Free needs no checkout: install the extension.</div>
                    ) : (
                      <Button
                        onClick={() => startPlan(selected)}
                        disabled={checkoutLoading !== null}
                        className="w-full gap-2 bg-gradient-to-r from-primary to-cyan-400 px-6 py-4 font-bold text-black sm:w-auto"
                      >
                        {checkoutLoading === selected ? <Loader2 className="w-4 h-4 animate-spin" /> : selected === "enterprise" ? <Mail className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
                        {tier.cta}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

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

        {showTeamCheckout && (
          <TeamCheckoutDialog
            billingPeriod={billingPeriod}
            onClose={() => setShowTeamCheckout(false)}
            onContact={() => { setShowTeamCheckout(false); setShowContact(true); }}
          />
        )}

        {showContact && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowContact(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(event) => event.stopPropagation()} className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <Building2 className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold text-foreground">Enterprise and larger teams</h3>
              </div>
              <p className="mb-6 text-sm text-muted-foreground">Enterprise is priced for your organization, and teams of more than 10 are set up with you. Your organization pays; your people sign in with their work email and are covered on Chrome and Android. Contact the EraseAI team to get started.</p>
              <div className="mb-6 space-y-3">
                <a href="mailto:director@vantward.com" className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <Mail className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="mb-0.5 text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-mono text-foreground">director@vantward.com</p>
                  </div>
                </a>
                <a href="https://wa.me/6582430739" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <MessageCircle className="h-5 w-5 shrink-0 text-green-500" />
                  <div>
                    <p className="mb-0.5 text-xs text-muted-foreground">WhatsApp</p>
                    <p className="text-sm font-mono text-foreground">+65 8243 0739</p>
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
