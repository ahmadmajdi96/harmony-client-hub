import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  Search, Download, CalendarIcon, FolderKanban, Users, Truck,
  ListChecks, Filter, FileSpreadsheet, X, BarChart3, Columns3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { utils, write } from "xlsx";

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
    { key: "description", label: "Description" },
    { key: "start_date", label: "Start Date" },
    { key: "end_date", label: "End Date" },
    { key: "created_at", label: "Created" },
    { key: "updated_at", label: "Updated" },
  ],
  clients: [
    { key: "reference_number", label: "Ref" },
    { key: "name", label: "Name" },
    { key: "company", label: "Company" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status" },
    { key: "address", label: "Address" },
    { key: "notes", label: "Notes" },
    { key: "created_at", label: "Created" },
    { key: "updated_at", label: "Updated" },
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
    { key: "address", label: "Address" },
    { key: "notes", label: "Notes" },
    { key: "created_at", label: "Created" },
    { key: "updated_at", label: "Updated" },
  ],
  tasks: [
    { key: "title", label: "Title" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "assigned_to", label: "Assigned To" },
    { key: "due_date", label: "Due Date" },
    { key: "description", label: "Description" },
    { key: "created_at", label: "Created" },
    { key: "updated_at", label: "Updated" },
  ],
};

export default function DataExport() {
  const [entity, setEntity] = useState<EntityType>("projects");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());

  // Initialize selected columns when entity changes
  useEffect(() => {
    setSelectedColumns(new Set(ENTITY_COLUMNS[entity].map(c => c.key)));
  }, [entity]);

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

  const allColumns = ENTITY_COLUMNS[entity];
  const activeColumns = allColumns.filter(c => selectedColumns.has(c.key));

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAllColumns = () => {
    if (selectedColumns.size === allColumns.length) {
      // Keep at least the first column
      setSelectedColumns(new Set([allColumns[0].key]));
    } else {
      setSelectedColumns(new Set(allColumns.map(c => c.key)));
    }
  };

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
    try {
      const exportData = filteredData.map((item: any) => {
        const row: Record<string, any> = {};
        activeColumns.forEach(col => {
          row[col.label] = formatCellValue(item[col.key], col.key);
        });
        return row;
      });

      if (exportData.length === 0) {
        toast.error("No data to export");
        return;
      }

      const ws = utils.json_to_sheet(exportData);
      const keys = Object.keys(exportData[0] || {});
      ws["!cols"] = keys.map(key => ({
        wch: Math.max(key.length, ...exportData.map(r => String(r[key] || "").length)) + 2,
      }));

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, ENTITY_CONFIG[entity].label);

      const meta = [
        { Field: "Entity", Value: ENTITY_CONFIG[entity].label },
        { Field: "Total Records", Value: String(filteredData.length) },
        { Field: "Columns Exported", Value: activeColumns.map(c => c.label).join(", ") },
        { Field: "Export Date", Value: format(new Date(), "PPP p") },
        { Field: "Search Filter", Value: search || "None" },
        { Field: "Status Filter", Value: statusFilter === "all" ? "All" : statusFilter },
        { Field: "Date From", Value: dateFrom ? format(dateFrom, "PPP") : "Not set" },
        { Field: "Date To", Value: dateTo ? format(dateTo, "PPP") : "Not set" },
      ];
      const metaWs = utils.json_to_sheet(meta);
      metaWs["!cols"] = [{ wch: 18 }, { wch: 60 }];
      utils.book_append_sheet(wb, metaWs, "Export Info");

      const filename = `${entity}_export_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      const wbout = write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, filename);
      toast.success("Excel file generated", {
        description: `${filteredData.length} ${ENTITY_CONFIG[entity].label.toLowerCase()} exported.`,
      });
    } catch (e) {
      console.error("Export failed:", e);
      toast.error("Excel export failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

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

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {allStatuses.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

        {/* Column Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Columns3 className="w-4 h-4 text-primary" />
              Export Columns
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({selectedColumns.size} of {allColumns.length} selected)
              </span>
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={toggleAllColumns}>
                {selectedColumns.size === allColumns.length ? "Deselect All" : "Select All"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allColumns.map(col => (
                <button
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    selectedColumns.has(col.key)
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/20"
                  )}
                >
                  <Checkbox
                    checked={selectedColumns.has(col.key)}
                    className="h-3.5 w-3.5 pointer-events-none"
                    tabIndex={-1}
                  />
                  {col.label}
                </button>
              ))}
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
                    {search && (
                      <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                        Search: &quot;{search}&quot;
                      </span>
                    )}
                    {statusFilter !== "all" && (
                      <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold capitalize">
                        Status: {statusFilter.replace(/_/g, " ")}
                      </span>
                    )}
                    {dateFrom && (
                      <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                        From: {format(dateFrom, "MMM d, yyyy")}
                      </span>
                    )}
                    {dateTo && (
                      <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                        To: {format(dateTo, "MMM d, yyyy")}
                      </span>
                    )}
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
            <div className="text-xs text-muted-foreground">Columns Selected</div>
            <div className="text-2xl font-bold mt-1">{selectedColumns.size}</div>
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
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold ml-2">
                {filteredData.length} rows × {activeColumns.length} cols
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {activeColumns.map(col => (
                      <TableHead key={col.key} className="text-xs font-semibold whitespace-nowrap">{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={activeColumns.length} className="text-center py-12 text-muted-foreground">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No records match the current filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.slice(0, 50).map((item: any, i: number) => (
                      <TableRow key={item.id || i}>
                        {activeColumns.map(col => (
                          <TableCell key={col.key} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                            {col.key === "status" ? (
                              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold capitalize">
                                {String(item[col.key] || "").replace(/_/g, " ")}
                              </span>
                            ) : col.key === "priority" ? (
                              <span className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                                item[col.key] === "high" && "border-destructive/40 text-destructive",
                                item[col.key] === "medium" && "border-accent text-accent-foreground",
                                item[col.key] === "low" && "border-muted text-muted-foreground"
                              )}>
                                {item[col.key]}
                              </span>
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
