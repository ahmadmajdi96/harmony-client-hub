import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format, startOfDay, endOfDay, differenceInDays, parseISO, addDays, min as minDate, max as maxDate } from "date-fns";
import {
  Search, Plus, Pencil, Trash2, Users2, FolderKanban, ListChecks,
  CalendarIcon, Download, X, Filter, UserPlus, Link2, Unlink,
  Clock, BarChart3, TrendingUp, PieChart, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { utils, write } from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend,
} from "recharts";

type Employee = {
  id: string;
  reference_number: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  status: string;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const emptyForm = { name: "", email: "", phone: "", role: "", department: "", status: "active", notes: "" };

const STATUS_COLORS: Record<string, string> = {
  todo: "hsl(var(--muted-foreground))",
  in_progress: "hsl(var(--info))",
  done: "hsl(var(--success))",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "hsl(var(--destructive))",
  medium: "hsl(var(--warning))",
  low: "hsl(var(--muted-foreground))",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--info))",
  "hsl(252 56% 70%)",
  "hsl(36 90% 65%)",
  "hsl(152 60% 55%)",
];

export default function Employees() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("roster");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  // Timeline filters
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");

  // Project assignment
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignEmployee, setAssignEmployee] = useState<Employee | null>(null);
  const [assignProjectId, setAssignProjectId] = useState("");
  const [assignRole, setAssignRole] = useState("");

  // Bulk assignment
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignType, setBulkAssignType] = useState<"project" | "task">("project");
  const [bulkProjectId, setBulkProjectId] = useState("");
  const [bulkTaskId, setBulkTaskId] = useState("");
  const [bulkRole, setBulkRole] = useState("");

  // ── Queries ──
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Employee[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*");
      return data || [];
    },
  });

  const { data: employeeProjects = [] } = useQuery({
    queryKey: ["employee_projects"],
    queryFn: async () => {
      const { data } = await supabase.from("employee_projects").select("*");
      return data || [];
    },
  });

  const { data: taskEmployees = [] } = useQuery({
    queryKey: ["task_employees"],
    queryFn: async () => {
      const { data } = await supabase.from("task_employees").select("*");
      return data || [];
    },
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["project_tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("project_tasks").select("*");
      return data || [];
    },
  });

  // ── Mutations ──
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["employees"] });
    qc.invalidateQueries({ queryKey: ["employee_projects"] });
    qc.invalidateQueries({ queryKey: ["task_employees"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof emptyForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from("employees").update({
          name: data.name, email: data.email || null, phone: data.phone || null,
          role: data.role || null, department: data.department || null,
          status: data.status, notes: data.notes || null,
        }).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert({
          name: data.name, email: data.email || null, phone: data.phone || null,
          role: data.role || null, department: data.department || null,
          status: data.status, notes: data.notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      setFormOpen(false);
      setEditingEmployee(null);
      setForm(emptyForm);
      toast.success(editingEmployee ? "Employee updated" : "Employee created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Employee deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ employee_id, project_id, role }: { employee_id: string; project_id: string; role: string }) => {
      const { error } = await supabase.from("employee_projects").insert({ employee_id, project_id, role: role || null });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setAssignDialogOpen(false);
      setAssignProjectId("");
      setAssignRole("");
      toast.success("Employee assigned to project");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unassignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Employee unassigned"); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Bulk assign mutation
  const bulkAssignProjectMutation = useMutation({
    mutationFn: async ({ employee_ids, project_id, role }: { employee_ids: string[]; project_id: string; role: string }) => {
      const existing = employeeProjects.filter(ep => ep.project_id === project_id).map(ep => ep.employee_id);
      const toInsert = employee_ids.filter(id => !existing.includes(id));
      if (!toInsert.length) throw new Error("All selected employees are already assigned to this project");
      const rows = toInsert.map(employee_id => ({ employee_id, project_id, role: role || null }));
      const { error } = await supabase.from("employee_projects").insert(rows);
      if (error) throw error;
      return toInsert.length;
    },
    onSuccess: (count) => {
      invalidateAll();
      setBulkAssignOpen(false);
      setSelectedEmployeeIds([]);
      setBulkProjectId("");
      setBulkRole("");
      toast.success(`${count} employee(s) assigned to project`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkAssignTaskMutation = useMutation({
    mutationFn: async ({ employee_ids, task_id }: { employee_ids: string[]; task_id: string }) => {
      const existing = taskEmployees.filter(te => te.task_id === task_id).map(te => te.employee_id);
      const toInsert = employee_ids.filter(id => !existing.includes(id));
      if (!toInsert.length) throw new Error("All selected employees are already assigned to this task");
      const rows = toInsert.map(employee_id => ({ employee_id, task_id }));
      const { error } = await supabase.from("task_employees").insert(rows);
      if (error) throw error;
      return toInsert.length;
    },
    onSuccess: (count) => {
      invalidateAll();
      setBulkAssignOpen(false);
      setSelectedEmployeeIds([]);
      setBulkTaskId("");
      toast.success(`${count} employee(s) assigned to task`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Derived data ──
  const departments = useMemo(() => Array.from(new Set(employees.map(e => e.department).filter(Boolean))).sort() as string[], [employees]);

  const filtered = useMemo(() => {
    let items = employees;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(e => e.name.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.role?.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") items = items.filter(e => e.status === statusFilter);
    if (deptFilter !== "all") items = items.filter(e => e.department === deptFilter);
    return items;
  }, [employees, search, statusFilter, deptFilter]);

  const getEmployeeProjects = (empId: string) => {
    const epIds = employeeProjects.filter(ep => ep.employee_id === empId);
    return epIds.map(ep => ({ ...ep, project: projects.find(p => p.id === ep.project_id) })).filter(ep => ep.project);
  };

  const getEmployeeTasks = (empId: string) => {
    const taskIds = taskEmployees.filter(te => te.employee_id === empId).map(te => te.task_id);
    return allTasks.filter(t => taskIds.includes(t.id));
  };

  // Timeline data
  const timelineData = useMemo(() => {
    let emps = selectedEmployeeId === "all" ? employees : employees.filter(e => e.id === selectedEmployeeId);
    return emps.map(emp => {
      let tasks = getEmployeeTasks(emp.id);
      if (taskStatusFilter !== "all") tasks = tasks.filter(t => t.status === taskStatusFilter);
      if (dateFrom) tasks = tasks.filter(t => {
        const d = new Date(t.created_at);
        return d >= startOfDay(dateFrom);
      });
      if (dateTo) tasks = tasks.filter(t => {
        const d = new Date(t.created_at);
        return d <= endOfDay(dateTo);
      });
      return { employee: emp, tasks };
    }).filter(d => d.tasks.length > 0 || selectedEmployeeId !== "all");
  }, [employees, selectedEmployeeId, taskStatusFilter, dateFrom, dateTo, allTasks, taskEmployees]);

  const allTaskStatuses = useMemo(() => Array.from(new Set(allTasks.map(t => t.status))).sort(), [allTasks]);

  // ── Analytics data ──
  const analyticsData = useMemo(() => {
    const activeEmps = employees.filter(e => e.status === "active");

    // Workload per employee
    const workload = activeEmps.map(emp => {
      const tasks = getEmployeeTasks(emp.id);
      const done = tasks.filter(t => t.status === "done").length;
      const inProgress = tasks.filter(t => t.status === "in_progress").length;
      const todo = tasks.filter(t => t.status === "todo").length;
      return {
        name: emp.name.split(" ")[0],
        fullName: emp.name,
        done,
        in_progress: inProgress,
        todo,
        total: tasks.length,
        completionRate: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
      };
    }).filter(w => w.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);

    // Task status distribution
    const statusDist = [
      { name: "To Do", value: allTasks.filter(t => t.status === "todo").length, color: STATUS_COLORS.todo },
      { name: "In Progress", value: allTasks.filter(t => t.status === "in_progress").length, color: STATUS_COLORS.in_progress },
      { name: "Done", value: allTasks.filter(t => t.status === "done").length, color: STATUS_COLORS.done },
    ].filter(s => s.value > 0);

    // Priority distribution
    const priorityDist = [
      { name: "High", value: allTasks.filter(t => t.priority === "high").length, color: PRIORITY_COLORS.high },
      { name: "Medium", value: allTasks.filter(t => t.priority === "medium").length, color: PRIORITY_COLORS.medium },
      { name: "Low", value: allTasks.filter(t => t.priority === "low").length, color: PRIORITY_COLORS.low },
    ].filter(p => p.value > 0);

    // Department workload
    const deptMap = new Map<string, { total: number; done: number }>();
    activeEmps.forEach(emp => {
      const dept = emp.department || "Unassigned";
      const tasks = getEmployeeTasks(emp.id);
      const existing = deptMap.get(dept) || { total: 0, done: 0 };
      deptMap.set(dept, {
        total: existing.total + tasks.length,
        done: existing.done + tasks.filter(t => t.status === "done").length,
      });
    });
    const deptWorkload = Array.from(deptMap.entries()).map(([name, v]) => ({
      name,
      total: v.total,
      done: v.done,
      completionRate: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);

    // Overall metrics
    const totalAssignedTasks = taskEmployees.length;
    const totalDone = allTasks.filter(t => t.status === "done").length;
    const overallRate = allTasks.length > 0 ? Math.round((totalDone / allTasks.length) * 100) : 0;

    return { workload, statusDist, priorityDist, deptWorkload, totalAssignedTasks, overallRate };
  }, [employees, allTasks, taskEmployees]);

  // ── Gantt timeline data ──
  const ganttData = useMemo(() => {
    if (timelineData.length === 0) return null;

    // Collect all tasks with dates
    const allTimelineTasks = timelineData.flatMap(({ employee, tasks }) =>
      tasks.map(task => {
        const created = parseISO(task.created_at);
        const due = task.due_date ? parseISO(task.due_date) : addDays(created, 7);
        return { employee, task, start: created, end: due };
      })
    );

    if (allTimelineTasks.length === 0) return null;

    const globalStart = allTimelineTasks.reduce((min, t) => t.start < min ? t.start : min, allTimelineTasks[0].start);
    const globalEnd = allTimelineTasks.reduce((max, t) => t.end > max ? t.end : max, allTimelineTasks[0].end);
    const totalDays = Math.max(differenceInDays(globalEnd, globalStart), 1);

    return { allTimelineTasks, globalStart, globalEnd, totalDays };
  }, [timelineData]);

  // ── Actions ──
  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({ name: emp.name, email: emp.email || "", phone: emp.phone || "", role: emp.role || "", department: emp.department || "", status: emp.status, notes: emp.notes || "" });
    setFormOpen(true);
  };

  const openAdd = () => {
    setEditingEmployee(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const toggleEmployeeSelection = (empId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.length === filtered.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filtered.map(e => e.id));
    }
  };

  const handleExportTimeline = () => {
    try {
      const rows: Record<string, string>[] = [];
      timelineData.forEach(({ employee, tasks }) => {
        tasks.forEach(task => {
          const proj = projects.find(p => p.id === task.project_id);
          rows.push({
            "Employee": employee.name,
            "Ref": employee.reference_number || "",
            "Department": employee.department || "",
            "Task": task.title,
            "Status": task.status,
            "Priority": task.priority,
            "Project": proj?.name || "",
            "Due Date": task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "—",
            "Created": format(new Date(task.created_at), "MMM d, yyyy"),
          });
        });
      });
      if (!rows.length) { toast.error("No data to export"); return; }
      const ws = utils.json_to_sheet(rows);
      ws["!cols"] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, ...rows.map(r => (r[k] || "").length)) + 2 }));
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Employee Tasks");
      const buf = write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
      saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `employee_tasks_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Timeline exported", { description: `${rows.length} task records exported.` });
    } catch (e) {
      toast.error("Export failed");
    }
  };

  // Stats
  const activeCount = employees.filter(e => e.status === "active").length;
  const totalAssignments = employeeProjects.length;
  const totalTaskAssignments = taskEmployees.length;

  const workloadChartConfig = {
    done: { label: "Done", color: "hsl(var(--success))" },
    in_progress: { label: "In Progress", color: "hsl(var(--info))" },
    todo: { label: "To Do", color: "hsl(var(--muted-foreground))" },
  };

  return (
    <div>
      <PageHeader title="Employees" subtitle="Manage your workforce, project assignments and task timelines" />
      <div className="p-4 md:p-6 space-y-5">

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users2 className="w-5 h-5 text-primary" /></div>
              <div><div className="text-xs text-muted-foreground">Total Employees</div><div className="text-2xl font-bold">{employees.length}</div></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><Users2 className="w-5 h-5 text-success" /></div>
              <div><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-bold">{activeCount}</div></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center"><FolderKanban className="w-5 h-5 text-info" /></div>
              <div><div className="text-xs text-muted-foreground">Project Assignments</div><div className="text-2xl font-bold">{totalAssignments}</div></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><ListChecks className="w-5 h-5 text-primary" /></div>
              <div><div className="text-xs text-muted-foreground">Task Assignments</div><div className="text-2xl font-bold">{totalTaskAssignments}</div></div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="roster" className="gap-2"><Users2 className="w-4 h-4" /> Roster</TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2"><FolderKanban className="w-4 h-4" /> Assignments</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2"><Clock className="w-4 h-4" /> Task Timeline</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="w-4 h-4" /> Analytics</TabsTrigger>
          </TabsList>

          {/* ═══════ ROSTER TAB ═══════ */}
          <TabsContent value="roster" className="space-y-4 mt-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {departments.length > 0 && (
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {selectedEmployeeIds.length > 0 && (
                <Button variant="secondary" className="gap-2" onClick={() => { setBulkAssignType("project"); setBulkAssignOpen(true); }}>
                  <UserPlus className="w-4 h-4" /> Bulk Assign ({selectedEmployeeIds.length})
                </Button>
              )}
              <Button onClick={openAdd} className="gap-2 w-full md:w-auto"><Plus className="w-4 h-4" /> Add Employee</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedEmployeeIds.length === filtered.length && filtered.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="text-xs font-semibold">Ref</TableHead>
                        <TableHead className="text-xs font-semibold">Name</TableHead>
                        <TableHead className="text-xs font-semibold hidden md:table-cell">Role</TableHead>
                        <TableHead className="text-xs font-semibold hidden md:table-cell">Department</TableHead>
                        <TableHead className="text-xs font-semibold hidden lg:table-cell">Email</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold hidden lg:table-cell">Projects</TableHead>
                        <TableHead className="text-xs font-semibold hidden lg:table-cell">Tasks</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No employees found</TableCell></TableRow>
                      ) : filtered.map(emp => (
                        <TableRow key={emp.id} className={cn(selectedEmployeeIds.includes(emp.id) && "bg-accent/30")}>
                          <TableCell>
                            <Checkbox
                              checked={selectedEmployeeIds.includes(emp.id)}
                              onCheckedChange={() => toggleEmployeeSelection(emp.id)}
                            />
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{emp.reference_number}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">{emp.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                              </div>
                              <div>
                                <Link to={`/employees/${emp.id}`} className="font-medium text-sm hover:text-primary transition-colors">{emp.name}</Link>
                                <div className="text-xs text-muted-foreground md:hidden">{emp.role || "—"}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{emp.role || "—"}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{emp.department || "—"}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">{emp.email || "—"}</TableCell>
                          <TableCell><StatusBadge status={emp.status} /></TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">{getEmployeeProjects(emp.id).length}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">{getEmployeeTasks(emp.id).length}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setAssignEmployee(emp); setAssignDialogOpen(true); }}>
                                <Link2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(emp)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ ASSIGNMENTS TAB ═══════ */}
          <TabsContent value="assignments" className="space-y-4 mt-4">
            {employees.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">Add employees first to manage assignments</Card>
            ) : (
              <div className="grid gap-4">
                {employees.map(emp => {
                  const empProjects = getEmployeeProjects(emp.id);
                  return (
                    <Card key={emp.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">{emp.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                            </div>
                            <div>
                              <CardTitle className="text-sm">{emp.name}</CardTitle>
                              <p className="text-xs text-muted-foreground">{emp.role || "No role"} · {emp.department || "No dept"}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setAssignEmployee(emp); setAssignDialogOpen(true); }}>
                            <UserPlus className="w-3.5 h-3.5" /> Assign
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {empProjects.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No project assignments yet</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {empProjects.map(ep => (
                              <div key={ep.id} className="inline-flex items-center gap-2 rounded-lg border bg-accent/30 px-3 py-1.5 text-xs">
                                <FolderKanban className="w-3.5 h-3.5 text-primary" />
                                <span className="font-medium">{(ep.project as any)?.name}</span>
                                {ep.role && <span className="text-muted-foreground">({ep.role})</span>}
                                <button onClick={() => unassignMutation.mutate(ep.id)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══════ TIMELINE TAB ═══════ */}
          <TabsContent value="timeline" className="space-y-4 mt-4">
            {/* Timeline Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" /> Timeline Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Employee</Label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Task Status</Label>
                    <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {allTaskStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                    <Button onClick={handleExportTimeline} className="w-full gap-2">
                      <Download className="w-4 h-4" /> Export Timeline
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Graphical Gantt Timeline */}
            {ganttData && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Visual Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {/* Header date range */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 px-1">
                      <span>{format(ganttData.globalStart, "MMM d, yyyy")}</span>
                      <span>{format(ganttData.globalEnd, "MMM d, yyyy")}</span>
                    </div>

                    <div className="space-y-2 min-w-[600px]">
                      {timelineData.map(({ employee, tasks }, empIdx) => (
                        <div key={employee.id} className="flex items-start gap-3">
                          {/* Employee label */}
                          <div className="w-32 shrink-0 flex items-center gap-2 pt-1">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-primary">
                                {employee.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs font-medium truncate">{employee.name}</span>
                          </div>

                          {/* Gantt bars */}
                          <div className="flex-1 relative" style={{ minHeight: `${Math.max(tasks.length * 28, 28)}px` }}>
                            {/* Background grid */}
                            <div className="absolute inset-0 bg-muted/20 rounded-md border border-border/30" />

                            {tasks.map((task, taskIdx) => {
                              const start = parseISO(task.created_at);
                              const end = task.due_date ? parseISO(task.due_date) : addDays(start, 7);
                              const leftPct = (differenceInDays(start, ganttData.globalStart) / ganttData.totalDays) * 100;
                              const widthPct = Math.max((differenceInDays(end, start) / ganttData.totalDays) * 100, 2);

                              const statusColor = task.status === "done"
                                ? "bg-success/80"
                                : task.status === "in_progress"
                                ? "bg-info/80"
                                : "bg-muted-foreground/40";

                              return (
                                <div
                                  key={task.id}
                                  className={cn(
                                    "absolute h-5 rounded-sm flex items-center px-1.5 text-[10px] font-medium text-primary-foreground truncate cursor-default transition-opacity hover:opacity-90",
                                    statusColor
                                  )}
                                  style={{
                                    left: `${Math.max(leftPct, 0)}%`,
                                    width: `${Math.min(widthPct, 100 - Math.max(leftPct, 0))}%`,
                                    top: `${taskIdx * 28 + 4}px`,
                                  }}
                                  title={`${task.title} (${task.status}) — ${format(start, "MMM d")} → ${format(end, "MMM d")}`}
                                >
                                  {task.title}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="w-3 h-3 rounded-sm bg-muted-foreground/40" />
                        <span className="text-muted-foreground">To Do</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="w-3 h-3 rounded-sm bg-info/80" />
                        <span className="text-muted-foreground">In Progress</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="w-3 h-3 rounded-sm bg-success/80" />
                        <span className="text-muted-foreground">Done</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline Table */}
            {timelineData.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No task assignments match the current filters
              </Card>
            ) : (
              <div className="space-y-4">
                {timelineData.map(({ employee, tasks }) => (
                  <Card key={employee.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{employee.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <CardTitle className="text-sm">{employee.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{employee.role || ""} · {tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/20">
                              <TableHead className="text-xs">Task</TableHead>
                              <TableHead className="text-xs">Project</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Priority</TableHead>
                              <TableHead className="text-xs">Due Date</TableHead>
                              <TableHead className="text-xs">Created</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tasks.length === 0 ? (
                              <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No tasks</TableCell></TableRow>
                            ) : tasks.map(task => {
                              const proj = projects.find(p => p.id === task.project_id);
                              return (
                                <TableRow key={task.id}>
                                  <TableCell className="text-xs font-medium">{task.title}</TableCell>
                                  <TableCell className="text-xs">{proj?.name || "—"}</TableCell>
                                  <TableCell><StatusBadge status={task.status} /></TableCell>
                                  <TableCell>
                                    <span className={cn(
                                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                                      task.priority === "high" && "border-destructive/40 text-destructive",
                                      task.priority === "medium" && "border-warning/40 text-warning",
                                      task.priority === "low" && "border-muted text-muted-foreground"
                                    )}>{task.priority}</span>
                                  </TableCell>
                                  <TableCell className="text-xs">{task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "—"}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{format(new Date(task.created_at), "MMM d, yyyy")}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══════ ANALYTICS TAB ═══════ */}
          <TabsContent value="analytics" className="space-y-4 mt-4">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-success" /></div>
                  <div><div className="text-xs text-muted-foreground">Completion Rate</div><div className="text-2xl font-bold">{analyticsData.overallRate}%</div></div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><ListChecks className="w-5 h-5 text-primary" /></div>
                  <div><div className="text-xs text-muted-foreground">Total Tasks</div><div className="text-2xl font-bold">{allTasks.length}</div></div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-info" /></div>
                  <div><div className="text-xs text-muted-foreground">Avg Tasks/Employee</div><div className="text-2xl font-bold">{activeCount > 0 ? (totalTaskAssignments / activeCount).toFixed(1) : "0"}</div></div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><PieChart className="w-5 h-5 text-warning" /></div>
                  <div><div className="text-xs text-muted-foreground">Departments</div><div className="text-2xl font-bold">{departments.length || 1}</div></div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Workload Distribution */}
              {analyticsData.workload.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Employee Workload Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={workloadChartConfig} className="h-[300px] w-full">
                      <BarChart data={analyticsData.workload} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="done" stackId="a" fill="var(--color-done)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="in_progress" stackId="a" fill="var(--color-in_progress)" />
                        <Bar dataKey="todo" stackId="a" fill="var(--color-todo)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              {/* Task Status Pie */}
              {analyticsData.statusDist.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Task Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                          <Pie
                            data={analyticsData.statusDist}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {analyticsData.statusDist.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Completion Rate per Employee */}
              {analyticsData.workload.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Completion Rate by Employee</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analyticsData.workload.map((emp, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{emp.fullName}</span>
                            <span className="text-muted-foreground">{emp.completionRate}% ({emp.done}/{emp.total})</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-success"
                              initial={{ width: 0 }}
                              animate={{ width: `${emp.completionRate}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Department Workload */}
              {analyticsData.deptWorkload.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Department Workload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.deptWorkload} margin={{ left: 10, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-lg">
                                  <p className="text-xs font-medium mb-1">{label}</p>
                                  {payload.map((p: any) => (
                                    <p key={p.name} className="text-xs text-muted-foreground">{p.name}: {p.value}</p>
                                  ))}
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="total" name="Total Tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="done" name="Completed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {analyticsData.workload.length === 0 && (
              <Card className="p-12 text-center text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Assign tasks to employees to see performance analytics
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Role</Label><Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Department</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate({ ...form, id: editingEmployee?.id })}>
              {saveMutation.isPending ? "Saving..." : editingEmployee ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Project Dialog ── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign {assignEmployee?.name} to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Project</Label>
              <Select value={assignProjectId} onValueChange={setAssignProjectId}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.filter(p => !employeeProjects.some(ep => ep.employee_id === assignEmployee?.id && ep.project_id === p.id)).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Role (optional)</Label><Input value={assignRole} onChange={e => setAssignRole(e.target.value)} placeholder="e.g. Lead Engineer" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button disabled={!assignProjectId || assignMutation.isPending} onClick={() => assignEmployee && assignMutation.mutate({ employee_id: assignEmployee.id, project_id: assignProjectId, role: assignRole })}>
              {assignMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Assign Dialog ── */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Assign {selectedEmployeeIds.length} Employee(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Assign to</Label>
              <Select value={bulkAssignType} onValueChange={(v: "project" | "task") => setBulkAssignType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkAssignType === "project" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Project</Label>
                  <Select value={bulkProjectId} onValueChange={setBulkProjectId}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Role (optional)</Label>
                  <Input value={bulkRole} onChange={e => setBulkRole(e.target.value)} placeholder="e.g. Developer" />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Task</Label>
                <Select value={bulkTaskId} onValueChange={setBulkTaskId}>
                  <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                  <SelectContent>
                    {allTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Selected: {selectedEmployeeIds.map(id => employees.find(e => e.id === id)?.name).filter(Boolean).join(", ")}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignOpen(false)}>Cancel</Button>
            <Button
              disabled={
                (bulkAssignType === "project" ? !bulkProjectId : !bulkTaskId) ||
                bulkAssignProjectMutation.isPending || bulkAssignTaskMutation.isPending
              }
              onClick={() => {
                if (bulkAssignType === "project") {
                  bulkAssignProjectMutation.mutate({ employee_ids: selectedEmployeeIds, project_id: bulkProjectId, role: bulkRole });
                } else {
                  bulkAssignTaskMutation.mutate({ employee_ids: selectedEmployeeIds, task_id: bulkTaskId });
                }
              }}
            >
              {(bulkAssignProjectMutation.isPending || bulkAssignTaskMutation.isPending) ? "Assigning..." : "Assign All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Employee"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will also remove all their project and task assignments.`}
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }}
      />
    </div>
  );
}
