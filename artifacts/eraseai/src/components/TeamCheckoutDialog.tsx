import { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Users, X } from "lucide-react";
import { Button, Input } from "@/components/ui-elements";

// Team prices per person; must match api-server team-source.mjs / billing-source.mjs.
const SEAT_PRICE = { monthly: 9, annual: 96 } as const;
const MIN_SEATS = 3;
const MAX_SEATS = 10;

// Buy Team: name the organization and pick seats, then Stripe Checkout.
// Paying creates the organization with the buyer as owner.
export function TeamCheckoutDialog({
  billingPeriod,
  onClose,
  onContact,
}: {
  billingPeriod: "monthly" | "annual";
  onClose: () => void;
  onContact: () => void;
}) {
  const [orgName, setOrgName] = useState("");
  const [seats, setSeats] = useState(MIN_SEATS);
  const [period, setPeriod] = useState(billingPeriod);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = seats * SEAT_PRICE[period];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/billing/team/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName,
          seats,
          billingPeriod: period,
          returnUrl: `${window.location.origin}${import.meta.env.BASE_URL}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        if (data.sessionId) sessionStorage.setItem("eraseai_checkout_intent", data.sessionId);
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Unable to start checkout. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Buy Team for your organization</h2>
          <button type="button" onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block text-sm text-muted-foreground">
          Organization name
          <Input required maxLength={120} value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Ltd" className="mt-1" />
        </label>

        <div>
          <p className="text-sm text-muted-foreground mb-2">People (including you)</p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" size="sm" disabled={seats <= MIN_SEATS} onClick={() => setSeats(seats - 1)} aria-label="Fewer people">
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-10 text-center text-2xl font-bold text-foreground tabular-nums">{seats}</span>
            <Button type="button" variant="secondary" size="sm" disabled={seats >= MAX_SEATS} onClick={() => setSeats(seats + 1)} aria-label="More people">
              <Plus className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {MIN_SEATS} to {MAX_SEATS}. More?{" "}
              <button type="button" className="underline" onClick={onContact}>Contact us</button>
            </span>
          </div>
        </div>

        <div className="flex rounded-xl bg-muted/20 p-1 border border-border/20">
          {(["monthly", "annual"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${period === p ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p === "monthly" ? "Monthly · $9 a person" : "Yearly · $8 a person a month"}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border/40 bg-muted/10 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {seats} × ${SEAT_PRICE[period]} {period === "monthly" ? "a month" : "a year"}
            </span>
            <span className="font-bold text-foreground">${total} {period === "monthly" ? "a month" : "a year"}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            After paying you're the owner. Invite your people with links from the Organization page, and change seats any time.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
          {loading ? "Opening checkout…" : "Continue to payment"}
        </Button>
      </motion.form>
    </motion.div>
  );
}
