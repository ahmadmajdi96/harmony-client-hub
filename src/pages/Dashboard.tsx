import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "@/components/shared/KPICard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Users, FileText, ListChecks, TrendingUp, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const statusVariant = (s: string) => {
  if (s === "completed" || s === "active" || s === "done") return "success" as const;
  if (s === "in_progress" || s === "in-progress") return "info" as const;
  if (s === "on_hold" || s === "on-hold") return "warning" as const;
  if (s === "cancelled" || s === "inactive") return "danger" as const;
  return "default" as const;
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

  const activeProjects = projects?.filter(p => p.status === "in_progress").length || 0;
  const completedTasks = tasks?.filter(t => t.status === "done").length || 0;
  const totalTasks = tasks?.length || 0;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Project & Client Management Overview" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Total Projects" value={String(projects?.length || 0)} icon={FolderKanban} status="info" />
          <KPICard title="Active Clients" value={String(clients?.filter(c => c.status === "active").length || 0)} icon={Users} status="success" />
          <KPICard title="Tasks Completed" value={`${completedTasks}/${totalTasks}`} icon={ListChecks} status="warning" />
          <KPICard title="Files Uploaded" value={String(files?.length || 0)} icon={FileText} status="info" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Recent Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {projects?.slice(0, 5).map(p => (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between p-3 rounded-md border hover:border-primary/30 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{(p as any).clients?.name || "No client"}</p>
                  </div>
                  <StatusBadge status={p.status} variant={statusVariant(p.status)} />
                </Link>
              ))}
              {(!projects || projects.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No projects yet. Create one to get started.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" /> Pending Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks?.filter(t => t.status !== "done").slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <p className="font-medium text-sm">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.due_date ? `Due: ${t.due_date}` : "No due date"}</p>
                  </div>
                  <StatusBadge status={t.status} variant={statusVariant(t.status)} />
                </div>
              ))}
              {(!tasks || tasks.filter(t => t.status !== "done").length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No pending tasks.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
