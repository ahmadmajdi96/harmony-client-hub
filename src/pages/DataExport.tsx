import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import {
  Search, Download, CalendarIcon, FolderKanban, Users, Truck,
  ListChecks, Filter, FileSpreadsheet, X, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";

type EntityType = "projects" | "clients" | "suppliers" | "tasks";

const ENTITY_CONFIG: Record<EntityType, { label: string; icon: React.ElementType; dateField: string }> = {
  projects: { label: "Projects", icon: FolderKanban, dateField: "created_at" },
  clients: { label: "Clients", icon: Users, dateField: "created_at" },
  suppliers: { label: "Suppliers", icon: Truck, dateField: "created_at" },
  tasks: { label: "Tasks", icon: ListChecks, dateField: "created_at" },
};

const ENTITY_COLUMNS: Record<EntityType, { key: string; label: string }[]> = {
  projects: [
    { key: "reference_number", label: "Ref" },
    { key: "name", label: "Name" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "progress", label: "Progress" },
    { key: "budget", label: "Budget" },
    { key: "start_date", label: "Start Date" },
    { key: "end_date", label: "End Date" },
    { key: "created_at", label: "Created" },
  ],
  clients: [
    { key: "reference_number", label: "Ref" },
    { key: "name", label: "Name" },
    { key: "company", label: "Company" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status" },
    { key: "address", label: "Address" },
    { key: "created_at", label: "Created" },
  ],
  suppliers: [
    { key: "reference_number", label: "Ref" },
    { key: "name", label: "Name" },
    { key: "company", label: "Company" },
    { key: "contact_person", label: "Contact" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status" },
    { key: "website", label: "Website" },
    { key: "created_at", label: "Created" },
  ],
  tasks: [
    { key: "title", label: "Title" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "assigned_to", label: "Assigned To" },
    { key: "due_date", label: "Due Date" },
    { key: "description", label: "Description" },
    { key: "created_at", label: "Created" },
  ],
};

export default function DataExport() {
  const [entity, setEntity] = useState<EntityType>("projects");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => { const { data } = await supabase.from("projects").select("*"); return data || []; },
  });
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => { const { data } = await supabase.from("clients").select("*"); return data || []; },
  });
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => { const { data } = await supabase.from("suppliers").select("*"); return data || []; },
  });
  const { data: tasks } = useQuery({
    queryKey: ["tasks-all"],
    queryFn: async () => { const { data } = await supabase.from("project_tasks").select("*"); return data || []; },
  });

  const rawData: Record<EntityType, any[]> = {
    projects: projects || [],
    clients: clients || [],
    suppliers: suppliers || [],
    tasks: tasks || [],
  };

  const allStatuses = useMemo(() => {
    const items = rawData[entity];
    const statuses = new Set<string>();
    items.forEach((item: any) => { if (item.status) statuses.add(item.status); });
    return Array.from(statuses).sort();
  }, [entity, rawData[entity]]);

  const filteredData = useMemo(() => {
    let items = rawData[entity];
    const dateField = ENTITY_CONFIG[entity].dateField;

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((item: any) =>
        Object.values(item).some(v => v && String(v).toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      items = items.filter((item: any) => item.status === statusFilter);
    }

    if (dateFrom || dateTo) {
      items = items.filter((item: any) => {
        const d = new Date(item[dateField]);
        if (dateFrom && d < startOfDay(dateFrom)) return false;
        if (dateTo && d > endOfDay(dateTo)) return false;
        return true;
      });
    }

    return items;
  }, [entity, search, statusFilter, dateFrom, dateTo, rawData[entity]]);

  const columns = ENTITY_COLUMNS[entity];

  const formatCellValue = (val: any, key: string) => {
    if (val == null) return "—";
    if (key.includes("date") || key === "created_at" || key === "updated_at") {
      try { return format(new Date(val), "MMM d, yyyy"); } catch { return String(val); }
    }
    if (key === "budget") return `$${Number(val).toLocaleString()}`;
    if (key === "progress") return `${val}%`;
    return String(val);
  };

  const handleClearFilters = () => {
    setSearch("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setStatusFilter("all");
  };

  const hasActiveFilters = search || dateFrom || dateTo || statusFilter !== "all";

  const handleDownload = () => {
    const exportData = filteredData.map((item: any) => {
      const row: Record<string, any> = {};
      columns.forEach(col => {
        row[col.label] = formatCellValue(item[col.key], col.key);
      });
      if (item.notes) row["Notes"] = item.notes;
      if (item.description && !columns.find(c => c.key === "description")) row["Description"] = item.description;
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...exportData.map(r => String(r[key] || "").length)).valueOf() + 2,
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, ENTITY_CONFIG[entity].label);

    // Add metadata sheet
    const meta = [
      { Field: "Entity", Value: ENTITY_CONFIG[entity].label },
      { Field: "Total Records", Value: String(filteredData.length) },
      { Field: "Export Date", Value: format(new Date(), "PPP p") },
      { Field: "Search Filter", Value: search || "None" },
      { Field: "Status Filter", Value: statusFilter === "all" ? "All" : statusFilter },
      { Field: "Date From", Value: dateFrom ? format(dateFrom, "PPP") : "Not set" },
      { Field: "Date To", Value: dateTo ? format(dateTo, "PPP") : "Not set" },
    ];
    const metaWs = XLSX.utils.json_to_sheet(meta);
    metaWs["!cols"] = [{ wch: 16 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, metaWs, "Export Info");

    XLSX.writeFile(wb, `${entity}_export_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const Icon = ENTITY_CONFIG[entity].icon;

  return (
    <div>
      <PageHeader title="Data Export" subtitle="Search, filter and download detailed reports" />
      <div className="p-4 md:p-6 space-y-5">
        {/* Entity Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(ENTITY_CONFIG) as EntityType[]).map(key => {
            const cfg = ENTITY_CONFIG[key];
            const Ic = cfg.icon;
            const isActive = entity === key;
            return (
              <motion.button
                key={key}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setEntity(key); setStatusFilter("all"); setSearch(""); }}
                className={cn(
                  "relative flex items-center gap-3 p-4 rounded-xl border transition-all",
                  isActive
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/20 hover:bg-accent/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Ic className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className={cn("font-medium text-sm", isActive && "text-primary")}>{cfg.label}</div>
                  <div className="text-xs text-muted-foreground">{rawData[key].length} records</div>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeEntity"
                    className="absolute inset-0 border-2 border-primary/30 rounded-xl pointer-events-none"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Filters
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={handleClearFilters}>
                  <X className="w-3 h-3 mr-1" /> Clear all
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${ENTITY_CONFIG[entity].label.toLowerCase()}...`}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {allStatuses.map(s => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Overview */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="border-primary/20 bg-primary/[0.02]">
                <CardContent className="py-3 px-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Active Filters:</span>
                    {search && <Badge variant="secondary" className="text-xs">{`Search: "${search}"`}</Badge>}
                    {statusFilter !== "all" && <Badge variant="secondary" className="text-xs">Status: {statusFilter.replace(/_/g, " ")}</Badge>}
                    {dateFrom && <Badge variant="secondary" className="text-xs">From: {format(dateFrom, "MMM d, yyyy")}</Badge>}
                    {dateTo && <Badge variant="secondary" className="text-xs">To: {format(dateTo, "MMM d, yyyy")}</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{filteredData.length}</span> of {rawData[entity].length} records
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total Records</div>
            <div className="text-2xl font-bold mt-1">{rawData[entity].length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Filtered Results</div>
            <div className="text-2xl font-bold mt-1 text-primary">{filteredData.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Active Filters</div>
            <div className="text-2xl font-bold mt-1">
              {[search, statusFilter !== "all", dateFrom, dateTo].filter(Boolean).length}
            </div>
          </Card>
          <Card className="p-4 flex items-center justify-center">
            <Button onClick={handleDownload} disabled={filteredData.length === 0} className="w-full gap-2">
              <Download className="w-4 h-4" />
              Download Excel
            </Button>
          </Card>
        </div>

        {/* Data Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Data Preview
              <Badge variant="outline" className="ml-2 text-xs">{filteredData.length} rows</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {columns.map(col => (
                      <TableHead key={col.key} className="text-xs font-semibold whitespace-nowrap">{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No records match the current filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.slice(0, 50).map((item: any, i: number) => (
                      <TableRow key={item.id || i}>
                        {columns.map(col => (
                          <TableCell key={col.key} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                            {col.key === "status" ? (
                              <Badge variant="outline" className="text-[10px] capitalize">{String(item[col.key] || "").replace(/_/g, " ")}</Badge>
                            ) : col.key === "priority" ? (
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] capitalize",
                                  item[col.key] === "high" && "border-destructive/40 text-destructive",
                                  item[col.key] === "medium" && "border-amber-400/40 text-amber-600",
                                  item[col.key] === "low" && "border-muted-foreground/40"
                                )}
                              >
                                {item[col.key]}
                              </Badge>
                            ) : (
                              formatCellValue(item[col.key], col.key)
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredData.length > 50 && (
              <div className="text-xs text-center py-2 text-muted-foreground border-t">
                Showing first 50 of {filteredData.length} records. All records will be included in the download.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
