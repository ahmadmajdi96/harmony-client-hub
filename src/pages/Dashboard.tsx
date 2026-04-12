import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "@/components/shared/KPICard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Users, FileText, ListChecks, TrendingUp, Clock, Activity, Truck, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const statusVariant = (s: string) => {
  if (s === "completed" || s === "active" || s === "done") return "success" as const;
  if (s === "in_progress" || s === "in-progress") return "info" as const;
  if (s === "on_hold" || s === "on-hold") return "warning" as const;
  if (s === "cancelled" || s === "inactive") return "danger" as const;
  return "default" as const;
};

const actionColors: Record<string, string> = {
  created: "bg-success/10 text-success",
  updated: "bg-info/10 text-info",
  deleted: "bg-destructive/10 text-destructive",
};

export default function Dashboard() {
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*, clients(name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*");
      return data || [];
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks-all"],
    queryFn: async () => {
      const { data } = await supabase.from("project_tasks").select("*");
      return data || [];
    },
  });

  const { data: files } = useQuery({
    queryKey: ["files-all"],
    queryFn: async () => {
      const { data } = await supabase.from("project_files").select("*");
      return data || [];
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*");
      return data || [];
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(8);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const activeProjects = projects?.filter(p => p.status === "in_progress").length || 0;
  const completedTasks = tasks?.filter(t => t.status === "done").length || 0;
  const totalTasks = tasks?.length || 0;
  const totalBudget = projects?.reduce((sum, p) => sum + (Number(p.budget) || 0), 0) || 0;
  const avgProgress = projects?.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Project & Client Management Overview" />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
          <KPICard title="Total Projects" value={String(projects?.length || 0)} icon={FolderKanban} status="info" />
          <KPICard title="Active Projects" value={String(activeProjects)} icon={TrendingUp} status="success" change={`${avgProgress}% avg progress`} changeType="positive" />
          <KPICard title="Active Clients" value={String(clients?.filter(c => c.status === "active").length || 0)} icon={Users} status="success" />
          <KPICard title="Suppliers" value={String(suppliers?.length || 0)} icon={Truck} status="warning" />
          <KPICard title="Tasks Done" value={`${completedTasks}/${totalTasks}`} icon={ListChecks} status="info" />
          <KPICard title="Total Budget" value={`$${totalBudget.toLocaleString()}`} icon={DollarSign} status="warning" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <Card className="lg:col-span-2 animate-fade-in" style={{ animationDelay: "100ms" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Recent Projects
                </CardTitle>
                <Link to="/projects" className="text-xs text-primary hover:underline">View all →</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {projects?.slice(0, 5).map(p => (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 hover:bg-accent/30 transition-all duration-200 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <span className="text-[10px] font-mono text-muted-foreground">{p.reference_number}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{(p as any).clients?.name || "No client"}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 w-24">
                      <Progress value={p.progress} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{p.progress}%</span>
                    </div>
                    <StatusBadge status={p.status} variant={statusVariant(p.status)} />
                  </div>
                </Link>
              ))}
              {(!projects || projects.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">No projects yet. Create one to get started.</p>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Recent Activity
                </CardTitle>
                <Link to="/activity" className="text-xs text-primary hover:underline">View all →</Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity?.map(log => (
                  <div key={log.id} className="flex items-start gap-3 group">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${actionColors[log.action] || "bg-muted text-muted-foreground"}`}>
                      {log.action[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed truncate">{log.description}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))}
                {(!recentActivity || recentActivity.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-4">No recent activity.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Tasks */}
        <Card className="animate-fade-in" style={{ animationDelay: "300ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" /> Pending Tasks
              </CardTitle>
              <Link to="/tasks" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tasks?.filter(t => t.status !== "done").slice(0, 6).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/20 transition-all duration-200">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.due_date ? `Due: ${t.due_date}` : "No due date"}</p>
                  </div>
                  <StatusBadge status={t.status} variant={statusVariant(t.status)} />
                </div>
              ))}
            </div>
            {(!tasks || tasks.filter(t => t.status !== "done").length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">No pending tasks. 🎉</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
