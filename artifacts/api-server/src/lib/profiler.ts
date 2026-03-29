export interface ColumnProfile {
  name: string;
  dataType: "numeric" | "categorical" | "text" | "datetime" | "boolean" | "empty";
  totalCount: number;
  missingCount: number;
  missingPercent: number;
  cardinality: number;
  uniquePercent: number;
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    skewness: number;
  };
  categoricalStats?: {
    topValues: { value: string; count: number; percent: number }[];
    allValueCounts: { value: string; count: number; percent: number }[];
    dominantClass?: { value: string; percent: number };
  };
  sample: string[];
}

export interface DatasetProfile {
  totalRows: number;
  totalColumns: number;
  columns: ColumnProfile[];
  completeness: number;
}

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  /^\d{2}\.\d{2}\.\d{4}$/,
];

function detectColumnType(values: string[]): "numeric" | "categorical" | "text" | "datetime" | "boolean" | "empty" {
  const nonEmpty = values.filter(v => v.trim() !== "");
  if (nonEmpty.length === 0) return "empty";

  const sample = nonEmpty.slice(0, Math.min(100, nonEmpty.length));

  const boolValues = new Set(["true", "false", "yes", "no", "0", "1"]);
  const boolMatch = sample.filter(v => boolValues.has(v.toLowerCase())).length;
  if (boolMatch / sample.length > 0.8) return "boolean";

  const dateMatch = sample.filter(v => DATE_PATTERNS.some(p => p.test(v.trim()))).length;
  if (dateMatch / sample.length > 0.7) return "datetime";

  const numMatch = sample.filter(v => {
    const cleaned = v.trim().replace(/,/g, "");
    return cleaned !== "" && !isNaN(Number(cleaned));
  }).length;
  if (numMatch / sample.length > 0.8) return "numeric";

  const avgLen = nonEmpty.reduce((sum, v) => sum + v.length, 0) / nonEmpty.length;
  const cardinality = new Set(nonEmpty.map(v => v.toLowerCase().trim())).size;
  const cardinalityRatio = cardinality / nonEmpty.length;

  if (avgLen > 50 || cardinalityRatio > 0.8) return "text";

  return "categorical";
}

function computeNumericStats(values: string[]): ColumnProfile["numericStats"] {
  const nums = values
    .map(v => v.trim().replace(/,/g, ""))
    .filter(v => v !== "" && !isNaN(Number(v)))
    .map(Number);

  if (nums.length === 0) return undefined;

  nums.sort((a, b) => a - b);
  const n = nums.length;
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = n % 2 === 0 ? (nums[n / 2 - 1] + nums[n / 2]) / 2 : nums[Math.floor(n / 2)];

  const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  let skewness = 0;
  if (stdDev > 0 && n > 2) {
    const m3 = nums.reduce((acc, v) => acc + ((v - mean) / stdDev) ** 3, 0) / n;
    skewness = m3;
  }

  return {
    min: Math.round(nums[0] * 1000) / 1000,
    max: Math.round(nums[n - 1] * 1000) / 1000,
    mean: Math.round(mean * 1000) / 1000,
    median: Math.round(median * 1000) / 1000,
    stdDev: Math.round(stdDev * 1000) / 1000,
    skewness: Math.round(skewness * 1000) / 1000,
  };
}

function computeCategoricalStats(values: string[]): ColumnProfile["categoricalStats"] {
  const nonEmpty = values.filter(v => v.trim() !== "");
  if (nonEmpty.length === 0) return undefined;

  const counts = new Map<string, number>();
  for (const v of nonEmpty) {
    const key = v.trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const allValueCounts = sorted.map(([value, count]) => ({
    value,
    count,
    percent: Math.round((count / nonEmpty.length) * 1000) / 10,
  }));
  const topValues = allValueCounts.slice(0, 10);

  const dominant = sorted[0];
  const dominantPercent = (dominant[1] / nonEmpty.length) * 100;

  return {
    topValues,
    allValueCounts,
    dominantClass: dominantPercent > 50 ? {
      value: dominant[0],
      percent: Math.round(dominantPercent * 10) / 10,
    } : undefined,
  };
}

export function profileDataset(
  headers: string[],
  rows: Record<string, string>[]
): DatasetProfile {
  const totalRows = rows.length;
  const totalColumns = headers.length;

  let totalMissing = 0;
  const totalCells = totalRows * totalColumns;

  const columns: ColumnProfile[] = headers.map(header => {
    const values = rows.map(row => row[header] ?? "");
    const nonEmpty = values.filter(v => v.trim() !== "");
    const missingCount = values.length - nonEmpty.length;
    totalMissing += missingCount;

    const dataType = detectColumnType(values);
    const uniqueValues = new Set(nonEmpty.map(v => v.toLowerCase().trim()));

    const profile: ColumnProfile = {
      name: header,
      dataType,
      totalCount: values.length,
      missingCount,
      missingPercent: values.length > 0 ? Math.round((missingCount / values.length) * 1000) / 10 : 0,
      cardinality: uniqueValues.size,
      uniquePercent: nonEmpty.length > 0 ? Math.round((uniqueValues.size / nonEmpty.length) * 1000) / 10 : 0,
      sample: nonEmpty.slice(0, 5),
    };

    if (dataType === "numeric") {
      profile.numericStats = computeNumericStats(values);
    }

    if (dataType === "categorical" || dataType === "boolean") {
      profile.categoricalStats = computeCategoricalStats(values);
    }

    return profile;
  });

  return {
    totalRows,
    totalColumns,
    columns,
    completeness: totalCells > 0 ? Math.round(((totalCells - totalMissing) / totalCells) * 1000) / 10 : 100,
  };
}
