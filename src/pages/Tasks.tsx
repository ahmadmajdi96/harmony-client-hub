import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, ListChecks, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

const statusVariant = (s: string) => {
  if (s === "done") return "success" as const;
  if (s === "in_progress") return "info" as const;
  return "default" as const;
};

export default function Tasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", status: "todo", priority: "medium", assigned_to: "", due_date: "", project_id: "" });

  const { data: tasks } = useQuery({
    queryKey: ["tasks-all"],
    queryFn: async () => {
      const { data } = await supabase.from("project_tasks").select("*, projects(name)").order("created_at", { ascending: false });
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

  const openAdd = () => { setEditingId(null); setForm({ title: "", description: "", status: "todo", priority: "medium", assigned_to: "", due_date: "", project_id: projects?.[0]?.id || "" }); setDialog(true); };
  const openEdit = (t: any) => { setEditingId(t.id); setForm({ title: t.title, description: t.description || "", status: t.status, priority: t.priority, assigned_to: t.assigned_to || "", due_date: t.due_date || "", project_id: t.project_id }); setDialog(true); };

  const todoTasks = tasks?.filter(t => t.status === "todo") || [];
  const inProgressTasks = tasks?.filter(t => t.status === "in_progress") || [];
  const doneTasks = tasks?.filter(t => t.status === "done") || [];

  return (
    <div>
      <PageHeader title="Tasks" subtitle="All tasks across projects" actionLabel="New Task" actionIcon={Plus} onAction={openAdd} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4 animate-fade-in">
          <KPICard title="To Do" value={String(todoTasks.length)} icon={ListChecks} status="info" />
          <KPICard title="In Progress" value={String(inProgressTasks.length)} status="warning" />
          <KPICard title="Done" value={String(doneTasks.length)} status="success" />
        </div>

        <Tabs defaultValue="all">
          <TabsList><TabsTrigger value="all">All ({tasks?.length || 0})</TabsTrigger><TabsTrigger value="todo">To Do</TabsTrigger><TabsTrigger value="in_progress">In Progress</TabsTrigger><TabsTrigger value="done">Done</TabsTrigger></TabsList>

          {["all", "todo", "in_progress", "done"].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Assigned</TableHead><TableHead>Due</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(tab === "all" ? tasks : tasks?.filter(t => t.status === tab))?.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.title}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            <Link to={`/projects/${t.project_id}`} className="hover:text-primary">{(t as any).projects?.name || "—"}</Link>
                          </TableCell>
                          <TableCell><StatusBadge status={t.status} variant={statusVariant(t.status)} /></TableCell>
                          <TableCell><StatusBadge status={t.priority} variant={t.priority === "high" ? "danger" : t.priority === "medium" ? "warning" : "default"} /></TableCell>
                          <TableCell className="text-sm">{t.assigned_to || "—"}</TableCell>
                          <TableCell className="text-sm">{t.due_date || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(t)}><Pencil className="h-3 w-3" /></Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

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
    </div>
  );
}
