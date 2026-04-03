import { db, personalScansTable, personalAlertsTable } from "@workspace/db";
import { eq, and, gte, desc, sql, ne } from "drizzle-orm";

interface ScanData {
  id: number;
  userId: string;
  riskScore: number;
  flags: string;
}

interface GeneratedAlert {
  alertType: "risk_spike" | "new_category" | "trending_up";
  message: string;
  severity: "low" | "medium" | "high";
}

export async function generateAlerts(scan: ScanData): Promise<void> {
  const alerts: GeneratedAlert[] = [];

  const past30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const past7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const excludeCurrent = ne(personalScansTable.id, scan.id);

  const [baselineResult] = await db
    .select({
      avg: sql<number>`round(avg(${personalScansTable.riskScore}))::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(personalScansTable)
    .where(
      and(
        eq(personalScansTable.userId, scan.userId),
        gte(personalScansTable.createdAt, past30Days),
        excludeCurrent
      )
    );

  const priorCount30 = baselineResult?.count ?? 0;
  const rollingAvg30 = baselineResult?.avg ?? null;

  if (rollingAvg30 !== null && priorCount30 >= 3 && (rollingAvg30 - scan.riskScore) >= 20) {
    alerts.push({
      alertType: "risk_spike",
      message: `Risk spike detected: score ${scan.riskScore}/100 is ${rollingAvg30 - scan.riskScore} points below your 30-day average of ${rollingAvg30}.`,
      severity: scan.riskScore < 40 ? "high" : "medium",
    });
  }

  try {
    const currentFlags = JSON.parse(scan.flags);
    const currentTypes = new Set(currentFlags.map((f: { type: string }) => f.type));

    if (currentTypes.size > 0) {
      const previousScans = await db
        .select({ flags: personalScansTable.flags })
        .from(personalScansTable)
        .where(
          and(
            eq(personalScansTable.userId, scan.userId),
            gte(personalScansTable.createdAt, past30Days),
            excludeCurrent
          )
        )
        .orderBy(desc(personalScansTable.createdAt))
        .limit(50);

      const previousTypes = new Set<string>();
      for (const s of previousScans) {
        try {
          const flags = JSON.parse(s.flags);
          for (const f of flags) {
            if (f.type) previousTypes.add(f.type);
          }
        } catch {}
      }

      if (previousScans.length > 0) {
        for (const type of currentTypes) {
          if (!previousTypes.has(type)) {
            const typeLabels: Record<string, string> = {
              toxicity: "Toxicity",
              hate_speech: "Hate Speech",
              pii: "Personal Information",
              bias: "Bias",
            };
            alerts.push({
              alertType: "new_category",
              message: `New risk category detected: ${typeLabels[type] || type}. This is the first time this issue type has appeared in your scans.`,
              severity: type === "hate_speech" || type === "pii" ? "high" : "medium",
            });
          }
        }
      }
    }
  } catch {}

  const [avg7Result] = await db
    .select({
      avg: sql<number>`round(avg(${personalScansTable.riskScore}))::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(personalScansTable)
    .where(
      and(
        eq(personalScansTable.userId, scan.userId),
        gte(personalScansTable.createdAt, past7Days),
        excludeCurrent
      )
    );

  const rollingAvg7 = avg7Result?.avg ?? null;
  const priorCount7 = avg7Result?.count ?? 0;

  if (
    rollingAvg30 !== null &&
    rollingAvg7 !== null &&
    priorCount30 >= 3 &&
    priorCount7 >= 2 &&
    rollingAvg7 < rollingAvg30 &&
    (rollingAvg30 - rollingAvg7) >= 10
  ) {
    alerts.push({
      alertType: "trending_up",
      message: `Risk trend worsening: your 7-day average (${rollingAvg7}) is ${rollingAvg30 - rollingAvg7} points worse than your 30-day average (${rollingAvg30}).`,
      severity: rollingAvg7 < 40 ? "high" : "medium",
    });
  }

  if (alerts.length > 0) {
    await db.insert(personalAlertsTable).values(
      alerts.map((a) => ({
        userId: scan.userId,
        alertType: a.alertType,
        message: a.message,
        severity: a.severity,
        relatedScanId: scan.id,
      }))
    );
  }
}
