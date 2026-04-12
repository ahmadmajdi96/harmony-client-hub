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
    <div className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
            status === "success" && "bg-success/10 text-success",
            status === "warning" && "bg-warning/10 text-warning",
            status === "danger" && "bg-destructive/10 text-destructive",
            status === "info" && "bg-info/10 text-info",
            !status && "bg-primary/10 text-primary"
          )}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <p className="text-3xl font-bold mt-3 tracking-tight">{value}</p>
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
