import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Copy, MonitorSmartphone } from "lucide-react";
import { Button, Input } from "@/components/ui-elements";
import { orgApi } from "@/lib/orgInvite";

interface Deployment {
  allowedDomains: string[];
  hasToken: boolean;
  tokenPrefix: string | null;
  managedBrowsers: number;
  chromeExtensionId: string;
  androidPackage: string;
}

interface NewToken {
  token: string;
  chrome: { extensionId: string; policyJson: string };
  android: { packageName: string; managedConfiguration: Record<string, string> };
}

const panel = "bg-card/50 border border-border/50 rounded-2xl p-5 backdrop-blur-md";

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <button
          className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {}
          }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-border/40 bg-black/30 p-2 text-xs text-foreground whitespace-pre-wrap break-all">{text}</pre>
    </div>
  );
}

// Managed rollout for owners and admins: allowed email domains, the
// enrollment token, and the policy IT pastes into Google Admin, Intune or
// their phone management tool.
export function ManagedRolloutPanel() {
  const [info, setInfo] = useState<Deployment | null>(null);
  const [domains, setDomains] = useState("");
  const [created, setCreated] = useState<NewToken | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Most teams invite people one by one; this is for IT, so it starts folded.
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    orgApi<Deployment>("GET", "/org/deployment")
      .then((d) => {
        setInfo(d);
        setDomains(d.allowedDomains.join(", "));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!info) return error ? <p className="text-sm text-destructive">{error}</p> : null;

  const noDomains = info.allowedDomains.length === 0;

  return (
    <section className={panel}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left" aria-expanded={open}>
        <MonitorSmartphone className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Install for the whole company (IT teams)</h2>
        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">Coming soon</span>
        <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        An alternative to inviting people one by one: your IT team installs EraseAI on every company Chrome browser and
        Android phone, and anyone whose email ends in your company's domain joins on their own. Not needed if you invite
        people above.
      </p>
      {info.managedBrowsers > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {info.managedBrowsers} {info.managedBrowsers === 1 ? "person" : "people"} set up this way.
        </p>
      )}

      {open && (
      <div className="mt-4 space-y-4">
        <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
          Update coming soon: the Chrome extension and Android app updates that read this setup are on their way. You can
          prepare it now; devices start joining once the updates are out.
        </p>
        <div>
          <p className="text-sm text-foreground mb-1">1. Your company's email domains</p>
          <p className="mb-2 text-xs text-muted-foreground">
            Just the part after @, e.g. <code className="text-foreground">vantward.com</code>. Anyone with an email there can
            join without an invite, while you have free seats.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={domains}
              onChange={(e) => {
                setDomains(e.target.value);
                setSaved(false);
              }}
              placeholder="company.com, company.co.uk"
              className="sm:flex-1 py-2"
              aria-label="Company email domains"
            />
            <Button
              size="sm"
              variant="secondary"
              isLoading={busy}
              onClick={() =>
                run(async () => {
                  await orgApi("PUT", "/org/deployment/domains", { domains });
                  setSaved(true);
                })
              }
            >
              {saved ? "Saved" : "Save domains"}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-sm text-foreground mb-1">2. Enrollment token</p>
          <p className="text-xs text-muted-foreground mb-2">
            {info.hasToken
              ? `A token is active (${info.tokenPrefix}…). Making a new one turns the old one off; people already set up stay protected.`
              : "No token yet."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={busy || noDomains}
              title={noDomains ? "Save your email domains first" : undefined}
              onClick={() => {
                if (info.hasToken && !window.confirm("Make a new token? The current one stops working for new devices.")) return;
                run(async () => {
                  setCreated(await orgApi<NewToken>("POST", "/org/deployment/token"));
                });
              }}
            >
              {info.hasToken ? "Make a new token" : "Make enrollment token"}
            </Button>
            {info.hasToken && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm("Turn off automatic setup? New devices can't enroll until you make a new token.")) return;
                  run(async () => {
                    await orgApi("DELETE", "/org/deployment/token");
                    setCreated(null);
                  });
                }}
              >
                Turn off
              </Button>
            )}
          </div>
        </div>

        {created && (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs text-yellow-400">Copy these now. The token isn't shown again.</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="text-sm text-foreground">3. Chrome (Google Admin)</p>
              <p>
                Devices → Chrome → Apps &amp; extensions → Users &amp; browsers → add the Chrome Web Store app with ID{" "}
                <code className="text-foreground">{created.chrome.extensionId}</code>, set it to <b>Force install</b>, and
                paste this under <b>Policy for extensions</b>:
              </p>
            </div>
            <CopyBlock label="Policy for extensions (JSON)" text={created.chrome.policyJson} />
            <p className="text-xs text-muted-foreground">
              Microsoft Intune or Windows Group Policy: force-install the same extension ID and set its policy value{" "}
              <code className="text-foreground">enrollmentToken</code> to the token below (optionally{" "}
              <code className="text-foreground">userEmail</code> to the person's email; otherwise the extension asks once).
            </p>
            <CopyBlock label="Enrollment token" text={created.token} />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="text-sm text-foreground">4. Android (managed Google Play / any EMM) · update coming soon</p>
              <p>
                Approve <code className="text-foreground">{created.android.packageName}</code> and set this managed
                configuration. People sign in once with their work email and join automatically.
              </p>
            </div>
            <CopyBlock label="Managed configuration" text={JSON.stringify(created.android.managedConfiguration, null, 2)} />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      )}
    </section>
  );
}
