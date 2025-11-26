import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { memoryService, Memory } from "@/services/memoryService";
import { useToast } from "@/hooks/use-toast";

interface PrivacySettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PrivacySettings = ({ open, onOpenChange }: PrivacySettingsProps) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveConversations, setSaveConversations] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadMemories();
    }
  }, [open]);

  const loadMemories = async () => {
    setIsLoading(true);
    const allMemories = await memoryService.getAllMemories();
    setMemories(allMemories);
    setIsLoading(false);
  };

  const deleteMemory = async (id: string | undefined) => {
    if (!id) return;

    const confirmed = window.confirm("Delete this memory?");
    if (!confirmed) return;

    if (await memoryService.deleteMemory(id)) {
      toast({
        title: "Memory deleted",
      });
      await loadMemories();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete memory",
        variant: "destructive",
      });
    }
  };

  const deleteAllMemories = async () => {
    const confirmed = window.confirm(
      "Delete all memories? This action cannot be undone."
    );
    if (!confirmed) return;

    setIsLoading(true);
    let deletedCount = 0;
    for (const memory of memories) {
      if (memory.id && (await memoryService.deleteMemory(memory.id))) {
        deletedCount++;
      }
    }
    setIsLoading(false);

    toast({
      title: "Memories deleted",
      description: `${deletedCount} memory items removed`,
    });

    await loadMemories();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Privacy Settings</DialogTitle>
          <DialogDescription>
            Control your data and how your information is stored
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Conversation Storage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Save conversations</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Your chat history will be saved to your account
                </p>
              </div>
              <Switch
                checked={saveConversations}
                onCheckedChange={setSaveConversations}
              />
            </div>
          </div>

          {/* Stored Memories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Your Memories</h3>
              <span className="text-xs text-muted-foreground">
                {memories.length} stored
              </span>
            </div>

            {memories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No memories saved yet. Use `/remember key value` to save facts about yourself.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="flex items-start justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-semibold text-foreground break-words">
                        {memory.key}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        {memory.value}
                      </p>
                      {memory.isSensitive && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ Contains sensitive data
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMemory(memory.id)}
                      className="ml-2 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {memories.length > 0 && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={deleteAllMemories}
                disabled={isLoading}
              >
                Delete All Memories
              </Button>
            )}
          </div>

          {/* Data Minimization Info */}
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              💡 <strong>Privacy tip:</strong> We minimize data collection by default. Your
              conversations are stored only in your account. Memories are encrypted and never
              shared.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacySettings;
