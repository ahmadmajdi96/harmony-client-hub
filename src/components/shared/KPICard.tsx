import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  status?: "success" | "warning" | "danger" | "info";
}

export function KPICard({ title, value, change, changeType = "neutral", icon: Icon, status }: KPICardProps) {
  return (
    <div className="group rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        {Icon && (
          <div className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
            status === "success" && "bg-success/10 text-success",
            status === "warning" && "bg-warning/10 text-warning",
            status === "danger" && "bg-destructive/10 text-destructive",
            status === "info" && "bg-info/10 text-info",
            !status && "bg-primary/10 text-primary"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold mt-3 tracking-tight">{value}</p>
      {change && (
        <p className={cn(
          "text-xs mt-1.5 font-medium",
          changeType === "positive" && "text-success",
          changeType === "negative" && "text-destructive",
          changeType === "neutral" && "text-muted-foreground"
        )}>
          {change}
        </p>
      )}
    </div>
  );
}
