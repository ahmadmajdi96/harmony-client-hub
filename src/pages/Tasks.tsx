import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard } from "@/components/shared/KPICard";
import { useToast } from "@/hooks/use-toast";
import { Plus, ListChecks, Pencil, Trash2, LayoutGrid, List, GripVertical, Search, Eye, Clock, Calendar, User, Users2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const statusVariant = (s: string) => {
  if (s === "done") return "success" as const;
  if (s === "in_progress") return "info" as const;
  return "default" as const;
};

const COLUMNS = [
  { id: "todo", label: "To Do", color: "border-muted-foreground/30" },
  { id: "in_progress", label: "In Progress", color: "border-info/50" },
  { id: "done", label: "Done", color: "border-success/50" },
] as const;

export default function Tasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", status: "todo", priority: "medium", assigned_to: "", due_date: "", project_id: "" });
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [assignDialogTask, setAssignDialogTask] = useState<any>(null);
  const [assignEmpId, setAssignEmpId] = useState("");

  const { data: tasks } = useQuery({
    queryKey: ["tasks-all"],
    queryFn: async () => {
      const { data } = await supabase.from("project_tasks").select("*, projects(name, reference_number)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name");
      return data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*").eq("status", "active");
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

  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { title: form.title, description: form.description || null, status: form.status, priority: form.priority, assigned_to: form.assigned_to || null, due_date: form.due_date || null, project_id: form.project_id };
      if (editingId) {
        const { error } = await supabase.from("project_tasks").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_tasks").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-all"] });
      toast({ title: editingId ? "Task updated" : "Task created" });
      setDialog(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("project_tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-all"] });
      toast({ title: "Task moved" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-all"] });
      toast({ title: "Task deleted", variant: "destructive" });
    },
  });

  const assignEmployeeMutation = useMutation({
    mutationFn: async ({ task_id, employee_id }: { task_id: string; employee_id: string }) => {
      const { error } = await supabase.from("task_employees").insert({ task_id, employee_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_employees"] });
      toast({ title: "Employee assigned to task" });
      setAssignDialogTask(null);
      setAssignEmpId("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unassignEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_employees"] });
      toast({ title: "Employee unassigned" });
    },
  });

  const openAdd = () => { setEditingId(null); setForm({ title: "", description: "", status: "todo", priority: "medium", assigned_to: "", due_date: "", project_id: projects?.[0]?.id || "" }); setDialog(true); };
  const openEdit = (t: any) => { setEditingId(t.id); setForm({ title: t.title, description: t.description || "", status: t.status, priority: t.priority, assigned_to: t.assigned_to || "", due_date: t.due_date || "", project_id: t.project_id }); setDialog(true); };

  // Filtering
  const filteredTasks = tasks?.filter(t => {
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.assigned_to?.toLowerCase().includes(search.toLowerCase()) || (t as any).projects?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchesProject = projectFilter === "all" || t.project_id === projectFilter;
    const matchesEmployee = employeeFilter === "all" || taskEmployees?.some((te: any) => te.task_id === t.id && te.employee_id === employeeFilter);
    const matchesClient = clientFilter === "all" || (() => {
      const project = tasks?.find(task => task.id === t.id);
      const proj = projects?.find(p => p.id === t.project_id) as any;
      return proj?.client_id === clientFilter;
    })();
    return matchesSearch && matchesPriority && matchesProject && matchesEmployee && matchesClient;
  }) || [];

  const todoTasks = filteredTasks.filter(t => t.status === "todo");
  const inProgressTasks = filteredTasks.filter(t => t.status === "in_progress");
  const doneTasks = filteredTasks.filter(t => t.status === "done");

  const columnTasks = { todo: todoTasks, in_progress: inProgressTasks, done: doneTasks };

  const handleDragStart = (e: React.DragEvent, taskId: string) => { setDraggedTaskId(taskId); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", taskId); };
  const handleDragOver = (e: React.DragEvent, columnId: string) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverColumn(columnId); };
  const handleDragLeave = () => { setDragOverColumn(null); };
  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault(); setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId && draggedTaskId) {
      const task = tasks?.find(t => t.id === taskId);
      if (task && task.status !== columnId) updateStatusMutation.mutate({ id: taskId, status: columnId });
    }
    setDraggedTaskId(null);
  };
  const handleDragEnd = () => { setDraggedTaskId(null); setDragOverColumn(null); };

  return (
    <div>
      <PageHeader title="Tasks" subtitle="All tasks across projects" actionLabel="New Task" actionIcon={Plus} onAction={openAdd} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <KPICard title="Total" value={String(tasks?.length || 0)} icon={ListChecks} status="info" />
          <KPICard title="To Do" value={String(tasks?.filter(t => t.status === "todo").length || 0)} status="info" />
          <KPICard title="In Progress" value={String(tasks?.filter(t => t.status === "in_progress").length || 0)} status="warning" />
          <KPICard title="Done" value={String(tasks?.filter(t => t.status === "done").length || 0)} status="success" />
        </div>

        {/* Search, Filters & View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={viewMode === "table" ? "default" : "outline"} onClick={() => setViewMode("table")} className="gap-1.5"><List className="h-4 w-4" /> List</Button>
            <Button size="sm" variant={viewMode === "kanban" ? "default" : "outline"} onClick={() => setViewMode("kanban")} className="gap-1.5"><LayoutGrid className="h-4 w-4" /> Kanban</Button>
          </div>
        </div>

        {viewMode === "kanban" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            {COLUMNS.map(col => (
              <div key={col.id} className={`rounded-lg border-2 border-dashed p-3 transition-colors min-h-[400px] ${col.color} ${dragOverColumn === col.id ? "bg-accent/50 border-primary" : "bg-muted/20"}`}
                onDragOver={(e) => handleDragOver(e, col.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, col.id)}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">{columnTasks[col.id]?.length || 0}</span>
                </div>
                <div className="space-y-2">
                  {columnTasks[col.id]?.map((t, i) => (
                    <div key={t.id} draggable onDragStart={(e) => handleDragStart(e, t.id)} onDragEnd={handleDragEnd}
                      className={`bg-card rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all animate-scale-in ${draggedTaskId === t.id ? "opacity-40 scale-95" : "opacity-100"}`}
                      style={{ animationDelay: `${i * 30}ms` }}>
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{(t as any).projects?.name || "—"}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <StatusBadge status={t.priority} variant={t.priority === "high" ? "danger" : t.priority === "medium" ? "warning" : "default"} />
                            {t.assigned_to && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded truncate max-w-[80px]">{t.assigned_to}</span>}
                          </div>
                          {t.due_date && <p className="text-[10px] text-muted-foreground mt-1.5">{t.due_date}</p>}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setAssignDialogTask(t)}><Users2 className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSelectedTask(t)}><Eye className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(t)}><Pencil className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({filteredTasks.length})</TabsTrigger>
              <TabsTrigger value="todo">To Do ({todoTasks.length})</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress ({inProgressTasks.length})</TabsTrigger>
              <TabsTrigger value="done">Done ({doneTasks.length})</TabsTrigger>
            </TabsList>
            {["all", "todo", "in_progress", "done"].map(tab => (
              <TabsContent key={tab} value={tab}>
                <Card><CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Assigned</TableHead><TableHead>Due</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(tab === "all" ? filteredTasks : filteredTasks.filter(t => t.status === tab))?.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.title}</TableCell>
                          <TableCell className="text-muted-foreground text-sm"><Link to={`/projects/${t.project_id}`} className="hover:text-primary">{(t as any).projects?.name || "—"}</Link></TableCell>
                          <TableCell><StatusBadge status={t.status} variant={statusVariant(t.status)} /></TableCell>
                          <TableCell><StatusBadge status={t.priority} variant={t.priority === "high" ? "danger" : t.priority === "medium" ? "warning" : "default"} /></TableCell>
                          <TableCell className="text-sm">{t.assigned_to || "—"}</TableCell>
                          <TableCell className="text-sm">{t.due_date || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAssignDialogTask(t)}><Users2 className="h-3 w-3" /></Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedTask(t)}><Eye className="h-3 w-3" /></Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(t)}><Pencil className="h-3 w-3" /></Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Task Overview Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Task Overview</DialogTitle><DialogDescription>{selectedTask?.title}</DialogDescription></DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><ListChecks className="h-3 w-3" /> Status</p>
                  <StatusBadge status={selectedTask.status} variant={statusVariant(selectedTask.status)} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <StatusBadge status={selectedTask.priority} variant={selectedTask.priority === "high" ? "danger" : selectedTask.priority === "medium" ? "warning" : "default"} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Assigned To</p>
                  <p className="text-sm font-medium">{selectedTask.assigned_to || "Unassigned"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Due Date</p>
                  <p className="text-sm font-medium">{selectedTask.due_date || "No due date"}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Project</p>
                <Link to={`/projects/${selectedTask.project_id}`} className="text-sm font-medium text-primary hover:underline">
                  {(selectedTask as any).projects?.name || "—"} {(selectedTask as any).projects?.reference_number ? `(${(selectedTask as any).projects.reference_number})` : ""}
                </Link>
              </div>
              {selectedTask.description && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-md">{selectedTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Created: {format(new Date(selectedTask.created_at), "MMM d, yyyy")}</div>
                <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Updated: {format(new Date(selectedTask.updated_at), "MMM d, yyyy")}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>Close</Button>
            <Button onClick={() => { openEdit(selectedTask); setSelectedTask(null); }}>Edit Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Task Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Task" : "New Task"}</DialogTitle><DialogDescription>Task details.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Project</Label>
              <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="todo">To Do</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="done">Done</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} disabled={!form.title || !form.project_id}>{saveMutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Employee Dialog */}
      <Dialog open={!!assignDialogTask} onOpenChange={() => setAssignDialogTask(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Employees to "{assignDialogTask?.title}"</DialogTitle><DialogDescription>Manage employee assignments for this task.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            {/* Current assignments */}
            {taskEmployees?.filter((te: any) => te.task_id === assignDialogTask?.id).length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Currently Assigned</Label>
                <div className="flex flex-wrap gap-1.5">
                  {taskEmployees?.filter((te: any) => te.task_id === assignDialogTask?.id).map((te: any) => {
                    const emp = employees?.find((e: any) => e.id === te.employee_id);
                    return emp ? (
                      <span key={te.id} className="inline-flex items-center gap-1 rounded-full border bg-accent/30 px-2.5 py-1 text-xs">
                        {emp.name}
                        <button onClick={() => unassignEmployeeMutation.mutate(te.id)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Add Employee</Label>
              <div className="flex gap-2">
                <Select value={assignEmpId} onValueChange={setAssignEmpId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees?.filter((e: any) => !taskEmployees?.some((te: any) => te.task_id === assignDialogTask?.id && te.employee_id === e.id)).map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={!assignEmpId || assignEmployeeMutation.isPending} onClick={() => assignDialogTask && assignEmployeeMutation.mutate({ task_id: assignDialogTask.id, employee_id: assignEmpId })}>
                  Add
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAssignDialogTask(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
