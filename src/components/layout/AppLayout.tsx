import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, FolderKanban, Users, FileText, ListChecks,
  ChevronLeft, ChevronRight, BarChart3, Truck, Activity,
  LogOut,
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className={cn(
        "flex flex-col shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}>
        <div className="flex items-center gap-3 h-16 shrink-0 border-b border-sidebar-border px-5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-violet-400 flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <span className="font-bold text-[15px] text-sidebar-accent-foreground tracking-tight leading-none block">CORTA-PM</span>
              <span className="text-[10px] text-sidebar-foreground/60 font-medium tracking-widest uppercase">Management</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.path === "/" ? location.pathname === "/" : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            const link = (
              <Link key={item.path} to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 relative group",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-sidebar-primary" />}
                <item.icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors duration-200", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground")} />
                {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              </Link>
            );
            if (collapsed) return <Tooltip key={item.path} delayDuration={0}><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right" sideOffset={8} className="font-medium text-xs">{item.label}</TooltipContent></Tooltip>;
            return <div key={item.path}>{link}</div>;
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-2">
          {!collapsed && user && (
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.user_metadata?.full_name || "User"}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.email}</p>
            </div>
          )}
          <button onClick={signOut}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200",
              collapsed && "justify-center"
            )}>
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        <button onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-11 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40 transition-all duration-200">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
