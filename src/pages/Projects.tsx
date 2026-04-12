import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { KPICard } from "@/components/shared/KPICard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, FolderKanban, Pencil, Trash2, Eye, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const statusVariant = (s: string) => {
  if (s === "completed") return "success" as const;
  if (s === "in_progress") return "info" as const;
  if (s === "on_hold") return "warning" as const;
  if (s === "cancelled") return "danger" as const;
  return "default" as const;
};

const priorityVariant = (p: string) => {
  if (p === "high") return "danger" as const;
  if (p === "medium") return "warning" as const;
  return "default" as const;
};

export default function Projects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", description: "", status: "planning", priority: "medium", budget: "", start_date: "", end_date: "", client_id: "", progress: 0 });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*, clients(name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, description: form.description || null, status: form.status, priority: form.priority,
        budget: form.budget ? Number(form.budget) : null, start_date: form.start_date || null,
        end_date: form.end_date || null, client_id: form.client_id || null, progress: form.progress,
      };
      if (editingId) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: editingId ? "Project updated" : "Project created" });
      setDialog(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project deleted", variant: "destructive" });
      setDeleteId(null);
    },
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", description: "", status: "planning", priority: "medium", budget: "", start_date: "", end_date: "", client_id: "", progress: 0 });
    setDialog(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name, description: p.description || "", status: p.status, priority: p.priority,
      budget: p.budget ? String(p.budget) : "", start_date: p.start_date || "", end_date: p.end_date || "",
      client_id: p.client_id || "", progress: p.progress || 0,
    });
    setDialog(true);
  };

  const activeCount = projects?.filter(p => p.status === "in_progress").length || 0;
  const completedCount = projects?.filter(p => p.status === "completed").length || 0;

  const filteredProjects = projects?.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p as any).clients?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Projects" subtitle="Manage all projects and track progress" actionLabel="New Project" actionIcon={Plus} onAction={openAdd} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <KPICard title="Total Projects" value={String(projects?.length || 0)} icon={FolderKanban} status="info" />
          <KPICard title="Active" value={String(activeCount)} status="success" />
          <KPICard title="Completed" value={String(completedCount)} status="success" />
          <KPICard title="On Hold" value={String(projects?.filter(p => p.status === "on_hold").length || 0)} status="warning" />
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects?.map((p, i) => (
            <Card key={p.id} className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">{p.reference_number}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground truncate">{(p as any).clients?.name || "No client"}</span>
                    </div>
                  </div>
                  <StatusBadge status={p.status} variant={statusVariant(p.status)} />
                </div>
                {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="flex items-center gap-2">
                  <Progress value={p.progress} className="flex-1 h-2" />
                  <span className="text-xs font-medium text-muted-foreground">{p.progress}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <StatusBadge status={p.priority} variant={priorityVariant(p.priority)} />
                  {p.budget && <span className="font-medium">${Number(p.budget).toLocaleString()}</span>}
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8 hover:bg-primary hover:text-primary-foreground transition-colors" asChild>
                    <Link to={`/projects/${p.id}`}><Eye className="h-3 w-3 mr-1" /> View</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-8 hover:bg-accent" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" className="text-xs h-8 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {isLoading && <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>}
          {!isLoading && (!filteredProjects || filteredProjects.length === 0) && <p className="text-muted-foreground text-sm col-span-full text-center py-8">No projects found.</p>}
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit Project" : "New Project"}</DialogTitle><DialogDescription>Fill in project details.</DialogDescription></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div><Label>Project Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div><Label>Client</Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Budget</Label><Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Progress ({form.progress}%)</Label><Input type="range" min="0" max="100" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete Project</DialogTitle><DialogDescription>This will permanently delete the project and all its tasks and files.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
