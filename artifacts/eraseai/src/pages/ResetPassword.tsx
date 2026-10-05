import { useState } from "react";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui-elements";
import { BrandLogo } from "@/components/BrandLogo";

function readToken(): string {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  // Keep the one-time token out of the address bar and history.
  if (token) window.history.replaceState({}, "", window.location.pathname);
  return token;
}

// Opened from the emailed /reset-password?token=… link.
export default function ResetPassword() {
  const [token] = useState(readToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const home = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Something went wrong. Please try again.");
      else setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-10 py-2.5 bg-muted/20 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50";

  return (
    <div className="min-h-screen w-full flex items-start justify-center bg-background px-4 py-16">
      <div className="max-w-md w-full space-y-6">
        <div className="flex flex-col items-center text-center">
          <BrandLogo className="h-14 w-14 mb-4" />
          <h1 className="text-2xl font-display font-bold text-foreground">Choose a new password</h1>
        </div>

        <div className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-4">
          {done ? (
            <>
              <p className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                Your password is changed. You've been signed out everywhere; log in with the new password.
              </p>
              <Button variant="primary" className="w-full" onClick={() => window.location.assign(home)}>Log in</Button>
            </>
          ) : !token ? (
            <>
              <p className="text-sm text-muted-foreground">This page needs the link from your reset email. Ask for a new one from the log-in page.</p>
              <Button variant="outline" onClick={() => window.location.assign(home)}>Go to log in</Button>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={show ? "text" : "password"}
                  placeholder="New password (at least 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={show ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
              )}
              <Button type="submit" variant="primary" className="w-full" isLoading={saving}>Save new password</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
