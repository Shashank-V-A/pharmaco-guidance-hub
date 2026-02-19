interface ConfidenceBarProps {
  value: number; // 0–100
  label?: string;
}

export function ConfidenceBar({ value, label }: ConfidenceBarProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="text-xs font-semibold text-foreground">{value}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
