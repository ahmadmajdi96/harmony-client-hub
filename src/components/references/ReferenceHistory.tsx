import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getRecords, updateRecord, deleteRecord, buildReference, shortenName,
  DOCUMENT_TYPES, COMPANIES, ACTIVITIES,
  type ReferenceRecord,
} from "@/lib/referenceUtils";
import * as XLSX from "xlsx";

interface Props {
  refreshKey: number;
}

export default function ReferenceHistory({ refreshKey }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [records, setRecords] = useState<ReferenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState<ReferenceRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editDocType, setEditDocType] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editActivity, setEditActivity] = useState("");
  const [editRevision, setEditRevision] = useState("");

  const loadRecords = useCallback(async () => {
    try {
      const data = await getRecords();
      setRecords(data.reverse());
    } catch {
      toast({ title: "Error", description: "Failed to load references", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRecords();
  }, [refreshKey, loadRecords]);

  const openEdit = (r: ReferenceRecord) => {
    setEditRecord(r);
    setEditDocType(r.doc_type);
    setEditCompany(r.company);
    setEditClient(r.client);
    setEditProject(r.project_name);
    setEditActivity(r.activity);
    setEditRevision(r.revision);
  };

  const handleUpdate = async () => {
    if (!editRecord) return;
    setSaving(true);
    try {
      const clientShort = shortenName(editClient);
      const projectShort = shortenName(editProject);
      const reference = buildReference(editDocType, editCompany, clientShort, projectShort, editActivity, editRecord.year, editRecord.month, editRecord.sequence, editRevision.padStart(2, "0"));
      await updateRecord(editRecord.id, {
        doc_type: editDocType,
        company: editCompany,
        client: editClient,
        client_short: clientShort,
        project_name: editProject,
        project_short: projectShort,
        activity: editActivity,
        revision: editRevision.padStart(2, "0"),
        reference,
      });
      toast({ title: "Updated", description: "Reference updated successfully" });
      setEditRecord(null);
      loadRecords();
    } catch {
      toast({ title: "Error", description: "Failed to update reference", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRecord(deleteId);
      toast({ title: "Deleted", description: "Reference deleted successfully" });
      setDeleteId(null);
      loadRecords();
    } catch {
      toast({ title: "Error", description: "Failed to delete reference", variant: "destructive" });
    }
  };

  const exportToExcel = () => {
    const data = records.map((r) => ({
      Reference: r.reference,
      Type: r.doc_type === "Q" ? "Quotation" : "Letter",
      Company: r.company,
      Client: r.client,
      "Client Code": r.client_short,
      Project: r.project_name,
      "Project Code": r.project_short,
      Activity: r.activity,
      Year: r.year,
      Month: r.month,
      Sequence: r.sequence,
      Revision: r.revision,
      "Created At": new Date(r.created_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 35 }, { wch: 10 }, { wch: 8 }, { wch: 18 }, { wch: 10 },
      { wch: 18 }, { wch: 10 }, { wch: 8 }, { wch: 5 }, { wch: 5 },
      { wch: 8 }, { wch: 8 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "References");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "references_database.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card className="shadow-lg border-border/60">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4">
          <CardTitle className="text-xl font-bold text-foreground">Issued References</CardTitle>
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={records.length === 0}>
            Export to Excel
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No references issued yet.</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono font-semibold text-primary">{r.reference}</TableCell>
                        <TableCell>{r.doc_type === "Q" ? "Quotation" : "Letter"}</TableCell>
                        <TableCell>{r.client}</TableCell>
                        <TableCell>
                          {r.project_id ? (
                            <button
                              onClick={() => navigate(`/projects/${r.project_id}`)}
                              className="text-primary hover:underline"
                            >
                              {r.project_name}
                            </button>
                          ) : r.project_name}
                        </TableCell>
                        <TableCell>{r.activity}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(r.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {records.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <code className="font-mono font-semibold text-primary text-sm break-all">{r.reference}</code>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>Type: {r.doc_type === "Q" ? "Quotation" : "Letter"}</span>
                      <span>Activity: {r.activity}</span>
                      <span>Client: {r.client}</span>
                      <span>Project: {r.project_name}</span>
                      <span className="col-span-2">Date: {new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Reference</DialogTitle>
            <DialogDescription>Modify the reference details below.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Document Type</Label>
              <Select value={editDocType} onValueChange={setEditDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((d) => (
                    <SelectItem key={d.code} value={d.code}>{d.label} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Select value={editCompany} onValueChange={setEditCompany}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.label} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Input value={editClient} onChange={(e) => setEditClient(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Input value={editProject} onChange={(e) => setEditProject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Activity</Label>
              <Select value={editActivity} onValueChange={setEditActivity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITIES.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Revision</Label>
              <Input value={editRevision} onChange={(e) => setEditRevision(e.target.value.replace(/\D/g, "").slice(0, 2))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reference</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Are you sure you want to delete this reference?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
