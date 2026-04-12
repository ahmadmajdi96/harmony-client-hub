import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/shared/KPICard";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ResponsiveContainer, Legend,
} from "recharts";
import { BarChart3, FolderKanban, Users, ListChecks, TrendingUp, DollarSign } from "lucide-react";
import { format, subDays, startOfWeek, eachWeekOfInterval } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  planning: "hsl(var(--muted-foreground))",
  in_progress: "hsl(var(--info, 210 100% 50%))",
  on_hold: "hsl(var(--warning, 45 100% 50%))",
  completed: "hsl(var(--success, 142 76% 36%))",
  cancelled: "hsl(var(--destructive))",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "hsl(var(--muted-foreground))",
  medium: "hsl(var(--warning, 45 100% 50%))",
  high: "hsl(var(--destructive))",
};

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

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*");
      return data || [];
    },
  });

  const totalBudget = projects?.reduce((sum, p) => sum + (Number(p.budget) || 0), 0) || 0;
  const completedProjects = projects?.filter(p => p.status === "completed").length || 0;
  const avgProgress = projects?.length ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0;
  const taskCompletion = tasks?.length ? Math.round((tasks.filter(t => t.status === "done").length / tasks.length) * 100) : 0;

  // Pie chart data
  const statusData = useMemo(() => {
    if (!projects?.length) return [];
    const counts: Record<string, number> = {};
    projects.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace("_", " "),
      value,
      fill: STATUS_COLORS[name] || "hsl(var(--muted-foreground))",
    }));
  }, [projects]);

  // Budget bar chart per project
  const budgetData = useMemo(() => {
    if (!projects?.length) return [];
    return projects
      .filter(p => p.budget && p.budget > 0)
      .sort((a, b) => (Number(b.budget) || 0) - (Number(a.budget) || 0))
      .slice(0, 8)
      .map(p => ({
        name: p.name.length > 15 ? p.name.substring(0, 15) + "…" : p.name,
        budget: Number(p.budget) || 0,
        progress: p.progress,
      }));
  }, [projects]);

  // Task completion trend (weekly for last 12 weeks)
  const trendData = useMemo(() => {
    if (!tasks?.length) return [];
    const now = new Date();
    const start = subDays(now, 84); // 12 weeks
    const weeks = eachWeekOfInterval({ start, end: now });

    return weeks.map(weekStart => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const label = format(weekStart, "MMM d");

      const created = tasks.filter(t => {
        const d = new Date(t.created_at);
        return d >= weekStart && d < weekEnd;
      }).length;

      // Count tasks that were "done" by checking if created_at is before weekEnd and status is done
      // We approximate: tasks marked done whose created_at <= weekEnd
      const cumDone = tasks.filter(t => {
        const d = new Date(t.created_at);
        return t.status === "done" && d < weekEnd;
      }).length;

      return { week: label, created, completed: cumDone };
    });
  }, [tasks]);

  const pieConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    statusData.forEach(d => {
      cfg[d.name] = { label: d.name, color: d.fill };
    });
    return cfg;
  }, [statusData]);

  const barConfig = {
    budget: { label: "Budget ($)", color: "hsl(var(--primary))" },
    progress: { label: "Progress (%)", color: "hsl(var(--success, 142 76% 36%))" },
  };

  const trendConfig = {
    created: { label: "Tasks Created", color: "hsl(var(--primary))" },
    completed: { label: "Tasks Completed", color: "hsl(var(--success, 142 76% 36%))" },
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Analytics and insights across projects and clients" />
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
          <KPICard title="Total Budget" value={`$${totalBudget.toLocaleString()}`} icon={DollarSign} status="info" />
          <KPICard title="Avg Progress" value={`${avgProgress}%`} icon={TrendingUp} status="success" />
          <KPICard title="Task Completion" value={`${taskCompletion}%`} icon={ListChecks} status="warning" />
          <KPICard title="Projects" value={String(projects?.length || 0)} icon={FolderKanban} status="info" />
          <KPICard title="Clients" value={String(clients?.length || 0)} icon={Users} status="success" />
          <KPICard title="Suppliers" value={String(suppliers?.length || 0)} icon={BarChart3} status="default" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" /> Project Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={pieConfig} className="mx-auto aspect-square max-h-[300px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Budget Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Project Budgets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barConfig} className="h-[300px]">
                <BarChart data={budgetData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="budget" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Task Completion Trend */}
        <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Task Completion Trend (12 Weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-[300px]">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="created" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="completed" stroke="hsl(var(--success, 142 76% 36%))" strokeWidth={2} dot={{ r: 3 }} />
                <Legend />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Client Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total Clients</span><span className="font-semibold">{clients?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Active</span><span className="font-semibold text-success">{clients?.filter(c => c.status === "active").length || 0}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Inactive</span><span className="font-semibold text-muted-foreground">{clients?.filter(c => c.status === "inactive").length || 0}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Task Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total Tasks</span><span className="font-semibold">{tasks?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">To Do</span><span className="font-semibold">{tasks?.filter(t => t.status === "todo").length || 0}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">In Progress</span><span className="font-semibold text-info">{tasks?.filter(t => t.status === "in_progress").length || 0}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Done</span><span className="font-semibold text-success">{tasks?.filter(t => t.status === "done").length || 0}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
