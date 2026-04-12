import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { KPICard } from "@/components/shared/KPICard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, Users, ListChecks, TrendingUp, Clock, Activity, Truck, DollarSign, ArrowUpRight, Users2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

const statusVariant = (s: string) => {
  if (s === "completed" || s === "active" || s === "done") return "success" as const;
  if (s === "in_progress" || s === "in-progress") return "info" as const;
  if (s === "on_hold" || s === "on-hold") return "warning" as const;
  if (s === "cancelled" || s === "inactive") return "danger" as const;
  return "default" as const;
};

const actionColors: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-600",
  updated: "bg-violet-50 text-violet-600",
  deleted: "bg-rose-50 text-rose-600",
};

export default function Dashboard() {
  const { user } = useAuth();

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

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*");
      return data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*");
      return data || [];
    },
  });

  const { data: taskEmployees } = useQuery({
    queryKey: ["task_employees"],
    queryFn: async () => {
      const { data } = await supabase.from("task_employees").select("*");
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
  const activeEmployees = employees?.filter((e: any) => e.status === "active").length || 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${user?.user_metadata?.full_name || "there"} 👋`}
        subtitle="Here's what's happening across your projects"
      />
      <div className="p-6 space-y-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {[
            { title: "Projects", value: String(projects?.length || 0), icon: FolderKanban, status: "info" as const },
            { title: "Active", value: String(activeProjects), icon: TrendingUp, status: "success" as const, change: `${avgProgress}% avg`, changeType: "positive" as const },
            { title: "Clients", value: String(clients?.filter(c => c.status === "active").length || 0), icon: Users, status: "success" as const },
            { title: "Suppliers", value: String(suppliers?.length || 0), icon: Truck, status: "warning" as const },
            { title: "Tasks", value: `${completedTasks}/${totalTasks}`, icon: ListChecks, status: "info" as const },
            { title: "Budget", value: `$${totalBudget.toLocaleString()}`, icon: DollarSign, status: "warning" as const },
            { title: "Employees", value: String(employees?.length || 0), icon: Users2, status: "info" as const, change: `${activeEmployees} active`, changeType: "positive" as const },
          ].map((kpi) => (
            <motion.div key={kpi.title} variants={itemVariants}>
              <KPICard {...kpi} />
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Workload */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="lg:col-span-3">
            <Card className="rounded-2xl border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center"><Users2 className="h-4 w-4 text-primary" /></div>
                    Employee Workload
                  </CardTitle>
                  <Link to="/employees" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">View all <ArrowUpRight className="h-3 w-3" /></Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {employees?.filter((e: any) => e.status === "active").slice(0, 6).map((emp: any) => {
                    const taskCount = taskEmployees?.filter((te: any) => te.employee_id === emp.id).length || 0;
                    return (
                      <div key={emp.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-border/40 hover:border-primary/20 hover:shadow-sm transition-all">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary">{emp.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{emp.name}</p>
                          <p className="text-[10px] text-muted-foreground">{taskCount} task{taskCount !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    );
                  })}
                  {(!employees || employees.filter((e: any) => e.status === "active").length === 0) && (
                    <p className="text-xs text-muted-foreground col-span-full text-center py-4">No active employees. <Link to="/employees" className="text-primary hover:underline">Add employees</Link></p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-2"
          >
            <Card className="rounded-2xl border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    Recent Projects
                  </CardTitle>
                  <Link to="/projects" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">View all <ArrowUpRight className="h-3 w-3" /></Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {projects?.slice(0, 5).map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`}
                    className="flex items-center justify-between p-3.5 rounded-xl hover:bg-accent/50 transition-all duration-200 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{p.name}</p>
                        <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded-md">{p.reference_number}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{(p as any).clients?.name || "No client"}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center gap-2 w-28">
                        <Progress value={p.progress} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground w-8 text-right font-semibold tabular-nums">{p.progress}%</span>
                      </div>
                      <StatusBadge status={p.status} variant={statusVariant(p.status)} />
                    </div>
                  </Link>
                ))}
                {(!projects || projects.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">No projects yet.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="rounded-2xl border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    Activity
                  </CardTitle>
                  <Link to="/activity" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">View all <ArrowUpRight className="h-3 w-3" /></Link>
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
                        <p className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                  ))}
                  {(!recentActivity || recentActivity.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4">No recent activity.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  Pending Tasks
                </CardTitle>
                <Link to="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">View all <ArrowUpRight className="h-3 w-3" /></Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tasks?.filter(t => t.status !== "done").slice(0, 6).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 hover:shadow-sm hover:border-primary/20 transition-all duration-200">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground/70">{t.due_date ? `Due: ${t.due_date}` : "No due date"}</p>
                    </div>
                    <StatusBadge status={t.status} variant={statusVariant(t.status)} />
                  </div>
                ))}
              </div>
              {(!tasks || tasks.filter(t => t.status !== "done").length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">All tasks complete! 🎉</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
