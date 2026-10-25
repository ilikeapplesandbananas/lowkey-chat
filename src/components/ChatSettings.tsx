import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Shield, Trash2, Globe, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { chatStorageService } from "@/services/chatStorageService";
import type { AIServiceConfig } from "@/services/aiService";

interface ChatSettingsProps {
  personality: string;
  language: string;
  aiConfig: AIServiceConfig;
  onPersonalityChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onAIConfigChange?: (config: AIServiceConfig) => void;
}

export const ChatSettings = ({
  personality,
  language,
  onPersonalityChange,
  onLanguageChange,
}: ChatSettingsProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const handleClearHistory = async () => {
    const effectiveUid = user?.uid || "guest_anon";
    try {
      await chatStorageService.clearAllConversations(effectiveUid);
      toast({
        title: "History Cleared",
        description: "All conversations have been permanently erased.",
      });
      setOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Clear Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl border border-border/60 bg-card/80 hover:bg-accent flex items-center justify-center transition-all shadow-sm"
          title="Settings"
        >
          <Settings className="h-4 w-4 text-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md bg-card border-border">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Settings className="w-5 h-5 text-primary" />
            Settings
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Manage your AI preferences, language, and conversation data.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Thinking Persona */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Assistant Personality
            </Label>
            <Select value={personality} onValueChange={onPersonalityChange}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reasoning">
                  Deep Reasoning (Step-by-step logic and verified conclusions)
                </SelectItem>
                <SelectItem value="professional">
                  Professional & Authoritative (Comprehensive and academic)
                </SelectItem>
                <SelectItem value="friendly">
                  Friendly & Conversational (Supportive and warm)
                </SelectItem>
                <SelectItem value="concise">
                  Concise & Direct (Fast answers without filler)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" />
              Response Language
            </Label>
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English (US/UK)</SelectItem>
                <SelectItem value="es">Spanish (Español)</SelectItem>
                <SelectItem value="fr">French (Français)</SelectItem>
                <SelectItem value="de">Deutsch (German)</SelectItem>
                <SelectItem value="zh">Chinese (中文)</SelectItem>
                <SelectItem value="ja">Japanese (日本語)</SelectItem>
                <SelectItem value="pt">Portuguese (Português)</SelectItem>
                <SelectItem value="ar">Arabic (العربية)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Privacy & Security Card */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/40 space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
              <Shield className="w-4 h-4 text-primary" />
              <span>Security & Privacy</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your conversations, uploaded images, and OCR data are processed securely with multi-tenant isolation and parameterized protection.
            </p>
          </div>

          {/* Data Management */}
          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="text-xs font-semibold text-destructive">Danger Zone</Label>
            <Button
              variant="outline"
              onClick={handleClearHistory}
              className="w-full text-xs text-destructive hover:bg-destructive/10 border-destructive/30 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Chat History</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
