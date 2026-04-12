import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Zap,
  Settings,
  BarChart3,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, num: "01" },
  { path: "/projects", label: "Projects", icon: FolderKanban, num: "02" },
  { path: "/clients", label: "Clients", icon: Users, num: "03" },
  { path: "/tasks", label: "Tasks", icon: ListChecks, num: "04" },
  { path: "/files", label: "File Manager", icon: FileText, num: "05" },
  { path: "/reports", label: "Reports", icon: BarChart3, num: "06" },
  { path: "/settings", label: "Settings", icon: Settings, num: "07" },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border shrink-0">
          <Zap className="h-6 w-6 text-sidebar-primary shrink-0" />
          {!collapsed && (
            <span className="font-bold text-lg text-sidebar-accent-foreground tracking-tight">
              HarmonyHub
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {navItems.map((item) => {
            const isActive = item.path === "/"
              ? location.pathname === "/"
              : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{item.num}</span>
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
