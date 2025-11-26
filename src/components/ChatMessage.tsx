import { useState } from "react";
import { cn } from "@/lib/utils";
import CodeExecutor from "./CodeExecutor";
import ImageGenerator from "./ImageGenerator";
import MermaidDiagram from "./MermaidDiagram";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, Check, X, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ProcessedFile } from "@/lib/file-processing";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  attachments?: ProcessedFile[];
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
}

// Parse code blocks from markdown-like content
const parseContent = (content: string) => {
  // Check for image generation markers (used by the AI tool)
  const imageRegex = /\[IMAGE_GENERATION:(.*?)\|(.*?)\]/g;
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: Array<{ type: "text" | "code" | "image"; content: string; language?: string; prompt?: string; style?: string }> = [];
  let lastIndex = 0;

  // First process images
  let imageMatch;
  const imageMatches: Array<{ index: number; end: number; prompt: string; style: string }> = [];
  while ((imageMatch = imageRegex.exec(content)) !== null) {
    imageMatches.push({
      index: imageMatch.index,
      end: imageMatch.index + imageMatch[0].length,
      prompt: imageMatch[1] || "",
      style: imageMatch[2] || "photorealistic",
    });
  }

  // Then process code blocks
  let match;
  const codeMatches: Array<{ index: number; end: number; language: string; content: string }> = [];
  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeMatches.push({
      index: match.index,
      end: match.index + match[0].length,
      language: match[1] || "text",
      content: match[2].trim(),
    });
  }

  // Combine and sort all matches
  const allMatches = [
    ...imageMatches.map(m => ({ ...m, type: "image" as const })),
    ...codeMatches.map(m => ({ ...m, type: "code" as const })),
  ].sort((a, b) => a.index - b.index);

  // Build parts array
  for (const matchItem of allMatches) {
    if (matchItem.index > lastIndex) {
      parts.push({
        type: "text",
        content: content.substring(lastIndex, matchItem.index),
      });
    }

    if (matchItem.type === "image") {
      parts.push({
        type: "image",
        content: "",
        prompt: matchItem.prompt,
        style: matchItem.style,
      });
    } else {
      parts.push({
        type: "code",
        language: matchItem.language,
        content: matchItem.content,
      });
    }

    lastIndex = matchItem.end;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      content: content.substring(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: "text", content }];
};

// Render markdown-formatted text
const renderMarkdownText = (text: string) => {
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  // Process bold text (**text** or __text__)
  const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
  let boldMatch;
  const boldMatches: Array<{ start: number; end: number; text: string }> = [];

  while ((boldMatch = boldRegex.exec(text)) !== null) {
    boldMatches.push({
      start: boldMatch.index,
      end: boldMatch.index + boldMatch[0].length,
      text: boldMatch[1] || boldMatch[2],
    });
  }

  // Process italic text (*text* or _text_)
  const italicRegex = /\*(.+?)\*|_(.+?)_/g;
  let italicMatch;
  const italicMatches: Array<{ start: number; end: number; text: string }> = [];

  while ((italicMatch = italicRegex.exec(text)) !== null) {
    // Skip if this is part of bold text
    const isPartOfBold = boldMatches.some(
      (b) => italicMatch.index >= b.start && italicMatch.index < b.end
    );
    if (!isPartOfBold) {
      italicMatches.push({
        start: italicMatch.index,
        end: italicMatch.index + italicMatch[0].length,
        text: italicMatch[1] || italicMatch[2],
      });
    }
  }

  // Combine all formatting matches
  const allMatches = [...boldMatches, ...italicMatches].sort((a, b) => a.start - b.start);

  // Split text by matches
  let currentIndex = 0;
  let keyIndex = 0;

  for (const match of allMatches) {
    if (match.start > currentIndex) {
      elements.push(
        <span key={`text-${keyIndex++}`}>{text.substring(currentIndex, match.start)}</span>
      );
    }

    if (boldMatches.includes(match)) {
      elements.push(
        <strong key={`bold-${keyIndex++}`} className="font-semibold">
          {match.text}
        </strong>
      );
    } else {
      elements.push(
        <em key={`italic-${keyIndex++}`} className="italic">
          {match.text}
        </em>
      );
    }

    currentIndex = match.end;
  }

  if (currentIndex < text.length) {
    elements.push(<span key={`text-${keyIndex}`}>{text.substring(currentIndex)}</span>);
  }

  return elements.length > 0 ? elements : text;
};

