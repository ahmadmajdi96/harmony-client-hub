import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DOCUMENT_TYPES, COMPANIES, ACTIVITIES,
  shortenName, getRecords, insertRecord,
  getNextSequence, getNextRevision, buildReference,
} from "@/lib/referenceUtils";

interface Props {
  onGenerated: () => void;
}

interface ProjectOption {
  id: string;
  name: string;
  client_name?: string;
}

export default function ReferenceGenerator({ onGenerated }: Props) {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("project");
  const [docType, setDocType] = useState("");
  const [company, setCompany] = useState("");
  const [client, setClient] = useState("");
  const [projectName, setProjectName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(preselectedProjectId);
  const [activity, setActivity] = useState("");
  const [revisionMode, setRevisionMode] = useState<"auto" | "manual">("auto");
  const [manualRevision, setManualRevision] = useState("00");
  const [generatedRef, setGeneratedRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const clientShort = useMemo(() => shortenName(client), [client]);
  const projectShort = useMemo(() => shortenName(projectName), [projectName]);

  const canGenerate = docType && company && client && projectName && activity;

  useEffect(() => {
    const loadProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, client_id")
        .order("name");
      
      if (data) {
        const { data: clients } = await supabase.from("clients").select("id, name");
        const clientMap = new Map((clients || []).map(c => [c.id, c.name]));
        
        setProjects(data.map(p => ({
          id: p.id,
          name: p.name,
          client_name: p.client_id ? clientMap.get(p.client_id) || undefined : undefined,
        })));
      }
    };
    loadProjects();
  }, []);

  const handleProjectSelect = (projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      setSelectedProjectId(proj.id);
      setProjectName(proj.name);
      if (proj.client_name) {
        setClient(proj.client_name);
      }
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    try {
      const records = await getRecords();
      const sequence = getNextSequence(records, year);
      const revision =
        revisionMode === "auto"
          ? getNextRevision(records, docType, company, clientShort, projectShort, activity, year, month, sequence)
          : manualRevision.padStart(2, "0");

      const ref = buildReference(docType, company, clientShort, projectShort, activity, year, month, sequence, revision);
      setGeneratedRef(ref);

      await insertRecord({
        doc_type: docType,
        company,
        client,
        client_short: clientShort,
        project_name: projectName,
        project_short: projectShort,
        project_id: selectedProjectId,
        activity,
        year,
        month,
        sequence,
        revision,
        reference: ref,
      });
      onGenerated();
      toast({ title: "Reference Generated", description: ref });
    } catch (err) {
      toast({ title: "Error", description: "Failed to generate reference", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedRef);
    toast({ title: "Copied!", description: "Reference copied to clipboard." });
  };

  return (
    <Card className="shadow-lg border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-foreground">Generate Reference Number</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Document Type (A)</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((d) => (
                  <SelectItem key={d.code} value={d.code}>{d.label} ({d.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Company (B)</Label>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {COMPANIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Project (from system)</Label>
            <Select value={selectedProjectId || ""} onValueChange={handleProjectSelect}>
              <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.client_name ? ` — ${p.client_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Client Name</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Saudi Aramco" />
            {client && (
              <span className="text-xs text-muted-foreground">Shortened: <strong>{clientShort}</strong></span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Project Name</Label>
            <Input value={projectName} onChange={(e) => { setProjectName(e.target.value); setSelectedProjectId(null); }} placeholder="e.g. Tower Phase 2" />
            {projectName && (
              <span className="text-xs text-muted-foreground">Shortened: <strong>{projectShort}</strong></span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Activity</Label>
            <Select value={activity} onValueChange={setActivity}>
              <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
              <SelectContent>
                {ACTIVITIES.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Revision</Label>
            <Select value={revisionMode} onValueChange={(v) => setRevisionMode(v as "auto" | "manual")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            {revisionMode === "manual" && (
              <Input
                value={manualRevision}
                onChange={(e) => setManualRevision(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="00"
                className="mt-1"
              />
            )}
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span>Period: <strong>{year}/{month}</strong></span>
          <span>Format: <strong>AB-Client-Project-Activity-YYMMNNN-xx</strong></span>
        </div>

        <Button onClick={handleGenerate} disabled={!canGenerate || loading} className="w-full font-semibold text-base h-11">
          {loading ? "Generating..." : "Generate Reference"}
        </Button>

        {generatedRef && (
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <code className="text-base sm:text-lg font-bold text-foreground tracking-wide break-all">{generatedRef}</code>
            <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">Copy</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
