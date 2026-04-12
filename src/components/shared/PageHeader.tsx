import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
}

export function PageHeader({ title, subtitle, actionLabel, actionIcon: ActionIcon, onAction }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-background/70 backdrop-blur-2xl border-b border-border/40">
      <div className="flex items-center justify-between px-6 py-5">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </motion.div>
        {actionLabel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Button onClick={onAction} className="rounded-xl shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 h-10 px-5 font-medium">
              {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
              {actionLabel}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
