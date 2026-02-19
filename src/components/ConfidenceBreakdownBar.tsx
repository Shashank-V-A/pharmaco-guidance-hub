/**
 * Horizontal stacked bar for confidence breakdown; total must match confidence_score.
 * evidence_weight, variant_completeness, parsing_integrity, diplotype_clarity (0–1 scale).
 */
import type { ConfidenceBreakdown } from "@/types/analysis";

interface ConfidenceBreakdownBarProps {
  /** 0–100 (percentage) to display as total */
  totalPercent: number;
  breakdown: ConfidenceBreakdown;
  label?: string;
}

const BREAKDOWN_KEYS: (keyof ConfidenceBreakdown)[] = [
  "evidence_weight",
  "variant_completeness",
  "parsing_integrity",
  "diplotype_clarity",
];

const LABELS: Record<keyof ConfidenceBreakdown, string> = {
  evidence_weight: "Evidence",
  variant_completeness: "Variants",
  parsing_integrity: "Parsing",
  diplotype_clarity: "Diplotype",
};

const COLORS = ["bg-primary", "bg-primary/80", "bg-primary/60", "bg-primary/40"] as const;

export function ConfidenceBreakdownBar({
  totalPercent,
  breakdown,
  label = "Confidence",
}: ConfidenceBreakdownBarProps) {
  const segments = BREAKDOWN_KEYS.map((key, i) => ({
    key,
    label: LABELS[key],
    value: breakdown[key] ?? 0,
    color: COLORS[i],
  }));

  const sum = segments.reduce((s, seg) => s + seg.value, 0);
  const totalDecimal = totalPercent / 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{totalPercent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted flex">
        {segments.map((seg) => {
          const pct = totalDecimal > 0 ? (seg.value / totalDecimal) * 100 : 0;
          return (
            <div
              key={seg.key}
              className={`h-full transition-all duration-300 ${seg.color}`}
              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
              title={`${LABELS[seg.key]}: ${(seg.value * 100).toFixed(1)}%`}
            />
          );
        })}
      </div>
      {sum > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          {segments.map((seg, i) => (
            <span key={seg.key}>
              {seg.label}: {(seg.value * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
