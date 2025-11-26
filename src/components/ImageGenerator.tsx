import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Copy, Loader, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageGeneratorProps {
  prompt: string;
  style?: string;
}

export default function ImageGenerator({ prompt, style }: ImageGeneratorProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    generateImage();
  }, [prompt]);

  const generateImage = async () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      console.log("Generating image for prompt:", prompt);
      
      // Use Pollinations.ai - a free, no-key generative AI API
      // It generates actual images from text, matching the user's request perfectly
      const encodedPrompt = encodeURIComponent(prompt);
      // Add seed to ensure unique images for same prompt
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&seed=${seed}`;
      
      console.log("Using Pollinations URL:", imageUrl);
      
      // Pre-load to check if it works
      const img = new Image();
      img.onload = () => {
        setImageUrl(imageUrl);
        setLoading(false);
      };
      img.onerror = () => {
        console.error("Pollinations failed");
        // Fallback to Picsum if generation fails
        setImageUrl(`https://picsum.photos/seed/${seed}/800/600`);
        setLoading(false);
      };
      img.src = imageUrl;
      
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to generate image");
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generated-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Downloaded!",
        description: "Image saved to your device",
      });
    } catch (err) {
      console.error("Download error:", err);
      // Fallback for CORS issues
      window.open(imageUrl, '_blank');
      toast({
        title: "Opened in new tab",
        description: "Right-click to save (CORS restriction)",
      });
    }
  };

  const copyToClipboard = async () => {
    if (!imageUrl) return;
    try {
      await navigator.clipboard.writeText(imageUrl);
      toast({
        title: "Copied!",
        description: "Image URL copied to clipboard",
      });
    } catch (err) {
      console.error("Copy error:", err);
      toast({
        title: "Copy failed",
        description: "Could not copy the URL",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3 my-3 w-full">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader className="h-4 w-4 animate-spin" />
          Generating image...
        </div>
      )}

      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-600 dark:text-yellow-500 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {imageUrl && !loading && (
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden border border-border bg-muted w-full">
            <img
              src={imageUrl}
              alt="Generated: {prompt}"
              className="w-full h-auto max-h-[400px] object-cover"
              onError={(e) => {
                console.error("Image load error");
                setError("Failed to load image");
              }}
              onLoad={() => console.log("Image loaded successfully")}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadImage}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center break-words">
            {prompt}
          </p>
        </div>
      )}
    </div>
  );
}

