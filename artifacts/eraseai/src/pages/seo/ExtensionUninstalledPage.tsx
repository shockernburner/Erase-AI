import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { SeoPage, AddToChromeButton } from "./SeoLayout";
import { useSeoMeta } from "./useSeoMeta";
import { useNoIndex } from "./ExtensionWelcomePage";

const BASE = import.meta.env.BASE_URL;

// Must match UNINSTALL_REASONS in artifacts/api-server/src/routes/uninstall-feedback-source.mjs.
const REASONS: { id: string; label: string }[] = [
  { id: "no_account", label: "I didn't want to create an account or API key" },
  { id: "too_many_warnings", label: "Too many warnings on harmless text" },
  { id: "missed_something", label: "It missed something it should have caught" },
  { id: "broke_site", label: "It got in the way of ChatGPT, Claude or Gemini" },
  { id: "privacy_concern", label: "I wasn't comfortable with how my text is checked" },
  { id: "too_expensive", label: "The paid plan costs too much" },
  { id: "not_needed", label: "I don't need it anymore" },
  { id: "other", label: "Something else" },
];

// A short, useful reply for the reasons we can do something about.
const FOLLOW_UP: Record<string, string> = {
  no_account: "Good news: EraseAI now protects you without an account — prompts are checked on your device from the moment it's installed.",
  too_many_warnings: "Thanks — false alarms are the thing we most want to fix. The comment box above helps a lot.",
  missed_something: "If you can describe what slipped through (without pasting the secret itself), we'll add a rule for it.",
  broke_site: "Sorry about that. Tell us which site and what happened and we'll fix it.",
};

/**
 * Opened by Chrome after the extension is removed (setUninstallURL in
 * extension/src/background.js). The URL carries only the extension version;
 * answers are anonymous.
 */
export default function ExtensionUninstalledPage() {
  useSeoMeta({
    title: "EraseAI Firewall removed — one quick question",
    description: "Tell us why you removed EraseAI Firewall. One click, anonymous.",
    url: "https://eraseai.ai/ai-firewall/uninstalled",
  });
  useNoIndex();

  const version = new URLSearchParams(window.location.search).get("v") ?? undefined;
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!reason) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/extension/uninstall-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, comment: comment.trim() || undefined, version }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <SeoPage>
      <h1 className="text-4xl font-display font-extrabold tracking-tight text-foreground mb-4">
        EraseAI Firewall has been removed
      </h1>
      <p className="text-lg text-muted-foreground mb-10">
        One quick, anonymous question: what made you remove it?
      </p>

      {status === "sent" ? (
        <div className="p-6 rounded-2xl border border-primary/30 bg-primary/5 space-y-4">
          <p className="text-foreground font-semibold">Thanks — this goes straight to the team.</p>
          {reason && FOLLOW_UP[reason] && <p className="text-muted-foreground">{FOLLOW_UP[reason]}</p>}
          <div className="flex flex-wrap gap-3 pt-2">
            <AddToChromeButton placement="uninstall-reinstall" text="Reinstall EraseAI Firewall" />
            <a
              href={`${BASE}contact`}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border/40 text-foreground font-semibold hover:bg-card/60 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Talk to us
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3" role="radiogroup" aria-label="Reason for removing">
            {REASONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={reason === id}
                onClick={() => setReason(id)}
                className={`text-left px-5 py-3.5 rounded-xl border transition-colors ${
                  reason === id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/30 bg-card/40 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="uninstall-comment" className="block text-sm font-semibold text-foreground mb-2">
              Anything else? (optional — please don't paste secrets or personal data)
            </label>
            <textarea
              id="uninstall-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-card/40 border border-border/30 text-foreground focus:border-primary outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={submit}
              disabled={!reason || status === "sending"}
              className="px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "sending" ? "Sending…" : "Send"}
            </button>
            {status === "error" && (
              <span className="text-sm text-destructive">Couldn't send — please try again in a moment.</span>
            )}
          </div>
        </div>
      )}
    </SeoPage>
  );
}
