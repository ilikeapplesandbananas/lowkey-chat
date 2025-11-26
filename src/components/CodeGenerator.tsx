import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (prompt: string) => void;
  isLoading?: boolean;
}

const SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML/CSS" },
  { value: "react", label: "React/JSX" },
  { value: "vue", label: "Vue.js" },
  { value: "angular", label: "Angular" },
  { value: "bash", label: "Bash/Shell" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "yaml", label: "YAML" },
];

const CODE_TEMPLATES = {
  javascript: "Create a JavaScript function that",
  python: "Create a Python function that",
  typescript: "Create a TypeScript function that",
  react: "Create a React component that",
  sql: "Create a SQL query that",
  html: "Create an HTML/CSS component that",
  default: "Generate code that",
};

const CodeGenerator = ({ open, onOpenChange, onGenerate, isLoading }: CodeGeneratorProps) => {
  const [language, setLanguage] = useState("javascript");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const { toast } = useToast();

  const handleGenerate = () => {
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please describe what code you want to generate",
        variant: "destructive",
      });
      return;
    }

    const template = (CODE_TEMPLATES[language as keyof typeof CODE_TEMPLATES] ||
      CODE_TEMPLATES.default) as string;
    const fullPrompt =
      `${template} ${description}${
        requirements.trim() ? `\n\nRequirements:\n${requirements}` : ""
      }` + `\n\nPlease provide the code in \`\`\`${language}\n...\n\`\`\` format.`;

    onGenerate(fullPrompt);
    setDescription("");
    setRequirements("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Generate Code
          </DialogTitle>
          <DialogDescription>
            Tell the AI what code you need and it will generate it for you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 overflow-y-auto flex-1">
          {/* Language Selection */}
          <div className="space-y-2">
            <Label htmlFor="language">Programming Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">What should the code do?</Label>
            <Textarea
              id="description"
              placeholder={`E.g., "validate email addresses" or "create a button component"`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-16"
            />
          </div>

          {/* Additional Requirements */}
          <div className="space-y-2">
            <Label htmlFor="requirements">Additional Requirements (optional)</Label>
            <Textarea
              id="requirements"
              placeholder={`E.g., "must support async/await", "include error handling", "add comments"`}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="min-h-14"
            />
          </div>

          {/* Examples */}
          <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
              💡 Try these:
            </p>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5">
              <li>• "validate email addresses with regex"</li>
              <li>• "sort an array and remove duplicates"</li>
              <li>• "create a login form with validation"</li>
              <li>• "fetch data from an API and handle errors"</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading || !description.trim()}>
            {isLoading ? "Generating..." : "Generate Code"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CodeGenerator;
