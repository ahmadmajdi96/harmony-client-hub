import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { KPICard } from "@/components/shared/KPICard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { triggerBrowserDownload } from "@/lib/download";
import { Upload, Download, Trash2, FileText, HardDrive, Image, FileArchive, Search } from "lucide-react";

export default function FileManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadClientId, setUploadClientId] = useState("");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<{ id: string; file_path: string } | null>(null);

  const { data: files } = useQuery({
    queryKey: ["files-all"],
    queryFn: async () => {
      const { data } = await supabase.from("project_files").select("*, projects(name, reference_number), clients(name, reference_number)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name, reference_number");
      return data || [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, reference_number");
      return data || [];
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    setPendingFiles(Array.from(selected));
    setUploadClientId("");
    setUploadProjectId("");
    setUploadDialog(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadConfirm = async () => {
    if (!pendingFiles.length) return;
    setUploading(true);
    try {
      for (const file of pendingFiles) {
        const normalizedProjectId = uploadProjectId === "none" ? "" : uploadProjectId;
        const normalizedClientId = uploadClientId === "none" ? "" : uploadClientId;
        const folder = normalizedProjectId ? `projects/${normalizedProjectId}` : normalizedClientId ? `clients/${normalizedClientId}` : "general";
        const filePath = `${folder}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { error: dbError } = await supabase.from("project_files").insert({
          file_name: file.name, file_path: filePath, file_size: file.size, file_type: file.type, uploaded_by: "System",
          client_id: normalizedClientId || null, project_id: normalizedProjectId || null,
        });
        if (dbError) throw dbError;
      }
      queryClient.invalidateQueries({ queryKey: ["files-all"] });
      toast({ title: `${pendingFiles.length} file(s) uploaded` });
      setUploadDialog(false);
      setPendingFiles([]);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteFileMutation = useMutation({
    mutationFn: async (file: { id: string; file_path: string }) => {
      await supabase.storage.from("project-files").remove([file.file_path]);
      const { error } = await supabase.from("project_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files-all"] });
      toast({ title: "File deleted", variant: "destructive" });
      setPendingDeleteFile(null);
    },
  });

  const downloadFile = (filePath: string, fileName: string) => {
    const { data } = supabase.storage.from("project-files").getPublicUrl(filePath);
    triggerBrowserDownload(data.publicUrl, fileName);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const totalSize = files?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;
  const imageFiles = files?.filter(f => f.file_type?.startsWith("image/")).length || 0;
  const docFiles = files?.filter(f => f.file_type?.includes("pdf") || f.file_type?.includes("document") || f.file_type?.includes("text")).length || 0;

  const filteredFiles = files?.filter(f => {
    const matchesSearch = !search || f.file_name.toLowerCase().includes(search.toLowerCase()) || (f as any).projects?.name?.toLowerCase().includes(search.toLowerCase()) || (f as any).clients?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || (typeFilter === "images" && f.file_type?.startsWith("image/")) || (typeFilter === "documents" && (f.file_type?.includes("pdf") || f.file_type?.includes("document") || f.file_type?.includes("text")));
    const matchesProject = projectFilter === "all" || f.project_id === projectFilter;
    return matchesSearch && matchesType && matchesProject;
  });

  return (
    <div>
      <PageHeader title="File Manager" subtitle="All uploaded files across projects and clients" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <KPICard title="Total Files" value={String(files?.length || 0)} icon={FileText} status="info" />
          <KPICard title="Total Size" value={formatSize(totalSize)} icon={HardDrive} status="warning" />
          <KPICard title="Images" value={String(imageFiles)} icon={Image} status="success" />
          <KPICard title="Documents" value={String(docFiles)} icon={FileArchive} status="info" />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="images">Images</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            <Button onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Upload Files</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Project</TableHead><TableHead>Client</TableHead><TableHead>Type</TableHead><TableHead>Size</TableHead><TableHead>Uploaded</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredFiles?.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.file_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{(f as any).projects?.name ? `${(f as any).projects.name} (${(f as any).projects.reference_number})` : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{(f as any).clients?.name ? `${(f as any).clients.name} (${(f as any).clients.reference_number})` : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{f.file_type || "—"}</TableCell>
                    <TableCell className="text-sm">{formatSize(f.file_size)}</TableCell>
                    <TableCell className="text-sm">{new Date(f.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => downloadFile(f.file_path, f.file_name)}><Download className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => setPendingDeleteFile({ id: f.id, file_path: f.file_path })}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredFiles || filteredFiles.length === 0) && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No files found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload {pendingFiles.length} File(s)</DialogTitle><DialogDescription>Optionally assign the files to a client and/or project.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border p-3 bg-muted/50">
              <p className="text-sm font-medium mb-1">Selected files:</p>
              {pendingFiles.map((f, i) => (<p key={i} className="text-xs text-muted-foreground">{f.name} ({formatSize(f.size)})</p>))}
            </div>
            <div>
              <Label>Assign to Client (optional)</Label>
              <Select value={uploadClientId} onValueChange={setUploadClientId}>
                <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.reference_number})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign to Project (optional)</Label>
              <Select value={uploadProjectId} onValueChange={setUploadProjectId}>
                <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.reference_number})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)}>Cancel</Button>
            <Button onClick={handleUploadConfirm} disabled={uploading}><Upload className="h-4 w-4 mr-2" /> {uploading ? "Uploading..." : "Upload"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDeleteFile}
        onOpenChange={(open) => !open && setPendingDeleteFile(null)}
        title="Delete file?"
        description="This will permanently remove the file from storage and the file list."
        confirmLabel="Delete file"
        variant="destructive"
        onConfirm={() => pendingDeleteFile && deleteFileMutation.mutate(pendingDeleteFile)}
      />
    </div>
  );
}
