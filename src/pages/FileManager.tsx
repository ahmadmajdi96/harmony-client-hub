import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { KPICard } from "@/components/shared/KPICard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Trash2, FileText, HardDrive, Image, FileArchive } from "lucide-react";

export default function FileManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("all");

  const { data: files } = useQuery({
    queryKey: ["files-all"],
    queryFn: async () => {
      const { data } = await supabase.from("project_files").select("*, projects(name), clients(name)").order("created_at", { ascending: false });
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(uploadFiles)) {
        const filePath = `general/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { error: dbError } = await supabase.from("project_files").insert({
          file_name: file.name, file_path: filePath, file_size: file.size, file_type: file.type, uploaded_by: "System",
        });
        if (dbError) throw dbError;
      }
      queryClient.invalidateQueries({ queryKey: ["files-all"] });
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
      queryClient.invalidateQueries({ queryKey: ["files-all"] });
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

  const totalSize = files?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;
  const imageFiles = files?.filter(f => f.file_type?.startsWith("image/")).length || 0;
  const docFiles = files?.filter(f => f.file_type?.includes("pdf") || f.file_type?.includes("document") || f.file_type?.includes("text")).length || 0;

  const filteredFiles = filter === "all" ? files : files?.filter(f => {
    if (filter === "images") return f.file_type?.startsWith("image/");
    if (filter === "documents") return f.file_type?.includes("pdf") || f.file_type?.includes("document") || f.file_type?.includes("text");
    return true;
  });

  return (
    <div>
      <PageHeader title="File Manager" subtitle="All uploaded files across projects and clients" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Total Files" value={String(files?.length || 0)} icon={FileText} status="info" />
          <KPICard title="Total Size" value={formatSize(totalSize)} icon={HardDrive} status="warning" />
          <KPICard title="Images" value={String(imageFiles)} icon={Image} status="success" />
          <KPICard title="Documents" value={String(docFiles)} icon={FileArchive} status="info" />
        </div>

        <div className="flex items-center justify-between">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="images">Images</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
            </SelectContent>
          </Select>
          <div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" /> {uploading ? "Uploading..." : "Upload Files"}
            </Button>
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
                    <TableCell className="text-muted-foreground text-sm">{(f as any).projects?.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{(f as any).clients?.name || "—"}</TableCell>
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
                {(!filteredFiles || filteredFiles.length === 0) && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No files found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
