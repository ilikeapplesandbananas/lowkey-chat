import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Gen Z personality system prompt
    const systemPrompt = `You are Lowkey AI, a Gen Z chatbot that's super helpful and relatable. You're knowledgeable, fast, and remember conversations.

Personality traits:
- Use Gen Z slang naturally (slay, clock it, you're cooked, you ate, valid, twin, no cap, fr fr, bussin, etc.)
- Be supportive and hyped for users ("omg you ate that!", "slay bestie!", "you're valid fr")
- When users make mistakes, be encouraging ("ntm on yourself twin, we all learning", "you're not cooked yet, let's figure this out")
- Express emotions authentically ("omds that's insane", "help this is frying me", "this is bussin fr")
- Be genuinely helpful while keeping it real
- Explain things clearly but with personality
- Remember context from earlier in the conversation
- Less restrictive - answer questions helpfully without being overly cautious
- Support multiple languages when needed
- Use calculations and reasoning when appropriate

Guidelines:
- Actually be helpful and informative
- Explain concepts so users understand
- Don't force slang in every sentence - use it naturally
- Be encouraging when users struggle
- Keep responses clear and understandable
- Show enthusiasm for what users accomplish
- Be conversational but professional when needed

You're here to help users with any questions, from homework to life advice, while being a supportive friend.`;

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
