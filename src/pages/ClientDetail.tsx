import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Download, FileText, FolderKanban, Mail, Phone, MapPin, Building } from "lucide-react";
import { Link } from "react-router-dom";

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

  const { data: projects } = useQuery({
    queryKey: ["client-projects", id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
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

  return (
    <div>
      <PageHeader title={client.name} subtitle={client.company || "Individual client"} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {client.email && (
            <Card><CardContent className="p-4 flex items-center gap-3"><Mail className="h-4 w-4 text-primary shrink-0" /><div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{client.email}</p></div></CardContent></Card>
          )}
          {client.phone && (
            <Card><CardContent className="p-4 flex items-center gap-3"><Phone className="h-4 w-4 text-primary shrink-0" /><div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{client.phone}</p></div></CardContent></Card>
          )}
          {client.address && (
            <Card><CardContent className="p-4 flex items-center gap-3"><MapPin className="h-4 w-4 text-primary shrink-0" /><div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{client.address}</p></div></CardContent></Card>
          )}
          <Card><CardContent className="p-4 flex items-center gap-3"><Building className="h-4 w-4 text-primary shrink-0" /><div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={client.status} variant={client.status === "active" ? "success" : "default"} /></div></CardContent></Card>
        </div>

        {client.notes && (
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{client.notes}</p></CardContent></Card>
        )}

        <Tabs defaultValue="projects">
          <TabsList><TabsTrigger value="projects"><FolderKanban className="h-4 w-4 mr-1" /> Projects ({projects?.length || 0})</TabsTrigger><TabsTrigger value="files"><FileText className="h-4 w-4 mr-1" /> Files ({files?.length || 0})</TabsTrigger></TabsList>

          <TabsContent value="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects?.map(p => (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{p.name}</h3>
                      <StatusBadge status={p.status} variant={statusVariant(p.status)} />
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}
                    <Button size="sm" variant="outline" className="text-xs h-7" asChild><Link to={`/projects/${p.id}`}>View Project</Link></Button>
                  </CardContent>
                </Card>
              ))}
              {(!projects || projects.length === 0) && <p className="text-muted-foreground text-sm col-span-full text-center py-6">No projects for this client.</p>}
            </div>
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
    </div>
  );
}
