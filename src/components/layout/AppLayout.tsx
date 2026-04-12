import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FolderKanban, Users, FileText, ListChecks,
  ChevronLeft, ChevronRight, Settings, BarChart3, Truck, Activity,
  HardHat,
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
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "bg-sidebar text-sidebar-foreground",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Brand */}
        <div className={cn(
          "flex items-center gap-3 h-16 shrink-0 border-b border-sidebar-border/50 px-5",
        )}>
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sidebar-primary to-[hsl(215_80%_42%)] flex items-center justify-center shrink-0 shadow-lg shadow-sidebar-primary/25">
            <HardHat className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <span className="font-bold text-[15px] text-sidebar-accent-foreground tracking-tight leading-none block">
                HarmonyHub
              </span>
              <span className="text-[10px] text-sidebar-foreground/60 font-medium tracking-widest uppercase">
                Engineering
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.path === "/"
              ? location.pathname === "/"
              : location.pathname === item.path || location.pathname.startsWith(item.path + "/");

            const link = (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 relative group",
                  isActive
                    ? "bg-sidebar-primary/15 text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-sidebar-primary" />
                )}
                <item.icon className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"
                )} />
                {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="font-medium text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.path}>{link}</div>;
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-11 border-t border-sidebar-border/50 text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40 transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
