import { useCallback, useEffect, useState } from "react";
import { Check, Copy, MonitorSmartphone } from "lucide-react";
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
      <div className="flex items-center gap-2 mb-1">
        <MonitorSmartphone className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Managed rollout</h2>
        {info.managedBrowsers > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {info.managedBrowsers} {info.managedBrowsers === 1 ? "person" : "people"} set up by policy
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        For IT: install EraseAI on everyone's Chrome and Android phone from Google Admin, Microsoft Intune or your phone
        management tool. Anyone with a work email on your domains joins automatically and takes a seat; no invite links or
        API keys needed.
      </p>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-foreground mb-1">1. Work email domains</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={domains}
              onChange={(e) => {
                setDomains(e.target.value);
                setSaved(false);
              }}
              placeholder="company.com, company.co.uk"
              className="sm:flex-1 py-2"
              aria-label="Work email domains"
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
              <p className="text-sm text-foreground">4. Android (managed Google Play / any EMM) · with the next app release</p>
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
    </section>
  );
}
