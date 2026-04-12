import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function gatherSystemContext(supabase: any): Promise<string> {
  const sections: string[] = [];

  const { data: projects } = await supabase.from("projects").select("*, clients(name)").order("created_at", { ascending: false }).limit(100);
  if (projects?.length) {
    sections.push(`## Projects (${projects.length})\n` + projects.map((p: any) =>
      `- ${p.name} (${p.reference_number}) | Status: ${p.status} | Progress: ${p.progress}% | Budget: $${p.budget || 0} | Client: ${p.clients?.name || "None"}`
    ).join("\n"));
  }

  const { data: employees } = await supabase.from("employees").select("*").limit(100);
  if (employees?.length) {
    sections.push(`## Employees (${employees.length})\n` + employees.map((e: any) =>
      `- ${e.name} | Role: ${e.role || "N/A"} | Status: ${e.status}`
    ).join("\n"));
  }

  const { data: tasks } = await supabase.from("project_tasks").select("*").order("created_at", { ascending: false }).limit(200);
  if (tasks?.length) {
    const projMap = new Map(projects?.map((p: any) => [p.id, p.name]) || []);
    sections.push(`## Tasks (${tasks.length})\n` + tasks.map((t: any) =>
      `- ${t.title} | Project: ${projMap.get(t.project_id) || "Unknown"} | Status: ${t.status} | Priority: ${t.priority} | Due: ${t.due_date || "N/A"}`
    ).join("\n"));
  }

  const { data: taskEmps } = await supabase.from("task_employees").select("task_id, employee_id").limit(500);
  if (taskEmps?.length && employees?.length && tasks?.length) {
    const empMap = new Map(employees.map((e: any) => [e.id, e.name]));
    const taskMap = new Map(tasks.map((t: any) => [t.id, t.title]));
    sections.push(`## Task Assignments (${taskEmps.length})\n` + taskEmps.map((te: any) =>
      `- ${taskMap.get(te.task_id) || te.task_id} → ${empMap.get(te.employee_id) || te.employee_id}`
    ).join("\n"));
  }

  const { data: activity } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(50);
  if (activity?.length) {
    sections.push(`## Recent Activity (last 50)\n` + activity.map((a: any) =>
      `- [${a.created_at}] ${a.action} ${a.entity_type}: ${a.description || a.entity_name || ""}`
    ).join("\n"));
  }

  return sections.join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const context = await gatherSystemContext(supabase);

    const prompt = `Generate a comprehensive weekly project management report based on the following system data. The report should include:

1. **Executive Summary** - A brief overview of the portfolio status
2. **Project Status** - Table showing each project's name, status, progress, budget, and client
3. **Task Analysis** - Breakdown of tasks by status (done, in_progress, todo), overdue tasks, completion rate
4. **Employee Workload** - Who has the most tasks, workload distribution, anyone overloaded or idle
5. **Risk Alerts** - Projects at risk, overdue tasks, stalled projects, budget concerns
6. **Key Metrics** - Total projects, active vs completed, task completion rate, budget totals
7. **Recommendations** - Actionable suggestions based on the data

Format the report professionally with markdown tables, bullet points, and clear sections. Include specific numbers and names from the data.

System Data:
${context}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert project management analyst. Generate detailed, data-driven weekly reports with specific metrics and actionable insights." },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiResult = await response.json();
    const reportContent = aiResult.choices?.[0]?.message?.content || "Failed to generate report.";

    // Store the report in the activity log for record-keeping
    await supabase.from("activity_log").insert({
      entity_type: "report",
      action: "created",
      entity_name: "Weekly AI Report",
      description: `Weekly AI report generated on ${new Date().toISOString().split("T")[0]}`,
      new_values: { report: reportContent.slice(0, 10000) },
    });

    // Return the report (for manual trigger or cron)
    return new Response(JSON.stringify({ success: true, report: reportContent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
