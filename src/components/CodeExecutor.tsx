import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeExecutorProps {
  code: string;
  language: string;
}

const CodeExecutor = ({ code, language }: CodeExecutorProps) => {
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const executeCode = async () => {
    if (language !== "javascript" && language !== "js") {
      toast({
        title: "Not supported",
        description: "Currently only JavaScript code can be executed in the browser",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.map((arg) => JSON.stringify(arg)).join(" "));
        originalLog(...args);
      };

      // Execute code in a try-catch to prevent breaking the app
      const result = new Function(code)();

      console.log = originalLog;

      const outputText =
        logs.length > 0 ? logs.join("\n") : result !== undefined ? String(result) : "Code executed successfully";

      setOutput(outputText);
      toast({
        title: "Code executed",
        description: "Check the output below",
      });
    } catch (error) {
      console.log = console.log;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setOutput(`Error: ${errorMessage}`);
      toast({
        title: "Execution failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 bg-card border border-border rounded-lg overflow-hidden">
      <div className="bg-muted p-3 flex gap-2 justify-between items-center">
        <span className="text-xs font-mono text-muted-foreground">{language}</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyCode}
            className="h-7 px-2 text-xs"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          {language === "javascript" || language === "js" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={executeCode}
              disabled={isRunning}
              className="h-7 px-2 text-xs"
            >
              <Play className="h-3 w-3 mr-1" />
              Run
            </Button>
          ) : null}
        </div>
      </div>

      <pre className="p-4 overflow-x-auto text-xs">
        <code>{code}</code>
      </pre>

      {output && (
        <div className="border-t border-border bg-muted p-3">
          <div className="text-xs text-muted-foreground mb-1">Output:</div>
          <pre className="text-xs font-mono text-foreground overflow-x-auto">{output}</pre>
        </div>
      )}
    </div>
  );
};

export default CodeExecutor;
