import { useState, FormEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((message.trim() || files.length > 0) && !disabled) {
      onSend(message, files);
      setMessage("");
      setFiles([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      toast({
        title: "Files attached",
        description: `${newFiles.length} file(s) attached`,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2 items-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="*/*"
          className="hidden"
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          size="icon"
          variant="outline"
          className="h-10 w-10 flex-shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={files.length > 0 ? `${files.length} file(s) attached...` : "Type your message here..."}
            disabled={disabled}
            className="h-10 max-h-[200px] resize-none bg-card border-border py-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>
        <Button
          type="submit"
          disabled={(!message.trim() && files.length === 0) || disabled}
          size="icon"
          className="h-10 w-10 flex-shrink-0 bg-gradient-primary hover:opacity-90 transition-opacity"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default ChatInput;
