import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
}

export function PageHeader({ title, subtitle, actionLabel, actionIcon: ActionIcon, onAction }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actionLabel && (
          <Button onClick={onAction} className="shadow-sm hover:shadow-md transition-shadow">
            {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
