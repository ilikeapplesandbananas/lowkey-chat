import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export interface DBConversation {
  id: string;
  title: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
}

export interface DBMessage {
  id?: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
}

// Track if Firestore is disabled/unreachable in project (e.g. API disabled in GCP)
let isFirestoreAvailable = true;

// Helper to run any Firestore promise with a fast timeout (prevents SDK retry hanging)
const withFirestoreTimeout = <T>(promise: Promise<T>, timeoutMs = 1000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore timeout")), timeoutMs)
    ),
  ]);
};

// Security & Sanitization Helper
export const sanitizeText = (input: string): string => {
  if (!input) return "";
  let clean = input.replace(/\0/g, "");
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/[\u2014\u2015]/g, ", ");
  clean = clean.replace(/\u2013/g, " - ");
  return clean.trim();
};

const getLocalConvKey = (userId: string) => `lowkey_convs_${userId}`;
const getLocalMsgKey = (userId: string, convId: string) => `lowkey_msgs_${userId}_${convId}`;

export const chatStorageService = {
  // Synchronous, non-blocking local conversation creator (guarantees 0ms latency)
  createConversationSync(userId: string, firstMessage: string): DBConversation {
    const cleanFirstMsg = sanitizeText(firstMessage);
    const title = cleanFirstMsg.slice(0, 40) + (cleanFirstMsg.length > 40 ? "..." : "") || "New Chat";
    const now = Date.now();
    const id = "conv_" + Math.random().toString(36).substring(2, 10) + "_" + now;

    const newConv: DBConversation = {
      id,
      title,
      userId,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    this.saveLocalConversation(userId, newConv);

    // Background Firestore attempt (never blocks)
    if (db && isFirestoreAvailable) {
      withFirestoreTimeout(
        addDoc(collection(db, "conversations"), {
          title,
          userId,
          archived: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        1000
      ).catch((err) => {
        isFirestoreAvailable = false;
        console.warn("Cloud Firestore disabled in project; using fast local storage:", err.message);
      });
    }

    return newConv;
  },

  // 1. Conversations Management
  async getConversations(userId: string): Promise<DBConversation[]> {
    if (!userId) return [];

    // Local-first strategy: always load local cache immediately
    const localConvs = this.getLocalConversations(userId);

    // Background sync with Firestore if available
    if (db && isFirestoreAvailable) {
      try {
        const convRef = collection(db, "conversations");
        const q = query(convRef, where("userId", "==", userId), orderBy("updatedAt", "desc"));
        const snap = await withFirestoreTimeout(getDocs(q), 1000);
        const remoteItems: DBConversation[] = [];
        snap.forEach((d) => {
          const data = d.data();
          remoteItems.push({
            id: d.id,
            title: data.title || "Untitled Chat",
            userId: data.userId,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
            updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
            archived: Boolean(data.archived),
          });
        });
        if (remoteItems.length > 0) return remoteItems;
      } catch (err: any) {
        isFirestoreAvailable = false;
        console.warn("Firestore sync skipped; using local storage:", err.message);
      }
    }

    return localConvs;
  },

  getLocalConversations(userId: string): DBConversation[] {
    try {
      const myRaw = localStorage.getItem(getLocalConvKey(userId));
      const myConvs: DBConversation[] = myRaw ? JSON.parse(myRaw).map((c: any) => ({ ...c, archived: Boolean(c.archived) })) : [];
      const seenIds = new Set(myConvs.map((c) => c.id));

      // Scan localStorage for any other lowkey_convs_* (e.g. guest sessions or legacy accounts) so chats never disappear
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("lowkey_convs_") && key !== getLocalConvKey(userId)) {
          try {
            const otherRaw = localStorage.getItem(key);
            if (otherRaw) {
              const otherList: DBConversation[] = JSON.parse(otherRaw);
              for (const c of otherList) {
                if (!seenIds.has(c.id)) {
                  seenIds.add(c.id);
                  myConvs.push({ ...c, archived: Boolean(c.archived) });
                }
              }
            }
          } catch {}
        }
      }

      myConvs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return myConvs;
    } catch {}
    return [];
  },

  async createConversation(userId: string, firstMessage: string): Promise<DBConversation> {
    return this.createConversationSync(userId, firstMessage);
  },

  async updateConversationTitle(userId: string, conversationId: string, title: string) {
    const cleanTitle = sanitizeText(title);

    // Update local cache immediately
    try {
      const convs = this.getLocalConversations(userId);
      const updated = convs.map((c) => (c.id === conversationId ? { ...c, title: cleanTitle, updatedAt: Date.now() } : c));
      localStorage.setItem(getLocalConvKey(userId), JSON.stringify(updated));
    } catch {}

    if (db && isFirestoreAvailable) {
      withFirestoreTimeout(
        updateDoc(doc(db, "conversations", conversationId), {
          title: cleanTitle,
          updatedAt: serverTimestamp(),
        }),
        1000
      ).catch(() => {});
    }
  },

  async setConversationArchived(userId: string, conversationId: string, archived: boolean = true) {
    // Update local immediately
    try {
      const convs = this.getLocalConversations(userId);
      const updated = convs.map((c) => (c.id === conversationId ? { ...c, archived, updatedAt: Date.now() } : c));
      localStorage.setItem(getLocalConvKey(userId), JSON.stringify(updated));
    } catch {}

    if (db && isFirestoreAvailable) {
      withFirestoreTimeout(
        updateDoc(doc(db, "conversations", conversationId), {
          archived,
          updatedAt: serverTimestamp(),
        }),
        1000
      ).catch(() => {});
    }
  },

  async deleteConversation(userId: string, conversationId: string) {
    // Delete local immediately
    try {
      const convs = this.getLocalConversations(userId);
      const filtered = convs.filter((c) => c.id !== conversationId);
      localStorage.setItem(getLocalConvKey(userId), JSON.stringify(filtered));
      localStorage.removeItem(getLocalMsgKey(userId, conversationId));
    } catch {}

    if (db && isFirestoreAvailable) {
      withFirestoreTimeout(deleteDoc(doc(db, "conversations", conversationId)), 1000).catch(() => {});
    }
  },

  async clearAllConversations(userId: string) {
    const convs = this.getLocalConversations(userId);
    for (const c of convs) {
      localStorage.removeItem(getLocalMsgKey(userId, c.id));
    }
    localStorage.removeItem(getLocalConvKey(userId));
  },

  saveLocalConversation(userId: string, conv: DBConversation) {
    try {
      const raw = localStorage.getItem(getLocalConvKey(userId));
      const list: DBConversation[] = raw ? JSON.parse(raw) : [];
      list.unshift(conv);
      localStorage.setItem(getLocalConvKey(userId), JSON.stringify(list));
    } catch {}
  },

  // 2. Messages Management (Non-blocking, Local-First)
  async getMessages(userId: string, conversationId: string): Promise<DBMessage[]> {
    if (!conversationId) return [];

    // Local-first: always return local messages immediately
    try {
      const raw = localStorage.getItem(getLocalMsgKey(userId, conversationId));
      if (raw) {
        const msgs: DBMessage[] = JSON.parse(raw);
        if (msgs.length > 0) return msgs;
      }
      // Scan for conversation messages across all guest/user keys so chats never disappear
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("lowkey_msgs_") && k.endsWith(`_${conversationId}`)) {
          const fallbackRaw = localStorage.getItem(k);
          if (fallbackRaw) {
            const fallbackMsgs: DBMessage[] = JSON.parse(fallbackRaw);
            if (fallbackMsgs.length > 0) return fallbackMsgs;
          }
        }
      }
    } catch {}

    // Fallback to Firestore if local is empty
    if (db && isFirestoreAvailable) {
      try {
        const msgRef = collection(db, "conversations", conversationId, "messages");
        const q = query(msgRef, orderBy("createdAt", "asc"));
        const snap = await withFirestoreTimeout(getDocs(q), 1000);
        const msgs: DBMessage[] = [];
        snap.forEach((d) => {
          const data = d.data();
          msgs.push({
            id: d.id,
            conversationId,
            userId: data.userId || userId,
            role: data.role,
            content: data.content,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
          });
        });
        if (msgs.length > 0) return msgs;
      } catch (err: any) {
        isFirestoreAvailable = false;
        console.warn("Firestore messages load skipped:", err.message);
      }
    }

    return [];
  },

  async saveMessage(userId: string, conversationId: string, role: "user" | "assistant" | "system", content: string): Promise<DBMessage> {
    const cleanContent = sanitizeText(content);
    const now = Date.now();
    const msg: DBMessage = {
      conversationId,
      userId,
      role,
      content: cleanContent,
      createdAt: now,
    };

    // Save to local storage IMMEDIATELY (0ms, 100% reliable)
    try {
      const key = getLocalMsgKey(userId, conversationId);
      const raw = localStorage.getItem(key);
      const list: DBMessage[] = raw ? JSON.parse(raw) : [];
      list.push(msg);
      localStorage.setItem(key, JSON.stringify(list));

      // Bump conversation updated timestamp in local cache
      const convKey = getLocalConvKey(userId);
      const convRaw = localStorage.getItem(convKey);
      if (convRaw) {
        const convList: DBConversation[] = JSON.parse(convRaw);
        const target = convList.find((c) => c.id === conversationId);
        if (target) {
          target.updatedAt = now;
          localStorage.setItem(convKey, JSON.stringify(convList));
        }
      }
    } catch {}

    // Background Firestore attempt (non-blocking)
    if (db && isFirestoreAvailable) {
      withFirestoreTimeout(
        addDoc(collection(db, "conversations", conversationId, "messages"), {
          userId,
          role,
          content: cleanContent,
          createdAt: serverTimestamp(),
        }),
        1000
      ).catch(() => {
        isFirestoreAvailable = false;
      });
    }

    return msg;
  },
};
