import { useState, FormEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Initialize speech recognition
  if (recognitionRef.current === null && typeof window !== "undefined") {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage((prev) => prev + (prev ? " " : "") + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "Voice input error",
          description: "Could not recognize speech. Please try again.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }

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
      setFiles((prev) => [...prev, ...newFiles]);
      toast({
        title: "Files attached",
        description: `${newFiles.length} file(s) attached`,
      });
    }
  };

  const toggleVoiceMemo = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not supported",
        description: "Voice input is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting recognition:", error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            files.length > 0 ? `${files.length} file(s) attached...` : "Type your message here..."
          }
          disabled={disabled}
          className="min-h-12 max-h-[200px] resize-none bg-card border border-border rounded-lg px-4 py-3 pr-32 text-base leading-relaxed shadow-sm hover:border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        {/* Input Controls - Inside the textarea area */}
        <div className="absolute right-2 bottom-2 flex gap-1">
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
            variant="ghost"
            className="h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            onClick={toggleVoiceMemo}
            disabled={disabled}
            size="icon"
            variant="ghost"
            className={`h-8 w-8 transition-colors ${
              isListening
                ? "bg-red-500 text-white hover:bg-red-600"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            title="Voice memo (speech to text)"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            type="submit"
            disabled={(!message.trim() && files.length === 0) || disabled}
            size="icon"
            className="h-8 w-8 bg-gradient-primary hover:opacity-90 transition-opacity rounded"
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;
