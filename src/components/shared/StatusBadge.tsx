import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "success" | "warning" | "danger" | "info" | "default" | "pulse";
}

const variantStyles = {
  success: "bg-emerald-50 text-emerald-600 ring-emerald-500/20",
  warning: "bg-amber-50 text-amber-600 ring-amber-500/20",
  danger: "bg-rose-50 text-rose-600 ring-rose-500/20",
  info: "bg-violet-50 text-violet-600 ring-violet-500/20",
  default: "bg-muted text-muted-foreground ring-border",
  pulse: "bg-violet-50 text-violet-600 ring-violet-500/20 animate-pulse",
};

const dotStyles = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-violet-500",
  default: "bg-muted-foreground/50",
  pulse: "bg-violet-500 animate-pulse",
};

export function StatusBadge({ status = "", variant = "default" }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors",
      variantStyles[variant]
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[variant])} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
