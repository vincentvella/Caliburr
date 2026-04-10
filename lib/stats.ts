/** Sort a numeric array in place and return it. */
function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function quartiles(values: number[]): { q1: number; q3: number } {
  const s = sorted(values);
  const mid = Math.floor(s.length / 2);
  const lower = s.slice(0, mid);
  const upper = s.length % 2 === 0 ? s.slice(mid) : s.slice(mid + 1);
  return { q1: median(lower), q3: median(upper) };
}

function stdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export interface GrindStats {
  count: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  mean: number;
  outlierLow: number;
  outlierHigh: number;
}

/**
 * Compute median, IQR, and outlier bounds (mean ± 2σ) for a set of
 * numeric grind settings. Returns null if fewer than 2 parseable values.
 */
export function computeGrindStats(rawSettings: string[]): GrindStats | null {
  const values = rawSettings
    .map((s) => parseFloat(s))
    .filter((n) => !isNaN(n));

  if (values.length < 2) return null;

  const s = sorted(values);
  const med = median(s);
  const { q1, q3 } = quartiles(values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = stdDev(values, mean);

  return {
    count: values.length,
    median: med,
    q1,
    q3,
    iqr: q3 - q1,
    mean,
    outlierLow: mean - 2 * sd,
    outlierHigh: mean + 2 * sd,
  };
}

/** Returns true if a grind setting value is an outlier for the given stats. */
export function isOutlier(value: number, stats: GrindStats): boolean {
  return value < stats.outlierLow || value > stats.outlierHigh;
}
