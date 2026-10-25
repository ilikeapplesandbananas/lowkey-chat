import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copy, Check, Sparkles, User, FileText, Pencil, X } from "lucide-react";

export interface AttachmentItem {
  name: string;
  type: string;
  dataUrl?: string;
  textContent?: string;
}

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: AttachmentItem[];
  onEdit?: (newContent: string) => void;
  canEdit?: boolean;
}

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "code";
  const codeContent = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary font-medium" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-border/80 bg-zinc-950 text-zinc-100 shadow-md">
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
        <span className="font-mono text-[11px] uppercase tracking-wider">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="text-[11px]">{copied ? "Copied" : "Copy code"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
};

// Sanitizer for clean markdown, code blocks, and publication-grade KaTeX formulas
const sanitizeContentForRendering = (text: string): string => {
  if (!text) return "";

  // 1. Remove scrapings or raw artifact markers
  let clean = text
    .replace(/(?:^|\n)\s*code\s*\n+Copy code\s*\n+/gi, "\n")
    .replace(/Copy code\s*\n+/gi, "");

  // 2. Normalize LaTeX brackets \[ ... \] and \( ... \) into standard $$ and $ delimiters
  clean = clean
    .replace(/\\\[([\s\S]*?)\\\]/g, "\n\n$$$$$1$$$$\n\n")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$$");

  // 3. Balance display $$ delimiters to prevent unclosed LaTeX blocks from turning red
  const displayMatches = clean.match(/\$\$/g);
  if (displayMatches && displayMatches.length % 2 !== 0) {
    clean += "\n$$\n";
  }

  return clean;
};

const ChatMessage = ({ role, content, attachments, onEdit, canEdit = true }: ChatMessageProps) => {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(content);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditDraft(content);
  }, [content]);

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = "auto";
      editTextareaRef.current.style.height = `${Math.min(editTextareaRef.current.scrollHeight, 240)}px`;
    }
  }, [isEditing]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (!editDraft.trim()) return;
    setIsEditing(false);
    if (editDraft.trim() !== content.trim() && onEdit) {
      onEdit(editDraft.trim());
    }
  };

  const handleCancelEdit = () => {
    setEditDraft(content);
    setIsEditing(false);
  };

  const formattedContent = sanitizeContentForRendering(content);

  return (
    <div
      className={cn(
        "flex w-full gap-3 p-3 my-1 animate-in fade-in-50 slide-in-from-bottom-2 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-primary flex-shrink-0 flex items-center justify-center text-primary-foreground shadow-sm mt-1">
          <Sparkles className="w-4 h-4" />
        </div>
      )}

      {/* Action buttons on the side of User message (Edit & Copy) */}
      {isUser && !isEditing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-center mr-0.5">
          {canEdit && onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setIsEditing(true)}
              title="Edit text and resend"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={handleCopyMessage}
            title="Copy message"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm transition-all relative",
          isUser
            ? "bg-gradient-primary text-primary-foreground font-normal"
            : "bg-card text-card-foreground border border-border/80"
        )}
      >
        {/* Render Attachments (Images & Documents) */}
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-white/20">
            {attachments.map((att, i) => (
              <div key={i} className="flex flex-col">
                {att.dataUrl && att.type.startsWith("image/") ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="max-h-48 max-w-xs rounded-xl object-cover border border-white/30 shadow-sm"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 text-xs font-mono">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{att.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isUser ? (
          isEditing ? (
            <div className="space-y-2 min-w-[280px] sm:min-w-[380px]">
              <textarea
                ref={editTextareaRef}
                value={editDraft}
                onChange={(e) => {
                  setEditDraft(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
                }}
                className="w-full bg-black/25 text-white placeholder-white/60 text-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-white/40 resize-none leading-relaxed border border-white/20"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === "Escape") {
                    handleCancelEdit();
                  }
                }}
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-7 px-3 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editDraft.trim()}
                  className="h-7 px-3 text-xs bg-white text-primary hover:bg-white/90 font-semibold rounded-lg shadow-sm"
                >
                  Save & Send
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          )
        ) : (
          <div className="text-sm leading-relaxed space-y-2 prose dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-base prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, errorColor: "inherit" }]]}
              components={{
                code: CodeBlock,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 border border-border rounded-lg">
                    <table className="w-full text-xs text-left border-collapse">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="px-3 py-2 bg-muted font-semibold border-b border-border">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 border-b border-border/50">{children}</td>
                ),
              }}
            >
              {formattedContent}
            </ReactMarkdown>

            {/* Quick action: copy message only */}
            <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:text-foreground"
                onClick={handleCopyMessage}
                title="Copy message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-secondary-foreground shadow-sm mt-1">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
