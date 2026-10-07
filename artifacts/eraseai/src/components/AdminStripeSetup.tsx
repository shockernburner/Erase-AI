import { useState } from "react";
import { CreditCard, Ticket } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Input } from "@/components/ui-elements";
import { orgApi } from "@/lib/orgInvite";

// Runs Stripe setup on the live server (its Stripe connection is the live
// one; Replit's Shell uses the test connection).
export function AdminStripeSetup() {
  const [busy, setBusy] = useState<"prices" | "voucher" | null>(null);
  const [log, setLog] = useState<string[] | null>(null);
  const [code, setCode] = useState("FOUNDERTEAM");
  const [uses, setUses] = useState("3");
  const [voucher, setVoucher] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setupPrices = async () => {
    setBusy("prices");
    setError(null);
    try {
      const r = await orgApi<{ log: string[] }>("POST", "/admin/billing/setup-prices");
      setLog(r.log);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const makeVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("voucher");
    setError(null);
    try {
      const r = await orgApi<{ code: string; maxRedemptions: number }>("POST", "/admin/billing/team-voucher", {
        code,
        maxRedemptions: Number(uses),
      });
      setVoucher(`${r.code} (100% off Teams/Family, ${r.maxRedemptions} uses)`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/50 border border-border/50 rounded-2xl p-5 backdrop-blur-md mb-8 space-y-5"
    >
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Stripe setup</h2>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">
          Creates any missing prices (Personal $5/$54, Pro $19/$205, Teams/Family $9/$96 a person) and switches off old ones,
          such as the old $99 Team price. Safe to run again.
        </p>
        <Button size="sm" variant="secondary" isLoading={busy === "prices"} onClick={setupPrices}>
          Set up prices
        </Button>
        {log && (
          <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
            {log.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </div>

      <form onSubmit={makeVoucher}>
        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
          <Ticket className="w-4 h-4" /> A 100%-off code for Teams/Family, to try the purchase without paying. Enter it on the Stripe
          checkout page ("Add promotion code"); no card is asked for.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-48 py-2" aria-label="Code" />
          <Input type="number" min={1} max={100} value={uses} onChange={(e) => setUses(e.target.value)} className="w-24 py-2" aria-label="Uses" />
          <Button type="submit" size="sm" variant="secondary" isLoading={busy === "voucher"}>
            Create code
          </Button>
        </div>
        {voucher && <p className="mt-2 text-sm text-green-400">Created: {voucher}</p>}
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </motion.div>
  );
}
