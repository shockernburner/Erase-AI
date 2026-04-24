import { ArrowLeft, FileText } from "lucide-react";
import publishingMd from "../../../../extension/PUBLISHING.md?raw";

interface PublishingChecklistProps {
  onBack: () => void;
}

interface MdBlock {
  type: "h1" | "h2" | "h3" | "p" | "ul" | "ol" | "code" | "hr";
  content: string;
  items?: string[];
  lang?: string;
}

function parseMarkdown(src: string): MdBlock[] {
  const lines = src.split(/\r?\n/);
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^---\s*$/.test(line)) {
      blocks.push({ type: "hr", content: "" });
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: "code", content: buf.join("\n"), lang });
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", content: line.slice(2).trim() });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", content: line.slice(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", content: line.slice(4).trim() });
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", content: "", items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", content: "", items });
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !/^---\s*$/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", content: para.join(" ") });
  }
  return blocks;
}

function renderInline(text: string): (string | JSX.Element)[] {
  const out: (string | JSX.Element)[] = [];
  let cursor = 0;
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|<https?:\/\/[^>]+>)/g;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) out.push(text.slice(cursor, match.index));
    const tok = match[0];
    if (tok.startsWith("`")) {
      out.push(
        <code key={`c${key++}`} className="font-mono text-xs bg-card/60 border border-border/40 rounded px-1.5 py-0.5">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("**")) {
      out.push(<strong key={`s${key++}`} className="font-semibold text-foreground">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("[")) {
      const m = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;
      out.push(
        <a key={`a${key++}`} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {m[1]}
        </a>,
      );
    } else if (tok.startsWith("<")) {
      const url = tok.slice(1, -1);
      out.push(
        <a key={`u${key++}`} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {url}
        </a>,
      );
    }
    cursor = match.index + tok.length;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

export default function PublishingChecklist({ onBack }: PublishingChecklistProps) {
  const blocks = parseMarkdown(publishingMd);

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="publishing-checklist-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          data-testid="publishing-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-start gap-3 mb-6">
          <FileText className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Extension publishing checklist</h1>
            <p className="text-sm text-muted-foreground mt-1">
              The operational steps for shipping a new release of the EraseAI Firewall to the Chrome Web Store, Microsoft Edge Add-ons, and Firefox AMO. Source:{" "}
              <code className="font-mono text-xs">extension/PUBLISHING.md</code>
            </p>
          </div>
        </div>

        <article className="space-y-4">
          {blocks.map((b, idx) => {
            if (b.type === "h1") {
              return (
                <h2 key={idx} className="text-2xl font-bold border-b border-border/40 pb-2 mt-8 first:mt-0">
                  {renderInline(b.content)}
                </h2>
              );
            }
            if (b.type === "h2") {
              return (
                <h3 key={idx} className="text-xl font-semibold mt-8">
                  {renderInline(b.content)}
                </h3>
              );
            }
            if (b.type === "h3") {
              return (
                <h4 key={idx} className="text-base font-semibold mt-6">
                  {renderInline(b.content)}
                </h4>
              );
            }
            if (b.type === "p") {
              return (
                <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                  {renderInline(b.content)}
                </p>
              );
            }
            if (b.type === "ul") {
              return (
                <ul key={idx} className="list-disc list-outside ml-6 space-y-1 text-sm text-muted-foreground">
                  {(b.items || []).map((it, j) => (
                    <li key={j}>{renderInline(it)}</li>
                  ))}
                </ul>
              );
            }
            if (b.type === "ol") {
              return (
                <ol key={idx} className="list-decimal list-outside ml-6 space-y-1 text-sm text-muted-foreground">
                  {(b.items || []).map((it, j) => (
                    <li key={j}>{renderInline(it)}</li>
                  ))}
                </ol>
              );
            }
            if (b.type === "code") {
              return (
                <pre
                  key={idx}
                  className="bg-card/60 border border-border/40 rounded-lg p-4 text-xs font-mono overflow-x-auto"
                >
                  <code>{b.content}</code>
                </pre>
              );
            }
            if (b.type === "hr") {
              return <hr key={idx} className="border-border/40 my-6" />;
            }
            return null;
          })}
        </article>
      </div>
    </div>
  );
}
