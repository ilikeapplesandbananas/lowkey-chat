import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText, FileType, FileCode } from "lucide-react";
import { 
  exportToTxt, 
  exportToMarkdown, 
  exportToJson, 
  exportToPdf, 
  exportToDocx, 
  Message 
} from "@/lib/export-utils";

interface ChatExportProps {
  messages: Message[];
}

export const ChatExport = ({ messages }: ChatExportProps) => {
  const handleExport = (format: 'txt' | 'md' | 'json' | 'pdf' | 'docx') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `chat-export-${timestamp}`;

    switch (format) {
      case 'txt':
        exportToTxt(messages, filename);
        break;
      case 'md':
        exportToMarkdown(messages, filename);
        break;
      case 'json':
        exportToJson(messages, filename);
        break;
      case 'pdf':
        exportToPdf(messages, filename);
        break;
      case 'docx':
        exportToDocx(messages, filename);
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Export Chat">
          <Download className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileType className="mr-2 h-4 w-4" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('docx')}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Export as DOCX</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('txt')}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Export as TXT</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('md')}>
          <FileCode className="mr-2 h-4 w-4" />
          <span>Export as Markdown</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="mr-2 h-4 w-4" />
          <span>Export as JSON</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
