import { useCallback, useEffect, useState } from "react";
import {
  Building2, Users, UserPlus, Copy, Check, Loader2, Activity, Link2, Trash2, LogOut, AlertTriangle,
  CreditCard,
  Chrome,
  Smartphone,
} from "lucide-react";
import { Button, Input } from "@/components/ui-elements";
import { ORG_PLAN_NAMES, ORG_ROLE_NAMES, inviteUrl, orgApi } from "@/lib/orgInvite";
import { ManagedRolloutPanel } from "@/components/ManagedRolloutPanel";
import { chromeStoreLink } from "@/lib/extensionStore";
import { ANDROID_PLAY_URL } from "@/lib/products";

type Role = "owner" | "admin" | "member";

interface Member {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  role: Role;
  status: "invited" | "active";
  invitedAt: string;
  joinedAt: string | null;
}

interface OrgResponse {
  organization: null | {
    id: string;
    name: string;
    plan: string;
    status: "active" | "suspended";
    seatLimit: number;
    seatsUsed?: number;
  };
  me?: { memberId: string; role: Role; canManage: boolean };
  members?: Member[];
}

interface ActivityRow {
  memberId: string;
  email: string;
  name: string | null;
  role: Role;
  checks: number;
  warnings: number;
  protected: number;
  sentAnyway: number;
  lastActivityAt: string | null;
}

const panel = "bg-card/50 border border-border/50 rounded-2xl p-5 backdrop-blur-md";

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2">
      <code className="flex-1 min-w-0 truncate text-xs text-foreground">{url}</code>
      <Button size="sm" variant="secondary" onClick={copy} className="gap-1.5 shrink-0">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

interface BillingInfo {
  billedBy: "stripe" | "invoice";
  seats: number;
  seatsUsed: number;
  minSeats?: number;
  maxSeats?: number;
  billingPeriod?: "monthly" | "annual";
  seatPriceCents?: number;
  totalCents?: number;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  canManage: boolean;
}

