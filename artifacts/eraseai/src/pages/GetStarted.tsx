import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  Chrome,
  Code2,
  Database,
  Download,
  LayoutDashboard,
  Shield,
  Smartphone,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import type { AppView } from "@/components/AppShell";
import { chromeStoreLink } from "@/lib/extensionStore";
import { ANDROID_PLAY_URL, EXTENSION_ZIP_URL, ORG_COVERAGE_SUMMARY, setPricingFocus } from "@/lib/products";
import type { PricingTierId } from "@/lib/pricingPlans";

// Signed-in home. EraseAI is an AI firewall first: install protection on
// Chrome and Android, see the plans (with organization plans explained), and
// find the other tools underneath.

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  personal: "Personal",
  pro: "Developer",
  business: "Team",
  enterprise: "Enterprise",
};

interface PlanInfo {
  organization: { name: string; role: string; plan: string } | null;
}

const card = "rounded-2xl border border-border/40 bg-card/60 p-6";

function StoreButton({ href, icon, children, primary }: { href: string; icon: React.ReactNode; children: React.ReactNode; primary?: boolean }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
        primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border/50 text-foreground hover:bg-muted/30"
      }`}
    >
      {icon}
      {children}
    </a>
  );
}

const OFFERS: {
  id: PricingTierId;
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  price: string;
  paidBy: string;
  summary: string;
}[] = [
  {
    id: "personal",
    icon: <User className="h-5 w-5" />,
    iconClass: "bg-cyan-500/15 text-cyan-400",
    title: "Personal",
    price: "$5 a month",
    paidBy: "You pay for yourself",
    summary: "Full protection on Chrome and Android: one-click Sanitize, attachment and screenshot scanning, history.",
  },
  {
    id: "pro",
    icon: <Code2 className="h-5 w-5" />,
    iconClass: "bg-violet-500/15 text-violet-400",
    title: "API for your apps",
    price: "$19 a month",
    paidBy: "You pay for yourself",
    summary: "Add the same checks to your own product, scripts and pipelines: 10,000 API requests a month, webhooks, logs.",
  },
  {
    id: "business",
    icon: <Users className="h-5 w-5" />,
    iconClass: "bg-emerald-500/15 text-emerald-400",
    title: "Firewall for teams",
    price: "$9 a person a month · 3 to 10 people",
    paidBy: "Your organization pays",
    summary: "Buy seats and invite your people. Each one is covered on Chrome and Android with their work email. Admin dashboard by person.",
  },
  {
    id: "enterprise",
    icon: <Building2 className="h-5 w-5" />,
    iconClass: "bg-amber-500/15 text-amber-400",
    title: "Firewall for enterprise",
    price: "Contact us for pricing",
    paidBy: "Your organization pays",
    summary: "Any number of people, rollout by your IT team, private deployment, data residency and an SLA.",
  },
];

function InstallProtection({
  onNavigate,
  title = "1 · Install protection",
  coveredBy,
  email,
  paid = false,
}: {
  onNavigate: (v: AppView) => void;
  title?: string;
  coveredBy?: string | null;
  email?: string | null;
  paid?: boolean;
}) {
  return (
      <section className="mb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
          {coveredBy && (
            <p className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
              {coveredBy} covers you. Install both and sign in with <b>{email}</b>; there's nothing to pay.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className={card}>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15 text-red-400">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Chrome extension</h3>
                  <p className="text-xs text-muted-foreground">ChatGPT, Claude, Gemini · free checks, no limit</p>
                </div>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Checks each message and attachment before you send it, shows what it found, and removes it with one click.
              </p>
              <div className="flex flex-wrap gap-2">
                <StoreButton href={chromeStoreLink("app-home")} icon={<Chrome className="h-4 w-4" />} primary>
                  Add to Chrome
                </StoreButton>
                <StoreButton href={EXTENSION_ZIP_URL} icon={<Download className="h-4 w-4" />}>
                  Download .zip
                </StoreButton>
                <button onClick={() => onNavigate("firewallSetup")} className="px-2 text-sm text-primary hover:underline">
                  Setup guide
                </button>
              </div>
            </motion.div>
  
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={card}>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Android app</h3>
                  <p className="text-xs text-muted-foreground">AI apps on your phone · {paid ? "included in your plan" : "7-day free trial"}</p>
                </div>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Checks what you're about to send in ChatGPT, Gemini, Claude and other AI apps on your phone. Sign in with this
                account to use your plan.
              </p>
              <div className="flex flex-wrap gap-2">
                <StoreButton href={ANDROID_PLAY_URL} icon={<Smartphone className="h-4 w-4" />} primary>
                  Get it on Google Play
                </StoreButton>
              </div>
            </motion.div>
          </div>
        </section>
  );
}

function MoreTools({ onNavigate, apiEligible }: { onNavigate: (v: AppView) => void; apiEligible: boolean }) {
  return (
      <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">More tools</h2>
          <div className="flex flex-wrap gap-2">
            {[
              ...(apiEligible ? [{ v: "developer" as AppView, icon: <LayoutDashboard className="h-4 w-4" />, label: "API keys and usage" }] : []),
              { v: "docsHub" as AppView, icon: <BookOpen className="h-4 w-4" />, label: "Documentation and API" },
              { v: "datasetSanitizer" as AppView, icon: <Database className="h-4 w-4" />, label: "Dataset Sanitizer (CSV, JSON)" },
              { v: "personal" as AppView, icon: <User className="h-4 w-4" />, label: "Personal Mode (check and rewrite text)" },
            ].map((tool) => (
              <button
                key={tool.v}
                onClick={() => onNavigate(tool.v)}
                className="inline-flex items-center gap-2 rounded-lg border border-border/30 bg-card/60 px-3.5 py-2 text-sm text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
              >
                {tool.icon}
                {tool.label}
              </button>
            ))}
          </div>
        </section>
  );
}

function FreeHome({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const { user } = useAuth();
  const plan = user?.planType || "free";
  const [info, setInfo] = useState<PlanInfo | null>(null);

  useEffect(() => {
    if (plan === "free") return;
    fetch("/api/billing/plan", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setInfo(d))
      .catch(() => {});
  }, [plan]);

  const org = info?.organization ?? null;
  const apiEligible = plan === "pro" || plan === "business" || plan === "enterprise";

  const openPlan = (id: PricingTierId) => {
    setPricingFocus(id);
    onNavigate("pricing");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 md:pt-12 lg:px-8">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {user?.firstName ? `Welcome, ${user.firstName}` : "Welcome to EraseAI"}
        </div>
        <h1 className="mb-2 text-3xl font-display font-bold text-foreground md:text-4xl">Keep sensitive data out of AI tools</h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          EraseAI checks every message and file before it reaches ChatGPT, Claude or Gemini, and stops passwords, API keys,
          card numbers and personal data on the way out.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-muted/30 px-3 py-1 text-foreground">
            Your plan: <b>{PLAN_NAMES[plan] ?? plan}</b>
            {org && <> · paid by {org.name}</>}
          </span>
          {org ? (
            <button onClick={() => onNavigate("organization")} className="inline-flex items-center gap-1 text-primary hover:underline">
              Your organization <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button onClick={() => onNavigate("pricing")} className="inline-flex items-center gap-1 text-primary hover:underline">
              Compare plans <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </motion.header>

      <InstallProtection onNavigate={onNavigate} />

      <section className="mb-10">
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">2 · Plans</h2>
          <button onClick={() => onNavigate("pricing")} className="text-xs text-primary hover:underline">Full comparison</button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {OFFERS.map((o, i) => {
            const mine = plan === o.id;
            return (
              <motion.button
                key={o.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.04 }}
                onClick={() => openPlan(o.id)}
                className={`group flex flex-col rounded-2xl border bg-card/60 p-5 text-left transition-all hover:border-primary/50 hover:shadow-[0_0_24px_rgba(6,182,212,0.12)] ${
                  mine ? "border-primary/60" : "border-border/40"
                }`}
              >
                <div className="mb-2 flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${o.iconClass}`}>{o.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground">{o.title}</p>
                    <p className="text-xs text-muted-foreground">{o.price}</p>
                  </div>
                  {mine && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                      <Check className="h-3 w-3" /> Your plan
                    </span>
                  )}
                </div>
                <p className="mb-3 flex-1 text-sm text-muted-foreground">{o.summary}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">{o.paidBy}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
                    Compare and choose <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
        <p className="mt-3 rounded-xl border border-border/30 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
          <b className="text-foreground">Team and Enterprise:</b> {ORG_COVERAGE_SUMMARY}
        </p>
      </section>

      <MoreTools onNavigate={onNavigate} apiEligible={apiEligible} />
    </div>
  );
}

