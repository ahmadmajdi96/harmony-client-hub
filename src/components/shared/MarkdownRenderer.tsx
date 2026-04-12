import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("text-sm", className)}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-medium text-foreground mt-2 mb-1 first:mt-0">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="my-1.5 leading-relaxed text-foreground/90 [&:last-child]:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/80">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-1.5 ml-4 space-y-0.5 list-disc marker:text-primary/50">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 ml-4 space-y-0.5 list-decimal marker:text-primary/50">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground/90 leading-relaxed pl-1">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/30 bg-primary/5 pl-3 pr-2 py-1 my-2 rounded-r-lg text-foreground/80 italic">
              {children}
            </blockquote>
          ),
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className="text-xs bg-muted/60 text-foreground px-1.5 py-0.5 rounded font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className={cn("text-xs font-mono", codeClassName)}>{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-muted/60 p-3 rounded-lg my-2 overflow-x-auto text-xs font-mono">
              {children}
            </pre>
          ),
          hr: () => <hr className="my-3 border-border/40" />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border/40">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/30">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-accent/30 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-foreground text-xs whitespace-nowrap border-b border-border/50">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-foreground/80 text-xs whitespace-nowrap">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
