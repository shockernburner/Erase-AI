import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";
import {
  ShieldX, ArrowLeft, Users, Eye, Star, MessageSquare,
  Crown, Loader2, ChevronLeft, ChevronRight, TrendingUp,
  BarChart3, RefreshCw, Check, ChevronDown, UserPlus, X,
  Mail, Lock, User as UserIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui-elements";
import { LanguageSelector } from "@/components/LanguageSelector";

interface Stats {
  visits: { today: number; week: number; allTime: number };
  totalUsers: number;
  proSubscriptions: number;
  feedback: { total: number; averageRating: number | null };
}

interface UserRow {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  authProvider: string;
  role: string;
  planType: string;
  subscriptionStatus: string | null;
  createdAt: string;
}

interface FeedbackRow {
  id: string;
  rating: number;
  message: string;
  createdAt: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
}

interface VisitTrend {
  date: string;
  visits: number;
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/50 border border-border/50 rounded-2xl p-5 backdrop-blur-md"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">{icon}</div>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
    </motion.div>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2 justify-center mt-4">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="p-1.5 rounded-lg bg-muted/20 text-muted-foreground disabled:opacity-30 hover:bg-muted/40 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm text-muted-foreground">
        {t("admin.pageOf", { page, total: totalPages })}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="p-1.5 rounded-lg bg-muted/20 text-muted-foreground disabled:opacity-30 hover:bg-muted/40 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function MiniBarChart({ data }: { data: VisitTrend[] }) {
  const { t } = useTranslation();
  if (!data.length) return <p className="text-sm text-muted-foreground/50 py-8 text-center">{t("admin.noVisitData")}</p>;

  const max = Math.max(...data.map((d) => d.visits), 1);

  return (
    <div className="flex items-end gap-1 h-32 px-2">
      {data.map((d) => {
        const height = Math.max(4, (d.visits / max) * 100);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-8 hidden group-hover:flex flex-col items-center">
              <div className="bg-card border border-border px-2 py-1 rounded text-xs text-foreground whitespace-nowrap shadow-lg">
                {d.visits} {t("admin.visits")}
                <div className="text-muted-foreground/50">{new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
              </div>
            </div>
            <div
              className="w-full bg-gradient-to-t from-primary/60 to-primary rounded-t transition-all hover:from-primary/80 hover:to-cyan-400"
              style={{ height: `${height}%` }}
            />
            <span className="text-[9px] text-muted-foreground/40 truncate w-full text-center">
              {new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const { t } = useTranslation();
  if (plan === "pro") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold"><Crown className="w-3 h-3" />{t("plan.pro")}</span>;
  }
  if (plan === "enterprise") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold"><Crown className="w-3 h-3" />{t("plan.enterprise")}</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground text-xs">{t("plan.free")}</span>;
}

function PlanSelector({ user, onUpdate }: { user: UserRow; onUpdate: (id: string, updates: { planType?: string; subscriptionStatus?: string | null }) => Promise<void> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  const plans = ["free", "pro", "enterprise"] as const;
  const statuses = ["active", "canceled", "past_due"] as const;

  const handleSelectPlan = async (plan: string) => {
    if (plan === user.planType) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setError(false);
    try {
      await onUpdate(user.id, { planType: plan });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 3000);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  const handleSelectStatus = async (status: string | null) => {
    if (status === user.subscriptionStatus) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setError(false);
    try {
      await onUpdate(user.id, { subscriptionStatus: status });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 3000);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={saving}
        className="flex items-center gap-1.5 group"
      >
        <PlanBadge plan={user.planType} />
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        ) : saved ? (
          <Check className="w-3 h-3 text-green-400" />
        ) : error ? (
          <span className="text-[10px] text-destructive font-medium">{t("admin.failed")}</span>
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border/50 rounded-xl shadow-xl py-1 min-w-[180px]">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">{t("admin.plan")}</div>
            {plans.map((p) => (
              <button
                key={p}
                onClick={() => handleSelectPlan(p)}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted/20 transition-colors ${
                  p === user.planType ? "text-primary font-semibold" : "text-foreground"
                }`}
              >
                <PlanBadge plan={p} />
                {p === user.planType && <Check className="w-3 h-3 text-primary ml-auto" />}
              </button>
            ))}
            {user.planType !== "free" && (
              <>
                <div className="border-t border-border/20 my-1" />
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">{t("admin.status")}</div>
                {statuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSelectStatus(s)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted/20 transition-colors ${
                      s === user.subscriptionStatus ? "text-primary font-semibold" : "text-foreground"
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      s === "active" ? "bg-green-400" : s === "canceled" ? "bg-muted-foreground" : "bg-yellow-400"
                    }`} />
                    <span className="capitalize">{s.replace("_", " ")}</span>
                    {s === user.subscriptionStatus && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [planType, setPlanType] = useState("free");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName, planType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("admin.failedToCreate"));
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError(t("admin.somethingWrong"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md mx-4 bg-card border border-border/50 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-border/30">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">{t("admin.createUser")}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("admin.firstName")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-muted/20 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("admin.lastName")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-muted/20 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              placeholder={t("admin.emailAddress")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-3 py-2.5 bg-muted/20 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              placeholder={t("admin.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full pl-10 pr-3 py-2.5 bg-muted/20 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">{t("admin.plan")}</label>
            <div className="flex gap-2">
              {(["free", "pro", "enterprise"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlanType(p)}
                  className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-all ${
                    planType === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/30 bg-muted/10 text-muted-foreground hover:bg-muted/20"
                  }`}
                >
                  <span className="capitalize">{p}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="w-full gap-2 bg-gradient-to-r from-primary to-cyan-400 text-black font-bold hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.4)] py-5 text-base mt-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("admin.creating")}
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                {t("admin.createUser")}
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

export default function AdminDashboard({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [fbPage, setFbPage] = useState(1);
  const [fbTotalPages, setFbTotalPages] = useState(1);
  const [trends, setTrends] = useState<VisitTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);

  const fetchAll = async (uPage = 1, fPage = 1) => {
    try {
      const [statsRes, usersRes, fbRes, trendsRes] = await Promise.all([
        fetch("/api/admin/stats", { credentials: "include" }),
        fetch(`/api/admin/users?page=${uPage}&limit=10`, { credentials: "include" }),
        fetch(`/api/admin/feedback?page=${fPage}&limit=10`, { credentials: "include" }),
        fetch("/api/admin/visits?days=14", { credentials: "include" }),
      ]);

      const [statsData, usersData, fbData, trendsData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        fbRes.json(),
        trendsRes.json(),
      ]);

      setStats(statsData);
      setUsers(usersData.users || []);
      setUsersTotalPages(usersData.totalPages || 1);
      setFeedback(fbData.feedback || []);
      setFbTotalPages(fbData.totalPages || 1);
      setTrends(trendsData.trends || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll(usersPage, fbPage);
  };

  const handleUpdateUser = async (userId: string, updates: { planType?: string; subscriptionStatus?: string | null }) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update user");
    }
    const { user: updated } = await res.json();
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, planType: updated.planType, subscriptionStatus: updated.subscriptionStatus }
          : u,
      ),
    );
  };

  const handleUsersPage = (p: number) => {
    setUsersPage(p);
    fetch(`/api/admin/users?page=${p}&limit=10`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setUsers(d.users || []); setUsersTotalPages(d.totalPages || 1); });
  };

  const handleFbPage = (p: number) => {
    setFbPage(p);
    fetch(`/api/admin/feedback?page=${p}&limit=10`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setFeedback(d.feedback || []); setFbTotalPages(d.totalPages || 1); });
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-destructive">{t("admin.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pb-20 relative bg-background">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-8 flex-wrap gap-4"
        >
          <div className="flex items-center gap-3">
            <Button
              onClick={onBack}
              variant="outline"
              className="gap-2 text-sm border-border/50"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("admin.backToDashboard")}
            </Button>
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                <ShieldX className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                  {t("admin.title")}
                </h1>
                <p className="text-xs font-mono text-primary/80 uppercase tracking-widest">
                  {t("app.tagline")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="gap-2 text-sm border-border/50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? t("admin.refreshing") : t("admin.refresh")}
            </Button>
          </div>
        </motion.header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Eye className="w-5 h-5" />}
                label={t("admin.totalVisits")}
                value={stats?.visits.allTime ?? 0}
                sub={`${t("admin.todayWeek")}: ${stats?.visits.today ?? 0} / ${stats?.visits.week ?? 0}`}
              />
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label={t("admin.totalUsers")}
                value={stats?.totalUsers ?? 0}
              />
              <StatCard
                icon={<Crown className="w-5 h-5" />}
                label={t("admin.proSubscriptions")}
                value={stats?.proSubscriptions ?? 0}
              />
              <StatCard
                icon={<MessageSquare className="w-5 h-5" />}
                label={t("admin.feedbackRating")}
                value={stats?.feedback.total ?? 0}
                sub={stats?.feedback.averageRating ? `${t("admin.avgRating")}: ${stats.feedback.averageRating}/5` : undefined}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/50 border border-border/50 rounded-2xl p-5 backdrop-blur-md mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{t("admin.visitTrends")}</h2>
              </div>
              <MiniBarChart data={trends} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/50 border border-border/50 rounded-2xl p-5 backdrop-blur-md mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{t("admin.users")}</h2>
                <span className="text-xs text-muted-foreground/50 ml-auto mr-3">{stats?.totalUsers ?? 0} {t("admin.total")}</span>
                <Button
                  onClick={() => setShowCreateUser(true)}
                  className="gap-1.5 text-xs h-8 px-3 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {t("admin.createUser")}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-left text-muted-foreground/70">
                      <th className="pb-3 font-medium">User</th>
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Provider</th>
                      <th className="pb-3 font-medium">Plan</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Signed Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                        <td className="py-3">
                          <span className="text-foreground font-medium">
                            {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                          </span>
                          {u.role === "admin" && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold">ADMIN</span>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">{u.email || "—"}</td>
                        <td className="py-3 text-muted-foreground capitalize">{u.authProvider}</td>
                        <td className="py-3"><PlanSelector user={u} onUpdate={handleUpdateUser} /></td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            u.subscriptionStatus === "active"
                              ? "bg-green-500/20 text-green-400"
                              : u.subscriptionStatus
                                ? "bg-muted/30 text-muted-foreground"
                                : "text-muted-foreground/40"
                          }`}>
                            {u.subscriptionStatus || "—"}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground/60 text-xs">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={usersPage} totalPages={usersTotalPages} onPage={handleUsersPage} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card/50 border border-border/50 rounded-2xl p-5 backdrop-blur-md mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{t("admin.feedbackTitle")}</h2>
                <span className="text-xs text-muted-foreground/50 ml-auto">{stats?.feedback.total ?? 0} {t("admin.total")}</span>
              </div>

              {feedback.length === 0 ? (
                <p className="text-sm text-muted-foreground/50 py-6 text-center">{t("admin.noFeedback")}</p>
              ) : (
                <div className="space-y-3">
                  {feedback.map((f) => (
                    <div key={f.id} className="p-4 bg-muted/10 border border-border/20 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${
                                  s <= f.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-foreground font-medium">
                            {[f.userFirstName, f.userLastName].filter(Boolean).join(" ") || "Unknown"}
                          </span>
                          {f.userEmail && (
                            <span className="text-xs text-muted-foreground/60 ml-1">({f.userEmail})</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground/50">
                          {new Date(f.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{f.message}</p>
                    </div>
                  ))}
                </div>
              )}
              <Pagination page={fbPage} totalPages={fbTotalPages} onPage={handleFbPage} />
            </motion.div>
          </>
        )}
      </div>

      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onCreated={() => {
            setUsersPage(1);
            fetchAll(1, fbPage);
          }}
        />
      )}
    </div>
  );
}
