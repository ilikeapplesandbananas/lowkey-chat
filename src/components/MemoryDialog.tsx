import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { memoryService, Memory } from "@/services/memoryService";
import { safetyService } from "@/services/safetyService";
import { useToast } from "@/hooks/use-toast";

interface MemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemorySaved?: (memory: Memory) => void;
}

const MemoryDialog = ({ open, onOpenChange, onMemorySaved }: MemoryDialogProps) => {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [isSensitive, setIsSensitive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!key.trim() || !value.trim()) {
      toast({
        title: "Error",
        description: "Both key and value are required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Auto-detect if sensitive
      const detectedSensitive =
        isSensitive || safetyService.isMemorySensitive(key, value);

      if (detectedSensitive && !isSensitive) {
        // Show confirmation for detected sensitive data
        const confirmed = window.confirm(
          `This appears to contain sensitive information (${safetyService.isMemorySensitive(key, value) ? "keys, passwords, etc." : ""}). Are you sure you want to save it?\n\nNote: This data will be stored in your account.`
        );

        if (!confirmed) {
          setIsLoading(false);
          return;
        }
      }

      const memory = await memoryService.saveMemory({
        key,
        value,
        isSensitive: detectedSensitive,
      });

      if (memory) {
        toast({
          title: "Memory saved",
          description: `Remembered: ${key}`,
        });
        onMemorySaved?.(memory);
        setKey("");
        setValue("");
        setIsSensitive(false);
        onOpenChange(false);
      } else {
        throw new Error("Failed to save memory");
      }
    } catch (error) {
      toast({
        title: "Error saving memory",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Save to Memory</AlertDialogTitle>
          <AlertDialogDescription>
            Store a fact or preference for later use. This helps me provide better personalized responses.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="memory-key">What to remember (key)</Label>
            <Input
              id="memory-key"
              placeholder="e.g., 'favorite_language' or 'work_timezone'"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memory-value">The information (value)</Label>
            <Input
              id="memory-value"
              placeholder="e.g., 'Python' or 'EST'"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="memory-sensitive"
              checked={isSensitive}
              onCheckedChange={(checked) => setIsSensitive(checked as boolean)}
            />
            <Label htmlFor="memory-sensitive" className="text-sm cursor-pointer">
              This is sensitive information (keys, passwords, etc.)
            </Label>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Tip: Don't store passwords or API keys as plain text. Consider using a password manager instead.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default MemoryDialog;
