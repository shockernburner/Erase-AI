import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Key,
  BarChart3,
  Webhook,
  TrendingUp,
  Database,
  Shield,
  Activity,
  AlertTriangle,
  Eye,
  Bell,
  FileText,
  Zap,
  Lock,
} from "lucide-react";

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`p-4 rounded-xl border ${color} backdrop-blur-sm`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function DemoBar({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{percent}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted/20">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, delay: 0.3 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function LockedOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-xl">
      <div className="flex flex-col items-center gap-2 text-center px-6">
        <Lock className="w-6 h-6 text-primary" />
        <p className="text-sm text-muted-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}

export function DeveloperPreview() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">{t("landing.previewDev")}</h2>
        <p className="text-sm text-muted-foreground">{t("landing.previewDevDesc")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Key className="w-4 h-4 text-amber-400" />}
          label={t("landing.demoApiKey")}
          value="era_demo••••"
          color="border-amber-500/30 bg-amber-500/5"
        />
        <StatCard
          icon={<BarChart3 className="w-4 h-4 text-cyan-400" />}
          label={t("landing.demoUsage")}
          value={`2,847 ${t("landing.demoRequests")}`}
          color="border-cyan-500/30 bg-cyan-500/5"
        />
        <StatCard
          icon={<Webhook className="w-4 h-4 text-emerald-400" />}
          label={t("landing.demoWebhooks")}
          value="3"
          color="border-emerald-500/30 bg-emerald-500/5"
        />
      </div>

      <div className="relative rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          API Usage (7-Day)
        </h3>
        <div className="grid grid-cols-7 gap-1 h-20 items-end">
          {[65, 42, 78, 91, 53, 87, 72].map((val, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${val}%` }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-amber-400/60 rounded-t-sm"
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>
      </div>

      <div className="relative rounded-xl border border-border/30 bg-card/30 p-4">
        <LockedOverlay message={t("landing.signUpToUnlock")} />
        <h3 className="text-sm font-semibold text-foreground mb-3">Code Snippets</h3>
        <div className="bg-muted/20 rounded-lg p-3 font-mono text-xs text-muted-foreground">
          <span className="text-cyan-400">const</span> response = <span className="text-cyan-400">await</span> fetch(<span className="text-amber-400">'https://api.eraseai.ai/v1/scan'</span>, {"{"}<br />
          &nbsp;&nbsp;method: <span className="text-amber-400">'POST'</span>,<br />
          &nbsp;&nbsp;headers: {"{"} <span className="text-amber-400">'Authorization'</span>: <span className="text-amber-400">`Bearer ${"${"}apiKey{"}"}`</span> {"}"},<br />
          &nbsp;&nbsp;body: JSON.stringify({"{"} text: content {"}"})
          <br />{"})"};
        </div>
      </div>
    </div>
  );
}

export function EnterprisePreview() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">{t("landing.previewEnt")}</h2>
        <p className="text-sm text-muted-foreground">{t("landing.previewEntDesc")}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Database className="w-4 h-4 text-cyan-400" />}
          label={t("landing.demoDatasets")}
          value="24"
          color="border-cyan-500/30 bg-cyan-500/5"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          label={t("landing.demoForgetScore")}
          value="91%"
          color="border-emerald-500/30 bg-emerald-500/5"
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          label={t("landing.demoIssues")}
          value="1,247"
          color="border-amber-500/30 bg-amber-500/5"
        />
        <StatCard
          icon={<Zap className="w-4 h-4 text-violet-400" />}
          label={t("landing.demoOperations")}
          value="8,391"
          color="border-violet-500/30 bg-violet-500/5"
        />
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Data Quality Breakdown
        </h3>
        <DemoBar label="PII Detected" percent={87} color="bg-red-400" />
        <DemoBar label="Bias Indicators" percent={34} color="bg-amber-400" />
        <DemoBar label="Toxic Content" percent={12} color="bg-orange-400" />
        <DemoBar label="Duplicates" percent={45} color="bg-violet-400" />
        <DemoBar label="Clean Records" percent={91} color="bg-emerald-400" />
      </div>

      <div className="relative rounded-xl border border-border/30 bg-card/30 p-4">
        <LockedOverlay message={t("landing.signUpToUnlock")} />
        <h3 className="text-sm font-semibold text-foreground mb-3">Processing Activity</h3>
        <div className="grid grid-cols-7 gap-1 h-16 items-end">
          {[40, 65, 55, 80, 45, 70, 60].map((val, i) => (
            <div key={i} className="bg-cyan-400/40 rounded-t-sm" style={{ height: `${val}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PersonalPreview() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">{t("landing.previewPersonal")}</h2>
        <p className="text-sm text-muted-foreground">{t("landing.previewPersonalDesc")}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Eye className="w-4 h-4 text-emerald-400" />}
          label={t("landing.demoScans")}
          value="47"
          color="border-emerald-500/30 bg-emerald-500/5"
        />
        <StatCard
          icon={<Bell className="w-4 h-4 text-amber-400" />}
          label={t("landing.demoAlerts")}
          value="3"
          color="border-amber-500/30 bg-amber-500/5"
        />
        <StatCard
          icon={<FileText className="w-4 h-4 text-cyan-400" />}
          label={t("landing.demoRewritten")}
          value="12"
          color="border-cyan-500/30 bg-cyan-500/5"
        />
        <StatCard
          icon={<Shield className="w-4 h-4 text-red-400" />}
          label={t("landing.demoRiskScore")}
          value="Low"
          color="border-red-500/30 bg-red-500/5"
        />
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          Recent Scan Results
        </h3>
        {[
          { text: "Just deployed my new API with the database credentials...", risk: "high", issues: ["PII", "Credential Leak"] },
          { text: "Check out our Q3 revenue numbers from the board meeting!", risk: "medium", issues: ["Confidential Data"] },
          { text: "Had a great weekend hiking in the mountains!", risk: "safe", issues: [] },
        ].map((scan, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            className={`p-3 rounded-lg border ${
              scan.risk === "high" ? "border-red-500/30 bg-red-500/5" :
              scan.risk === "medium" ? "border-amber-500/30 bg-amber-500/5" :
              "border-emerald-500/30 bg-emerald-500/5"
            }`}
          >
            <p className="text-sm text-foreground mb-2">"{scan.text}"</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                scan.risk === "high" ? "bg-red-500/20 text-red-400" :
                scan.risk === "medium" ? "bg-amber-500/20 text-amber-400" :
                "bg-emerald-500/20 text-emerald-400"
              }`}>
                {scan.risk.toUpperCase()}
              </span>
              {scan.issues.map((issue, j) => (
                <span key={j} className="text-xs text-muted-foreground bg-muted/20 px-2 py-0.5 rounded">
                  {issue}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative rounded-xl border border-border/30 bg-card/30 p-4">
        <LockedOverlay message={t("landing.signUpToUnlock")} />
        <h3 className="text-sm font-semibold text-foreground mb-3">Content Rewrite Assistant</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
            <span className="text-red-400 line-through">Just deployed my new API with the database credentials in the config...</span>
          </div>
          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-400">Just deployed my new API with secure configuration management!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
