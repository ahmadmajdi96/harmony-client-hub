import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Hash, Building, Mail, Phone, MapPin, Globe, User, FolderKanban, Clock, FileText } from "lucide-react";
import { format } from "date-fns";

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: supplier } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: projectLinks } = useQuery({
    queryKey: ["supplier-projects", id],
    queryFn: async () => {
      const { data } = await supabase.from("project_suppliers").select("*, projects(*, clients(name, reference_number))").eq("supplier_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: ["supplier-activities", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .eq("entity_type", "supplier")
        .eq("entity_id", id!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!id,
  });

  // Also get project-level activities for linked projects
  const { data: projectActivities } = useQuery({
    queryKey: ["supplier-project-activities", id, projectLinks],
    queryFn: async () => {
      if (!projectLinks?.length) return [];
      const projectIds = projectLinks.map(pl => pl.project_id);
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .in("entity_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!id && !!projectLinks?.length,
  });

  const allActivities = [
    ...(activities || []),
    ...(projectActivities || []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const statusVariant = (s: string) => {
    if (s === "completed") return "success" as const;
    if (s === "in_progress") return "info" as const;
    if (s === "on_hold") return "warning" as const;
    return "default" as const;
  };

  const actionColor = (action: string) => {
    if (action === "created") return "text-emerald-500";
    if (action === "updated") return "text-blue-500";
    if (action === "deleted") return "text-red-500";
    return "text-muted-foreground";
  };

  if (!supplier) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div>
      <PageHeader title={supplier.name} subtitle={`${supplier.reference_number || ""} · ${supplier.company || "Independent supplier"}`} />
      <div className="p-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Hash className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">Reference</p></div><p className="font-semibold text-sm font-mono">{supplier.reference_number || "—"}</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Building className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">Status</p></div><StatusBadge status={supplier.status} variant={supplier.status === "active" ? "success" : "default"} /></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><FolderKanban className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">Linked Projects</p></div><p className="font-semibold text-sm">{projectLinks?.length || 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><User className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">Contact Person</p></div><p className="font-semibold text-sm">{supplier.contact_person || "—"}</p></CardContent></Card>
        </div>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-md border">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{supplier.email || "—"}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md border">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{supplier.phone || "—"}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md border">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <div><p className="text-xs text-muted-foreground">Website</p><p className="text-sm font-medium">{supplier.website ? <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{supplier.website}</a> : "—"}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md border">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{supplier.address || "—"}</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {supplier.notes && (
          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Notes</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{supplier.notes}</p></CardContent></Card>
        )}

        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects"><FolderKanban className="h-4 w-4 mr-1" /> Projects ({projectLinks?.length || 0})</TabsTrigger>
            <TabsTrigger value="activity"><Clock className="h-4 w-4 mr-1" /> Activity ({allActivities.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Project</TableHead><TableHead>Client</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Progress</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {projectLinks?.map(pl => {
                      const p = (pl as any).projects;
                      return (
                        <TableRow key={pl.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{p?.reference_number}</TableCell>
                          <TableCell className="font-medium">{p?.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{p?.clients?.name ? `${p.clients.name} (${p.clients.reference_number})` : "—"}</TableCell>
                          <TableCell>{pl.role ? <StatusBadge status={pl.role} variant="info" /> : "—"}</TableCell>
                          <TableCell><StatusBadge status={p?.status} variant={statusVariant(p?.status)} /></TableCell>
                          <TableCell><div className="flex items-center gap-2"><Progress value={p?.progress || 0} className="w-16 h-2" /><span className="text-xs">{p?.progress || 0}%</span></div></TableCell>
                          <TableCell><Button size="sm" variant="outline" className="h-7 text-xs" asChild><Link to={`/projects/${pl.project_id}`}>View Project</Link></Button></TableCell>
                        </TableRow>
                      );
                    })}
                    {(!projectLinks || projectLinks.length === 0) && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Not linked to any projects yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardContent className="p-4">
                {allActivities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No activity recorded yet.</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-4">
                      {allActivities.map((activity) => (
                        <div key={activity.id} className="relative pl-10">
                          <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-background ${
                            activity.action === "created" ? "bg-emerald-500" :
                            activity.action === "updated" ? "bg-blue-500" :
                            activity.action === "deleted" ? "bg-red-500" : "bg-muted-foreground"
                          }`} />
                          <div className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold uppercase ${actionColor(activity.action)}`}>
                                  {activity.action}
                                </span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs font-medium text-muted-foreground capitalize">{activity.entity_type}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(activity.created_at), "MMM d, yyyy · h:mm a")}
                              </span>
                            </div>
                            <p className="text-sm">{activity.description || `${activity.entity_name || "Item"} was ${activity.action}`}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
