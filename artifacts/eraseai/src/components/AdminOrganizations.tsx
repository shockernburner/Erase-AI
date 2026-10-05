import { useCallback, useEffect, useState } from "react";
import { Building2, Copy, Check, Loader2, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Input } from "@/components/ui-elements";
import { ORG_PLAN_NAMES, ORG_ROLE_NAMES, inviteUrl, orgApi } from "@/lib/orgInvite";

interface OrgRow {
  id: string;
  name: string;
  plan: "business" | "enterprise";
  seatLimit: number;
  status: "active" | "suspended";
  createdAt: string;
  activeMembers: number;
  pendingInvites: number;
}

interface MemberRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
}

function CopyableLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate text-xs text-foreground">{url}</code>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5 shrink-0"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {}
          }}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function OrgDetails({ org, onChanged }: { org: OrgRow; onChanged: () => void }) {
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [seatLimit, setSeatLimit] = useState(String(org.seatLimit));
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("owner");
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMembers = useCallback(() => {
    orgApi<{ members: MemberRow[] }>("GET", `/admin/orgs/${org.id}/members`)
      .then((d) => setMembers(d.members))
      .catch((e: Error) => setError(e.message));
  }, [org.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
      loadMembers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-border/30 bg-muted/5 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">
          Plan
          <select
            value={org.plan}
            onChange={(e) => run(async () => { await orgApi("PATCH", `/admin/orgs/${org.id}`, { plan: e.target.value }); })}
            className="mt-1 block rounded-lg border border-border bg-input/50 px-2 py-1.5 text-sm text-foreground"
          >
            <option value="business">Team</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Seats
          <div className="mt-1 flex gap-1">
            <Input type="number" min={1} value={seatLimit} onChange={(e) => setSeatLimit(e.target.value)} className="w-24 py-1.5" />
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || Number(seatLimit) === org.seatLimit}
              onClick={() => run(async () => { await orgApi("PATCH", `/admin/orgs/${org.id}`, { seatLimit: Number(seatLimit) }); })}
            >
              Save
            </Button>
          </div>
        </label>
        <Button
          size="sm"
          variant={org.status === "active" ? "outline" : "primary"}
          disabled={busy}
          onClick={() => {
            const next = org.status === "active" ? "suspended" : "active";
            if (next === "suspended" && !window.confirm(`Suspend ${org.name}? Its members go back to their own plans.`)) return;
            run(async () => { await orgApi("PATCH", `/admin/orgs/${org.id}`, { status: next }); });
          }}
        >
          {org.status === "active" ? "Suspend" : "Reactivate"}
        </Button>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">People</p>
        {!members ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : members.length === 0 ? (
          <p className="text-xs text-muted-foreground">No one yet.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-foreground">{m.name || m.email}</span>
                {m.name && <span className="text-xs text-muted-foreground">{m.email}</span>}
                <span className="text-xs text-muted-foreground">· {ORG_ROLE_NAMES[m.role] ?? m.role}</span>
                {m.status === "invited" && <span className="text-[11px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400">pending</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await orgApi<{ invitePath: string }>("POST", `/admin/orgs/${org.id}/invites`, { email: inviteEmail, role: inviteRole });
            setLink({ email: inviteEmail, url: inviteUrl(r.invitePath) });
            setInviteEmail("");
          });
        }}
      >
        <Input type="email" required placeholder="Invite by email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="sm:flex-1 py-2" />
        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="rounded-xl border border-border bg-input/50 px-3 py-2 text-sm text-foreground">
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>
        <Button type="submit" size="sm" variant="secondary" isLoading={busy}>Create invite link</Button>
      </form>
      {link && <CopyableLink label={`Send this to ${link.email}. It works once.`} url={link.url} />}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Platform-admin view of Team / Enterprise organizations: create one (which
// makes an owner invite link to send), adjust plan, seats and status, and
// add people.
export function AdminOrganizations() {
  const [orgs, setOrgs] = useState<OrgRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", plan: "business", seatLimit: "10", ownerEmail: "" });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; url: string } | null>(null);

  const load = useCallback(() => {
    orgApi<{ organizations: OrgRow[] }>("GET", "/admin/orgs")
      .then((d) => setOrgs(d.organizations))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const r = await orgApi<{ organization: OrgRow; invitePath: string }>("POST", "/admin/orgs", {
        name: form.name,
        plan: form.plan,
        seatLimit: Number(form.seatLimit),
        ownerEmail: form.ownerEmail,
      });
      setCreated({ name: r.organization.name, email: form.ownerEmail, url: inviteUrl(r.invitePath) });
      setForm({ name: "", plan: "business", seatLimit: "10", ownerEmail: "" });
      setCreating(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="bg-card/50 border border-border/50 rounded-2xl p-5 backdrop-blur-md mb-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Organizations</h2>
        <span className="text-xs text-muted-foreground/50 ml-auto mr-3">{orgs?.length ?? 0} total</span>
        <Button
          onClick={() => setCreating((c) => !c)}
          className="gap-1.5 text-xs h-8 px-3 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
        >
          {creating ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {creating ? "Cancel" : "New organization"}
        </Button>
      </div>

      {creating && (
        <form onSubmit={create} className="grid gap-2 sm:grid-cols-2 mb-4 rounded-xl border border-border/30 p-4">
          <Input required placeholder="Organization name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input required type="email" placeholder="Owner's email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
          <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="rounded-xl border border-border bg-input/50 px-3 py-3 text-sm text-foreground">
            <option value="business">Team ($9 a person a month, 3 to 10 people)</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <Input required type="number" min={1} placeholder="Seats" value={form.seatLimit} onChange={(e) => setForm({ ...form, seatLimit: e.target.value })} />
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>Create and get owner invite link</Button>
          </div>
        </form>
      )}

      {created && (
        <div className="mb-4">
          <CopyableLink label={`${created.name} created. Send this owner invite to ${created.email}; it works once.`} url={created.url} />
        </div>
      )}
      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      {!orgs ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : orgs.length === 0 ? (
        <p className="text-sm text-muted-foreground/50 py-4 text-center">No organizations yet.</p>
      ) : (
        <ul className="divide-y divide-border/20">
          {orgs.map((o) => (
            <li key={o.id} className="py-3">
              <button className="w-full flex flex-wrap items-center gap-2 text-left" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                <span className="font-medium text-foreground">{o.name}</span>
                <span className="text-xs text-muted-foreground">{ORG_PLAN_NAMES[o.plan]}</span>
                {o.status === "suspended" && <span className="text-[11px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">suspended</span>}
                <span className="ml-auto text-xs text-muted-foreground">
                  {o.activeMembers + o.pendingInvites} of {o.seatLimit} seats · {o.pendingInvites} pending
                </span>
              </button>
              {expanded === o.id && <OrgDetails org={o} onChanged={load} />}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
