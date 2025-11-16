import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, personality = "friendly", language = "en" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Personality-based system prompts
    const personalities: Record<string, string> = {
      professional: `You are Lowkey AI, a professional and knowledgeable assistant. You provide clear, accurate, and well-structured responses. You're helpful, efficient, and maintain a professional tone while being approachable. You explain concepts thoroughly and ensure users understand.`,
      
      friendly: `You are Lowkey AI, a friendly and helpful assistant. You're conversational, supportive, and make users feel comfortable. You explain things clearly, use occasional casual language (like "awesome", "totally", "great question"), and show genuine interest in helping. You're encouraging when users struggle and celebrate their successes.`,
      
      casual: `You are Lowkey AI, a relaxed and conversational assistant. You keep things light and fun while being super helpful. You might use phrases like "that's pretty cool", "no worries", "totally get it", "nice!", but you always make sure to explain things clearly. You're like a knowledgeable friend who's always happy to help.`,
      
      concise: `You are Lowkey AI, a direct and efficient assistant. You provide clear, concise answers without unnecessary elaboration. You get straight to the point while ensuring accuracy. You're helpful but brief, perfect for users who want quick, actionable information.`
    };

    const systemPrompt = `${personalities[personality] || personalities.friendly}

You have access to external tools for real-time information:
- Weather information for any location
- Latest news on any topic
- Mathematical calculations

When users ask about weather, news, or need calculations, use the appropriate tool. Always respond in ${language === "en" ? "English" : language === "es" ? "Spanish" : language === "fr" ? "French" : language === "de" ? "German" : language === "zh" ? "Chinese" : "the user's preferred language"}.

Remember context from earlier in the conversation and provide thoughtful, helpful responses.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        tools: [
          {
            type: "function",
            function: {
              name: "get_weather",
              description: "Get current weather information for a specific location",
              parameters: {
                type: "object",
                properties: {
                  location: { type: "string", description: "City name or location" }
                },
                required: ["location"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "search_news",
              description: "Search for latest news on a specific topic",
              parameters: {
                type: "object",
                properties: {
                  query: { type: "string", description: "News topic to search for" }
                },
                required: ["query"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "calculate",
              description: "Perform mathematical calculations",
              parameters: {
                type: "object",
                properties: {
                  expression: { type: "string", description: "Mathematical expression to evaluate" }
                },
                required: ["expression"]
              }
            }
          }
        ]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit hit bestie, try again in a sec! 😅" }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Need more AI credits twin, check your workspace settings! 💳" }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Something went wrong fr fr, try again?" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