// Render lines with proper formatting (lists, numbering, etc)
const renderFormattedLines = (text: string) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let inNumberedList = false;
  let numberedItems: React.ReactNode[] = [];
  let numberedListCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Numbered list (1. 2. 3.)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      if (!inNumberedList && numberedItems.length > 0) {
        // Flush bullet list
        if (listItems.length > 0) {
          elements.push(
            <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
              {listItems}
            </ul>
          );
          listItems = [];
          inList = false;
        }
      }
      if (!inNumberedList) {
        numberedListCounter = 1;
      }
      inNumberedList = true;
      inList = false;
      numberedItems.push(
        <li key={`num-${numberedListCounter}`} className="text-base">
          {renderMarkdownText(numberedMatch[2])}
        </li>
      );
      numberedListCounter++;
      continue;
    }

    // Bullet list (- or *)
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      if (inNumberedList && numberedItems.length > 0) {
        // Flush numbered list
        elements.push(
          <ol key={`numlist-${elements.length}`} className="list-decimal list-inside space-y-1 my-2">
            {numberedItems}
          </ol>
        );
        numberedItems = [];
        inNumberedList = false;
      }
      inList = true;
      listItems.push(
        <li key={`bullet-${i}`} className="text-base">
          {renderMarkdownText(bulletMatch[1])}
        </li>
      );
      continue;
    }

    // Headers (#, ##, ###)
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      // Flush any pending lists
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
      if (inNumberedList && numberedItems.length > 0) {
        elements.push(
          <ol key={`numlist-${elements.length}`} className="list-decimal list-inside space-y-1 my-2">
            {numberedItems}
          </ol>
        );
        numberedItems = [];
        inNumberedList = false;
      }

      const level = headerMatch[1].length;
      const content = headerMatch[2];
      const className = 
        level === 1 ? "text-xl font-bold mt-4 mb-2" :
        level === 2 ? "text-lg font-bold mt-3 mb-2" :
        "text-base font-bold mt-2 mb-1";
      
      elements.push(
        <div key={`header-${i}`} className={className}>
          {renderMarkdownText(content)}
        </div>
      );
      continue;
    }

    // Not a list item - flush any pending lists
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }

    if (inNumberedList && numberedItems.length > 0) {
      elements.push(
        <ol key={`numlist-${elements.length}`} className="list-decimal list-inside space-y-1 my-2">
          {numberedItems}
        </ol>
      );
      numberedItems = [];
      inNumberedList = false;
    }

    // Regular paragraph
    if (trimmed) {
      elements.push(
        <p key={`para-${i}`} className="text-base leading-relaxed">
          {renderMarkdownText(trimmed)}
        </p>
      );
    }
  }

  // Flush any remaining lists
  if (inList && listItems.length > 0) {
    elements.push(
      <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
        {listItems}
      </ul>
    );
  }

  if (inNumberedList && numberedItems.length > 0) {
    elements.push(
      <ol key={`numlist-${elements.length}`} className="list-decimal list-inside space-y-1 my-2">
        {numberedItems}
      </ol>
    );
  }

  return elements;
};

const ChatMessage = ({ role, content, attachments, onDelete, onEdit }: ChatMessageProps) => {
  const isUser = role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const parts = parseContent(content);

  const handleSave = () => {
    if (onEdit && editedContent.trim() !== content) {
      onEdit(editedContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        className={cn(
          "flex w-full gap-3 p-4 animate-in fade-in-50 slide-in-from-bottom-2 group",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "max-w-[80%] w-full rounded-2xl shadow-sm transition-all relative p-4 space-y-2",
            isUser
              ? "bg-gradient-primary text-primary-foreground"
              : "bg-card text-card-foreground border border-border"
          )}
        >
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[100px] bg-background/50 text-foreground resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 w-8 p-0 hover:bg-background/20">
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleSave} className="h-8 w-8 p-0 hover:bg-background/20">
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full gap-3 p-4 animate-in fade-in-50 slide-in-from-bottom-2 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl shadow-sm transition-all relative",
          isUser
            ? "bg-gradient-primary text-primary-foreground px-4 py-3"
            : "bg-card text-card-foreground border border-border px-4 py-3 space-y-2"
        )}
      >
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-black/20 rounded-lg p-2 text-xs">
                {file.type === 'image' ? (
                  <div className="relative group cursor-pointer">
                    <img src={file.preview || file.content} alt={file.name} className="w-16 h-16 object-cover rounded" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span className="max-w-[150px] truncate">{file.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {parts.map((part, idx) =>
          part.type === "code" ? (
            part.language === "mermaid" ? (
              <MermaidDiagram key={idx} chart={part.content} />
            ) : (
              <div key={idx} className={isUser ? "bg-black/20 -mx-4 -mb-3 mt-3 rounded-b-2xl" : ""}>
                <CodeExecutor code={part.content} language={part.language || "text"} />
              </div>
            )
          ) : part.type === "image" ? (
            <div key={idx}>
              <ImageGenerator prompt={part.prompt || ""} style={part.style} />
            </div>
          ) : (
            <div key={idx} className="space-y-2">
              {renderFormattedLines(part.content)}
            </div>
          )
        )}
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && isUser && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full shadow-sm"
              onClick={() => {
                setEditedContent(content);
                setIsEditing(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-destructive hover:bg-destructive/90 text-white rounded-full shadow-sm"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
