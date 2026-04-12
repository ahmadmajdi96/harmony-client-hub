import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
}

export function PageHeader({ title, subtitle, actionLabel, actionIcon: ActionIcon, onAction }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="animate-fade-in">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actionLabel && (
          <Button onClick={onAction} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
            {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
