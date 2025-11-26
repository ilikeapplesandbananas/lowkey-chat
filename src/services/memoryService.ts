import { supabase } from "@/integrations/supabase/client";

export interface Memory {
  id?: string;
  key: string;
  value: string;
  isSensitive: boolean;
  created_at?: string;
}

export const memoryService = {
  async saveMemory(memory: Memory): Promise<Memory | null> {
    try {
      // Temporarily store in localStorage until database table is set up
      const memories = JSON.parse(localStorage.getItem("memories") || "[]");
      const newMemory = {
        ...memory,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      memories.push(newMemory);
      localStorage.setItem("memories", JSON.stringify(memories));
      return newMemory;
    } catch (error) {
      console.error("Error saving memory:", error);
      return null;
    }
  },

  async getMemory(key: string): Promise<Memory | null> {
    try {
      const memories = JSON.parse(localStorage.getItem("memories") || "[]");
      return memories.find((m: Memory) => m.key === key) || null;
    } catch (error) {
      console.error("Error retrieving memory:", error);
      return null;
    }
  },

  async getAllMemories(): Promise<Memory[]> {
    try {
      return JSON.parse(localStorage.getItem("memories") || "[]");
    } catch (error) {
      console.error("Error retrieving memories:", error);
      return [];
    }
  },

  async deleteMemory(id: string): Promise<boolean> {
    try {
      const memories = JSON.parse(localStorage.getItem("memories") || "[]");
      const filtered = memories.filter((m: Memory) => m.id !== id);
      localStorage.setItem("memories", JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error("Error deleting memory:", error);
      return false;
    }
  },

  async updateMemory(id: string, value: string): Promise<Memory | null> {
    try {
      const memories = JSON.parse(localStorage.getItem("memories") || "[]");
      const memory = memories.find((m: Memory) => m.id === id);
      if (memory) {
        memory.value = value;
        localStorage.setItem("memories", JSON.stringify(memories));
        return memory;
      }
      return null;
    } catch (error) {
      console.error("Error updating memory:", error);
      return null;
    }
  },
};
