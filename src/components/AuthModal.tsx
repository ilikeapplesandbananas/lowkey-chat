import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { Shield, Sparkles, User, Key, Mail, Eye, EyeOff, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, continueAsGuest, resetPassword, isFirebaseActive } = useAuth();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKeySetup, setShowKeySetup] = useState(false);

  const handleSaveFirebaseApiKey = () => {
    if (!apiKeyInput.trim()) return;
    const config = {
      apiKey: apiKeyInput.trim(),
      authDomain: "lowkey-ai-18c4c.firebaseapp.com",
      projectId: "lowkey-ai-18c4c",
      storageBucket: "lowkey-ai-18c4c.firebasestorage.app",
    };
    localStorage.setItem("lowkey_firebase_config", JSON.stringify(config));
    window.location.reload();
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (activeTab === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
      onOpenChange(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    try {
      await signInWithGoogle();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Google sign in failed");
    }
  };

  const handleGuestContinue = () => {
    continueAsGuest();
    onOpenChange(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMessage("Please enter your email above to receive a reset link.");
      return;
    }
    await resetPassword(email);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-6 bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-2 text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Welcome to Lowkey AI
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Sign in to sync your conversations, history, and settings across your devices.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg space-y-1">
            <p className="leading-relaxed">{errorMessage}</p>
            {errorMessage.includes("Firebase Console") && (
              <a
                href="https://console.firebase.google.com/u/0/project/lowkey-ai-18c4c/authentication/providers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-[11px] pt-1"
              >
                Open Firebase Authentication Providers &rarr;
              </a>
            )}
          </div>
        )}

        {/* Google One-Click Button */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-3 py-5 text-sm font-medium border-border hover:bg-accent"
            onClick={handleGoogleSignIn}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Firebase Project Status & Quick Activation */}
          {isFirebaseActive ? (
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-green-500 font-medium py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Firebase Connected (lowkey-ai-18c4c)</span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl border border-border/80 bg-muted/40 space-y-2">
              <div
                className="flex items-center justify-between text-xs cursor-pointer select-none"
                onClick={() => setShowKeySetup(!showKeySetup)}
              >
                <span className="font-medium text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Firebase Project: <strong className="text-foreground">lowkey-ai-18c4c</strong>
                </span>
                <button type="button" className="text-[11px] text-primary hover:underline flex items-center gap-1">
                  {showKeySetup ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showKeySetup ? "Hide Setup" : "Activate Web API Key"}
                </button>
              </div>

              {showKeySetup && (
                <div className="space-y-2 pt-1.5 border-t border-border/60 text-xs">
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Paste your Firebase Web API Key (AIzaSy...) from Project Settings to activate Google Sign-In:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="AIzaSy..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveFirebaseApiKey}
                      className="h-8 px-3 text-xs bg-gradient-primary hover:opacity-90"
                    >
                      Connect
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative flex items-center justify-center pt-1">
            <div className="border-t border-border w-full" />
            <span className="bg-card px-2 text-xs text-muted-foreground uppercase">or email</span>
            <div className="border-t border-border w-full" />
          </div>
        </div>

        {/* Email & Password Tabs */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "signin" | "signup")}>
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {activeTab === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="auth-name" className="text-xs">Your Name</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="auth-name"
                    placeholder="Alex Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="auth-email" className="text-xs">Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="auth-password" className="text-xs">Password</Label>
                {activeTab === "signin" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-primary hover:opacity-90 font-medium py-2.5 mt-2 shadow-sm"
            >
              {isSubmitting ? "Authenticating..." : activeTab === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </Tabs>

        {/* Security & Guest fallback */}
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Encrypted & Secured</span>
          </div>
          <button
            type="button"
            onClick={handleGuestContinue}
            className="text-primary hover:underline font-medium"
          >
            Continue as Guest →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
