import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
import { motion } from "framer-motion";

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [form, setForm] = useState({ name: "", description: "", status: "planning", priority: "medium", budget: "", start_date: "", end_date: "", client_id: "", progress: 0 });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<any[]>("/projects"),
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.get<any[]>("/clients"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, description: form.description || null, status: form.status, priority: form.priority,
        budget: form.budget ? Number(form.budget) : null, start_date: form.start_date || null,
        end_date: form.end_date || null, client_id: form.client_id || null, progress: form.progress,
      };
      if (editingId) {
        await api.patch(`/projects/${editingId}`, payload);
      } else {
        await api.post("/projects", payload);
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
      await api.delete(`/projects/${id}`);
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

  const filteredProjects = projects?.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.reference_number?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || p.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div>
      <PageHeader title="Projects" subtitle="Manage all projects and track progress" actionLabel="New Project" actionIcon={Plus} onAction={openAdd} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Total Projects" value={String(projects?.length || 0)} icon={FolderKanban} status="info" />
          <KPICard title="Active" value={String(activeCount)} status="success" />
          <KPICard title="Completed" value={String(completedCount)} status="success" />
          <KPICard title="On Hold" value={String(projects?.filter(p => p.status === "on_hold").length || 0)} status="warning" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl h-10 bg-card border-border/50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 rounded-xl h-10 bg-card border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 rounded-xl h-10 bg-card border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects?.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}>
              <Card className="group rounded-2xl border-border/40 bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors duration-200">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded-md">{p.reference_number}</span>
                      </div>
                    </div>
                    <StatusBadge status={p.status} variant={statusVariant(p.status)} />
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">{p.description}</p>}
                  <div className="flex items-center gap-2.5">
                    <Progress value={p.progress} className="flex-1 h-1.5" />
                    <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">{p.progress}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <StatusBadge status={p.priority} variant={priorityVariant(p.priority)} />
                    {p.budget && <span className="font-semibold text-foreground/70">${Number(p.budget).toLocaleString()}</span>}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-9 rounded-xl border-border/40 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200" asChild>
                      <Link to={`/projects/${p.id}`}><Eye className="h-3.5 w-3.5 mr-1.5" /> View</Link>
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-9 rounded-xl border-border/40 hover:bg-accent" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" className="text-xs h-9 rounded-xl border-border/40 text-destructive/70 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {isLoading && <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>}
          {!isLoading && (!filteredProjects || filteredProjects.length === 0) && <p className="text-muted-foreground text-sm col-span-full text-center py-12">No projects found.</p>}
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Edit Project" : "New Project"}</DialogTitle><DialogDescription>Fill in project details.</DialogDescription></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div><Label>Project Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" className="rounded-xl" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="rounded-xl" /></div>
            <div><Label>Client</Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent className="rounded-xl">{clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
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
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Budget</Label><Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" className="rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="rounded-xl" /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="rounded-xl" /></div>
            </div>
            <div><Label>Progress ({form.progress}%)</Label><Input type="range" min="0" max="100" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} className="accent-primary" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending} className="rounded-xl">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Delete Project</DialogTitle><DialogDescription>This will permanently delete the project and all its tasks and files.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="rounded-xl">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
