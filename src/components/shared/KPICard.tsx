import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

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
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group rounded-2xl border border-border/50 bg-card p-5 shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-shadow duration-300"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
        {Icon && (
          <div className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
            status === "success" && "bg-success/12 text-success group-hover:shadow-success/10",
            status === "warning" && "bg-warning/12 text-warning group-hover:shadow-warning/10",
            status === "danger" && "bg-destructive/12 text-destructive group-hover:shadow-destructive/10",
            status === "info" && "bg-info/12 text-info group-hover:shadow-info/10",
            !status && "bg-primary/12 text-primary group-hover:shadow-primary/10"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold mt-3 tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{value}</p>
      {change && (
        <p className={cn(
          "text-[11px] mt-1.5 font-medium",
          changeType === "positive" && "text-success",
          changeType === "negative" && "text-destructive",
          changeType === "neutral" && "text-muted-foreground"
        )}>
          {change}
        </p>
      )}
    </motion.div>
  );
}
