const levels = ["Poor", "Intermediate", "Normal", "Ultra-rapid"];

interface ActivityBarProps {
  activeLevel: number; // 0-3 index into levels
}

export function ActivityBar({ activeLevel }: ActivityBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {levels.map((label, i) => (
          <span
            key={label}
            className={`text-xs font-medium transition-all duration-200 ${
              i === activeLevel ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-destructive via-warning via-success to-primary transition-all duration-300"
          style={{ width: "100%" }}
        />
        <div
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-card bg-primary shadow-sm transition-all duration-500 ease-out"
          style={{ left: `${(activeLevel / (levels.length - 1)) * 100}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
    </div>
  );
}
