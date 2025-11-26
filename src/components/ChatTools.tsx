import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, GraduationCap, Briefcase, Code, FileText, User, Search, LayoutTemplate } from "lucide-react";

interface ChatToolsProps {
  onToolSelect: (prompt: string) => void;
}

export function ChatTools({ onToolSelect }: ChatToolsProps) {
  const tools = [
    {
      label: "Teach me this topic",
      icon: GraduationCap,
      prompt: "Teach me about [TOPIC] in a comprehensive way. Break it down into key concepts, examples, and a summary.",
    },
    {
      label: "Explain like I'm 5",
      icon: User,
      prompt: "Explain [TOPIC] like I am 5 years old. Use simple analogies and easy-to-understand language.",
    },
    {
      label: "Generate Career Projects",
      icon: Briefcase,
      prompt: "Based on my skills and interests, generate 3 impressive project ideas that would look great on my resume. My skills are: [SKILLS].",
    },
    {
      label: "Build Portfolio Idea",
      icon: LayoutTemplate,
      prompt: "Help me flesh out a portfolio project idea. I want to build [IDEA]. Give me a feature list, tech stack, and roadmap.",
    },
    {
      label: "Task Breakdown",
      icon: FileText,
      prompt: "Break down the following task into small, actionable steps: [TASK].",
    },
    {
      label: "Code Walkthrough",
      icon: Code,
      prompt: "Please provide a detailed code walkthrough for the following: [TOPIC/CODE]. Explain how it works line by line.",
    },
    {
      label: "Resume/GitHub Review",
      icon: Search,
      prompt: "Please review my [Resume/GitHub] and give me constructive feedback on how to improve it. Here is the content: [CONTENT]",
    },
    {
      label: "Roleplay Mode",
      icon: Sparkles,
      prompt: "Let's roleplay! You are [CHARACTER]. Stay in character throughout our conversation.",
    }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          type="button"
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors"
          title="AI Tools"
        >
          <Sparkles className="h-4 w-4 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>AI Tools</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tools.map((tool) => (
          <DropdownMenuItem
            key={tool.label}
            onClick={() => onToolSelect(tool.prompt)}
            className="gap-2 cursor-pointer"
          >
            <tool.icon className="h-4 w-4" />
            {tool.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
