import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import VoiceInput from "@/components/VoiceInput";
import ChatSettings from "@/components/ChatSettings";
import { ChatHistory } from "@/components/ChatHistory";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import lowkeyLogo from "@/assets/lowkey-logo.png";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey there! 👋 I'm Lowkey AI, your helpful assistant. I'm here to chat, answer questions, help with tasks, and more. What can I help you with today?",
    },
  ]);
  const [bookmarkedMessages, setBookmarkedMessages] = useState<number[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [personality, setPersonality] = useState("friendly");
  const [language, setLanguage] = useState("en");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversation = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error loading conversation",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data && data.length > 0) {
      setMessages(data.map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.content })));
    }
  };

  const saveMessage = async (role: "user" | "assistant", content: string) => {
    if (!currentConversationId) return;

    await supabase.from("messages").insert({
      conversation_id: currentConversationId,
      role,
      content,
    });
  };

  const createNewConversation = async (firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    const { data, error } = await supabase
      .from("conversations")
      .insert({ title })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating conversation",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    return data.id;
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([
      {
        role: "assistant",
        content: "Hey there! 👋 I'm Lowkey AI, your helpful assistant. I'm here to chat, answer questions, help with tasks, and more. What can I help you with today?",
      },
    ]);
    setBookmarkedMessages([]);
    setShowBookmarks(false);
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    // Note: File handling can be added to the backend in future iterations
    if (files && files.length > 0) {
      toast({
        title: "Files received",
        description: "File analysis will be added in a future update",
      });
    }

    // Create conversation if this is the first message
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createNewConversation(content);
      if (!conversationId) return;
      setCurrentConversationId(conversationId);
    }

    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message
    await saveMessage("user", content);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            personality,
            language,
          }),
        }
      );

      if (!response.ok || !response.body) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let streamDone = false;
      let textBuffer = "";

      // Add initial assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantMessage += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantMessage,
                };
                return newMessages;
              });
            }
          } catch {
            // Incomplete JSON, put it back
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Process remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantMessage += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantMessage,
                };
                return newMessages;
              });
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      // Remove the empty assistant message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    handleSendMessage(transcript);
  };

  // Speak the last assistant message when it's complete
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && !isLoading && (window as any).speakResponse) {
      // Optional: Auto-speak responses
      // (window as any).speakResponse(lastMessage.content);
    }
  }, [messages, isLoading]);

  return (
    <div className="flex h-screen bg-background">
      {/* Chat History Sidebar */}
      <ChatHistory
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onNewChat={handleNewChat}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={lowkeyLogo} alt="Lowkey AI" className="w-12 h-12 rounded-full shadow-lg" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Lowkey AI
                </h1>
                <p className="text-xs text-muted-foreground">your helpful assistant 💜</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBookmarks(!showBookmarks)}
                className={showBookmarks ? "text-primary" : ""}
              >
                <Bookmark className="h-5 w-5" />
              </Button>
              <ThemeToggle />
              <ChatSettings
                personality={personality}
                language={language}
                onPersonalityChange={setPersonality}
                onLanguageChange={setLanguage}
              />
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="container mx-auto max-w-3xl py-6">
            {(showBookmarks ? messages.filter((_, i) => bookmarkedMessages.includes(i)) : messages).map((message, index) => {
              const actualIndex = showBookmarks ? messages.indexOf(message) : index;
              return (
                <div key={actualIndex} className="relative group">
                  <ChatMessage role={message.role} content={message.content} />
                  {message.role === "assistant" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setBookmarkedMessages(prev =>
                          prev.includes(actualIndex)
                            ? prev.filter(i => i !== actualIndex)
                            : [...prev, actualIndex]
                        );
                      }}
                    >
                      {bookmarkedMessages.includes(actualIndex) ? (
                        <BookmarkCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3 p-4">
                <div className="bg-card border border-border rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto max-w-3xl p-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <ChatInput onSend={handleSendMessage} disabled={isLoading} />
              </div>
              <VoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
