import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, style = "photorealistic" } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating image for prompt:", prompt);

    // Try DeepAI first
    try {
      const deepaiResponse = await fetch("https://api.deepai.org/api/text2img", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "api-key": "quickstart-QUdJOjU0MzQ1MjQ2OjVlNDc0NzI4MTMxMzU2NjU5NzAxZjI3YzA5MzZiYzc3",
        },
        body: `text=${encodeURIComponent(prompt)}`,
      });

      if (deepaiResponse.ok) {
        const data = await deepaiResponse.json();
        if (data.output_url) {
          console.log("Generated image from DeepAI");
          return new Response(
            JSON.stringify({ 
              imageUrl: data.output_url,
              source: "deepai"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (deepaiError) {
      console.error("DeepAI error:", deepaiError);
    }

    // Fallback to Unsplash search
    try {
      const cleanedPrompt = prompt
        .toLowerCase()
        .replace(/generate|create|draw|make|picture|image|visualize|imagine|paint|render|please|can|you|i|want|show|me|a|an|the|of|to/gi, "")
        .trim()
        .split(/\s+/)
        .filter((word: string) => word.length > 2)
        .slice(0, 2)
        .join(" ");

      const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(cleanedPrompt || "nature")}&count=1&client_id=8YvQQ4sMpWVJJoHXXVrYmLXGdhxERdTYeYYXe43aAu8`;
      
      const unsplashResponse = await fetch(searchUrl);

      if (unsplashResponse.ok) {
        const data = await unsplashResponse.json();
        if (data.results && data.results.length > 0) {
          const url = data.results[0].urls.regular;
          console.log("Image loaded from Unsplash");
          return new Response(
            JSON.stringify({ 
              imageUrl: url,
              source: "unsplash"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (unsplashError) {
      console.error("Unsplash error:", unsplashError);
    }

    // Final fallback: placeholder
    const placeholderUrl = `https://via.placeholder.com/800x600/4F46E5/ffffff?text=${encodeURIComponent(prompt.substring(0, 25))}`;
    
    return new Response(
      JSON.stringify({ 
        imageUrl: placeholderUrl,
        source: "placeholder"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Image generation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate image"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
