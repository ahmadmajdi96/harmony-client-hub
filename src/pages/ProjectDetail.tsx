import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Trash2, Pencil, Download, FileText, ListChecks } from "lucide-react";

const statusVariant = (s: string) => {
  if (s === "done" || s === "completed") return "success" as const;
  if (s === "in_progress") return "info" as const;
  if (s === "on_hold") return "warning" as const;
  return "default" as const;
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [taskDialog, setTaskDialog] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", status: "todo", priority: "medium", assigned_to: "", due_date: "" });
  const [uploading, setUploading] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*, clients(name)").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: tasks } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: async () => {
      const { data } = await supabase.from("project_tasks").select("*").eq("project_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: files } = useQuery({
    queryKey: ["project-files", id],
    queryFn: async () => {
      const { data } = await supabase.from("project_files").select("*").eq("project_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const saveTaskMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...taskForm, project_id: id!, due_date: taskForm.due_date || null, assigned_to: taskForm.assigned_to || null, description: taskForm.description || null };
      if (editingTaskId) {
        const { error } = await supabase.from("project_tasks").update(payload).eq("id", editingTaskId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_tasks").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
      toast({ title: editingTaskId ? "Task updated" : "Task created" });
      setTaskDialog(false);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
      toast({ title: "Task deleted", variant: "destructive" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(uploadFiles)) {
        const filePath = `projects/${id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, file);
        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("project_files").insert({
          project_id: id!,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: "System",
        });
        if (dbError) throw dbError;
      }
      queryClient.invalidateQueries({ queryKey: ["project-files", id] });
      toast({ title: `${uploadFiles.length} file(s) uploaded` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteFileMutation = useMutation({
    mutationFn: async (file: { id: string; file_path: string }) => {
      await supabase.storage.from("project-files").remove([file.file_path]);
      const { error } = await supabase.from("project_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-files", id] });
      toast({ title: "File deleted", variant: "destructive" });
    },
  });

  const downloadFile = (filePath: string, fileName: string) => {
    const { data } = supabase.storage.from("project-files").getPublicUrl(filePath);
    const a = document.createElement("a");
    a.href = data.publicUrl;
    a.download = fileName;
    a.target = "_blank";
    a.click();
  };

  const openAddTask = () => { setEditingTaskId(null); setTaskForm({ title: "", description: "", status: "todo", priority: "medium", assigned_to: "", due_date: "" }); setTaskDialog(true); };
  const openEditTask = (t: any) => { setEditingTaskId(t.id); setTaskForm({ title: t.title, description: t.description || "", status: t.status, priority: t.priority, assigned_to: t.assigned_to || "", due_date: t.due_date || "" }); setTaskDialog(true); };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (!project) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const doneTasks = tasks?.filter(t => t.status === "done").length || 0;

  return (
    <div>
      <PageHeader title={project.name} subtitle={(project as any).clients?.name || "No client assigned"} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={project.status} variant={statusVariant(project.status)} /></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Priority</p><p className="font-semibold capitalize">{project.priority}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Budget</p><p className="font-semibold">{project.budget ? `$${Number(project.budget).toLocaleString()}` : "—"}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Progress</p><Progress value={project.progress} className="mt-2 h-2" /><p className="text-xs mt-1">{project.progress}%</p></CardContent></Card>
        </div>

        {project.description && (
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{project.description}</p></CardContent></Card>
        )}

        <Tabs defaultValue="tasks">
          <TabsList><TabsTrigger value="tasks"><ListChecks className="h-4 w-4 mr-1" /> Tasks ({tasks?.length || 0})</TabsTrigger><TabsTrigger value="files"><FileText className="h-4 w-4 mr-1" /> Files ({files?.length || 0})</TabsTrigger></TabsList>

          <TabsContent value="tasks">
            <div className="flex justify-end mb-4"><Button size="sm" onClick={openAddTask}><Plus className="h-4 w-4 mr-1" /> Add Task</Button></div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Assigned</TableHead><TableHead>Due</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {tasks?.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell><StatusBadge status={t.status} variant={statusVariant(t.status)} /></TableCell>
                        <TableCell><StatusBadge status={t.priority} variant={t.priority === "high" ? "danger" : t.priority === "medium" ? "warning" : "default"} /></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{t.assigned_to || "—"}</TableCell>
                        <TableCell className="text-sm">{t.due_date || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditTask(t)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => deleteTaskMutation.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!tasks || tasks.length === 0) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No tasks yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <div className="flex justify-end mb-4">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading..." : "Upload Files"}
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Size</TableHead><TableHead>Uploaded</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {files?.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.file_name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{f.file_type || "—"}</TableCell>
                        <TableCell className="text-sm">{formatSize(f.file_size)}</TableCell>
                        <TableCell className="text-sm">{new Date(f.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => downloadFile(f.file_path, f.file_name)}><Download className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => deleteFileMutation.mutate({ id: f.id, file_path: f.file_path })}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!files || files.length === 0) && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No files uploaded yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTaskId ? "Edit Task" : "Add Task"}</DialogTitle><DialogDescription>Task details.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={taskForm.status} onValueChange={v => setTaskForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="todo">To Do</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="done">Done</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Assigned To</Label><Input value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTaskDialog(false)}>Cancel</Button><Button onClick={() => saveTaskMutation.mutate()} disabled={!taskForm.title}>{saveTaskMutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
