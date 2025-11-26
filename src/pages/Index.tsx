import { useState, useRef, useEffect } from "react";
import { evaluate } from "mathjs";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatSettings from "@/components/ChatSettings";
import { ChatHistory } from "@/components/ChatHistory";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import lowkeyLogo from "@/assets/lowkey-logo.png";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, PanelLeft } from "lucide-react";
import MemoryDialog from "@/components/MemoryDialog";
import { safetyService } from "@/services/safetyService";
import { processFile, ProcessedFile } from "@/lib/file-processing";
import { ChatExport } from "@/components/ChatExport";
import { useIsMobile } from "@/hooks/use-mobile";
import { memoryService } from "@/services/memoryService";

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: ProcessedFile[];
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [bookmarkedMessages, setBookmarkedMessages] = useState<number[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [personality, setPersonality] = useState("friendly");
  const [language, setLanguage] = useState("en");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [pendingMemoryData, setPendingMemoryData] = useState<{ key: string; value: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCreatedConversationAt = useRef<number>(0);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isWaitingForName, setIsWaitingForName] = useState(false);

  const initializeChat = async () => {
    const nameMemory = await memoryService.getMemory("user_name");
    if (nameMemory) {
      setMessages([{
        role: "assistant",
        content: `Welcome back, ${nameMemory.value}! 👋 What can I do for you today?`
      }]);
      setIsWaitingForName(false);
    } else {
      setMessages([{
        role: "assistant",
        content: "Hey there! 👋 I'm Lowkey AI. Let's start by telling me your name."
      }]);
      setIsWaitingForName(true);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (currentConversationId) {
      // If we just created this conversation (within last 1 second), don't load it
      // This prevents overwriting the initial message with empty state from DB
      if (Date.now() - lastCreatedConversationAt.current < 1000) {
        return;
      }
      loadConversation(currentConversationId);
    } else {
      initializeChat();
    }
  }, [currentConversationId]);

  const loadConversation = async (conversationId: string) => {
    try {
      console.log("Loading conversation:", conversationId);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      console.log("Loaded messages:", data, "Error:", error);

      if (error) {
        console.error("Error loading messages:", error);
        toast({
          title: "Error loading conversation",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data && data.length > 0) {
        const loadedMessages = data.map((msg) => ({ 
          role: msg.role as "user" | "assistant", 
          content: msg.content 
        }));
        console.log("Setting messages:", loadedMessages);
        setMessages(loadedMessages);
      } else {
        // If no messages, show empty conversation with greeting
        console.log("No messages found for conversation");
        setMessages([
          {
            role: "assistant",
            content: "Hey there! 👋 I'm Lowkey AI, your helpful assistant. What can I help you with today?",
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
      toast({
        title: "Failed to load conversation",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (messageIndex: number) => {
    const message = messages[messageIndex];
    
    // Remove from UI
    setMessages((prev) => prev.filter((_, idx) => idx !== messageIndex));
    
    // Delete from database if in a conversation
    if (currentConversationId) {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", currentConversationId)
        .eq("role", message.role)
        .eq("content", message.content);

      if (error) {
        toast({
          title: "Error deleting message",
          description: error.message,
          variant: "destructive",
        });
        // Restore the message on error
        setMessages((prev) => {
          const restored = [...prev];
          restored.splice(messageIndex, 0, message);
          return restored;
        });
      }
    }
  };

  const editMessage = async (messageIndex: number, newContent: string) => {
    const message = messages[messageIndex];
    const oldContent = message.content;
    
    // Update UI
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[messageIndex] = { ...message, content: newContent };
      return newMessages;
    });
    
    // Update DB
    if (currentConversationId) {
      const { error } = await supabase
        .from("messages")
        .update({ content: newContent })
        .eq("conversation_id", currentConversationId)
        .eq("role", message.role)
        .eq("content", oldContent);

      if (error) {
        toast({
          title: "Error updating message",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    // If user message, regenerate response
    if (message.role === "user") {
      // Truncate messages to this point
      const newHistory = messages.slice(0, messageIndex + 1);
      newHistory[messageIndex] = { ...message, content: newContent };
      
      setMessages(newHistory);
      
      // Generate new response
      await generateAIResponse(newHistory);
    }
  };

    const saveMessage = async (role: "user" | "assistant", content: string, conversationId?: string) => {
    const id = conversationId || currentConversationId;
    if (!id) return;

    await supabase.from("messages").insert({
      conversation_id: id,
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
    initializeChat();
    setBookmarkedMessages([]);
    setShowBookmarks(false);
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    // Check if user is asking for image generation
    const imageKeywords = ["generate", "create", "draw", "picture", "image", "visualize", "imagine", "make", "paint", "render"];
    const isImageRequest = imageKeywords.some(keyword => content.toLowerCase().includes(keyword));

    // Check for /remember command
    if (content.startsWith("/remember ")) {
      const memoryContent = content.slice(9).trim();
      const spaceIndex = memoryContent.indexOf(" ");

      if (spaceIndex === -1) {
        toast({
          title: "Invalid syntax",
          description: "Use: /remember key value",
          variant: "destructive",
        });
        return;
      }

      const key = memoryContent.substring(0, spaceIndex).trim();
      const value = memoryContent.substring(spaceIndex + 1).trim();

      setPendingMemoryData({ key, value });
      setMemoryDialogOpen(true);
      return;
    }

    if (isWaitingForName) {
      const name = content.trim();
      if (name.length > 0) {
        await memoryService.saveMemory({ key: "user_name", value: name, isSensitive: false });
        setIsWaitingForName(false);
        
        const userMessage: Message = { role: "user", content };
        setMessages(prev => [...prev, userMessage]);

        const response: Message = { role: "assistant", content: `Nice to meet you, ${name}! What can I do for you today?` };
        setMessages(prev => [...prev, response]);
        return;
      }
    }

    // Safety check
    const safetyCheck = safetyService.checkContent(content);
    if (!safetyCheck.isSafe) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: safetyCheck.suggestion || safetyCheck.message,
        },
      ]);
      toast({
        title: "Request declined",
        description: safetyCheck.message,
        variant: "destructive",
      });
      return;
    }

    // Process files
    let processedFiles: ProcessedFile[] = [];
    if (files && files.length > 0) {
      try {
        toast({
          title: "Processing files...",
          description: "Analyzing your attachments",
        });
        processedFiles = await Promise.all(files.map(processFile));
      } catch (error) {
        console.error("File processing error:", error);
        toast({
          title: "Error processing files",
          description: "Some files could not be read",
          variant: "destructive",
        });
      }
    }

    // Create conversation if this is the first message
    let conversationId = currentConversationId;
    if (!conversationId) {
      lastCreatedConversationAt.current = Date.now();
      conversationId = await createNewConversation(content);
      if (!conversationId) return;
      setCurrentConversationId(conversationId);
    }

    const userMessage: Message = { role: "user", content, attachments: processedFiles };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message
    let dbContent = content;
    if (processedFiles.length > 0) {
      const fileNames = processedFiles.map(f => f.name).join(", ");
      dbContent += `\n\n[Attached files: ${fileNames}]`;
    }
    await saveMessage("user", dbContent, conversationId);

    // Handle image generation requests immediately
    if (isImageRequest && processedFiles.length === 0) {
      const imageMessage: Message = { 
        role: "assistant", 
        content: `[IMAGE_GENERATION:${content}|photorealistic]` 
      };
      setMessages((prev) => [...prev, imageMessage]);
      await saveMessage("assistant", imageMessage.content, conversationId);
      setIsLoading(false);
      return;
    }

    // Generate AI response
    await generateAIResponse([...messages, userMessage]);
  };

  async function generateAIResponse(currentMessages: Message[]) {
    const lastMessage = currentMessages[currentMessages.length - 1];
    const content = lastMessage.content;
    const lowerContent = content.toLowerCase();
    const processedFiles = lastMessage.attachments || [];

    // Check for weather requests
    let systemContext = "";

    // Fetch memories to build user profile context
    try {
      const memories = await memoryService.getAllMemories();
      if (memories.length > 0) {
        const memoryContext = `\n\n[USER PROFILE & MEMORIES]:\n${memories.map(m => `- ${m.key}: ${m.value}`).join("\n")}\nIMPORTANT: Use this information to personalize your responses, match the user's vibe, and show you know them.`;
        systemContext += memoryContext;
      }
    } catch (e) {
      console.error("Failed to load memories", e);
    }
    if (lowerContent.includes("weather") || lowerContent.includes("forecast") || lowerContent.includes("temperature")) {
      try {
        let location = "";
        
        // Improved Regex to capture location
        const match = content.match(/(?:weather|forecast|temperature)\s+(?:is\s+)?(?:like\s+)?(?:in|for|at|of)\s+([a-zA-Z\s\.\-]+)/i);
        
        if (match && match[1]) {
          location = match[1].trim();
          location = location.replace(/[?.!]+$/, "");
          location = location.replace(/\s+(today|now|right now|please|tomorrow|tonight)$/i, "").trim();
        }

        if (location) {
          toast({
            title: "Checking weather...",
            description: `Looking up weather for ${location}`,
          });

          try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();
            
            if (geoData.results && geoData.results.length > 0) {
              const { latitude, longitude, name, country } = geoData.results[0];
              
              const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
              const weatherData = await weatherRes.json();
              
              if (weatherData.current) {
                const current = weatherData.current;
                const units = weatherData.current_units;
                systemContext = `\n\n[SYSTEM CONTEXT: Current weather in ${name}, ${country}:
Temperature: ${current.temperature_2m}${units.temperature_2m}
Feels like: ${current.apparent_temperature}${units.apparent_temperature}
Wind: ${current.wind_speed_10m}${units.wind_speed_10m}
Humidity: ${current.relative_humidity_2m}${units.relative_humidity_2m}
Condition Code: ${current.weather_code} (Interpret this code: 0=Clear, 1-3=Cloudy, 45-48=Fog, 51-55=Drizzle, 61-65=Rain, 71-77=Snow, 95-99=Thunderstorm)
Use this data to answer the user's question about weather.]`;
              }
            } else {
              // 2. Fallback: Open-Meteo didn't find the city, try wttr.in with the name
              console.log("Open-Meteo couldn't find location, trying wttr.in fallback");
              const wttrRes = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=3`);
              if (wttrRes.ok) {
                const text = await wttrRes.text();
                systemContext = `\n\n[SYSTEM CONTEXT: Weather for ${location} (via fallback): ${text}]`;
              }
            }
          } catch (err) {
            console.error("Primary weather fetch failed:", err);
            // 3. Final Fallback: wttr.in
            const wttrRes = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=3`);
            if (wttrRes.ok) {
              const text = await wttrRes.text();
              systemContext = `\n\n[SYSTEM CONTEXT: Weather for ${location} (via fallback): ${text}]`;
            }
          }
        } else {
           // No location detected, try auto-IP
           toast({
            title: "Checking local weather...",
            description: "Detecting weather for your location",
          });
           const weatherRes = await fetch(`https://wttr.in/?format=3`);
           if (weatherRes.ok) {
             const text = await weatherRes.text();
             systemContext = `\n\n[SYSTEM CONTEXT: Current weather (auto-detected): ${text}]`;
           }
        }
      } catch (e) {
        console.error("All weather fetch attempts failed", e);
        systemContext = `\n\n[SYSTEM CONTEXT: Weather lookup failed. Please ask the user to specify the city name clearly.]`;
      }
    }

    // Check for news requests
    if (lowerContent.includes("news") || lowerContent.includes("headlines")) {
      try {
        let topic = "";
        // Extract topic/location: "news in South Africa", "news about AI", "latest news"
        // Improved regex to capture "current news in...", "latest headlines for..."
        const match = content.match(/(?:news|headlines)(?:\s+about|\s+in|\s+for|\s+on)?\s+([a-zA-Z\s\.\-]+)/i);
        
        if (match && match[1]) {
          topic = match[1].trim();
          // Clean up common words
          const stopWords = ["about", "in", "for", "on", "the", "latest", "current", "today", "now", "right now", "please", "me", "give", "show", "check"];
          const words = topic.split(" ");
          topic = words.filter(w => !stopWords.includes(w.toLowerCase())).join(" ");
        }
        
        if (!topic || topic.length < 2) {
          topic = "World";
        }

        toast({
          title: "Fetching news...",
          description: `Searching for latest stories about: ${topic}`,
        });

        // Use Google News RSS via corsproxy.io (faster/more reliable than allorigins)
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}+when:1d&hl=en-US&gl=US&ceid=US:en`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`;
        
        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(proxyUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!response.ok) throw new Error("Proxy response not ok");
          
          const xmlText = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          const items = xmlDoc.querySelectorAll("item");
          
          if (items.length > 0) {
            let newsContext = `\n\n[SYSTEM CONTEXT: Latest News Headlines for "${topic}":\n`;
            
            // Get top 5 headlines
            let count = 0;
            items.forEach((item) => {
              if (count >= 5) return;
              const title = item.querySelector("title")?.textContent || "No title";
              const date = item.querySelector("pubDate")?.textContent || "";
              const source = item.querySelector("source")?.textContent || "Unknown Source";
              
              // Filter out empty titles
              if (title && title !== "No title") {
                newsContext += `${count + 1}. ${title} (Source: ${source}, ${date})\n`;
                count++;
              }
            });
            
            newsContext += "Use these headlines to answer the user's request. IMPORTANT: Do NOT use bullet points or numbered lists. Group the stories by theme (e.g., 'Sports', 'Politics') using bold headings. Write the news as a natural narrative or full sentences under each heading.";
            systemContext += newsContext;
            
            toast({
              title: "News found",
              description: `Found ${count} stories about ${topic}`,
            });
          } else {
            throw new Error("No news items found");
          }
        } catch (fetchErr) {
          console.error("News fetch error:", fetchErr);
          toast({
            title: "News search failed",
            description: "Could not retrieve headlines. Trying general search...",
            variant: "destructive"
          });
          // Fallback could go here, but for now just let the AI know
          systemContext += `\n\n[SYSTEM CONTEXT: Attempted to fetch news for "${topic}" but failed. Apologize and ask the user to try a different topic.]`;
        }
      } catch (e) {
        console.error("News logic error", e);
      }
    }

    // Check for math/calculation requests
    // Improved detection: Matches "calculate...", "solve...", or just "5 + 5"
    const isMathRequest = lowerContent.includes("calculate") || 
                          lowerContent.includes("solve") || 
                          lowerContent.includes("math") || 
                          /^[\d\s\(\)\+\-\*\/\^%]+$/.test(content.trim()); // Matches "2 + 2" exactly

    if (isMathRequest) {
      try {
        console.log("Math request detected:", content);
        
        // 1. First attempt: Remove common conversational words
        let expression = content.toLowerCase();
        const fillers = ["calculate", "solve", "math", "what is", "please", "compute", "evaluate", "can you", "could you", "tell me", "the result of", "answer", "is", "give me"];
        fillers.forEach(word => {
          expression = expression.replace(new RegExp(word, 'g'), "");
        });
        expression = expression.replace(/[?!=]+$/, "").trim();

        console.log("Cleaned expression:", expression);

        let result;
        let success = false;
        let solvedExpression = expression;

        try {
          result = evaluate(expression);
          success = true;
        } catch (e) {
          console.log("Direct evaluation failed, trying fallback extraction");
          // 2. Fallback: Extract only numbers and operators (for simple arithmetic like "5 + 5")
          // This ignores functions like "sqrt" but saves basic math from being broken by extra text
          const simpleMatch = content.match(/[\d\.\s\+\-\*\/\(\)\^%]+/);
          if (simpleMatch && simpleMatch[0].trim().length > 2) {
             try {
               console.log("Fallback expression:", simpleMatch[0]);
               solvedExpression = simpleMatch[0];
               result = evaluate(simpleMatch[0]);
               success = true;
             } catch (e2) {
               console.error("Math fallback failed", e2);
             }
          }
        }

        if (success && result !== undefined && typeof result !== 'function') {
            // Format result (handle complex objects if necessary)
            const resultStr = result.toString();
            console.log("Calculation success:", resultStr);
            
            toast({
              title: "Calculated",
              description: `${resultStr}`,
            });

            systemContext += `\n\n[SYSTEM CONTEXT: The user asked to calculate "${solvedExpression}". The verified result is: ${resultStr}.
IMPORTANT:
1. State the final answer clearly.
2. You MUST explain the step-by-step process of how to solve this problem.
3. Show your work.]`;
        }
      } catch (e) {
        console.error("Math logic error", e);
      }
    }

    // Check for time/date requests
    if (lowerContent.includes("time") || lowerContent.includes("date") || lowerContent.includes("day") || lowerContent.includes("year") || lowerContent.includes("month")) {
      try {
        let location = "";
        // Extract location: "time in Tokyo", "date in New York"
        const match = content.match(/(?:time|date|day|year|month)\s+(?:is\s+)?(?:it\s+)?(?:in|for|at|of)\s+([a-zA-Z\s\.\-]+)/i);
        
        if (match && match[1]) {
          location = match[1].trim().replace(/[?.!]+$/, "").replace(/\s+(today|now|right now|please|tomorrow|tonight)$/i, "").trim();
        }

        if (location) {
          toast({
            title: "Checking time...",
            description: `Looking up time for ${location}`,
          });

          try {
            // Use Open-Meteo Geocoding to get timezone
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();
            
            if (geoData.results && geoData.results.length > 0) {
              const { name, country, timezone } = geoData.results[0];
              
              if (timezone) {
                const now = new Date();
                const timeString = now.toLocaleTimeString("en-US", { timeZone: timezone, hour: '2-digit', minute: '2-digit' });
                const dateString = now.toLocaleDateString("en-US", { timeZone: timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                
                systemContext += `\n\n[SYSTEM CONTEXT: The current date in ${name}, ${country} (${timezone}) is ${dateString} and the time is ${timeString}. Use this to answer the user's question.]`;
              } else {
                throw new Error("No timezone found");
              }
            } else {
              throw new Error("Location not found");
            }
          } catch (err) {
            console.error("Timezone lookup failed:", err);
            // Fallback to local time if location lookup fails, but mention it failed
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateString = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            systemContext += `\n\n[SYSTEM CONTEXT: Could not find time for "${location}". The current LOCAL time is ${timeString} on ${dateString}.]`;
          }
        } else {
          // Local time
          const now = new Date();
          const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateString = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          
          systemContext += `\n\n[SYSTEM CONTEXT: The current date is ${dateString} and the time is ${timeString}. Use this to answer the user's question about time or date.]`;
        }
      } catch (e) {
        console.error("Time logic error", e);
      }
    }

    // Prepare context for AI
    let fileContext = "";
    processedFiles.forEach(file => {
      if (file.type === 'text' || file.type === 'pdf') {
        fileContext += `\n\n[FILE CONTENT: ${file.name}]\n${file.content}\n[END FILE CONTENT]\n`;
      } else if (file.type === 'image') {
        fileContext += `\n\n[User uploaded an image: ${file.name}. (Image analysis not fully supported in this version, but I can see the filename)]`;
      }
    });

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
            messages: currentMessages.map((m) => ({
              role: m.role,
              content: m.content + (m === lastMessage ? systemContext + fileContext : ""),
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

      // Save assistant message to database
      if (assistantMessage) {
        await saveMessage("assistant", assistantMessage);
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
      <div 
        className={`${isSidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden shrink-0`}
      >
        <ChatHistory
          currentConversationId={currentConversationId}
          onSelectConversation={setCurrentConversationId}
          onNewChat={handleNewChat}
          className="w-72 h-full"
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-muted-foreground hover:text-foreground mr-2"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
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
              <ChatExport messages={messages} />
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
          <div className="container mx-auto max-w-5xl py-6">
            {(showBookmarks ? messages.filter((_, i) => bookmarkedMessages.includes(i)) : messages).map((message, index) => {
              const actualIndex = showBookmarks ? messages.indexOf(message) : index;
              return (
                <div key={actualIndex} className="relative group">
                  <ChatMessage 
                    role={message.role} 
                    content={message.content}
                    attachments={message.attachments}
                    onDelete={() => deleteMessage(actualIndex)}
                    onEdit={(newContent) => editMessage(actualIndex, newContent)}
                  />
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
          <div className="container mx-auto max-w-5xl p-4">
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      </div>

      {/* Memory Dialog */}
      <MemoryDialog
        open={memoryDialogOpen}
        onOpenChange={setMemoryDialogOpen}
        onMemorySaved={() => {
          if (pendingMemoryData) {
            toast({
              title: "Memory saved!",
              description: `I'll remember: ${pendingMemoryData.key}`,
            });
          }
        }}
      />
    </div>
  );
};

export default Index;
