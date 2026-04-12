import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmbeddedChat } from "@/components/chat/EmbeddedChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, BarChart3, Loader2, RefreshCw, TrendingUp, Users2, ListChecks, FolderKanban, AlertTriangle, CheckCircle2, FileText, Calendar, Play } from "lucide-react";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/system-chat`;

interface AnalysisCard {
  title: string;
  icon: React.ReactNode;
  prompt: string;
}

const analysisCards: AnalysisCard[] = [
  {
    title: "Project Health Overview",
    icon: <FolderKanban className="h-4 w-4" />,
    prompt: "Provide a comprehensive project health overview. For each project, show its status, progress percentage, budget, whether it's on track or at risk, and any upcoming deadlines. Use a table format. Add a brief summary at the end with overall portfolio health.",
  },
  {
    title: "Employee Workload Distribution",
    icon: <Users2 className="h-4 w-4" />,
    prompt: "Analyze employee workload distribution. For each active employee, show how many tasks they have, their task statuses (done, in progress, todo), which projects they're assigned to, and flag anyone who is overloaded (more than 5 active tasks) or underutilized (0-1 tasks). Present in a clear table with a summary.",
  },
  {
    title: "Task Completion Analysis",
    icon: <ListChecks className="h-4 w-4" />,
    prompt: "Analyze task completion rates across all projects. Show: total tasks, completed tasks, completion rate per project, overdue tasks (past due date and not done), tasks by priority breakdown. Highlight any bottlenecks or projects falling behind. Use tables and bullet points.",
  },
  {
    title: "Risk & Issues Report",
    icon: <AlertTriangle className="h-4 w-4" />,
    prompt: "Generate a risk and issues report. Identify: projects with low progress but approaching end dates, overdue tasks, employees with no assignments, projects without budgets, any stalled projects (on_hold or no recent activity). Rate each risk as High/Medium/Low. Present findings in a structured format with recommendations.",
  },
  {
    title: "Budget & Financial Summary",
    icon: <TrendingUp className="h-4 w-4" />,
    prompt: "Provide a detailed budget and financial summary. For each project show: name, budget, status, progress. Calculate total portfolio budget, average budget per project, budget utilization estimates. Identify projects with no budget set. Present in tables with a financial health summary.",
  },
  {
    title: "Weekly Activity Digest",
    icon: <CheckCircle2 className="h-4 w-4" />,
    prompt: "Create a weekly activity digest from the recent activity log. Summarize: what was created, updated, or deleted this week. Group by entity type (projects, tasks, clients, employees). Highlight the most active areas and any significant changes. Use bullet points and clear sections.",
  },
];

async function fetchAnalysis(prompt: string): Promise<string> {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Analysis request failed");
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") break;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) result += content;
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  return result;
}

function AnalysisCardComponent({ card }: { card: AnalysisCard }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    setContent(null);
    setExpanded(true);
    try {
      const result = await fetchAnalysis(card.prompt);
      setContent(result);
    } catch (e: any) {
      setError(e.message || "Failed to generate analysis");
    }
    setLoading(false);
  };

  return (
    <Card className="rounded-2xl border-border/40 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {card.icon}
            </div>
            {card.title}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs gap-1.5"
            onClick={run}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {content ? "Refresh" : "Generate"}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {loading && !content && (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Analyzing system data...</span>
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">
              ⚠️ {error}
            </div>
          )}
          {content && (
            <MarkdownRenderer content={content} />
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function AIPage() {
  return (
    <div>
      <PageHeader
        title="AI Intelligence"
        subtitle="AI-powered analysis and conversational assistant for your system data"
      />
      <div className="p-6">
        <Tabs defaultValue="analysis" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="analysis" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4" />
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="chat" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
              <Bot className="h-4 w-4" />
              Chat Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Click <strong>Generate</strong> on any card to run an AI-powered analysis of your live system data.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {analysisCards.map((card) => (
                  <AnalysisCardComponent key={card.title} card={card} />
                ))}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="chat">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <EmbeddedChat className="h-[calc(100vh-220px)]" />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
