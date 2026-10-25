import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Paperclip, Mic, MicOff, X, FileText, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
  onStop?: () => void;
  onTranscript?: (text: string) => void;
}

interface FilePreview {
  file: File;
  previewUrl?: string;
  isImage: boolean;
}

const ChatInput = ({ onSend, disabled, onStop, onTranscript }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Generate object URLs for image previews
    const previews: FilePreview[] = files.map((file) => {
      const isImage = file.type.startsWith("image/");
      return {
        file,
        isImage,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      };
    });
    setFilePreviews(previews);

    return () => {
      previews.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, [files]);

  useEffect(() => {
    // Initialize Web Speech API for voice dictation
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            setMessage((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition notice:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser does not support Web Speech Recognition.",
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
        toast({
          title: "Listening",
          description: "Speak clearly into your microphone...",
        });
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && files.length === 0) || disabled) return;

    onSend(message, files.length > 0 ? files : undefined);
    setMessage("");
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      toast({
        title: "Files attached",
        description: `${newFiles.length} file(s) attached for OCR and analysis`,
      });
    }
  };

  // Support direct clipboard paste (Ctrl+V) for images and screenshots
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        setFiles((prev) => [...prev, ...pastedFiles]);
        toast({
          title: "Image pasted",
          description: `${pastedFiles.length} image(s) attached for OCR and analysis`,
        });
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = Math.min(target.scrollHeight, 180) + "px";
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative rounded-2xl border border-border/80 bg-card/90 shadow-lg backdrop-blur-sm focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all p-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,.pdf,.txt,.py,.js,.ts,.tsx,.json,.csv,.md"
          multiple
          className="hidden"
        />

        {/* Multimodal File & Image Previews */}
        {filePreviews.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-2.5 pt-0.5 border-b border-border/40 mb-2">
            {filePreviews.map((item, i) => (
              <div
                key={i}
                className="group relative flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-muted/80 border border-border text-xs text-foreground shadow-sm animate-in fade-in-50 zoom-in-95"
              >
                {item.isImage && item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="h-10 w-10 rounded-lg object-cover border border-border/60"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="flex flex-col max-w-[140px]">
                  <span className="font-medium truncate text-[11px]">{item.file.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {(item.file.size / 1024).toFixed(1)} KB {item.isImage ? " - OCR" : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-1 h-5 w-5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center text-muted-foreground transition-colors"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onPaste={handlePaste}
          placeholder={files.length > 0 ? "Ask anything about this image or file..." : "Message Lowkey AI or paste images for OCR..."}
          disabled={disabled}
          rows={1}
          className="min-h-[44px] max-h-[180px] w-full resize-none border-0 bg-transparent p-1 text-sm focus-visible:ring-0 shadow-none leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        {/* Clean Bottom Controls Toolbar */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Attach files or images"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              onClick={toggleListening}
              disabled={disabled}
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-lg transition-colors ${
                isListening
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {disabled && onStop ? (
              <Button
                type="button"
                onClick={onStop}
                size="sm"
                variant="destructive"
                className="h-8 gap-1.5 px-3 rounded-xl shadow-sm transition-all text-xs font-semibold"
                title="Stop chatbot generation"
              >
                <Square className="h-3 w-3 fill-current" />
                <span>Stop</span>
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!message.trim() && files.length === 0}
                size="icon"
                className="h-8 w-8 rounded-xl bg-gradient-primary hover:opacity-90 disabled:opacity-30 transition-all shadow-sm"
                title="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;
