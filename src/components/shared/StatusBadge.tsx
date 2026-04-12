import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "success" | "warning" | "danger" | "info" | "default" | "pulse";
}

const variantStyles = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  default: "bg-muted text-muted-foreground border-border",
  pulse: "bg-info/10 text-info border-info/20 animate-pulse",
};

export function StatusBadge({ status = "", variant = "default" }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
      variantStyles[variant]
    )}>
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        variant === "success" && "bg-success",
        variant === "warning" && "bg-warning",
        variant === "danger" && "bg-destructive",
        variant === "info" && "bg-info",
        variant === "default" && "bg-muted-foreground",
        variant === "pulse" && "bg-info animate-pulse",
      )} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
