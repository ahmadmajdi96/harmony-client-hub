import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KPICard } from "@/components/shared/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Download, FileText, FolderKanban, Mail, Phone, MapPin, Building, Hash, DollarSign, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: client } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  // Fetch projects linked via both legacy client_id and project_clients junction
  const { data: projects } = useQuery({
    queryKey: ["client-projects", id],
    queryFn: async () => {
      // Get projects from junction table
      const { data: linked } = await supabase.from("project_clients").select("projects(*)").eq("client_id", id!);
      // Get projects from legacy client_id
      const { data: legacy } = await supabase.from("projects").select("*").eq("client_id", id!);
      const junctionProjects = (linked || []).map((l: any) => l.projects).filter(Boolean);
      const legacyProjects = legacy || [];
      // Merge and deduplicate by id
      const map = new Map<string, any>();
      [...legacyProjects, ...junctionProjects].forEach(p => map.set(p.id, p));
      return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!id,
  });

  const { data: files } = useQuery({
    queryKey: ["client-files", id],
    queryFn: async () => {
      const { data } = await supabase.from("project_files").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: ["client-activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log").select("*").eq("entity_type", "client").eq("entity_id", id!).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: projectActivities } = useQuery({
    queryKey: ["client-project-activities", id, projects],
    queryFn: async () => {
      if (!projects?.length) return [];
      const projectIds = projects.map((p: any) => p.id);
      const { data } = await supabase.from("activity_log").select("*").in("entity_id", projectIds).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!id && !!projects?.length,
  });

  const allActivities = [...(activities || []), ...(projectActivities || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const actionColor = (action: string) => {
    if (action === "created") return "text-emerald-500";
    if (action === "updated") return "text-blue-500";
    if (action === "deleted") return "text-red-500";
    return "text-muted-foreground";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(uploadFiles)) {
        const filePath = `clients/${id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { error: dbError } = await supabase.from("project_files").insert({
          client_id: id!, file_name: file.name, file_path: filePath, file_size: file.size, file_type: file.type, uploaded_by: "System",
        });
        if (dbError) throw dbError;
      }
      queryClient.invalidateQueries({ queryKey: ["client-files", id] });
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
      queryClient.invalidateQueries({ queryKey: ["client-files", id] });
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

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const statusVariant = (s: string) => {
    if (s === "completed") return "success" as const;
    if (s === "in_progress") return "info" as const;
    if (s === "on_hold") return "warning" as const;
    return "default" as const;
  };

  if (!client) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const totalBudget = projects?.reduce((sum, p) => sum + (Number(p.budget) || 0), 0) || 0;
  const activeProjects = projects?.filter(p => p.status === "in_progress").length || 0;
  const avgProgress = projects?.length ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0;

  return (
    <div>
      <PageHeader title={client.name} subtitle={`${client.reference_number || ""} · ${client.company || "Individual client"}`} />
      <div className="p-6 space-y-6">
        {/* Overview Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Hash className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">Reference</p></div><p className="font-semibold text-sm font-mono">{client.reference_number || "—"}</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Building className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">Status</p></div><StatusBadge status={client.status} variant={client.status === "active" ? "success" : "default"} /></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><FolderKanban className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">Projects</p></div><p className="font-semibold text-sm">{projects?.length || 0} ({activeProjects} active)</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><DollarSign className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Budget</p></div><p className="font-semibold text-sm">${totalBudget.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><FileText className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">Files</p></div><p className="font-semibold text-sm">{files?.length || 0}</p></CardContent></Card>
        </div>

        {/* Contact Details */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-md border">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{client.email || "—"}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md border">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{client.phone || "—"}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md border">
                <Building className="h-4 w-4 text-primary shrink-0" />
                <div><p className="text-xs text-muted-foreground">Company</p><p className="text-sm font-medium">{client.company || "—"}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md border">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{client.address || "—"}</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {client.notes && (
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Notes</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{client.notes}</p></CardContent></Card>
        )}

        <Tabs defaultValue="projects">
          <TabsList><TabsTrigger value="projects"><FolderKanban className="h-4 w-4 mr-1" /> Projects ({projects?.length || 0})</TabsTrigger><TabsTrigger value="files"><FileText className="h-4 w-4 mr-1" /> Files ({files?.length || 0})</TabsTrigger></TabsList>

          <TabsContent value="projects">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Budget</TableHead><TableHead>Progress</TableHead><TableHead>Timeline</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {projects?.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.reference_number}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><StatusBadge status={p.status} variant={statusVariant(p.status)} /></TableCell>
                      <TableCell><StatusBadge status={p.priority} variant={p.priority === "high" ? "danger" : p.priority === "medium" ? "warning" : "default"} /></TableCell>
                      <TableCell className="text-sm">{p.budget ? `$${Number(p.budget).toLocaleString()}` : "—"}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Progress value={p.progress} className="w-16 h-2" /><span className="text-xs">{p.progress}%</span></div></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.start_date || "—"} → {p.end_date || "—"}</TableCell>
                      <TableCell><Button size="sm" variant="outline" className="h-7 text-xs" asChild><Link to={`/projects/${p.id}`}>View</Link></Button></TableCell>
                    </TableRow>
                  ))}
                  {(!projects || projects.length === 0) && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No projects for this client.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="files">
            <div className="flex justify-end mb-4">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading..." : "Upload Files"}
              </Button>
            </div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Size</TableHead><TableHead>Uploaded</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {files?.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.file_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{f.file_type || "—"}</TableCell>
                      <TableCell className="text-sm">{formatSize(f.file_size)}</TableCell>
                      <TableCell className="text-sm">{new Date(f.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => downloadFile(f.file_path, f.file_name)}><Download className="h-3 w-3" /></Button><Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => deleteFileMutation.mutate({ id: f.id, file_path: f.file_path })}><Trash2 className="h-3 w-3" /></Button></div></TableCell>
                    </TableRow>
                  ))}
                  {(!files || files.length === 0) && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No files uploaded yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
