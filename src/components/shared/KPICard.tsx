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
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        {Icon && (
          <div className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center",
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
      <p className="text-2xl font-bold mt-2">{value}</p>
      {change && (
        <p className={cn(
          "text-xs mt-1",
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
