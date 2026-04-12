import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/system-chat`;

interface EmbeddedChatProps {
  className?: string;
}

export function EmbeddedChat({ className }: EmbeddedChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${err.error || "Something went wrong."}` },
        ]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snap = assistantSoFar;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snap } : m));
                }
                return [...prev, { role: "assistant", content: snap }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snap = assistantSoFar;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snap } : m));
                }
                return [...prev, { role: "assistant", content: snap }];
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Connection error. Please try again." },
      ]);
    }
    setIsLoading(false);
  }, [input, isLoading, messages]);

  return (
    <div className={`flex flex-col bg-card rounded-2xl border border-border/40 overflow-hidden ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 shrink-0">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">CORTA Assistant</p>
          <p className="text-xs text-muted-foreground">Ask anything about your projects, tasks & data</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground" onClick={() => setMessages([])}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3 opacity-60">
            <Bot className="h-12 w-12 text-primary/30" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">How can I help?</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-[300px]">
                Ask about projects, employees, tasks, clients, uploaded documents, or any system data.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {[
                "Summarize all projects",
                "Who has the most tasks?",
                "Show overdue tasks",
                "Budget overview by project",
                "Employee workload analysis",
                "Recent activity summary",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-2 rounded-xl border border-border/60 bg-accent/30 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-accent/50 text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_table]:text-xs [&_table]:my-2 [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_code]:text-xs [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted/60 [&_pre]:p-3 [&_pre]:rounded-lg [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_blockquote]:border-primary/30 [&_hr]:my-2">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-xl bg-primary/80 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-accent/50 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/40 bg-card shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about your system data..."
            rows={1}
            className="flex-1 resize-none bg-accent/30 rounded-xl border border-border/40 px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all min-h-[44px] max-h-[120px]"
          />
          <Button size="icon" className="h-11 w-11 rounded-xl shrink-0" onClick={send} disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
