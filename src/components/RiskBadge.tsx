export type RiskLevel = "safe" | "adjust" | "toxic" | "ineffective";

interface RiskConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const riskMap: Record<RiskLevel, RiskConfig> = {
  safe: {
    label: "Safe",
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    dot: "bg-success",
  },
  adjust: {
    label: "Adjust Dosage",
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
    dot: "bg-warning",
  },
  toxic: {
    label: "Toxic Risk",
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    dot: "bg-destructive",
  },
  ineffective: {
    label: "Ineffective",
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    dot: "bg-destructive",
  },
};

interface RiskBadgeProps {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
}

export function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  const config = riskMap[level];
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200 ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
