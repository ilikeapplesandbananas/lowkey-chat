import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings } from "lucide-react";

interface ChatSettingsProps {
  personality: string;
  language: string;
  onPersonalityChange: (personality: string) => void;
  onLanguageChange: (language: string) => void;
}

const ChatSettings = ({
  personality,
  language,
  onPersonalityChange,
  onLanguageChange,
}: ChatSettingsProps) => {
  const personalities = [
    { value: "professional", label: "Professional" },
    { value: "friendly", label: "Friendly" },
    { value: "casual", label: "Casual" },
    { value: "concise", label: "Concise" },
  ];

  const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "zh", label: "Chinese" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Personality Mode</DropdownMenuLabel>
        {personalities.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onClick={() => onPersonalityChange(p.value)}
            className={personality === p.value ? "bg-accent" : ""}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        {languages.map((l) => (
          <DropdownMenuItem
            key={l.value}
            onClick={() => onLanguageChange(l.value)}
            className={language === l.value ? "bg-accent" : ""}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChatSettings;
