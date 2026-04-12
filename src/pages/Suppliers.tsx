import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { KPICard } from "@/components/shared/KPICard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, Pencil, Trash2, Eye, Globe, User } from "lucide-react";
import { Link } from "react-router-dom";

export default function Suppliers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", address: "", status: "active", notes: "", contact_person: "", website: "" });

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, email: form.email || null, phone: form.phone || null, company: form.company || null, address: form.address || null, status: form.status, notes: form.notes || null, contact_person: form.contact_person || null, website: form.website || null };
      if (editingId) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: editingId ? "Supplier updated" : "Supplier added" });
      setDialog(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Supplier deleted", variant: "destructive" });
      setDeleteId(null);
    },
  });

  const openAdd = () => { setEditingId(null); setForm({ name: "", email: "", phone: "", company: "", address: "", status: "active", notes: "", contact_person: "", website: "" }); setDialog(true); };
  const openEdit = (s: any) => { setEditingId(s.id); setForm({ name: s.name, email: s.email || "", phone: s.phone || "", company: s.company || "", address: s.address || "", status: s.status, notes: s.notes || "", contact_person: s.contact_person || "", website: s.website || "" }); setDialog(true); };

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Manage supplier information and relationships" actionLabel="Add Supplier" actionIcon={Plus} onAction={openAdd} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
          <KPICard title="Total Suppliers" value={String(suppliers?.length || 0)} icon={Truck} status="info" />
          <KPICard title="Active" value={String(suppliers?.filter(s => s.status === "active").length || 0)} status="success" />
          <KPICard title="Inactive" value={String(suppliers?.filter(s => s.status === "inactive").length || 0)} status="warning" />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers?.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{s.reference_number}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.company || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.contact_person || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.phone || "—"}</TableCell>
                    <TableCell><StatusBadge status={s.status} variant={s.status === "active" ? "success" : "default"} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" asChild><Link to={`/suppliers/${s.id}`}><Eye className="h-3 w-3 mr-1" /> View</Link></Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && (!suppliers || suppliers.length === 0) && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No suppliers yet. Click "Add Supplier" to get started.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit Supplier" : "Add Supplier"}</DialogTitle><DialogDescription>Supplier details.</DialogDescription></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Supplier name" /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://" /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete Supplier</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
