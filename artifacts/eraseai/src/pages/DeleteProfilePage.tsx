import { useState } from "react";
import { ArrowLeft, Trash2, Loader2, CheckCircle2, AlertTriangle, Mail } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function DeleteProfilePage({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    reason: "",
    confirm: false,
  });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    try {
      const res = await fetch("/api/account/deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password || undefined,
          reason: form.reason.trim() || undefined,
          confirm: form.confirm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      setResultMessage(data.message || "Your deletion request has been received.");
      setStatus("done");
      setForm({ email: "", password: "", reason: "", confirm: false });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10" />
            <span className="text-xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              EraseAI
            </span>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/90 backdrop-blur-md border border-border/50 text-sm font-medium text-foreground hover:bg-muted/40 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-destructive/10 p-2 rounded-xl">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Delete account &amp; data</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Use this page to request deletion of your EraseAI account and associated personal data
          (web, Android app, scan history, and related records). This fulfills Google Play and privacy
          rights for account deletion.
        </p>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 mb-8 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">What we delete:</strong> account profile, authentication,
                scan history, alerts, firewall outcomes, API keys, webhooks, datasets you uploaded, and
                Android protected-app preferences stored on our servers.
              </p>
              <p>
                <strong className="text-foreground">What we may retain:</strong> billing records required by
                tax law (up to 7 years), and anonymized aggregate analytics. See our{" "}
                <a href="/privacy" className="text-primary hover:text-primary/80">Privacy Policy</a>.
              </p>
              <p>
                <strong className="text-foreground">Subscriptions:</strong> Stripe subscriptions are cancelled
                when the account is deleted. Google Play subscriptions must be cancelled in{" "}
                <em>Google Play → Payments &amp; subscriptions</em>.
              </p>
              <p>
                Email/password accounts are deleted immediately after password verification. Other accounts
                are completed within <strong className="text-foreground">30 days</strong> after identity verification.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card/50 border border-border/30 rounded-xl p-6">
          {status === "done" ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="bg-emerald-500/10 p-3 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">Request received</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-6">{resultMessage}</p>
              <button
                onClick={() => setStatus("idle")}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Account email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Password <span className="text-muted-foreground font-normal">(required for email/password accounts)</span>
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Your EraseAI password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Reason <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Optional context for our records"
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.checked })}
                  className="mt-1 accent-cyan-400"
                />
                <span>
                  I understand this will permanently delete my EraseAI account and associated data, and
                  that this action cannot be undone.
                </span>
              </label>

              {(status === "error" || errorMessage) && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={status === "sending" || !form.confirm}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-destructive text-white font-medium text-sm hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {status === "sending" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete my account &amp; data
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 flex items-start gap-3 text-sm text-muted-foreground">
          <Mail className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <p>
            Prefer email? Write to{" "}
            <a href="mailto:director@vantward.com" className="text-primary hover:text-primary/80">
              director@vantward.com
            </a>{" "}
            from your account email with subject &quot;Account deletion&quot;. We respond within 30 days.
          </p>
        </div>
      </main>
    </div>
  );
}
