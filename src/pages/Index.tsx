import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage, { type AttachmentItem } from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { ChatSettings } from "@/components/ChatSettings";
import { ChatHistory } from "@/components/ChatHistory";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { chatStorageService } from "@/services/chatStorageService";
import { aiService, type AIServiceConfig, type MessagePayload } from "@/services/aiService";
import lowkeyLogo from "@/assets/lowkey-logo.png";
import { Bookmark, BookmarkCheck, Globe, Lightbulb, Code2, Calculator, Sparkles, Square } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: AttachmentItem[];
}

const getCleanWelcomeMessage = (currentUser?: any): Message => {
  if (currentUser && !currentUser.isGuest) {
    const name = currentUser.displayName || currentUser.email?.split("@")[0] || "friend";
    return {
      role: "assistant",
      content: `Hello ${name}! Welcome to Lowkey AI. Your personal workspace is completely clean and ready. What would you like to explore today?`,
    };
  }
  return {
    role: "assistant",
    content:
      "Hello! I am Lowkey AI. I can answer questions about global news anywhere in the world, transcribe images and documents via OCR, compute formulas, write code, and assist you with anything. How can I help you today?",
  };
};

const STARTER_PROMPTS = [
  {
    icon: Globe,
    title: "Global Intelligence",
    prompt: "What are the latest breakthroughs and developments in artificial intelligence today?",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: Lightbulb,
    title: "Deep Conceptual Analysis",
    prompt: "Explain how transformer neural networks and attention mechanisms work with a simple analogy.",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: Code2,
    title: "Code Architecture",
    prompt: "Write a high-performance Python script to parse and analyze real-time streaming data.",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: Calculator,
    title: "Mathematical Formulas",
    prompt: "Solve this step-by-step using LaTeX: Find the roots and vertex of 3x^2 - 12x + 9 = 0.",
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
];

// Helper to convert files into AttachmentItems (images -> base64 dataUrl, documents -> textContent)
const processFiles = async (files: File[]): Promise<AttachmentItem[]> => {
  return Promise.all(
    files.map((file) => {
      return new Promise<AttachmentItem>((resolve) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              type: file.type,
              dataUrl: reader.result as string,
            });
          };
          reader.readAsDataURL(file);
        } else {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              type: file.type,
              textContent: reader.result as string,
            });
          };
          reader.readAsText(file);
        }
      });
    })
  );
};

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([getCleanWelcomeMessage(user)]);
  const [bookmarkedMessages, setBookmarkedMessages] = useState<number[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // User Settings
  const [personality, setPersonality] = useState("reasoning");
  const [language, setLanguage] = useState("en");
  const [aiConfig, setAIConfig] = useState<AIServiceConfig>({
    personality: "reasoning",
    language: "en",
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevUidRef = useRef<string | undefined>(user?.uid);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Clean reset when someone new signs up, logs in, or switches accounts
  useEffect(() => {
    if (prevUidRef.current !== user?.uid) {
      prevUidRef.current = user?.uid;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setCurrentConversationId(null);
      setMessages([getCleanWelcomeMessage(user)]);
      setBookmarkedMessages([]);
      setShowBookmarks(false);
      setHistoryRefreshKey((k) => k + 1);
    }
  }, [user?.uid, user]);

  const loadConversation = async (conversationId: string) => {
    const effectiveUid = user?.uid || "guest_anon";
    try {
      const dbMsgs = await chatStorageService.getMessages(effectiveUid, conversationId);
      if (dbMsgs && dbMsgs.length > 0) {
        setMessages(dbMsgs.map((m) => ({ role: m.role, content: m.content })));
      } else {
        setMessages([getCleanWelcomeMessage(user)]);
      }
    } catch (err: any) {
      toast({
        title: "Error Loading Messages",
        description: err.message || "Failed to load chat history.",
        variant: "destructive",
      });
    }
  };

  const handleSelectConversation = (conversationId: string | null) => {
    if (isLoading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setCurrentConversationId(conversationId);
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      handleNewChat();
    }
  };

  const handleNewChat = useCallback(() => {
    if (isLoading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setCurrentConversationId(null);
    setMessages([getCleanWelcomeMessage(user)]);
    setBookmarkedMessages([]);
    setShowBookmarks(false);
  }, [isLoading, user]);

  // Instant Stop: aborts the active stream and cleans up pending tokens
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    // Remove trailing empty assistant message if it was still thinking
    setMessages((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].role === "assistant" && !prev[prev.length - 1].content.trim()) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    toast({
      title: "Stopped",
      description: "Chatbot generation stopped.",
    });
  };

  const handleClearAllChats = async () => {
    const effectiveUid = user?.uid || "guest_anon";
    try {
      await chatStorageService.clearAllConversations(effectiveUid);
      handleNewChat();
      setHistoryRefreshKey((k) => k + 1);
      toast({
        title: "History Cleared",
        description: "All conversations have been erased.",
      });
    } catch (err: any) {
      toast({
        title: "Clear Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    const hasFiles = Boolean(files && files.length > 0);
    if ((!content.trim() && !hasFiles) || isLoading) return;
    const effectiveUid = user?.uid || "guest_anon";

    let attachments: AttachmentItem[] = [];
    if (hasFiles && files) {
      try {
        attachments = await processFiles(files);
      } catch (fileErr) {
        console.warn("File processing notice:", fileErr);
      }
    }

    const finalContent = content.trim() || (hasFiles ? "Please analyze and transcribe this attached image/file (OCR) and explain everything clearly." : "");

    const userMessage: Message = {
      role: "user",
      content: finalContent,
      attachments,
    };

    // Immediately show user message
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setIsLoading(true);

    let convId = currentConversationId;
    if (!convId) {
      const titlePreview = finalContent.slice(0, 32) || "New Conversation";
      const newConv = chatStorageService.createConversationSync(effectiveUid, titlePreview);
      convId = newConv.id;
      setCurrentConversationId(convId);
      setHistoryRefreshKey((k) => k + 1);
    }

    if (convId) {
      // Non-blocking background save of user message (0ms latency to start streaming)
      chatStorageService.saveMessage(effectiveUid, convId, "user", finalContent).catch(() => {});
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const historyPayload: MessagePayload[] = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      }));

      let accumulatedResponse = "";

      await aiService.streamResponse(
        historyPayload,
        {
          personality: personality as any,
          language,
        },
        (chunk) => {
          accumulatedResponse += chunk;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content: accumulatedResponse,
            };
            return next;
          });
        },
        controller.signal
      );

      // Save complete assistant message in background
      if (convId && accumulatedResponse.trim()) {
        chatStorageService.saveMessage(effectiveUid, convId, "assistant", accumulatedResponse).catch(() => {});
        setHistoryRefreshKey((k) => k + 1);
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.message === "Aborted") return;
      console.error("Chat Error:", error);
      toast({
        title: "Chat Error",
        description: error.message || "Failed to generate AI response. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === "assistant" && !next[next.length - 1].content.trim()) {
          next[next.length - 1] = {
            role: "assistant",
            content: "I apologize, but I encountered an issue connecting to the AI models. Please check your network connection or API settings and try again.",
          };
        }
        return next;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Edit and Resend: Truncates history to this point and re-triggers AI stream
  const handleEditMessage = async (messageIndex: number, newContent: string) => {
    if (isLoading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const effectiveUid = user?.uid || "guest_anon";
    const originalAttachments = messages[messageIndex]?.attachments || [];

    const updatedUserMessage: Message = {
      role: "user",
      content: newContent,
      attachments: originalAttachments,
    };

    // Keep all messages before this index, add updated user message and blank assistant message
    const trimmedHistory = messages.slice(0, messageIndex);
    setMessages([...trimmedHistory, updatedUserMessage, { role: "assistant", content: "" }]);
    setIsLoading(true);

    let convId = currentConversationId;
    if (!convId) {
      const titlePreview = newContent.slice(0, 32) || "New Conversation";
      const newConv = chatStorageService.createConversationSync(effectiveUid, titlePreview);
      convId = newConv.id;
      setCurrentConversationId(convId);
      setHistoryRefreshKey((k) => k + 1);
    }

    if (convId) {
      chatStorageService.saveMessage(effectiveUid, convId, "user", newContent).catch(() => {});
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const historyPayload: MessagePayload[] = [...trimmedHistory, updatedUserMessage].map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      }));

      let accumulatedResponse = "";

      await aiService.streamResponse(
        historyPayload,
        {
          personality: personality as any,
          language,
        },
        (chunk) => {
          accumulatedResponse += chunk;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content: accumulatedResponse,
            };
            return next;
          });
        },
        controller.signal
      );

      if (convId && accumulatedResponse.trim()) {
        chatStorageService.saveMessage(effectiveUid, convId, "assistant", accumulatedResponse).catch(() => {});
        setHistoryRefreshKey((k) => k + 1);
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.message === "Aborted") return;
      console.error("Chat Error on edit:", error);
      toast({
        title: "Chat Error",
        description: error.message || "Failed to generate AI response. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === "assistant" && !next[next.length - 1].content.trim()) {
          next[next.length - 1] = {
            role: "assistant",
            content: "I apologize, but I encountered an issue regenerating this response. Please try again.",
          };
        }
        return next;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const isFreshChat = messages.length === 1 && messages[0].role === "assistant";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Chat History Sidebar */}
      <ChatHistory
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        refreshTrigger={historyRefreshKey}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Clean, Minimalist Header */}
        <header className="border-b border-border bg-card/70 backdrop-blur-md sticky top-0 z-10 px-4 py-2.5">
          <div className="container mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={lowkeyLogo}
                alt="Lowkey AI"
                className="w-8 h-8 rounded-xl shadow-sm border border-border object-cover"
              />
              <div>
                <h1 className="text-base font-bold bg-gradient-primary bg-clip-text text-transparent leading-none">
                  Lowkey AI
                </h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  High Intelligence Assistant
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBookmarks(!showBookmarks)}
                className={`h-9 w-9 rounded-xl border border-border/60 bg-card/80 hover:bg-accent flex items-center justify-center transition-all shadow-sm ${
                  showBookmarks ? "text-primary bg-primary/10 border-primary/40" : "text-foreground"
                }`}
                title={showBookmarks ? "Show all messages" : "Show bookmarked"}
              >
                {showBookmarks ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </Button>

              <ThemeToggle />

              <ChatSettings
                personality={personality}
                language={language}
                aiConfig={aiConfig}
                onPersonalityChange={setPersonality}
                onLanguageChange={setLanguage}
                onAIConfigChange={setAIConfig}
              />

              <UserProfileMenu onClearChats={handleClearAllChats} />
            </div>
          </div>
        </header>

        {/* Chat Scroll Area */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="container mx-auto max-w-3xl py-6">
            {(showBookmarks ? messages.filter((_, i) => bookmarkedMessages.includes(i)) : messages).map(
              (message, index) => {
                const actualIndex = showBookmarks ? messages.indexOf(message) : index;
                return (
                  <div key={actualIndex} className="relative group">
                    <ChatMessage
                      role={message.role}
                      content={message.content}
                      attachments={message.attachments}
                      canEdit={!isLoading}
                      onEdit={(newText) => handleEditMessage(actualIndex, newText)}
                    />
                    {message.role === "assistant" && message.content && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-lg"
                        onClick={() => {
                          setBookmarkedMessages((prev) =>
                            prev.includes(actualIndex)
                              ? prev.filter((i) => i !== actualIndex)
                              : [...prev, actualIndex]
                          );
                        }}
                        title="Bookmark message"
                      >
                        {bookmarkedMessages.includes(actualIndex) ? (
                          <BookmarkCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <Bookmark className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              }
            )}

            {/* Quick Starter Cards for Clean/New Chat */}
            {isFreshChat && !isLoading && (
              <div className="mt-8 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 mb-3 px-1 text-xs font-semibold text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Suggested starters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STARTER_PROMPTS.map((item, idx) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(item.prompt)}
                        className="text-left p-3.5 rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 group flex items-start gap-3 select-none"
                      >
                        <div className={`p-2 rounded-xl border ${item.color} shrink-0 mt-0.5 group-hover:scale-110 transition-transform`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.prompt}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pulsing indicator while waiting for first token */}
            {isLoading && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
              <div className="flex items-center justify-between p-4 my-2 rounded-2xl bg-card border border-border shadow-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="font-medium text-foreground">Thinking...</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStopGenerating}
                  className="h-7 px-2.5 gap-1.5 rounded-lg border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs font-medium transition-all"
                  title="Stop generating"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </Button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Clean, Sleek Input Area */}
        <div className="border-t border-border bg-card/60 backdrop-blur-md p-4">
          <div className="container mx-auto max-w-3xl space-y-2">
            <ChatInput
              onSend={handleSendMessage}
              disabled={isLoading}
              onStop={handleStopGenerating}
              onTranscript={handleSendMessage}
            />

            <div className="flex items-center justify-center text-[11px] text-muted-foreground/70 text-center">
              <span>Lowkey AI can make mistakes. Consider checking important information.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
