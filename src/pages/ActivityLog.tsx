import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderKanban, Users, Truck, ListChecks, FileText, Plus, Pencil, Trash2,
  Search, Filter, Clock, Eye
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

const entityIcons: Record<string, any> = {
  project: FolderKanban,
  client: Users,
  supplier: Truck,
  task: ListChecks,
  file: FileText,
};

const actionIcons: Record<string, any> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
};

const actionColors: Record<string, string> = {
  created: "bg-success/10 text-success border-success/20",
  updated: "bg-info/10 text-info border-info/20",
  deleted: "bg-destructive/10 text-destructive border-destructive/20",
};

const entityColors: Record<string, string> = {
  project: "bg-primary/10 text-primary",
  client: "bg-success/10 text-success",
  supplier: "bg-warning/10 text-warning",
  task: "bg-info/10 text-info",
  file: "bg-muted text-muted-foreground",
};

const entityLinks: Record<string, string> = {
  project: "/projects/",
  client: "/clients/",
  supplier: "/suppliers/",
};

export default function ActivityLog() {
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailLog, setDetailLog] = useState<any>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
    refetchInterval: 10000,
  });

  const filtered = logs?.filter(l => {
    if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (search && !l.description?.toLowerCase().includes(search.toLowerCase()) && !l.entity_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const todayCount = logs?.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length || 0;

  const getChangedFields = (oldVals: any, newVals: any) => {
    if (!oldVals || !newVals) return [];
    const changes: { field: string; from: any; to: any }[] = [];
    const skip = ["updated_at", "created_at"];
    for (const key of Object.keys(newVals)) {
      if (skip.includes(key)) continue;
      if (JSON.stringify(oldVals[key]) !== JSON.stringify(newVals[key])) {
        changes.push({ field: key, from: oldVals[key], to: newVals[key] });
      }
    }
    return changes;
  };

  return (
    <div>
      <PageHeader title="Activity Timeline" subtitle="Track all changes across projects, clients, and suppliers" />
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {["project", "client", "supplier", "task", "file"].map(type => {
            const Icon = entityIcons[type];
            const count = logs?.filter(l => l.entity_type === type).length || 0;
            return (
              <Card key={type} className="group hover:shadow-md transition-all duration-300 cursor-pointer border-transparent hover:border-primary/20"
                onClick={() => setEntityFilter(entityFilter === type ? "all" : type)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${entityColors[type]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground capitalize">{type} events</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search activity..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
              <SelectItem value="client">Clients</SelectItem>
              <SelectItem value="supplier">Suppliers</SelectItem>
              <SelectItem value="task">Tasks</SelectItem>
              <SelectItem value="file">Files</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="h-9 px-3 flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> {todayCount} today
          </Badge>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-[23px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-1">
            {isLoading && (
              <div className="flex items-center gap-4 pl-12 py-8">
                <div className="animate-pulse text-muted-foreground">Loading activity...</div>
              </div>
            )}
            {filtered?.map((log, i) => {
              const EntityIcon = entityIcons[log.entity_type] || FileText;
              const ActionIcon = actionIcons[log.action] || Pencil;
              const linkPath = entityLinks[log.entity_type];
              const changes = log.action === "updated" ? getChangedFields(log.old_values, log.new_values) : [];

              return (
                <div key={log.id} className="relative flex items-start gap-4 group animate-fade-in" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                  {/* Timeline dot */}
                  <div className={`relative z-10 h-[46px] w-[46px] rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${actionColors[log.action] || "bg-muted text-muted-foreground border-border"}`}>
                    <ActionIcon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <Card className="flex-1 border-transparent hover:border-border hover:shadow-sm transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] gap-1 ${entityColors[log.entity_type]}`}>
                              <EntityIcon className="h-2.5 w-2.5" />
                              {log.entity_type}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${actionColors[log.action]}`}>
                              {log.action}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mt-1.5">{log.description}</p>
                          {changes.length > 0 && changes.length <= 3 && (
                            <div className="mt-2 space-y-1">
                              {changes.map(c => (
                                <div key={c.field} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <span className="font-medium text-foreground">{c.field}:</span>
                                  <span className="line-through opacity-60">{String(c.from ?? "—")}</span>
                                  <span>→</span>
                                  <span className="text-foreground">{String(c.to ?? "—")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {changes.length > 3 && (
                            <p className="text-xs text-muted-foreground mt-1">{changes.length} fields changed</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                          <div className="flex gap-1">
                            {linkPath && log.entity_id && log.action !== "deleted" && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                                <Link to={`${linkPath}${log.entity_id}`}><Eye className="h-3 w-3" /></Link>
                              </Button>
                            )}
                            {(log.old_values || log.new_values) && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailLog(log)}>
                                <FileText className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
            {!isLoading && (!filtered || filtered.length === 0) && (
              <div className="pl-14 py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No activity found.</p>
                <p className="text-xs text-muted-foreground mt-1">Activity will appear here as you create, update, or delete records.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Activity Detail</DialogTitle>
            <DialogDescription>
              {detailLog?.description} — {detailLog && format(new Date(detailLog.created_at), "PPpp")}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {detailLog?.action === "updated" && detailLog.old_values && detailLog.new_values && (
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">Changes:</p>
                {getChangedFields(detailLog.old_values, detailLog.new_values).map(c => (
                  <div key={c.field} className="p-3 rounded-lg border bg-muted/30 space-y-1">
                    <p className="text-xs font-semibold capitalize">{c.field.replace(/_/g, " ")}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-destructive/5 border border-destructive/10">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Before</p>
                        <p className="break-all">{String(c.from ?? "—")}</p>
                      </div>
                      <div className="p-2 rounded bg-success/5 border border-success/10">
                        <p className="text-[10px] text-muted-foreground mb-0.5">After</p>
                        <p className="break-all">{String(c.to ?? "—")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {detailLog?.action === "created" && detailLog.new_values && (
              <div>
                <p className="text-sm font-medium mb-2">Created with:</p>
                <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-64">
                  {JSON.stringify(detailLog.new_values, null, 2)}
                </pre>
              </div>
            )}
            {detailLog?.action === "deleted" && detailLog.old_values && (
              <div>
                <p className="text-sm font-medium mb-2">Deleted record:</p>
                <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-64">
                  {JSON.stringify(detailLog.old_values, null, 2)}
                </pre>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
