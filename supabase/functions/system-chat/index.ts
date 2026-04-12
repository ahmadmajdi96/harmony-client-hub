import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function gatherSystemContext(supabase: any): Promise<string> {
  const sections: string[] = [];

  // Projects
  const { data: projects } = await supabase
    .from("projects")
    .select("*, clients(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (projects?.length) {
    sections.push(
      `## Projects (${projects.length})\n` +
        projects
          .map(
            (p: any) =>
              `- ${p.name} (${p.reference_number}) | Status: ${p.status} | Priority: ${p.priority} | Progress: ${p.progress}% | Budget: $${p.budget || 0} | Client: ${p.clients?.name || "None"} | Start: ${p.start_date || "N/A"} | End: ${p.end_date || "N/A"}`
          )
          .join("\n")
    );
  }

  // Clients
  const { data: clients } = await supabase.from("clients").select("*").limit(100);
  if (clients?.length) {
    sections.push(
      `## Clients (${clients.length})\n` +
        clients
          .map(
            (c: any) =>
              `- ${c.name} (${c.reference_number}) | Company: ${c.company || "N/A"} | Status: ${c.status} | Email: ${c.email || "N/A"} | Phone: ${c.phone || "N/A"}`
          )
          .join("\n")
    );
  }

  // Employees
  const { data: employees } = await supabase.from("employees").select("*").limit(100);
  if (employees?.length) {
    sections.push(
      `## Employees (${employees.length})\n` +
        employees
          .map(
            (e: any) =>
              `- ${e.name} (${e.reference_number}) | Role: ${e.role || "N/A"} | Dept: ${e.department || "N/A"} | Status: ${e.status} | Email: ${e.email || "N/A"}`
          )
          .join("\n")
    );
  }

  // Employee-Project assignments
  const { data: empProjects } = await supabase
    .from("employee_projects")
    .select("employee_id, project_id, role")
    .limit(500);
  if (empProjects?.length) {
    const empMap = new Map(employees?.map((e: any) => [e.id, e.name]) || []);
    const projMap = new Map(projects?.map((p: any) => [p.id, p.name]) || []);
    sections.push(
      `## Employee-Project Assignments (${empProjects.length})\n` +
        empProjects
          .map(
            (ep: any) =>
              `- ${empMap.get(ep.employee_id) || ep.employee_id} → ${projMap.get(ep.project_id) || ep.project_id} (Role: ${ep.role || "N/A"})`
          )
          .join("\n")
    );
  }

  // Tasks
  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (tasks?.length) {
    const projMap = new Map(projects?.map((p: any) => [p.id, p.name]) || []);
    sections.push(
      `## Tasks (${tasks.length})\n` +
        tasks
          .map(
            (t: any) =>
              `- ${t.title} | Project: ${projMap.get(t.project_id) || "Unknown"} | Status: ${t.status} | Priority: ${t.priority} | Due: ${t.due_date || "N/A"}`
          )
          .join("\n")
    );
  }

  // Task-Employee assignments
  const { data: taskEmps } = await supabase
    .from("task_employees")
    .select("task_id, employee_id")
    .limit(500);
  if (taskEmps?.length) {
    const empMap = new Map(employees?.map((e: any) => [e.id, e.name]) || []);
    const taskMap = new Map(tasks?.map((t: any) => [t.id, t.title]) || []);
    sections.push(
      `## Task-Employee Assignments (${taskEmps.length})\n` +
        taskEmps
          .map(
            (te: any) =>
              `- ${taskMap.get(te.task_id) || te.task_id} → ${empMap.get(te.employee_id) || te.employee_id}`
          )
          .join("\n")
    );
  }

  // Suppliers
  const { data: suppliers } = await supabase.from("suppliers").select("*").limit(100);
  if (suppliers?.length) {
    sections.push(
      `## Suppliers (${suppliers.length})\n` +
        suppliers
          .map(
            (s: any) =>
              `- ${s.name} (${s.reference_number}) | Company: ${s.company || "N/A"} | Status: ${s.status} | Contact: ${s.contact_person || "N/A"}`
          )
          .join("\n")
    );
  }

  // Files
  const { data: files } = await supabase
    .from("project_files")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (files?.length) {
    const projMap = new Map(projects?.map((p: any) => [p.id, p.name]) || []);
    sections.push(
      `## Uploaded Files (${files.length})\n` +
        files
          .map(
            (f: any) =>
              `- ${f.file_name} | Type: ${f.file_type || "Unknown"} | Size: ${f.file_size ? Math.round(f.file_size / 1024) + "KB" : "N/A"} | Project: ${projMap.get(f.project_id) || "N/A"} | Uploaded: ${f.created_at}`
          )
          .join("\n")
    );
  }

  // Read text content from uploaded files (txt, csv, json, md)
  const textFiles = files?.filter((f: any) => {
    const ext = f.file_name?.split(".").pop()?.toLowerCase();
    return ["txt", "csv", "json", "md", "text"].includes(ext || "");
  }) || [];

  for (const f of textFiles.slice(0, 10)) {
    try {
      const { data: fileData } = await supabase.storage
        .from("project-files")
        .download(f.file_path);
      if (fileData) {
        const text = await fileData.text();
        if (text.length > 0) {
          sections.push(
            `## File Content: ${f.file_name}\n\`\`\`\n${text.slice(0, 5000)}\n\`\`\``
          );
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  // Recent activity
  const { data: activity } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (activity?.length) {
    sections.push(
      `## Recent Activity (last 30)\n` +
        activity
          .map(
            (a: any) =>
              `- [${a.created_at}] ${a.action} ${a.entity_type}: ${a.description || a.entity_name || ""}`
          )
          .join("\n")
    );
  }

  return sections.join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const context = await gatherSystemContext(supabase);

    const systemPrompt = `You are CORTA-PM Assistant, an intelligent AI assistant for the CORTA Project Management system. You ONLY answer questions about the data and operations within this system. If a user asks something unrelated to the system, politely redirect them.

You have access to the following live system data:

${context}

Guidelines:
- Answer questions about projects, clients, employees, suppliers, tasks, files, and activity with specific data from above.
- Provide analytics, summaries, comparisons, and insights when asked.
- Reference specific names, numbers, dates, and statuses from the data.
- If asked about uploaded file contents, use the file content data provided above.
- Format responses with markdown for readability.
- Be concise but thorough. Use tables when comparing multiple items.
- If data is not available, say so clearly.
- NEVER answer questions unrelated to this project management system.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("system-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
