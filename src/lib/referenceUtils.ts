import { supabase } from "@/integrations/supabase/client";

export const DOCUMENT_TYPES = [
  { label: "Quotation", code: "Q" },
  { label: "Letter", code: "L" },
] as const;

export const COMPANIES = [
  { label: "SBTMC", code: "S" },
  { label: "UP", code: "U" },
  { label: "AKTEK", code: "A" },
  { label: "HAKTCO", code: "H" },
  { label: "BTECO", code: "B" },
  { label: "AMOS", code: "M" },
] as const;

export const ACTIVITIES = [
  "EPC", "MEP", "ELV", "CCTV", "FA", "PA", "FM", "OP", "ACS", "BMS", "MTN",
] as const;

const COMMON_WORDS = new Set(["THE", "AND", "OF", "PROJECT", "FOR", "IN", "AT", "TO", "A", "AN"]);

export function shortenName(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => !COMMON_WORDS.has(w))
    .join("");
  return cleaned.slice(0, 5);
}

export interface ReferenceRecord {
  id: string;
  doc_type: string;
  company: string;
  client: string;
  client_short: string;
  project_name: string;
  project_short: string;
  project_id: string | null;
  activity: string;
  year: string;
  month: string;
  sequence: string;
  revision: string;
  reference: string;
  created_at: string;
}

export async function getRecords(): Promise<ReferenceRecord[]> {
  const { data, error } = await supabase
    .from("references" as any)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as any[]) || [];
}

export async function insertRecord(record: Omit<ReferenceRecord, "id" | "created_at">): Promise<ReferenceRecord> {
  const { data, error } = await supabase
    .from("references" as any)
    .insert(record as any)
    .select()
    .single();
  if (error) throw error;
  return data as any;
}

export async function updateRecord(id: string, updates: Partial<Omit<ReferenceRecord, "id" | "created_at">>): Promise<ReferenceRecord> {
  const { data, error } = await supabase
    .from("references" as any)
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as any;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from("references" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export function getNextSequence(records: ReferenceRecord[], year: string): string {
  const yearRecords = records.filter((r) => r.year === year);
  const maxSeq = yearRecords.reduce((max, r) => Math.max(max, parseInt(r.sequence, 10)), 0);
  return String(maxSeq + 1).padStart(3, "0");
}

export function getNextRevision(
  records: ReferenceRecord[],
  docType: string,
  company: string,
  clientShort: string,
  projectShort: string,
  activity: string,
  year: string,
  month: string,
  sequence: string
): string {
  const matching = records.filter(
    (r) =>
      r.doc_type === docType &&
      r.company === company &&
      r.client_short === clientShort &&
      r.project_short === projectShort &&
      r.activity === activity &&
      r.year === year &&
      r.month === month &&
      r.sequence === sequence
  );
  if (matching.length === 0) return "00";
  const maxRev = matching.reduce((max, r) => Math.max(max, parseInt(r.revision, 10)), 0);
  return String(maxRev + 1).padStart(2, "0");
}

export function buildReference(
  docType: string,
  company: string,
  clientShort: string,
  projectShort: string,
  activity: string,
  year: string,
  month: string,
  sequence: string,
  revision: string
): string {
  return `${docType}${company}-${clientShort}-${projectShort}-${activity}-${year}${month}${sequence}-${revision}`;
}
