/** Enzyme activity spectrum: Poor ← IM ← Normal ← UM (clinical, minimal). */
const ACTIVITY_LABELS = ["Poor", "IM", "Normal", "UM"] as const;
const SEGMENT_TEXT = ["text-destructive", "text-warning", "text-success", "text-primary"] as const;

interface ActivityBarProps {
  /** 0=Poor, 1=IM, 2=Normal, 3=UM */
  activeLevel: number;
}

export function ActivityBar({ activeLevel }: ActivityBarProps) {
  const index = Math.max(0, Math.min(3, Math.round(activeLevel)));

  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-1">
        {ACTIVITY_LABELS.map((label, i) => (
          <span
            key={label}
            className={`text-xs font-medium transition-all duration-200 ${
              i === index ? SEGMENT_TEXT[i] : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(to right, hsl(var(--destructive)) 0%, hsl(var(--warning)) 33%, hsl(var(--success)) 66%, hsl(var(--primary)) 100%)",
          }}
        />
        <div
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-background bg-foreground/10 shadow-sm transition-all duration-500 ease-out"
          style={{
            left: `${(index / 3) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    </div>
  );
}
