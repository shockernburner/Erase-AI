import type { ColumnProfile, DatasetProfile } from "./profiler";

export interface BiasIssue {
  column: string;
  issueType: "class_imbalance" | "skewed_distribution" | "underrepresented_group" | "proxy_bias";
  severity: "low" | "medium" | "high";
  explanation: string;
  details: Record<string, unknown>;
}

const SENSITIVE_NAME_PATTERNS = [
  { pattern: /^(gender|sex|male|female)$/i, category: "gender" },
  { pattern: /^(race|ethnicity|ethnic|racial)$/i, category: "race" },
  { pattern: /^(age|birth|dob|date.?of.?birth)$/i, category: "age" },
  { pattern: /^(country|nation|nationality|region|state|city|location|address|zip|postal)$/i, category: "location" },
  { pattern: /^(religion|faith|religious)$/i, category: "religion" },
  { pattern: /^(disability|disabled|handicap)$/i, category: "disability" },
  { pattern: /^(marital|married|spouse|partner)$/i, category: "marital_status" },
  { pattern: /^(income|salary|wage|compensation)$/i, category: "income" },
];

function detectProxyBias(col: ColumnProfile): BiasIssue | null {
  const nameLC = col.name.toLowerCase().replace(/[_\-\s]/g, "");

  for (const { pattern, category } of SENSITIVE_NAME_PATTERNS) {
    if (pattern.test(col.name) || pattern.test(nameLC)) {
      return {
        column: col.name,
        issueType: "proxy_bias",
        severity: "high",
        explanation: `Column "${col.name}" appears to contain ${category} data, which is a protected attribute. Including it as a training feature may introduce discriminatory bias.`,
        details: { category, detectedBy: "column_name" },
      };
    }
  }

  if (col.dataType === "categorical" && col.categoricalStats) {
    const topValues = col.categoricalStats.topValues.map(v => v.value.toLowerCase());
    const genderValues = ["male", "female", "m", "f", "man", "woman", "other", "non-binary"];
    const genderMatches = topValues.filter(v => genderValues.includes(v)).length;
    if (genderMatches >= 2 && col.cardinality <= 5) {
      return {
        column: col.name,
        issueType: "proxy_bias",
        severity: "high",
        explanation: `Column "${col.name}" contains gender-related values (${topValues.filter(v => genderValues.includes(v)).join(", ")}). This is a potential proxy for gender bias.`,
        details: { category: "gender", detectedBy: "value_content" },
      };
    }
  }

  return null;
}

function detectClassImbalance(col: ColumnProfile): BiasIssue | null {
  if (col.dataType !== "categorical" && col.dataType !== "boolean") return null;
  if (!col.categoricalStats?.dominantClass) return null;
  if (col.cardinality < 2 || col.cardinality > 50) return null;

  const { dominantClass } = col.categoricalStats;

  if (dominantClass.percent >= 90) {
    return {
      column: col.name,
      issueType: "class_imbalance",
      severity: "high",
      explanation: `Column "${col.name}" is severely imbalanced: "${dominantClass.value}" represents ${dominantClass.percent}% of values. Models trained on this will strongly favor the majority class.`,
      details: { dominantValue: dominantClass.value, dominantPercent: dominantClass.percent },
    };
  }

  if (dominantClass.percent >= 80) {
    return {
      column: col.name,
      issueType: "class_imbalance",
      severity: "medium",
      explanation: `Column "${col.name}" shows class imbalance: "${dominantClass.value}" represents ${dominantClass.percent}% of values. Consider resampling or class weighting.`,
      details: { dominantValue: dominantClass.value, dominantPercent: dominantClass.percent },
    };
  }

  return null;
}

function detectSkewedDistribution(col: ColumnProfile): BiasIssue | null {
  if (col.dataType !== "numeric" || !col.numericStats) return null;

  const { skewness } = col.numericStats;
  const absSkew = Math.abs(skewness);

  if (absSkew > 3) {
    return {
      column: col.name,
      issueType: "skewed_distribution",
      severity: "high",
      explanation: `Column "${col.name}" has extreme ${skewness > 0 ? "right" : "left"} skew (skewness: ${skewness}). This can distort model training and predictions. Apply log/power transformation.`,
      details: { skewness, direction: skewness > 0 ? "right" : "left" },
    };
  }

  if (absSkew > 2) {
    return {
      column: col.name,
      issueType: "skewed_distribution",
      severity: "medium",
      explanation: `Column "${col.name}" has notable ${skewness > 0 ? "right" : "left"} skew (skewness: ${skewness}). Consider normalization before training.`,
      details: { skewness, direction: skewness > 0 ? "right" : "left" },
    };
  }

  return null;
}

function detectUnderrepresentation(col: ColumnProfile): BiasIssue[] {
  if (col.dataType !== "categorical" || !col.categoricalStats) return [];
  if (col.cardinality < 2 || col.cardinality > 30) return [];

  const issues: BiasIssue[] = [];
  const total = col.totalCount - col.missingCount;
  if (total === 0) return [];

  for (const { value, percent } of col.categoricalStats.topValues) {
    if (percent < 5 && percent > 0) {
      issues.push({
        column: col.name,
        issueType: "underrepresented_group",
        severity: "medium",
        explanation: `Value "${value}" in column "${col.name}" represents only ${percent}% of records. The model may perform poorly for this group. Consider oversampling or collecting more data.`,
        details: { value, percent },
      });
    }
  }

  return issues;
}

export function detectBias(profile: DatasetProfile): BiasIssue[] {
  const issues: BiasIssue[] = [];

  for (const col of profile.columns) {
    const proxy = detectProxyBias(col);
    if (proxy) issues.push(proxy);

    const imbalance = detectClassImbalance(col);
    if (imbalance) issues.push(imbalance);

    const skew = detectSkewedDistribution(col);
    if (skew) issues.push(skew);

    const underrep = detectUnderrepresentation(col);
    issues.push(...underrep);
  }

  return issues;
}
