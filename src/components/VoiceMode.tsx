import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mic, MicOff, Volume2, Phone, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceModeProps {
  onMessage: (message: string) => void;
  isLoading?: boolean;
}

const VoiceMode = ({ onMessage, isLoading }: VoiceModeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Initialize speech recognition
  useEffect(() => {
    if (recognitionRef.current === null && typeof window !== "undefined") {
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition =
          (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              setTranscript((prev) => prev + transcript + " ");
            } else {
              interimTranscript += transcript;
            }
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
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
  }, [toast]);

  const startListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not supported",
        description: "Voice mode is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      setTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error starting recognition:", error);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const sendTranscript = () => {
    if (transcript.trim()) {
      onMessage(transcript.trim());
      setTranscript("");
      // Auto-start listening after sending for continuous conversation
      setTimeout(() => {
        startListening();
      }, 500);
    }
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        // Auto-start listening after AI speaks for continuous conversation
        setTimeout(() => {
          startListening();
        }, 500);
      };
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const exitVoiceMode = () => {
    stopListening();
    stopSpeaking();
    setTranscript("");
    setIsOpen(false);
  };

  // Expose speak function to parent
  useEffect(() => {
    (window as any).speakResponse = speakText;
    return () => {
      delete (window as any).speakResponse;
    };
  }, []);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 border-0 transition-opacity"
        title="Start voice conversation"
      >
        <Phone className="h-4 w-4 mr-2" />
        Voice Mode
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          exitVoiceMode();
        } else {
          setIsOpen(true);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-500" />
              Voice Conversation
            </DialogTitle>
            <DialogDescription>
              Speak naturally with the AI assistant. Your speech will be converted to text and the
              AI will respond with voice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6">
            {/* Listening Status */}
            <div className={`p-4 rounded-lg border-2 transition-all ${
              isListening
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            }`}>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                {isListening ? "🎤 Listening..." : "Listening paused"}
              </p>
              <p className="text-sm min-h-12 leading-relaxed">
                {transcript || (isListening ? "Waiting for speech..." : "Click 'Start' to begin")}
              </p>
            </div>

            {/* Speaking Status */}
            {isSpeaking && (
              <div className="p-4 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-950">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                  <Volume2 className="h-4 w-4 animate-pulse" />
                  AI is speaking...
                </p>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2 flex-wrap justify-center">
              {!isListening && !isLoading ? (
                <Button onClick={startListening} className="bg-blue-500 hover:bg-blue-600">
                  <Mic className="h-4 w-4 mr-2" />
                  Start Listening
                </Button>
              ) : (
                <Button onClick={stopListening} variant="destructive">
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Listening
                </Button>
              )}

              {transcript.trim() && !isLoading && (
                <Button
                  onClick={sendTranscript}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Send
                </Button>
              )}

              {isSpeaking && (
                <Button onClick={stopSpeaking} variant="destructive">
                  <Volume2 className="h-4 w-4 mr-2" />
                  Stop Speaking
                </Button>
              )}
            </div>

            {/* Info */}
            <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                💡 <strong>Tip:</strong> After you speak, click Send. The AI will respond with voice
                and automatically start listening for your next message.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={exitVoiceMode}>
              <PhoneOff className="h-4 w-4 mr-2" />
              Exit Voice Mode
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VoiceMode;