// Seats and payment for self-serve Team organizations. Owners change seats
// (Stripe prorates) and open Stripe's portal for invoices, card and cancelling.
function BillingPanel({ onChanged, onContact }: { onChanged: () => void; onContact: () => void }) {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [seats, setSeats] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    orgApi<BillingInfo>("GET", "/org/billing")
      .then((b) => {
        setInfo(b);
        setSeats(b.seats);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!info) return error ? <p className="text-sm text-destructive">{error}</p> : null;

  const dollars = (cents?: number) => `$${((cents ?? 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const per = info.billingPeriod === "annual" ? "a year" : "a month";

  const saveSeats = async () => {
    setBusy(true);
    setError(null);
    try {
      await orgApi("PATCH", "/org/billing/seats", { seats });
      load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await orgApi<{ url: string }>("POST", "/org/billing/portal", {
        returnUrl: `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/?view=organization`,
      });
      window.location.href = r.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <section className={panel}>
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Billing</h2>
      </div>
      {info.billedBy === "invoice" ? (
        <p className="text-sm text-muted-foreground">
          {info.seats} seats, billed by invoice. To change seats or get invoices,{" "}
          <button className="underline" onClick={onContact}>contact us</button>.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {info.seats} seats × {dollars(info.seatPriceCents)} = <span className="text-foreground font-semibold">{dollars(info.totalCents)} {per}</span>
            {info.currentPeriodEnd && <> · renews {new Date(info.currentPeriodEnd).toLocaleDateString()}</>}
            {info.subscriptionStatus && info.subscriptionStatus !== "active" && (
              <span className="ml-2 text-yellow-400">({info.subscriptionStatus.replace(/_/g, " ")})</span>
            )}
          </p>
          {info.canManage ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-muted-foreground">
                Seats ({info.minSeats} to {info.maxSeats}; {info.seatsUsed} in use)
                <div className="mt-1 flex gap-2">
                  <Input
                    type="number"
                    min={Math.max(info.minSeats ?? 3, info.seatsUsed)}
                    max={info.maxSeats}
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="w-24 py-2"
                  />
                  <Button size="sm" variant="secondary" isLoading={busy} disabled={seats === info.seats} onClick={saveSeats}>
                    Change seats
                  </Button>
                </div>
              </label>
              <Button size="sm" variant="outline" disabled={busy} onClick={openPortal}>
                Invoices, card and cancelling
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Only owners can change seats or payment.</p>
          )}
          <p className="text-xs text-muted-foreground">Adding seats is charged pro rata on your next invoice; removing them credits it.</p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}

function ActivityPanel() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    orgApi<{ members: ActivityRow[] }>("GET", `/org/activity?days=${days}`)
      .then((d) => !cancelled && setRows(d.members))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Activity by person</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="ml-auto rounded-lg border border-border bg-input/50 px-2 py-1 text-xs text-foreground"
          aria-label="Time range"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Counts from the Chrome extension since each person joined. EraseAI never stores what anyone typed.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!rows && !error && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      {rows && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border/30 text-left text-muted-foreground/70">
                <th className="pb-2 font-medium">Person</th>
                <th className="pb-2 pl-4 font-medium text-right">Checks</th>
                <th className="pb-2 pl-4 font-medium text-right">Warnings</th>
                <th className="pb-2 pl-4 font-medium text-right" title="Sanitized or cancelled after a warning">Protected</th>
                <th className="pb-2 pl-4 font-medium text-right">Sent anyway</th>
                <th className="pb-2 pl-4 font-medium text-right">Last active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.memberId} className="border-b border-border/10">
                  <td className="py-2">
                    <span className="text-foreground">{r.name || r.email}</span>
                    {r.name && <span className="block text-xs text-muted-foreground">{r.email}</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{r.checks}</td>
                  <td className="py-2 text-right tabular-nums">{r.warnings}</td>
                  <td className="py-2 text-right tabular-nums text-green-400">{r.protected}</td>
                  <td className={`py-2 text-right tabular-nums ${r.sentAnyway > 0 ? "text-yellow-400" : ""}`}>{r.sentAnyway}</td>
                  <td className="py-2 text-right text-xs text-muted-foreground">
                    {r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function OrganizationPage({ onContact }: { onContact: () => void }) {
  const [data, setData] = useState<OrgResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [inviting, setInviting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Most recent invite link, keyed by member id so it shows on that row.
  const [links, setLinks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setData(await orgApi<OrgResponse>("GET", "/org"));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    await run(async () => {
      const r = await orgApi<{ member: { id: string }; invitePath: string }>("POST", "/org/invites", {
        email: inviteEmail,
        role: inviteRole,
      });
      setLinks((l) => ({ ...l, [r.member.id]: inviteUrl(r.invitePath) }));
      setInviteEmail("");
      setInviteRole("member");
    });
    setInviting(false);
  };

  const newLink = (memberId: string) =>
    run(async () => {
      const r = await orgApi<{ invitePath: string }>("POST", `/org/members/${memberId}/invite-link`);
      setLinks((l) => ({ ...l, [memberId]: inviteUrl(r.invitePath) }));
    });

  const remove = (m: Member, isSelf: boolean) => {
    const question = isSelf
      ? "Leave this organization? You'll go back to your own plan."
      : m.status === "invited"
        ? `Cancel the invite for ${m.email}?`
        : `Remove ${m.name || m.email} from the organization? They go back to their own plan.`;
    if (!window.confirm(question)) return;
    run(async () => {
      await orgApi("DELETE", `/org/members/${m.id}`);
      if (isSelf) window.location.reload();
    });
  };

  const changeRole = (m: Member, role: Role) =>
    run(async () => {
      await orgApi("PATCH", `/org/members/${m.id}`, { role });
    });

  if (error) {
    return <div className="p-6 text-sm text-destructive">{error}</div>;
  }
  if (!data) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!data.organization || !data.me) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <section className={panel}>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">You're not in an organization</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            With Team or Enterprise your organization pays for everyone's protection, and owners can add and remove people
            and see what was caught, by person. If your company already uses EraseAI, ask your admin for an invite link.
          </p>
          <Button variant="primary" onClick={onContact}>Contact us about Team</Button>
        </section>
      </div>
    );
  }

  const org = data.organization;
  const me = data.me;
  const members = data.members ?? [];
  const seatsUsed = org.seatsUsed ?? members.length;
  const seatsFull = seatsUsed >= org.seatLimit;
  const activeOwners = members.filter((m) => m.role === "owner" && m.status === "active").length;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Building2 className="w-6 h-6" /></div>
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-foreground truncate">{org.name}</h1>
          <p className="text-sm text-muted-foreground">
            {ORG_PLAN_NAMES[org.plan] ?? org.plan} plan · you are {ORG_ROLE_NAMES[me.role].toLowerCase()}
            {me.canManage && <> · {seatsUsed} of {org.seatLimit} seats used</>}
          </p>
        </div>
      </header>

      {org.status === "suspended" && (
        <p className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          This organization is suspended, so members are on their own plans for now. Contact us to restore it.
        </p>
      )}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <section className={panel}>
        <div className="flex items-center gap-2 mb-1">
          <Smartphone className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Get protected</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {org.name} pays for everyone here. Install both and sign in with your work email; Chrome and Android are covered
          and nobody pays for a personal plan.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={chromeStoreLink("org-page")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Chrome className="w-4 h-4" /> Add to Chrome
          </a>
          <a href={ANDROID_PLAY_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border/50 px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/30">
            <Smartphone className="w-4 h-4" /> Get it on Google Play
          </a>
        </div>
      </section>

      {me.canManage && (
        <section className={panel}>
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Invite someone</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            You get a link to send them yourself (email, chat). They open it, sign in with that email, then install the
            Chrome extension and the Android app; both are covered and they pay nothing. Pending invites take a seat until
            they're cancelled.
          </p>
          <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              required
              placeholder="name@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="sm:flex-1"
              aria-label="Email"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="rounded-xl border border-border bg-input/50 px-3 py-2 text-sm text-foreground"
              aria-label="Role"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              {me.role === "owner" && <option value="owner">Owner</option>}
            </select>
            <Button type="submit" variant="primary" isLoading={inviting} disabled={seatsFull || org.status !== "active"}>
              Create invite link
            </Button>
          </form>
          {seatsFull && (
            <p className="mt-3 text-xs text-yellow-400">
              All seats are in use. Remove someone, or add seats under Billing below (if you pay by invoice,{" "}
              <button className="underline" onClick={onContact}>contact us</button>).
            </p>
          )}
        </section>
      )}

      <section className={panel}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">People</h2>
          <span className="ml-auto text-xs text-muted-foreground">{members.filter((m) => m.status === "active").length} active</span>
        </div>
        <ul className="divide-y divide-border/20">
          {members.map((m) => {
            const isSelf = m.id === me.memberId;
            // The last owner can't leave; they make someone else owner first.
            const canRemove = isSelf
              ? !(m.role === "owner" && activeOwners <= 1)
              : me.canManage && (m.role !== "owner" || me.role === "owner");
            return (
              <li key={m.id} className="py-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">
                      {m.name || m.email}
                      {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                    </p>
                    {m.name && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                  </div>
                  {m.status === "invited" && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">Invite pending</span>
                  )}
                  {me.role === "owner" && !isSelf ? (
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m, e.target.value as Role)}
                      className="rounded-lg border border-border bg-input/50 px-2 py-1 text-xs text-foreground"
                      aria-label={`Role for ${m.email}`}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground">{ORG_ROLE_NAMES[m.role]}</span>
                  )}
                  {me.canManage && m.status === "invited" && (
                    <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => newLink(m.id)} title="Make a new link; the old one stops working">
                      <Link2 className="w-3.5 h-3.5" /> New link
                    </Button>
                  )}
                  {canRemove && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => remove(m, isSelf)}
                    >
                      {isSelf ? <LogOut className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {isSelf ? "Leave" : m.status === "invited" ? "Cancel" : "Remove"}
                    </Button>
                  )}
                </div>
                {links[m.id] && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Send this link to {m.email}. It works once.</p>
                    <CopyLink url={links[m.id]} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {me.canManage && <BillingPanel onChanged={load} onContact={onContact} />}

      {me.canManage && <ManagedRolloutPanel />}

      {me.canManage && <ActivityPanel />}
    </div>
  );
}
