import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FolderKanban, Users, FileText, ListChecks,
  ChevronLeft, BarChart3, Truck, Activity,
  LogOut, ChevronsLeftRight,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/projects", label: "Projects", icon: FolderKanban },
  { path: "/clients", label: "Clients", icon: Users },
  { path: "/suppliers", label: "Suppliers", icon: Truck },
  { path: "/tasks", label: "Tasks", icon: ListChecks },
  { path: "/files", label: "File Manager", icon: FileText },
  { path: "/activity", label: "Activity Log", icon: Activity },
  { path: "/reports", label: "Reports", icon: BarChart3 },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <motion.aside
        animate={{ width: collapsed ? 72 : 264 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col shrink-0 bg-card border-r border-border/60 relative"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 h-[68px] shrink-0 px-5">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-violet-400 flex items-center justify-center shrink-0 shadow-lg shadow-primary/15 ring-2 ring-primary/10">
            <span className="text-primary-foreground font-bold text-base tracking-tight">C</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <span className="font-bold text-[15px] text-foreground tracking-tight leading-none block">CORTA-PM</span>
                <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase mt-0.5 block">Management</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.path === "/" ? location.pathname === "/" : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            const link = (
              <Link key={item.path} to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative overflow-hidden",
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-primary/8 rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className={cn("h-[18px] w-[18px] shrink-0 relative z-10 transition-colors duration-200", isActive ? "text-primary" : "")} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="truncate flex-1 relative z-10"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
            if (collapsed) return <Tooltip key={item.path} delayDuration={0}><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right" sideOffset={12} className="font-medium text-xs px-3 py-1.5 rounded-lg">{item.label}</TooltipContent></Tooltip>;
            return <div key={item.path}>{link}</div>;
          })}
        </nav>

        {/* Bottom section */}
        <div className="mx-3 mb-3 space-y-2">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* User profile card */}
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 mt-2"
              >
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                  <span className="text-xs font-bold text-primary">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{user?.user_metadata?.full_name || "User"}</p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{user?.email}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center mt-2"
              >
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10 cursor-default">
                      <span className="text-xs font-bold text-primary">{initials}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12} className="text-xs">
                    <p className="font-semibold">{user?.user_metadata?.full_name || "User"}</p>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className={cn("flex gap-1.5", collapsed ? "flex-col" : "flex-row")}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={signOut}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl text-[13px] font-medium text-muted-foreground hover:bg-destructive/8 hover:text-destructive transition-all duration-200",
                    collapsed ? "h-9 w-full" : "h-9 flex-1 px-3"
                  )}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Sign Out</span>}
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">Sign Out</TooltipContent>}
            </Tooltip>

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className={cn(
                    "flex items-center justify-center rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200",
                    collapsed ? "h-9 w-full" : "h-9 w-9 shrink-0"
                  )}
                >
                  <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
                    <ChevronsLeftRight className="h-4 w-4" />
                  </motion.div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">
                {collapsed ? "Expand" : "Collapse"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </motion.aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
