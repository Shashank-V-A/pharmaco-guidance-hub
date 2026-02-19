/** Risk-only labels: Green = Safe, Yellow = Adjust, Red = Toxic/Ineffective. No blue/orange. */
const riskLabels = ["Toxic/Ineffective", "Adjust", "Safe"] as const;

/** Map activity level (0=Poor, 1=Intermediate, 2=Normal, 3=Ultra-rapid) to risk segment index (0=red, 1=yellow, 2=green). */
function activityToRiskIndex(activeLevel: number): number {
  if (activeLevel <= 0) return 0;
  if (activeLevel === 1) return 1;
  return 2; // Normal or Ultra-rapid → Safe (green)
}

const riskSegmentColors = ["bg-destructive", "bg-warning", "bg-success"] as const;
const riskSegmentText = ["text-destructive", "text-warning", "text-success"] as const;

interface ActivityBarProps {
  activeLevel: number; // 0–3: Poor, Intermediate, Normal, Ultra-rapid
}

export function ActivityBar({ activeLevel }: ActivityBarProps) {
  const riskIndex = activityToRiskIndex(activeLevel);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {riskLabels.map((label, i) => (
          <span
            key={label}
            className={`text-xs font-medium transition-all duration-200 ${
              i === riskIndex ? riskSegmentText[i] : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute left-0 top-0 h-full w-full rounded-full bg-gradient-to-r from-destructive via-warning to-success transition-all duration-300"
          style={{ width: "100%" }}
        />
        <div
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-card shadow-sm transition-all duration-500 ease-out ${riskSegmentColors[riskIndex]}`}
          style={{
            left: `${(riskIndex / (riskLabels.length - 1)) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    </div>
  );
}
