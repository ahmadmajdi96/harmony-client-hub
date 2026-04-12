import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/shared/KPICard";
import { BarChart3, FolderKanban, Users, ListChecks, TrendingUp, DollarSign } from "lucide-react";

export default function Reports() {
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*");
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

  const totalBudget = projects?.reduce((sum, p) => sum + (Number(p.budget) || 0), 0) || 0;
  const completedProjects = projects?.filter(p => p.status === "completed").length || 0;
  const avgProgress = projects?.length ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0;
  const taskCompletion = tasks?.length ? Math.round((tasks.filter(t => t.status === "done").length / tasks.length) * 100) : 0;

  const statusCounts = {
    planning: projects?.filter(p => p.status === "planning").length || 0,
    in_progress: projects?.filter(p => p.status === "in_progress").length || 0,
    on_hold: projects?.filter(p => p.status === "on_hold").length || 0,
    completed: completedProjects,
    cancelled: projects?.filter(p => p.status === "cancelled").length || 0,
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Analytics and insights across projects and clients" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <KPICard title="Total Budget" value={`$${totalBudget.toLocaleString()}`} icon={DollarSign} status="info" />
          <KPICard title="Avg Progress" value={`${avgProgress}%`} icon={TrendingUp} status="success" />
          <KPICard title="Task Completion" value={`${taskCompletion}%`} icon={ListChecks} status="warning" />
          <KPICard title="Completed Projects" value={String(completedProjects)} icon={FolderKanban} status="success" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Project Status Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${
                        status === "completed" ? "bg-success" :
                        status === "in_progress" ? "bg-info" :
                        status === "on_hold" ? "bg-warning" :
                        status === "cancelled" ? "bg-destructive" : "bg-muted-foreground"
                      }`} />
                      <span className="text-sm capitalize">{status.replace("_", " ")}</span>
                    </div>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Client Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-sm">Total Clients</span><span className="font-semibold">{clients?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-sm">Active Clients</span><span className="font-semibold">{clients?.filter(c => c.status === "active").length || 0}</span></div>
                <div className="flex justify-between"><span className="text-sm">Inactive Clients</span><span className="font-semibold">{clients?.filter(c => c.status === "inactive").length || 0}</span></div>
                <div className="flex justify-between"><span className="text-sm">Avg Projects/Client</span><span className="font-semibold">{clients?.length ? (projects?.length || 0 / clients.length).toFixed(1) : "0"}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
