import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Pencil, Trash2, FolderKanban, ListChecks, Activity, UserPlus,
  Mail, Phone, Building2, Briefcase, X, Hash, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

const statusVariant = (s: string) => {
  if (s === "done" || s === "completed" || s === "active") return "success" as const;
  if (s === "in_progress") return "info" as const;
  if (s === "on_hold") return "warning" as const;
  return "default" as const;
};

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignProjectId, setAssignProjectId] = useState("");
  const [assignRole, setAssignRole] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "", department: "", status: "active", notes: "" });

  const { data: employee } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: empProjects = [] } = useQuery({
    queryKey: ["employee_projects", id],
    queryFn: async () => {
      const { data } = await supabase.from("employee_projects").select("*, projects(*)").eq("employee_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: taskEmployees = [] } = useQuery({
    queryKey: ["task_employees_for", id],
    queryFn: async () => {
      const { data } = await supabase.from("task_employees").select("*, project_tasks(*, projects(name))").eq("employee_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*");
      return data || [];
    },
  });

  const { data: activityLog = [] } = useQuery({
    queryKey: ["employee-activity", id],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log").select("*").eq("entity_type", "employee").eq("entity_id", id!).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["employee", id] });
    qc.invalidateQueries({ queryKey: ["employee_projects", id] });
    qc.invalidateQueries({ queryKey: ["task_employees_for", id] });
    qc.invalidateQueries({ queryKey: ["employee-activity", id] });
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const { error } = await supabase.from("employees").update({
        name: data.name, email: data.email || null, phone: data.phone || null,
        role: data.role || null, department: data.department || null, status: data.status, notes: data.notes || null,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setEditOpen(false); toast.success("Employee updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ project_id, role }: { project_id: string; role: string }) => {
      const { error } = await supabase.from("employee_projects").insert({ employee_id: id!, project_id, role: role || null });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setAssignOpen(false); setAssignProjectId(""); setAssignRole(""); toast.success("Assigned to project"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const unassignMutation = useMutation({
    mutationFn: async (epId: string) => {
      const { error } = await supabase.from("employee_projects").delete().eq("id", epId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Unassigned from project"); },
  });

  const openEdit = () => {
    if (!employee) return;
    setForm({ name: employee.name, email: employee.email || "", phone: employee.phone || "", role: employee.role || "", department: employee.department || "", status: employee.status, notes: employee.notes || "" });
    setEditOpen(true);
  };

  if (!employee) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const tasks = taskEmployees.map((te: any) => te.project_tasks).filter(Boolean);

  return (
    <div>
      <PageHeader title={employee.name} subtitle={`${employee.reference_number || ""} · ${employee.role || "No role"} · ${employee.department || "No department"}`} />
      <div className="p-4 md:p-6 space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-6">
          <Card className="flex-1">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-primary">{employee.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold">{employee.name}</h2>
                    <StatusBadge status={employee.status} variant={statusVariant(employee.status)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {employee.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" />{employee.email}</div>}
                    {employee.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{employee.phone}</div>}
                    {employee.role && <div className="flex items-center gap-2 text-muted-foreground"><Briefcase className="w-3.5 h-3.5" />{employee.role}</div>}
                    {employee.department && <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="w-3.5 h-3.5" />{employee.department}</div>}
                    <div className="flex items-center gap-2 text-muted-foreground"><Hash className="w-3.5 h-3.5" />{employee.reference_number}</div>
                    <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-3.5 h-3.5" />Joined {format(new Date(employee.created_at), "MMM d, yyyy")}</div>
                  </div>
                  {employee.notes && <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg mt-2">{employee.notes}</p>}
                </div>
                <Button variant="outline" size="sm" onClick={openEdit} className="shrink-0 gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit</Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 md:w-72">
            <Card className="p-3 text-center"><div className="text-2xl font-bold text-primary">{empProjects.length}</div><div className="text-[10px] text-muted-foreground">Projects</div></Card>
            <Card className="p-3 text-center"><div className="text-2xl font-bold">{tasks.length}</div><div className="text-[10px] text-muted-foreground">Tasks</div></Card>
            <Card className="p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{tasks.filter((t: any) => t.status === "done").length}</div><div className="text-[10px] text-muted-foreground">Completed</div></Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects" className="gap-1.5"><FolderKanban className="w-4 h-4" /> Projects ({empProjects.length})</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5"><ListChecks className="w-4 h-4" /> Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5"><Activity className="w-4 h-4" /> Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAssignOpen(true)}><UserPlus className="w-3.5 h-3.5" /> Assign to Project</Button>
            </div>
            {empProjects.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground text-sm">No project assignments</Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {empProjects.map((ep: any) => {
                  const p = ep.projects;
                  if (!p) return null;
                  return (
                    <Card key={ep.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link to={`/projects/${p.id}`} className="font-medium text-sm hover:text-primary transition-colors">{p.name}</Link>
                            <div className="flex items-center gap-2 mt-1">
                              <StatusBadge status={p.status} variant={statusVariant(p.status)} />
                              {ep.role && <span className="text-xs text-muted-foreground">({ep.role})</span>}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => unassignMutation.mutate(ep.id)}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold">Task</TableHead>
                      <TableHead className="text-xs font-semibold">Project</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Priority</TableHead>
                      <TableHead className="text-xs font-semibold">Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No tasks assigned</TableCell></TableRow>
                    ) : tasks.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-sm">{t.title}</TableCell>
                        <TableCell className="text-xs"><Link to={`/projects/${t.project_id}`} className="hover:text-primary">{t.projects?.name || "—"}</Link></TableCell>
                        <TableCell><StatusBadge status={t.status} variant={statusVariant(t.status)} /></TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                            t.priority === "high" && "border-destructive/40 text-destructive",
                            t.priority === "medium" && "border-yellow-500/40 text-yellow-600",
                            t.priority === "low" && "border-muted text-muted-foreground"
                          )}>{t.priority}</span>
                        </TableCell>
                        <TableCell className="text-xs">{t.due_date ? format(new Date(t.due_date), "MMM d, yyyy") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {activityLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No activity recorded</p>
                ) : (
                  <div className="space-y-3">
                    {activityLog.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3">
                        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold",
                          log.action === "created" && "bg-emerald-50 text-emerald-600",
                          log.action === "updated" && "bg-violet-50 text-violet-600",
                          log.action === "deleted" && "bg-rose-50 text-rose-600"
                        )}>{log.action[0].toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">{log.description}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
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
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim()} onClick={() => updateMutation.mutate(form)}>{updateMutation.isPending ? "Saving..." : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Project Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign to Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Project</Label>
              <Select value={assignProjectId} onValueChange={setAssignProjectId}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {allProjects.filter((p: any) => !empProjects.some((ep: any) => ep.project_id === p.id)).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Role (optional)</Label><Input value={assignRole} onChange={e => setAssignRole(e.target.value)} placeholder="e.g. Lead Engineer" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button disabled={!assignProjectId} onClick={() => assignMutation.mutate({ project_id: assignProjectId, role: assignRole })}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}