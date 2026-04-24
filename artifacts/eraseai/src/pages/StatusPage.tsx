import { useEffect, useState } from "react";

interface PingResult {
  ok: boolean;
  version?: string;
  error?: string;
  fetchedAt: number;
}

interface ExtensionVersion {
  version: string;
  filename?: string;
  sizeBytes?: number;
  lastModified?: string;
}

const PING_URL = "https://eraseai.ai/api/dev/ping";
const EXTENSION_VERSION_URL = "https://eraseai.ai/api/extension/version";
const INSTALL_URL = "https://eraseai.ai/ai-firewall";
const PING_INTERVAL_MS = 30_000;

function formatTimestamp(ts: number): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(ts);
  }
}

export default function StatusPage() {
  const [ping, setPing] = useState<PingResult | null>(null);
  const [ext, setExt] = useState<ExtensionVersion | null>(null);
  const [extError, setExtError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const probePing = async () => {
      try {
        const res = await fetch(PING_URL, { headers: { Accept: "application/json" } });
        const ct = res.headers.get("content-type") || "";
        if (!res.ok) {
          if (!cancelled) setPing({ ok: false, error: `HTTP ${res.status}`, fetchedAt: Date.now() });
          return;
        }
        if (!ct.toLowerCase().includes("application/json")) {
          if (!cancelled) setPing({ ok: false, error: "Non-JSON response", fetchedAt: Date.now() });
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setPing({
            ok: data?.ok === true && typeof data?.version === "string",
            version: typeof data?.version === "string" ? data.version : undefined,
            fetchedAt: Date.now(),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setPing({
            ok: false,
            error: (err as Error)?.message || "unreachable",
            fetchedAt: Date.now(),
          });
        }
      }
    };

    const probeExtension = async () => {
      try {
        const res = await fetch(EXTENSION_VERSION_URL, { headers: { Accept: "application/json" } });
        if (!res.ok) {
          if (!cancelled) {
            setExtError(`HTTP ${res.status}`);
            setExt(null);
          }
          return;
        }
        const data = (await res.json()) as ExtensionVersion;
        if (!cancelled) {
          setExt(data);
          setExtError(null);
        }
      } catch (err) {
        if (!cancelled) setExtError((err as Error)?.message || "unreachable");
      }
    };

    // First probe immediately on mount, then poll on an interval so the page
    // is genuinely live when left open during a sales call or incident.
    void probePing();
    void probeExtension();
    const pingTimer = setInterval(probePing, PING_INTERVAL_MS);
    const extTimer = setInterval(probeExtension, PING_INTERVAL_MS * 4);

    return () => {
      cancelled = true;
      clearInterval(pingTimer);
      clearInterval(extTimer);
    };
  }, []);

  const copyInstallLink = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(INSTALL_URL).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        /* clipboard blocked — non-fatal */
      },
    );
  };

  const dotColor = ping == null ? "bg-zinc-500" : ping.ok ? "bg-green-500" : "bg-red-500";
  const dotLabel = ping == null ? "Checking…" : ping.ok ? "Operational" : "Degraded";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12 flex justify-center">
      <main className="w-full max-w-xl space-y-8" data-testid="status-page-root">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">EraseAI status</h1>
          <p className="text-sm text-zinc-400">
            Live health of the EraseAI API and the latest published Firewall extension. No login required.
          </p>
        </header>

        <section
          className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3"
          data-testid="status-api-card"
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-block w-3 h-3 rounded-full ${dotColor}`}
              aria-hidden="true"
              data-testid="status-api-dot"
            />
            <h2 className="text-base font-semibold">EraseAI API</h2>
            <span className="ml-auto text-xs text-zinc-400" data-testid="status-api-label">
              {dotLabel}
            </span>
          </div>
          <dl className="text-xs text-zinc-400 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
            <dt>Endpoint</dt>
            <dd className="text-zinc-200 font-mono break-all">{PING_URL}</dd>
            <dt>Server version</dt>
            <dd className="text-zinc-200 font-mono" data-testid="status-api-version">
              {ping?.version ? `v${ping.version}` : ping == null ? "—" : "unknown"}
            </dd>
            <dt>Last checked</dt>
            <dd className="text-zinc-200 font-mono" data-testid="status-api-last-checked">
              {ping?.fetchedAt ? formatTimestamp(ping.fetchedAt) : "—"}
            </dd>
            {ping && !ping.ok && (
              <>
                <dt>Error</dt>
                <dd className="text-red-300 font-mono" data-testid="status-api-error">
                  {ping.error || "unreachable"}
                </dd>
              </>
            )}
          </dl>
          <p className="text-[11px] text-zinc-500 pt-1">
            Auto-refreshes every {Math.round(PING_INTERVAL_MS / 1000)} seconds.
          </p>
        </section>

        <section
          className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3"
          data-testid="status-extension-card"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Firewall extension</h2>
            <span className="ml-auto text-xs text-zinc-400">Latest published</span>
          </div>
          <dl className="text-xs text-zinc-400 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
            <dt>Version</dt>
            <dd className="text-zinc-200 font-mono" data-testid="status-ext-version">
              {ext?.version ? `v${ext.version}` : extError ? "unavailable" : "—"}
            </dd>
            {ext?.lastModified && (
              <>
                <dt>Released</dt>
                <dd className="text-zinc-200 font-mono">{ext.lastModified.slice(0, 10)}</dd>
              </>
            )}
            {extError && (
              <>
                <dt>Error</dt>
                <dd className="text-red-300 font-mono">{extError}</dd>
              </>
            )}
          </dl>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={copyInstallLink}
              className="px-3 py-1.5 rounded-md bg-white text-zinc-900 text-xs font-semibold hover:bg-zinc-200 transition-colors"
              data-testid="status-copy-install"
            >
              {copied ? "Copied!" : "Copy install link"}
            </button>
            <a
              href={INSTALL_URL}
              className="px-3 py-1.5 rounded-md border border-white/20 text-xs font-semibold text-zinc-100 hover:bg-white/10 transition-colors"
            >
              Open install page
            </a>
          </div>
          <p className="text-[11px] text-zinc-500 break-all">{INSTALL_URL}</p>
        </section>

        <footer className="text-[11px] text-zinc-500 pt-4 border-t border-white/10">
          This page is intentionally unauthenticated so support, customers, and demo audiences can confirm the
          service is up at any time.
        </footer>
      </main>
    </div>
  );
}
