import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  /** Pre-fill project (for inline usage in ProjectDetail) */
  prefilledProjectId?: string;
  prefilledProjectName?: string;
  prefilledClientName?: string;
  /** If true, hides the card wrapper (used inside dialogs) */
  compact?: boolean;
}

interface ProjectOption {
  id: string;
  name: string;
  client_name?: string;
}

interface ClientOption {
  id: string;
  name: string;
}

export default function ReferenceGenerator({ onGenerated, prefilledProjectId, prefilledProjectName, prefilledClientName, compact }: Props) {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const urlProjectId = searchParams.get("project");
  const initialProjectId = prefilledProjectId || urlProjectId;

  const [docType, setDocType] = useState("");
  const [company, setCompany] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientName, setClientName] = useState(prefilledClientName || "");
  const [projectName, setProjectName] = useState(prefilledProjectName || "");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [activity, setActivity] = useState("");
  const [revisionMode, setRevisionMode] = useState<"auto" | "manual">("auto");
  const [manualRevision, setManualRevision] = useState("00");
  const [generatedRef, setGeneratedRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const clientShort = useMemo(() => shortenName(clientName), [clientName]);
  const projectShort = useMemo(() => shortenName(projectName), [projectName]);

  const canGenerate = docType && company && clientName && projectName && activity;

  useEffect(() => {
    const load = async () => {
      const [{ data: projData }, { data: clientData }] = await Promise.all([
        supabase.from("projects").select("id, name, client_id").order("name"),
        supabase.from("clients").select("id, name").order("name"),
      ]);

      const clientList = clientData || [];
      setClients(clientList);
      const clientMap = new Map(clientList.map(c => [c.id, c.name]));

      if (projData) {
        const mapped = projData.map(p => ({
          id: p.id,
          name: p.name,
          client_name: p.client_id ? clientMap.get(p.client_id) || undefined : undefined,
        }));
        setProjects(mapped);

        if (initialProjectId) {
          const proj = mapped.find(p => p.id === initialProjectId);
          if (proj) {
            setSelectedProjectId(proj.id);
            setProjectName(proj.name);
            if (proj.client_name) {
              setClientName(proj.client_name);
              const cl = clientList.find(c => c.name === proj.client_name);
              if (cl) setSelectedClientId(cl.id);
            }
          }
        }
      }

      // If prefilled client name, find it in client list
      if (prefilledClientName && !initialProjectId) {
        const cl = clientList.find(c => c.name === prefilledClientName);
        if (cl) setSelectedClientId(cl.id);
      }
    };
    load();
  }, [initialProjectId, prefilledClientName]);

  const handleProjectSelect = (projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      setSelectedProjectId(proj.id);
      setProjectName(proj.name);
      if (proj.client_name) {
        setClientName(proj.client_name);
        const cl = clients.find(c => c.name === proj.client_name);
        if (cl) setSelectedClientId(cl.id);
      }
    }
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const cl = clients.find(c => c.id === clientId);
    if (cl) setClientName(cl.name);
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
        client: clientName,
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

  const content = (
    <div className="space-y-5">
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

        {!prefilledProjectId && (
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
        )}

        <div className="space-y-1.5">
          <Label>Client</Label>
          <Select value={selectedClientId} onValueChange={handleClientSelect}>
            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {clientName && (
            <span className="text-xs text-muted-foreground">Shortened: <strong>{clientShort}</strong></span>
          )}
        </div>

        {!prefilledProjectId && (
          <div className="space-y-1.5">
            <Label>Project Name</Label>
            <Input value={projectName} onChange={(e) => { setProjectName(e.target.value); setSelectedProjectId(null); }} placeholder="e.g. Tower Phase 2" />
            {projectName && (
              <span className="text-xs text-muted-foreground">Shortened: <strong>{projectShort}</strong></span>
            )}
          </div>
        )}

        {prefilledProjectId && projectName && (
          <div className="space-y-1.5">
            <Label>Project Name</Label>
            <Input value={projectName} disabled className="bg-muted" />
            <span className="text-xs text-muted-foreground">Shortened: <strong>{projectShort}</strong></span>
          </div>
        )}

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
    </div>
  );

  if (compact) return content;

  return (
    <Card className="shadow-lg border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-foreground">Generate Reference Number</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
