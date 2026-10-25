import { useState, useEffect, useMemo } from "react";
import { Plus, Search, MessageSquare, Trash2, Edit2, Check, X, Archive, ArchiveRestore, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { chatStorageService, type DBConversation } from "@/services/chatStorageService";
import { useToast } from "@/hooks/use-toast";

interface ChatHistoryProps {
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
  onNewChat: () => void;
  refreshTrigger?: number;
}

export function ChatHistory({
  currentConversationId,
  onSelectConversation,
  onNewChat,
  refreshTrigger = 0,
}: ChatHistoryProps) {
  const { user } = useAuth();
  const effectiveUid = user?.uid || "guest_anon";

  const [conversations, setConversations] = useState<DBConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
  }, [effectiveUid, refreshTrigger]);

  const loadConversations = async () => {
    try {
      const items = await chatStorageService.getConversations(effectiveUid);
      setConversations(items);
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await chatStorageService.deleteConversation(effectiveUid, id);
      if (currentConversationId === id) {
        onNewChat();
      }
      loadConversations();
      toast({ title: "Chat Deleted", description: "The conversation was removed." });
    } catch (err: any) {
      toast({ title: "Delete Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleArchive = async (id: string, currentlyArchived: boolean) => {
    try {
      await chatStorageService.setConversationArchived(effectiveUid, id, !currentlyArchived);
      loadConversations();
      toast({
        title: currentlyArchived ? "Chat Restored" : "Chat Archived",
        description: currentlyArchived
          ? "Conversation moved back to active chats."
          : "Conversation moved to your archives.",
      });
    } catch (err: any) {
      toast({ title: "Archive Error", description: err.message, variant: "destructive" });
    }
  };

  const handleStartRename = (conv: DBConversation) => {
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = async (id: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    await chatStorageService.updateConversationTitle(effectiveUid, id, editingTitle.trim());
    setEditingId(null);
    loadConversations();
  };

  const archivedCount = useMemo(() => {
    return conversations.filter((c) => c.archived).length;
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const list = conversations.filter((c) =>
      activeTab === "archived" ? Boolean(c.archived) : !c.archived
    );
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, activeTab, searchQuery]);

  // Group by date
  const grouped = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const sevenDaysAgo = today - 7 * 24 * 60 * 60 * 1000;

    const groups: { label: string; items: DBConversation[] }[] = [
      { label: "Today", items: [] },
      { label: "Previous 7 Days", items: [] },
      { label: "Older", items: [] },
    ];

    filteredConversations.forEach((conv) => {
      if (conv.updatedAt >= today) {
        groups[0].items.push(conv);
      } else if (conv.updatedAt >= sevenDaysAgo) {
        groups[1].items.push(conv);
      } else {
        groups[2].items.push(conv);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  }, [filteredConversations]);

  return (
    <div className="w-64 border-r border-border bg-card/95 flex flex-col h-full select-none">
      {/* Top Action Bar */}
      <div className="p-3 border-b border-border space-y-2">
        <Button
          onClick={onNewChat}
          className="w-full bg-gradient-primary hover:opacity-90 shadow-sm font-medium text-xs flex items-center justify-center gap-2 py-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </Button>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-muted/40 border-border"
          />
        </div>

        {/* Active vs Archived Toggle */}
        <div className="flex rounded-lg bg-muted/60 p-0.5 text-[11px] font-medium border border-border/50">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-1 rounded-md text-center transition-all ${
              activeTab === "active"
                ? "bg-card text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Chats
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archived")}
            className={`flex-1 py-1 rounded-md text-center transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "archived"
                ? "bg-card text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Archived</span>
            {archivedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
                {archivedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {grouped.length === 0 ? (
            <div className="text-center py-10 px-4 text-xs text-muted-foreground">
              {searchQuery
                ? "No matching conversations found"
                : activeTab === "archived"
                ? "No archived conversations yet. You can archive any chat using the archive icon."
                : "No conversations yet. Start a new chat!"}
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {group.label}
                </div>
                {group.items.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      currentConversationId === conversation.id
                        ? "bg-accent text-accent-foreground font-medium"
                        : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {editingId === conversation.id ? (
                      <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="h-6 text-xs px-1.5 py-0"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(conversation.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveRename(conversation.id)}
                          className="p-1 hover:text-green-500"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          className="flex items-center gap-2 flex-1 min-w-0"
                          onClick={() => onSelectConversation(conversation.id)}
                        >
                          <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                          <span className="truncate">{conversation.title}</span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Archive / Unarchive Button */}
                          <button
                            className="p-1 hover:text-foreground rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleArchive(conversation.id, Boolean(conversation.archived));
                            }}
                            title={conversation.archived ? "Unarchive chat" : "Archive chat"}
                          >
                            {conversation.archived ? (
                              <ArchiveRestore className="h-3 w-3 text-primary" />
                            ) : (
                              <Archive className="h-3 w-3" />
                            )}
                          </button>

                          {/* Rename Button */}
                          <button
                            className="p-1 hover:text-foreground rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(conversation);
                            }}
                            title="Rename"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>

                          {/* Delete Button */}
                          <button
                            className="p-1 hover:text-destructive rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(conversation.id);
                            }}
                            title="Delete conversation"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