interface OrgSummary {
  organization: null | { name: string; plan: string; seatLimit: number; seatsUsed?: number; status: string };
  me?: { role: string; canManage: boolean };
  members?: { status: string }[];
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/30 bg-muted/10 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function ActionButton({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
        primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border/50 text-foreground hover:bg-muted/30"
      }`}
    >
      {children}
    </button>
  );
}

// Home for anyone on a paid plan: what their plan gives them first, install
// links second, other plans only as a link.
function PaidHome({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const { user } = useAuth();
  const plan = user?.planType || "free";
  const isPlatformAdmin = user?.role === "admin";
  const [orgInfo, setOrgInfo] = useState<OrgSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (plan !== "business" && plan !== "enterprise") {
      setLoaded(true);
      return;
    }
    // Only a successful answer counts: a refused lookup (e.g. terms not yet
    // accepted) must not read as "no organization".
    fetch("/api/org", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setOrgInfo(d);
          setLoaded(true);
        }
      })
      .catch(() => {});
  }, [plan]);

  const org = orgInfo?.organization ?? null;
  const me = orgInfo?.me;
  const active = orgInfo?.members?.filter((m) => m.status === "active").length ?? 0;
  const pending = orgInfo?.members?.filter((m) => m.status === "invited").length ?? 0;
  const apiEligible = plan === "pro" || plan === "business" || plan === "enterprise";
  const planName = PLAN_NAMES[plan] ?? plan;

  const subtitle = org
    ? `Paid by ${org.name}. You're ${me?.role === "owner" ? "the owner" : me?.role === "admin" ? "an admin" : "a member"}.`
    : plan === "personal"
      ? "Full protection on Chrome and Android, paid by you."
      : plan === "pro"
        ? "Full protection, plus the EraseAI API for your own apps."
        : "Enterprise access on this account.";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 md:pt-12 lg:px-8">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          <Check className="h-3.5 w-3.5" />
          {planName} plan
        </div>
        <h1 className="mb-2 text-3xl font-display font-bold text-foreground md:text-4xl">
          {org ? org.name : `Your ${planName} plan`}
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">{subtitle}</p>
      </motion.header>

      {org && me?.canManage && (
        <section className={`${card} mb-8`}>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Your team</h2>
            {org.status !== "active" && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">suspended</span>}
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Seats used" value={`${org.seatsUsed ?? active + pending} of ${org.seatLimit}`} />
            <Stat label="Active people" value={active} />
            <Stat label="Pending invites" value={pending} />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton primary onClick={() => onNavigate("organization")}>
              <Users className="h-4 w-4" /> Invite people and see activity
            </ActionButton>
            {me.role === "owner" && (
              <ActionButton onClick={() => onNavigate("organization")}>
                <Building2 className="h-4 w-4" /> Seats and billing
              </ActionButton>
            )}
          </div>
        </section>
      )}

      {org && !me?.canManage && (
        <section className={`${card} mb-8`}>
          <p className="text-sm text-muted-foreground">
            {org.name} pays for your protection. Your admin manages seats and people.
          </p>
          <div className="mt-3">
            <ActionButton onClick={() => onNavigate("organization")}>
              <Building2 className="h-4 w-4" /> See your organization
            </ActionButton>
          </div>
        </section>
      )}

      {loaded && !org && (plan === "business" || plan === "enterprise") && (
        <section className={`${card} mb-8`}>
          <div className="mb-2 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Cover your people</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            This account has {planName} access but no organization yet. An organization lets you invite people; each one is
            covered on Chrome and Android with their work email.
          </p>
          <div className="flex flex-wrap gap-2">
            {isPlatformAdmin ? (
              <ActionButton primary onClick={() => onNavigate("admin")}>
                <LayoutDashboard className="h-4 w-4" /> Create one in the Admin dashboard
              </ActionButton>
            ) : (
              <ActionButton primary onClick={() => onNavigate("contact")}>
                <Building2 className="h-4 w-4" /> Contact us to set it up
              </ActionButton>
            )}
          </div>
        </section>
      )}

      {plan === "pro" && (
        <section className={`${card} mb-8`}>
          <div className="mb-2 flex items-center gap-2">
            <Code2 className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-bold text-foreground">Your API</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            10,000 requests a month across up to 5 keys. Scan what goes into and comes out of your own LLM apps.
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionButton primary onClick={() => onNavigate("developer")}>
              <LayoutDashboard className="h-4 w-4" /> API keys and usage
            </ActionButton>
            <ActionButton onClick={() => onNavigate("apiSetup")}>
              <ArrowRight className="h-4 w-4" /> Quick start
            </ActionButton>
            <ActionButton onClick={() => onNavigate("docsHub")}>
              <BookOpen className="h-4 w-4" /> Documentation
            </ActionButton>
          </div>
        </section>
      )}

      {plan === "personal" && (
        <section className={`${card} mb-8`}>
          <div className="mb-2 flex items-center gap-2">
            <User className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-foreground">What's on</h2>
          </div>
          <ul className="mb-4 grid gap-1.5 text-sm text-foreground/90 sm:grid-cols-2">
            {["One-click Sanitize & Send in Chrome", "Attachment and screenshot scanning", "Android protection stays on", "Scan history and alerts"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{f}</li>
            ))}
          </ul>
          <ActionButton onClick={() => onNavigate("pricing")}>
            <ArrowRight className="h-4 w-4" /> Manage subscription
          </ActionButton>
        </section>
      )}

      <InstallProtection
        onNavigate={onNavigate}
        title="Install protection"
        coveredBy={org?.name ?? null}
        email={user?.email ?? null}
        paid
      />

      <MoreTools onNavigate={onNavigate} apiEligible={apiEligible} />

      <p className="mt-8 text-sm text-muted-foreground">
        Looking at other plans?{" "}
        <button onClick={() => onNavigate("pricing")} className="text-primary hover:underline">Compare plans</button>
      </p>
    </div>
  );
}

export default function GetStarted({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const { user } = useAuth();
  const plan = user?.planType || "free";
  return plan === "free" ? <FreeHome onNavigate={onNavigate} /> : <PaidHome onNavigate={onNavigate} />;
}
